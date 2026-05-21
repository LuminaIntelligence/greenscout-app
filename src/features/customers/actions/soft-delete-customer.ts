"use server";

/**
 * T-024 soft-delete-customer Server Action.
 *
 * Trust boundary between the React `<CustomerDeleteDialog>` and the
 * repository / audit-log layers. Responsibilities:
 *
 *   - re-parse the client payload via a local zod schema (FormData
 *     reaches the action with everything as `FormDataEntryValue`),
 *   - re-fetch the session for `userId` + `organizationId`,
 *   - read-first ownership check via `findCustomerById` so we can
 *     distinguish `not-found` from `already-deleted` BEFORE writing,
 *   - idempotent short-circuit: if the row is already soft-deleted,
 *     return `{ ok: true }` WITHOUT writing a second audit row and
 *     WITHOUT a second repository call (protects against double-clicks
 *     / replay / race),
 *   - persist via the new race-safe `softDeleteCustomer(orgId, id, ts)`
 *     repository function (uses `updateMany` with a `deletedAt: null`
 *     filter so concurrent writers also fail the second pass safely),
 *   - emit a `SOFT_DELETE` AuditLog entry with the
 *     `{ deletedAt: [null, <ISO-String>] }` diff convention from
 *     `update-customer.ts`,
 *   - `revalidatePath("/customers")` so the list page drops the row.
 *
 * Return type is a discriminated `SoftDeleteCustomerResult`. The
 * client maps `errorCode` to copy via `src/i18n/de.ts`.
 *
 * @see DECISIONS.md → "T-024 silent decisions per §14 (consolidated)"
 */

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { createAuditEntry } from "@/lib/repositories/audit-log.repository";
import { findCustomerById, softDeleteCustomer } from "@/lib/repositories/customer.repository";

export type SoftDeleteCustomerResult =
  | { ok: true; customerId: string }
  | { ok: false; errorCode: "not-found" | "server" };

// The dialog passes the id in a FormData field; a tiny schema parses
// the raw payload + guards against accidental client tampering.
const softDeleteInputSchema = z.object({
  customerId: z.string().min(1),
});

export async function softDeleteCustomerAction(
  formData: FormData,
): Promise<SoftDeleteCustomerResult> {
  const parsed = softDeleteInputSchema.safeParse({
    customerId: formData.get("customerId"),
  });
  if (!parsed.success) {
    // Defensive — the dialog always sets customerId. Treat a malformed
    // payload as a server-side bug class, not a UX surface.
    return { ok: false, errorCode: "server" };
  }

  const session = await auth();
  if (!session?.user) {
    return { ok: false, errorCode: "server" };
  }

  const { customerId } = parsed.data;

  // Read-first ownership check. `findCustomerById` filters by org +
  // `deletedAt: null` by default — so cross-tenant + truly-missing IDs
  // both surface as `null`. We deliberately re-fetch with
  // `includeDeleted: true` to disambiguate "already deleted" (idempotent
  // success path) from "never existed" (not-found error).
  const existing = await findCustomerById(session.user.organizationId, customerId, {
    includeDeleted: true,
  });
  if (existing === null) {
    return { ok: false, errorCode: "not-found" };
  }
  if (existing.deletedAt !== null) {
    // Idempotent: customer is already soft-deleted. No second audit row,
    // no second DB write. Protects against double-clicks, retries, and
    // navigation-back replay.
    return { ok: true, customerId };
  }

  const headerList = await headers();
  const ipAddress = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = headerList.get("user-agent") ?? null;

  // Stamp computed once so the value persisted to the row and the value
  // recorded in the audit diff are identical.
  const deletedAt = new Date();

  try {
    const updated = await softDeleteCustomer(session.user.organizationId, customerId, deletedAt);
    if (updated === null) {
      // Race window: another caller soft-deleted the row between our
      // read-first check and this write. Treat as the idempotent
      // success path — the user's intent is fulfilled either way.
      return { ok: true, customerId };
    }

    await createAuditEntry(session.user.organizationId, {
      user: { connect: { id: session.user.id } },
      entityType: "Customer",
      entityId: customerId,
      action: "SOFT_DELETE",
      changeSet: { deletedAt: [null, deletedAt.toISOString()] },
      ipAddress,
      userAgent,
    });

    revalidatePath("/customers");
    return { ok: true, customerId };
  } catch (err) {
    // DSGVO §7.11 — never log the raw row contents. The id alone is
    // enough to triage without leaking customer PII.
    console.error("[soft-delete-customer]", err);
    return { ok: false, errorCode: "server" };
  }
}
