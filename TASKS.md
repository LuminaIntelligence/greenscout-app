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

— none yet; run the planner on `SPEC.md` to seed the initial backlog —

---

## Suggested first-run prompt for the planner

> *"Read `SPEC.md` and `CLAUDE.md`. Seed `TASKS.md` with the initial backlog needed to ship the MVP described in `SPEC.md` §2.1. Group tasks into vertical slices: project bootstrap → data model + Prisma → auth → customers CRUD → studies CRUD → image upload → calculation logic (TS+Py mirror) → Python service + PPTX template wiring → PDF rendering → document history → admin user management → SMTP settings → audit log → retention cron → polish. Surface anticipated pause-triggers. Stop after seeding — do not implement."*

---

## Recently completed
*(implementer / reviewer move tasks here once merged. Newest first.)*

— none yet —
