import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/repositories/user.repository", () => ({
  createUser: vi.fn(),
  findUserByEmail: vi.fn(),
}));

vi.mock("@/lib/repositories/audit-log.repository", () => ({
  createAuditEntry: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/features/auth/utils/hash-password", () => ({
  hashPassword: vi.fn().mockResolvedValue("argon2id$hash"),
}));

// `node:crypto` is mocked once below so each test gets a stable
// `randomUUID` and the temp-password slice is predictable. A
// `default` export is required because Vitest's auto-mock of a
// CJS-style module would otherwise complain about the missing
// default — even though our action consumes only the named export.
vi.mock("node:crypto", () => {
  const randomUUID = vi.fn().mockReturnValue("0123456789abcdef0123456789abcdef");
  return { randomUUID, default: { randomUUID } };
});

const headersStore = new Map<string, string | null>();
vi.mock("next/headers", () => ({
  headers: async () => ({
    get: (name: string) => headersStore.get(name.toLowerCase()) ?? null,
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { hashPassword } from "@/features/auth/utils/hash-password";
import { auth } from "@/lib/auth";
import { createAuditEntry } from "@/lib/repositories/audit-log.repository";
import { createUser, findUserByEmail } from "@/lib/repositories/user.repository";

import { createUserAction } from "./create-user";

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

const BERATER_SESSION = {
  ...ADMIN_SESSION,
  user: { ...ADMIN_SESSION.user, id: "user-1", role: "BERATER" as const },
};

const VALID_PAYLOAD = {
  email: "new@example.com",
  firstName: "Anna",
  lastName: "Beispiel",
  role: "BERATER" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  headersStore.clear();
  mockedAuth.mockResolvedValue(ADMIN_SESSION);
  vi.mocked(findUserByEmail).mockResolvedValue(null);
  vi.mocked(createUser).mockResolvedValue({ id: "user-new" } as never);
});

describe("createUserAction", () => {
  it("returns forbidden when no session", async () => {
    mockedAuth.mockResolvedValueOnce(null);
    const result = await createUserAction(VALID_PAYLOAD);
    expect(result).toEqual({ ok: false, errorCode: "forbidden" });
  });

  it("returns forbidden when caller is not ADMIN", async () => {
    mockedAuth.mockResolvedValueOnce(BERATER_SESSION);
    const result = await createUserAction(VALID_PAYLOAD);
    expect(result).toEqual({ ok: false, errorCode: "forbidden" });
    expect(createUser).not.toHaveBeenCalled();
  });

  it("returns validation when email is missing", async () => {
    const result = await createUserAction({ ...VALID_PAYLOAD, email: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("validation");
      expect(result.fieldErrors?.email).toBeDefined();
    }
  });

  it("returns validation when role is invalid", async () => {
    const result = await createUserAction({ ...VALID_PAYLOAD, role: "GUEST" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe("validation");
  });

  it("returns email-taken when an existing user has the same email", async () => {
    vi.mocked(findUserByEmail).mockResolvedValueOnce({ id: "existing" } as never);
    const result = await createUserAction(VALID_PAYLOAD);
    expect(result).toEqual({ ok: false, errorCode: "email-taken" });
    expect(createUser).not.toHaveBeenCalled();
  });

  it("returns server when hashPassword throws", async () => {
    const consoleErr = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(hashPassword).mockRejectedValueOnce(new Error("hash boom"));
    const result = await createUserAction(VALID_PAYLOAD);
    expect(result).toEqual({ ok: false, errorCode: "server" });
    consoleErr.mockRestore();
  });

  it("happy path: persists user, writes audit, returns temp password once", async () => {
    headersStore.set("x-forwarded-for", "10.0.0.1");
    headersStore.set("user-agent", "Mozilla/5.0");
    const result = await createUserAction(VALID_PAYLOAD);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.userId).toBe("user-new");
      // 12 chars from randomUUID -> stripped dashes -> slice(0, 12).
      expect(result.tempPassword).toHaveLength(12);
      expect(result.tempPassword).toMatch(/^[0-9a-f]{12}$/);
    }
    expect(createUser).toHaveBeenCalledWith(
      "greenscout",
      expect.objectContaining({
        email: "new@example.com",
        firstName: "Anna",
        lastName: "Beispiel",
        role: "BERATER",
        mustChangePassword: true,
        active: true,
        passwordHash: "argon2id$hash",
      }),
    );
    expect(createAuditEntry).toHaveBeenCalledWith(
      "greenscout",
      expect.objectContaining({
        action: "USER_CREATED",
        entityType: "User",
        entityId: "user-new",
        user: { connect: { id: "admin-1" } },
        ipAddress: "10.0.0.1",
        userAgent: "Mozilla/5.0",
      }),
    );
    // The temp password MUST NEVER appear inside the audit change-set.
    const auditArg = vi.mocked(createAuditEntry).mock.calls[0]?.[1];
    expect(JSON.stringify(auditArg)).not.toContain("argon2id$hash");
  });

  it("absent x-forwarded-for produces null ipAddress + userAgent", async () => {
    await createUserAction(VALID_PAYLOAD);
    expect(createAuditEntry).toHaveBeenCalledWith(
      "greenscout",
      expect.objectContaining({ ipAddress: null, userAgent: null }),
    );
  });

  it("returns server when createUser throws", async () => {
    const consoleErr = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(createUser).mockRejectedValueOnce(new Error("db boom"));
    const result = await createUserAction(VALID_PAYLOAD);
    expect(result).toEqual({ ok: false, errorCode: "server" });
    expect(consoleErr).toHaveBeenCalled();
    consoleErr.mockRestore();
  });
});
