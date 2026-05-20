import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/repositories/audit-log.repository", () => ({
  createAuditEntry: vi.fn().mockResolvedValue(undefined),
}));

import { createAuditEntry } from "@/lib/repositories/audit-log.repository";

import { emitAdminLockoutAlert } from "./admin-alerts";

describe("emitAdminLockoutAlert (T-017 stub)", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("logs a warning identifying user + counter + lockout duration", async () => {
    await emitAdminLockoutAlert({
      userId: "user-1",
      userEmail: "operator@example.com",
      counter: 10,
      ipAddress: "10.0.0.1",
      userAgent: "Mozilla/5.0",
    });

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const message = warnSpy.mock.calls[0][0] as string;
    expect(message).toContain("user-1");
    expect(message).toContain("operator@example.com");
    expect(message).toContain("counter=10");
    expect(message).toContain("1h");
  });

  it("writes a forensic AuditLog row with action=LOCKOUT and counter change", async () => {
    await emitAdminLockoutAlert({
      userId: "user-1",
      userEmail: "operator@example.com",
      counter: 10,
      ipAddress: "10.0.0.1",
      userAgent: "Mozilla/5.0",
    });

    expect(createAuditEntry).toHaveBeenCalledTimes(1);
    expect(createAuditEntry).toHaveBeenCalledWith("greenscout", {
      user: { connect: { id: "user-1" } },
      entityType: "Auth",
      entityId: null,
      action: "LOCKOUT",
      changeSet: { counter: [null, 10] },
      ipAddress: "10.0.0.1",
      userAgent: "Mozilla/5.0",
    });
  });

  it("forwards null ipAddress and userAgent unchanged", async () => {
    await emitAdminLockoutAlert({
      userId: "user-2",
      userEmail: "headless@example.com",
      counter: 10,
      ipAddress: null,
      userAgent: null,
    });

    expect(createAuditEntry).toHaveBeenCalledWith(
      "greenscout",
      expect.objectContaining({ ipAddress: null, userAgent: null }),
    );
  });
});
