import { beforeEach, describe, expect, it, vi } from "vitest";

// All upstream dependencies are mocked so the test exercises only the
// state-machine logic in authorize-credentials.ts.
vi.mock("@/lib/repositories/user.repository", () => ({
  findUserByEmail: vi.fn(),
  incrementFailedLoginCount: vi.fn().mockResolvedValue(undefined),
  resetFailedLoginCount: vi.fn().mockResolvedValue(undefined),
  setLockoutUntil: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/repositories/audit-log.repository", () => ({
  createAuditEntry: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/features/auth/password-policy", () => ({
  verifyPassword: vi.fn(),
}));
vi.mock("./admin-alerts", () => ({
  emitAdminLockoutAlert: vi.fn().mockResolvedValue(undefined),
}));

import { AccountUnavailableError, LockedAccountError } from "@/features/auth/errors";
import { verifyPassword } from "@/features/auth/password-policy";
import { createAuditEntry } from "@/lib/repositories/audit-log.repository";
import {
  findUserByEmail,
  incrementFailedLoginCount,
  resetFailedLoginCount,
  setLockoutUntil,
} from "@/lib/repositories/user.repository";

import { emitAdminLockoutAlert } from "./admin-alerts";
import { authorizeCredentials } from "./authorize-credentials";

const ORG = "greenscout";

// Must match the constant in authorize-credentials.ts. Asserted via the
// timing-hardening tests so accidental drift fails loudly.
const DUMMY_ARGON2_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$8Cca+11osq7qn46+JqzGrQ$vCc2m7uSzav1vP/Ml+XfiNHJ6bEOq6k1hfzX+JIa9gQ";

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
    mustChangePassword: false,
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
  email: "User@Example.com",
  password: "TopSecret1!",
  ipAddress: "10.0.0.1",
  userAgent: "Mozilla/5.0",
};

beforeEach(() => {
  // resetAllMocks (not clearAllMocks) wipes both call history AND any
  // queued mockResolvedValueOnce results from previous tests. Without
  // this, an unconsumed `mockResolvedValueOnce(true)` would leak into
  // the next test's `verifyPassword` call.
  vi.resetAllMocks();
});

describe("authorizeCredentials — success path", () => {
  it("returns the authorised user and resets the counter", async () => {
    vi.mocked(findUserByEmail).mockResolvedValueOnce(makeUser());
    vi.mocked(verifyPassword).mockResolvedValueOnce(true);

    const result = await authorizeCredentials(CTX_BASE);

    expect(result).toEqual({
      id: "user-1",
      email: "user@example.com",
      role: "BERATER",
      mustChangePassword: false,
      formPreference: "WIZARD",
      organizationId: ORG,
    });
    expect(resetFailedLoginCount).toHaveBeenCalledWith(ORG, "user-1");
    expect(createAuditEntry).toHaveBeenCalledWith(ORG, {
      user: { connect: { id: "user-1" } },
      entityType: "Auth",
      entityId: null,
      action: "LOGIN_SUCCESS",
      changeSet: { reason: ["", "credentials"] },
      ipAddress: "10.0.0.1",
      userAgent: "Mozilla/5.0",
    });
    expect(incrementFailedLoginCount).not.toHaveBeenCalled();
    expect(setLockoutUntil).not.toHaveBeenCalled();
    expect(emitAdminLockoutAlert).not.toHaveBeenCalled();
  });

  it("normalises the email before the lookup (case+whitespace)", async () => {
    vi.mocked(findUserByEmail).mockResolvedValueOnce(makeUser());
    vi.mocked(verifyPassword).mockResolvedValueOnce(true);

    await authorizeCredentials({ ...CTX_BASE, email: "  User@Example.COM  " });

    expect(findUserByEmail).toHaveBeenCalledWith(ORG, "user@example.com", {
      includeDeleted: true,
    });
  });

  it("clears a stale lockoutUntil that is already in the past on success", async () => {
    const past = new Date(Date.now() - 60 * 1000);
    vi.mocked(findUserByEmail).mockResolvedValueOnce(
      makeUser({ lockoutUntil: past, failedLoginCount: 5 }),
    );
    vi.mocked(verifyPassword).mockResolvedValueOnce(true);

    const result = await authorizeCredentials(CTX_BASE);

    expect(result).not.toBeNull();
    expect(resetFailedLoginCount).toHaveBeenCalledWith(ORG, "user-1");
  });
});

describe("authorizeCredentials — timing hardening (verify always runs once)", () => {
  it("calls verifyPassword exactly once against DUMMY_ARGON2_HASH when the user does not exist", async () => {
    vi.mocked(findUserByEmail).mockResolvedValueOnce(null);
    vi.mocked(verifyPassword).mockResolvedValueOnce(false);

    const result = await authorizeCredentials(CTX_BASE);

    expect(result).toBeNull();
    expect(verifyPassword).toHaveBeenCalledTimes(1);
    expect(verifyPassword).toHaveBeenCalledWith(DUMMY_ARGON2_HASH, CTX_BASE.password);
    expect(incrementFailedLoginCount).not.toHaveBeenCalled();
    expect(setLockoutUntil).not.toHaveBeenCalled();
    expect(emitAdminLockoutAlert).not.toHaveBeenCalled();
    expect(createAuditEntry).toHaveBeenCalledWith(ORG, {
      entityType: "Auth",
      entityId: null,
      action: "LOGIN_FAIL",
      changeSet: { reason: ["", "non-existent"] },
      ipAddress: "10.0.0.1",
      userAgent: "Mozilla/5.0",
    });
  });

  it("calls verifyPassword exactly once against user.passwordHash when the user exists", async () => {
    vi.mocked(findUserByEmail).mockResolvedValueOnce(
      makeUser({ passwordHash: "$argon2id$user-real-hash" }),
    );
    vi.mocked(verifyPassword).mockResolvedValueOnce(true);

    await authorizeCredentials(CTX_BASE);

    expect(verifyPassword).toHaveBeenCalledTimes(1);
    expect(verifyPassword).toHaveBeenCalledWith("$argon2id$user-real-hash", CTX_BASE.password);
  });
});

describe("authorizeCredentials — bad-password path (generic disclosure)", () => {
  it("counterAfter=1 (was 0): increments only, no lockout set, audits bad-password", async () => {
    vi.mocked(findUserByEmail).mockResolvedValueOnce(makeUser({ failedLoginCount: 0 }));
    vi.mocked(verifyPassword).mockResolvedValueOnce(false);

    const result = await authorizeCredentials(CTX_BASE);

    expect(result).toBeNull();
    expect(incrementFailedLoginCount).toHaveBeenCalledTimes(1);
    expect(setLockoutUntil).not.toHaveBeenCalled();
    expect(emitAdminLockoutAlert).not.toHaveBeenCalled();
    expect(createAuditEntry).toHaveBeenCalledWith(
      ORG,
      expect.objectContaining({
        action: "LOGIN_FAIL",
        changeSet: { reason: ["", "bad-password"], counterAfter: [null, 1] },
      }),
    );
  });

  it("counterAfter=4 (was 3): no lockout set", async () => {
    vi.mocked(findUserByEmail).mockResolvedValueOnce(makeUser({ failedLoginCount: 3 }));
    vi.mocked(verifyPassword).mockResolvedValueOnce(false);

    await authorizeCredentials(CTX_BASE);

    expect(incrementFailedLoginCount).toHaveBeenCalledTimes(1);
    expect(setLockoutUntil).not.toHaveBeenCalled();
    expect(emitAdminLockoutAlert).not.toHaveBeenCalled();
  });

  it("counterAfter=5 (was 4): 15-minute lockout, no admin alert", async () => {
    vi.mocked(findUserByEmail).mockResolvedValueOnce(makeUser({ failedLoginCount: 4 }));
    vi.mocked(verifyPassword).mockResolvedValueOnce(false);

    const before = Date.now();
    await authorizeCredentials(CTX_BASE);
    const after = Date.now();

    expect(setLockoutUntil).toHaveBeenCalledTimes(1);
    const callArgs = vi.mocked(setLockoutUntil).mock.calls[0];
    expect(callArgs[0]).toBe(ORG);
    expect(callArgs[1]).toBe("user-1");
    const until = callArgs[2] as Date;
    expect(until.getTime() - before).toBeGreaterThanOrEqual(15 * 60 * 1000);
    expect(until.getTime() - after).toBeLessThanOrEqual(15 * 60 * 1000);
    expect(emitAdminLockoutAlert).not.toHaveBeenCalled();
  });

  it("counterAfter=9 (was 8): no lockout set", async () => {
    vi.mocked(findUserByEmail).mockResolvedValueOnce(makeUser({ failedLoginCount: 8 }));
    vi.mocked(verifyPassword).mockResolvedValueOnce(false);

    await authorizeCredentials(CTX_BASE);

    expect(setLockoutUntil).not.toHaveBeenCalled();
    expect(emitAdminLockoutAlert).not.toHaveBeenCalled();
  });

  it("counterAfter=10 (was 9): 1-hour lockout AND admin alert fires exactly once", async () => {
    vi.mocked(findUserByEmail).mockResolvedValueOnce(makeUser({ failedLoginCount: 9 }));
    vi.mocked(verifyPassword).mockResolvedValueOnce(false);

    const before = Date.now();
    await authorizeCredentials(CTX_BASE);
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
    vi.mocked(findUserByEmail).mockResolvedValueOnce(makeUser({ failedLoginCount: 10 }));
    vi.mocked(verifyPassword).mockResolvedValueOnce(false);

    const before = Date.now();
    await authorizeCredentials(CTX_BASE);
    const after = Date.now();

    expect(setLockoutUntil).toHaveBeenCalledTimes(1);
    const until = vi.mocked(setLockoutUntil).mock.calls[0][2] as Date;
    expect(until.getTime() - before).toBeGreaterThanOrEqual(60 * 60 * 1000);
    expect(until.getTime() - after).toBeLessThanOrEqual(60 * 60 * 1000);
    expect(emitAdminLockoutAlert).not.toHaveBeenCalled();
  });

  it("soft-deleted user + WRONG password falls through generic bad-password (no soft-deleted disclosure)", async () => {
    vi.mocked(findUserByEmail).mockResolvedValueOnce(
      makeUser({ deletedAt: new Date("2026-01-01T00:00:00Z"), failedLoginCount: 0 }),
    );
    vi.mocked(verifyPassword).mockResolvedValueOnce(false);

    const result = await authorizeCredentials(CTX_BASE);

    expect(result).toBeNull();
    expect(incrementFailedLoginCount).toHaveBeenCalledTimes(1);
    expect(createAuditEntry).toHaveBeenCalledWith(
      ORG,
      expect.objectContaining({
        action: "LOGIN_FAIL",
        changeSet: { reason: ["", "bad-password"], counterAfter: [null, 1] },
      }),
    );
  });

  it("inactive user + WRONG password falls through generic bad-password (no inactive disclosure)", async () => {
    vi.mocked(findUserByEmail).mockResolvedValueOnce(
      makeUser({ active: false, failedLoginCount: 0 }),
    );
    vi.mocked(verifyPassword).mockResolvedValueOnce(false);

    const result = await authorizeCredentials(CTX_BASE);

    expect(result).toBeNull();
    expect(incrementFailedLoginCount).toHaveBeenCalledTimes(1);
    expect(createAuditEntry).toHaveBeenCalledWith(
      ORG,
      expect.objectContaining({
        changeSet: { reason: ["", "bad-password"], counterAfter: [null, 1] },
      }),
    );
  });

  it("locked user + WRONG password falls through generic bad-password (counter increments, no 'locked' disclosure)", async () => {
    const future = new Date(Date.now() + 60 * 60 * 1000);
    vi.mocked(findUserByEmail).mockResolvedValueOnce(
      makeUser({ lockoutUntil: future, failedLoginCount: 7 }),
    );
    vi.mocked(verifyPassword).mockResolvedValueOnce(false);

    const result = await authorizeCredentials(CTX_BASE);

    expect(result).toBeNull();
    // Counter increments — attacker cannot tell account was locked.
    expect(incrementFailedLoginCount).toHaveBeenCalledTimes(1);
    expect(createAuditEntry).toHaveBeenCalledWith(
      ORG,
      expect.objectContaining({
        changeSet: { reason: ["", "bad-password"], counterAfter: [null, 8] },
      }),
    );
  });
});

describe("authorizeCredentials — soft-distinguished signals (password-correct paths)", () => {
  it("soft-deleted user + CORRECT password throws AccountUnavailableError('deleted')", async () => {
    vi.mocked(findUserByEmail).mockResolvedValueOnce(
      makeUser({ deletedAt: new Date("2026-01-01T00:00:00Z") }),
    );
    vi.mocked(verifyPassword).mockResolvedValueOnce(true);

    await expect(authorizeCredentials(CTX_BASE)).rejects.toBeInstanceOf(AccountUnavailableError);

    expect(createAuditEntry).toHaveBeenCalledWith(
      ORG,
      expect.objectContaining({
        action: "LOGIN_FAIL",
        changeSet: { reason: ["", "soft-deleted-correct-password"] },
      }),
    );
    expect(incrementFailedLoginCount).not.toHaveBeenCalled();
    expect(setLockoutUntil).not.toHaveBeenCalled();
  });

  it("soft-deleted user + correct password — error carries code='deleted'", async () => {
    vi.mocked(findUserByEmail).mockResolvedValueOnce(
      makeUser({ deletedAt: new Date("2026-01-01T00:00:00Z") }),
    );
    vi.mocked(verifyPassword).mockResolvedValueOnce(true);

    try {
      await authorizeCredentials(CTX_BASE);
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(AccountUnavailableError);
      expect((err as AccountUnavailableError).code).toBe("deleted");
    }
  });

  it("inactive user + CORRECT password throws AccountUnavailableError('inactive')", async () => {
    vi.mocked(findUserByEmail).mockResolvedValueOnce(makeUser({ active: false }));
    vi.mocked(verifyPassword).mockResolvedValueOnce(true);

    try {
      await authorizeCredentials(CTX_BASE);
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(AccountUnavailableError);
      expect((err as AccountUnavailableError).code).toBe("inactive");
    }

    expect(createAuditEntry).toHaveBeenCalledWith(
      ORG,
      expect.objectContaining({
        action: "LOGIN_FAIL",
        changeSet: { reason: ["", "inactive-correct-password"] },
      }),
    );
    expect(incrementFailedLoginCount).not.toHaveBeenCalled();
    expect(setLockoutUntil).not.toHaveBeenCalled();
  });

  it("locked user + CORRECT password throws LockedAccountError(lockedUntil), counter & lockoutUntil UNCHANGED", async () => {
    const future = new Date(Date.now() + 60 * 60 * 1000);
    vi.mocked(findUserByEmail).mockResolvedValueOnce(
      makeUser({ lockoutUntil: future, failedLoginCount: 7 }),
    );
    vi.mocked(verifyPassword).mockResolvedValueOnce(true);

    try {
      await authorizeCredentials(CTX_BASE);
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(LockedAccountError);
      expect((err as LockedAccountError).lockedUntil).toBe(future);
    }

    // Counter UNCHANGED — user typed correctly, just waiting timer out.
    expect(incrementFailedLoginCount).not.toHaveBeenCalled();
    // lockoutUntil UNCHANGED — neither re-set nor cleared.
    expect(setLockoutUntil).not.toHaveBeenCalled();
    expect(resetFailedLoginCount).not.toHaveBeenCalled();
    expect(createAuditEntry).toHaveBeenCalledWith(
      ORG,
      expect.objectContaining({
        action: "LOGIN_FAIL",
        changeSet: { reason: ["", "locked-correct-password"] },
      }),
    );
  });
});

describe("authorizeCredentials — null ipAddress / userAgent forwarding", () => {
  it("preserves null IP / UA through the non-existent audit row", async () => {
    vi.mocked(findUserByEmail).mockResolvedValueOnce(null);
    vi.mocked(verifyPassword).mockResolvedValueOnce(false);

    await authorizeCredentials({
      email: "ghost@example.com",
      password: "irrelevant",
      ipAddress: null,
      userAgent: null,
    });

    expect(createAuditEntry).toHaveBeenCalledWith(
      ORG,
      expect.objectContaining({ ipAddress: null, userAgent: null }),
    );
  });
});
