/**
 * T-024b — `changePasswordAction` tests.
 *
 * Covers every branch of the action wrapper around the pure
 * `changePassword` service:
 *   - schema-parse failure (RHF bypass) → `{ ok: false, errorCode: "server" }`
 *   - no session → `{ ok: false, errorCode: "server" }`
 *   - session present, service returns ok=false → result passed through,
 *     `unstable_update` NOT called
 *   - session present, service returns ok=true → result passed through,
 *     `unstable_update({})` invoked exactly once
 *   - header extraction: `x-forwarded-for` absent → null forwarded
 *   - header extraction: `x-forwarded-for` present as comma-list →
 *     first IP forwarded (trimmed), user-agent forwarded
 *
 * Service, Auth.js `auth` + `unstable_update`, and `next/headers` are
 * mocked. The schema is left real so the schema-failure branch actually
 * exercises zod.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
  unstable_update: vi.fn(async () => undefined),
}));

vi.mock("@/features/auth/services/change-password", () => ({
  changePassword: vi.fn(),
}));

const headersStore = new Map<string, string>();
vi.mock("next/headers", () => ({
  headers: async () => ({
    get: (name: string) => headersStore.get(name.toLowerCase()) ?? null,
  }),
}));

import { changePassword } from "@/features/auth/services/change-password";
import { auth, unstable_update } from "@/lib/auth";

import { changePasswordAction } from "./change-password";

// `auth` is heavily overloaded by NextAuth — only the zero-arg
// Server-Action / RSC overload is in play. Mirror the cast used in
// create-customer.test.ts for type-safe mocking without `any`.
const mockedAuth = vi.mocked(auth) as unknown as ReturnType<typeof vi.fn<() => Promise<unknown>>>;

const SESSION = {
  user: {
    id: "user-1",
    email: "berater@example.com",
    role: "BERATER" as const,
    mustChangePassword: true,
    formPreference: "WIZARD" as const,
    organizationId: "greenscout",
  },
  expires: "2099-01-01T00:00:00.000Z",
};

/**
 * Helper — build a FormData with the three password fields. Any field
 * can be overridden / omitted to exercise the schema-failure branch.
 */
function buildFormData(
  overrides: Partial<{
    currentPassword: string | null;
    newPassword: string | null;
    confirmNewPassword: string | null;
  }> = {},
): FormData {
  const fd = new FormData();
  const set = (key: string, value: string | null | undefined, defaultValue: string) => {
    if (value === null) return; // explicitly omitted
    fd.set(key, value ?? defaultValue);
  };
  set("currentPassword", overrides.currentPassword, "OldPassw0rd!");
  set("newPassword", overrides.newPassword, "NewPassw0rd!");
  set("confirmNewPassword", overrides.confirmNewPassword, "NewPassw0rd!");
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  headersStore.clear();
  mockedAuth.mockResolvedValue(SESSION);
});

describe("changePasswordAction", () => {
  it("returns server errorCode when the schema fails to parse (missing field)", async () => {
    const fd = buildFormData({ confirmNewPassword: null });

    const result = await changePasswordAction(fd);

    expect(result).toEqual({ ok: false, errorCode: "server" });
    expect(auth).not.toHaveBeenCalled();
    expect(changePassword).not.toHaveBeenCalled();
    expect(unstable_update).not.toHaveBeenCalled();
  });

  it("returns server errorCode when newPassword !== confirmNewPassword (refine fail)", async () => {
    const fd = buildFormData({ confirmNewPassword: "DifferentPassw0rd!" });

    const result = await changePasswordAction(fd);

    expect(result).toEqual({ ok: false, errorCode: "server" });
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("returns server errorCode when no session is present", async () => {
    mockedAuth.mockResolvedValueOnce(null);

    const result = await changePasswordAction(buildFormData());

    expect(result).toEqual({ ok: false, errorCode: "server" });
    expect(changePassword).not.toHaveBeenCalled();
    expect(unstable_update).not.toHaveBeenCalled();
  });

  it("forwards service ok=false result and does NOT call unstable_update", async () => {
    vi.mocked(changePassword).mockResolvedValueOnce({
      ok: false,
      errorCode: "wrong-current-password",
    });

    const result = await changePasswordAction(buildFormData());

    expect(result).toEqual({ ok: false, errorCode: "wrong-current-password" });
    expect(changePassword).toHaveBeenCalledTimes(1);
    expect(unstable_update).not.toHaveBeenCalled();
  });

  it("forwards service ok=true result and invokes unstable_update({}) exactly once", async () => {
    vi.mocked(changePassword).mockResolvedValueOnce({
      ok: true,
      initiator: "user-forced",
    });

    const result = await changePasswordAction(buildFormData());

    expect(result).toEqual({ ok: true, initiator: "user-forced" });
    expect(unstable_update).toHaveBeenCalledTimes(1);
    expect(unstable_update).toHaveBeenCalledWith({});
  });

  it("extracts session userId + organizationId and forwards them to the service", async () => {
    vi.mocked(changePassword).mockResolvedValueOnce({
      ok: true,
      initiator: "user-voluntary",
    });

    await changePasswordAction(buildFormData());

    expect(changePassword).toHaveBeenCalledWith({
      userId: "user-1",
      organizationId: "greenscout",
      currentPassword: "OldPassw0rd!",
      newPassword: "NewPassw0rd!",
      ipAddress: null,
      userAgent: null,
    });
  });

  it("forwards null ipAddress + userAgent when headers are absent", async () => {
    vi.mocked(changePassword).mockResolvedValueOnce({
      ok: true,
      initiator: "user-voluntary",
    });

    await changePasswordAction(buildFormData());

    expect(changePassword).toHaveBeenCalledWith(
      expect.objectContaining({ ipAddress: null, userAgent: null }),
    );
  });

  it("extracts the first IP from a comma-separated x-forwarded-for chain (trimmed)", async () => {
    headersStore.set("x-forwarded-for", "  203.0.113.7  , 10.0.0.1, 10.0.0.2");
    headersStore.set("user-agent", "Mozilla/5.0 (test)");
    vi.mocked(changePassword).mockResolvedValueOnce({
      ok: true,
      initiator: "user-voluntary",
    });

    await changePasswordAction(buildFormData());

    expect(changePassword).toHaveBeenCalledWith(
      expect.objectContaining({
        ipAddress: "203.0.113.7",
        userAgent: "Mozilla/5.0 (test)",
      }),
    );
  });
});
