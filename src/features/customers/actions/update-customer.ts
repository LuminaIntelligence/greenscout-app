"use server";

/**
 * T-023 update-customer Server Action.
 *
 * Same boundary shape as `create-customer.ts`, plus:
 *
 *   - **Multi-tenant defence in depth**: we fetch the existing row
 *     via `findCustomerById(orgId, id)` to confirm ownership BEFORE
 *     writing. Even though `updateCustomer` filters by `{ id,
 *     organizationId }` (so a cross-tenant guess silently no-ops),
 *     the read-first pattern lets us also compute the audit diff
 *     and return `not-found` instead of producing an empty update.
 *   - **Audit `changeSet` diff** — only changed fields appear, each
 *     as a `[oldValue, newValue]` tuple per DECISIONS Slice 2.
 *     Whitespace-only changes pre-normalised by the schema's
 *     `trim()` won't show up as diffs (the new value equals the old).
 *   - **No-op short-circuit**: zero changed fields → return success
 *     without an audit row. Acceptable in MVP per CLAUDE.md §11.
 *
 * @see DECISIONS.md → "T-023 silent decisions per §14 (consolidated)"
 */

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { customerSchema } from "@/features/customers/schemas/customer-schema";
import { auth } from "@/lib/auth";
import { createAuditEntry } from "@/lib/repositories/audit-log.repository";
import { findCustomerById, updateCustomer } from "@/lib/repositories/customer.repository";

export type UpdateCustomerResult =
  | { ok: true; customerId: string }
  | {
      ok: false;
      errorCode: "not-found" | "validation" | "forbidden" | "server";
      fieldErrors?: Record<string, string>;
    };

// Every Customer field tracked in the audit diff is `String | null` at
// the Prisma level, so the diff value tuple is always `(string | null)`.
// That satisfies `Prisma.InputJsonValue` (the type of `AuditLog.changeSet`)
// without an `as` cast.
type DiffValue = string | null;
type ChangeSet = Record<string, [DiffValue, DiffValue]>;

const TRACKED_FIELDS = [
  "companyName",
  "contactFirstName",
  "contactLastName",
  "email",
  "phone",
  "billingAddress",
  "billingZipCode",
  "billingCity",
  "notes",
] as const;

function readField(source: Record<string, unknown>, field: string): DiffValue {
  const value = source[field];
  if (typeof value === "string") return value;
  return null;
}

function buildDiff(existing: Record<string, unknown>, next: Record<string, unknown>): ChangeSet {
  const diff: ChangeSet = {};
  for (const field of TRACKED_FIELDS) {
    const oldValue = readField(existing, field);
    const newValue = readField(next, field);
    if (oldValue !== newValue) {
      diff[field] = [oldValue, newValue];
    }
  }
  return diff;
}

export async function updateCustomerAction(
  customerId: string,
  rawData: unknown,
): Promise<UpdateCustomerResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, errorCode: "forbidden" };
  }

  const parsed = customerSchema.safeParse(rawData);
  if (!parsed.success) {
    // Same single-issue-per-path assumption as create-customer.ts —
    // see comment there for reasoning.
    const fieldErrors = parsed.error.issues.reduce<Record<string, string>>((acc, issue) => {
      acc[issue.path.join(".")] = issue.message;
      return acc;
    }, {});
    return { ok: false, errorCode: "validation", fieldErrors };
  }

  // Multi-tenant safety: confirm the row exists in OUR org before we
  // touch it. `findCustomerById` already filters by organizationId.
  const existing = await findCustomerById(session.user.organizationId, customerId);
  if (existing === null) {
    return { ok: false, errorCode: "not-found" };
  }

  const changeSet = buildDiff(
    existing as unknown as Record<string, unknown>,
    parsed.data as unknown as Record<string, unknown>,
  );

  if (Object.keys(changeSet).length === 0) {
    // No-op edit — succeed without writing an audit row.
    return { ok: true, customerId };
  }

  const headerList = await headers();
  const ipAddress = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = headerList.get("user-agent") ?? null;

  try {
    await updateCustomer(session.user.organizationId, customerId, parsed.data);

    await createAuditEntry(session.user.organizationId, {
      user: { connect: { id: session.user.id } },
      entityType: "Customer",
      entityId: customerId,
      action: "UPDATE",
      changeSet,
      ipAddress,
      userAgent,
    });

    revalidatePath("/customers");
    revalidatePath(`/customers/${customerId}/edit`);
    return { ok: true, customerId };
  } catch (err) {
    // DSGVO §7.11 — never log the raw form payload.
    console.error("[update-customer]", err);
    return { ok: false, errorCode: "server" };
  }
}
