"use server";

/**
 * T-041a deactivate-user Server Action (admin-only).
 *
 * Flips `User.active` to `false` for a single user. Sessions are NOT
 * actively invalidated — Auth.js v5 stores 8h JWT in the cookie
 * (DECISIONS T-017), so an already-authenticated user keeps their
 * session until expiry. The deactivation is enforced on the *next*
 * login attempt by the T-017 `authorize-credentials` flow (which
 * rejects users with `active === false`). This is documented as a
 * silent §14 decision for this slice; a follow-up task can add
 * server-side session revocation when the user-session-store lands.
 *
 * Reactivation goes through `updateUserAction` (which also takes an
 * `active` field) — keeping the deactivate path in its own action
 * makes the audit-log entry distinct (`USER_DEACTIVATED` vs the
 * generic `USER_UPDATED`).
 *
 * @see DECISIONS.md → "Slice 5a (T-030 / T-041a) silent decisions per §14"
 */

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { createAuditEntry } from "@/lib/repositories/audit-log.repository";
import { findUserById, updateUser } from "@/lib/repositories/user.repository";

export type DeactivateUserResult =
  | { ok: true; userId: string }
  | {
      ok: false;
      errorCode: "validation" | "forbidden" | "not-found" | "self-deactivate" | "server";
    };

const inputSchema = z.object({
  userId: z.string().min(1),
});

export async function deactivateUserAction(rawInput: unknown): Promise<DeactivateUserResult> {
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, errorCode: "validation" };
  }

  const session = await auth();
  if (!session?.user) {
    return { ok: false, errorCode: "forbidden" };
  }
  if (session.user.role !== "ADMIN") {
    return { ok: false, errorCode: "forbidden" };
  }

  const { userId } = parsed.data;

  // Refuse to deactivate the currently-authenticated admin — a
  // self-deactivation would lock them out on next login. Not a
  // §7-trigger, just a UX guard.
  if (userId === session.user.id) {
    return { ok: false, errorCode: "self-deactivate" };
  }

  const existing = await findUserById(session.user.organizationId, userId);
  if (existing === null) {
    return { ok: false, errorCode: "not-found" };
  }

  // Idempotent short-circuit when the user is already inactive.
  if (!existing.active) {
    return { ok: true, userId };
  }

  const headerList = await headers();
  const ipAddress = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = headerList.get("user-agent") ?? null;

  try {
    await updateUser(session.user.organizationId, userId, { active: false });

    await createAuditEntry(session.user.organizationId, {
      user: { connect: { id: session.user.id } },
      entityType: "User",
      entityId: userId,
      action: "USER_DEACTIVATED",
      changeSet: { active: [true, false] },
      ipAddress,
      userAgent,
    });

    revalidatePath("/users");
    return { ok: true, userId };
  } catch (err) {
    console.error("[deactivate-user]", err);
    return { ok: false, errorCode: "server" };
  }
}
