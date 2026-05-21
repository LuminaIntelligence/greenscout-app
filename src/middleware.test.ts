/**
 * Tests for `applySecurityHeaders` from `src/middleware.ts`.
 *
 * Verifies the 5 GreenScout security headers (T-017 CSP + the four
 * T-021 additions) are applied to BOTH pass-through and 3xx-redirect
 * responses. Also asserts the deliberate omissions: X-XSS-Protection
 * (deprecated) and Strict-Transport-Security (lives at the production
 * reverse-proxy per T-050b, NOT in middleware — would otherwise leak
 * over dev-HTTP).
 *
 * The middleware's auth-routing branches (isPublicPath / session
 * presence / mustChangePassword redirect) are exercised end-to-end by
 * Playwright in T-051a. Here we unit-test only the header-emission
 * surface — the helper is exported precisely so the routing branches
 * don't need to be mocked.
 *
 * @see DECISIONS.md → "T-021 Security headers hardening"
 * @see docs/security.md
 */

import { describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

// `next-auth` resolves `next/server` (no extension) at import time in the
// dev-deps tree, which Vitest's Node resolver rejects. We also can't load
// `@/lib/auth.config` here — it fail-fasts on missing AUTH_SECRET at module
// init, which is correct for the running server but breaks unit tests.
// We never call the auth() wrapper in these tests; we only exercise the
// pure helper, so shallow mocks of both are enough to let the module load.
vi.mock("next-auth", () => ({
  default: () => ({ auth: (handler: unknown) => handler }),
}));

vi.mock("@/lib/auth.config", () => ({
  authConfig: {},
}));

import middleware, { applySecurityHeaders } from "./middleware";

/**
 * Synthesize the request shape that the auth() wrapper passes to its
 * handler. The real wrapper extends NextRequest with `.auth` populated
 * from the session callback; here we construct it directly because our
 * `next-auth` mock makes the wrapper an identity function.
 */
function buildRequest(
  pathname: string,
  session: { user: { mustChangePassword: boolean } } | null,
): Parameters<typeof middleware>[0] {
  const nextUrl = new URL(`http://localhost:3000${pathname}`);
  return {
    nextUrl,
    auth: session,
  } as unknown as Parameters<typeof middleware>[0];
}

const EXPECTED_HEADERS: Record<string, string> = {
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-content-type-options": "nosniff",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
};

describe("applySecurityHeaders", () => {
  it("sets all 5 security headers on a pass-through response", () => {
    const response = NextResponse.next();
    const result = applySecurityHeaders(response);

    expect(result.headers.get("content-security-policy")).toContain("default-src 'self'");
    for (const [key, value] of Object.entries(EXPECTED_HEADERS)) {
      expect(result.headers.get(key)).toBe(value);
    }
  });

  it("sets all 5 security headers on a 307 redirect response", () => {
    const response = NextResponse.redirect("http://localhost:3000/login");
    const result = applySecurityHeaders(response);

    expect(result.headers.get("content-security-policy")).toContain("default-src 'self'");
    for (const [key, value] of Object.entries(EXPECTED_HEADERS)) {
      expect(result.headers.get(key)).toBe(value);
    }
    expect(result.status).toBe(307);
  });

  it("preserves the underlying response (returns same reference)", () => {
    const response = NextResponse.next();
    const result = applySecurityHeaders(response);

    expect(result).toBe(response);
  });

  it("Permissions-Policy does NOT include the deprecated interest-cohort directive", () => {
    const response = NextResponse.next();
    applySecurityHeaders(response);

    expect(response.headers.get("permissions-policy")).not.toContain("interest-cohort");
  });

  it("X-XSS-Protection is NOT set (deprecated)", () => {
    const response = NextResponse.next();
    applySecurityHeaders(response);

    expect(response.headers.get("x-xss-protection")).toBeNull();
  });

  it("HSTS is NOT set by middleware (lives at reverse-proxy per T-050b)", () => {
    const response = NextResponse.next();
    applySecurityHeaders(response);

    expect(response.headers.get("strict-transport-security")).toBeNull();
  });
});

describe("middleware routing", () => {
  function expectAllHeaders(response: NextResponse) {
    expect(response.headers.get("content-security-policy")).toContain("default-src 'self'");
    for (const [key, value] of Object.entries(EXPECTED_HEADERS)) {
      expect(response.headers.get(key)).toBe(value);
    }
  }

  it("returns pass-through with security headers for /login (public path)", async () => {
    const response = (await middleware(buildRequest("/login", null), {} as never)) as NextResponse;
    expect(response.status).toBe(200);
    expectAllHeaders(response);
  });

  it("returns pass-through with security headers for /api/auth/callback (public path)", async () => {
    const response = (await middleware(
      buildRequest("/api/auth/callback/credentials", null),
      {} as never,
    )) as NextResponse;
    expect(response.status).toBe(200);
    expectAllHeaders(response);
  });

  it("redirects to /login when an unauthenticated user hits a protected route", async () => {
    const response = (await middleware(buildRequest("/", null), {} as never)) as NextResponse;
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login");
    expectAllHeaders(response);
  });

  it("redirects to /password-change when an authed user has mustChangePassword=true", async () => {
    const response = (await middleware(
      buildRequest("/", { user: { mustChangePassword: true } }),
      {} as never,
    )) as NextResponse;
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/password-change");
    expectAllHeaders(response);
  });

  it("does NOT loop the mustChangePassword redirect on /password-change itself", async () => {
    const response = (await middleware(
      buildRequest("/password-change", { user: { mustChangePassword: true } }),
      {} as never,
    )) as NextResponse;
    expect(response.status).toBe(200);
    expectAllHeaders(response);
  });

  it("returns pass-through for an authed user without mustChangePassword on a protected route", async () => {
    const response = (await middleware(
      buildRequest("/dashboard", { user: { mustChangePassword: false } }),
      {} as never,
    )) as NextResponse;
    expect(response.status).toBe(200);
    expectAllHeaders(response);
  });
});
