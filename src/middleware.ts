/**
 * Next.js middleware — combines auth route protection,
 * mustChangePassword redirect, and security response headers.
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
 * Security headers are applied to EVERY response (including redirects)
 * via the `applySecurityHeaders` helper. The set:
 *   - Content-Security-Policy (T-017 ③)
 *   - X-Frame-Options: DENY (T-021)
 *   - Referrer-Policy: strict-origin-when-cross-origin (T-021)
 *   - X-Content-Type-Options: nosniff (T-021)
 *   - Permissions-Policy: camera=(), microphone=(), geolocation=() (T-021)
 *
 * X-XSS-Protection is deliberately NOT set — deprecated by all major
 * browsers (Chrome 78+ removed support). CSP is the canonical XSS
 * defense.
 *
 * HSTS (Strict-Transport-Security) is deliberately NOT set here either.
 * Setting it at the application layer would leak the directive over
 * plain HTTP in dev mode, locking the dev hostname into HTTPS-only via
 * browser caching. HSTS lives at the production reverse-proxy on the
 * VPS — see `deploy/Caddyfile.example` and task T-050b.
 *
 * @see DECISIONS.md → "T-017 Auth.js v5 Credentials + session config"
 * @see DECISIONS.md → "T-021 Security headers hardening"
 * @see docs/security.md
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

/**
 * Apply the GreenScout response-security header set to a NextResponse.
 *
 * Called on EVERY response branch of the middleware (pass-through,
 * unauth-redirect, mustChangePassword-redirect, and any future
 * branch). Never bypass this — defense-in-depth requires the headers
 * to ride along with every response, including 3xx redirects.
 *
 * Exported for direct unit-testing via `src/middleware.test.ts`.
 *
 * @see DECISIONS.md → "T-021 Security headers hardening"
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("Content-Security-Policy", CSP_HEADER);
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

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

  return applySecurityHeaders(response);
});

export const config = {
  // Match every route EXCEPT Next's internal static-asset pipelines and
  // the favicon / fonts directories. CSS / JS hashed assets need the
  // CSP header too, but those go through the runtime response chain and
  // pick it up from the document response itself.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|fonts/).*)"],
};
