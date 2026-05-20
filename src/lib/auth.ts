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
 *   - Server Actions and Server Components that call `auth()`
 *
 * Fail-fast on `AUTH_SECRET` happens in `auth.config.ts` at module
 * load — both entry points trigger it.
 *
 * @see DECISIONS.md → "T-017 Auth.js v5 Credentials + session config"
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { loginSchema } from "@/features/auth/schemas/login-schema";
import { authorizeCredentials } from "@/features/auth/services/authorize-credentials";
import { authConfig } from "@/lib/auth.config";

export const { auth, signIn, signOut, handlers } = NextAuth({
  ...authConfig,
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
