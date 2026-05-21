/**
 * T-019 change-password service. Pure function (no Auth.js / Next.js
 * internals referenced) so it can be unit-tested with mocked repositories.
 *
 * Algorithm contract — verbatim from DECISIONS.md →
 * "T-019 Forced password change design (user-confirmed, binding)" →
 * "Final algorithm (binding)":
 *
 *   1. findUserById (session-scoped — userId already authenticated)
 *   2. wasMustChangePassword = user.mustChangePassword (capture BEFORE
 *      mutation so the audit can distinguish forced vs voluntary)
 *   3. LOCKOUT CHECK FIRST  ← intentional: see comment below
 *      if user.lockoutUntil && lockoutUntil > now → audit + return locked
 *   4. verifyPassword(user.passwordHash, currentPassword)
 *      wrong → counterAfter = failedLoginCount + 1
 *              incrementFailedLoginCount; setLockoutUntil at 5/10/>10;
 *              admin alert ONLY at 10; audit + return wrong-current.
 *   5. if newPassword === currentPassword → audit + return same-as-current
 *   6. if !validatePassword(newPassword).ok → audit + return rules-not-satisfied
 *   7. newHash = hashPassword(newPassword)
 *      withTransaction:
 *        - updatePasswordHash (also stamps passwordChangedAt = now)
 *        - setMustChangePassword(false)
 *        - resetFailedLoginCount (clears counter + lockoutUntil)
 *   8. audit PASSWORD_RESET { initiator: wasForced ? "user-forced" : "user-voluntary" }
 *   9. return { ok: true, initiator }
 *
 * **Lockout-first ordering — intentionally DIFFERENT from T-017a.**
 *
 * T-017a (authorize-credentials.ts) uses verify-first because /login is
 * the unauthenticated entry point — running argon2 always defeats email
 * enumeration via timing. /password-change is POST-AUTH (session.user.id
 * is known to be a real user from the JWT). No enumeration vector
 * exists, so lockout-first is correct AND more efficient (no expensive
 * argon2 verify when the account is already in a lockout window).
 *
 * The implementer must NOT "fix" this to match T-017a's pattern.
 * Documented as a binding contract in DECISIONS T-019.
 *
 * @see DECISIONS.md → "T-019 Forced password change design"
 * @see SPEC.md §4.1 (counter-based lockout — single source of truth)
 */

import { validatePassword } from "@/features/auth/password-policy";
import { hashPassword, verifyPassword } from "@/features/auth/utils/hash-password";
import { createAuditEntry } from "@/lib/repositories/audit-log.repository";
import { withTransaction } from "@/lib/repositories/transaction";
import {
  findUserById,
  incrementFailedLoginCount,
  resetFailedLoginCount,
  setLockoutUntil,
  setMustChangePassword,
  updatePasswordHash,
} from "@/lib/repositories/user.repository";

import { emitAdminLockoutAlert } from "./admin-alerts";

/**
 * Lockout state machine thresholds — hard-coded to the SPEC §4.1 values
 * (5 → 15 min, 10 → 1 h). Mirrors `authorize-credentials.ts`. Both
 * surfaces share the same `failedLoginCount` / `lockoutUntil` column
 * pair on `User`, per DECISIONS T-019 "Shared lockout counter":
 *   - successful login (T-017a) → reset counter + lockoutUntil
 *   - successful password change (T-019) → reset counter + lockoutUntil
 *
 * Constants are duplicated rather than extracted to a shared module:
 * the SPEC §4.1 thresholds are a stable contract (5/10, 15min/1h), and a
 * 4-line duplication is cheaper to maintain than a new module + indirect
 * import. If thresholds ever change, both files need updating regardless.
 */
const LOCKOUT_THRESHOLD_FIRST = 5;
const LOCKOUT_THRESHOLD_SECOND = 10;
const LOCKOUT_DURATION_FIRST_MS = 15 * 60 * 1000;
const LOCKOUT_DURATION_SECOND_MS = 60 * 60 * 1000;

/** Public surface returned by `changePassword`. */
export type ChangePasswordResult =
  | { ok: true; initiator: "user-forced" | "user-voluntary" }
  | {
      ok: false;
      errorCode:
        | "wrong-current-password"
        | "locked"
        | "same-as-current"
        | "rules-not-satisfied"
        | "server";
      lockedUntil?: string;
    };

/** Caller-supplied context. `userId` + `organizationId` come from the JWT. */
export interface ChangePasswordContext {
  userId: string;
  organizationId: string;
  currentPassword: string;
  newPassword: string;
  ipAddress: string | null;
  userAgent: string | null;
}

/**
 * Run the T-019 change-password state machine for an already-authenticated user.
 */
export async function changePassword(ctx: ChangePasswordContext): Promise<ChangePasswordResult> {
  // STEP 1 — Re-fetch the user from DB. The JWT might be stale or
  // forged; the DB is the source of truth for password / lockout state.
  const user = await findUserById(ctx.organizationId, ctx.userId);
  if (user === null) {
    // Should be unreachable in practice — middleware redirects
    // unauthenticated requests to /login, and the JWT is signed. Treat
    // any leakage as a server error rather than disclosing user state.
    return { ok: false, errorCode: "server" };
  }

  // STEP 2 — Capture forced-vs-voluntary BEFORE step 7 mutates it.
  const wasMustChangePassword = user.mustChangePassword;

  // STEP 3 — Lockout-first (post-auth context; see file-level comment).
  if (user.lockoutUntil !== null && user.lockoutUntil.getTime() > Date.now()) {
    await createAuditEntry(ctx.organizationId, {
      user: { connect: { id: user.id } },
      entityType: "Auth",
      entityId: null,
      action: "PASSWORD_CHANGE_FAIL",
      changeSet: { reason: ["", "locked"] },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    return {
      ok: false,
      errorCode: "locked",
      lockedUntil: user.lockoutUntil.toISOString(),
    };
  }

  // STEP 4 — Verify current password.
  const currentOk = await verifyPassword(user.passwordHash, ctx.currentPassword);
  if (!currentOk) {
    const counterAfter = user.failedLoginCount + 1;
    await incrementFailedLoginCount(ctx.organizationId, user.id);

    if (counterAfter === LOCKOUT_THRESHOLD_FIRST) {
      await setLockoutUntil(
        ctx.organizationId,
        user.id,
        new Date(Date.now() + LOCKOUT_DURATION_FIRST_MS),
      );
    } else if (counterAfter === LOCKOUT_THRESHOLD_SECOND) {
      await setLockoutUntil(
        ctx.organizationId,
        user.id,
        new Date(Date.now() + LOCKOUT_DURATION_SECOND_MS),
      );
      await emitAdminLockoutAlert({
        userId: user.id,
        userEmail: user.email,
        counter: counterAfter,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
    } else if (counterAfter > LOCKOUT_THRESHOLD_SECOND) {
      // Renew 1h lockout window, no further admin alerts (anti-spam).
      await setLockoutUntil(
        ctx.organizationId,
        user.id,
        new Date(Date.now() + LOCKOUT_DURATION_SECOND_MS),
      );
    }

    await createAuditEntry(ctx.organizationId, {
      user: { connect: { id: user.id } },
      entityType: "Auth",
      entityId: null,
      action: "PASSWORD_CHANGE_FAIL",
      changeSet: {
        reason: ["", "wrong-current"],
        counterAfter: [null, counterAfter],
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    return { ok: false, errorCode: "wrong-current-password" };
  }

  // STEP 5 — Reject reuse of the current password (string compare —
  // bcrypt/argon2 verify already confirmed the old value matches).
  if (ctx.newPassword === ctx.currentPassword) {
    await createAuditEntry(ctx.organizationId, {
      user: { connect: { id: user.id } },
      entityType: "Auth",
      entityId: null,
      action: "PASSWORD_CHANGE_FAIL",
      changeSet: { reason: ["", "same-as-current"] },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    return { ok: false, errorCode: "same-as-current" };
  }

  // STEP 6 — Server-side enforcement of the SPEC §4.1 rules. The
  // client-side schema only checks min(1); this is the single source of
  // truth.
  if (!validatePassword(ctx.newPassword).ok) {
    await createAuditEntry(ctx.organizationId, {
      user: { connect: { id: user.id } },
      entityType: "Auth",
      entityId: null,
      action: "PASSWORD_CHANGE_FAIL",
      changeSet: { reason: ["", "rules-not-satisfied"] },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    return { ok: false, errorCode: "rules-not-satisfied" };
  }

  // STEP 7 — Hash + atomic write (DECISIONS robustness mandate). The
  // three repository calls all run inside one Postgres transaction so
  // a mid-write crash never leaves the user with
  // hash-updated-but-mustChangePassword-still-true (or any other partial
  // state).
  const newHash = await hashPassword(ctx.newPassword);
  await withTransaction(async (tx) => {
    await updatePasswordHash(ctx.organizationId, user.id, newHash, tx);
    await setMustChangePassword(ctx.organizationId, user.id, false, tx);
    await resetFailedLoginCount(ctx.organizationId, user.id, tx);
  });

  // STEP 8 — Success audit with forced-vs-voluntary distinction. No
  // plaintext, no hash, no passwordChangedAt timestamp duplicated in the
  // changeSet (it lives on the User row via updatePasswordHash).
  const initiator: "user-forced" | "user-voluntary" = wasMustChangePassword
    ? "user-forced"
    : "user-voluntary";
  await createAuditEntry(ctx.organizationId, {
    user: { connect: { id: user.id } },
    entityType: "Auth",
    entityId: null,
    action: "PASSWORD_RESET",
    changeSet: { initiator: ["", initiator] },
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });

  return { ok: true, initiator };
}
