/**
 * Auth.js v5 singleton.
 *
 * Exports `auth`, `signIn`, `signOut`, and `handlers` for use in
 * Server Components, Route Handlers, Server Actions, and the
 * `src/middleware.ts` route guard.
 *
 * Fail-fast: `AUTH_SECRET` must be set to a non-placeholder value on
 * module load. Missing / empty / equal-to-placeholder throws a clean
 * server-start error pointing at `.env.example`.
 *
 * Session strategy is `jwt` with an 8-hour hard expiry (no rolling
 * refresh), per SPEC §4.1. The 6 custom JWT fields (id, email, role,
 * mustChangePassword, formPreference, organizationId) are populated
 * on initial sign-in and never re-fetched from the DB — the
 * mustChangePassword and formPreference flags are stale-tolerant for
 * the 8h window. T-019 / T-029 swap the value via `auth.update()`
 * when the user changes them.
 *
 * @see DECISIONS.md → "T-017 Auth.js v5 Credentials + session config"
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { loginSchema } from "@/features/auth/schemas/login-schema";
import { authorizeCredentials } from "@/features/auth/services/authorize-credentials";

const PLACEHOLDER = "REPLACE_WITH_32_BYTE_BASE64";
const AUTH_SECRET = process.env.AUTH_SECRET;

if (!AUTH_SECRET || AUTH_SECRET.trim() === "" || AUTH_SECRET === PLACEHOLDER) {
  throw new Error(
    "AUTH_SECRET missing or still set to the .env.example placeholder. " +
      "Generate one via `openssl rand -base64 32` and populate .env before starting the server.",
  );
}

const SESSION_MAX_AGE = Number.parseInt(process.env.AUTH_SESSION_MAX_AGE_SECONDS ?? "28800", 10);

export const { auth, signIn, signOut, handlers } = NextAuth({
  secret: AUTH_SECRET,
  trustHost: process.env.AUTH_TRUST_HOST === "true",
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE,
    // updateAge: 0 → hard expiry. Auth.js will NOT refresh the cookie
    // on activity; the JWT exp claim is the single source of truth for
    // session validity.
    updateAge: 0,
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
      // The `emailVerified` field is part of Auth.js's AdapterUser
      // intersection. We don't use email-verification flow (Credentials
      // provider only); set to null to satisfy the type contract.
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
});
