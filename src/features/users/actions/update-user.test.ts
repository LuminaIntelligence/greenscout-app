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

import { updateUserAction } from "./update-user";

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

const TARGET = {
  id: "user-1",
  firstName: "Anna",
  lastName: "Beispiel",
  role: "BERATER",
  active: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  headersStore.clear();
  mockedAuth.mockResolvedValue(ADMIN_SESSION);
  vi.mocked(findUserById).mockResolvedValue(TARGET as never);
  vi.mocked(updateUser).mockResolvedValue(TARGET as never);
});

describe("updateUserAction", () => {
  it("returns validation when envelope is malformed", async () => {
    const result = await updateUserAction({ userId: "", data: {} });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe("validation");
  });

  it("returns forbidden when no session", async () => {
    mockedAuth.mockResolvedValueOnce(null);
    const result = await updateUserAction({ userId: "user-1", data: { firstName: "X" } });
    expect(result).toEqual({ ok: false, errorCode: "forbidden" });
  });

  it("returns forbidden when caller is not ADMIN", async () => {
    mockedAuth.mockResolvedValueOnce({
      ...ADMIN_SESSION,
      user: { ...ADMIN_SESSION.user, role: "BERATER" as const },
    });
    const result = await updateUserAction({ userId: "user-1", data: { firstName: "X" } });
    expect(result).toEqual({ ok: false, errorCode: "forbidden" });
  });

  it("returns validation when data is empty", async () => {
    const result = await updateUserAction({ userId: "user-1", data: {} });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe("validation");
  });

  it("returns validation when firstName is empty string", async () => {
    const result = await updateUserAction({
      userId: "user-1",
      data: { firstName: "" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("validation");
      expect(result.fieldErrors).toBeDefined();
    }
  });

  it("returns not-found when target user is missing", async () => {
    vi.mocked(findUserById).mockResolvedValueOnce(null);
    const result = await updateUserAction({
      userId: "user-x",
      data: { firstName: "Updated" },
    });
    expect(result).toEqual({ ok: false, errorCode: "not-found" });
  });

  it("idempotent no-op when patch matches existing values", async () => {
    const result = await updateUserAction({
      userId: "user-1",
      data: { firstName: "Anna", lastName: "Beispiel" },
    });
    expect(result).toEqual({ ok: true, userId: "user-1" });
    expect(updateUser).not.toHaveBeenCalled();
    expect(createAuditEntry).not.toHaveBeenCalled();
  });

  it("happy path: writes diff + audit + revalidates", async () => {
    headersStore.set("x-forwarded-for", "10.0.0.1");
    headersStore.set("user-agent", "Mozilla/5.0");
    const result = await updateUserAction({
      userId: "user-1",
      data: { firstName: "Updated", role: "ADMIN" },
    });
    expect(result).toEqual({ ok: true, userId: "user-1" });
    expect(updateUser).toHaveBeenCalledWith("greenscout", "user-1", {
      firstName: "Updated",
      role: "ADMIN",
    });
    expect(createAuditEntry).toHaveBeenCalledWith(
      "greenscout",
      expect.objectContaining({
        action: "USER_UPDATED",
        entityType: "User",
        entityId: "user-1",
        changeSet: {
          firstName: ["Anna", "Updated"],
          role: ["BERATER", "ADMIN"],
        },
        ipAddress: "10.0.0.1",
        userAgent: "Mozilla/5.0",
      }),
    );
  });

  it("absent x-forwarded-for produces null ipAddress + userAgent", async () => {
    await updateUserAction({
      userId: "user-1",
      data: { firstName: "Updated" },
    });
    expect(createAuditEntry).toHaveBeenCalledWith(
      "greenscout",
      expect.objectContaining({ ipAddress: null, userAgent: null }),
    );
  });

  it("records the active diff when flipping back to true", async () => {
    vi.mocked(findUserById).mockResolvedValueOnce({
      ...TARGET,
      active: false,
    } as never);
    await updateUserAction({ userId: "user-1", data: { active: true } });
    expect(createAuditEntry).toHaveBeenCalledWith(
      "greenscout",
      expect.objectContaining({
        changeSet: { active: [false, true] },
      }),
    );
  });

  it("records lastName diff alone when only that field changes", async () => {
    await updateUserAction({
      userId: "user-1",
      data: { lastName: "Mustermann" },
    });
    expect(createAuditEntry).toHaveBeenCalledWith(
      "greenscout",
      expect.objectContaining({
        changeSet: { lastName: ["Beispiel", "Mustermann"] },
      }),
    );
  });

  it("returns server when updateUser throws", async () => {
    const consoleErr = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(updateUser).mockRejectedValueOnce(new Error("db boom"));
    const result = await updateUserAction({
      userId: "user-1",
      data: { firstName: "Updated" },
    });
    expect(result).toEqual({ ok: false, errorCode: "server" });
    expect(consoleErr).toHaveBeenCalled();
    consoleErr.mockRestore();
  });
});
