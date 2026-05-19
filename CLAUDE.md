# CLAUDE.md — Agent context for this repository

> **Read this entire file at the start of every session.** It is your operating contract.
> Then read `SPEC.md` and `TASKS.md` before doing anything else.
> If anything here conflicts with the user's instruction in the current message, surface the conflict — do not silently override.

---

## 0. Boot sequence (do this every time)

1. **Read** `SPEC.md` — the product & technical contract.
2. **Read** this file (`CLAUDE.md`) — your operating rules.
3. **Read** `TASKS.md` — current task queue and any in-progress notes.
4. **Read** `DECISIONS.md` if it exists — assumptions you have already recorded.
5. Only then act.

If `SPEC.md` and the user's current message disagree, **pause and ask**. Do not assume the message overrides the spec without confirmation.

---

## 1. Project at a glance

GreenScout-Webanwendung: an internal web tool for 1–10 consultants (Berater) to capture PV feasibility-study inputs and generate a customer-ready PPTX + PDF in the established GreenScout layout. Single-tenant in MVP, prepared for multi-tenant later. German UI; "Du" internally, "Sie" in customer-facing output.

Full functional contract lives in `SPEC.md`.

---

## 2. Tech stack (pinned)

| Layer | Technology | Version |
|---|---|---|
| Frontend | Next.js (App Router) + React + TypeScript | Next 15.x, React 19.x, TS 5.x with `strict: true` |
| Styling | Tailwind CSS + shadcn/ui | Tailwind 3.x |
| Forms | `react-hook-form` + `zod` | latest stable |
| Data fetching | `@tanstack/react-query` | v5 |
| Tables | `@tanstack/react-table` | v8 |
| Dates | `date-fns` (locale `de`) | latest stable |
| Auth | Auth.js (NextAuth) | v5 |
| ORM | Prisma | 5.x |
| Database | PostgreSQL | 16.x |
| Backend (heavy lift) | Python + FastAPI + uvicorn | Python 3.12 |
| PPTX | `python-pptx` | latest stable |
| PDF | LibreOffice headless (Docker) | 24.x |
| Images | `Pillow` | latest stable |
| Validation (Py) | `pydantic` | v2 |
| Node package manager | `npm` | bundled |
| Python package manager | `pip` + `venv` | bundled |
| Hosting | Hetzner VPS, Docker Compose | n/a |
| CI | GitHub Actions | n/a |
| Linter (TS) | ESLint + `@typescript-eslint` + `eslint-plugin-react` + `react-hooks` + `jsx-a11y` + `import` + `eslint-config-next` | latest stable |
| Formatter (TS) | Prettier + `prettier-plugin-tailwindcss` | latest stable |
| Linter+Formatter (Py) | `ruff` | latest stable |
| Type-checker (Py) | `pyright` | latest stable |
| Test (TS unit) | Vitest + React Testing Library | latest stable |
| Test (E2E) | Playwright | latest stable |
| Test (Py) | pytest | latest stable |

**Never introduce new dependencies without an explicit go from the user.** See §6.

---

## 3. Architectural decisions

These are settled. Re-opening any of them is a pause-trigger.

- **Two runtime services:** Next.js (frontend + light API) and a Python FastAPI service (PPTX templating + PDF rendering). Communication via internal HTTP inside the Docker network.
- **Template approach for PPTX:** populate the existing template (`templates/Machbarkeitsstudie-PV-Template_v1_6.pptx`) via named `{{snake_case}}` placeholders using `python-pptx`. **Never re-build the slide layout in code.**
- **PDF rendering:** headless LibreOffice subprocess, packaged into the Python service Docker image.
- **Single tenant now, multi-tenant later:** every persisted entity gets `organizationId` with default `"greenscout"`; all repository queries filter by it.
- **Soft-delete is the default** for `User`, `Customer`, `Study`. Hard-delete only via a separate admin DSGVO workflow.
- **Calculation logic mirrored:** TS module under `src/lib/calculations/` for live preview; authoritative Python module `app/domain/calculations.py` for document generation. Both share the same constants module and are covered by parity tests.
- **Storage:** uploaded images and generated documents live on the host filesystem under `./uploads/` and `./generated/`, mounted into both containers. No S3 in MVP.

---

## 4. Coding conventions

### 4.1 Folder structure
Feature-based at the top level (`src/features/<domain>/`), layer-organised inside each feature (`components/`, `hooks/`, `services/`, `schemas/`, `utils/`). See `SPEC.md` §7.3.

### 4.2 Naming
- Files & folders: `kebab-case` — `study-form.tsx`, `generate-document.ts`.
- React components & TS types/interfaces/enums: `PascalCase` — `StudyForm`, `interface CustomerInput`.
- Functions, variables, hooks: `camelCase` — `generateDocument`, `useStudyById`.
- Constants: `SCREAMING_SNAKE_CASE` — `MAX_FILE_SIZE_MB`.
- Prisma models: `PascalCase` model names; `camelCase` fields with `@map("snake_case")` to DB columns.
- Python: `snake_case` everywhere except classes (`PascalCase`).

### 4.3 Imports
TS imports use the `@/` alias rooted at `src/`. No relative `../../..` chains across feature boundaries.

```ts
import { Button } from "@/components/ui/button";
import { studySchema } from "@/features/studies/schemas";
```

Configured paths:
- `@/` → `src/`
- `@/features/*` → `src/features/*`
- `@/components/*` → `src/components/*`
- `@/lib/*` → `src/lib/*`
- `@/types/*` → `src/types/*`

### 4.4 Tests
Co-located: `study-form.tsx` + `study-form.test.tsx` in the same folder. Test files end with `.test.ts(x)` or `_test.py`.

### 4.5 Commits
Conventional Commits — `type(scope): subject`. Allowed types: `feat`, `fix`, `refactor`, `test`, `chore`, `docs`, `style`, `perf`, `build`, `ci`. Scope is the feature folder name where applicable.

```
feat(studies): add document generation trigger
fix(auth): correct lockout timer reset
test(calculations): cover sensitivity scenarios
```

### 4.6 Branching
GitHub Flow. `main` is always deployable. Each task gets its own branch:

```
feat/<short-description>
fix/<short-description>
chore/<short-description>
refactor/<short-description>
docs/<short-description>
```

Never push directly to `main`. Never force-push to anything.

### 4.7 Microcopy
- Internal consultant UI: *„Du"*-form.
- Customer-facing strings (PDF text, future emails): *„Sie"*-form.
- Numbers: German locale (`1.234,56`).
- Currency: `27.500 €` (non-breaking space before `€`).

---

## 5. Quality gates

### 5.1 Pre-commit (run automatically on every commit)
- TypeScript: `tsc --noEmit`
- ESLint with `--max-warnings 0`
- Prettier `--check`
- Python: `ruff check`, `ruff format --check`
- Python: `pyright`
- Secrets scan: `gitleaks`

### 5.2 CI (GitHub Actions, required for PR merge)
- All pre-commit checks rerun.
- Full test suites: Vitest, pytest, Playwright (headless).
- Coverage threshold: **80 % global**, **100 % on calculation logic** (`src/lib/calculations/`, `app/domain/calculations.py`).
- `next build` succeeds.
- Python service starts (`uvicorn` boots, `/health` returns 200).
- Both Docker images build successfully.
- Prisma migrations apply cleanly against a fresh test database.

A failing gate is **never** a reason to disable, skip, `@ts-ignore`, or otherwise sidestep the check. Failing gates are pause-triggers (§7).

---

## 6. Allowed actions — no need to ask

You may do these in any autonomous run without prompting:

- Create your own branches following the naming convention.
- Add, edit, and remove code within existing modules.
- **Add new modules / routes / components / hooks / utilities / npm scripts** as long as they fit the established feature structure and serve a task that exists in `SPEC.md` or `TASKS.md`.
- Add new constants and enum values.
- Run tests, linters, formatters, type-checkers locally.
- Run local builds.
- Design and apply Prisma migrations **against the local development database only** (`prisma migrate dev`).
- Use `npm install` / `pip install` for packages **already listed in `package.json` / `requirements.txt`**.
- Update `README.md`, `SPEC.md` (only for clarifications, not for scope changes), `DECISIONS.md`, and inline doc comments.
- Read logs and debug output.
- Refactor public APIs as long as the SPEC-described behaviour and all tests stay green.
- Structure logs and choose log levels.
- Commit (Conventional Commits) and push to **non-`main`** branches.
- Open pull requests (but do not merge them yourself).
- Leave `TODO(claude):` markers where something is genuinely unclear — then continue.

---

## 7. Pause-triggers — STOP and ask the user

Finish what you are mid-write cleanly, write a recap into `DECISIONS.md`, then ask. Do **not** proceed past any of these without an explicit go:

1. **New dependencies** — anything that would touch `package.json` `dependencies`/`devDependencies` or `requirements.txt` and isn't already there.
2. **Risky schema changes** — renaming, dropping, retyping existing columns; anything that could lose data. Adding new tables or new nullable columns is allowed.
3. **Authentication / security logic changes** — password hashing, session handling, role checks, lockout logic, CSRF, CSP.
4. **UI / UX changes that visibly change layout, colours, typography, or component anatomy** beyond the design tokens in `SPEC.md` §8.
5. **Breaking API changes** — response shape changes on any exposed endpoint.
6. **External API integrations** — any new outbound HTTP to a third party (weather, PV-Sol, AI, etc.).
7. **Anything money-related** — pricing, lease amounts beyond the documented formula, real-money calculations whose output is shown to a customer.
8. **Production deployment** — never auto-deploy to production.
9. **Production database migrations** — never run `prisma migrate deploy` against a non-local target.
10. **Major architectural decisions** — switching SSR/CSR mode, adding background-job system, caching layer, queues, new datastore, etc.
11. **DSGVO-relevant changes** — touching personal-data fields, retention logic, audit-log behaviour.
12. **Spec conflict** — your read of `SPEC.md` and the user's instruction contradict.

When you pause: write what you did, what you would do next, and the specific question you need answered, into the current PR description and into `DECISIONS.md`.

---

## 8. Forbidden — NEVER do these

These are hard `deny` lines. No "but the user said so in this session" override — if the user really wants one of these, they will have to do it themselves outside the agent.

1. `git push --force` or `--force-with-lease` on any branch.
2. Commit or push directly to `main`.
3. Delete or rename `main`.
4. `git reset --hard` without an explicit instruction in the current message.
5. `rm -rf` on anything outside the repository working directory, on the repo root itself, or on any unknown path.
6. Run migrations against the production database.
7. Read, copy, dump or otherwise touch production data.
8. Commit any real secret, API key, or password into the repository — including into `.env.example` (placeholders only there).
9. Commit `.env` or any other concrete `.env.*` file.
10. Trigger a production deployment (no `docker compose up` against the prod VM, no SSH into production).
11. Bypass branch-protection rules via admin override.
12. Disable or skip tests (`.skip`, `xit`, `pytest.mark.skip` …) to make a build green.
13. Use `@ts-ignore`, `@ts-expect-error`, `any`, `# type: ignore`, or equivalent to silence type errors instead of fixing them.
14. Modify the project licence.
15. Call third-party webhooks/integrations that produce real-world side effects (customer email, payments, SMS).
16. Run anything as `sudo`.

If a forbidden action genuinely seems like the right move, **stop and surface it** as a pause-trigger.

---

## 9. Design system

Tokens (Tailwind + CSS variables):

```
--color-forest-green: #2D473E   /* dark headlines, brand accent */
--color-plant-green:  #6A8F4E   /* primary */
--color-muted-lime:   #B2D082   /* secondary, hover, accent backgrounds */
--color-background:   #FFFFFF
--color-foreground:   #000000
--color-link:         #CC3366
```

Typography: **Gabarito Semibold** for headings, **Gabarito Regular** for body. Load via `next/font/google` or self-host.

Visual language: modern, white-canvas SaaS. Clear hierarchy, generous whitespace, restrained use of accent colours, no heavy drop-shadows. Within these tokens and this language you have freedom; outside of it, pause-trigger §7.4.

---

## 10. Auto-mode profile

- **Profile:** Balanced.
- **Budget per autonomous run:** **2 hours wall-clock OR 500 000 tokens, whichever comes first**, then stop and recap.
- **Stagnation stop:** if three test runs in a row fail without progress, or the same file is rewritten more than five times without convergence, stop and recap.
- **Uncertainty:** make the best assumption that doesn't trip any pause-trigger or forbidden action, record it in `DECISIONS.md`, continue, and surface every recorded assumption in the run's final recap.
- **Hard stops** regardless of profile: pause-triggers (§7), forbidden actions (§8), DSGVO, auth, pricing.

---

## 11. Working with `DECISIONS.md`

Create the file the first time you need it. Each entry:

```markdown
## YYYY-MM-DD — <short topic>
**Context:** what triggered the decision
**Assumption / decision:** what you decided to do
**Affected files:** list
**Open question for the user:** if any (else "—")
```

Surface all entries from a run in the run's final recap and in the PR description.

---

## 12. Subagents

This repository defines four subagents in `.claude/agents/`:

- **`planner`** — turns a feature request into a structured task list for `TASKS.md`.
- **`implementer`** — writes the actual production code following these rules.
- **`test-writer`** — writes Vitest / Playwright / pytest coverage for new or changed code.
- **`reviewer`** — read-only audit against `SPEC.md` and this file.

Use them when the task profile fits; do not invoke them for trivial single-file edits.

---

## 13. Cheat sheet

```
ALWAYS read SPEC.md + CLAUDE.md + TASKS.md before acting.
ALWAYS commit on a feature branch with Conventional Commits.
ALWAYS run the pre-commit gates before pushing.
ALWAYS prefer "pause and ask" over a guess that crosses §7.
ALWAYS prefer "decide and document in DECISIONS.md" over "ask" for taste-level work (see §14).
NEVER bypass §8.
```

---

## 14. Decision discipline — taste-level vs. pause-trigger

> This section sharpens §10. Read it on every session boot.

### 14.1 The principle

The Balanced auto-mode profile (§10) commits you to: *"make the best assumption that doesn't trip any pause-trigger or forbidden action, record it in `DECISIONS.md`, continue."*

That principle is **binding**. Stopping every five minutes to ask the user about taste-level configuration is **a violation of §10, not adherence to it.** The single test before pausing is:

> **Does this decision touch §7 (pause-triggers) or §8 (forbidden)?**
> — If no → decide and document.
> — If yes → pause and ask.

The user has explicitly opted out of being consulted on taste-level micro-decisions. Respect that by not asking.

### 14.2 Decide-and-document by default — no user prompt

These categories are taste-level and **never warrant a user prompt**. Pick the modern, idiomatic default for the chosen tool, write one line into `DECISIONS.md`, continue:

- **Plugin selection within an already-approved framework** — which Tailwind plugins, which ESLint plugins, which Prettier add-ons, which Vitest reporter, which pytest plugins. The framework itself is approved; bundled plugins within it are execution detail.
- **Font / asset loading mechanism** — self-hosted vs. CDN, asset placement in `public/`, image optimisation settings, favicon variants. SPEC §8.2 names "self-hosted preferred" — go with that without asking.
- **Configuration file format** — `.prettierrc` vs. `prettier.config.mjs`, `eslintrc.cjs` vs. `eslint.config.mjs`, `pyproject.toml` vs. `setup.cfg`, `requirements.txt` vs. `requirements.in` + `uv.lock`. Pick the modern default.
- **Lockfile / dependency-resolution details** — `package-lock.json` vs. `npm-shrinkwrap`, accepted audit advisories that would only resolve via downgrading an already-approved dependency, peer-dep version pin choices.
- **Docker base image variants** — `node:24-alpine` vs. `node:24-slim` vs. `node:24-bookworm`. Pick the smallest viable that still has the libc / build tools needed (e.g., LibreOffice requires non-alpine; Next.js standalone works on alpine).
- **Port numbers, cron expressions, log formats, default test timeouts, Vitest pool size, Playwright workers** — pick sensible defaults aligned with the SPEC's performance budget; document if non-obvious.
- **Stub content and placeholder routes** — placeholder text, demo paths, example values used only to prove plumbing during bootstrap.
- **Test scaffolding** — config file location, fixture folder layout, mock helpers. The *coverage thresholds* in §5.2 are non-negotiable; the *file layout* to achieve them is taste.
- **Bundler / compiler defaults shipped by the scaffolder** — keep what `create-next-app` produces (Turbopack, SWC, default tsconfig `target`) unless §7 fires.
- **Conventional-commit type / scope subtleties** — `chore` vs. `build` vs. `ci` for tooling commits, scope naming for cross-cutting changes. Pick one consistently, don't deliberate per commit.
- **CI workflow step ordering, caching strategy, matrix sparsity** — implementation detail of "GitHub Actions runs the gates". Optimise for cache hit-rate and total wall-clock, document only the non-obvious choices.
- **Husky / lint-staged glob patterns**, **gitleaks rule selection**, **Prisma seed script structure**, **i18n key naming conventions** — taste.

For each silent decision, append to `DECISIONS.md`:

```
## YYYY-MM-DD — <topic>
**Decision:** <what was chosen> over <alternative>. Reason: <one sentence>.
```

No mention in the PR description needed unless the choice will cascade into a later task.

### 14.3 Still ask — §7 pause-triggers do not soften

§7 remains binding word for word. Specifically:

- A **new top-level dependency with its own purpose** (e.g., adding `bullmq` for queues, `socket.io` for realtime, `sharp` if not already present) is still a pause-trigger. Adding a **plugin of an already-approved framework** (`@tailwindcss/forms` next to `tailwindcss`) is **not**.
- **Auth, password handling, session, lockout, CSRF, CSP** — always pause.
- **Schema renames / drops / retypes** on existing columns — always pause. Additive new tables / new nullable columns — proceed.
- **Money, pricing, lease, customer-visible numeric output** — always pause.
- **Outbound HTTP to a third party** (Google Fonts at runtime, PV-Sol API, weather APIs, AI providers) — always pause. *Build-time-only outbound (fetching package tarballs, downloading fonts to commit them) is not "third-party integration" — it is "package management".*
- **DSGVO-relevant changes** — fields, retention, audit log — always pause.
- **Architectural pivots** — SSR↔CSR mode, adding queues / caching layer / new datastore, replacing the Python service — always pause.
- **Spec / instruction conflict** — always pause.

### 14.4 The smell test

Before raising a question to the user, apply this test:

> *"If the user knew nothing about this decision and saw the resulting PR, would they want their time spent reading 80 lines of dialog about it — or would they say 'sensible default, move on'?"*
>
> If "move on" → **decide and document.**
> If "I have an opinion here" → **pause and ask.**

When the doubt is genuine, pause. But the doubt must be real, not procedural — "I'm following our process by asking" is **not** real doubt, it is process theatre. The process *is* to decide and document for taste-level work.

### 14.5 Recap obligation

At the end of every autonomous run, list every `DECISIONS.md` entry created during the run in the PR description under a `### Decisions taken` heading. The user reviews them as a batch — not as 20 interruptions.
