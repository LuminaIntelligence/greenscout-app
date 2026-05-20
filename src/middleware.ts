/**
 * Next.js middleware — combines auth route protection,
 * mustChangePassword redirect, and CSP headers.
 *
 * Uses the edge-safe `authConfig` from `src/lib/auth.config.ts`. The
 * full provider config (which imports argon2 native bindings) lives
 * in `src/lib/auth.ts` and is only loaded on the Node runtime by the
 * `[...nextauth]` route handler. The middleware never needs to run
 * `authorize()` — only `session()` and `jwt()` callbacks, both of
 * which are pure JS.
 *
 * Public paths: `/login`, the entire `/api/auth/*` tree, and Next
 * static assets (excluded via `matcher`). Everything else requires a
 * session.
 *
 * mustChangePassword === true funnels every request to
 * `/password-change` until the user resets — except for the
 * `/password-change` page itself (anti-loop) and `/api/auth/*`
 * (sign-out must remain reachable).
 *
 * CSP is applied to EVERY response, including redirects. The policy
 * follows DECISIONS T-017 ③: 'self' default, with 'unsafe-inline' on
 * style-src (Tailwind + Radix portals) and 'wasm-unsafe-eval' on
 * script-src (Prisma WASM modules).
 *
 * @see DECISIONS.md → "T-017 Auth.js v5 Credentials + session config"
 */

import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

const CSP_HEADER = [
  "default-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "font-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

function isPublicPath(pathname: string): boolean {
  if (pathname === "/login") return true;
  if (pathname === "/api/auth" || pathname.startsWith("/api/auth/")) return true;
  return false;
}

export default auth((request) => {
  const { pathname } = request.nextUrl;
  const session = request.auth;

  let response: NextResponse;

  if (isPublicPath(pathname)) {
    response = NextResponse.next();
  } else if (!session) {
    response = NextResponse.redirect(new URL("/login", request.nextUrl));
  } else if (session.user.mustChangePassword && !pathname.startsWith("/password-change")) {
    response = NextResponse.redirect(new URL("/password-change", request.nextUrl));
  } else {
    response = NextResponse.next();
  }

  response.headers.set("Content-Security-Policy", CSP_HEADER);
  return response;
});

export const config = {
  // Match every route EXCEPT Next's internal static-asset pipelines and
  // the favicon / fonts directories. CSS / JS hashed assets need the
  // CSP header too, but those go through the runtime response chain and
  // pick it up from the document response itself.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|fonts/).*)"],
};
