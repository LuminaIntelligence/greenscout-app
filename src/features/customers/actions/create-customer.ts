"use server";

/**
 * T-023 create-customer Server Action.
 *
 * Boundary between the React form (`customer-form.tsx`) and the
 * `customer.repository` + `audit-log.repository` modules.
 * Responsibilities:
 *
 *   - re-parse the client payload via `customerSchema` (the only place
 *     this happens server-side — RHF + the resolver may run on the
 *     client, but the server still validates),
 *   - re-fetch the session for `userId` + `organizationId` (the client
 *     never sends them),
 *   - persist the new customer via `createCustomer`,
 *   - emit a `CREATE` AuditLog entry with `changeSet` recording
 *     every populated field as `[null, value]` (the application-layer
 *     convention from DECISIONS — Slice 2 schema design),
 *   - revalidate `/customers` so the list page reloads on next nav.
 *
 * Return type is a discriminated `CreateCustomerResult`. The client
 * maps `errorCode` to copy via `src/i18n/de.ts`.
 *
 * @see DECISIONS.md → "T-023 silent decisions per §14 (consolidated)"
 */

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { customerSchema, type CustomerInput } from "@/features/customers/schemas/customer-schema";
import { auth } from "@/lib/auth";
import { createAuditEntry } from "@/lib/repositories/audit-log.repository";
import { createCustomer } from "@/lib/repositories/customer.repository";

export type CreateCustomerResult =
  | { ok: true; customerId: string }
  | {
      ok: false;
      errorCode: "validation" | "forbidden" | "server";
      fieldErrors?: Record<string, string>;
    };

function buildChangeSet(data: CustomerInput): Record<string, [null, string]> {
  // Every customer field on the schema resolves to `string` after
  // `optionalString`'s empty-string-to-undefined transform, so the diff
  // tuple's value is always a populated string. `Prisma.InputJsonValue`
  // accepts string + null + nested records, so this narrower shape
  // satisfies the AuditLog jsonb type without an `as` cast.
  const entries: Array<[string, [null, string]]> = [];
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "string") {
      entries.push([key, [null, value]]);
    }
  }
  return Object.fromEntries(entries);
}

export async function createCustomerAction(rawData: unknown): Promise<CreateCustomerResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, errorCode: "forbidden" };
  }

  const parsed = customerSchema.safeParse(rawData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (fieldErrors[key] === undefined) {
        fieldErrors[key] = issue.message;
      }
    }
    return { ok: false, errorCode: "validation", fieldErrors };
  }

  const headerList = await headers();
  const ipAddress = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = headerList.get("user-agent") ?? null;

  try {
    const customer = await createCustomer(session.user.organizationId, parsed.data);

    await createAuditEntry(session.user.organizationId, {
      user: { connect: { id: session.user.id } },
      entityType: "Customer",
      entityId: customer.id,
      action: "CREATE",
      changeSet: buildChangeSet(parsed.data),
      ipAddress,
      userAgent,
    });

    revalidatePath("/customers");
    return { ok: true, customerId: customer.id };
  } catch (err) {
    // DSGVO §7.11 — never log the raw form payload. `err` alone is
    // enough to triage without leaking customer PII into stdout.
    console.error("[create-customer]", err);
    return { ok: false, errorCode: "server" };
  }
}
