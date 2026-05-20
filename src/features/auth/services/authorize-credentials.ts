/**
 * Credentials authorize callback. Pure function (no Auth.js internals
 * referenced) so it can be unit-tested in isolation.
 *
 * Implements the full counter-based lockout state machine per
 * DECISIONS T-017 corrective ②. AuditLog entries are forensic only —
 * never queried for lockout decisions. The single source of truth is
 * the `failedLoginCount` / `lockoutUntil` column pair on `User`.
 *
 * Algorithm (counter-based, NOT time-window-based):
 *   - lockoutUntil > now → DENY (regardless of password correctness)
 *   - bad password →
 *       increment counter
 *       counter == 5  → 15 min lockout
 *       counter == 10 → 1 h lockout + admin alert
 *       counter > 10  → 1 h lockout (no further alerts)
 *   - good password → reset counter AND lockoutUntil
 *
 * @see DECISIONS.md → "T-017 Auth.js v5 Credentials + session config"
 * @see SPEC.md §4.1 (post-T-017 precision edit)
 */

import { verifyPassword } from "@/features/auth/password-policy";
import { normaliseEmail } from "@/features/auth/utils/normalise-email";
import { createAuditEntry } from "@/lib/repositories/audit-log.repository";
import {
  findUserByEmail,
  incrementFailedLoginCount,
  resetFailedLoginCount,
  setLockoutUntil,
} from "@/lib/repositories/user.repository";

import { emitAdminLockoutAlert } from "./admin-alerts";

const ORG_ID = "greenscout";

/**
 * Lockout state machine thresholds — hard-coded to the SPEC §4.1
 * values (5 → 15 min, 10 → 1 h). The `.env.example` keys
 * `LOCKOUT_FAIL_THRESHOLD_*` / `LOCKOUT_DURATION_*_MINUTES` are
 * retained as documentation of the policy but NOT wired into the
 * authorize callback — wiring them as env-overridable would split the
 * source of truth between SPEC §4.1 and runtime env config, and the
 * 100% coverage threshold on this module would force env-mutation
 * tests that are not worth the maintenance cost for MVP.
 *
 * Re-wiring to env at a later date is a 5-line edit gated only by
 * unit tests; no architectural commitment is being closed off.
 */
const LOCKOUT_THRESHOLD_FIRST = 5;
const LOCKOUT_THRESHOLD_SECOND = 10;
const LOCKOUT_DURATION_FIRST_MS = 15 * 60 * 1000;
const LOCKOUT_DURATION_SECOND_MS = 60 * 60 * 1000;

export interface AuthorizedUser {
  id: string;
  email: string;
  role: "ADMIN" | "BERATER";
  mustChangePassword: boolean;
  formPreference: "WIZARD" | "SINGLE_PAGE";
  organizationId: string;
}

export interface AuthorizeContext {
  email: string;
  password: string;
  ipAddress: string | null;
  userAgent: string | null;
}

/**
 * Authenticate the given (email, password) against the User table.
 *
 * Returns the authorised user on success, `null` on every failure
 * mode (bad creds, locked, inactive, soft-deleted, non-existent).
 * Auth.js's CredentialsSignin contract treats `null` as a generic
 * failure — the soft-distinguished lockout UX is the T-018 form's job
 * to surface, not this service's.
 */
export async function authorizeCredentials(ctx: AuthorizeContext): Promise<AuthorizedUser | null> {
  const email = normaliseEmail(ctx.email);
  const user = await findUserByEmail(ORG_ID, email, { includeDeleted: true });

  // Non-existent user — no userId to attach to the audit row.
  if (user === null) {
    await createAuditEntry(ORG_ID, {
      entityType: "Auth",
      entityId: null,
      action: "LOGIN_FAIL",
      changeSet: { reason: ["", "non-existent"] },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    return null;
  }

  // Soft-deleted user.
  if (user.deletedAt !== null) {
    await createAuditEntry(ORG_ID, {
      user: { connect: { id: user.id } },
      entityType: "Auth",
      entityId: null,
      action: "LOGIN_FAIL",
      changeSet: { reason: ["", "soft-deleted"] },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    return null;
  }

  // Inactive user.
  if (!user.active) {
    await createAuditEntry(ORG_ID, {
      user: { connect: { id: user.id } },
      entityType: "Auth",
      entityId: null,
      action: "LOGIN_FAIL",
      changeSet: { reason: ["", "inactive"] },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    return null;
  }

  // Active lockout: deny regardless of password correctness. The lockout
  // check intentionally runs BEFORE verifyPassword so a locked-out user
  // who supplies the right password is still denied (a stale auditable
  // signal otherwise leaks information about correct credentials).
  if (user.lockoutUntil !== null && user.lockoutUntil.getTime() > Date.now()) {
    await createAuditEntry(ORG_ID, {
      user: { connect: { id: user.id } },
      entityType: "Auth",
      entityId: null,
      action: "LOGIN_FAIL",
      changeSet: { reason: ["", "locked"] },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    return null;
  }

  // Bad password path.
  const passwordOk = await verifyPassword(user.passwordHash, ctx.password);
  if (!passwordOk) {
    const counterAfter = user.failedLoginCount + 1;
    await incrementFailedLoginCount(ORG_ID, user.id);

    if (counterAfter === LOCKOUT_THRESHOLD_FIRST) {
      await setLockoutUntil(ORG_ID, user.id, new Date(Date.now() + LOCKOUT_DURATION_FIRST_MS));
    } else if (counterAfter === LOCKOUT_THRESHOLD_SECOND) {
      await setLockoutUntil(ORG_ID, user.id, new Date(Date.now() + LOCKOUT_DURATION_SECOND_MS));
      await emitAdminLockoutAlert({
        userId: user.id,
        userEmail: user.email,
        counter: counterAfter,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
    } else if (counterAfter > LOCKOUT_THRESHOLD_SECOND) {
      // Renew the 1h lockout window, no further admin alerts (avoid spam).
      await setLockoutUntil(ORG_ID, user.id, new Date(Date.now() + LOCKOUT_DURATION_SECOND_MS));
    }

    await createAuditEntry(ORG_ID, {
      user: { connect: { id: user.id } },
      entityType: "Auth",
      entityId: null,
      action: "LOGIN_FAIL",
      changeSet: {
        reason: ["", "bad-password"],
        counterAfter: [null, counterAfter],
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    return null;
  }

  // Success path — repository resets BOTH counter AND lockoutUntil.
  await resetFailedLoginCount(ORG_ID, user.id);
  await createAuditEntry(ORG_ID, {
    user: { connect: { id: user.id } },
    entityType: "Auth",
    entityId: null,
    action: "LOGIN_SUCCESS",
    changeSet: { reason: ["", "credentials"] },
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    formPreference: user.formPreference,
    organizationId: user.organizationId,
  };
}
