/**
 * Edge-safe Auth.js v5 base config — used by the Next.js middleware.
 *
 * The middleware runs in the Edge runtime, which can't load native
 * Node modules (argon2 native bindings, Prisma's WASM client). Auth.js
 * v5 splits the config into two halves to support this:
 *
 *   - `auth.config.ts` (this file): edge-safe. No providers that touch
 *     the database. No native imports. Defines callbacks, pages,
 *     session strategy.
 *   - `auth.ts`: extends this config with the Credentials provider
 *     (which imports argon2). Used by the API route handler and
 *     Server Actions on the Node runtime.
 *
 * The middleware only needs to validate the JWT cookie and run the
 * `session` callback — it never invokes `authorize`, so the heavy
 * provider can stay out of the edge bundle.
 *
 * @see DECISIONS.md → "T-017 Auth.js v5 Credentials + session config"
 *      (silent decision: edge/node config split)
 */

import type { NextAuthConfig } from "next-auth";

const PLACEHOLDER = "REPLACE_WITH_32_BYTE_BASE64";
const AUTH_SECRET = process.env.AUTH_SECRET;

if (!AUTH_SECRET || AUTH_SECRET.trim() === "" || AUTH_SECRET === PLACEHOLDER) {
  throw new Error(
    "AUTH_SECRET missing or still set to the .env.example placeholder. " +
      "Generate one via `openssl rand -base64 32` and populate .env before starting the server.",
  );
}

const SESSION_MAX_AGE = Number.parseInt(process.env.AUTH_SESSION_MAX_AGE_SECONDS ?? "28800", 10);

export const authConfig = {
  secret: AUTH_SECRET,
  trustHost: process.env.AUTH_TRUST_HOST === "true",
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE,
    // updateAge: 0 → hard expiry. Auth.js will NOT refresh the cookie
    // on activity; the JWT exp claim is the single source of truth.
    updateAge: 0,
  },
  // Providers are injected in src/lib/auth.ts. Edge-safe config holds
  // an empty array — Auth.js needs the key present but tolerates an
  // empty provider list in the middleware-only invocation path.
  providers: [],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      // On initial sign-in, `user` is populated from the authorize
      // callback. On every subsequent request, only `token` is
      // present and we pass it through unchanged.
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.role = user.role;
        token.mustChangePassword = user.mustChangePassword;
        token.formPreference = user.formPreference;
        token.organizationId = user.organizationId;
      }
      return token;
    },
    async session({ session, token }) {
      // emailVerified is part of Auth.js's AdapterUser intersection;
      // Credentials provider doesn't track verification — set null.
      session.user = {
        id: token.id,
        email: token.email,
        emailVerified: null,
        role: token.role,
        mustChangePassword: token.mustChangePassword,
        formPreference: token.formPreference,
        organizationId: token.organizationId,
      };
      return session;
    },
  },
} satisfies NextAuthConfig;
