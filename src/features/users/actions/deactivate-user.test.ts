import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/repositories/user.repository", () => ({
  findUserById: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock("@/lib/repositories/audit-log.repository", () => ({
  createAuditEntry: vi.fn().mockResolvedValue(undefined),
}));

const headersStore = new Map<string, string | null>();
vi.mock("next/headers", () => ({
  headers: async () => ({
    get: (name: string) => headersStore.get(name.toLowerCase()) ?? null,
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { createAuditEntry } from "@/lib/repositories/audit-log.repository";
import { findUserById, updateUser } from "@/lib/repositories/user.repository";

import { deactivateUserAction } from "./deactivate-user";

const mockedAuth = vi.mocked(auth) as unknown as ReturnType<typeof vi.fn<() => Promise<unknown>>>;

const ADMIN_SESSION = {
  user: {
    id: "admin-1",
    email: "admin@example.com",
    role: "ADMIN" as const,
    mustChangePassword: false,
    formPreference: "WIZARD" as const,
    organizationId: "greenscout",
  },
  expires: "2099-01-01T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  headersStore.clear();
  mockedAuth.mockResolvedValue(ADMIN_SESSION);
  vi.mocked(findUserById).mockResolvedValue({
    id: "user-1",
    active: true,
  } as never);
  vi.mocked(updateUser).mockResolvedValue({ id: "user-1" } as never);
});

describe("deactivateUserAction", () => {
  it("returns validation when input is malformed", async () => {
    const result = await deactivateUserAction({ userId: "" });
    expect(result).toEqual({ ok: false, errorCode: "validation" });
  });

  it("returns forbidden when no session", async () => {
    mockedAuth.mockResolvedValueOnce(null);
    const result = await deactivateUserAction({ userId: "user-1" });
    expect(result).toEqual({ ok: false, errorCode: "forbidden" });
  });

  it("returns forbidden when caller is not ADMIN", async () => {
    mockedAuth.mockResolvedValueOnce({
      ...ADMIN_SESSION,
      user: { ...ADMIN_SESSION.user, role: "BERATER" as const },
    });
    const result = await deactivateUserAction({ userId: "user-1" });
    expect(result).toEqual({ ok: false, errorCode: "forbidden" });
  });

  it("returns self-deactivate when admin targets themselves", async () => {
    const result = await deactivateUserAction({ userId: "admin-1" });
    expect(result).toEqual({ ok: false, errorCode: "self-deactivate" });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("returns not-found when target user missing", async () => {
    vi.mocked(findUserById).mockResolvedValueOnce(null);
    const result = await deactivateUserAction({ userId: "user-x" });
    expect(result).toEqual({ ok: false, errorCode: "not-found" });
  });

  it("idempotent short-circuit when target already inactive", async () => {
    vi.mocked(findUserById).mockResolvedValueOnce({
      id: "user-1",
      active: false,
    } as never);
    const result = await deactivateUserAction({ userId: "user-1" });
    expect(result).toEqual({ ok: true, userId: "user-1" });
    expect(updateUser).not.toHaveBeenCalled();
    expect(createAuditEntry).not.toHaveBeenCalled();
  });

  it("happy path: flips active=false + writes audit + revalidates", async () => {
    headersStore.set("x-forwarded-for", "10.0.0.1");
    headersStore.set("user-agent", "Mozilla/5.0");
    const result = await deactivateUserAction({ userId: "user-1" });
    expect(result).toEqual({ ok: true, userId: "user-1" });
    expect(updateUser).toHaveBeenCalledWith("greenscout", "user-1", { active: false });
    expect(createAuditEntry).toHaveBeenCalledWith(
      "greenscout",
      expect.objectContaining({
        action: "USER_DEACTIVATED",
        entityType: "User",
        entityId: "user-1",
        changeSet: { active: [true, false] },
        ipAddress: "10.0.0.1",
        userAgent: "Mozilla/5.0",
      }),
    );
  });

  it("absent x-forwarded-for produces null ipAddress + userAgent", async () => {
    await deactivateUserAction({ userId: "user-1" });
    expect(createAuditEntry).toHaveBeenCalledWith(
      "greenscout",
      expect.objectContaining({ ipAddress: null, userAgent: null }),
    );
  });

  it("returns server when updateUser throws", async () => {
    const consoleErr = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(updateUser).mockRejectedValueOnce(new Error("db boom"));
    const result = await deactivateUserAction({ userId: "user-1" });
    expect(result).toEqual({ ok: false, errorCode: "server" });
    expect(consoleErr).toHaveBeenCalled();
    consoleErr.mockRestore();
  });
});
