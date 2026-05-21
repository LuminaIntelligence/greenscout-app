/**
 * Custom Auth.js v5 CredentialsSignin error subclasses.
 *
 * Thrown from `authorize-credentials.ts` ONLY on password-correct
 * paths (per DECISIONS T-017a verify-first algorithm). Auth.js v5
 * propagates these through the signIn flow; `signInAction` catches
 * them to route a typed error code to the form.
 *
 * @see DECISIONS.md → "T-017a Verify-First Korrektur per ④"
 */

// Import from @auth/core/errors (the underlying Auth.js core) rather than
// `next-auth` to keep this module unit-testable in isolation: importing the
// `next-auth` package barrel triggers env / next/server initialisation in
// the test runner. CredentialsSignin is re-exported by `next-auth` from
// `@auth/core/errors`, so this is the same class — verified at the type
// level via the `instanceof` test.
import { CredentialsSignin } from "@auth/core/errors";

export class LockedAccountError extends CredentialsSignin {
  code = "locked";

  constructor(public readonly lockedUntil: Date) {
    super("Account locked");
  }
}

export class AccountUnavailableError extends CredentialsSignin {
  code: "deleted" | "inactive";

  constructor(reason: "deleted" | "inactive") {
    super(`Account ${reason}`);
    this.code = reason;
  }
}
