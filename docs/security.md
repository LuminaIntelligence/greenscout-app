# GreenScout — Security Posture

This document is the canonical reference for the security model of the
GreenScout web application. Updates land alongside any security-relevant
PR — keep this in sync with `SPEC.md` §4.1 + §6.3 and the relevant
`DECISIONS.md` entries.

## 1. Content-Security-Policy (CSP)

Applied to every response by `applySecurityHeaders` in `src/middleware.ts`:

| Directive         | Value                            | Rationale                                                                                                |
| ----------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `default-src`     | `'self'`                         | Deny-by-default                                                                                          |
| `style-src`       | `'self' 'unsafe-inline'`         | shadcn / Radix portals inject inline styles. Tightening to nonces is T-050 polish work.                  |
| `script-src`      | `'self' 'wasm-unsafe-eval'`      | Prisma WASM modules need `wasm-unsafe-eval`. No external scripts.                                        |
| `img-src`         | `'self' data: blob:`             | `data:` for `next/image` placeholder; `blob:` for future T-029 preview uploads.                          |
| `connect-src`     | `'self'`                         | Server-side fetches to the Python service happen outside the browser CSP.                                |
| `font-src`        | `'self'`                         | Gabarito self-hosted from `public/fonts/`.                                                               |
| `frame-ancestors` | `'none'`                         | Defense in depth alongside `X-Frame-Options: DENY`.                                                      |
| `base-uri`        | `'self'`                         | Prevent `<base>`-tag hijack.                                                                             |
| `form-action`     | `'self'`                         | Prevent form-submission redirection.                                                                     |

Browser-verification protocol: open DevTools → Console at `/login` and
`/password-change`. Expect zero CSP violations. If something is blocked,
fallback paths in priority order: (a) nonce-based `script-src` via Next 15
middleware-generated nonce (preferred), (b) `'unsafe-inline'` on
`script-src` with explicit `DECISIONS.md` deviation entry (last resort).

## 2. CSRF protection

All state-changing operations go through Next 15 Server Actions, which
ship with built-in origin-based CSRF protection. Custom API routes are
reserved for non-mutating GETs and internal service backchannels only.
Auth.js v5 handles CSRF for its own `/api/auth/*` routes internally.

No per-session CSRF token store exists — see `DECISIONS.md` → T-017 ⑥.

## 3. Additional response security headers

All set on every response by `applySecurityHeaders`:

- `X-Frame-Options: DENY` — defense in depth alongside `frame-ancestors 'none'`.
- `Referrer-Policy: strict-origin-when-cross-origin` — minimal cross-site referrer leak.
- `X-Content-Type-Options: nosniff` — strict MIME enforcement.
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` — deny unused browser APIs.

Omitted on purpose:

- **`X-XSS-Protection`** — deprecated (Chrome 78+ removed support). CSP is the canonical XSS defense.
- **`interest-cohort=()`** in `Permissions-Policy` — Google killed FLoC in 2022; the directive is dead.

## 4. HSTS + TLS termination

**NOT in middleware.** Setting `Strict-Transport-Security` at the
application layer would emit it over plain HTTP in dev mode, locking
the dev hostname into HTTPS-only via browser caching for months on a
single hit.

HSTS + TLS termination live at the **reverse-proxy on the production
VPS** (Caddy by default given Hetzner conventions; Traefik or nginx
also valid — see task T-050b in `TASKS.md`). The proxy:

- Terminates TLS (Let's Encrypt cert).
- Sends `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`.
- Force-redirects HTTP → HTTPS.
- Forwards `X-Forwarded-For` + `X-Forwarded-Proto` to Next.js (Auth.js v5 `trustHost` reads them).

See `deploy/Caddyfile.example` for the snippet template and
`docs/deployment.md` for the deployment posture.

## 5. Argon2 password hashing

SPEC §6.3 baseline:

- Algorithm: `argon2id`
- Memory cost: 19456 KiB (≈ 19 MiB)
- Time cost: 2 iterations
- Parallelism: 1

Parameters env-overridable via `PASSWORD_HASH_MEMORY_KIB` /
`PASSWORD_HASH_TIME_COST` / `PASSWORD_HASH_PARALLELISM` (see
`.env.example`). Implementation lives in
`src/features/auth/password-constants.ts` +
`src/features/auth/utils/hash-password.ts`. Library:
`@node-rs/argon2` (pre-built native bindings).

See `DECISIONS.md` → "Password hashing algorithm & parameters" + T-015 + T-016.

## 6. Session management

JWT strategy via Auth.js v5:

- 8 hour hard expiry (`AUTH_SESSION_MAX_AGE_SECONDS = 28800`).
- No rolling refresh (`updateAge: 0`).
- Token payload: 6 fields (`id`, `email`, `role`, `mustChangePassword`, `formPreference`, `organizationId`).
- `unstable_update({})` triggers a JWT refresh via DB-re-fetch in the
  `jwt` callback (used by T-019 forced password change to flip
  `mustChangePassword=false` without forcing logout).

`AUTH_SECRET` is required at module load — the server refuses to start
without it (fail-fast in `src/lib/auth.config.ts`).

## 7. Lockout policy

**Counter-based**, NOT time-window-based (SPEC §4.1 — precision-edited
in T-017a):

- 5 consecutive failed login attempts → 15-minute lockout.
- 10 consecutive failures → 1-hour lockout + admin alert (currently a no-op stub; T-020 wires real SMTP).
- Counter > 10 → renew 1-hour lockout (no escalation, no further admin alerts).
- Counter resets to 0 **only on successful login OR successful password change** — never on lockout-expiry.

Single source of truth: `User.failedLoginCount` + `User.lockoutUntil`
columns. `AuditLog` `LOGIN_FAIL` / `PASSWORD_CHANGE_FAIL` entries are
forensic-only.

The same counter+threshold pair is enforced on both `/login` (T-017a
verify-first) and `/password-change` (T-019 lockout-first — different
ordering because the latter is post-auth and has no enumeration vector
to defend).

## 8. Audit log

Append-only. No `UPDATE` or `DELETE` on `AuditLog` rows from
application code (enforced at the application layer; DB triggers
deferred to Phase 3 hardening).

Allow-listed actions (SPEC §5.1):
`CREATE`, `UPDATE`, `DELETE`, `SOFT_DELETE`, `LOGIN_SUCCESS`,
`LOGIN_FAIL`, `LOCKOUT`, `PASSWORD_RESET`, `PASSWORD_CHANGE_FAIL`,
`HANDOVER`, `GENERATE_DOCUMENT`, `RETENTION_NOTICE`.

Stored as `String` columns rather than Postgres enums — additive scope
without schema migrations.

`changeSet` column is `jsonb` with the per-field tuple convention
`{ fieldName: [oldValue, newValue], ... }`. **Never** includes
plaintext passwords or hashes.

## 9. Secrets handling

`.env.example` is the only env file in the repo. Real `.env` files are
gitignored. Secrets scan via:

- `gitleaks protect --staged` at pre-commit (Husky hook, T-005).
- `gitleaks-action` on every CI run (T-008).

SMTP password encrypted at rest via AES-256-GCM with
`SETTINGS_ENCRYPTION_KEY` env (see `DECISIONS.md` → T-001 + T-004).
