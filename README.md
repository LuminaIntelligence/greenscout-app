# GreenScout — Machbarkeitsstudien-Webanwendung

Internal web tool for GreenScout e.V. consultants to capture PV feasibility-study inputs and generate a customer-ready PowerPoint + PDF in the established GreenScout layout.

> **This repository is built and maintained by Claude Code** in *Balanced* auto-mode. Human reviews every PR before merge.
> The contracts live in `SPEC.md` and `CLAUDE.md` — read them before you touch anything.

---

## Stack at a glance

| Layer | Tech |
|---|---|
| Frontend & light API | Next.js 15 (App Router) + React 19 + TypeScript `strict` |
| UI | Tailwind + shadcn/ui + Gabarito (Google Fonts) |
| Forms | react-hook-form + zod |
| Data | PostgreSQL + Prisma |
| Auth | Auth.js v5 (Credentials provider) |
| Heavy lift | Python 3.12 + FastAPI + `python-pptx` + headless LibreOffice |
| Orchestration | Docker Compose on a Hetzner VPS |
| CI | GitHub Actions |

Full architecture in `SPEC.md` §7. Pinned versions and conventions in `CLAUDE.md` §2.

---

## Day-zero setup (human)

1. Install prerequisites on your dev machine:
   - Node.js 20 LTS, `npm`
   - Python 3.12 + `pip` + `venv`
   - Docker + Docker Compose
   - LibreOffice **only required on the dev machine if you want to render PDFs outside the container** — in normal dev you go through the Python service.
2. Copy `.env.example` → `.env` and fill the placeholders.
3. `docker compose up -d postgres` to bring the DB up.
4. `npx prisma migrate dev` to create the schema.
5. `npm install` then `npm run dev` for the Next.js side.
6. In a second terminal:
   - `cd python-service && python -m venv .venv && source .venv/bin/activate`
   - `pip install -r requirements.txt`
   - `uvicorn app.main:app --reload --port 8000`
7. Visit `http://localhost:3000`. First admin login is created via the seed script (see `prisma/seed.ts`, run with `npx prisma db seed`).

---

## Day-to-day with Claude Code

1. `claude` in the repo root.
2. Claude reads `SPEC.md`, `CLAUDE.md`, `TASKS.md`, and `DECISIONS.md` on session start (boot-sequence hook in `.claude/hooks.json`).
3. Give Claude a task ID or a feature description.
4. The planner subagent breaks scope into atomic tasks.
5. The implementer subagent ships one task per PR.
6. The test-writer fills coverage gaps.
7. The reviewer audits before you merge.

### Subagents

```
.claude/agents/planner.md      → /agent planner
.claude/agents/implementer.md  → /agent implementer
.claude/agents/test-writer.md  → /agent test-writer
.claude/agents/reviewer.md     → /agent reviewer
```

### Auto-mode profile

- **Balanced.** 2 hours wall-clock OR 500 000 tokens per run.
- Self-stops on stagnation (3 consecutive failed test runs / 5 rewrites of the same file).
- On uncertainty: records the assumption in `DECISIONS.md`, continues, recaps at end.
- Hard-stops on auth, pricing, DSGVO, production targets, scope conflicts.

Tweak in `.claude/settings.json` under `autoMode`.

---

## Quality gates

Local pre-commit (via `husky` + `lint-staged` + `pre-commit`):
- `tsc --noEmit`
- ESLint `--max-warnings 0`
- Prettier `--check`
- `ruff check && ruff format --check`
- `pyright`
- `gitleaks` secrets scan

CI (GitHub Actions, required for PR merge):
- All pre-commit checks
- Full Vitest, pytest, Playwright runs
- Coverage threshold (80 % global, **100 %** on calculation logic)
- `next build` + Python service boot
- Both Docker images build
- Prisma migrations apply against a fresh test DB

---

## Important files

| Path | Why it matters |
|---|---|
| `SPEC.md` | The contract — what we are building, with what data, in what visual language. |
| `CLAUDE.md` | The agent operating rules — conventions, allowed/pause/forbidden actions. |
| `TASKS.md` | The backlog — implementers pull from here. |
| `DECISIONS.md` | Assumption log — anything an agent decided without explicit user approval. |
| `.claude/settings.json` | Permissions, auto-mode profile, subagent registry. |
| `.claude/hooks.json` | Lifecycle hooks (post-edit lint, pre-commit gates, session-start reminder). |
| `.env.example` | Variables you must populate locally and in CI/production. |
| `templates/` | PPTX template + GreenScout logo assets, copied from the original deliverables. |

---

## Branching

GitHub Flow.
- `main` is always deployable.
- Feature branches: `feat/<short-name>` / `fix/...` / `chore/...` / `refactor/...` / `docs/...`.
- One task per PR.
- Conventional Commits.
- No direct pushes to `main`. No force pushes anywhere.

---

## Deployment

Production lives on a Hetzner VPS via `docker-compose.yml` + `docker-compose.prod.yml`. Production deploys are a manual human action — Claude Code is forbidden from touching production targets (`CLAUDE.md` §8).

---

## License

Internal — to be set by GreenScout e.V.
