/**
 * Credentials authorize callback. Pure function (no Auth.js internals
 * referenced) so it can be unit-tested in isolation.
 *
 * Implements the verify-first counter-based lockout state machine per
 * DECISIONS T-017a corrective. AuditLog entries are forensic only —
 * never queried for lockout decisions. The single source of truth is
 * the `failedLoginCount` / `lockoutUntil` column pair on `User`.
 *
 * Algorithm (verify-first, counter-based — NOT time-window-based):
 *   1. findUserByEmail (may be null)
 *   2. verifyPassword ALWAYS runs exactly once — dummy hash when no
 *      user exists (timing hardening against email enumeration)
 *   3. If password is wrong (covers non-existent users too): generic
 *      bad-password path. Counter increments (if user exists) and
 *      may trigger lockout (5 → 15 min, 10 → 1 h + admin alert, >10
 *      → 1 h, no alert). No "locked"/"inactive"/"deleted" disclosure.
 *   4. Password correct → check user-state flags:
 *        - deletedAt → AccountUnavailableError("deleted")
 *        - !active   → AccountUnavailableError("inactive")
 *        - lockoutUntil > now → LockedAccountError(until)
 *          (counter & lockoutUntil UNCHANGED — user typed correctly,
 *           they're just waiting out the timer)
 *   5. Otherwise → resetFailedLoginCount (clears counter + lockoutUntil)
 *      and return the AuthorizedUser.
 *
 * Verify-first is the security order: only a user who has supplied
 * the correct password ever sees the soft-distinguished signals
 * ("locked", "inactive", "deleted"). An attacker without the password
 * sees only the generic bad-credentials failure — no account-state
 * enumeration.
 *
 * @see DECISIONS.md → "T-017a Verify-First Korrektur per ④"
 * @see SPEC.md §4.1
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

import { AccountUnavailableError, LockedAccountError } from "@/features/auth/errors";

import { emitAdminLockoutAlert } from "./admin-alerts";

const ORG_ID = "greenscout";

/**
 * Pre-computed argon2id hash used for timing hardening on the
 * non-existent-user branch. Every login attempt now performs exactly
 * one argon2 verify, eliminating the response-time side channel that
 * would otherwise let an attacker enumerate which emails belong to
 * registered users.
 *
 * The plaintext (`greenscout-dummy-timing-hardening`) is irrelevant —
 * `verifyPassword(DUMMY_ARGON2_HASH, anyUserInput)` always returns
 * false because the user input never matches. The salt is random and
 * committed; it is NOT a secret.
 *
 * Hash parameters match SPEC §6.3 baseline: argon2id, m=19456, t=2, p=1.
 *
 * Regeneration (one-shot, only needed if SPEC §6.3 parameters change):
 *   node -e "import('@node-rs/argon2').then(m => \
 *     m.hash('greenscout-dummy-timing-hardening', \
 *       { algorithm: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 }) \
 *     .then(h => console.log(h)))"
 */
const DUMMY_ARGON2_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$8Cca+11osq7qn46+JqzGrQ$vCc2m7uSzav1vP/Ml+XfiNHJ6bEOq6k1hfzX+JIa9gQ";

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
 * Returns the authorised user on success.
 *
 * On a generic bad-credentials failure (wrong password OR non-existent
 * user) returns `null` — Auth.js translates that to the generic
 * `CredentialsSignin` error.
 *
 * On a password-correct-but-account-state-blocks failure, throws a
 * typed error subclass that `signInAction` maps to a soft-distinguished
 * UX signal:
 *   - `LockedAccountError(lockedUntil)` — account is in the lockout window
 *   - `AccountUnavailableError("deleted" | "inactive")` — account flag denial
 *
 * The lockout signal therefore ONLY emits to a caller who already proved
 * they know the correct password (i.e. the legitimate user waiting out
 * a timer they themselves triggered earlier). An attacker without the
 * password sees only the generic null-return path. No enumeration.
 */
export async function authorizeCredentials(ctx: AuthorizeContext): Promise<AuthorizedUser | null> {
  const email = normaliseEmail(ctx.email);
  const user = await findUserByEmail(ORG_ID, email, { includeDeleted: true });

  // TIMING HARDENING: always run exactly one argon2 verify, even when
  // the user doesn't exist. Same wall-clock cost as the real path.
  // We branch on `user === null` first so TypeScript narrows `user`
  // to NonNull on the password-correct path below — no defensive
  // `user!` cast or extra unreachable guard needed.
  if (user === null) {
    // The dummy verify's return value is irrelevant — we await purely
    // for its CPU cost.
    await verifyPassword(DUMMY_ARGON2_HASH, ctx.password);
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

  const passwordOk = await verifyPassword(user.passwordHash, ctx.password);

  // BAD-PASSWORD PATH on an existing user — generic null return, with
  // counter increment + possible lockout. No "locked"/"inactive"/
  // "deleted" disclosure on this path (the lockoutUntil check happens
  // AFTER verify-success, never before).
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
      // Renew 1h lockout window, no further admin alerts (anti-spam).
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

  // PASSWORD-CORRECT PATH — soft-distinguished signals are emitted only
  // to callers who have proved they know the password.

  // Soft-deleted user (correct password) — soft-distinguished signal.
  if (user.deletedAt !== null) {
    await createAuditEntry(ORG_ID, {
      user: { connect: { id: user.id } },
      entityType: "Auth",
      entityId: null,
      action: "LOGIN_FAIL",
      changeSet: { reason: ["", "soft-deleted-correct-password"] },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    throw new AccountUnavailableError("deleted");
  }

  // Inactive user (correct password) — soft-distinguished signal.
  if (!user.active) {
    await createAuditEntry(ORG_ID, {
      user: { connect: { id: user.id } },
      entityType: "Auth",
      entityId: null,
      action: "LOGIN_FAIL",
      changeSet: { reason: ["", "inactive-correct-password"] },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    throw new AccountUnavailableError("inactive");
  }

  // Active lockout window (correct password) — soft-distinguished signal.
  // Counter and lockoutUntil are LEFT UNCHANGED: the user typed
  // correctly, they're just waiting the timer out. Neither increment
  // nor reset until the lockout expires and they retry.
  if (user.lockoutUntil !== null && user.lockoutUntil.getTime() > Date.now()) {
    await createAuditEntry(ORG_ID, {
      user: { connect: { id: user.id } },
      entityType: "Auth",
      entityId: null,
      action: "LOGIN_FAIL",
      changeSet: { reason: ["", "locked-correct-password"] },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    throw new LockedAccountError(user.lockoutUntil);
  }

  // SUCCESS PATH — repository resets BOTH counter AND lockoutUntil.
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
