"use server";

import { AuthError } from "next-auth";

import { AccountUnavailableError, LockedAccountError } from "@/features/auth/errors";
import { loginSchema } from "@/features/auth/schemas/login-schema";
import { signIn } from "@/lib/auth";

/**
 * Server Action for the T-018 login form submission.
 *
 * Returns a typed discriminated `SignInResult` instead of redirecting,
 * so the client form can render inline errors via react-hook-form. The
 * `errorCode` is resolved to copy by the form via `src/i18n/de.ts`.
 *
 * Soft-distinguished error disclosure (per DECISIONS T-017a):
 *   - `invalid-credentials` — generic catch-all returned for wrong
 *     password AND non-existent users. Never leaks which it was.
 *   - `locked` — emitted ONLY to a caller who supplied the correct
 *     password but landed during a lockout window. Carries the
 *     `lockedUntil` ISO timestamp for the countdown banner.
 *   - `inactive` / `deleted` — emitted ONLY to a caller who supplied
 *     the correct password for an admin-disabled or soft-deleted
 *     account.
 *   - `server` — unexpected non-Auth.js error path.
 *
 * The catch order matters: specific subclasses (`LockedAccountError`,
 * `AccountUnavailableError`) must be checked before the generic
 * `AuthError` because both extend it via `CredentialsSignin`.
 *
 * @see DECISIONS.md → "T-017a Verify-First Korrektur per ④"
 */
export type SignInResult =
  | { ok: true }
  | {
      ok: false;
      errorCode: "invalid-credentials" | "locked" | "inactive" | "deleted" | "server";
      lockedUntil?: string;
    };

export async function signInAction(formData: FormData): Promise<SignInResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, errorCode: "invalid-credentials" };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
    return { ok: true };
  } catch (err) {
    if (err instanceof LockedAccountError) {
      return {
        ok: false,
        errorCode: "locked",
        lockedUntil: err.lockedUntil.toISOString(),
      };
    }
    if (err instanceof AccountUnavailableError) {
      return { ok: false, errorCode: err.code };
    }
    if (err instanceof AuthError) {
      return { ok: false, errorCode: "invalid-credentials" };
    }
    return { ok: false, errorCode: "server" };
  }
}
