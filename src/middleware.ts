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
 *   - Content-Security-Policy — **per-request nonce** for `script-src`
 *     plus `'strict-dynamic'`. The nonce is also forwarded to the
 *     Next.js render layer via the `x-nonce` request header so the
 *     framework can stamp it onto every inline script it emits
 *     (hydration bootstrap, RSC payload, route chunks). This is the
 *     pattern Next.js documents at
 *     https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy.
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
 * @see DECISIONS.md → "Hotfix: CSP per-request nonce in middleware"
 * @see docs/security.md
 */

import NextAuth from "next-auth";
import { type NextRequest, NextResponse } from "next/server";

import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

/**
 * Generate a fresh per-request nonce.
 *
 * `crypto.randomUUID()` gives 122 bits of entropy (well above the 128-
 * bit-effective recommendation when base64-encoded). Edge-runtime safe:
 * `crypto` is part of the Web Crypto standard and `btoa` is also a
 * global there — `Buffer` is NOT available in Edge, so we use `btoa`.
 */
function generateNonce(): string {
  return btoa(crypto.randomUUID());
}

/**
 * Build the per-request Content-Security-Policy string.
 *
 * `script-src` is the key directive:
 *   - `'self'` — same-origin scripts (kept for older browsers that
 *     ignore `'strict-dynamic'`).
 *   - `'nonce-<nonce>'` — the per-request nonce; Next.js stamps it on
 *     every inline script it emits when it sees the `x-nonce` request
 *     header.
 *   - `'strict-dynamic'` — modern browsers ignore the source-list
 *     allowlist and trust scripts loaded BY a nonced script. Required
 *     for Next.js chunk loading: the inline bootstrap (nonced) injects
 *     `<script src=...>` for route chunks at runtime; without
 *     `'strict-dynamic'` those would need to be individually nonced,
 *     which Next.js doesn't do.
 *   - `'wasm-unsafe-eval'` — Prisma's WASM modules + Next.js's edge
 *     runtime need WebAssembly.{compile,instantiate}.
 *
 * `style-src` deliberately keeps `'unsafe-inline'`: shadcn/Radix
 * portals + Tailwind's runtime style injection require it. Styles
 * are a substantially lower XSS risk than scripts; tightening to
 * nonces here would require a separate, larger change set.
 *
 * All other directives are unchanged from the pre-nonce CSP (T-021).
 */
function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval'`,
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "font-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

/**
 * Apply the GreenScout response-security header set to a NextResponse,
 * binding the per-request `nonce` into the CSP `script-src` directive.
 *
 * Called on EVERY response branch of the middleware (pass-through,
 * unauth-redirect, mustChangePassword-redirect, and any future
 * branch). Never bypass this — defense-in-depth requires the headers
 * to ride along with every response, including 3xx redirects.
 *
 * Exported for direct unit-testing via `src/middleware.test.ts`.
 *
 * @see DECISIONS.md → "T-021 Security headers hardening"
 * @see DECISIONS.md → "Hotfix: CSP per-request nonce in middleware"
 */
export function applySecurityHeaders(response: NextResponse, nonce: string): NextResponse {
  response.headers.set("Content-Security-Policy", buildCsp(nonce));
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

/**
 * Build a pass-through response that ALSO forwards the per-request
 * nonce to Next.js via the `x-nonce` request header. The framework
 * reads that header during render and stamps the nonce on every
 * inline script it emits (hydration bootstrap, RSC payload, route
 * chunks). Without this, the inline scripts have no nonce attribute,
 * the browser blocks them under the nonce-based CSP, and the page
 * never hydrates.
 *
 * Only relevant for pass-through. Redirect responses have no body
 * to render so they don't need a nonce in the request headers
 * (the CSP header on the redirect itself is set in
 * `applySecurityHeaders`).
 */
function passThroughWithNonce(request: NextRequest, nonce: string): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

function isPublicPath(pathname: string): boolean {
  if (pathname === "/login") return true;
  if (pathname === "/api/auth" || pathname.startsWith("/api/auth/")) return true;
  return false;
}

export default auth((request) => {
  const { pathname } = request.nextUrl;
  const session = request.auth;
  const nonce = generateNonce();

  let response: NextResponse;

  if (isPublicPath(pathname)) {
    response = passThroughWithNonce(request, nonce);
  } else if (!session) {
    response = NextResponse.redirect(new URL("/login", request.nextUrl));
  } else if (session.user.mustChangePassword && !pathname.startsWith("/password-change")) {
    response = NextResponse.redirect(new URL("/password-change", request.nextUrl));
  } else {
    response = passThroughWithNonce(request, nonce);
  }

  return applySecurityHeaders(response, nonce);
});

export const config = {
  // Match every route EXCEPT Next's internal static-asset pipelines and
  // the favicon / fonts directories. CSS / JS hashed assets need the
  // CSP header too, but those go through the runtime response chain and
  // pick it up from the document response itself.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|fonts/).*)"],
};
