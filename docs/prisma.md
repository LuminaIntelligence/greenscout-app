# Prisma (`prisma/`)

GreenScout's data layer uses Prisma 5.x with PostgreSQL 16. The schema
file at `prisma/schema.prisma` is the typed contract between the
Next.js application and the database.

> **Schema source-of-truth:** `DECISIONS.md` → "Slice 2 schema design
> approved (user-confirmed, binding for T-009 through T-013)". Do not
> add models without updating that DECISIONS entry first — schema
> changes are §7-pause-triggers per `CLAUDE.md`.

## Local setup

Prerequisites: the local Postgres container from `docker compose` must
be reachable, or you set `DATABASE_URL` to point at any local
Postgres 16 instance.

```bash
# Start Postgres (single service):
docker compose up -d db

# Copy and populate .env if you haven't already:
cp .env.example .env   # adjust POSTGRES_* values

# Generate the Prisma Client (TypeScript types under src/generated/prisma):
npm run db:generate

# Open the Prisma Studio UI:
npm run db:studio
```

Note: `db:generate` and `db:studio` need `DATABASE_URL` resolvable;
`docker compose up -d db` from `docs/docker.md` is the recommended local
setup.

> **Heads-up (T-009 state):** The schema currently declares only the
> `datasource` and `generator` blocks — no models yet. As a result,
> `prisma generate` will exit with "You don't have any models defined".
> This is expected; the first models land in T-010 and the initial
> migration in T-013.

## Adding new models or enums

1. Read `DECISIONS.md` → "Slice 2 schema design approved" first. The
   binding contract for all initial entities lives there.
2. For changes **beyond** the approved Slice-2 contract: schema design
   is a §7 pause-trigger. Open a discussion before writing migrations.
3. Once approved, edit `prisma/schema.prisma`.
4. Run `npx prisma format` then `npx prisma validate` — both must exit 0.
5. Run `npm run db:migrate -- --name <descriptive-snake-case-name>` to
   create and apply the migration against the local database.
6. Commit the new migration file under `prisma/migrations/*/` along
   with the schema edit.

## Generated client

The Prisma Client lands at `src/generated/prisma/` — gitignored. Always
regenerate via `npm run db:generate` after pulling schema changes.

## Migrations against production

`CLAUDE.md` §6 allows `prisma migrate dev` against the LOCAL development
database only. Production migrations (`prisma migrate deploy`) are
**forbidden to the agent** per `CLAUDE.md` §7.9 / §8.6. Human operators
run those against the Hetzner production database outside this
workflow.

## Seeding the admin user

The first time a fresh database comes up, run the admin seed to create
the single privileged user (per `SPEC.md` §3.2):

```bash
npm run db:seed
```

The script is **idempotent**: if an admin row with the configured email
already exists (even if soft-deleted), it logs and exits 0 without
changes — `mustChangePassword` is never reset, the password is never
overwritten.

Required env vars (already templated in `.env.example`):

| Var | Purpose |
|---|---|
| `SEED_ADMIN_EMAIL` | Admin email — `consulting@lumina-intelligence.ai` for the canonical GreenScout admin |
| `SEED_ADMIN_TEMP_PASSWORD` | Temp password that the admin **must change on first login** |

Optional env vars for tuning argon2id (defaults match SPEC §6.3):

| Var | Default | Purpose |
|---|---|---|
| `PASSWORD_HASH_MEMORY_KIB` | `19456` | argon2id memory cost (KiB) |
| `PASSWORD_HASH_TIME_COST` | `2` | argon2id iteration count |
| `PASSWORD_HASH_PARALLELISM` | `1` | argon2id parallelism factor |

What the seed creates on a fresh DB:

- One `User` row: role `ADMIN`, `mustChangePassword=true`, `firstName="Admin"`, `lastName="GreenScout"`, `organizationId="greenscout"`.
- One `AuditLog` row: `entityType=User`, `action=CREATE`, `userId=null` (system event), `changeSet` documenting the initial `email`, `role`, and `mustChangePassword` values. **`passwordHash` is never written to `changeSet`** — DECISIONS audit-log convention.

The seed uses the repository layer (`createUser`, `findUserByEmail`,
`createAuditEntry`) exclusively. Direct access to `@/lib/db` from
`prisma/seed.ts` is limited to the final `prisma.$disconnect()` call so
the Node process exits cleanly when `prisma db seed` finishes.

## Conventions

- Model names: `PascalCase` (`User`, `Customer`, `Study`).
- Field names: `camelCase` in TS (`passwordHash`, `consultantId`); the
  schema maps to snake_case DB columns via `@map("snake_case_column")`.
- Enums: native Postgres ENUM types via Prisma's `enum` keyword.
- Indexes: declared inline via `@@unique`, `@@index`, with column-list
  notation. See the approved schema entry for the full per-entity
  index strategy.
- Multi-tenant placeholder: every entity except `StudyImage`,
  `GeneratedDocument`, `Setting` carries `organizationId` with default
  `"greenscout"`. Repository layer (T-014) enforces filtering — no
  application code references `organizationId` directly.
