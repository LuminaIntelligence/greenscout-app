"use server";

/**
 * T-041a create-user Server Action (admin-only).
 *
 * Boundary between the admin user-management form and the
 * `user.repository` + `audit-log.repository` modules.
 * Responsibilities:
 *
 *   - re-fetch the session and assert `role === "ADMIN"` (defense in
 *     depth — the route group's layout already filters non-admin
 *     callers, but the Server Action MUST NOT rely on that),
 *   - parse the payload via `createUserSchema`,
 *   - generate a 12-char temp password via `crypto.randomUUID()` and
 *     argon2id-hash it via `hashPassword`. The plaintext is returned
 *     to the admin ONCE in the response envelope; it never lands in
 *     the DB, the audit log, or any persisted artefact.
 *   - persist via `createUser(orgId, { ..., mustChangePassword: true })`,
 *   - emit a `USER_CREATED` AuditLog entry recording email + role +
 *     name (never the temp password),
 *   - revalidate `/users`.
 *
 * `USER_CREATED` is added to the SPEC §5.1 AuditLog allow-list
 * additively for this slice.
 *
 * @see DECISIONS.md → "Slice 5a (T-030 / T-041a) silent decisions per §14"
 */

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { hashPassword } from "@/features/auth/utils/hash-password";
import { createUserSchema } from "@/features/users/schemas/user-schema";
import { auth } from "@/lib/auth";
import { createAuditEntry } from "@/lib/repositories/audit-log.repository";
import { createUser, findUserByEmail } from "@/lib/repositories/user.repository";

export type CreateUserResult =
  | {
      ok: true;
      userId: string;
      tempPassword: string;
    }
  | {
      ok: false;
      errorCode: "validation" | "forbidden" | "email-taken" | "server";
      fieldErrors?: Record<string, string>;
    };

const TEMP_PASSWORD_LENGTH = 12;

function generateTempPassword(): string {
  // `randomUUID()` is 36 chars of `[0-9a-f-]`. Stripping dashes + slicing
  // 12 yields ~64 bits of entropy — sufficient for a one-time temp
  // password the admin will hand off out-of-band. The user must change
  // it on first login (`mustChangePassword: true`).
  return randomUUID().replace(/-/g, "").slice(0, TEMP_PASSWORD_LENGTH);
}

export async function createUserAction(rawData: unknown): Promise<CreateUserResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, errorCode: "forbidden" };
  }
  if (session.user.role !== "ADMIN") {
    return { ok: false, errorCode: "forbidden" };
  }

  const parsed = createUserSchema.safeParse(rawData);
  if (!parsed.success) {
    const fieldErrors = parsed.error.issues.reduce<Record<string, string>>((acc, issue) => {
      acc[issue.path.join(".")] = issue.message;
      return acc;
    }, {});
    return { ok: false, errorCode: "validation", fieldErrors };
  }

  const { email, firstName, lastName, role } = parsed.data;

  // Block duplicate emails inside the same org. The DB has a global
  // `email @unique`, so a duplicate would also surface as a Prisma
  // P2002 error, but the explicit pre-check produces a localised
  // i18n key without parsing Prisma error codes.
  const existing = await findUserByEmail(session.user.organizationId, email, {
    includeDeleted: true,
  });
  if (existing !== null) {
    return { ok: false, errorCode: "email-taken" };
  }

  const tempPassword = generateTempPassword();
  let passwordHash: string;
  try {
    passwordHash = await hashPassword(tempPassword);
  } catch (err) {
    console.error("[create-user] hash failed", err);
    return { ok: false, errorCode: "server" };
  }

  const headerList = await headers();
  const ipAddress = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = headerList.get("user-agent") ?? null;

  try {
    const user = await createUser(session.user.organizationId, {
      email,
      passwordHash,
      firstName,
      lastName,
      role,
      mustChangePassword: true,
      active: true,
    });

    await createAuditEntry(session.user.organizationId, {
      user: { connect: { id: session.user.id } },
      entityType: "User",
      entityId: user.id,
      action: "USER_CREATED",
      // The change-set records the *non-secret* attributes that the
      // admin committed to. The temp password is NEVER included.
      changeSet: {
        email: [null, email],
        firstName: [null, firstName],
        lastName: [null, lastName],
        role: [null, role],
      },
      ipAddress,
      userAgent,
    });

    revalidatePath("/users");
    return { ok: true, userId: user.id, tempPassword };
  } catch (err) {
    // Never log the form payload — `err` alone is enough to triage
    // without leaking PII or the temp password.
    console.error("[create-user]", err);
    return { ok: false, errorCode: "server" };
  }
}
