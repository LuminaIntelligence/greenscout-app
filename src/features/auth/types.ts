/**
 * Type augmentation for Auth.js v5 — extends `Session.user`, `User`, and
 * `JWT` with the 6 custom fields from the T-017 DECISIONS contract.
 *
 * The `Role` and `FormPref` enum types are imported directly from the
 * generated Prisma client. The dedicated ESLint trusted-path override
 * (see eslint.config.mjs) lifts the repository-layer-only restriction
 * for this file because the augmentation is type-only — no runtime
 * Prisma access happens here.
 *
 * @see DECISIONS.md → "T-017 Auth.js v5 Credentials + session config"
 */

import type { Role, FormPref } from "@/generated/prisma";

// The empty import below is load-bearing: it forces TypeScript to treat
// this file as a module (not an ambient script), which is the prerequisite
// for `declare module "next-auth"` to attach to next-auth's resolved
// module instead of a fresh ambient one.
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  /**
   * Session shape returned by `auth()` / `useSession()`. Mirrors the JWT
   * payload — every field travels in the cookie.
   */
  interface Session {
    user: {
      id: string;
      email: string;
      role: Role;
      mustChangePassword: boolean;
      formPreference: FormPref;
      organizationId: string;
    };
  }

  /**
   * Auth.js `User` type returned from the Credentials `authorize`
   * callback. Auth.js copies the fields into the JWT on first sign-in.
   */
  interface User {
    id: string;
    email: string;
    role: Role;
    mustChangePassword: boolean;
    formPreference: FormPref;
    organizationId: string;
  }
}

declare module "next-auth/jwt" {
  /**
   * JWT payload persisted in the session cookie. The 6 fields here are
   * the same 6 fields surfaced on `Session.user` — no per-request DB
   * lookup is needed.
   */
  interface JWT {
    id: string;
    email: string;
    role: Role;
    mustChangePassword: boolean;
    formPreference: FormPref;
    organizationId: string;
  }
}
