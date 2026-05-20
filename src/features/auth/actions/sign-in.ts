"use server";

import { AuthError } from "next-auth";

import { loginSchema } from "@/features/auth/schemas/login-schema";
import { signIn } from "@/lib/auth";

/**
 * Server Action for the T-018 login form submission.
 *
 * Returns a structured `SignInResult` instead of redirecting, so the
 * client form can render inline errors via react-hook-form. The
 * `errorKey` is an i18n key resolved by `src/i18n/de.ts`.
 *
 * Generic error disclosure: all failure modes (bad creds, locked,
 * inactive, soft-deleted, non-existent) collapse to
 * `auth.error.invalid-credentials`. The "soft-distinguished" lockout
 * UX (T-017 DECISIONS ④) cannot be surfaced via this Server Action
 * because Auth.js's `CredentialsSignin` error type doesn't carry
 * metadata back through the form action — the locked-out signal lives
 * on `User.lockoutUntil` and a future helper (separate read-only
 * server action invoked by the login form after a 401) can fetch it.
 *
 * Documented limitation: deferred to T-018 (login UI) where the form
 * can add an independent "check lockout state" call after a failure
 * to surface the countdown banner.
 *
 * @see DECISIONS.md → "T-017 Auth.js v5 Credentials + session config"
 */
export interface SignInResult {
  ok: boolean;
  errorKey?: string;
}

export async function signInAction(formData: FormData): Promise<SignInResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, errorKey: "auth.error.invalid-credentials" };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) {
      return { ok: false, errorKey: "auth.error.invalid-credentials" };
    }
    return { ok: false, errorKey: "auth.error.server" };
  }
}
