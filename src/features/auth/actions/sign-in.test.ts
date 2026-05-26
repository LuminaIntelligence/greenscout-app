/**
 * T-024b — `signInAction` tests.
 *
 * Covers every branch of the discriminated `SignInResult` returned by
 * `signInAction(formData)`:
 *   - schema-parse failure (missing / invalid email / empty password)
 *     → generic `invalid-credentials`
 *   - `signIn` throws `LockedAccountError(lockedUntil)`
 *     → `{ ok: false, errorCode: "locked", lockedUntil: <ISO> }`
 *   - `signIn` throws `AccountUnavailableError("deleted")`
 *     → `{ ok: false, errorCode: "deleted" }`
 *   - `signIn` throws `AccountUnavailableError("inactive")`
 *     → `{ ok: false, errorCode: "inactive" }`
 *   - `signIn` throws an `AuthError` subclass (generic Auth.js failure)
 *     → `{ ok: false, errorCode: "invalid-credentials" }`
 *   - `signIn` throws a non-Auth.js error
 *     → `{ ok: false, errorCode: "server" }`
 *   - happy path → `{ ok: true }`
 *
 * The catch-order test (LockedAccountError BEFORE generic AuthError) is
 * load-bearing per DECISIONS T-017a — both custom errors extend
 * CredentialsSignin which extends AuthError, so the wrong order would
 * collapse all locked / deleted / inactive paths to invalid-credentials.
 *
 * `@/lib/auth` is mocked to capture how `signInAction` calls
 * `signIn("credentials", { ... redirect: false })`. The Auth.js
 * `AuthError` class is imported from `@auth/core/errors` (NOT from the
 * `next-auth` package barrel) for the same reason that
 * `src/features/auth/errors.ts` imports `CredentialsSignin` from there:
 * the `next-auth` barrel pulls `next/server` which is not resolvable in
 * the Vitest runtime. `next-auth` re-exports `AuthError` from this same
 * module, so the `instanceof` checks in `sign-in.ts` match identically.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  signIn: vi.fn(),
}));

import { AuthError } from "@auth/core/errors";

import { AccountUnavailableError, LockedAccountError } from "@/features/auth/errors";
import { signIn } from "@/lib/auth";

import { signInAction } from "./sign-in";

/**
 * Helper — build a FormData with optional overrides. `email`/`password`
 * default to a valid-looking pair so the schema parses; individual tests
 * override either to exercise schema-failure paths.
 */
function buildFormData(overrides: Partial<{ email: string; password: string }> = {}): FormData {
  const fd = new FormData();
  fd.set("email", overrides.email ?? "user@example.com");
  fd.set("password", overrides.password ?? "correct-horse-battery");
  return fd;
}

/**
 * Auth.js v5 expects `AuthError` to be subclassed via `code`; the
 * generic-error path uses a real subclass instance.
 */
class GenericAuthError extends AuthError {
  static type = "CallbackRouteError";
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("signInAction", () => {
  it("returns invalid-credentials when the schema fails to parse (missing email)", async () => {
    const fd = new FormData();
    // password set, email omitted → loginSchema email.email() rejects null
    fd.set("password", "anything");

    const result = await signInAction(fd);

    expect(result).toEqual({ ok: false, errorCode: "invalid-credentials" });
    expect(signIn).not.toHaveBeenCalled();
  });

  it("returns invalid-credentials when the schema fails to parse (empty password)", async () => {
    const fd = buildFormData({ password: "" });

    const result = await signInAction(fd);

    expect(result).toEqual({ ok: false, errorCode: "invalid-credentials" });
    expect(signIn).not.toHaveBeenCalled();
  });

  it("returns invalid-credentials when the email is malformed", async () => {
    const fd = buildFormData({ email: "not-an-email" });

    const result = await signInAction(fd);

    expect(result).toEqual({ ok: false, errorCode: "invalid-credentials" });
    expect(signIn).not.toHaveBeenCalled();
  });

  it("returns locked + ISO lockedUntil when signIn throws LockedAccountError", async () => {
    const until = new Date("2026-05-25T12:00:00.000Z");
    vi.mocked(signIn).mockRejectedValueOnce(new LockedAccountError(until));

    const result = await signInAction(buildFormData());

    expect(result).toEqual({
      ok: false,
      errorCode: "locked",
      lockedUntil: "2026-05-25T12:00:00.000Z",
    });
    expect(signIn).toHaveBeenCalledWith("credentials", {
      email: "user@example.com",
      password: "correct-horse-battery",
      redirect: false,
    });
  });

  it("returns deleted errorCode when signIn throws AccountUnavailableError('deleted')", async () => {
    vi.mocked(signIn).mockRejectedValueOnce(new AccountUnavailableError("deleted"));

    const result = await signInAction(buildFormData());

    expect(result).toEqual({ ok: false, errorCode: "deleted" });
  });

  it("returns inactive errorCode when signIn throws AccountUnavailableError('inactive')", async () => {
    vi.mocked(signIn).mockRejectedValueOnce(new AccountUnavailableError("inactive"));

    const result = await signInAction(buildFormData());

    expect(result).toEqual({ ok: false, errorCode: "inactive" });
  });

  it("returns invalid-credentials when signIn throws a generic AuthError subclass", async () => {
    vi.mocked(signIn).mockRejectedValueOnce(new GenericAuthError("auth.js boom"));

    const result = await signInAction(buildFormData());

    expect(result).toEqual({ ok: false, errorCode: "invalid-credentials" });
  });

  it("returns server errorCode when signIn throws a non-AuthError exception", async () => {
    vi.mocked(signIn).mockRejectedValueOnce(new Error("network down"));

    const result = await signInAction(buildFormData());

    expect(result).toEqual({ ok: false, errorCode: "server" });
  });

  it("returns { ok: true } on the happy path and forwards credentials with redirect: false", async () => {
    vi.mocked(signIn).mockResolvedValueOnce(undefined);

    const result = await signInAction(buildFormData());

    expect(result).toEqual({ ok: true });
    expect(signIn).toHaveBeenCalledTimes(1);
    expect(signIn).toHaveBeenCalledWith("credentials", {
      email: "user@example.com",
      password: "correct-horse-battery",
      redirect: false,
    });
  });
});
