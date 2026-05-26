"use server";

/**
 * T-041a update-user Server Action (admin-only).
 *
 * Updates the non-security-relevant fields on a `User` row:
 *
 *   - `firstName`, `lastName` (display only)
 *   - `role` (BERATER ↔ ADMIN — visible-features toggle, not crypto)
 *   - `active` (deactivate / reactivate via the dedicated
 *     `deactivateUserAction` is preferred for the deactivate path;
 *     this action also accepts `active` so the same form can flip
 *     it back to true on a reactivation)
 *
 * **`email` is deliberately NOT supported here.** Changing a user's
 * login identifier is §7.3 auth-adjacent and out of scope for this
 * slice. Password changes go through the existing `change-password`
 * Server Action (self-service) or the future T-041b reset-password
 * action (admin-driven).
 *
 * @see DECISIONS.md → "Slice 5a (T-030 / T-041a) silent decisions per §14"
 */

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { updateUserSchema } from "@/features/users/schemas/user-schema";
import { auth } from "@/lib/auth";
import { createAuditEntry } from "@/lib/repositories/audit-log.repository";
import { findUserById, updateUser } from "@/lib/repositories/user.repository";

export type UpdateUserResult =
  | { ok: true; userId: string }
  | {
      ok: false;
      errorCode: "validation" | "forbidden" | "not-found" | "server";
      fieldErrors?: Record<string, string>;
    };

type DiffValue = string | boolean | null;
type ChangeSet = Record<string, [DiffValue, DiffValue]>;

const envelopeSchema = z.object({
  userId: z.string().min(1),
  data: z.unknown(),
});

function buildDiff(
  existing: { firstName: string; lastName: string; role: string; active: boolean },
  next: { firstName?: string; lastName?: string; role?: string; active?: boolean },
): ChangeSet {
  const diff: ChangeSet = {};
  if (next.firstName !== undefined && next.firstName !== existing.firstName) {
    diff.firstName = [existing.firstName, next.firstName];
  }
  if (next.lastName !== undefined && next.lastName !== existing.lastName) {
    diff.lastName = [existing.lastName, next.lastName];
  }
  if (next.role !== undefined && next.role !== existing.role) {
    diff.role = [existing.role, next.role];
  }
  if (next.active !== undefined && next.active !== existing.active) {
    diff.active = [existing.active, next.active];
  }
  return diff;
}

export async function updateUserAction(rawInput: unknown): Promise<UpdateUserResult> {
  const envelope = envelopeSchema.safeParse(rawInput);
  if (!envelope.success) {
    return { ok: false, errorCode: "validation" };
  }

  const session = await auth();
  if (!session?.user) {
    return { ok: false, errorCode: "forbidden" };
  }
  if (session.user.role !== "ADMIN") {
    return { ok: false, errorCode: "forbidden" };
  }

  const dataParsed = updateUserSchema.safeParse(envelope.data.data);
  if (!dataParsed.success) {
    const fieldErrors = dataParsed.error.issues.reduce<Record<string, string>>((acc, issue) => {
      acc[issue.path.join(".")] = issue.message;
      return acc;
    }, {});
    return { ok: false, errorCode: "validation", fieldErrors };
  }

  const { userId } = envelope.data;
  const existing = await findUserById(session.user.organizationId, userId);
  if (existing === null) {
    return { ok: false, errorCode: "not-found" };
  }

  const diff = buildDiff(existing, dataParsed.data);
  if (Object.keys(diff).length === 0) {
    // Idempotent no-op: nothing to write, no audit churn.
    return { ok: true, userId };
  }

  const headerList = await headers();
  const ipAddress = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = headerList.get("user-agent") ?? null;

  try {
    await updateUser(session.user.organizationId, userId, dataParsed.data);

    await createAuditEntry(session.user.organizationId, {
      user: { connect: { id: session.user.id } },
      entityType: "User",
      entityId: userId,
      action: "USER_UPDATED",
      changeSet: diff,
      ipAddress,
      userAgent,
    });

    revalidatePath("/users");
    revalidatePath(`/users/${userId}`);
    return { ok: true, userId };
  } catch (err) {
    console.error("[update-user]", err);
    return { ok: false, errorCode: "server" };
  }
}
