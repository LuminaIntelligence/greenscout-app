# DECISIONS.md — Recorded assumptions & user-confirmed choices

> Each entry follows the template in `CLAUDE.md` §11. Newest at the bottom.
> Entries flagged **(user-confirmed)** were explicitly green-lit by the user; entries without that flag are agent assumptions that must be surfaced in the next recap.

---

## 2026-05-19 — Password hashing algorithm & parameters (user-confirmed)
**Context:** SPEC §4.1 left the password hash open ("argon2 preferred — confirm in implementation phase"); §6.3 proposed argon2id with `memoryCost=19 MiB`, `timeCost=2`, `parallelism=1`.
**Assumption / decision:** Use **argon2id** with the §6.3 parameters as the starting baseline. Wrap them as named constants in a dedicated `src/features/auth/password-policy.ts` (and a mirror in the Python service if ever needed) so they can be overridden via environment variables later **without code changes**.
**Affected files:** `src/features/auth/password-policy.ts`, `prisma/schema.prisma` (`User.passwordHash`), `.env.example`.
**Open question for the user:** —

---

## 2026-05-19 — CO₂ Mischwald-Faktor provisional (user-confirmed)
**Context:** SPEC §4.7 lists `1 t CO₂ ≈ 0,0177 ha managed mixed forest sequestration per year` with the note "≈ to be confirmed".
**Assumption / decision:** Treat the value as **provisional**. Put it into both `src/lib/calculations/constants.ts` and `app/domain/constants.py` with the inline marker `// PROVISIONAL — value pending GreenScout confirmation, see docs/calc-sources.md` (and `# PROVISIONAL …` in Python). Create `docs/calc-sources.md` as a living register of every physical constant with source + Stand date. Tests assert that the constant is *referenced* (not its numeric value), so a future correction stays a one-liner.
**Affected files:** `src/lib/calculations/constants.ts`, `app/domain/constants.py`, `docs/calc-sources.md`, `src/lib/calculations/*.test.ts`, `app/domain/test_calculations.py`.
**Open question for the user:** —

---

## 2026-05-19 — Admin account provisioning via seed (user-confirmed)
**Context:** SPEC §3.2 specifies a single dedicated admin (`consulting@lumina-intelligence.ai`); SPEC §4.1 requires forced password change on first login.
**Assumption / decision:** Provision the admin via `prisma db seed`. Read credentials from environment variables **`SEED_ADMIN_EMAIL`** and **`SEED_ADMIN_TEMP_PASSWORD`** (names must match `.env.example` exactly — do **not** use `INITIAL_ADMIN_PASSWORD` or similar variants). The seed must be **idempotent**: if the admin already exists, do nothing — never trigger a reset, never overwrite the password, never re-set `mustChangePassword`.
**Affected files:** `prisma/seed.ts`, `.env.example`, `package.json` (`prisma.seed` script).
**Open question for the user:** —

---

## 2026-05-19 — SMTP password encryption: AES-256-GCM (user-confirmed)
**Context:** SPEC §6.3 mandates encrypted SMTP secret in `Setting.value`; algorithm + key handling were open.
**Assumption / decision:** **AES-256-GCM** with the symmetric key read from environment variable **`SETTINGS_ENCRYPTION_KEY`** (32 bytes, base64-encoded). Per encrypted entry: a fresh **12-byte random nonce**; storage format `base64(nonce) || base64(ciphertext) || base64(tag)` joined by `|`. Key rotation is **out of scope for MVP** — add a V2 backlog entry "Key-Rotation für `SETTINGS_ENCRYPTION_KEY`" that, when picked up, introduces a versioned `encryption_key_version` column on `Setting`.
**Affected files:** `src/features/settings/crypto.ts` (encrypt/decrypt), `prisma/schema.prisma` (no schema change in MVP), `.env.example`.
**Open question for the user:** —

---

## 2026-05-19 — Wizard step layout fixed (user-confirmed)
**Context:** SPEC §4.5 lists study input fields but does not prescribe their wizard grouping. Single-page layout is also available per user preference (`User.formPreference`).
**Assumption / decision:** Fix the wizard to **eight steps** (single-page view shows the same as anchored sections):
1. Kunde
2. Objekt & Flurstück
3. PV-Inputs (anlageKwp, pvErzeugung, pvEigenverbrauch, pvVerkauf, Verbrauch, Versorgerpreis, Pacht€/kWp, Vertragslaufzeit)
4. Modul-/Anlagenspezifikation (Modulanzahl, Modulfläche m², Eigenverbrauchsquote %, Netzeinspeisung kWh/Jahr)
5. Sensitivitätsanalyse (`szenarioPreis1/2/3` mit Defaults **35 / 40 / 45 ct/kWh**)
6. Termine (Slide 19 — `terminVorschlag1/2`)
7. Bilder (BEFORE, AFTER)
8. Review & Speichern
Avoid vague `TODO(claude):` markers in this area — the planner must commit to this layout.
**Affected files:** `src/features/studies/components/study-wizard/*`, `src/features/studies/components/study-single-page/*`, `src/features/studies/schemas/*` (zod step-level subschemas).
**Open question for the user:** —

---

## 2026-05-19 — PPTX placeholder discovery flow (user-confirmed)
**Context:** SPEC §4.8 mandates `{{snake_case_key}}` placeholders in the template, but the existing `templates/Machbarkeitsstudie-PV-Template_v1_6.pptx` still has the red literal values, not placeholders.
**Assumption / decision:** Implementer subagent produces a **`docs/pptx-mapping.md`** with a three-column table `Slide-Nr | Original-Text | vorgeschlagener Key`. The user reviews and corrects the ~10 semantically tricky cases (e.g. identical numeric values appearing on different slides with different meanings, like the `24.600 €` example). After user sign-off in that file, the implementer writes the placeholders into the PPTX. The mapping doc is the canonical contract between the form fields and the template.
**Affected files:** `docs/pptx-mapping.md`, `templates/Machbarkeitsstudie-PV-Template_v1_6.pptx` (placeholder edit pass), `app/services/pptx_generator.py`.
**Pause-trigger anticipated:** None for the mapping doc itself; the template edit pass is a manual review checkpoint, not silent scope creep.
**Open question for the user:** —

---

## 2026-05-19 — PV-Sol upload deferred to Phase 3 (user-confirmed)
**Context:** SPEC §2.3 explicitly places PV-Sol integration in Phase 3; SPEC §4.5 keeps Modulanzahl/Modulfläche/Eigenverbrauchsquote/Netzeinspeisung as manual numeric fields in MVP.
**Assumption / decision:** MVP has **only manual numeric fields** for PV-Sol-derived values — no upload widget, no PDF/CSV parsing. If during implementation a "small optional upload" idea surfaces, it is a Pause-Trigger §7.6 (external integration) and must be explicitly approved before any code is written. Planner adds a **`## Future (Phase 3)`** section to `TASKS.md` and parks "PV-Sol-Output-Upload (PDF/CSV)" there without seeding implementation tasks.
**Affected files:** `TASKS.md` (Future section).
**Open question for the user:** —

---

## 2026-05-19 — Retention cron via APScheduler inside the Python service (user-confirmed)
**Context:** SPEC §6.1 requires a daily retention check with 60/30/7-day pre-deletion notices and admin-confirmed hard-delete only.
**Assumption / decision:** Use **APScheduler** with an **in-memory trigger** inside the existing FastAPI Python service. Rationale: a 10-user single-tenant tool does not warrant a separate scheduler container; an extra image would complicate `docker-compose.yml` without benefit. Daily job:
- Query studies whose `createdAt + 10 years` falls within `[now, now + 60 days]`.
- For 60 / 30 / 7-day marks: write a `RETENTION_NOTICE` `AuditLog` entry **and** an in-app notification for the admin.
- **Never** auto-delete — hard-delete is only triggered by an admin action in the UI (separate DSGVO workflow).

V2 backlog entry: switch APScheduler to a persistent `SQLAlchemyJobStore` so jobs survive container restarts and missed-fire policies become explicit.
**Affected files:** `app/services/retention.py`, `app/main.py` (scheduler lifecycle), `app/api/notifications.py`, `src/features/audit/*` (admin UI of `RETENTION_NOTICE` entries).
**Open question for the user:** —

---

## 2026-05-19 — T-001 dependency set + scaffolding path approved (user-confirmed)
**Context:** T-001 (Initialise Next.js 15 + TypeScript strict workspace) triggers CLAUDE.md §7.1 because the repository currently has no `package.json`. Two paths were presented (`create-next-app` vs. manual scaffold). All other slices keep their own per-slice §7.1 approvals — this entry is scoped to T-001 only.
**Assumption / decision:** Use **`npx create-next-app@latest`** with flags `--typescript --eslint --app --src-dir --import-alias "@/*" --no-tailwind --use-npm`. Approved package set landing in `package.json` (versions resolved by create-next-app):

- `dependencies`: `next` (^15), `react` (^19), `react-dom` (^19)
- `devDependencies`: `typescript` (^5), `@types/node`, `@types/react`, `@types/react-dom`, `eslint` (^9), `eslint-config-next` (^15)

Tailwind, shadcn, Prettier, Husky, Vitest, Playwright, Prisma, Auth.js etc. are explicitly **not** part of T-001 — they belong to later tasks (T-002, T-003, T-004, T-005, …) and will each get their own §7.1 approval at that point.
**Affected files:** `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.mjs`, `eslint.config.mjs` (or `.eslintrc.json`), `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `.gitignore`, `.editorconfig`, `.nvmrc`.
**Open question for the user:** —

---

## 2026-05-19 — T-001 post-implementation choices (user-confirmed)
**Context:** After the implementer landed T-001 on `chore/init-nextjs-typescript`, three taste-level forks surfaced during the closing review.

**Assumption / decision:**

1. **Node 24 (current).** `.nvmrc` keeps the implementer-detected `24`. README.md updated: line 30 changed from `Node.js 20 LTS, npm` to `Node.js 24 (current — matches .nvmrc), npm`. Future task T-007 (Docker Compose) and T-008 (GitHub Actions CI) **must** pin `node:24-alpine` / `actions/setup-node@v4` with `node-version: 24`. Node 24 is not yet LTS (LTS-Promotion expected Oct 2025) — re-evaluate this pin when CI starts failing on a Node 24 ecosystem regression.
2. **Turbopack kept as the default bundler.** `package.json` scripts remain `next dev --turbopack` and `next build --turbopack`. Marked stable in Next 15; build already passed once. If a later slice (T-002 Tailwind, T-009 Prisma, T-029 image pipeline) hits an incompatibility, remove the flags — that is itself a small documented decision, not a rollback of this entry.
3. **`@eslint/eslintrc ^3` and the transitive `postcss <8.5.10` audit advisory** are accepted as in-scope of the approved scaffold. `npm audit fix --force` is forbidden in MVP because it would downgrade Next to v9. Revisit when Next ships a 15.5.19+ patch that pulls a clean `postcss`.

**Affected files:** `README.md` (line 30), `.nvmrc` (unchanged at `24`), `package.json` (unchanged — turbopack scripts as scaffolded), no other.
**Open question for the user:** —

---

## 2026-05-19 — T-002 dependency set + Gabarito font strategy (user-confirmed)
**Context:** T-002 (Configure Tailwind 3 + design tokens + Gabarito font) triggers CLAUDE.md §7.1 because no Tailwind/PostCSS packages exist yet. Two forks were resolved up-front: which Tailwind plugin set to pull in, and how to load Gabarito.

**Assumption / decision:**

1. **Tailwind dependency set (devDependencies only):**
   - `tailwindcss` (^3) — SPEC §2 explicit Tailwind 3.x pin (not v4).
   - `postcss` (^8) — Tailwind 3 PostCSS pipeline.
   - `autoprefixer` (^10) — vendor-prefix coverage.
   - `tailwindcss-animate` (^1) — **pre-installed for T-003 shadcn/ui**, since shadcn requires it. Avoids a separate §7.1 hit in T-003 for this specific package.
   - **Excluded:** `@tailwindcss/forms`, `@tailwindcss/typography`, `clsx`, `tailwind-merge`. Each will get its own §7.1 surfacing when (if) a future task needs it. shadcn-CLI itself will still pause-trigger in T-003.

2. **Gabarito font: self-hosted via `next/font/local`** (SPEC §8.2 "preferred for offline / air-gapped resilience"). Two weights only:
   - **Regular (400)** for body text
   - **SemiBold (600)** for headings
   - Files committed to `public/fonts/` as **WOFF2** (smallest modern format with universal browser support). Both subsets: `latin` (German diacritics covered). No need for `latin-ext`, no Greek/Cyrillic — German-only MVP.
   - Source: Google Fonts (Gabarito is OFL-licensed, redistribution permitted; include `OFL.txt` alongside the font files at `public/fonts/OFL.txt` to satisfy the licence's attribution requirement).
   - Loaded via `next/font/local` in `src/app/layout.tsx`; `display: 'swap'` to avoid FOIT. Expose two CSS variables (`--font-gabarito-body`, `--font-gabarito-heading`) so Tailwind theme can reference them.

**Affected files:** `package.json`, `package-lock.json`, `tailwind.config.ts`, `postcss.config.mjs`, `src/app/globals.css`, `src/app/layout.tsx`, `public/fonts/gabarito-regular.woff2`, `public/fonts/gabarito-semibold.woff2`, `public/fonts/OFL.txt`.
**Open question for the user:** —
