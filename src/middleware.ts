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
 *     plus `'strict-dynamic'`. The nonce is forwarded to the Next.js
 *     render layer via TWO request headers: `content-security-policy`
 *     (the one Next.js actually reads to extract the nonce and stamp
 *     it onto inline scripts) and `x-nonce` (documented helper). Both
 *     get the SAME per-request nonce. Without the request-header CSP,
 *     Next.js emits inline scripts WITHOUT a `nonce` attribute, the
 *     browser blocks them under the response CSP, `'strict-dynamic'`
 *     then also blocks `/_next/static/*` chunks (because nothing was
 *     loaded by a nonced script), and the page never hydrates. See
 *     DECISIONS.md → "Hotfix: CSP nonce on request headers (Folge zu
 *     PR #34)". Pattern documented at
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
 * nonce to Next.js via the request headers. The framework reads the
 * `content-security-policy` REQUEST header to extract the nonce and
 * stamps it onto every inline script it emits (hydration bootstrap,
 * RSC payload, route chunks). `x-nonce` is set in parallel as the
 * publicly-documented helper header (useful for app code that calls
 * `headers().get('x-nonce')` to wire custom `<Script nonce=...>`).
 *
 * Without the `content-security-policy` REQUEST header, the inline
 * scripts have no `nonce` attribute, the browser blocks them under
 * the response CSP, `'strict-dynamic'` then also blocks the chunk
 * scripts (because nothing was loaded by a nonced script), and the
 * page never hydrates — the form falls back to a native browser
 * submit, which puts `?password=…` in the URL. This is the bug PR #35
 * fixes.
 *
 * Only relevant for pass-through. Redirect responses have no body
 * to render so they don't need a nonce in the request headers
 * (the CSP header on the redirect itself is set in
 * `applySecurityHeaders`).
 */
function passThroughWithNonce(request: NextRequest, nonce: string): NextResponse {
  const csp = buildCsp(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("content-security-policy", csp);
  requestHeaders.set("x-nonce", nonce);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

function isPublicPath(pathname: string): boolean {
  if (pathname === "/login") return true;
  if (pathname === "/api/auth" || pathname.startsWith("/api/auth/")) return true;
  // §7.10-Pivot PR 3: interne Render-Route für den Playwright-PDF-Renderer.
  // Auth ist NICHT via Session — der Playwright-Browser hat kein Auth-Cookie.
  // Stattdessen schützt sich die Route selbst per `INTERNAL_RENDER_TOKEN`
  // shared-secret Header-Gate (siehe
  // `src/app/internal/render-study/[id]/page.tsx` → `notFound()` bei
  // Mismatch). Analoges Pattern zu `PYTHON_SERVICE_API_KEY` (T-035): Service-
  // zu-Service Shared-Secret, kein User-Auth-Flow. Pfad-Match ist strikt:
  // exakt `/internal/render-study/<id>` — keine anderen `/internal/*`-Pfade
  // werden via diesen Bypass abgedeckt.
  if (pathname.startsWith("/internal/render-study/")) return true;
  // §7.10-Pivot PR 4: öffentliche Kunden-Online-Ansicht. Auth ist NICHT
  // via Session — der Kunde hat keinen GreenScout-Account. Stattdessen
  // schützt sich die Route selbst per signiertem HMAC-Token im Query-
  // Param `?t=<token>` (siehe `src/features/studies/document/services/
  // share-token.ts` + `src/app/(public)/studie/[id]/page.tsx`). Bei
  // fehlendem / invalid / abgelaufenem Token → notFound() bzw. die
  // eigene Expired-Error-Page. **Pfad-Match ist strikt** auf
  // `/studie/<id>` (keine anderen `/studie/*`-Pfade — der `(public)`
  // Route-Group-Marker wird vom Bundler nicht in der URL gezeigt).
  if (pathname.startsWith("/studie/")) return true;
  // Pivot-2b: Dev-Vorschau-Route /dev/slides wird nur in NODE_ENV=development
  // serviert (die Page selbst returnt notFound() in Production via
  // `process.env.NODE_ENV !== "production"`-Check). Damit ist ein Bypass hier
  // ebenfalls dev-only sicher — Production ändert sich nicht. Notwendig, damit
  // scripts/screenshot-slides.mjs (Side-by-Side-Verifikation) den dev-server
  // ohne Auth-Session erreichen kann. Strikt auf `/dev/` gescoped — andere
  // Pfade nicht abgedeckt.
  if (process.env.NODE_ENV !== "production" && pathname.startsWith("/dev/")) return true;
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
