/**
 * T-019 change-password service — 100% coverage gate.
 *
 * Mocks all upstream repository / utility functions so the test
 * exercises only the state-machine logic in change-password.ts.
 *
 * Scenarios cover every branch:
 *   - Non-existent user → server error
 *   - Lockout-first (active lockout window)  → locked errorCode
 *   - Wrong currentPassword × 5 counter branches (1, 5, 9, 10, 11)
 *   - same-as-current
 *   - rules-not-satisfied
 *   - Success (forced + voluntary) → $transaction wires all 3 writes
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Mock every upstream dependency ─────────────────────────────────────
vi.mock("@/lib/repositories/user.repository", () => ({
  findUserById: vi.fn(),
  incrementFailedLoginCount: vi.fn().mockResolvedValue(undefined),
  resetFailedLoginCount: vi.fn().mockResolvedValue(undefined),
  setLockoutUntil: vi.fn().mockResolvedValue(undefined),
  setMustChangePassword: vi.fn().mockResolvedValue(undefined),
  updatePasswordHash: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/repositories/audit-log.repository", () => ({
  createAuditEntry: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/repositories/transaction", () => ({
  // Pass-through: the lambda runs immediately with a stub tx object.
  withTransaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({ __mock: "tx" })),
}));
vi.mock("@/features/auth/password-policy", () => ({
  validatePassword: vi.fn(),
}));
vi.mock("@/features/auth/utils/hash-password", () => ({
  verifyPassword: vi.fn(),
  hashPassword: vi.fn(),
}));
vi.mock("./admin-alerts", () => ({
  emitAdminLockoutAlert: vi.fn().mockResolvedValue(undefined),
}));

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
import { changePassword } from "./change-password";

const ORG = "greenscout";

interface MockUserOverrides {
  id?: string;
  email?: string;
  role?: "ADMIN" | "BERATER";
  mustChangePassword?: boolean;
  formPreference?: "WIZARD" | "SINGLE_PAGE";
  organizationId?: string;
  passwordHash?: string;
  active?: boolean;
  deletedAt?: Date | null;
  failedLoginCount?: number;
  lockoutUntil?: Date | null;
}

function makeUser(overrides: MockUserOverrides = {}) {
  return {
    id: "user-1",
    email: "user@example.com",
    role: "BERATER" as const,
    mustChangePassword: true,
    formPreference: "WIZARD" as const,
    organizationId: ORG,
    passwordHash: "$argon2id$user-real-hash",
    passwordChangedAt: null,
    firstName: "Test",
    lastName: "User",
    phone: null,
    mobile: null,
    addressLine: null,
    signaturePhotoUrl: null,
    active: true,
    deletedAt: null,
    failedLoginCount: 0,
    lockoutUntil: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

const CTX_BASE = {
  userId: "user-1",
  organizationId: ORG,
  currentPassword: "OldSecret1!",
  newPassword: "NewSecret2@",
  ipAddress: "10.0.0.1",
  userAgent: "Mozilla/5.0",
};

beforeEach(() => {
  vi.resetAllMocks();
  // Re-establish default mock implementations after resetAllMocks().
  vi.mocked(withTransaction).mockImplementation(async (fn) => fn({ __mock: "tx" } as never));
});

describe("changePassword — defensive: non-existent user", () => {
  it("returns server error when findUserById returns null (defensive — middleware should prevent)", async () => {
    vi.mocked(findUserById).mockResolvedValueOnce(null);

    const result = await changePassword(CTX_BASE);

    expect(result).toEqual({ ok: false, errorCode: "server" });
    expect(verifyPassword).not.toHaveBeenCalled();
    expect(updatePasswordHash).not.toHaveBeenCalled();
    expect(createAuditEntry).not.toHaveBeenCalled();
  });
});

describe("changePassword — lockout-first (active lockout window)", () => {
  it("returns locked with ISO lockedUntil, no verify, no DB mutations beyond audit", async () => {
    const future = new Date(Date.now() + 30 * 60 * 1000);
    vi.mocked(findUserById).mockResolvedValueOnce(
      makeUser({ lockoutUntil: future, failedLoginCount: 7 }),
    );

    const result = await changePassword(CTX_BASE);

    expect(result).toEqual({
      ok: false,
      errorCode: "locked",
      lockedUntil: future.toISOString(),
    });
    // Lockout-first: argon2 verify must NOT run.
    expect(verifyPassword).not.toHaveBeenCalled();
    expect(incrementFailedLoginCount).not.toHaveBeenCalled();
    expect(setLockoutUntil).not.toHaveBeenCalled();
    expect(updatePasswordHash).not.toHaveBeenCalled();
    expect(setMustChangePassword).not.toHaveBeenCalled();
    expect(resetFailedLoginCount).not.toHaveBeenCalled();
    expect(emitAdminLockoutAlert).not.toHaveBeenCalled();
    expect(withTransaction).not.toHaveBeenCalled();

    expect(createAuditEntry).toHaveBeenCalledWith(
      ORG,
      expect.objectContaining({
        action: "PASSWORD_CHANGE_FAIL",
        changeSet: { reason: ["", "locked"] },
      }),
    );
  });

  it("ignores a stale lockoutUntil that is already in the past (treated as not-locked)", async () => {
    const past = new Date(Date.now() - 60 * 1000);
    vi.mocked(findUserById).mockResolvedValueOnce(makeUser({ lockoutUntil: past }));
    vi.mocked(verifyPassword).mockResolvedValueOnce(true);
    vi.mocked(validatePassword).mockReturnValueOnce({ ok: true, rules: [] });
    vi.mocked(hashPassword).mockResolvedValueOnce("$argon2id$new-hash");

    const result = await changePassword(CTX_BASE);

    expect(result.ok).toBe(true);
    expect(verifyPassword).toHaveBeenCalled();
  });
});

describe("changePassword — wrong currentPassword (counter branches)", () => {
  it("counterAfter=1 (was 0): increments only, no lockout, audit FAIL wrong-current", async () => {
    vi.mocked(findUserById).mockResolvedValueOnce(makeUser({ failedLoginCount: 0 }));
    vi.mocked(verifyPassword).mockResolvedValueOnce(false);

    const result = await changePassword(CTX_BASE);

    expect(result).toEqual({ ok: false, errorCode: "wrong-current-password" });
    expect(incrementFailedLoginCount).toHaveBeenCalledTimes(1);
    expect(setLockoutUntil).not.toHaveBeenCalled();
    expect(emitAdminLockoutAlert).not.toHaveBeenCalled();
    expect(createAuditEntry).toHaveBeenCalledWith(
      ORG,
      expect.objectContaining({
        action: "PASSWORD_CHANGE_FAIL",
        changeSet: { reason: ["", "wrong-current"], counterAfter: [null, 1] },
      }),
    );
  });

  it("counterAfter=5 (was 4): 15-minute lockout, no admin alert", async () => {
    vi.mocked(findUserById).mockResolvedValueOnce(makeUser({ failedLoginCount: 4 }));
    vi.mocked(verifyPassword).mockResolvedValueOnce(false);

    const before = Date.now();
    const result = await changePassword(CTX_BASE);
    const after = Date.now();

    expect(result).toEqual({ ok: false, errorCode: "wrong-current-password" });
    expect(setLockoutUntil).toHaveBeenCalledTimes(1);
    const callArgs = vi.mocked(setLockoutUntil).mock.calls[0];
    expect(callArgs[0]).toBe(ORG);
    expect(callArgs[1]).toBe("user-1");
    const until = callArgs[2] as Date;
    expect(until.getTime() - before).toBeGreaterThanOrEqual(15 * 60 * 1000);
    expect(until.getTime() - after).toBeLessThanOrEqual(15 * 60 * 1000);
    expect(emitAdminLockoutAlert).not.toHaveBeenCalled();
  });

  it("counterAfter=9 (was 8): no lockout set, no admin alert", async () => {
    vi.mocked(findUserById).mockResolvedValueOnce(makeUser({ failedLoginCount: 8 }));
    vi.mocked(verifyPassword).mockResolvedValueOnce(false);

    await changePassword(CTX_BASE);

    expect(setLockoutUntil).not.toHaveBeenCalled();
    expect(emitAdminLockoutAlert).not.toHaveBeenCalled();
  });

  it("counterAfter=10 (was 9): 1-hour lockout AND admin alert fires exactly once", async () => {
    vi.mocked(findUserById).mockResolvedValueOnce(makeUser({ failedLoginCount: 9 }));
    vi.mocked(verifyPassword).mockResolvedValueOnce(false);

    const before = Date.now();
    await changePassword(CTX_BASE);
    const after = Date.now();

    expect(setLockoutUntil).toHaveBeenCalledTimes(1);
    const until = vi.mocked(setLockoutUntil).mock.calls[0][2] as Date;
    expect(until.getTime() - before).toBeGreaterThanOrEqual(60 * 60 * 1000);
    expect(until.getTime() - after).toBeLessThanOrEqual(60 * 60 * 1000);

    expect(emitAdminLockoutAlert).toHaveBeenCalledTimes(1);
    expect(emitAdminLockoutAlert).toHaveBeenCalledWith({
      userId: "user-1",
      userEmail: "user@example.com",
      counter: 10,
      ipAddress: "10.0.0.1",
      userAgent: "Mozilla/5.0",
    });
  });

  it("counterAfter=11 (was 10): renew 1-hour lockout, NO admin alert (anti-spam)", async () => {
    vi.mocked(findUserById).mockResolvedValueOnce(makeUser({ failedLoginCount: 10 }));
    vi.mocked(verifyPassword).mockResolvedValueOnce(false);

    const before = Date.now();
    await changePassword(CTX_BASE);
    const after = Date.now();

    expect(setLockoutUntil).toHaveBeenCalledTimes(1);
    const until = vi.mocked(setLockoutUntil).mock.calls[0][2] as Date;
    expect(until.getTime() - before).toBeGreaterThanOrEqual(60 * 60 * 1000);
    expect(until.getTime() - after).toBeLessThanOrEqual(60 * 60 * 1000);
    expect(emitAdminLockoutAlert).not.toHaveBeenCalled();
  });

  it("wrong-current path NEVER touches updatePasswordHash / setMustChangePassword / resetFailedLoginCount", async () => {
    vi.mocked(findUserById).mockResolvedValueOnce(makeUser({ failedLoginCount: 0 }));
    vi.mocked(verifyPassword).mockResolvedValueOnce(false);

    await changePassword(CTX_BASE);

    expect(updatePasswordHash).not.toHaveBeenCalled();
    expect(setMustChangePassword).not.toHaveBeenCalled();
    expect(resetFailedLoginCount).not.toHaveBeenCalled();
    expect(withTransaction).not.toHaveBeenCalled();
  });
});

describe("changePassword — same-as-current", () => {
  it("returns same-as-current, audits FAIL, no DB writes beyond audit", async () => {
    vi.mocked(findUserById).mockResolvedValueOnce(makeUser());
    vi.mocked(verifyPassword).mockResolvedValueOnce(true);

    const result = await changePassword({ ...CTX_BASE, newPassword: CTX_BASE.currentPassword });

    expect(result).toEqual({ ok: false, errorCode: "same-as-current" });
    expect(updatePasswordHash).not.toHaveBeenCalled();
    expect(setMustChangePassword).not.toHaveBeenCalled();
    expect(resetFailedLoginCount).not.toHaveBeenCalled();
    expect(withTransaction).not.toHaveBeenCalled();
    expect(validatePassword).not.toHaveBeenCalled();
    expect(hashPassword).not.toHaveBeenCalled();
    expect(createAuditEntry).toHaveBeenCalledWith(
      ORG,
      expect.objectContaining({
        action: "PASSWORD_CHANGE_FAIL",
        changeSet: { reason: ["", "same-as-current"] },
      }),
    );
  });
});

describe("changePassword — rules-not-satisfied", () => {
  it("returns rules-not-satisfied when validatePassword().ok === false, audits FAIL", async () => {
    vi.mocked(findUserById).mockResolvedValueOnce(makeUser());
    vi.mocked(verifyPassword).mockResolvedValueOnce(true);
    vi.mocked(validatePassword).mockReturnValueOnce({ ok: false, rules: [] });

    const result = await changePassword(CTX_BASE);

    expect(result).toEqual({ ok: false, errorCode: "rules-not-satisfied" });
    expect(hashPassword).not.toHaveBeenCalled();
    expect(updatePasswordHash).not.toHaveBeenCalled();
    expect(setMustChangePassword).not.toHaveBeenCalled();
    expect(resetFailedLoginCount).not.toHaveBeenCalled();
    expect(withTransaction).not.toHaveBeenCalled();
    expect(createAuditEntry).toHaveBeenCalledWith(
      ORG,
      expect.objectContaining({
        action: "PASSWORD_CHANGE_FAIL",
        changeSet: { reason: ["", "rules-not-satisfied"] },
      }),
    );
  });
});

describe("changePassword — success (forced)", () => {
  it("wraps the 3 writes in withTransaction, audits PASSWORD_RESET initiator=user-forced", async () => {
    vi.mocked(findUserById).mockResolvedValueOnce(makeUser({ mustChangePassword: true }));
    vi.mocked(verifyPassword).mockResolvedValueOnce(true);
    vi.mocked(validatePassword).mockReturnValueOnce({ ok: true, rules: [] });
    vi.mocked(hashPassword).mockResolvedValueOnce("$argon2id$new-hash");

    const result = await changePassword(CTX_BASE);

    expect(result).toEqual({ ok: true, initiator: "user-forced" });

    // All three writes ran through withTransaction.
    expect(withTransaction).toHaveBeenCalledTimes(1);
    expect(updatePasswordHash).toHaveBeenCalledTimes(1);
    expect(setMustChangePassword).toHaveBeenCalledTimes(1);
    expect(resetFailedLoginCount).toHaveBeenCalledTimes(1);

    expect(updatePasswordHash).toHaveBeenCalledWith(
      ORG,
      "user-1",
      "$argon2id$new-hash",
      expect.objectContaining({ __mock: "tx" }),
    );
    expect(setMustChangePassword).toHaveBeenCalledWith(
      ORG,
      "user-1",
      false,
      expect.objectContaining({ __mock: "tx" }),
    );
    expect(resetFailedLoginCount).toHaveBeenCalledWith(
      ORG,
      "user-1",
      expect.objectContaining({ __mock: "tx" }),
    );

    expect(createAuditEntry).toHaveBeenCalledWith(
      ORG,
      expect.objectContaining({
        action: "PASSWORD_RESET",
        changeSet: { initiator: ["", "user-forced"] },
      }),
    );
    // No counter increments on the success path.
    expect(incrementFailedLoginCount).not.toHaveBeenCalled();
    expect(setLockoutUntil).not.toHaveBeenCalled();
    expect(emitAdminLockoutAlert).not.toHaveBeenCalled();
  });
});

describe("changePassword — success (voluntary)", () => {
  it("audits PASSWORD_RESET initiator=user-voluntary when user.mustChangePassword was already false", async () => {
    vi.mocked(findUserById).mockResolvedValueOnce(makeUser({ mustChangePassword: false }));
    vi.mocked(verifyPassword).mockResolvedValueOnce(true);
    vi.mocked(validatePassword).mockReturnValueOnce({ ok: true, rules: [] });
    vi.mocked(hashPassword).mockResolvedValueOnce("$argon2id$new-hash-2");

    const result = await changePassword(CTX_BASE);

    expect(result).toEqual({ ok: true, initiator: "user-voluntary" });
    expect(createAuditEntry).toHaveBeenCalledWith(
      ORG,
      expect.objectContaining({
        action: "PASSWORD_RESET",
        changeSet: { initiator: ["", "user-voluntary"] },
      }),
    );
  });
});

describe("changePassword — audit context plumbing (null IP / UA forwarding)", () => {
  it("preserves null ipAddress / userAgent through audit rows", async () => {
    vi.mocked(findUserById).mockResolvedValueOnce(makeUser());
    vi.mocked(verifyPassword).mockResolvedValueOnce(true);
    vi.mocked(validatePassword).mockReturnValueOnce({ ok: true, rules: [] });
    vi.mocked(hashPassword).mockResolvedValueOnce("$argon2id$h");

    await changePassword({ ...CTX_BASE, ipAddress: null, userAgent: null });

    expect(createAuditEntry).toHaveBeenCalledWith(
      ORG,
      expect.objectContaining({ ipAddress: null, userAgent: null }),
    );
  });
});
