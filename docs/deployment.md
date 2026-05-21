# GreenScout — Production deployment posture

> Authoring-only reference. The agent never executes deployment
> commands against the production VPS per `CLAUDE.md` §8.10. Human
> operators apply the configuration described here.

## 1. Topology

The GreenScout production deployment runs on a single Hetzner VPS:

```
┌─────────────────────────────────────────────────────────────────┐
│ VPS (Ubuntu LTS, Hetzner)                                       │
│                                                                 │
│   :443/:80 ─────► Caddy ─────► docker-compose                   │
│                    │           ├─ web (Next.js)   :3000         │
│                    │           ├─ pyservice (FastAPI) :8000     │
│                    │           └─ db (Postgres 16)  :5432       │
│                    │                                            │
│                    └─ TLS termination (Let's Encrypt)           │
│                       HSTS, HTTP→HTTPS redirect                 │
└─────────────────────────────────────────────────────────────────┘
```

Caddy is the only process listening on the public network. Both
application services bind to the docker-compose internal network and
are reachable only through the reverse-proxy.

## 2. TLS + HSTS at the reverse-proxy

See `deploy/Caddyfile.example` for the full template. Key points:

- **TLS termination** at Caddy via automatic Let's Encrypt ACME.
- **HSTS** — `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` — matches SPEC §6.3 baseline.
- **HTTP → HTTPS** force-redirect on `:80`.
- **X-Forwarded-\*** propagation so Auth.js v5 `trustHost` reads the original scheme + client IP correctly.

**HSTS is deliberately NOT set inside the Next.js middleware.** See
`docs/security.md` §4 and `DECISIONS.md` → T-021 for the rationale.

## 3. Why Caddy

Default choice for Hetzner VPS deployments — single binary, automatic
ACME, no separate reload daemon. Traefik and nginx are equally valid
substitutes; if you swap, replicate the same four properties from §2.

## 4. Application-layer security headers

The 5 GreenScout response-security headers (CSP + 4 T-021 additions)
are set by the Next.js middleware (`src/middleware.ts` →
`applySecurityHeaders`). Caddy does NOT need to duplicate them. See
`docs/security.md` §1 + §3.

## 5. Deployment workflow

The agent stops at config-authoring (§8.10). Production execution is
human-only:

1. Operator pulls the latest `main` to the VPS.
2. `docker compose build && docker compose up -d` brings up the three
   application containers.
3. If `deploy/Caddyfile.example` has been updated, the operator copies
   it to `/etc/caddy/Caddyfile`, customises the hostname + email, and
   runs `caddy reload` (or `systemctl reload caddy`).
4. Operator smoke-tests via `curl -I https://app.greenscout.example.com/login`
   — expects 200 + all 5 security headers + `Strict-Transport-Security`.

## 6. Forbidden agent actions (reminder)

Per `CLAUDE.md` §8 + §8.10:

- The agent never runs `caddy reload` against the VPS.
- The agent never runs `docker compose up` against a non-local target.
- The agent never runs `prisma migrate deploy` against a non-local target.
- The agent never SSHes into the VPS.

If you (the operator) want to automate parts of this workflow, the
agent can author scripts in `scripts/deploy/` for you to invoke — but
the invocation is yours.
