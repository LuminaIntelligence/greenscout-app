/**
 * Auth.js v5 singleton (Node runtime).
 *
 * Extends the edge-safe `authConfig` with the Credentials provider —
 * the provider imports `verifyPassword` from the argon2-backed
 * password-policy module, which is a native binding and can't run in
 * the Edge runtime. The middleware (`src/middleware.ts`) imports
 * `authConfig` directly and stays edge-safe; this file is used by:
 *
 *   - the catch-all route handler at
 *     `src/app/api/auth/[...nextauth]/route.ts`
 *   - Server Actions and Server Components that call `auth()` or
 *     `unstable_update()`
 *
 * Fail-fast on `AUTH_SECRET` happens in `auth.config.ts` at module
 * load — both entry points trigger it.
 *
 * The `jwt` callback is OVERRIDDEN here (it composes the Edge-safe
 * initial-sign-in branch from `authConfig`) to add a Node-only
 * `trigger === "update"` branch that re-fetches the user from the DB
 * via `findUserById`. The branch can't live in `auth.config.ts`
 * because importing the user repository would pull Prisma into the
 * Edge-runtime middleware bundle — same constraint that forced the
 * authorize-callback split in T-017.
 *
 * `unstable_update({})` (called from the T-019 change-password Server
 * Action) triggers this branch with an empty payload. The jwt callback
 * re-reads the 6 token fields from DB, then the next request sees a
 * fresh `mustChangePassword=false` and the middleware stops redirecting
 * to `/password-change`.
 *
 * @see DECISIONS.md → "T-017 Auth.js v5 Credentials + session config"
 * @see DECISIONS.md → "T-019 Forced password change design" → KRITISCH JWT Token Refresh
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { loginSchema } from "@/features/auth/schemas/login-schema";
import { authorizeCredentials } from "@/features/auth/services/authorize-credentials";
import { authConfig } from "@/lib/auth.config";
import { findUserById } from "@/lib/repositories/user.repository";

export const { auth, signIn, signOut, handlers, unstable_update } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger }) {
      // Initial sign-in: delegate to the Edge-safe base callback so the
      // 6 fields land identically whether the request flows through the
      // Node-side `signIn()` or the Edge-side middleware-driven JWT
      // verification.
      if (user) {
        return authConfig.callbacks!.jwt!({ token, user, trigger });
      }

      // T-019 — `unstable_update({})` from the change-password Server
      // Action arrives here with `trigger === "update"`. Re-fetch the
      // user and refresh ALL 6 token fields so the next middleware run
      // sees `mustChangePassword=false` (or any other field change a
      // future flow mutates) without requiring a fresh sign-in.
      if (trigger === "update" && typeof token.id === "string") {
        const fresh = await findUserById(token.organizationId, token.id);
        if (fresh !== null) {
          token.email = fresh.email;
          token.role = fresh.role;
          token.mustChangePassword = fresh.mustChangePassword;
          token.formPreference = fresh.formPreference;
          token.organizationId = fresh.organizationId;
        }
      }

      return token;
    },
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Passwort", type: "password" },
      },
      async authorize(rawCredentials, request) {
        const parsed = loginSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const ipAddress = request?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
        const userAgent = request?.headers?.get("user-agent") ?? null;

        return authorizeCredentials({
          email: parsed.data.email,
          password: parsed.data.password,
          ipAddress,
          userAgent,
        });
      },
    }),
  ],
});
