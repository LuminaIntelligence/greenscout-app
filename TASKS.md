# TASKS.md — Task queue

> This file is owned by the **planner** subagent and updated by all agents as work progresses.
> Format and rules are defined in `.claude/agents/planner.md`.
> Implementers pick the lowest-numbered task with no open `Blocked by` and **one** task per PR.

---

## Status legend
- `⬜ TODO` — not started
- `🟦 IN PROGRESS` — an agent is actively working on it (branch open)
- `🟨 BLOCKED` — waiting on the user, an upstream task, or an external answer
- `✅ DONE` — merged to `main`
- `❌ CANCELLED` — explicitly dropped (keep the entry, write the reason)

---

## Questions for the user
*(planner appends here when a request implies scope beyond `SPEC.md`)*

— none yet —

---

## Open tasks
*(planner appends task entries below, following the template in `.claude/agents/planner.md`)*

---

### Slice 1 — Project bootstrap

### T-003 Install shadcn/ui primitives + base components
- **Status:** ⬜ TODO
- **Feature:** components/ui
- **Type:** chore
- **Effort:** M
- **Blocks:** T-022, T-023, T-024, T-025, T-029
- **Blocked by:** T-002
- **Description:**
  Initialise shadcn/ui via its CLI with the GreenScout colour tokens mapped into the `cn`/theme layer (no off-brand defaults). Install the primitives most likely to be needed by F1–F7: `button`, `input`, `label`, `form`, `select`, `checkbox`, `radio-group`, `textarea`, `dialog`, `dropdown-menu`, `toast`, `table`, `tabs`, `badge`, `card`, `alert`, `separator`, `tooltip`. Confirm a smoke page renders one of each.
- **Acceptance criteria:**
  - [ ] `components.json` configured with shadcn paths under `src/components/ui/`.
  - [ ] Each primitive listed above exists under `src/components/ui/` and compiles.
  - [ ] A `/components-preview` (dev-only) page renders one of each primitive without console warnings.
  - [ ] No off-brand default colours leak through; primary uses `plant-green`, accent uses `muted-lime`.
- **Files likely touched:** `components.json`, `src/components/ui/**`, `src/lib/utils.ts` (`cn`), one preview route.
- **Pause-triggers anticipated:** §7.1 (`class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, Radix primitives transitive installs).

---

### T-004 Wire ESLint + Prettier + tsc gates
- **Status:** ⬜ TODO
- **Feature:** chore (lint)
- **Type:** chore
- **Effort:** M
- **Blocks:** T-011, T-040
- **Blocked by:** T-001
- **Description:**
  Configure ESLint with the exact plugin set from CLAUDE.md §2: `@typescript-eslint`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`, `eslint-plugin-import`, `eslint-config-next`. Run with `--max-warnings 0`. Add Prettier with `prettier-plugin-tailwindcss`. Add npm scripts `lint`, `lint:fix`, `format`, `format:check`, `typecheck`. ESLint must flag relative cross-feature imports and missing a11y attributes.
- **Acceptance criteria:**
  - [ ] `npm run lint` exits 0 on an empty repo and fails on a deliberate `any` or missing `alt`.
  - [ ] `npm run format:check` exits 0.
  - [ ] `npm run typecheck` runs `tsc --noEmit`.
  - [ ] `.eslintrc` extends `next/core-web-vitals` and the six plugin presets above.
  - [ ] `import/no-relative-parent-imports` (or equivalent rule) blocks `../../..` across feature folders.
- **Files likely touched:** `.eslintrc.cjs` (or `eslint.config.mjs`), `.prettierrc`, `.prettierignore`, `package.json` (scripts).
- **Pause-triggers anticipated:** §7.1 (lint/prettier dev-deps).

---

### T-005 Set up Husky + lint-staged + gitleaks pre-commit gates
- **Status:** ⬜ TODO
- **Feature:** chore (hooks)
- **Type:** chore
- **Effort:** M
- **Blocks:** T-040
- **Blocked by:** T-004
- **Description:**
  Install Husky and lint-staged. Pre-commit hook must run, in order: `tsc --noEmit`, ESLint with `--max-warnings 0`, Prettier `--check`, `ruff check`, `ruff format --check`, `pyright` (only if Python files touched), and `gitleaks protect --staged`. Add a one-page `docs/pre-commit.md` describing the hook. Hook must be fast on no-op commits (lint-staged scoping to changed files).
- **Acceptance criteria:**
  - [ ] `.husky/pre-commit` exists and is executable.
  - [ ] `lint-staged` config runs ESLint + Prettier only on changed `*.{ts,tsx,js,jsx}` files.
  - [ ] A deliberate `process.env.SECRET = "AKIA..."` test fixture is caught by `gitleaks` and the commit is rejected.
  - [ ] A clean commit completes in under 10 seconds locally.
  - [ ] Python checks fire only when any `*.py` is staged.
- **Files likely touched:** `.husky/pre-commit`, `package.json` (`lint-staged`, `prepare`), `.gitleaks.toml`, `docs/pre-commit.md`.
- **Pause-triggers anticipated:** §7.1 (`husky`, `lint-staged`, `gitleaks` install).

---

### T-006 Scaffold Python FastAPI service skeleton
- **Status:** ⬜ TODO
- **Feature:** chore (python service)
- **Type:** chore
- **Effort:** M
- **Blocks:** T-007, T-008, T-026, T-027, T-030
- **Blocked by:** T-001
- **Description:**
  Create the Python FastAPI service folder structure per SPEC §7.4 under `services/python/` (or sibling — pick one and document): `app/api/`, `app/domain/`, `app/services/`, `app/schemas/`, `app/config.py`, `app/main.py`, `templates/`, `tests/`. `app/main.py` exposes FastAPI app with `/health` returning `{"status": "ok"}`. Add `requirements.txt` (initially: `fastapi`, `uvicorn[standard]`, `pydantic>=2`, `python-multipart`). Add `pyproject.toml` configuring `ruff` and `pyright`. Add Python venv instructions to `docs/python-service.md`.
- **Acceptance criteria:**
  - [ ] `uvicorn app.main:app --reload` boots and `GET /health` returns 200.
  - [ ] `ruff check .` and `ruff format --check .` exit 0.
  - [ ] `pyright` exits 0 on the skeleton.
  - [ ] `pytest` runs (empty suite is OK) and exits 0.
  - [ ] Folder structure matches SPEC §7.4.
- **Files likely touched:** `services/python/app/**`, `services/python/requirements.txt`, `services/python/pyproject.toml`, `services/python/tests/test_health.py`, `docs/python-service.md`.
- **Pause-triggers anticipated:** §7.1 (`fastapi`, `uvicorn`, `pydantic`, `ruff`, `pyright` install — first time these enter `requirements.txt`).

---

### T-007 Compose Docker stack skeleton (Next.js + Python + Postgres)
- **Status:** ⬜ TODO
- **Feature:** chore (docker)
- **Type:** chore
- **Effort:** M
- **Blocks:** T-040
- **Blocked by:** T-001, T-006
- **Description:**
  Author `docker-compose.yml` with three services: `web` (Next.js), `pyservice` (FastAPI), `db` (Postgres 16). Define a shared Docker network. Mount host volumes `./uploads` and `./generated` into both `web` and `pyservice` per CLAUDE.md §3. Provide minimal `Dockerfile.web` (Node 20 LTS, `next build`, `next start`) and `Dockerfile.python` (Python 3.12-slim, `pip install -r requirements.txt`, `uvicorn`). `.env.example` documents all required vars (`DATABASE_URL`, `NEXTAUTH_SECRET`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_TEMP_PASSWORD`, `SETTINGS_ENCRYPTION_KEY`, `PYTHON_SERVICE_URL`).
- **Acceptance criteria:**
  - [ ] `docker compose config` validates without errors.
  - [ ] `docker compose build` succeeds for both images.
  - [ ] `docker compose up -d db` brings up Postgres reachable on the compose network.
  - [ ] `web` ↔ `pyservice` reachable by service name on the internal network.
  - [ ] `.env.example` contains placeholders (no real values) for every variable mentioned above.
- **Files likely touched:** `docker-compose.yml`, `Dockerfile.web`, `services/python/Dockerfile`, `.env.example`, `docs/docker.md`.
- **Pause-triggers anticipated:** §7.1 (no new code deps, but base image choice may surface as scope) — and §8.10 (this task must NOT spin up production).

---

### T-008 GitHub Actions CI workflow stub
- **Status:** ⬜ TODO
- **Feature:** chore (ci)
- **Type:** chore
- **Effort:** M
- **Blocks:** T-040
- **Blocked by:** T-004, T-005, T-006, T-007
- **Description:**
  Create `.github/workflows/ci.yml` running on `pull_request` and pushes to non-main branches. Jobs: (a) `lint-typecheck` (Node 20, install deps, run `lint`, `format:check`, `typecheck`); (b) `web-tests` (Vitest); (c) `python-checks` (ruff + pyright + pytest); (d) `e2e` (Playwright, headless, depends on a, b); (e) `build-images` (matrix builds the two Dockerfiles); (f) `prisma-migrate-check` (spin up Postgres service, run `prisma migrate deploy` against test DB — local-equivalent target, never prod). Coverage uploaded as an artifact. Set the coverage threshold check to **80% global** and **100% on calculation logic paths**.
- **Acceptance criteria:**
  - [ ] Workflow YAML is valid and parses with `actionlint` (or equivalent).
  - [ ] Each job has explicit `permissions:` minimised.
  - [ ] Coverage threshold step fails when global < 80% or calculation logic < 100%.
  - [ ] Workflow never references production secrets or deploy targets.
  - [ ] Required for PR merge per CLAUDE.md §5.2 — branch-protection note in `docs/ci.md`.
- **Files likely touched:** `.github/workflows/ci.yml`, `docs/ci.md`.
- **Pause-triggers anticipated:** none directly; CLAUDE.md §8.11 reminder (never bypass branch protection).

---

### Slice 2 — Data model & Prisma migrations

### T-009 Install Prisma + Postgres client + scaffold schema header
- **Status:** ⬜ TODO
- **Feature:** chore (db)
- **Type:** chore
- **Effort:** S
- **Blocks:** T-010, T-011, T-012, T-013
- **Blocked by:** T-001, T-007
- **Description:**
  Install `prisma` and `@prisma/client`. Initialise `prisma/schema.prisma` with `datasource db` (PostgreSQL via `DATABASE_URL`) and `generator client`. Add `src/lib/db.ts` exporting a singleton `PrismaClient` (dev-mode HMR-safe pattern). Add npm scripts: `db:migrate` → `prisma migrate dev`, `db:generate` → `prisma generate`, `db:studio`, `db:seed`. Document local DB setup in `docs/db.md`.
- **Acceptance criteria:**
  - [ ] `npx prisma generate` succeeds on the empty schema.
  - [ ] `src/lib/db.ts` exports a singleton with the dev HMR guard.
  - [ ] `docs/db.md` documents the local Postgres setup steps using the compose `db` service.
  - [ ] No real `DATABASE_URL` committed; `.env.example` has placeholder only.
- **Files likely touched:** `prisma/schema.prisma`, `src/lib/db.ts`, `package.json`, `docs/db.md`.
- **Pause-triggers anticipated:** §7.1 (Prisma deps).

---

### T-010 Define enums + User + Customer models
- **Status:** ⬜ TODO
- **Feature:** db
- **Type:** feat
- **Effort:** M
- **Blocks:** T-013, T-014, T-015, T-022
- **Blocked by:** T-009
- **Description:**
  In `prisma/schema.prisma`, declare enums `Role` (`ADMIN`, `BERATER`), `StudyStatus` (`DRAFT`, `READY`, `GENERATED`), `ImageType` (`BEFORE`, `AFTER`), `DocFormat` (`PPTX`, `PDF`), `FormPref` (`WIZARD`, `SINGLE_PAGE`). Define `User` and `Customer` per SPEC §5.1 with every field listed, `@map("snake_case")` on each field, soft-delete (`deletedAt`), `organizationId` default `"greenscout"`, and `createdAt`/`updatedAt` timestamps. Add table-level `@@index` only where SPEC §5 requires.
- **Acceptance criteria:**
  - [ ] All five enums declared with the exact variants from SPEC §5.
  - [ ] `User` model includes all fields from SPEC §5.1 `User` table.
  - [ ] `Customer` model includes all fields from SPEC §5.1 `Customer` table; `companyName` nullable, `contactFirstName`/`contactLastName` required.
  - [ ] Every column carries an `@map("snake_case_db_name")`.
  - [ ] `prisma format` keeps the file clean and `prisma validate` passes.
- **Files likely touched:** `prisma/schema.prisma`.
- **Pause-triggers anticipated:** none — adding new tables only (CLAUDE.md §7.2 exception).

---

### T-011 Define Study + StudyImage models with constraints
- **Status:** ⬜ TODO
- **Feature:** db
- **Type:** feat
- **Effort:** M
- **Blocks:** T-013, T-016, T-022, T-025
- **Blocked by:** T-010
- **Description:**
  Add `Study` (all SPEC §5.1 fields incl. Decimals, `pachtEurProKwp @default(100)`, `vertragslaufzeitJahre @default(20)`, `co2Override @default(false)`, nullable sensitivity & module spec fields, `generatedAt`, `deletedAt`, `organizationId`) and `StudyImage` (with `@@unique([studyId, type])`). Add indexes per SPEC §5.1 footer: `Study(consultantId)`, `Study(customerId)`, `Study(status)`, `Study(organizationId, status)`. Set up FK relations `Study.consultant → User`, `Study.customer → Customer`, `StudyImage.study → Study` (`onDelete: Restrict`).
- **Acceptance criteria:**
  - [ ] All `Study` fields present with correct types (Decimal where SPEC says Decimal, Int where Int).
  - [ ] `pachtEurProKwp` default `100`, `vertragslaufzeitJahre` default `20`, `co2Override` default `false`.
  - [ ] All four required indexes present.
  - [ ] `StudyImage` enforces `@@unique([studyId, type])`.
  - [ ] FK cascade behaviour: deleting a Study is blocked at DB level — soft-delete only.
- **Files likely touched:** `prisma/schema.prisma`.
- **Pause-triggers anticipated:** none — additive only.

---

### T-012 Define GeneratedDocument + AuditLog + Setting models
- **Status:** ⬜ TODO
- **Feature:** db
- **Type:** feat
- **Effort:** M
- **Blocks:** T-013, T-031, T-032, T-033, T-034
- **Blocked by:** T-010
- **Description:**
  Add `GeneratedDocument` (per SPEC §5.1) with FK to `Study` and `User`. Add `AuditLog` per SPEC §5.1 with indexes on `userId`, composite `entityType, entityId`, and `createdAt`; `changeSet` as `Json?`. Add `Setting` as `@id` on `key`, `value String`, `updatedAt`. Add a code-level comment near `AuditLog` declaring that the application layer must enforce append-only (no `UPDATE`/`DELETE` allowed) — actual enforcement happens in the repository layer (T-031).
- **Acceptance criteria:**
  - [ ] `GeneratedDocument` includes `format: DocFormat`, `generatedById` FK to `User`.
  - [ ] `AuditLog` includes `action: String` (free text per SPEC enumeration), `changeSet: Json?`, `ipAddress`, `userAgent`.
  - [ ] All three required indexes on `AuditLog` present.
  - [ ] `Setting` uses `key` as primary key.
  - [ ] `prisma validate` passes.
- **Files likely touched:** `prisma/schema.prisma`.
- **Pause-triggers anticipated:** none — additive.

---

### T-013 Initial Prisma migration + local DB apply
- **Status:** ⬜ TODO
- **Feature:** db
- **Type:** feat
- **Effort:** S
- **Blocks:** T-014, T-015, T-022, T-031
- **Blocked by:** T-011, T-012
- **Description:**
  Run `prisma migrate dev --name init_schema` against the local dev DB to produce the first migration. Verify the generated SQL respects `@map` snake_case naming, defaults, indexes, and the unique constraint. Commit `prisma/migrations/<timestamp>_init_schema/` to the repo. Document migration workflow in `docs/db.md` (local-only; never `prisma migrate deploy` against prod per CLAUDE.md §7.9 / §8.6).
- **Acceptance criteria:**
  - [ ] Migration folder committed.
  - [ ] Migration applies cleanly against a fresh local Postgres.
  - [ ] `prisma migrate status` reports "in sync".
  - [ ] Generated SQL contains snake_case table/column names matching `@map` directives.
  - [ ] `docs/db.md` warns against running `prisma migrate deploy` outside CI/local.
- **Files likely touched:** `prisma/migrations/<timestamp>_init_schema/migration.sql`, `prisma/migrations/migration_lock.toml`, `docs/db.md`.
- **Pause-triggers anticipated:** §7.2 (none expected — pure additive), §7.9 reminder.

---

### T-014 Implement repository helper layer with organizationId filter
- **Status:** ⬜ TODO
- **Feature:** lib (db)
- **Type:** feat
- **Effort:** M
- **Blocks:** T-022, T-024, T-031, T-032
- **Blocked by:** T-013
- **Description:**
  Create `src/lib/repositories/` with one repository per entity (`user.repository.ts`, `customer.repository.ts`, `study.repository.ts`, `study-image.repository.ts`, `generated-document.repository.ts`, `audit-log.repository.ts`, `setting.repository.ts`). Every query accepts `organizationId` (default `"greenscout"`) and filters by it. Soft-deleted rows excluded by default with an `includeDeleted: false` opt-in. Repositories are the only place that touches `prisma.*` directly — per SPEC §5.3 no app code outside repositories references `organizationId`.
- **Acceptance criteria:**
  - [ ] Every repository function signature includes an explicit `organizationId` parameter.
  - [ ] Soft-deleted rows hidden unless `includeDeleted: true`.
  - [ ] Unit tests assert that a query without `organizationId` is impossible (TypeScript-level enforcement via required param).
  - [ ] ESLint rule (or doc lint) flags `prisma.*` references outside `src/lib/repositories/`.
- **Files likely touched:** `src/lib/repositories/**`, `src/lib/repositories/*.test.ts`.
- **Pause-triggers anticipated:** none.

---

### T-015 Idempotent admin seed (`prisma db seed`)
- **Status:** ⬜ TODO
- **Feature:** db (seed)
- **Type:** feat
- **Effort:** S
- **Blocks:** T-016, T-040
- **Blocked by:** T-013, T-018
- **Description:**
  Implement `prisma/seed.ts` to provision the admin user per **DECISIONS.md decision #3**. Read env vars **`SEED_ADMIN_EMAIL`** and **`SEED_ADMIN_TEMP_PASSWORD`** (exact names — no variants). If a user with `role=ADMIN` already exists for `organizationId="greenscout"`: **do nothing** — never overwrite the password, never reset `mustChangePassword`. Else create with hashed temp password (argon2id via `src/features/auth/password-policy.ts`) and `mustChangePassword=true`. Register in `package.json` under `"prisma": { "seed": "tsx prisma/seed.ts" }`.
- **Acceptance criteria:**
  - [ ] Fails fast with a clear error if either env var is missing.
  - [ ] First run creates the admin; second run is a no-op (verified by test).
  - [ ] Never logs the temp password.
  - [ ] Test covers both "admin absent" and "admin already exists" paths.
  - [ ] Uses `argon2id` with parameters from `password-policy.ts` (decision #1).
- **Files likely touched:** `prisma/seed.ts`, `package.json`, `.env.example`, `prisma/seed.test.ts`.
- **Pause-triggers anticipated:** §7.1 (`argon2`, `tsx` dev-dep). §7.3 (auth-adjacent — keep this aligned with the password-policy module).

---

### Slice 3 — Auth feature

### T-016 Password-policy module (argon2id + rules)
- **Status:** ⬜ TODO
- **Feature:** auth
- **Type:** feat
- **Effort:** M
- **Blocks:** T-015, T-017, T-018, T-019, T-020, T-021
- **Blocked by:** T-001
- **Description:**
  Implement `src/features/auth/password-policy.ts` per **DECISIONS.md decision #1**. Export named constants `ARGON_MEMORY_COST_KIB = 19456`, `ARGON_TIME_COST = 2`, `ARGON_PARALLELISM = 1` with environment-variable overrides (`ARGON_MEMORY_COST_KIB`, `ARGON_TIME_COST`, `ARGON_PARALLELISM`). Export `hashPassword(plain): Promise<string>` and `verifyPassword(plain, hash): Promise<boolean>` using `argon2id`. Export `passwordRules` array with predicates for: ≥8 chars, has upper, has lower, has digit, has special — each returning `{ ok: boolean, label: string }` for the live UI checklist. 100% unit-test coverage on this module.
- **Acceptance criteria:**
  - [ ] Algorithm hard-coded to `argon2id`; params come from constants with env override.
  - [ ] Roundtrip test (`hash` → `verify`) passes.
  - [ ] Each of the five password rule predicates has true/false test cases.
  - [ ] Module coverage = 100%.
  - [ ] Constants documented inline.
- **Files likely touched:** `src/features/auth/password-policy.ts`, `src/features/auth/password-policy.test.ts`, `.env.example`.
- **Pause-triggers anticipated:** §7.1 (`argon2` npm install — first time). §7.3 (security-critical module).

---

### T-017 Auth.js v5 Credentials provider + session config
- **Status:** ⬜ TODO
- **Feature:** auth
- **Type:** feat
- **Effort:** M
- **Blocks:** T-018, T-019, T-020, T-021, T-022
- **Blocked by:** T-014, T-016
- **Description:**
  Configure Auth.js v5 with the Credentials provider authenticating against `User` via `verifyPassword`. Session strategy: JWT with **8-hour hard expiry** (no rolling refresh). Session payload includes `id`, `email`, `role`, `mustChangePassword`, `formPreference`. Wire `src/lib/auth.ts` and `src/app/api/auth/[...nextauth]/route.ts`. Reject login for soft-deleted (`deletedAt != null`) or inactive (`active=false`) users. Update `failedLoginCount` and `lockoutUntil` checks happen here (delegated to T-020).
- **Acceptance criteria:**
  - [ ] Successful login returns a session with the expected payload fields.
  - [ ] Session expires exactly 8h after issue (no rolling refresh on activity).
  - [ ] Soft-deleted or inactive users cannot log in.
  - [ ] No password ever logged.
  - [ ] `NEXTAUTH_SECRET` required from env; absent secret fails the server start.
- **Files likely touched:** `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/middleware.ts` (basic guard), `.env.example`.
- **Pause-triggers anticipated:** §7.1 (`next-auth@beta`, `@auth/prisma-adapter` install). §7.3 (auth core).

---

### T-018 Login page with live password-rule checklist
- **Status:** ⬜ TODO
- **Feature:** auth
- **Type:** feat
- **Effort:** M
- **Blocks:** T-019, T-022
- **Blocked by:** T-003, T-017
- **Description:**
  Build `/login` page with email + password fields, RHF + zod schema, shadcn/ui form components. Below the password field show a **live checklist** that turns each rule green/red as the user types (uses `passwordRules` from T-016). German microcopy ("Du"-form). Show inline form errors for invalid credentials with a single generic message ("E-Mail oder Passwort ist falsch") — never reveal which one. Show a banner if the account is locked (countdown to unlock).
- **Acceptance criteria:**
  - [ ] Live checklist updates on each keystroke and matches the five `passwordRules` predicates.
  - [ ] Generic error on invalid credentials; specific banner on lockout.
  - [ ] All strings via the (still-empty) i18n dictionary `src/i18n/de.ts`.
  - [ ] a11y: every input has an associated `<label>`; checklist exposed via `aria-live="polite"`.
  - [ ] Playwright test covers happy path + invalid-password path.
- **Files likely touched:** `src/app/(auth)/login/page.tsx`, `src/features/auth/components/login-form.tsx`, `src/features/auth/schemas/login-schema.ts`, `src/i18n/de.ts`.
- **Pause-triggers anticipated:** §7.4 only if the implementer strays outside design tokens.

---

### T-019 Forced first-login password change flow
- **Status:** ⬜ TODO
- **Feature:** auth
- **Type:** feat
- **Effort:** M
- **Blocks:** T-022
- **Blocked by:** T-018
- **Description:**
  When `session.user.mustChangePassword === true`, middleware redirects every non-`/change-password` request to `/change-password`. Page renders the same live checklist (T-016 rules) and requires current password + new password + confirm. On success: hash new password, clear `mustChangePassword`, write an `AuditLog` `PASSWORD_RESET` entry (`action`, `userId`, `ipAddress`, `userAgent`), redirect to `/dashboard`. Reject if new password equals current.
- **Acceptance criteria:**
  - [ ] Middleware redirect verified by Playwright test (logged-in admin → forced to `/change-password`).
  - [ ] New password must satisfy all five rules; reuse of current password rejected.
  - [ ] `mustChangePassword` flips to `false` on success.
  - [ ] Audit-log entry written with `action="PASSWORD_RESET"`.
  - [ ] German microcopy throughout.
- **Files likely touched:** `src/app/(auth)/change-password/page.tsx`, `src/features/auth/components/change-password-form.tsx`, `src/features/auth/services/change-password.ts`, `src/middleware.ts`.
- **Pause-triggers anticipated:** §7.3 (auth flow).

---

### T-020 Lockout state machine (5/15min → 15min, 10/15min → 1h)
- **Status:** ⬜ TODO
- **Feature:** auth
- **Type:** feat
- **Effort:** M
- **Blocks:** T-021, T-032
- **Blocked by:** T-017
- **Description:**
  Implement `src/features/auth/services/lockout.ts` per SPEC §4.1: track failed login attempts in a 15-minute rolling window. At 5 failures → set `lockoutUntil = now + 15min`. At 10 cumulative failures within the window → set `lockoutUntil = now + 1h` **and** invoke a `notifyAdminLockout(userId)` hook. **The SMTP send is a no-op stub here** (`src/features/auth/services/admin-alert.ts` logs to console and writes an `AuditLog` `LOCKOUT` entry) — the real SMTP send is wired in slice 12 (T-032). Successful login resets `failedLoginCount`. Audit entries written for every `LOGIN_SUCCESS`, `LOGIN_FAIL`, `LOCKOUT`.
- **Acceptance criteria:**
  - [ ] Unit tests cover: 5th failure locks 15min, 10th failure locks 1h and triggers stub, success resets counter.
  - [ ] During lockout, `verifyPassword` is short-circuited (no hash work performed).
  - [ ] `AuditLog` entries created for all three actions with `ipAddress` + `userAgent`.
  - [ ] `notifyAdminLockout` stub is replaceable via dependency injection so T-032 can swap in the real sender.
  - [ ] Stub never throws even if console output fails.
- **Files likely touched:** `src/features/auth/services/lockout.ts`, `src/features/auth/services/admin-alert.ts`, `src/features/auth/services/lockout.test.ts`.
- **Pause-triggers anticipated:** §7.3 (auth state).

---

### T-021 CSRF middleware + Content-Security-Policy headers
- **Status:** ⬜ TODO
- **Feature:** auth (security)
- **Type:** feat
- **Effort:** M
- **Blocks:** T-040
- **Blocked by:** T-017
- **Description:**
  Auth.js handles its own CSRF; add a per-session CSRF token check to any custom POST/PUT/DELETE route. Add a Next.js middleware that emits Content-Security-Policy headers limiting `default-src 'self'`, `img-src 'self' data:`, `style-src 'self' 'unsafe-inline'` (tighten in T-040), `script-src 'self'`, `connect-src 'self' ${PYTHON_SERVICE_URL}`. Add other security headers: `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, `Permissions-Policy` minimal.
- **Acceptance criteria:**
  - [ ] CSRF check on a sample state-changing custom route rejects mismatched tokens.
  - [ ] Browser inspector confirms all five headers present on a dev request.
  - [ ] CSP allows internal `PYTHON_SERVICE_URL` connections.
  - [ ] No `unsafe-eval` anywhere.
- **Files likely touched:** `src/middleware.ts`, `src/lib/security/csrf.ts`, `next.config.mjs` (header function fallback).
- **Pause-triggers anticipated:** §7.3.

---

### Slice 4 — Customers CRUD

### T-022 Customer feature: schema + repository + list page
- **Status:** ⬜ TODO
- **Feature:** customers
- **Type:** feat
- **Effort:** L → split below
- **Blocks:** T-023, T-024, T-025
- **Blocked by:** T-014, T-019
- **Description:**
  Build the Customer list page at `/customers`: TanStack Query for fetch, TanStack Table for display (columns: company name | contact name | city | studies count | actions), filter by name, sort, pagination. zod schema `customerSchema` in `src/features/customers/schemas/`. Server actions / route handlers fetch via the customer repository (T-014). Soft-deleted excluded. German microcopy ("Du"-form).
- **Acceptance criteria:**
  - [ ] List page renders with mock data first, then real DB rows.
  - [ ] Filter, sort, and pagination all functional via TanStack Table.
  - [ ] Studies count joined efficiently (single query, no N+1).
  - [ ] Playwright test covers list view as Berater and as Admin.
  - [ ] All strings via `src/i18n/de.ts`.
- **Files likely touched:** `src/features/customers/schemas/customer-schema.ts`, `src/features/customers/services/customer-service.ts`, `src/features/customers/components/customer-table.tsx`, `src/app/(app)/customers/page.tsx`.
- **Pause-triggers anticipated:** §7.1 (`@tanstack/react-query`, `@tanstack/react-table` install).

---

### T-023 Customer create / edit form
- **Status:** ⬜ TODO
- **Feature:** customers
- **Type:** feat
- **Effort:** M
- **Blocks:** T-025
- **Blocked by:** T-022
- **Description:**
  Form at `/customers/new` and `/customers/[id]/edit` with RHF + zod. Fields per SPEC §4.4 / §5.1: `companyName` optional, `contactFirstName`/`contactLastName` required, `email`, `phone`, `billingAddress`, `billingZipCode`, `billingCity`, `notes`. On submit: optimistic update via TanStack Query, then redirect to detail page. Audit-log `CREATE` / `UPDATE` entries via repository.
- **Acceptance criteria:**
  - [ ] zod rejects empty `contactFirstName`/`contactLastName`; allows missing `companyName`.
  - [ ] Email field validates RFC-ish format when present.
  - [ ] Audit-log entries written with `changeSet` diff on edit.
  - [ ] Form preserves entered values on validation failure.
  - [ ] Playwright covers happy create + edit flow.
- **Files likely touched:** `src/features/customers/components/customer-form.tsx`, `src/app/(app)/customers/new/page.tsx`, `src/app/(app)/customers/[id]/edit/page.tsx`.
- **Pause-triggers anticipated:** none.

---

### T-024 Customer detail view + soft-delete action
- **Status:** ⬜ TODO
- **Feature:** customers
- **Type:** feat
- **Effort:** M
- **Blocks:** T-025
- **Blocked by:** T-023
- **Description:**
  Detail page at `/customers/[id]` shows customer info + a list of related studies (link to each). Delete button triggers a confirmation dialog (SPEC §4.9 dialog pattern) and performs **soft-delete** (`deletedAt = now`). Audit-log `SOFT_DELETE` entry written. Soft-deleted customers no longer appear in the list (T-022) but their referenced studies remain.
- **Acceptance criteria:**
  - [ ] Confirmation dialog blocks accidental delete.
  - [ ] After delete, customer is hidden from list view; their studies still visible to the consultant.
  - [ ] Audit-log `SOFT_DELETE` entry recorded with `userId`, `entityType="Customer"`, `entityId`.
  - [ ] Playwright covers soft-delete confirmation + dismissal paths.
- **Files likely touched:** `src/app/(app)/customers/[id]/page.tsx`, `src/features/customers/services/delete-customer.ts`.
- **Pause-triggers anticipated:** §7.11 (DSGVO-adjacent — but soft-delete only here, hard-delete is T-031 admin workflow).

---

### Slice 5 — Studies CRUD (form + dashboard)

### T-025 Study zod schema set (one schema per wizard step)
- **Status:** ⬜ TODO
- **Feature:** studies
- **Type:** feat
- **Effort:** M
- **Blocks:** T-026, T-027, T-029
- **Blocked by:** T-011, T-024
- **Description:**
  Define zod schemas under `src/features/studies/schemas/`: one per wizard step from **DECISIONS.md decision #5** plus a composed `studyFullSchema`. Steps: `step1-kunde.ts` (customer FK), `step2-objekt.ts` (objectName, address fields, flurstueck), `step3-pv-inputs.ts` (anlageKwp, pvErzeugung…, pacht€/kWp, Vertragslaufzeit), `step4-modul-spec.ts` (Modulanzahl, Modulfläche, Eigenverbrauchsquote, Netzeinspeisung), `step5-sensitivity.ts` (szenarioPreis1/2/3 with defaults 35/40/45), `step6-termine.ts` (terminVorschlag1/2), `step7-bilder.ts` (image presence checks), `step8-review.ts` (final validation, all required fields). Decimals validated as positive where applicable.
- **Acceptance criteria:**
  - [ ] Each step exports a discrete zod schema + an inferred TS type.
  - [ ] Composed `studyFullSchema` accepts the union of all step inputs.
  - [ ] Sensitivity defaults: 35 / 40 / 45 ct/kWh.
  - [ ] Test cases: every required field, every default, every numeric lower-bound.
  - [ ] No vague TODOs — schemas are committed to decision #5.
- **Files likely touched:** `src/features/studies/schemas/**`, `src/features/studies/schemas/*.test.ts`.
- **Pause-triggers anticipated:** none.

---

### T-026 Study wizard layout (8-step)
- **Status:** ⬜ TODO
- **Feature:** studies
- **Type:** feat
- **Effort:** L → split into T-026a / T-026b below
- **Blocks:** T-028
- **Blocked by:** T-025
- **Description:**
  Build the 8-step wizard at `/studies/new` and `/studies/[id]/edit` honouring `User.formPreference === 'WIZARD'`. Stepper UI, "Weiter"/"Zurück" buttons, per-step validation against the relevant T-025 schema, persistent draft (autosave to `DRAFT` status on each step transition). Step 5 sensitivity defaults pre-filled to 35/40/45. Step 7 (Bilder) is a placeholder until T-029 lands — wire empty slots with `Blocked by` annotation.
- **Acceptance criteria:** see split tasks T-026a / T-026b.
- **Files likely touched:** see split tasks.
- **Pause-triggers anticipated:** §7.4 if visual layout strays beyond tokens.

---

### T-026a Wizard shell + steps 1–4
- **Status:** ⬜ TODO
- **Feature:** studies
- **Type:** feat
- **Effort:** M
- **Blocks:** T-026b, T-028
- **Blocked by:** T-025
- **Description:**
  Build the wizard shell (`<StudyWizard>` with stepper, progress, prev/next), and implement Step 1 (Kunde — customer search/select), Step 2 (Objekt & Flurstück), Step 3 (PV-Inputs), Step 4 (Modul-/Anlagenspezifikation). Each step renders RHF form with its T-025 schema; "Weiter" validates that step only. Autosave to `Study` (status `DRAFT`) on every transition.
- **Acceptance criteria:**
  - [ ] Stepper shows 8 steps with current step highlighted in `plant-green`.
  - [ ] Step-level zod validation blocks "Weiter" on invalid input with inline messages.
  - [ ] Autosave verified by Playwright (refresh mid-wizard → previously entered fields retained).
  - [ ] Customer selector reuses T-022 list endpoint.
- **Files likely touched:** `src/features/studies/components/study-wizard/study-wizard.tsx`, `src/features/studies/components/study-wizard/step-1-kunde.tsx`, `step-2-objekt.tsx`, `step-3-pv-inputs.tsx`, `step-4-modul.tsx`.
- **Pause-triggers anticipated:** §7.4 only on visual deviation.

---

### T-026b Wizard steps 5–8
- **Status:** ⬜ TODO
- **Feature:** studies
- **Type:** feat
- **Effort:** M
- **Blocks:** T-028
- **Blocked by:** T-026a, T-029
- **Description:**
  Implement Step 5 (Sensitivitätsanalyse — 3 ct/kWh fields with defaults 35/40/45 and a live mini-table of resulting yearly savings using the TS calculation mirror T-017-equivalent — actual calc lib lands in T-018), Step 6 (Termine — two `DateTime` fields with `date-fns` German locale, `DD.MM.YYYY HH:mm`), Step 7 (Bilder — two upload slots BEFORE/AFTER backed by T-029), Step 8 (Review & Speichern — read-only summary, status flips to `READY` on save).
- **Acceptance criteria:**
  - [ ] Step 5 mini-table updates live as user types ct/kWh values.
  - [ ] Step 6 dates render in `DD.MM.YYYY HH:mm` German format.
  - [ ] Step 7 enforces exactly two images (BEFORE + AFTER required to advance to Step 8).
  - [ ] Step 8 save flips status to `READY` and writes `AuditLog` `UPDATE` with diff.
- **Files likely touched:** `src/features/studies/components/study-wizard/step-5-sensitivity.tsx`, `step-6-termine.tsx`, `step-7-bilder.tsx`, `step-8-review.tsx`.
- **Pause-triggers anticipated:** §7.4 on visual deviation.

---

### T-027 Study single-page layout (anchored sections)
- **Status:** ⬜ TODO
- **Feature:** studies
- **Type:** feat
- **Effort:** M
- **Blocks:** T-028
- **Blocked by:** T-026b
- **Description:**
  Build the single-page view honouring `User.formPreference === 'SINGLE_PAGE'`. Same eight sections as the wizard, all visible at once, with a sticky left sidebar of anchor links. Same T-025 schemas, same autosave behaviour. Save button at the bottom. Per decision #5: same content, just different presentation — no extra fields, no missing fields.
- **Acceptance criteria:**
  - [ ] Anchor links scroll to each section.
  - [ ] Same zod schemas validate as the wizard.
  - [ ] User can toggle between views via a profile preference (formPreference) — verified by Playwright.
  - [ ] All eight sections present and labeled identically to the wizard steps.
- **Files likely touched:** `src/features/studies/components/study-single-page/**`, `src/app/(app)/studies/[id]/page.tsx`.
- **Pause-triggers anticipated:** §7.4 on visual drift.

---

### T-028 Studies dashboard (TanStack Table, filters, status state machine)
- **Status:** ⬜ TODO
- **Feature:** studies
- **Type:** feat
- **Effort:** M
- **Blocks:** T-030, T-031, T-040
- **Blocked by:** T-026b, T-027
- **Description:**
  Build `/dashboard` (the post-login landing page). TanStack Table columns: object name | customer | status badge | consultant | created | last generated | actions. Filters: status, consultant (admin only), customer. Sort: created desc by default. Pagination. Implement the status state machine: `DRAFT` → `READY` (after step 8 save) → `GENERATED` (after first document) — never backwards in MVP. F2 "Neue Studie" button visible. Berater sees only own studies; admin sees all (F7).
- **Acceptance criteria:**
  - [ ] Status badges use design tokens (`plant-green` for READY/GENERATED, neutral for DRAFT).
  - [ ] Berater filter excludes others' studies; admin sees everything.
  - [ ] Dashboard loads ≤1s with 1000 seeded studies (SPEC §6.2).
  - [ ] State-machine transitions enforced server-side; invalid transitions rejected.
  - [ ] Playwright covers F1 (login + dashboard load), F2 (open new-study form).
- **Files likely touched:** `src/app/(app)/dashboard/page.tsx`, `src/features/studies/components/studies-table.tsx`, `src/features/studies/services/study-service.ts`.
- **Pause-triggers anticipated:** §7.4 only on visual deviation.

---

### T-029 Image upload feature (BEFORE/AFTER, server validation, Pillow resize)
- **Status:** ⬜ TODO
- **Feature:** studies (images)
- **Type:** feat
- **Effort:** L → split into T-029a / T-029b
- **Blocks:** T-026b, T-030
- **Blocked by:** T-013, T-022
- **Description:**
  Two-image upload per SPEC §4.6 / decision context. See split tasks for the split — note the aspect-ratio target is best known *after* the PPTX placeholder mapping (T-026 in slice 8). Decision recorded here in the plan: implement upload with a **provisional aspect ratio of 16:9** for the resize bounding box, and add a follow-up task T-029c to revisit the ratio once `docs/pptx-mapping.md` is signed off. Recorded as an assumption — implementer must add an entry to `DECISIONS.md` before merging T-029.
- **Acceptance criteria:** see split tasks.
- **Files likely touched:** see split tasks.
- **Pause-triggers anticipated:** §7.4 (UI), §7.1 (Pillow, `multer` or Next.js form-data handling).

---

### T-029a Image upload — TS frontend + Next.js route handler
- **Status:** ⬜ TODO
- **Feature:** studies (images)
- **Type:** feat
- **Effort:** M
- **Blocks:** T-029b, T-026b
- **Blocked by:** T-013, T-022
- **Description:**
  Implement the upload UI in step 7 (BEFORE + AFTER slots) and the Next.js POST route at `/api/studies/[id]/images`. Client-side checks: MIME in `{image/jpeg, image/png, image/webp}`, size ≤10 MB. Server-side checks: same MIME allow-list (sniffed), size, and pixel-dimension cap ≤4000×4000 via `image-size` lib. Route saves the original file to `./uploads/studies/<studyId>/original/<uuid>.<ext>` and forwards to the Python image processor (T-029b). DB entry created in `StudyImage` with `unique(studyId, type)` enforced.
- **Acceptance criteria:**
  - [ ] Replacing an image of the same type updates the existing row (does not create a duplicate).
  - [ ] Oversize / wrong-MIME files rejected with a German error message.
  - [ ] Filenames are UUID-based; original extension preserved.
  - [ ] Audit-log `CREATE` / `UPDATE` entry for `StudyImage`.
  - [ ] Path traversal attempts (`../../`) rejected.
- **Files likely touched:** `src/features/studies/components/image-uploader.tsx`, `src/app/api/studies/[id]/images/route.ts`, `src/features/studies/services/image-service.ts`.
- **Pause-triggers anticipated:** §7.1 (`image-size` or sharp).

---

### T-029b Image processing — Pillow resize in Python service
- **Status:** ⬜ TODO
- **Feature:** python service (images)
- **Type:** feat
- **Effort:** M
- **Blocks:** T-029c
- **Blocked by:** T-029a, T-006
- **Description:**
  Add `app/services/image_processor.py` exposing `process_image(input_path, output_path, target_ratio)` — opens with Pillow, fits to bounding box with the provisional 16:9 aspect ratio (decision recorded in T-029), saves optimized JPEG/PNG/WebP at quality 85. Add FastAPI endpoint `POST /images/process` accepting `{input_path, output_path, target_ratio}`. Original retained per SPEC §4.6 (only the processed version goes into the slide).
- **Acceptance criteria:**
  - [ ] Pillow installed via `requirements.txt`.
  - [ ] Endpoint returns 200 with `{ width, height, file_size_bytes }`.
  - [ ] Resize completes in <5s for a 10 MB original (SPEC §6.2).
  - [ ] Pytest covers JPG, PNG, WebP fixtures + an oversize fixture.
  - [ ] Original file untouched on disk.
- **Files likely touched:** `services/python/app/services/image_processor.py`, `services/python/app/api/images.py`, `services/python/requirements.txt`, `services/python/tests/test_image_processor.py`.
- **Pause-triggers anticipated:** §7.1 (`Pillow` install).

---

### T-029c Revisit image aspect ratio after PPTX mapping sign-off
- **Status:** ⬜ TODO
- **Feature:** studies (images)
- **Type:** refactor
- **Effort:** S
- **Blocks:** —
- **Blocked by:** T-029b, T-036
- **Description:**
  Once `docs/pptx-mapping.md` (T-036) is signed off and the image placeholder dimensions are known from the template, replace the provisional 16:9 aspect ratio in `image_processor.py` with the actual value. Record the change in `DECISIONS.md`. If any existing study has already uploaded images with the old ratio, re-process them via a one-shot script (no auto-purge of originals — they're retained per SPEC §4.6).
- **Acceptance criteria:**
  - [ ] `image_processor.py` references a single named constant for the target ratio.
  - [ ] Old `DECISIONS.md` assumption marked superseded.
  - [ ] Re-processing script runs idempotently against existing images.
  - [ ] Pytest reflects the corrected ratio.
- **Files likely touched:** `services/python/app/services/image_processor.py`, `services/python/scripts/reprocess_images.py`, `DECISIONS.md`.
- **Pause-triggers anticipated:** §7.4 (changes visible-in-PDF area — must surface).

---

### T-030 F6 hand-over flow + F7 admin god-mode access
- **Status:** ⬜ TODO
- **Feature:** studies
- **Type:** feat
- **Effort:** M
- **Blocks:** T-040
- **Blocked by:** T-028
- **Description:**
  Per SPEC §4.3 F6: the owning consultant or an admin can hand a study over to another consultant. UI: dropdown of active Beraters in a confirmation dialog, audit-log `HANDOVER` entry with `changeSet` containing `{from, to}`. Per F7: admin sees and can edit any study regardless of `consultantId` — extend the study repository to bypass the consultant filter when `role === 'ADMIN'`.
- **Acceptance criteria:**
  - [ ] Berater cannot hand over a study they don't own (server-side enforced).
  - [ ] Confirmation dialog blocks accidental reassignment.
  - [ ] Audit-log entry includes `userId` of the actor, `entityId` of the study, `changeSet={from,to}`.
  - [ ] Admin can open and edit any study; non-admin gets 403 + full error page on others' studies.
  - [ ] Playwright covers F6 happy path and the 403 path.
- **Files likely touched:** `src/features/studies/components/handover-dialog.tsx`, `src/features/studies/services/handover-study.ts`, `src/lib/repositories/study.repository.ts`.
- **Pause-triggers anticipated:** none (no auth-logic changes, just role gates).

---

### Slice 6 — (merged into Slice 5 via T-029)

*(Image upload is handled by T-029a / T-029b / T-029c within slice 5.)*

---

### Slice 7 — Calculation logic (TS + Py mirror)

### T-031 Calculation constants modules (TS + Py) with CO₂ provisional marker
- **Status:** ⬜ TODO
- **Feature:** calculations
- **Type:** feat
- **Effort:** S
- **Blocks:** T-032 (calc), T-033 (calc), T-037
- **Blocked by:** T-001, T-006
- **Description:**
  Per **DECISIONS.md decision #2**, create both `src/lib/calculations/constants.ts` and `services/python/app/domain/constants.py` exporting named constants for: `CO2_KG_PER_KWH_PV = 0.474`, `CO2_HA_MISCHWALD_PER_T_PER_YEAR = 0.0177` with inline marker `// PROVISIONAL — value pending GreenScout confirmation, see docs/calc-sources.md` (and `# PROVISIONAL …` in Python), `FOOTBALL_FIELDS_PER_HA = 1.28`, `DEFAULT_PACHT_EUR_PER_KWP = 100`, `DEFAULT_VERTRAGSLAUFZEIT_JAHRE = 20`, `DEFAULT_SENSITIVITY_CT_KWH = [35, 40, 45]`. Also create `docs/calc-sources.md` with a table `Konstante | Wert | Quelle | Stand | Anmerkung`. Tests assert constants are *referenced* (not their numeric value).
- **Acceptance criteria:**
  - [ ] All six constants exported on both sides with identical numeric values.
  - [ ] PROVISIONAL marker present on the Mischwald constant in both files.
  - [ ] `docs/calc-sources.md` exists with at least the six rows above.
  - [ ] Tests assert constants exist and are referenced (not their numeric value, per decision #2).
- **Files likely touched:** `src/lib/calculations/constants.ts`, `services/python/app/domain/constants.py`, `docs/calc-sources.md`, plus `*.test.ts` and `test_constants.py`.
- **Pause-triggers anticipated:** none.

---

### T-032 TS calculation module (live preview)
- **Status:** ⬜ TODO
- **Feature:** calculations
- **Type:** feat
- **Effort:** M
- **Blocks:** T-033, T-034
- **Blocked by:** T-031
- **Description:**
  Implement `src/lib/calculations/index.ts` with pure functions per SPEC §4.7: `ersparnisProJahr`, `ersparnisProMonat`, `ersparnis20Jahre`, `pachtEinnahmeEinmalig`, `gesamterzeugung20j`, `gesamtvorteil`, plus CO₂ derivatives (`co2TonnenProJahr`, `co2HektarMischwald`, `co2FussballfelderProJahr`). Inputs as a typed `StudyCalcInput` object. All functions pure, side-effect-free, deterministic. **100% line + branch coverage**. Use the constants module from T-031. Honor `co2Override` semantics: when override is true, the override values flow through unchanged.
- **Acceptance criteria:**
  - [ ] Every formula from SPEC §4.7 implemented exactly.
  - [ ] `co2Override` short-circuits override values through without recomputation.
  - [ ] Coverage report shows 100% lines + branches on this module.
  - [ ] Snapshot test of a representative input matches an explicit expected output (no floating-point drift surprises).
- **Files likely touched:** `src/lib/calculations/index.ts`, `src/lib/calculations/types.ts`, `src/lib/calculations/*.test.ts`.
- **Pause-triggers anticipated:** none.

---

### T-033 Python calculation module (authoritative for document generation)
- **Status:** ⬜ TODO
- **Feature:** calculations (python)
- **Type:** feat
- **Effort:** M
- **Blocks:** T-034, T-037
- **Blocked by:** T-031
- **Description:**
  Implement `services/python/app/domain/calculations.py` mirroring T-032 exactly. Pydantic v2 `StudyCalcInput` model, pure functions, references constants from T-031 Python side. **100% coverage** via pytest. Use `Decimal` arithmetic (not `float`) for monetary values to match Prisma's `Decimal` columns and avoid drift.
- **Acceptance criteria:**
  - [ ] All formulas implemented identically to T-032.
  - [ ] `Decimal` used for all monetary intermediates; results convertible to float only at the API boundary.
  - [ ] Pytest coverage = 100% on `app/domain/calculations.py`.
  - [ ] `co2Override` semantics match TS.
- **Files likely touched:** `services/python/app/domain/calculations.py`, `services/python/app/schemas/calc.py`, `services/python/tests/test_calculations.py`.
- **Pause-triggers anticipated:** none.

---

### T-034 Parity tests — TS vs Python calculation outputs
- **Status:** ⬜ TODO
- **Feature:** calculations
- **Type:** test
- **Effort:** M
- **Blocks:** T-040
- **Blocked by:** T-032, T-033
- **Description:**
  Author a parity-test harness: a JSON fixture of 20+ representative `StudyCalcInput` cases (including edge cases — zero eigenverbrauch, large kWp, override-on, sensitivity boundaries). A Vitest suite runs each through `src/lib/calculations`; a pytest suite runs the same fixtures through `services/python/app/domain/calculations.py`. Both must produce results within `1e-6` of each other for monetary fields and within `1e-4` for CO₂ derivatives. Fixtures live in `tests/fixtures/calc-parity/` (shared).
- **Acceptance criteria:**
  - [ ] At least 20 fixtures covering happy path + edges (zero, max, override on/off, all three sensitivity prices).
  - [ ] Both test suites consume the same fixture JSON.
  - [ ] CI runs both suites and fails the PR if any fixture mismatches.
  - [ ] Tolerance bounds documented in `docs/calc-sources.md`.
- **Files likely touched:** `tests/fixtures/calc-parity/*.json`, `src/lib/calculations/parity.test.ts`, `services/python/tests/test_calculations_parity.py`.
- **Pause-triggers anticipated:** none.

---

### Slice 8 — Python service + PPTX template wiring

### T-035 FastAPI study/calc/document endpoints + pydantic schemas
- **Status:** ⬜ TODO
- **Feature:** python service (api)
- **Type:** feat
- **Effort:** M
- **Blocks:** T-037, T-038
- **Blocked by:** T-033
- **Description:**
  Author `services/python/app/api/calc.py` with `POST /calc/preview` (input → all derived values), `POST /documents/generate` (input + image paths → returns `{pptxPath, pdfPath}` — PDF path filled in T-038), `GET /health` already exists. Pydantic v2 schemas in `app/schemas/`: `StudyCalcInput`, `StudyCalcOutput`, `DocumentGenerateRequest`, `DocumentGenerateResponse`. Input validation rejects negative numerics where applicable. Use the existing internal-only network (no public exposure).
- **Acceptance criteria:**
  - [ ] OpenAPI docs at `/docs` enumerate all three endpoints.
  - [ ] `POST /calc/preview` returns the same values as the TS calc module for parity fixtures.
  - [ ] `POST /documents/generate` returns the generated PPTX path; PDF path is a stub until T-038.
  - [ ] Pydantic rejects negative `anlageKwp`, negative prices, etc.
  - [ ] Pytest covers all three endpoints (200 + 422 paths).
- **Files likely touched:** `services/python/app/api/calc.py`, `services/python/app/api/documents.py`, `services/python/app/schemas/**`, `services/python/tests/test_api.py`.
- **Pause-triggers anticipated:** none.

---

### T-036 Author `docs/pptx-mapping.md` from the existing template (no edits yet)
- **Status:** ⬜ TODO
- **Feature:** docs
- **Type:** docs
- **Effort:** M
- **Blocks:** T-037, T-029c
- **Blocked by:** T-006
- **Description:**
  Per **DECISIONS.md decision #6**, open `templates/Machbarkeitsstudie-PV-Template_v1_6.pptx` and produce `docs/pptx-mapping.md` containing a three-column table `Slide-Nr | Original-Text | vorgeschlagener Key` for every red `#FF0000` literal value. Propose `snake_case` keys aligned with `Study` / `Customer` / `User` fields wherever possible. Flag ambiguous cases (same numeric value on different slides with different meanings — e.g. the `24.600 €` example) so the user can disambiguate. **Do NOT edit the PPTX in this task.** End with a clear sign-off section: `## User-Review Checkpoint — sign off below before T-037 begins`.
- **Acceptance criteria:**
  - [ ] One row per red literal value in the template; no red value omitted.
  - [ ] Every proposed key follows `snake_case` and aligns with an existing schema field where possible.
  - [ ] Ambiguous cases explicitly flagged with `?` in the key column and a note.
  - [ ] Sign-off section at the bottom.
  - [ ] PPTX template untouched.
- **Files likely touched:** `docs/pptx-mapping.md` only. Read-only access to `templates/Machbarkeitsstudie-PV-Template_v1_6.pptx`.
- **Pause-triggers anticipated:** This task itself is the pause — the user must sign off before T-037 starts.

---

### T-037 Apply `{{snake_case}}` placeholders to the PPTX template (post-sign-off)
- **Status:** ⬜ TODO
- **Feature:** python service (templates)
- **Type:** feat
- **Effort:** M
- **Blocks:** T-038
- **Blocked by:** T-036
- **Description:**
  After the user signs off `docs/pptx-mapping.md`, edit `templates/Machbarkeitsstudie-PV-Template_v1_6.pptx` using `python-pptx`: replace each red literal value with its `{{snake_case_key}}` placeholder, preserving run-level formatting (font, colour `#FF0000`, size). Set `auto_size = MSO_AUTO_SIZE.TEXT_TO_FIT_SHAPE` on text frames likely to receive long values (customer name, object address, object name). Image placeholder shapes (red-framed boxes) are tagged with a known shape name (`{{image_before}}`, `{{image_after}}`) so the generator can target them. Provide a one-off script `services/python/scripts/apply_placeholders.py` that performs the edits idempotently from `docs/pptx-mapping.md`.
- **Acceptance criteria:**
  - [ ] Every key from the signed-off mapping doc appears as `{{snake_case_key}}` exactly once in the template.
  - [ ] Original formatting (font, red colour, size) preserved.
  - [ ] `MSO_AUTO_SIZE.TEXT_TO_FIT_SHAPE` set on the long-text frames.
  - [ ] Image placeholders renamed so the generator can locate them by shape name.
  - [ ] Script is idempotent: running it twice produces the same template byte-equal (or with deterministic diffs explained).
- **Files likely touched:** `templates/Machbarkeitsstudie-PV-Template_v1_6.pptx`, `services/python/scripts/apply_placeholders.py`.
- **Pause-triggers anticipated:** §7.1 (`python-pptx` install).

---

### T-038 PPTX generator service (placeholder replacement + image insertion)
- **Status:** ⬜ TODO
- **Feature:** python service (pptx)
- **Type:** feat
- **Effort:** L → split into T-038a / T-038b
- **Blocks:** T-039, T-040
- **Blocked by:** T-037, T-029b
- **Description:**
  Implement `app/services/pptx_generator.py` that, given a `StudyCalcInput` (already including all consultant/customer/object/calc fields) plus paths to processed BEFORE/AFTER images, opens the template, replaces every `{{snake_case_key}}` text run with the corresponding value (preserving formatting), and inserts the two images into the named image placeholder shapes (preserving shape position and scaling to fit). Output filename pattern: see T-039 doc-history convention. See split tasks for the actual breakdown.
- **Acceptance criteria:** see split tasks.
- **Files likely touched:** see split tasks.
- **Pause-triggers anticipated:** §7.1 (already covered by T-037).

---

### T-038a PPTX text-placeholder replacement
- **Status:** ⬜ TODO
- **Feature:** python service (pptx)
- **Type:** feat
- **Effort:** M
- **Blocks:** T-038b, T-039
- **Blocked by:** T-037
- **Description:**
  Implement the text-replacement half of `pptx_generator.py`: walk every shape in every slide, find `{{snake_case_key}}` tokens **across runs** (handling python-pptx's run-split quirk), replace with the corresponding value formatted per SPEC §8.3 (German numbers `1.234,56`, currency `27.500 €` with NBSP, dates `DD.MM.YYYY`). Preserve run-level font / colour / size. Long-text fields rely on `MSO_AUTO_SIZE.TEXT_TO_FIT_SHAPE` set in T-037.
- **Acceptance criteria:**
  - [ ] Run-split tokens (e.g. `{{` in one run, `customer_name}}` in another) correctly stitched.
  - [ ] Numbers formatted in German locale: `27.500 €` (NBSP between value and €).
  - [ ] Dates formatted `DD.MM.YYYY HH:mm`.
  - [ ] Unit test uses a fixture template with 5 known placeholders and asserts the output PPTX contains the expected text.
  - [ ] Original formatting preserved (asserted via run.font checks).
- **Files likely touched:** `services/python/app/services/pptx_generator.py`, `services/python/tests/test_pptx_text.py`, `services/python/tests/fixtures/mini_template.pptx`.
- **Pause-triggers anticipated:** none (deps already added in T-037).

---

### T-038b PPTX image-placeholder replacement
- **Status:** ⬜ TODO
- **Feature:** python service (pptx)
- **Type:** feat
- **Effort:** M
- **Blocks:** T-039
- **Blocked by:** T-038a, T-029b
- **Description:**
  Add image-insertion logic: locate shapes named `{{image_before}}` and `{{image_after}}`, capture their `left`, `top`, `width`, `height`, remove the placeholder shape, and add a new picture shape at the same position scaled to fit while preserving aspect ratio (centered within the box if there's any letterbox). Both images required — fail loud if either is missing for a study being generated.
- **Acceptance criteria:**
  - [ ] Output PPTX has two `Picture` shapes at exactly the positions of the original placeholders.
  - [ ] Aspect ratio preserved (no stretch).
  - [ ] Generation fails with a clear error if either image is missing.
  - [ ] Pytest covers both happy path and missing-image path with fixture images.
- **Files likely touched:** `services/python/app/services/pptx_generator.py`, `services/python/tests/test_pptx_images.py`.
- **Pause-triggers anticipated:** none.

---

### Slice 9 — PDF rendering

### T-039 LibreOffice headless PDF render + Python service Dockerfile update
- **Status:** ⬜ TODO
- **Feature:** python service (pdf)
- **Type:** feat
- **Effort:** M
- **Blocks:** T-040, T-031 (history)
- **Blocked by:** T-038b
- **Description:**
  Add `app/services/pdf_renderer.py` invoking `libreoffice --headless --convert-to pdf --outdir <out> <input.pptx>` via `subprocess.run` with a hard timeout of 30 s (SPEC §6.2 budget). Update `services/python/Dockerfile` to install LibreOffice (`apt-get install -y --no-install-recommends libreoffice`). Wire `POST /documents/generate` from T-035 to call PPTX gen (T-038) then PDF render. On render failure: structured error returned to the Next.js side, which surfaces as a banner per SPEC §4.9.
- **Acceptance criteria:**
  - [ ] PDF produced from a fixture PPTX in <30 s on a clean container.
  - [ ] Timeout > 30 s aborts and returns a structured error (no zombie subprocess).
  - [ ] Dockerfile installs LibreOffice; final image still builds in CI.
  - [ ] Pytest covers happy + timeout + LibreOffice-missing error paths.
  - [ ] Frontend banner renders on render failure (Playwright assertion).
- **Files likely touched:** `services/python/app/services/pdf_renderer.py`, `services/python/Dockerfile`, `services/python/app/api/documents.py` (wiring), `src/features/documents/components/generation-banner.tsx`.
- **Pause-triggers anticipated:** §7.1 (LibreOffice in Dockerfile — first time, must surface).

---

### Slice 10 — Document history

### T-040 Generated document persistence + per-study version list UI
- **Status:** ⬜ TODO
- **Feature:** documents
- **Type:** feat
- **Effort:** M
- **Blocks:** T-041
- **Blocked by:** T-028, T-039
- **Description:**
  After successful generation, write two `GeneratedDocument` rows (one PPTX, one PDF) with `studyId`, `generatedById = currentUser`, `filename` per the naming convention below, and `generatedAt`. Files saved under `./generated/<studyId>/<filename>`. Update `Study.status = GENERATED` and `Study.generatedAt = now`. **Filename pattern** (proposed): `<consultantLastName>_<customerLastName>_<objectSlug>_v<NN>_<YYYY-MM-DD>.<ext>` — slug = lowercase ASCII-folded, max 40 chars. Version number = count of existing `GeneratedDocument` rows for that study + 1. All previous versions retained (no auto-purge in MVP). UI: a "Versionen" panel on the study detail page listing every version with download links serving `Content-Disposition: attachment`.
- **Acceptance criteria:**
  - [ ] Filename matches the proposed pattern.
  - [ ] Version numbers monotonically increment per study, never reused.
  - [ ] Download response sets `Content-Disposition: attachment` with the proper filename.
  - [ ] Versions panel lists all entries newest-first.
  - [ ] Audit-log `GENERATE_DOCUMENT` entry created per generation.
  - [ ] Playwright covers F3 (generate from study detail), F4 (re-generate creates a new version).
- **Files likely touched:** `src/features/documents/services/document-service.ts`, `src/features/documents/components/version-list.tsx`, `src/app/api/studies/[id]/documents/route.ts`, `src/app/(app)/studies/[id]/page.tsx` (panel).
- **Pause-triggers anticipated:** §7.5 (api shape) only if existing endpoints change; here we're adding.

---

### Slice 11 — Admin user management

### T-041 Admin users CRUD + deactivate + hard-delete + reset password
- **Status:** ⬜ TODO
- **Feature:** users (admin)
- **Type:** feat
- **Effort:** L → split into T-041a / T-041b
- **Blocks:** T-042
- **Blocked by:** T-019, T-028
- **Description:**
  Admin-only `/admin/users` area for managing consultant accounts. See split tasks below for the split: T-041a covers create / edit / deactivate, T-041b covers hard-delete (DSGVO-relevant) and reset-password.
- **Acceptance criteria:** see split tasks.
- **Files likely touched:** see split tasks.
- **Pause-triggers anticipated:** §7.3 (auth-adjacent), §7.11 (hard-delete touches personal data).

---

### T-041a Admin users — create / edit / deactivate
- **Status:** ⬜ TODO
- **Feature:** users (admin)
- **Type:** feat
- **Effort:** M
- **Blocks:** T-041b
- **Blocked by:** T-019, T-028
- **Description:**
  `/admin/users` list (TanStack Table, columns: name | email | role | active | last login | actions), `/admin/users/new` and `/admin/users/[id]/edit` forms. Create generates a random temp password, sets `mustChangePassword=true`, persists the user, returns the temp password to the admin in a one-time toast — never store it plaintext. Deactivate sets `active=false`; reactivate sets `active=true`. Soft-delete sets `deletedAt=now` and removes from the list. Audit-log entries for `CREATE`, `UPDATE`, `SOFT_DELETE` on `User`.
- **Acceptance criteria:**
  - [ ] Only `ADMIN` can access the area (403 + full error page otherwise).
  - [ ] Temp password shown once and cleared from memory.
  - [ ] Deactivated users cannot log in (checked by T-017).
  - [ ] Audit-log entries with `userId` of the actor.
  - [ ] Playwright covers F5 (admin user management happy path).
- **Files likely touched:** `src/app/(admin)/admin/users/**`, `src/features/users/components/**`, `src/features/users/services/**`.
- **Pause-triggers anticipated:** §7.3.

---

### T-041b Admin users — reset password + hard-delete (DSGVO)
- **Status:** ⬜ TODO
- **Feature:** users (admin)
- **Type:** feat
- **Effort:** M
- **Blocks:** —
- **Blocked by:** T-041a
- **Description:**
  "Passwort zurücksetzen" button generates a new temp password (one-time toast to the admin), sets `mustChangePassword=true`, clears `failedLoginCount`/`lockoutUntil`, writes `AuditLog` `PASSWORD_RESET`. "DSGVO-Löschung" button on a *soft-deleted* user triggers a hard-delete dialog requiring the admin to type the user's email to confirm; cascades clean removal of dependent rows that don't violate audit-log integrity (audit log entries kept with `userId` retained for legal record). Writes a `RETENTION_NOTICE` audit entry referencing the hard-delete.
- **Acceptance criteria:**
  - [ ] Reset issues a new temp password and forces change on next login.
  - [ ] Hard-delete only available on already-soft-deleted users.
  - [ ] Confirmation requires typed email match.
  - [ ] Audit log preserved (entries retain `userId` even though the user row is gone).
  - [ ] Playwright covers the reset flow and the hard-delete dialog (both confirm + cancel).
- **Files likely touched:** `src/features/users/services/reset-password.ts`, `src/features/users/services/hard-delete-user.ts`, `src/app/(admin)/admin/users/[id]/dsgvo-delete/page.tsx`.
- **Pause-triggers anticipated:** §7.11 (DSGVO hard-delete), §7.3 (password reset).

---

### Slice 12 — SMTP settings (admin)

### T-042 AES-256-GCM crypto module for SMTP settings
- **Status:** ⬜ TODO
- **Feature:** settings
- **Type:** feat
- **Effort:** M
- **Blocks:** T-043, T-044
- **Blocked by:** T-013
- **Description:**
  Per **DECISIONS.md decision #4**, implement `src/features/settings/crypto.ts` with `encrypt(plain): string` and `decrypt(blob): string`. Algorithm AES-256-GCM via Node's `crypto`. Key loaded from `SETTINGS_ENCRYPTION_KEY` (32 bytes, base64-decoded); 12-byte random nonce per call; storage format `base64(nonce)|base64(ciphertext)|base64(tag)`. Throw if the env var is missing or wrong length. Add to `.env.example` with placeholder value + a comment that generation is `openssl rand -base64 32`.
- **Acceptance criteria:**
  - [ ] Roundtrip test (`encrypt` → `decrypt`) passes.
  - [ ] Tampering with any of the three segments causes `decrypt` to throw (auth tag verification).
  - [ ] Wrong-key decryption fails with a clear error (not silent garbage).
  - [ ] Missing/short `SETTINGS_ENCRYPTION_KEY` throws on first call.
  - [ ] Module coverage = 100%.
- **Files likely touched:** `src/features/settings/crypto.ts`, `src/features/settings/crypto.test.ts`, `.env.example`.
- **Pause-triggers anticipated:** §7.3 (security primitive).

---

### T-043 SMTP settings admin UI + Setting table CRUD
- **Status:** ⬜ TODO
- **Feature:** settings
- **Type:** feat
- **Effort:** M
- **Blocks:** T-044
- **Blocked by:** T-042, T-041a
- **Description:**
  `/admin/settings` (admin-only) form for SMTP config: `smtp.host`, `smtp.port`, `smtp.user`, `smtp.passwordEnc` (password input → encrypted via T-042 before persistence), `smtp.from`, `retention.years` (default 10 per SPEC §6.1). Each field stored as one row in `Setting` (the password row is the only encrypted value). Read of decrypted password only on demand inside the SMTP send flow. Audit-log `UPDATE` entry for each changed key with `changeSet` recording the key names changed (never the values).
- **Acceptance criteria:**
  - [ ] Only `ADMIN` can access; non-admin gets 403.
  - [ ] Password field input value never echoed back; on edit, the field shows a placeholder and saves only if non-empty.
  - [ ] Audit-log entries never include the plaintext password.
  - [ ] Decrypted password kept in memory only inside the SMTP send call.
  - [ ] Playwright covers the save flow and round-trip read.
- **Files likely touched:** `src/app/(admin)/admin/settings/page.tsx`, `src/features/settings/components/smtp-settings-form.tsx`, `src/features/settings/services/setting-service.ts`.
- **Pause-triggers anticipated:** §7.3 (secret handling).

---

### T-044 Test-send button + wire lockout admin alert to real SMTP
- **Status:** ⬜ TODO
- **Feature:** settings
- **Type:** feat
- **Effort:** M
- **Blocks:** T-046
- **Blocked by:** T-043, T-020
- **Description:**
  Add a "Test-Mail senden" button on the settings page that sends a fixed test message to the admin email. Implement `src/features/settings/services/smtp-sender.ts` (Nodemailer or built-in). Replace the no-op `notifyAdminLockout` stub from T-020 with this real sender. Failures handled gracefully — the test button shows a toast, real lockout alerts log to audit and don't throw if SMTP is unconfigured (system continues to function).
- **Acceptance criteria:**
  - [ ] Test send delivers a basic plain-text email when SMTP is configured.
  - [ ] Lockout flow (10 failed attempts) triggers a real email + audit entry when SMTP configured.
  - [ ] If SMTP is unconfigured, lockout alert silently degrades to audit-entry-only (no crash).
  - [ ] No SMTP password is ever logged.
  - [ ] Pytest/Vitest covers the configured + unconfigured branches with a mocked transport.
- **Files likely touched:** `src/features/settings/services/smtp-sender.ts`, `src/features/auth/services/admin-alert.ts` (replace stub), `src/features/settings/components/smtp-settings-form.tsx` (test button).
- **Pause-triggers anticipated:** §7.1 (`nodemailer` install), §7.6 (outbound SMTP is an external integration — must surface explicitly before the first test send).

---

### Slice 13 — Audit-log admin view

### T-045 Audit-log read-only admin view with filters + pagination
- **Status:** ⬜ TODO
- **Feature:** audit
- **Type:** feat
- **Effort:** M
- **Blocks:** T-046
- **Blocked by:** T-041a
- **Description:**
  `/admin/audit` admin-only page listing `AuditLog` rows. Columns: timestamp | user | action | entityType | entityId | changeSet preview | ipAddress. Filters: entityType, action, date range, user. Pagination 50/100/200. No edit/delete buttons anywhere — UI never exposes mutations. Server-side: the audit repository explicitly does **not** export `update` or `delete` methods (append-only at the application layer).
- **Acceptance criteria:**
  - [ ] Only `ADMIN` can access.
  - [ ] Filters compose correctly (entityType + action + date range together).
  - [ ] `changeSet` rendered as collapsible JSON.
  - [ ] No `PUT`/`PATCH`/`DELETE` route handler exists for `/api/audit/*`.
  - [ ] Repository file inspected: no `update` / `delete` exports; ESLint or unit test enforces this.
  - [ ] Playwright covers filter combinations.
- **Files likely touched:** `src/app/(admin)/admin/audit/page.tsx`, `src/features/audit/components/audit-table.tsx`, `src/features/audit/services/audit-service.ts`, `src/lib/repositories/audit-log.repository.ts`.
- **Pause-triggers anticipated:** §7.11 (audit log is DSGVO-adjacent — confirm append-only is enforced).

---

### Slice 14 — Retention cron (Python service)

### T-046 APScheduler in-memory daily retention job + notice audit entries
- **Status:** ⬜ TODO
- **Feature:** python service (retention)
- **Type:** feat
- **Effort:** M
- **Blocks:** T-047
- **Blocked by:** T-044, T-045
- **Description:**
  Per **DECISIONS.md decision #8**, install `apscheduler` in the Python service. Add `app/services/retention.py` with `find_studies_approaching_expiry(now)` and `emit_retention_notices(studies)`. Register a `BackgroundScheduler` (`MemoryJobStore`) in `app/main.py` on startup, configured to run the job daily at 02:00 UTC. The job queries studies whose `createdAt + retention_years` (from `Setting`, default 10) falls within the next 60 days; writes a `RETENTION_NOTICE` `AuditLog` entry **and** an in-app admin notification for each study hitting the 60 / 30 / 7-day mark (idempotent — don't double-notify on subsequent days). **Never** auto-deletes anything. On scheduler shutdown, jobs are dropped per V2 backlog note about persistent store.
- **Acceptance criteria:**
  - [ ] Scheduler boots with the FastAPI app and shuts down cleanly.
  - [ ] Daily job is idempotent: running it twice on the same day produces one notice per study/threshold, not two.
  - [ ] `RETENTION_NOTICE` audit entries written with the study ID and threshold (60/30/7).
  - [ ] No path produces a hard-delete from the cron.
  - [ ] Pytest covers all three threshold paths with synthetic dates (fake-clock pattern).
- **Files likely touched:** `services/python/app/services/retention.py`, `services/python/app/main.py`, `services/python/requirements.txt`, `services/python/tests/test_retention.py`.
- **Pause-triggers anticipated:** §7.1 (`apscheduler` install), §7.11 (DSGVO retention behaviour).

---

### T-047 In-app admin notifications feed + retention notice surface
- **Status:** ⬜ TODO
- **Feature:** audit (notifications)
- **Type:** feat
- **Effort:** M
- **Blocks:** T-048
- **Blocked by:** T-046
- **Description:**
  Add a lightweight `Notification` table (new table — additive, no risky schema change) with `id`, `userId` (admin receiver), `kind` (`RETENTION_NOTICE` initially), `payload Json`, `readAt`, `createdAt`. Python retention job writes rows via a new internal endpoint `POST /notifications/admin` on the Next.js side (or directly via Prisma if you add a sidecar — pick one and document in `DECISIONS.md`). Admin sees a bell icon with unread count; opening the panel lists notices linking to the study. Mark-as-read on click.
- **Acceptance criteria:**
  - [ ] New `Notification` Prisma model + migration added.
  - [ ] Bell icon shows unread count; clicking marks read.
  - [ ] Each notice links to the relevant study.
  - [ ] Berater users don't see admin notifications.
  - [ ] Playwright covers the unread-then-read flow.
- **Files likely touched:** `prisma/schema.prisma`, `prisma/migrations/<timestamp>_notifications/`, `src/features/notifications/components/notification-bell.tsx`, `src/app/api/notifications/admin/route.ts`.
- **Pause-triggers anticipated:** none (additive table only — see CLAUDE.md §7.2 exception). §7.11 keep in mind.

---

### T-048 Admin DSGVO hard-delete UI for Study (retention follow-through)
- **Status:** ⬜ TODO
- **Feature:** studies (admin)
- **Type:** feat
- **Effort:** M
- **Blocks:** —
- **Blocked by:** T-047
- **Description:**
  Add a "DSGVO-Löschung" admin action on each `Study` once it's past retention (or when a `RETENTION_NOTICE` exists). Dialog requires the admin to type the customer's last name to confirm. Cascade-deletes `StudyImage`, `GeneratedDocument`, and on-disk files under `./uploads/studies/<id>/` and `./generated/<id>/`. Audit-log entry `DELETE` (with `entityType="Study"`, `entityId`, `changeSet` summarising what was deleted; **never** the personal data itself). Berater never sees this action.
- **Acceptance criteria:**
  - [ ] Action only visible to admin and only on studies eligible per retention or with an unresolved `RETENTION_NOTICE`.
  - [ ] Confirmation requires typed customer last name match.
  - [ ] All files on disk removed (verified post-delete).
  - [ ] Audit-log entry written; entry does NOT contain personal data.
  - [ ] Playwright covers happy path + cancel.
- **Files likely touched:** `src/app/(admin)/admin/studies/[id]/dsgvo-delete/page.tsx`, `src/features/studies/services/hard-delete-study.ts`.
- **Pause-triggers anticipated:** §7.11 (DSGVO hard-delete — most-sensitive operation in the app).

---

### Slice 15 — Polish

### T-049 Centralised German i18n dictionary `src/i18n/de.ts`
- **Status:** ⬜ TODO
- **Feature:** i18n
- **Type:** chore
- **Effort:** M
- **Blocks:** T-053
- **Blocked by:** T-018
- **Description:**
  Audit every user-facing string introduced in prior slices, move it into `src/i18n/de.ts` keyed by feature (`auth.login.title`, `studies.wizard.step1.heading`, etc.), and refactor components to import from the dictionary. Distinguish "Du" strings (internal UI) from "Sie" strings (any customer-facing output) by namespace prefix. ESLint rule or doc-lint catches inline German strings outside `de.ts`.
- **Acceptance criteria:**
  - [ ] `src/i18n/de.ts` is the single source of all UI strings.
  - [ ] "Du" vs "Sie" namespaces clearly separated.
  - [ ] Grep test fails the PR if a non-trivial German string appears outside `de.ts`.
  - [ ] Existing Playwright tests still pass.
- **Files likely touched:** `src/i18n/de.ts`, every UI component touched in prior slices.
- **Pause-triggers anticipated:** none.

---

### T-050 CSP tightening + error pages (404 / 403 / 500)
- **Status:** ⬜ TODO
- **Feature:** chore (security + ux)
- **Type:** feat
- **Effort:** M
- **Blocks:** T-053
- **Blocked by:** T-021
- **Description:**
  Tighten the CSP from T-021: remove `'unsafe-inline'` on styles (use nonces or Tailwind's static output), confirm `script-src` is `'self'` plus the Next.js inline-bootstrap nonce only. Add custom error pages: `src/app/not-found.tsx` (404), `src/app/forbidden/page.tsx` (403), `src/app/error.tsx` (500) per SPEC §4.9 full-error-page pattern. All pages use design tokens, German microcopy.
- **Acceptance criteria:**
  - [ ] CSP has no `unsafe-inline` (verified in browser).
  - [ ] All three error pages render with proper status codes.
  - [ ] Forbidden page reached by non-admin hitting an admin route.
  - [ ] 500 page reached on a deliberate thrown error in a test route.
  - [ ] Playwright covers each error page.
- **Files likely touched:** `src/middleware.ts`, `src/app/not-found.tsx`, `src/app/forbidden/page.tsx`, `src/app/error.tsx`.
- **Pause-triggers anticipated:** §7.3 (security headers).

---

### T-051 Playwright E2E suite for F1–F7
- **Status:** ⬜ TODO
- **Feature:** test
- **Type:** test
- **Effort:** L → split into T-051a / T-051b
- **Blocks:** T-053
- **Blocked by:** T-040, T-041a
- **Description:**
  End-to-end happy-path coverage of every flow in SPEC §4.3. Split into two PRs for review tractability. See T-051a / T-051b.
- **Acceptance criteria:** see split tasks.
- **Files likely touched:** see split tasks.
- **Pause-triggers anticipated:** none.

---

### T-051a Playwright E2E — F1, F2, F3, F4
- **Status:** ⬜ TODO
- **Feature:** test
- **Type:** test
- **Effort:** M
- **Blocks:** T-051b
- **Blocked by:** T-040
- **Description:**
  Author Playwright specs for F1 (login + forced password change on first login), F2 (create new study from dashboard), F3 (open existing study → generate document → download PPTX+PDF), F4 (edit existing study → re-generate → new version appears in version list). Use a seeded test DB. Tests run headless in CI.
- **Acceptance criteria:**
  - [ ] All four flows green in CI.
  - [ ] Tests use page-object pattern; selectors are role-based (a11y-friendly).
  - [ ] Test fixtures include a non-first-login admin and a first-login Berater.
- **Files likely touched:** `e2e/auth.spec.ts`, `e2e/study-create.spec.ts`, `e2e/document-generate.spec.ts`, `e2e/fixtures/**`, `playwright.config.ts`.
- **Pause-triggers anticipated:** §7.1 (`@playwright/test` install).

---

### T-051b Playwright E2E — F5, F6, F7
- **Status:** ⬜ TODO
- **Feature:** test
- **Type:** test
- **Effort:** M
- **Blocks:** T-053
- **Blocked by:** T-051a, T-041a
- **Description:**
  Author Playwright specs for F5 (admin user CRUD + reset password), F6 (study hand-over to another consultant), F7 (admin god-mode editing another consultant's study).
- **Acceptance criteria:**
  - [ ] All three flows green in CI.
  - [ ] F5 verifies the temp password is shown once.
  - [ ] F6 verifies the audit-log entry presence in the admin audit view.
  - [ ] F7 verifies non-admin gets 403 on the same route.
- **Files likely touched:** `e2e/admin-users.spec.ts`, `e2e/handover.spec.ts`, `e2e/admin-god-mode.spec.ts`.
- **Pause-triggers anticipated:** none.

---

### T-052 Docker Compose smoke test (compose up → all services healthy)
- **Status:** ⬜ TODO
- **Feature:** chore (docker)
- **Type:** test
- **Effort:** S
- **Blocks:** T-053
- **Blocked by:** T-039, T-046
- **Description:**
  Add a smoke script (`scripts/smoke.sh` for POSIX, `scripts/smoke.ps1` for PowerShell) that runs `docker compose up -d`, waits for `web` to serve `/api/health`, `pyservice` to serve `/health`, and `db` to accept connections. CI runs this in a dedicated job after image builds.
- **Acceptance criteria:**
  - [ ] Script exits 0 when all three healthchecks pass within 60 s.
  - [ ] Script exits non-zero with structured logs on any failure.
  - [ ] CI job invokes the script and tears down with `docker compose down -v` afterwards.
- **Files likely touched:** `scripts/smoke.sh`, `scripts/smoke.ps1`, `.github/workflows/ci.yml`.
- **Pause-triggers anticipated:** §8.10 reminder — script must never target production hostnames.

---

### T-053 README + CONTRIBUTING + final docs sweep
- **Status:** ⬜ TODO
- **Feature:** docs
- **Type:** docs
- **Effort:** M
- **Blocks:** —
- **Blocked by:** T-049, T-050, T-051b, T-052
- **Description:**
  Author `README.md` (project overview, quickstart, local dev steps for both Node and Python, link to `SPEC.md`, `CLAUDE.md`, `DECISIONS.md`) and `CONTRIBUTING.md` (branch naming, conventional commits, pre-commit gates, CI requirements, pause-trigger reminder). Audit `docs/` directory for stragglers (calc-sources, pptx-mapping, db, docker, ci, python-service, pre-commit) and ensure each is linked from the README. Sweep for any TODO(claude) markers left behind and either resolve or escalate.
- **Acceptance criteria:**
  - [ ] README covers setup → run → test → build for both Next.js and Python.
  - [ ] CONTRIBUTING covers branch naming, commit style, pre-commit gates, and the "pause and ask" rule.
  - [ ] All files in `docs/` are linked from README.
  - [ ] No `TODO(claude):` markers remain unresolved at this point.
- **Files likely touched:** `README.md`, `CONTRIBUTING.md`, `docs/**`.
- **Pause-triggers anticipated:** none.

---

## Future (Phase 3)

*(parked items — not actionable in MVP, kept here as placeholders so the scope decision is visible)*

- **PV-Sol-Output-Upload (PDF/CSV).** Phase 3 — per **DECISIONS.md decision #7**, MVP keeps Modulanzahl / Modulfläche / Eigenverbrauchsquote / Netzeinspeisung as manual numeric fields. Future scope: accept a PV-Sol export, parse it, prefill those fields. Any premature "small optional upload" idea during MVP is a Pause-Trigger §7.6 (external integration).
- **SMTP-encryption key rotation with `encryption_key_version` column on `Setting`.** V2 — per **DECISIONS.md decision #4**, MVP uses a single static `SETTINGS_ENCRYPTION_KEY`. When this lands, add a versioned column and a re-encrypt-all-rows migration script.
- **APScheduler persistence via `SQLAlchemyJobStore`.** V2 hardening — per **DECISIONS.md decision #8**, MVP uses in-memory jobs (dropped on container restart). When this lands, jobs survive restarts and missed-fire policy becomes explicit.

---

## Recently completed
*(implementer / reviewer move tasks here once merged. Newest first.)*

### T-002 ✅ Configure Tailwind 3 + design tokens + Gabarito font
- **Merged:** 2026-05-19 via PR #2 (`36eaa7e`)
- **Branch:** `chore/tailwind-design-tokens`
- **Summary:** Tailwind 3.4.19 + PostCSS 8.5.14 + Autoprefixer 10.5.0 + tailwindcss-animate 1.0.7. Self-hosted Gabarito Regular + SemiBold via `next/font/local` in `public/fonts/` with OFL licence. Six SPEC §8.1 colour tokens wired as Tailwind theme colours and `:root` CSS variables; three brand greens get 50–900 ramps via HSL-shift (muted-lime DEFAULT pinned to step 400).
- **Decisions:** see `DECISIONS.md` entry "T-002 dependency set + Gabarito font strategy".

### T-001 ✅ Initialise Next.js 15 + TypeScript strict workspace
- **Merged:** 2026-05-19 via PR #1 (`a54059a`)
- **Branch:** `chore/init-nextjs-typescript`
- **Summary:** Next 15.5.18 + React 19 + TS 5 strict scaffold via `create-next-app@^15`. Full `@/*` path-alias map. Turbopack default. `.editorconfig`, `.nvmrc` (Node 24), `next.config.ts`, `eslint.config.mjs`.
- **Decisions:** see `DECISIONS.md` entries "T-001 dependency set + scaffolding path approved" and "T-001 post-implementation choices".

---

## Suggested first-run prompt for the planner

> *"Read `SPEC.md` and `CLAUDE.md`. Seed `TASKS.md` with the initial backlog needed to ship the MVP described in `SPEC.md` §2.1. Group tasks into vertical slices: project bootstrap → data model + Prisma → auth → customers CRUD → studies CRUD → image upload → calculation logic (TS+Py mirror) → Python service + PPTX template wiring → PDF rendering → document history → admin user management → SMTP settings → audit log → retention cron → polish. Surface anticipated pause-triggers. Stop after seeding — do not implement."*
