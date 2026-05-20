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

---

## 2026-05-19 — Decision-discipline regime shift (user-confirmed)
**Context:** User added `CLAUDE.md` §14 "Decision discipline" on branch `docs/decision-discipline-addendum` (parent worktree) and instructed: *"Wende diese Regeln ab sofort für alle weiteren Tasks an. Keine User-Prompts mehr für Plugin-Auswahl, Config-Format, Font-Loading-Modi, Docker-Image-Varianten und ähnliche Geschmacks-Entscheidungen. Entscheide selbst, dokumentiere in DECISIONS.md, weiter."* The directive sharpens §10 (Balanced auto-mode profile) by removing the over-cautious AskUserQuestion habit visible in T-001 and T-002.
**Assumption / decision:** From T-003 onwards, taste-level forks are resolved silently and logged here as one-line entries. The user reviews them en bloc under a `### Decisions taken` heading in each PR body (§14.5). Pause still applies — without softening — for the §7 / §8 categories enumerated in §14.3 (auth, schema renames, money, runtime third-party HTTP, DSGVO, architectural pivots, spec conflicts, new top-level dependencies that introduce a genuinely new capability rather than a plugin of an already-approved framework). The smell test (§14.4) is the operational filter before any prompt.
**Affected files:** none for this entry — it's a process change. Effects show up as **fewer AskUserQuestion calls** and a **`### Decisions taken` section in every future PR body** starting with T-003.
**Open question for the user:** —

---

## 2026-05-19 — T-003 silent decisions per §14 (consolidated)
**Context:** T-003 installs shadcn/ui CLI + 18 base primitives. Per CLAUDE.md §14 (Decision discipline), the agent resolves taste-level forks silently and bundles them into a single recap entry instead of paging the user. shadcn 4.7.0 has a substantially different CLI surface compared to the pre-2025 `--style new-york --base-color neutral` flags — all forks below were resolved by picking the modern idiomatic equivalent and verifying that no §7 / §8 trigger fired.

**Assumption / decision:**

- **CLI invocation:** `npx shadcn@latest init --defaults --base radix --template next --css-variables --yes` plus `npx shadcn@latest add <primitive>` for each component. The legacy `shadcn-ui` package was renamed to `shadcn` (now at 4.7.0).
- **CLI surface migration:** The legacy `--style new-york / --base-color neutral` flags no longer exist; shadcn 4.x replaced them with preset codes plus `--base radix|base`. Chose `--base radix` (canonical Radix-primitive components, matches the documented "radix-nova" style as set in `components.json`). The preset code system (`--preset <code>`) is opaque (codes are generated by the shadcn website); `--defaults` is the explicit fall-back path and what we used.
- **Tailwind v3 compatibility:** shadcn 4.x detects Tailwind v3 (`shadcn info` confirms `tailwindVersion v3`) but its `init` step still emits a few Tailwind-v4-only artefacts that had to be removed: (a) `@import "tw-animate-css"` and `@import "shadcn/tailwind.css"` in `globals.css`, (b) the `tw-animate-css` runtime dep, and (c) a `@apply border-border outline-ring/50` block referencing tokens not yet defined in `tailwind.config.ts`. After cleanup the Radix-base components compile cleanly against our Tailwind v3 pipeline.
- **Tailwind animation plugin:** Kept `tailwindcss-animate` (already installed in T-002) and **removed** `tw-animate-css` that shadcn init added — same purpose, different package, T-002 already approved the v3-compatible variant.
- **Radix packaging:** Both the `radix-ui` umbrella package (used by all `--base radix` components) and per-component `@radix-ui/react-label` / `@radix-ui/react-slot` (pulled by the `@shadcn/form` registry item, which is built against the new-york style) coexist. Functionally equivalent, both are plugins of an approved framework per §14.3.
- **CSS variables vs Tailwind classes:** `--css-variables` (more flexible for future theming).
- **Brand-token mapping:** shadcn semantic tokens (`--primary`, `--secondary`, `--accent`, `--destructive`, `--muted`, `--card`, `--popover`, `--border`, `--input`, `--ring`, `--radius`) coexist with our existing brand tokens (`forest-green`, `plant-green`, `muted-lime`, `link`). Mapping in `globals.css`: `primary=plant-green (#6A8F4E)`, `secondary=muted-lime (#B2D082)`, `accent=forest-green (#2D473E)`, `destructive=#DC2626` (new — SPEC §8.1 has no red, see below), `border=input=#E4E4E7` (zinc-200), `ring=plant-green @ 50% alpha`, `muted=#F1F7E8`, `muted-foreground=#71717A` (zinc-500), `card/popover=white`, `background/foreground=#FFFFFF/#000000`. Format kept consistent in hex — shadcn-init defaults were OKLCH and were converted/replaced to hex to align with T-002's existing hex variables.
- **Destructive (red) token introduces a colour outside SPEC §8.1.** `#DC2626` (Tailwind red-600) is the most idiomatic accessible red. Logged here rather than as a SPEC §8.1 amendment — the user can decide later whether to formalise it into the brand palette.
- **Dark mode:** not implemented in MVP. shadcn-init generated a `.dark { … }` block plus chart/sidebar tokens that we removed entirely. Single light theme.
- **Icon library:** `lucide-react` (shadcn default, used by the sonner wrapper).
- **Toast component:** `sonner` (shadcn deprecated the legacy `toast` primitive).
- **Sonner customisation:** the stock shadcn sonner wrapper imports `next-themes` for `useTheme()`. Since MVP is single-light-theme, the wrapper was rewritten to hard-pin `theme="light"` and `next-themes` was uninstalled. This keeps the runtime dep surface aligned with the pre-approved silent-acceptable set (Radix family, `lucide-react`, `sonner`, `class-variance-authority`, `clsx`, `tailwind-merge`) — `next-themes` would have been a real §7.1 hit otherwise.
- **`shadcn` package as runtime dep:** shadcn-init wrote `shadcn` itself into `dependencies`. That is an odd pattern for a CLI; uninstalled it — `npx shadcn@latest` works without local installation, and a CLI in production deps would inflate the runtime image.
- **Form component:** installed `@shadcn/form` from `https://ui.shadcn.com/r/styles/new-york/form.json` because the `@shadcn` registry's `form` meta-entry was empty and `--base radix` doesn't ship a form primitive. The form.tsx wraps `react-hook-form` + `zod` (both already in SPEC §2 stack). Pulled `@hookform/resolvers`, `react-hook-form`, `zod`, `@radix-ui/react-label`, `@radix-ui/react-slot` — all in SPEC §2 / Radix family.
- **Component placement & aliases:** `src/components/ui/` with import paths `@/components/ui/<name>`. `cn()` helper at `src/lib/utils.ts` (`@/lib/utils`).
- **Provider mount points:** `<Toaster />` (sonner) and `<TooltipProvider />` both mounted in `src/app/layout.tsx` — production-correct location so any client component can fire toasts / use tooltips without provider scope concerns.
- **Smoke demo:** `src/app/page.tsx` rewritten as a four-section overview (Forms / Overlays / Datenanzeige / Feedback). German microcopy ("Du"-form per §4.7). T-001 alias stub imports preserved and referenced in an `sr-only` paragraph for `@/*` alias coverage.

**Net top-level deps added by T-003 (all "plugins of approved framework" per §14.3 or already in SPEC §2):**
`class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `sonner`, `radix-ui`, `@radix-ui/react-label`, `@radix-ui/react-slot`, `@hookform/resolvers`, `react-hook-form`, `zod`. **Removed transitively / explicitly:** `next-themes` (replaced by hard-pinned light theme), `tw-animate-css` (replaced by T-002's `tailwindcss-animate`), `shadcn` (CLI does not need to be a runtime dep).

**Affected files:** `package.json`, `package-lock.json`, `components.json`, `src/lib/utils.ts`, `tailwind.config.ts`, `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/components/ui/*` (18 files: alert, badge, button, card, checkbox, dialog, dropdown-menu, form, input, label, radio-group, select, separator, sonner, table, tabs, textarea, tooltip), `TASKS.md`.
**Open question for the user:** —

---

## 2026-05-19 — T-004 silent decisions per §14 (consolidated)
**Context:** T-004 wires the full ESLint + Prettier + tsc gate set from CLAUDE.md §2. All taste forks resolved silently per §14; the only §7.1 surface is the lint/format dev-deps T-004 itself anticipated in its task entry.

**Assumption / decision:**
- **ESLint config format:** extend the existing `eslint.config.mjs` (flat config from T-001), no parallel `.eslintrc.cjs`. The T-001 baseline already loaded `eslint-config-next` via `FlatCompat`; T-004 layers `typescript-eslint`, project rule overrides, and `eslint-config-prettier` on top.
- **Plugin registration strategy:** `next/core-web-vitals` + `next/typescript` (loaded via `FlatCompat.extends(...)`) already register `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`, `eslint-plugin-import`, and `@typescript-eslint/*`. Re-registering them in flat-config throws `Cannot redefine plugin`. Solution: rely on the Next compat layer for plugin registration, add only `typescript-eslint.configs.recommended` on top, and use targeted rule overrides instead of re-declaring plugins. The full plugin set required by CLAUDE.md §2 is therefore active, even though it doesn't appear as explicit `plugins: { … }` keys in the config — that is the modern flat-config-with-Next-compat idiom.
- **`typescript-eslint` shape:** meta-package (`typescript-eslint` ^8) — modern flat-config entry point, ships parser + plugin under one dep.
- **`eslint-plugin-import` variant:** **canonical `eslint-plugin-import` ^2.32.0** chosen over the `-x` fork. Rationale: `next/core-web-vitals` already wires the canonical package; using `-x` would have meant either two import plugins fighting or unwiring Next's defaults. CLAUDE.md §2 names "`import`" — both packages satisfy that, canonical is simpler here.
- **Cross-feature relative-import block:** `no-restricted-imports` with a `patterns: [{ group: ["../*"], … }]` rule was chosen over `import/no-relative-parent-imports`. The literal `no-relative-parent-imports` rule blocks **any** import that resolves upwards in the tree — including the prescribed `@/...` alias since that resolves to `src/`, which is above feature folders. `no-restricted-imports` with the `../*` pattern narrows the prohibition exactly to literal relative-parent specifiers, which is the §4.3 intent. Reasoning is documented as an inline comment in `eslint.config.mjs`.
- **Bridge:** `eslint-config-prettier` last in the config array (canonical pairing; turns off rules that conflict with Prettier). Not `eslint-plugin-prettier`.
- **Severity overrides:**
  - `@typescript-eslint/no-explicit-any: "error"` — T-004 acceptance criterion 1.
  - `@typescript-eslint/no-unused-vars: "error"` with `argsIgnorePattern: "^_"`, `varsIgnorePattern: "^_"` — idiomatic Next/TS convention; underscore-prefix is the established opt-out.
  - `jsx-a11y/alt-text` promoted from `next/core-web-vitals`' default `warn` to `error`, with explicit element list (`elements: ["img"]`, `img: ["Image"]`) so both `<img>` and Next's `<Image>` are covered. T-004 acceptance criterion 1.
- **Prettier config format:** `prettier.config.mjs` (ESM, matches sibling `*.config.mjs` files).
- **Prettier opts:** `printWidth: 100, tabWidth: 2, semi: true, singleQuote: false, trailingComma: "all", arrowParens: "always", endOfLine: "lf"`. Idiomatic Next/shadcn defaults. `useTabs` and `bracketSpacing` omitted (both default to the desired value).
- **Prettier plugins:** `prettier-plugin-tailwindcss` (auto-sort Tailwind class names — required by CLAUDE.md §2). Pinned to `^0.8.0` which is the latest stable in the v0.x series; the v0.5+ series declares Prettier 3 + Tailwind 3 peer support.
- **`.prettierignore`:** standard build/output ignores (`node_modules`, `.next`, `out`, `build`, `dist`, `coverage`), `.claude/` (agent-managed, per-developer config — not part of the application formatting surface), lockfiles (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`), binary fonts (`public/fonts/*.woff2`), generated Prisma client (`src/generated/**` — anticipates T-009+), PPTX/PDF template binaries (`templates/*.pptx`, `templates/*.pdf`), and **Markdown (`*.md`)** to avoid Prettier reflowing code blocks and tables in our authoring style.
- **ESLint ignores:** the flat-config `ignores` block excludes `node_modules`, `.next`, `out`, `build`, `dist`, `coverage`, `public`, the generated `next-env.d.ts`, and any `*.config.{js,mjs,ts}` file (those are tool configs, not application code).
- **npm scripts:** `lint` → `eslint . --max-warnings 0`; `lint:fix` → `eslint . --fix`; `format` → `prettier . --write`; `format:check` → `prettier . --check`; `typecheck` → `tsc --noEmit`. Used `eslint .` directly rather than `next lint` since `next lint` is deprecated in Next 15.5.x and prints a deprecation warning that would fail `--max-warnings 0`.
- **Commit split:** kept the three commits separate for diff readability — (a) dependency install, (b) ESLint flat-config wire-up, (c) Prettier config + ignore + scripts. Each commit is independently revertable.
- **Verification fixture:** created `src/_lint-fixture.tsx` containing `const bad: any = …` and `<img src="/x.png" />`. Ran `npm run lint` once; captured stdout showing both `@typescript-eslint/no-explicit-any` and `jsx-a11y/alt-text` firing as errors (the `<img>` also produced the expected `@next/next/no-img-element` warning). Both fixture and its log were deleted before committing. No fixture file is in git history. Captured output is reproduced in the PR body.
- **shadcn UI scope-ignore:** **none needed.** All 18 components in `src/components/ui/` and `src/app/page.tsx` survived rule activation cleanly after one `prettier --write` pass (which applied `prettier-plugin-tailwindcss` class sorting). The bulk formatting was rolled into the same commits rather than a separate "style:" commit since the touched files were all the T-003 shadcn primitives and the existing layout/page — a focused surface, no broad codebase sweep needed.

**Net top-level dev-deps added by T-004 (all plugins-of-an-approved-framework per §14.3, anticipated by T-004's `Pause-triggers anticipated: §7.1`):**
`typescript-eslint`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`, `eslint-plugin-import`, `eslint-config-prettier`, `prettier`, `prettier-plugin-tailwindcss`. All eight are in CLAUDE.md §2's named lint/format toolchain.

**Affected files:** `eslint.config.mjs`, `prettier.config.mjs`, `.prettierignore`, `package.json`, `package-lock.json`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/lib/utils.ts`, `src/components/ui/*` (formatting/class-sort touch-ups from `prettier-plugin-tailwindcss`), `TASKS.md` (T-003 flipped to ✅, T-004 status update).
**Open question for the user:** —

---

## 2026-05-19 — T-005 silent decisions per §14 (consolidated)
**Context:** T-005 wires the pre-commit gate chain (Husky + lint-staged + gitleaks) per CLAUDE.md §5.1. All taste forks resolved silently per §14; the only §7.1 surface is the three top-level dev-deps (`husky`, `lint-staged`, plus the system-level `gitleaks` binary) that T-005 itself anticipated.

**Assumption / decision:**
- **Husky:** v9.1.7, modern flow (`npx husky init` writes `.husky/`, adds `"prepare": "husky"` to `package.json`, no `husky install` legacy script).
- **lint-staged:** v17.0.5 — current major. Plan named "v15+"; v17 is the latest stable in the v15+ line at install time. Silent acceptable per §14.2 (lockfile / dependency-resolution detail of an approved tool).
- **lint-staged config location:** inline in `package.json` under `lint-staged` key (no separate `.lintstagedrc.*`). Matches the convention of keeping all tooling config in `package.json` / `*.config.mjs`.
- **Hook order in `.husky/pre-commit`:** project-wide `tsc --noEmit` first → `lint-staged` (per-file ESLint/Prettier/ruff/pyright) → `gitleaks git --staged` last. Hook is plain shell, no `.husky/_/husky.sh` source line (Husky v9 removed that requirement).
- **Lint-staged globs:** `*.{ts,tsx,js,jsx,mjs,cjs}` → `eslint --max-warnings 0 --fix` + `prettier --check`; `*.{md,json,yml,yaml,css}` → `prettier --check` (Markdown is currently `.prettierignore`d and therefore a no-op until that policy changes, but the rule is set up forward-compatibly); `*.py` → `ruff check --no-fix`, `ruff format --check`, `pyright` (no-op until T-006 lands `*.py`).
- **`.gitleaks.toml`:** extends gitleaks defaults via `[extend] useDefault = true`. `.env.example` allowlisted because its placeholder values (`REPLACE_WITH_32_BYTE_BASE64`, `REPLACE_AT_FIRST_LOGIN`, etc.) could false-positive against future gitleaks default rules.
- **gitleaks invocation:** `gitleaks git --staged --redact --verbose --config .gitleaks.toml`. **Critical deviation from the implementer plan:** gitleaks 8.30 removed the legacy `protect --staged` subcommand and replaced it with `git --staged`. The plan still referenced `protect`. Running `gitleaks protect --staged` against 8.30 silently exits 0 without scanning (acceptance criterion #3 was failing on the first wire-up commit before this fix). A dedicated **fix(hooks)** commit updates the hook and `docs/pre-commit.md`. Acceptance criterion verified afterwards with the GitHub-PAT fixture (see below).
- **Fixture choice for acceptance criterion #3:** plan called for `AKIAIOSFODNN7EXAMPLE`. Investigation showed gitleaks 8.30's default AWS rule does NOT flag this canonical example (likely because the value itself is on gitleaks' internal allowlist of well-known examples). Switched to a synthetic GitHub PAT (`ghp_…` + 36 hex/alphanumeric chars) — same acceptance-criterion intent (high-entropy secret-format string), reliably caught by gitleaks 8.30's `github-pat` rule. Fixture file deleted before final `git status`; rejection log redacted and reproduced in PR body.
- **Missing-gitleaks handling:** hook fails with a helpful install message; does not silently skip. CI workflow in T-008 will install gitleaks separately.
- **`docs/pre-commit.md`:** new one-page file covering pipeline, tool installs per OS (winget / brew / Linux release binaries), bypass warning (§8.12), config locations.
- **`.gitattributes`:** new top-level file enforcing `text eol=lf` on `.husky/*` and `*.sh`. Required because the Windows dev environment's `core.autocrlf=true` would otherwise convert `.husky/pre-commit` to CRLF on checkout, which `sh` on Linux/macOS hosts (and on Windows under Git Bash) cannot execute. Verified via `git check-attr --all -- .husky/pre-commit` → `eol: lf`.
- **`tsc --noEmit` placement:** outside lint-staged because it's a project-wide check, not per-file. Runs once at the top of the hook against the whole project.
- **Clean-commit perf:** measured at **7.99s** (cold) and **7.72s** (warm) on a trivial single-file commit — well under the 10s target. `tsc --noEmit` dominates the runtime; lint-staged + gitleaks together add <1s.
- **Commit chunking:** (1) T-004 status flip; (2) install Husky + lint-staged + `.gitattributes`; (3) wire `.husky/pre-commit` + `lint-staged` config in `package.json`; (4) `.gitleaks.toml` + `docs/pre-commit.md`; (5) **fix(hooks)** correcting `gitleaks protect` → `gitleaks git` after the fixture surfaced the deviation. The fix commit was added per §8.12 (no `--no-verify`) and CLAUDE.md's preference for new commits over amends. The DECISIONS entry itself ships as the final commit.
- **No `--no-verify` ever** — including for the rejected-fixture verification, which is supposed to fail (and did, exit code 1 with `husky - pre-commit script failed`).

**Net top-level dev-deps added by T-005:** `husky` ^9.1.7, `lint-staged` ^17.0.5. Both are "plugins of an approved framework" (`npm`-managed Node tooling) per §14.3, anticipated by T-005's `Pause-triggers anticipated: §7.1`. The `gitleaks` binary is a system-level prereq installed via OS package manager (winget/brew/release binary) — not a Node dep, not in `package.json`.

**Affected files:** `package.json` (lint-staged block, `prepare` script, devDeps), `package-lock.json`, `.husky/pre-commit`, `.husky/_/` (auto-gitignored Husky internals), `.gitattributes` (new), `.gitleaks.toml` (new), `docs/pre-commit.md` (new), `TASKS.md` (T-004 flipped to ✅).
**Open question for the user:** —

## 2026-05-19 — T-006 silent decisions per §14 (consolidated)
**Context:** T-006 scaffolds the Python FastAPI service (SPEC §7.4) with a runnable `/health` endpoint, the ruff + pyright + pytest tool chain, and a pre-commit-compatible setup. All taste forks resolved silently per §14; the only §7.1 surface is the new dev-deps (`fastapi`, `uvicorn[standard]`, `pydantic`, `python-multipart`, plus dev: `pytest`, `pytest-asyncio`, `httpx`, `ruff`, `pyright`) — explicitly anticipated by T-006's `Pause-triggers anticipated: §7.1` and aligned with CLAUDE.md §2 (every name on that list is already pinned in the stack table).

**Assumption / decision:**
- **Service folder location:** `services/python/` at the repo root (matches the planner's task description verbatim; SPEC §7.4 shows the internal layout that goes *inside* this folder). No co-location with `src/` because §7.4 is explicit about a separate runtime service.
- **Dependency manifests:** split into `requirements.txt` (runtime: `fastapi>=0.115,<1.0`, `uvicorn[standard]>=0.32,<1.0`, `pydantic>=2.9,<3.0`, `python-multipart>=0.0.12,<1.0`) and `requirements-dev.txt` (which does `-r requirements.txt` then adds `pytest>=8.3,<9.0`, `pytest-asyncio>=0.24,<1.0`, `httpx>=0.28,<1.0`, `ruff>=0.7,<1.0`, `pyright>=1.1.380,<2.0`). Lower bounds pinned at stable post-Sep-2024 versions; upper bounds capped below next major to prevent silent breaking jumps. No Poetry / PDM / uv — CLAUDE.md §2 pins `pip + venv` for MVP (re-opening that is §7.10).
- **`pyproject.toml`:** **tool-config only**, no `[project]` block. We are not building a wheel — the service is run via `uvicorn app.main:app` from inside its folder. Sections: `[tool.ruff]`, `[tool.ruff.lint]`, `[tool.ruff.lint.per-file-ignores]`, `[tool.ruff.format]`, `[tool.pyright]`, `[tool.pytest.ini_options]`.
- **Python target version:** 3.12 — set via `target-version = "py312"` (ruff) and `pythonVersion = "3.12"` (pyright). `requires-python` not declared because there's no `[project]` block.
- **Venv location:** `services/python/.venv/` — already covered by the root `.gitignore` pattern `.venv/`.
- **Ruff line length:** 100 — matches Prettier `printWidth: 100` on the TS side for visual consistency.
- **Ruff rule set:** `["E", "F", "W", "I", "UP", "B", "C4", "PT", "RUF", "SIM", "TCH"]` — pyflakes, pycodestyle, isort, pyupgrade, bugbear, comprehensions, pytest-style, ruff-specific, simplify, type-checking. Deliberately omits the heavy / opinionated sets `D` (docstrings), `ANN` (annotation enforcement) to avoid noise on a young codebase; revisit once domain code lands.
- **Ruff per-file-ignore:** `__init__.py` exempt from `F401` to allow the re-export pattern when modules start aggregating their public API.
- **Ruff format quote-style / line-ending:** `double` + `lf`. LF is consistent with the existing `.gitattributes` policy from T-005.
- **Pyright strictness:** `typeCheckingMode = "strict"` on `app/` and `tests/`. Mirrors the TS side's `strict: true`. `reportMissingImports` and `reportGeneralTypeIssues` both `"error"`.
- **Pyright venv discovery:** `venvPath = "."` + `venv = ".venv"` in `pyproject.toml`. Without both fields, pyright defaults to the system Python and reports "Import 'pytest' could not be resolved" on `conftest.py`. Documented inline in `pyproject.toml`.
- **pytest config:** `testpaths = ["tests"]`, `python_files = "test_*.py"`, `python_classes = "Test*"`, `python_functions = "test_*"`, `asyncio_mode = "auto"` (FastAPI is async-native), `addopts = "-ra -q"`.
- **FastAPI app instance:** `FastAPI(title="GreenScout Python service", version="0.1.0", description="...")` in `app/main.py`. No CORS — the Next.js side calls this over the internal Docker network (T-007).
- **`/health` endpoint shape:** `GET /health → HealthResponse(status="ok")`. `HealthResponse` is a pydantic v2 `BaseModel` in `app/schemas/health.py`. Route handler in `app/api/health.py` exposes a `router = APIRouter()`; mounted via `app.include_router(health_router)` in `main.py`.
- **Templates folder:** created as empty `services/python/templates/.gitkeep`. The existing root-level `Machbarkeitsstudie-PV-Template_v1_6.pptx` is **not** moved as part of T-006 — that move belongs to T-036 / T-037 once the placeholder mapping is signed off.
- **Domain / services stubs:** all created as docstring-only files with `TODO(T-XX):` markers pointing at the downstream tasks that implement them (T-029b image processor, T-031 constants, T-033 calculations, T-035 config/pydantic-settings, T-037/T-038a/b pptx generator, T-039 pdf renderer). Each `__init__.py` is empty.
- **TestClient pattern:** `tests/conftest.py` exposes a session-scoped `client` fixture (`fastapi.testclient.TestClient` context-managed against `app.main:app`). `httpx` is the underlying transport (FastAPI 0.115's TestClient uses it). `tests/test_health.py` is one synchronous test asserting `200` + `{"status": "ok"}`.
- **Lint-staged Python-tool resolution (the §14.3 borderline call):** the Husky hook from T-005 cannot reach `ruff` / `pyright` because they only exist inside the venv and lint-staged spawns commands from the repo root with the global PATH. **Decision:** add a tiny cross-platform Node launcher `scripts/run-py-tool.mjs` that resolves `services/python/.venv/{Scripts,bin}/<tool>{.exe,}`, rewrites path arguments relative to the service folder, and spawns the tool with `cwd=services/python`. lint-staged glob narrowed from `*.py` to `services/python/**/*.py`. This avoids requiring developers to install ruff/pyright globally OR to activate the venv before committing — the only prerequisite is `pip install -r requirements-dev.txt` once.
  - **Alternatives considered:** (a) npm-wrappers for both tools — `pyright` IS published to npm officially by Microsoft, but the only `ruff` npm package (`ruff@1.5.4`) is an unrelated generators library; Astral's only npm artefacts are `@astral-sh/ruff-wasm-*` (WASM bindings, not a CLI). (b) require global `pipx install ruff pyright` — works but adds an OS-level setup step per developer. (c) drop the `*.py` rule from lint-staged and defer Python checks to CI — loses fast local feedback. (d) chosen path keeps the venv as the single source of truth and is fully cross-platform with zero global installs.
- **ESLint ignore for `services/python/.venv/**`:** added because the pyright npm package bundled inside the venv (`.venv/Lib/site-packages/pyright/dist/index.js`) is CommonJS-style JS that fails our project rule set. Prettier ignore for the same path.
- **`eslint --no-warn-ignored` in lint-staged:** added because lint-staged passes explicitly staged files to eslint, and eslint warns when an explicit input matches the global ignore list (e.g. when `eslint.config.mjs` itself is staged, which is excluded by the `**/*.config.{js,mjs,ts}` ignore pattern). The warning becomes an error under `--max-warnings 0`. `--no-warn-ignored` suppresses just that diagnostic without weakening the warning budget.
- **Commit chunking:** (1) T-005 status flip in TASKS.md; (2) Python service scaffold under `services/python/`; (3) lint-staged ↔ Python venv resolution via wrapper + ignores + docs; (4) `docs/python-service.md`; (5) this DECISIONS entry. No `--no-verify`; every commit ran the full Husky chain (tsc + lint-staged + gitleaks) clean.
- **Gates verified:** `services/python/.venv/Scripts/ruff check .` → "All checks passed", `ruff format --check .` → "17 files already formatted", `python -m pyright` → "0 errors, 0 warnings, 0 informations", `python -m pytest` → "1 passed in 0.02s". `uvicorn app.main:app --port 8765` boots and `curl http://127.0.0.1:8765/health` returns HTTP 200 + `{"status":"ok"}`. TS-side gates still clean: `npm run lint` / `format:check` / `typecheck` all exit 0.

**Net top-level deps added by T-006:**
- **Python runtime (`requirements.txt`):** `fastapi`, `uvicorn[standard]`, `pydantic`, `python-multipart`.
- **Python dev (`requirements-dev.txt`):** `pytest`, `pytest-asyncio`, `httpx`, `ruff`, `pyright`.

All nine names are §14.3-anticipated by T-006's `Pause-triggers anticipated: §7.1` and explicitly listed in CLAUDE.md §2 (`Python + FastAPI + uvicorn`, `pydantic v2`, `ruff`, `pyright`, `pytest`). `httpx` enters as a TestClient transport for FastAPI (treated as a plugin of an approved framework per §14.2); `python-multipart` enters as a FastAPI prerequisite for future `UploadFile` form parsing.

**Affected files:** `TASKS.md` (T-005 → ✅ Recently completed), `services/python/**` (21 new files: app + tests + templates/.gitkeep + requirements + pyproject.toml), `scripts/run-py-tool.mjs` (new), `package.json` (lint-staged glob + `--no-warn-ignored`), `eslint.config.mjs` (ignore `services/python/.venv/**`), `.prettierignore` (same), `docs/pre-commit.md` (describe wrapper flow), `docs/python-service.md` (new).
**Open question for the user:** —

---

## 2026-05-19 — T-007 silent decisions per §14 (consolidated)
**Context:** T-007 stands up the local Docker Compose stack: `web` (Next.js) + `pyservice` (FastAPI) + `db` (Postgres 16) on a shared bridge network with bind mounts for `./uploads` and `./generated` into both app services per CLAUDE.md §3. Every fork below was taste-level per §14.2 — no §7 pause-triggers fired. No new top-level deps (Docker base images are runtime infrastructure, not `package.json` / `requirements.txt` entries).

**Assumption / decision:**
- **No `version:` field in `docker-compose.yml`.** Compose v2+ ignores it; the field has been deprecated for two-plus years.
- **Web image — multi-stage Node 24 alpine.** `deps` (`npm ci --omit=optional`) → `builder` (`npm run build` with telemetry off) → `runner` (copy `.next/standalone`, `.next/static`, `public`, run `node server.js`). Matches `.nvmrc=24` user-confirmed in earlier DECISIONS. Final image: **283 MB** (Next 15 + React 19 + bundled fonts; acceptable for a dev stack).
- **`next.config.ts` adds `output: "standalone"`.** Required for the minimal `runner` stage; without it the runner would need a full `node_modules` and would balloon past 1 GB.
- **Web Dockerfile at repo root (`Dockerfile.web`).** Alongside `package.json`. The compose `web.build.context: .` covers it.
- **Pyservice image — `python:3.12-slim`, single-stage.** Slim/Debian was chosen over alpine because LibreOffice (T-039) is notoriously hard to package on alpine. No system packages installed yet — pure `pip install --no-cache-dir -r requirements.txt`. Final image: **231 MB**.
- **Pyservice Dockerfile at `services/python/Dockerfile`.** Compose `pyservice.build.context: ./services/python` — the COPY paths are relative to that folder.
- **Postgres image — `postgres:16-alpine`.** Matches SPEC §2.
- **Single user-defined bridge network `gs-network`.** All three services attached. No `external: true`. Service-name DNS (`db`, `pyservice`, `web`) is the canonical way containers reach each other.
- **Named volume `postgres-data` for Postgres.** Survives `docker compose down`, destroyed by `down -v`. Top-level `volumes:` block declares it.
- **Bind mounts `./uploads` and `./generated` into both `web` and `pyservice`.** Per CLAUDE.md §3. Both folders are gitignored and may not exist on the host — Docker creates them transparently on first up.
- **Service names = compose-internal DNS = `web`, `pyservice`, `db`.** Container names follow the `greenscout-<service>` convention for `docker ps` readability.
- **Healthchecks:**
  - `db`: `pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}` (double-dollar escapes Compose interpolation so the shell expands at container runtime).
  - `pyservice`: Python `urllib.request.urlopen('http://localhost:8000/health', timeout=2)` — slim Python has no `curl`/`wget` and installing one just for a healthcheck adds ~20 MB.
  - `web`: `wget -q --spider http://127.0.0.1:3000/`. **Important:** uses `127.0.0.1` explicitly, not `localhost`. Alpine's wget resolves `localhost` to IPv6 `::1` first, but Next.js standalone with `HOSTNAME=0.0.0.0` only binds IPv4 → "Connection refused" until the IPv4 fallback fires (which on alpine wget it doesn't). Caught during verification; switching to `127.0.0.1` made the web container go healthy in <40 s.
- **Port mappings bind to `127.0.0.1`** (`web 3000`, `pyservice 8000`, `db 5432`). Dev services should never be exposed on the LAN.
- **`db` host-side port parameterised via `${POSTGRES_PORT:-5432}`.** Verification run hit a conflict with a host-side Postgres on 5432; rather than force every developer to free 5432, the host side now defers to `.env` (default 5432, override e.g. `POSTGRES_PORT=55432`). Container-internal port stays 5432 so the compose-network connection string is stable.
- **Restart policy `unless-stopped`** on all three services. Survives daemon restarts without auto-restarting after explicit `docker compose stop`.
- **`env_file: .env` on all three services**, paired with compose-time `environment:` overrides for in-network reach:
  - `web.environment.DATABASE_URL` rewrites the localhost-style `.env` URL to `host=db` so the container reaches Postgres by service name.
  - `web.environment.PYTHON_SERVICE_URL=http://pyservice:8000` (same reason).
  - `web.environment.AUTH_TRUST_HOST="true"` for Auth.js v5 inside the container.
  - `pyservice.environment.UPLOADS_DIR=/app/uploads` + `GENERATED_DIR=/app/generated` rewrite host-style paths from `.env` to the container-internal mount points.
- **`AUTH_SECRET` kept, NOT renamed to `NEXTAUTH_SECRET`.** The task description in `TASKS.md` referred to `NEXTAUTH_SECRET`, but `.env.example` already uses Auth.js v5's `AUTH_SECRET` convention from the T-001 commit. Renaming would have broken the established naming; ignoring the typo in the task description is the correct call.
- **`.dockerignore` at repo root.** Excludes `node_modules/`, `.next/`, `.venv/`, `.git/`, `docs/`, large template binaries (`templates/*.pptx`, the root-level template PPTX/PDF, `Machbarkeitsstudien Auswertung.xlsx`), `.claude/`, env files, and Docker artefacts themselves. Whitelists `README.md` so the image is self-documenting. Keeps the web build context to a few MB instead of pulling in the ~30 MB template binary.
- **Non-root container users.** Web runs as `nextjs:nodejs` UID 1001; pyservice as `gsuser:gsgroup` UID 1001; Postgres uses its image default. Defence-in-depth hardening.
- **No LibreOffice install in pyservice yet.** T-039 adds it. Documented in `docs/docker.md` so a future reader knows it's intentional.
- **`docs/docker.md` covers** prereqs, first-time setup, common commands table, networking + persistence + container-user tables, intentional non-inclusions (LibreOffice, python-pptx, Pillow), agent quality gates, and the §8.10 reminder that prod deploys are a human-only workflow.
- **Commit chunking:** (1) T-006 status flip; (2) `next.config.ts` standalone output; (3) Dockerfiles + `.dockerignore` + `docker-compose.yml` together (small diff, single logical change); (4) `docs/docker.md` + the two compose tweaks from verification (port parameter + IPv4 healthcheck); (5) this DECISIONS entry. No `--no-verify`; every commit ran tsc + lint-staged + gitleaks clean.
- **Verification gates (all green):**
  - `docker compose config` → exit 0.
  - `docker compose build` → both images built (`greenscout-web` 283 MB, `greenscout-pyservice` 231 MB).
  - `docker compose up -d db` → Postgres healthy in ~10 s, `pg_isready` returns "accepting connections".
  - `docker compose up -d` → all three services healthy within ~75 s.
  - `docker compose exec web wget -qO- http://pyservice:8000/health` → `{"status":"ok"}` — **service-name DNS across the network works**.
  - Host `curl http://localhost:3000/` → HTTP 200, `curl http://localhost:8000/health` → `{"status":"ok"}`.
  - `docker compose down -v` cleaned up containers, volume, and network.
  - TS-side: `npm run typecheck` / `lint` / `format:check` all exit 0.

**Net top-level deps added by T-007:** none. Base images (`node:24-alpine`, `python:3.12-slim`, `postgres:16-alpine`) are runtime infrastructure, not `package.json` / `requirements.txt` entries. §14.3 classifies "Docker base image variants" as taste-level pre-approved.

**Affected files:** `TASKS.md` (T-006 → ✅ Recently completed), `next.config.ts` (`output: "standalone"`), `Dockerfile.web` (new, multi-stage), `services/python/Dockerfile` (new, single-stage), `docker-compose.yml` (new, three services + network + volume), `.dockerignore` (new), `docs/docker.md` (new).
**Open question for the user:** —

---

## 2026-05-19 — T-008 silent decisions per §14 (consolidated)
**Context:** T-008 authors the GitHub Actions CI workflow that re-runs all pre-commit gates plus the broader CLAUDE.md §5.2 checks. Every fork below was taste-level per §14.2 — no §7 pause-triggers fired. The task description's "Node 20" was overridden by the earlier user-confirmed DECISIONS entry "T-001 post-implementation choices" which pins Node 24.

**Assumption / decision:**
- **Single workflow file.** `.github/workflows/ci.yml` — one workflow, eight jobs. Easier to read than splitting per-domain workflows; matches the "single CI pipeline" mental model of CLAUDE.md §5.2.
- **Node 24, Python 3.12.** Node 24 overrides the task description's "Node 20" per the T-001 follow-up DECISIONS entry; Python 3.12 matches `services/python/pyproject.toml` (`pythonVersion = "3.12"`).
- **Trigger surface:** `on: { pull_request: {}, push: { branches-ignore: [main] } }`. `branches-ignore: [main]` prevents the duplicate run that would otherwise fire when a PR is merged (the merge produces a push to `main`, but the PR validation pass already covered it).
- **Concurrency:** `group: ci-${{ github.workflow }}-${{ github.ref }}`, `cancel-in-progress: true`. Cancels stale runs when new commits land on the same ref.
- **Top-level permissions:** `{ contents: read }`. No job currently elevates beyond that — no deploy step, no token write, no package publish. §8.10 hard line.
- **Eight jobs, parallel by default:**
  - **5 live gates:** `actionlint`, `lint-typecheck`, `python-checks`, `build-images` (matrix: `web` + `pyservice`), `gitleaks-scan`.
  - **3 stubs:** `web-tests` (Vitest — T-018), `e2e` (Playwright — T-051a/b), `prisma-migrate-check` (Prisma — T-013).
- **Stub format:** each stub job runs a single `echo "STUB: ... enabled in T-0XX"` step and exits 0. **Not commented out** — visible structure beats hidden YAML. When the underlying tool lands, the future-task implementer replaces only the stub step.
- **Stub future-task IDs:** Vitest → T-018 (login page is the first task that will both define and exercise the Vitest config); Playwright → T-051a/b (the dedicated E2E task pair); Prisma → T-013 (initial migration + local DB apply).
- **`e2e` dependency:** `needs: [lint-typecheck, web-tests]`. Structurally correct (E2E should not run before build is green AND unit tests pass) — currently no practical effect because `web-tests` is a stub, but the dependency becomes meaningful once Vitest lands.
- **Coverage threshold step:** a placeholder echo in `lint-typecheck` ("Coverage thresholds 80% global / 100% on calc — will be enforced once Vitest is installed (T-018)"). No actual gate yet. The 80% / 100% numbers from CLAUDE.md §5.2 are mentioned in the echo so a future reader sees the contract.
- **`actionlint` action choice:** `reviewdog/action-actionlint@v1`. The `rhysd/actionlint` repository publishes the binary and a Dockerfile, but the canonical GitHub Action wrapper is the reviewdog one (verified against `rhysd/actionlint/docs/usage.md`). Alternative `docker://rhysd/actionlint:latest` is heavier and offers no benefit here.
- **`docker/build-push-action@v6`** with `push: false`, `load: true`, `tags: greenscout-${{ matrix.name }}:ci`. The image stays on the runner — never pushed to any registry. §8.10 compliance.
- **Docker matrix:** two entries (`web` + `pyservice`). `fail-fast: false` so a `pyservice` build failure doesn't mask a `web` build failure on the same run.
- **Cache strategy:**
  - `actions/setup-node@v4` with `cache: 'npm'` + `cache-dependency-path: package-lock.json`.
  - `actions/setup-python@v5` with `cache: 'pip'` + `cache-dependency-path: services/python/requirements-dev.txt`.
  - `docker/build-push-action@v6` with `cache-from: type=gha` + `cache-to: type=gha,mode=max` (GitHub Actions cache backend).
- **Postgres service block in `prisma-migrate-check`** defined now so the YAML is structurally complete. The future T-013 implementer just replaces the stub echo with the migrate command. `POSTGRES_PASSWORD: greenscout_ci_only` is **not** a real secret (literal string, ephemeral container, never reused) — flagged here in case a future reader wonders. gitleaks default rules do not flag this token.
- **`gitleaks/gitleaks-action@v2`** with `fetch-depth: 0` so the scan covers full history, not just the PR diff. The action reads `.gitleaks.toml` automatically via `GITLEAKS_CONFIG` env var. No `GITLEAKS_LICENSE` needed (this repo is small / not enterprise-tier). **First-run fix:** the action's `pull_request` event path now requires `GITHUB_TOKEN` (the built-in `secrets.GITHUB_TOKEN`) to fetch the PR commit range — this is a 2024-era breaking change in the action. The fix is a single env var; permissions stay at `contents: read` (the action does not write back to the repo). Caught on the very first CI run when the `pull_request` job failed; the `push` event run passed because that code path doesn't need the token.
- **Secrets references:** the workflow references only the built-in `secrets.GITHUB_TOKEN` (implicit via the gitleaks action). **No `PRODUCTION_*`, `PROD_*`, `LIVE_*`, `HETZNER_*`, `FLY_*`, `VERCEL_*`, or any deploy-target-name secret is referenced.** §8.10 hard line.
- **No `deploy` job.** T-008 is explicitly a gate-skeleton; production deployment is a human-operator workflow outside CI.
- **Workflow validation:** `actionlint` v1.7.7 was downloaded locally (rhysd release binary) and run against `.github/workflows/ci.yml` → 0 errors, 0 warnings. YAML round-trip via `python -c "import yaml; yaml.safe_load(...)"` → 8 jobs parsed cleanly. In-CI validation path is the `actionlint` job itself, which will re-run on every PR.
- **Branch protection NOT auto-configured.** This is a human-admin step in the GitHub UI per CLAUDE.md §8.11. `docs/ci.md` enumerates which checks to require **now** (the 5 live gates) and which to **flip when their backing task lands** (the 3 stubs). The agent must not toggle protection via `gh api` even though `gh` would accept the call — §8.11 is binding.
- **`docs/ci.md`:** trigger description, job map (real vs stub), per-job local-equivalent commands, parallelism explanation, stub replacement guide, caching, branch-protection setup, action-version audit list, §8.10 / §8.11 reminders.
- **Commit chunking:** (1) T-007 status flip; (2) `chore(ci): scaffold .github/workflows/ci.yml`; (3) `docs(ci): add docs/ci.md`; (4) this DECISIONS entry. The "stub jobs" diff was folded into commit (2) — the diff is small enough that splitting would have produced two near-identical commits.
- **No `--no-verify` ever.** Every commit ran the full Husky chain (tsc + lint-staged + gitleaks) clean.

**Net top-level deps added by T-008:** none. The workflow consumes only published GitHub Actions and base images that are runtime infrastructure (`postgres:16-alpine` already used by the compose stack from T-007). §14.3 classifies action versions as taste-level pre-approved.

**Affected files:** `TASKS.md` (T-007 → ✅ Recently completed), `.github/workflows/ci.yml` (new, 153 lines), `docs/ci.md` (new, 154 lines).
**Open question for the user:** Branch protection on `main` requires a human admin to toggle in the GitHub UI per CLAUDE.md §8.11 — see `docs/ci.md` "Branch protection" for the exact checks to enable now (5 live gates) vs later (3 stubs, flip when their backing task lands). The agent will not configure this via `gh api`.

---

## 2026-05-19 — Branch protection on `main` activated (user-confirmed, with promotion TODOs)
**Context:** After PR #9 (T-008 CI workflow) merged, the user enabled GitHub branch protection on `main`. Captured here as the binding promotion state — the previous entry's "Open question" is now answered, but immutable per the DECISIONS.md "newest at the bottom" convention.

**Assumption / decision:** Branch protection rules active on `main`:
- Pull request required (no approval count — solo setup).
- **6 Required Status Checks** (all currently live and green on PRs #1–#9):
  1. `Lint workflow YAML`
  2. `TS lint + format + typecheck`
  3. `Python ruff + pyright + pytest`
  4. `Build Docker image (web)`
  5. `Build Docker image (pyservice)`
  6. `gitleaks secret scan`
- Require branches up to date before merging — ✓
- Require linear history — ✓
- No force push, no delete — ✓ (matches CLAUDE.md §8.1 / §8.3)

**Three CI-stub jobs are deliberately NOT yet required.** TODO — promote each to required when its backing task merges:

| Stub job (CI job name) | Promote when this PR merges | Notes |
|---|---|---|
| `Vitest (stub — T-018)` | T-018 (Login page with live password-rule checklist) — first task with Vitest + RTL + actual coverage | Until then the echo-only stub guards the workflow-shape only |
| `Playwright (stub — T-051a/b)` | T-051a (Playwright E2E covering F1–F4) — first task with real headless runs | Pause T-051b promotion until F5–F7 tests are also green |
| `Prisma migrate (stub — T-013)` | T-013 (Initial Prisma migration + local DB apply) — first task with `prisma migrate deploy` against the CI Postgres service | Schema design currently pending user sign-off (see next entry) |

**Promotion checklist per stub:** GitHub Settings → Branches → `main` rule → Required status checks → search the job name → tick → save. After flipping, the implementer of that task adds a note to its `Recently completed` entry in `TASKS.md` ("branch protection promoted on YYYY-MM-DD") so the audit trail is unbroken.

**Affected files:** none code-wise — this is repository configuration state. Documented here so the agent (and the user) remember the promotion triggers when each backing task lands.
**Open question for the user:** —

---

## 2026-05-19 — Slice 2 schema design approved (user-confirmed, binding for T-009 through T-013)
**Context:** Per §7 pause-trigger, the agent presented a complete schema proposal for all seven entities (User, Customer, Study, StudyImage, GeneratedDocument, AuditLog, Setting) before any Prisma code was written. User reviewed and approved with **two cascade corrections** and **three operational rules**. This entry is the **binding schema contract** for T-009 (Prisma install + header), T-010 (enums + User + Customer), T-011 (Study + StudyImage), T-012 (GeneratedDocument + AuditLog + Setting), and T-013 (initial migration + local DB apply). The 5 implementers must read this entry as their schema source-of-truth.

**Assumption / decision:**

### Versions (pinned)
- `prisma 5.x`, `@prisma/client 5.x` (SPEC §2 — Prisma is at 6.x but pin is binding per §14.3)
- `pg` driver for Postgres
- `@types/pg` only if needed by app code (Prisma Client doesn't expose `pg` types directly)

### Enums (Prisma native `enum` → Postgres ENUM types)
```prisma
enum Role        { ADMIN  BERATER }
enum StudyStatus { DRAFT  READY   GENERATED }
enum ImageType   { BEFORE AFTER }
enum DocFormat   { PPTX   PDF }
enum FormPref    { WIZARD SINGLE_PAGE }
```
Defined in T-010 (first model task that references them).

### Entity schemas (locked)
Full per-field tables are in the chat exchange that produced this entry. The summary:

- **User** — 19 fields incl. `passwordHash` (single column, argon2id PHC string), `passwordChangedAt: DateTime?` for V2 rotation prep, `mustChangePassword Boolean @default(true)`, `failedLoginCount Int @default(0)`, `lockoutUntil DateTime?`, `formPreference FormPref @default(WIZARD)`, `active Boolean @default(true)`, soft-delete via `deletedAt`, `organizationId @default("greenscout")`.
- **Customer** — 13 fields, `companyName String?` optional, `contactFirstName`/`contactLastName` required, soft-delete, organizationId.
- **Study** — 33 fields. **Decimal precision matrix:**
  - `anlageKwp` → `Decimal(10, 3)` (kWp, 3 Nachkomma)
  - `pvErzeugungKwhJahr` / `pvEigenverbrauchKwhJahr` / `verbrauchKwhJahr` / `netzeinspeisungKwhJahr` → `Decimal(12, 2)` (kWh-Mengen)
  - `pvVerkaufEurKwh` / `versorgerPreisEurKwh` / `szenarioPreis1/2/3` → `Decimal(8, 4)` (€/kWh, 4 Nachkomma)
  - `pachtEurProKwp` → `Decimal(8, 2)` (€/kWp, default 100)
  - `modulFlaecheM2` → `Decimal(10, 2)`
  - `eigenverbrauchsquoteProzent` → `Decimal(5, 2)`
  - `co2TonnenProJahr` / `co2HektarMischwald` / `co2FussballfelderProJahr` → `Decimal(10, 2)`
  - `szenarioPreis1/2/3` defaults `0.35` / `0.40` / `0.45` per Wizard-Step-5 decision (DECISIONS.md entry "Wizard step layout fixed")
- **StudyImage** — 8 fields incl. `@@unique([studyId, type])`. No own organizationId (joined via Study). No soft-delete (lives/dies with parent).
- **GeneratedDocument** — 6 fields (corrected from 6 originally proposed — `generatedById` becomes nullable). Cascade behaviour corrected — see "Cascading-delete matrix" below.
- **AuditLog** — 10 fields incl. `changeSet Json?` (Postgres `jsonb`), `organizationId` added (not in SPEC §5.1 but consistent), append-only (no `@updatedAt`, no `updatedAt` column).
- **Setting** — 3 fields, `key` as `@id`, no organizationId in MVP (single-tenant; Phase-3 will add).

### Cascading-delete matrix (final — incorporates user corrections)
| Relation | onDelete | onUpdate | Notes |
|---|---|---|---|
| `Study.consultantId → User` | `Restrict` | `Cascade` | User-Hard-Delete blocked while owning studies — Handover Flow F6 is mandatory |
| `Study.customerId → Customer` | `Restrict` | `Cascade` | Customer-Hard-Delete would orphan studies |
| `StudyImage.studyId → Study` | `Cascade` | `Cascade` | Image meaningless without study |
| **`GeneratedDocument.studyId → Study`** | **`Cascade`** ✏️ | `Cascade` | **USER CORRECTION**: DSGVO-Hard-Delete of Study cascades DB rows AND filesystem PDFs under `./generated/studies/<studyId>/`. Audit trail lives in `AuditLog.action = GENERATE_DOCUMENT`. `studyId` stays NOT NULL. |
| **`GeneratedDocument.generatedById → User`** | **`SetNull`** ✏️ | `Cascade` | **USER CORRECTION**: Column becomes `String?` (nullable). DSGVO-User-Hard-Delete does NOT block on old generation history. Historical reference preserved in `AuditLog.userId` (also SetNull). |
| `AuditLog.userId → User` | `SetNull` | `Cascade` | System events have userId=null; user hard-delete nulls historic references but preserves entries |

### Index strategy (final)
| Entity | Indexes |
|---|---|
| User | `@@unique([email])`, `@@index([organizationId, role, active, deletedAt])`, `@@index([organizationId, createdAt])` |
| Customer | `@@index([organizationId, deletedAt])`, `@@index([organizationId, contactLastName])` |
| Study | `@@index([consultantId])`, `@@index([customerId])`, `@@index([status])`, `@@index([organizationId, status])`, `@@index([organizationId, consultantId, deletedAt])`, `@@index([organizationId, createdAt])` |
| StudyImage | `@@unique([studyId, type])` |
| GeneratedDocument | `@@index([studyId, generatedAt(sort: Desc)])` |
| AuditLog | `@@index([userId])`, `@@index([entityType, entityId])`, `@@index([createdAt(sort: Desc)])`, `@@index([organizationId, createdAt(sort: Desc)])` |
| Setting | `@id key` only |

### `organizationId` enforcement
- Every entity except `StudyImage`, `GeneratedDocument`, `Setting` has `organizationId String @default("greenscout") @map("organization_id")`.
- Repository layer (T-014) enforces filtering; application code (routes, services, components) never references `organizationId` directly.
- Phase-3 multi-tenant migration: (1) remove default value, (2) add `Organization` table, (3) populate from session. All additive (no §7.2).

### `AuditLog.changeSet` JSON convention
- Postgres type: `jsonb`.
- Application-layer structure: **per-field tuple** — `{ "fieldName": [oldValue, newValue], ... }` — compact and diff-renderable in admin Audit-UI (T-045).
- Soft cap at 8 KB: app-layer logger warns above this; no DB-level limit.
- **Sensitive data excluded**: `passwordHash` never appears in `changeSet`. Password changes log `{"action": "PASSWORD_CHANGED"}` with no diff.
- No GIN index in MVP; defer until a query pattern needs it.

### NEW — Email case-insensitivity (user-mandated)
- Repository layer normalises `email` to **lowercase** before any `create`, `findUnique`, `update`, or `upsert` involving the email column.
- Implemented via a **pre-save hook** in `src/features/auth/repository.ts` (or wherever the User-Repository lives) — every entry into the repository passes through `email = email.trim().toLowerCase()` before the Prisma call.
- Rationale: prevents duplicate accounts with different casing (e.g. `Foo@Bar.com` vs `foo@bar.com` would otherwise be two separate User rows because Postgres email uniqueness is case-sensitive by default).
- Application-layer enforcement chosen over `citext` extension because Prisma 5 doesn't natively model `citext` and the migration would need raw SQL — adds complexity for marginal benefit when a one-line normalisation in the repository covers the same risk.
- The seed script (T-015) MUST also normalise `SEED_ADMIN_EMAIL` to lowercase before lookup/insert.
- Test coverage: T-022 (Customer feature schema + repository + list) and T-017 (Auth.js Credentials provider) will both need test cases for mixed-case email login attempting to find the lowercase-stored row.

### Pre-migrate sanity (user-mandated)
**Before** running `npx prisma migrate dev --name initial_schema` in T-013, the implementer MUST run in this order:
1. `npx prisma format` — autoformats the schema file
2. `npx prisma validate` — catches model errors before migration

If either fails, the migration step does not proceed. Captured in the T-013 brief as a hard gate.

### Seed-script placement (user-mandated)
The idempotent admin seed (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_TEMP_PASSWORD` per DECISIONS entry "Admin account provisioning via seed") belongs in **T-015**, NOT T-010. Seed is application logic, not schema. T-010 (User + Customer model definitions) just defines the table structure; the `prisma/seed.ts` script and the `package.json` `"prisma": { "seed": "..." }` block come in T-015.

### Roll-out
**Five separate PRs in sequence (planner-konform).** Each task = one PR, each merges before the next starts. Rationale (user's words): schema design is one design unit, but the five tasks are atomic with their own acceptance criteria — separate PRs ease review and rollback if anything caught in T-012 / T-013 could have been avoided in T-010.

Sequence:
1. **T-009** — `npm install prisma @prisma/client pg` + `npx prisma init` + `prisma/schema.prisma` with datasource + generator blocks only. No models, no enums yet.
2. **T-010** — Five enums (`Role`, `StudyStatus`, `ImageType`, `DocFormat`, `FormPref`) + `User` + `Customer` models with all indexes and the email-lowercase normalisation hook documented in `src/features/auth/repository.ts` (or staging file).
3. **T-011** — `Study` + `StudyImage` with Decimal precisions, unique constraint, and indexes per matrix above.
4. **T-012** — `GeneratedDocument` (with corrected Cascade/SetNull) + `AuditLog` (with `organizationId`, no `@updatedAt`) + `Setting`.
5. **T-013** — `npx prisma format` → `npx prisma validate` → `npx prisma migrate dev --name initial_schema` against local Postgres + verify generated client + record schema-version in DECISIONS.

T-014 (repository helper layer) and T-015 (admin seed) come after T-013, each their own PR.

**Affected files (across the 5 PRs):** `package.json`, `package-lock.json`, `prisma/schema.prisma`, `prisma/migrations/*/migration.sql`, `src/features/auth/repository.ts` (or staging), `docs/prisma.md`, `TASKS.md` (status flips), `DECISIONS.md` (per-task consolidated entries).
**Open question for the user:** —

---

## 2026-05-19 — T-009 silent decisions per §14 (consolidated)
**Context:** T-009 installs Prisma 5.x + @prisma/client + pg and scaffolds the schema header (datasource + generator only — no models, no enums). The full Slice-2 schema design is locked per the prior DECISIONS entry "Slice 2 schema design approved".

**Assumption / decision:**
- **Prisma 5.x pinned via `^5`** in package.json (resolved version: **5.22.0** at install time); explicit do-not-cross-into-6/7 per SPEC §2. CLI emits a "5.22.0 -> 7.8.0 upgrade available" notice on every run; deliberately ignored per the pin.
- **`@prisma/client 5.22.0`** (same major as the CLI).
- **`pg@8.21.0`** driver added (current major). `@types/pg` deferred — not needed by Prisma Client.
- **Scaffolding method deviation from brief:** `npx prisma init --datasource-provider postgresql` **fails on Node 24 with Prisma 5.22.0** — known upstream incompat (`(0 , CSe.isError) is not a function`, the engine still references `util.isError` which Node 24 removed). The brief mandated hand-rewriting `prisma/schema.prisma` to the exact template anyway, so the failed `init` is moot: created `prisma/` manually with `mkdir prisma`, then wrote `prisma/schema.prisma` directly to match T-009's brief template — 2-line header pointing to DECISIONS.md, generator with `output = "../src/generated/prisma"` and empty `previewFeatures`, datasource pointing to `env("DATABASE_URL")`. No `.env` modification by Prisma (CLI never ran); created `.env` locally via `cp .env.example .env` for the validate/generate sanity (gitignored, not committed). The brief's hard pause-trigger "prisma init insists on a 6.x install" did not fire — install side resolved 5.22.0 cleanly via the `^5` pin.
- **No models, no enums in T-009.** T-010 owns enums + User + Customer.
- **npm scripts added**: `db:generate`, `db:studio`, `db:migrate`. **`db:seed` deferred to T-015** per user-mandate.
- **No `prisma.seed` block in package.json yet** — also deferred to T-015.
- **`docs/prisma.md`** written: setup, schema-change workflow (with §7 pause-trigger reminder), `prisma migrate deploy` forbidden per §7.9/§8.6, plus an explicit "T-009 state: no models yet" callout so future readers don't try `prisma generate` and panic on the no-models error.
- **Pre-migrate sanity verified on empty schema**: `prisma format` exit 0; `prisma validate` exit 0 (after exporting a placeholder `DATABASE_URL` since validate resolves env vars even on no-model schemas). The T-013 implementer will re-run these against the populated schema.
- **`prisma generate` against empty schema**: errors with "You don't have any models defined in your schema.prisma, so nothing will be generated" — Prisma 5's documented behaviour for empty-model schemas, acceptable for T-009 and called out in `docs/prisma.md`.
- **No `.env` commit**: created locally for sanity, gitignored, never staged.
- **Husky hook fired on all five commits**, no `--no-verify`. CRLF normalisation warnings on `package.json` / `package-lock.json` / `prisma/schema.prisma` / `docs/prisma.md` / `TASKS.md` are .gitattributes-driven and expected on Windows.

**Net top-level deps added:** `prisma` (^5.22.0, devDependencies), `@prisma/client` (^5.22.0, dependencies), `pg` (^8.21.0, dependencies). All in CLAUDE.md §2 named tech-stack — §7.1 "new dependencies" pause-trigger softened by §14.3 since they are SPEC §2-named and explicitly pinned there. No surprise top-level packages appeared (verified via `npm ls --depth=0`).

**Affected files:** `package.json`, `package-lock.json`, `prisma/schema.prisma` (new), `docs/prisma.md` (new), `TASKS.md` (T-008 → ✅ Recently completed), `DECISIONS.md` (this entry).
**Open question for the user:** —

---

## 2026-05-20 — T-010 silent decisions per §14 (consolidated)
**Context:** T-010 adds the five Slice-2 enums plus `User` and `Customer` models to `prisma/schema.prisma`, and stages the email-normalisation utility per the user-mandated case-insensitivity rule from the "Slice 2 schema design approved" entry. No migration runs (T-013), no seed (T-015), no repository layer (T-014) in this PR.

**Assumption / decision:**
- **Enum block placement:** between `datasource db {...}` and the first model, under a section comment header `// ─── Enums ───`. Models live under their own `// ─── Models ───` header below.
- **Enum declaration style (forced change):** the briefing pre-approved "comma-separated on one line if short" (e.g. `enum Role { ADMIN BERATER }`). **Prisma 5.22 rejected this** — `prisma format` raised P1012 "This line is invalid. It does not start with any known Prisma schema keyword" on every single-line enum. Pivot: each enum value on its own line, Prisma's canonical format. No semantic change, just multi-line bodies.
- **Model order in schema file:** `User` first (more central, referenced by future Study/AuditLog), then `Customer`. Strict alphabetical would flip them — pragmatic readability call. Future models inserted by T-011/T-012 should keep the conceptual ordering rather than strict alphabetical so the relation graph reads top-down.
- **`@map` convention:** applied to every camelCase field that maps to a non-trivial snake_case column (per CLAUDE.md §4.2). Single-word fields (`id`, `email`, `role`, `phone`, `mobile`, `notes`, `active`) get no `@map` — Prisma's default identifier mapping is fine. **Note on TASKS.md T-010 acceptance criterion** "Every column carries an `@map`": that wording predates §14 and would force `@map("id")`/`@map("email")` etc., which the briefing explicitly de-scoped. The intent of CLAUDE.md §4.2 is "camelCase TS → snake_case DB" — single-word fields satisfy that trivially without `@map`. Reviewers should accept the briefing's interpretation.
- **Table names:** PascalCase singular (`User`, `Customer`) — no `@@map` to override. Postgres quotes identifiers safely; `user` is reserved-word-adjacent but `"User"` is unambiguous.
- **`@unique` vs `@@unique`:** column-level `email String @unique` on User. Same DB index either way; column-level is more local.
- **Field ordering within models:** identity → required core → optional personal → flags/counters → soft-delete → org → timestamps. Two compound indexes per model from the DECISIONS contract.
- **Email utility location:** `src/features/auth/utils/normalise-email.ts` per CLAUDE.md §4.1 feature/layered convention. Pure string function, no Prisma dependency, no async.
- **Email utility test (Vitest API, Vitest itself deferred to T-018):** co-located `normalise-email.test.ts`. Four test cases (lowercase, trim, combined, empty string). The `import { describe, it, expect } from "vitest"` line broke `tsc --noEmit` with TS2307 because `vitest` isn't yet a dependency.
- **`tsconfig.json` adjustment:** added `**/*.test.ts` and `**/*.test.tsx` to `exclude`. Forward-looking — T-018+ will add many test files; excluding the `*.test.*` pattern keeps the Vitest import out of tsc's resolution until Vitest lands. Vitest itself loads test files with its own pipeline, so the exclusion does not block test execution.
- **`eslint.config.mjs` adjustment:** added `src/generated/**` to global ignores. The Prisma-generated client (`src/generated/prisma/`) contains a wasm.js shim with 1,799+ rule violations under our strict config. The directory is gitignored and regenerated on every `db:generate`, so it must not be linted. Should arguably have been done in T-009 when the generator output path was set; lint never ran against it there because no other code yet imported from the generated path. Catching it now.
- **ESLint `import/no-unresolved` on the vitest import:** did not fire — the canonical `eslint-plugin-import` v2.32 + flat config does not flag unresolved imports by default when resolver-typescript isn't configured. No suppression needed.
- **Prisma Client generation verified:** `npm run db:generate` emitted `User` + `Customer` types into `src/generated/prisma/` cleanly (final run reported `Generated Prisma Client (v5.22.0) to .\src\generated\prisma in 232ms`). No DB connection needed.
- **No migration in this PR.** `migrate dev` is T-013.
- **No seed in this PR.** Seed is T-015.
- **No `src/lib/db.ts` Prisma Client wrapper.** T-014.
- **Husky hook fired on all six commits.** No `--no-verify`. CRLF normalisation warnings on `prisma/schema.prisma` / `TASKS.md` / `tsconfig.json` / `eslint.config.mjs` are `.gitattributes`-driven and expected on Windows.

**Net top-level deps added:** none. All work is in existing toolchain.

**Affected files:** `prisma/schema.prisma` (+5 enums, +User, +Customer), `src/features/auth/utils/normalise-email.ts` (new), `src/features/auth/utils/normalise-email.test.ts` (new), `tsconfig.json` (exclude `**/*.test.ts(x)`), `eslint.config.mjs` (ignore `src/generated/**`), `TASKS.md` (T-009 → ✅ Recently completed), `DECISIONS.md` (this entry).
**Open question for the user:** —

---

## 2026-05-20 — T-011 silent decisions per §14 (consolidated)
**Context:** T-011 adds `Study` (33 fields, 6 indexes, §7.7-money-relevant Decimal precisions) and `StudyImage` (8 fields, `@@unique([studyId, type])`, Cascade delete) to `prisma/schema.prisma`. Also wires bidirectional relations into `User` and `Customer` (back-relation fields `consultantStudies` / `studies` / `images`). No migration runs (T-013), no repository layer (T-014), no seed (T-015) in this PR.

**Assumption / decision:**
- **Relation naming (forward-thinking):** `@relation("ConsultantStudies")` between User ↔ Study (forward-thinking — T-012 adds `GeneratedDocument.generatedById → User`, so a second User-rooted relation will exist; naming both now avoids a future `@relation` rename). `@relation("CustomerStudies")` between Customer ↔ Study chosen for symmetry/clarity even though only one such relation will ever exist. `StudyImage ↔ Study` left unnamed — single relation pair.
- **Cascade per DECISIONS contract (verbatim, no deviations):**
  - `Study.consultantId → User`: `onDelete: Restrict, onUpdate: Cascade`
  - `Study.customerId → Customer`: `onDelete: Restrict, onUpdate: Cascade`
  - `StudyImage.studyId → Study`: `onDelete: Cascade, onUpdate: Cascade`
- **Decimal precision matrix per DECISIONS (no deviations):** `anlageKwp Decimal(10, 3)`; `pvErzeugungKwhJahr / pvEigenverbrauchKwhJahr / verbrauchKwhJahr / netzeinspeisungKwhJahr Decimal(12, 2)`; `pvVerkaufEurKwh / versorgerPreisEurKwh / szenarioPreis1/2/3 Decimal(8, 4)`; `pachtEurProKwp Decimal(8, 2)`; `modulFlaecheM2 Decimal(10, 2)`; `eigenverbrauchsquoteProzent Decimal(5, 2)`; `co2TonnenProJahr / co2HektarMischwald / co2FussballfelderProJahr Decimal(10, 2)`.
- **Decimal default-literal style:** `pachtEurProKwp @default(100)` (bare integer — Prisma 5.22 accepts numeric defaults for `@db.Decimal(8, 2)`). `vertragslaufzeitJahre Int @default(20)` (integer column, integer literal). **Fractional defaults `szenarioPreis1/2/3` used string-literal form** `@default("0.35")` / `@default("0.40")` / `@default("0.45")` — Prisma 5.22 accepted the string form cleanly (no fallback to bare numeric needed). Chosen over bare numeric to avoid float-precision quirks with `@db.Decimal(8, 4)`.
- **`co2Override @default(false)`** per DECISIONS contract.
- **Field ordering within `Study`:** grouped by purpose, not strict alphabetical — `id` → relations (consultantId/consultant/customerId/customer) → status → object data → PV inputs (money-relevant) → module/Anlage spec optionals → sensitivity scenarios → termine → CO₂ block → back-relations (`images`) → soft-delete/org/timestamps (incl. `generatedAt` nullable, set on transition to GENERATED) → indexes. Pragmatic readability call (same precedent as T-010's User field ordering).
- **`StudyImage` field ordering:** `id` → studyId/study relation → `type` → `filename` → `mimeType` → `widthPx` → `heightPx` → `fileSizeBytes` → `uploadedAt` → `@@unique([studyId, type])`. `type` is not a Prisma 5 reserved keyword — kept verbatim per contract.
- **Schema-edit commit strategy:** **wrote the full schema state first (Study + StudyImage + back-relations), ran `prisma format`/`validate`/`db:generate` once to confirm the end-state is clean, then split the change into three logical commits** by reverting the working tree and re-applying each chunk on top of HEAD. Commit order: (1) Study model; (2) StudyImage model; (3) User/Customer/Study back-relations. **Intermediate commits (1) and (2) do not pass `prisma validate`** (Study references `ConsultantStudies` and `CustomerStudies` relations that have no back side yet; StudyImage references Study with no `images` back side). This is **deliberate and tolerated** because the Husky pre-commit hook runs `tsc --noEmit` + `lint-staged` + `gitleaks` — **not** `prisma validate`. The final state (after commit 3) validates cleanly; CI gates run at PR/push level against the final state. `git add -p` interactive staging considered and rejected as fragile on Windows non-interactive shells.
- **Back-relation field names:** on `User` → `consultantStudies Study[] @relation("ConsultantStudies")`; on `Customer` → `studies Study[] @relation("CustomerStudies")`; on `Study` → `images StudyImage[]`. The `consultantStudies` (vs e.g. `studiesAsConsultant`) keeps the relation noun-led and reads naturally with `user.consultantStudies`.
- **Back-relation block placement within models:** dedicated `// Back-relations` comment block placed **before** the soft-delete/org/timestamps group, matching the §7 group-by-purpose convention from T-010 and applied symmetrically to all three models (User/Customer/Study).
- **`@map` discipline preserved from T-010:** every camelCase column mapping to a non-trivial snake_case DB name carries `@map`. Single-word fields `id`, `status`, `flurstueck`, `filename`, `type` get no `@map` (Prisma's default identifier mapping is already snake_case-equivalent or single-word). T-010 precedent honoured verbatim.
- **`prisma format` reformatting:** `format` slightly tightened the column alignment inside `Customer` after the back-relation insertion (collapsed `String?   @map(...)` to `String? @map(...)` because the field-name column shortened). Accepted as authoritative.
- **`relationMode`:** not declared — Prisma 5 default `foreignKeys` mode is correct for Postgres 16. No need to set `relationMode = "prisma"`.
- **No migration run.** `migrate dev` is T-013 by contract.
- **No repository layer / no soft-delete helper.** T-014.
- **No `Study.images` cascade verification at runtime.** Cascade declarations are schema-level; T-013 migration SQL will materialise them. No SQL hand-check needed in T-011 — `prisma validate` + `db:generate` produced no errors and the generated `StudyImage` model exposes the `study` relation typed correctly.
- **Husky pre-commit hook fired on all four commits** (1× TASKS flip + 3× schema). No `--no-verify`. CRLF normalisation warnings on `prisma/schema.prisma` / `TASKS.md` / `DECISIONS.md` are `.gitattributes`-driven and expected on Windows.

**Net top-level deps added:** none. All work is in existing toolchain.

**Affected files:** `prisma/schema.prisma` (+Study, +StudyImage, +User/Customer/Study back-relations), `TASKS.md` (T-010 → ✅ Recently completed), `DECISIONS.md` (this entry).
**Open question for the user:** —

## 2026-05-20 — T-012 silent decisions per §14 (consolidated)
**Context:** T-012 completes the Slice-2 schema with `GeneratedDocument`, `AuditLog`, and `Setting` models, plus back-relations on `User` and `Study`. The schema is now feature-complete and ready for T-013 migration.

**Assumption / decision:**
- **GeneratedDocument cascades (user-corrected from initial proposal):**
  - `studyId → Study`: `Cascade / Cascade` — DSGVO hard-delete of Study cascades DB rows AND physical PDFs under `./generated/studies/<studyId>/`. Audit trail remains in `AuditLog.action = GENERATE_DOCUMENT`. `studyId` stays NOT NULL.
  - `generatedById → User`: `SetNull / Cascade`. Column type `String?` (nullable). User hard-delete preserves document existence; historical actor identity preserved in AuditLog.userId (also SetNull).
- **AuditLog:**
  - `userId → User`: `SetNull / Cascade` per contract.
  - `entityType` and `action` as `String` columns, not enums — allow-lists enforced in application layer for forward-compatibility without schema migrations.
  - `changeSet Json?` — Prisma 5 with Postgres provider creates `jsonb` by default; no explicit `@db.JsonB` needed. Application-layer convention is per-field tuple `{ "fieldName": [oldValue, newValue], ... }`.
  - No `@updatedAt`, no `updatedAt` column — append-only semantics enforced in application layer (DB triggers deferred to Phase 3 hardening).
  - `organizationId @default("greenscout") @map("organization_id")` — added per DECISIONS contract even though SPEC §5.1 didn't list it, for consistency with other multi-tenant-ready models.
- **Setting:**
  - Three columns: `key @id`, `value`, `updatedAt @updatedAt`.
  - No `organizationId` in MVP (single-tenant); Phase-3 multi-tenant addition.
  - Expected keys documented in model docstring.
- **Back-relation field names:** `User.generatedDocuments GeneratedDocument[]`, `User.auditLogs AuditLog[]`, `Study.documents GeneratedDocument[]`. Noun-led, pluralised. No `@relation("...")` naming needed (no ambiguity — all three new models have exactly one relation each to existing models).
- **`@map` discipline preserved** from T-010/T-011 — non-trivial snake_case mappings only. Single-word `value`, `key`, `format`, `filename`, `action` get no `@map`.
- **Indexes per contract:** GeneratedDocument 1 (`[studyId, generatedAt(sort: Desc)]` for newest-first version history UI in T-040), AuditLog 4 (`[userId]`, `[entityType, entityId]`, `[createdAt(sort: Desc)]`, `[organizationId, createdAt(sort: Desc)]`), Setting 0 beyond `@id`.
- **`ipAddress` and `userAgent` as plain `String?`:** sufficient for V1. `@db.Inet` and `@db.Text` deferred unless length / native-type issues arise.
- **Commit-splitting strategy:** same pragmatic write-then-split approach as T-011. Intermediate states may fail `prisma validate`; Husky doesn't run it; final state validates clean. Six commits in order: (1) T-011 status flip; (2) GeneratedDocument; (3) AuditLog; (4) Setting; (5) User+Study back-relations; (6) this DECISIONS entry.
- **Husky pre-commit hook** fired on all commits, no `--no-verify`.

**Net top-level deps added:** none.

**Affected files:** `prisma/schema.prisma` (+GeneratedDocument, +AuditLog, +Setting, +User back-relations, +Study back-relation), `TASKS.md` (T-011 → ✅ Recently completed), `DECISIONS.md` (this entry).
**Open question for the user:** —

## 2026-05-20 — T-013 silent decisions per §14 (consolidated)
**Context:** T-013 closes Slice 2 by generating the `initial_schema` migration against the local Postgres dev DB and promoting the CI `prisma-migrate-check` job from stub to real.

**Assumption / decision:**
- **Pre-migrate sanity hard-gate verified:** `prisma format` idempotent (no diff on the 255-line clean schema), `prisma validate` exit 0. Re-ran post-migration; both still clean.
- **Local DB setup:** `.env` populated from existing template by replacing the two `REPLACE_ME_LOCALLY_ONLY` placeholders with `greenscout_local_only` (gitignored — never committed). Host-side Postgres 17 was occupying `:5432` (process `postgres.exe` from `C:\Program Files\PostgreSQL\17\`), so `POSTGRES_PORT` and `DATABASE_URL` host-port were rewritten to `5433` (per briefing escape hatch). `docker compose up -d db` brought up `greenscout-db` (postgres:16-alpine) on `127.0.0.1:5433`; healthcheck reported `healthy` within ~15s; `pg_isready -U greenscout -d greenscout_dev` exit 0 ("accepting connections").
- **Migration command:** `npx prisma migrate dev --name initial_schema --skip-seed`. `--skip-seed` because seed is T-015 per user-mandate.
- **No `util.isError` CLI bug this time** — the same Node-24 + Prisma-5.22 pairing that broke `prisma init` in T-009 works fine for `migrate dev`. Migration applied cleanly in a single CLI invocation; `prisma generate` ran as a follow-up step (87ms).
- **Migration file location:** `prisma/migrations/20260520074451_initial_schema/migration.sql` (225 lines) + `prisma/migrations/migration_lock.toml` (provider = postgresql).
- **Generated SQL contents:** 5 `CREATE TYPE ... AS ENUM`, 7 `CREATE TABLE`, 14 `CREATE INDEX`, 2 `CREATE UNIQUE INDEX` (`User_email_key`, `StudyImage_study_id_type_key`), 6 foreign keys with correct ON DELETE per DECISIONS matrix. `@map` snake_case directives realised verbatim in column names (`password_hash`, `consultant_id`, `pacht_eur_pro_kwp`, `co2_fussballfelder_pro_jahr`, etc.). `Decimal(p, s)` precisions match the §7.7 matrix exactly. `JSONB` chosen by Prisma for `AuditLog.change_set` as expected.
- **Cascade verification in migration SQL:**
  - `Study.consultant_id` FK → User: `ON DELETE RESTRICT ON UPDATE CASCADE`
  - `Study.customer_id` FK → Customer: `ON DELETE RESTRICT ON UPDATE CASCADE`
  - `StudyImage.study_id` FK → Study: `ON DELETE CASCADE ON UPDATE CASCADE`
  - `GeneratedDocument.study_id` FK → Study: `ON DELETE CASCADE ON UPDATE CASCADE`
  - `GeneratedDocument.generated_by_id` FK → User: `ON DELETE SET NULL ON UPDATE CASCADE`
  - `AuditLog.user_id` FK → User: `ON DELETE SET NULL ON UPDATE CASCADE`
- **Post-migration verification:** `\dt` showed 8 tables (7 models + `_prisma_migrations`), `\dT+` showed 5 enums with all expected element labels, `SELECT current_user` returned `greenscout`, `SELECT COUNT(*) FROM "User"` returned 0, `npx prisma migrate status` reported "Database schema is up to date!" — matches T-013 acceptance criterion "in sync".
- **`db:generate` after migration:** Prisma Client regenerated explicitly post-migration; 87ms; client now exposes full model accessors (User, Customer, Study, StudyImage, GeneratedDocument, AuditLog, Setting).
- **CI promotion:**
  - Renamed `Prisma migrate (stub — T-013)` → `Prisma migrate`. The status-check name visible in branch protection will change accordingly — user must update the required-status-check list post-merge.
  - Replaced stub echo step with three real steps: `actions/setup-node@v4` (Node 24, npm cache keyed on `package-lock.json`), `npm ci`, `npx prisma migrate deploy`, `npx prisma generate`. The existing Postgres service container block (POSTGRES_USER=greenscout / POSTGRES_PASSWORD=greenscout_ci_only / POSTGRES_DB=greenscout_ci / healthcheck) was preserved verbatim from the T-008 stub.
  - `DATABASE_URL` hard-coded inline as `postgresql://greenscout:greenscout_ci_only@localhost:5432/greenscout_ci?schema=public` on both migrate-deploy and generate steps. Not a secret — ephemeral container, dev-only credentials, never reaches anything real.
- **Branch-protection promotion** — left to the user per CLAUDE.md §8.11 (agent cannot toggle branch protection). After PR merge, the user adds the renamed `Prisma migrate` check to required-status-checks in Settings → Branches → main rule. See "Branch protection on `main` activated" entry for the original promotion-TODOs list.
- **No seed script in T-013** — confirmed deferred to T-015 per user-mandate from schema approval.
- **`db:seed` package.json block** — not added; T-015's job. The existing `package.json` `prisma` section is absent (no `"prisma": { "seed": "..." }` entry yet); leaving as-is.
- **`_prisma_migrations` table** — auto-created by Prisma; expected; no action.
- **Commit-splitting strategy:** four commits in order: (1) T-012 status flip in TASKS.md; (2) migration files; (3) CI workflow promotion; (4) this DECISIONS entry.
- **Husky pre-commit hook fired on all commits**, no `--no-verify`.

**Net top-level deps added:** none.

**Affected files:** `prisma/migrations/20260520074451_initial_schema/migration.sql` (new, 225 lines), `prisma/migrations/migration_lock.toml` (new), `.github/workflows/ci.yml` (prisma-migrate-check job: name + steps), `TASKS.md` (T-012 → ✅ Recently completed; T-013 will be marked complete by the post-merge job), `DECISIONS.md` (this entry).
**Open question for the user:** Promote the renamed `Prisma migrate` job (was `Prisma migrate (stub — T-013)`) to required-status-check in branch protection (CLAUDE.md §8.11 — agent cannot do this).

---

## 2026-05-20 — T-014 silent decisions per §14 (consolidated)
**Context:** T-014 builds the repository helper layer that owns all Prisma access. Per the user's directive, all decisions in this task were silent per §14.2.

**Assumption / decision:**
- **Pattern**: functional, async, exported per entity. No classes.
- **Layout**: `src/lib/repositories/<entity>.repository.ts` + `index.ts` barrel + `with-org.ts` + `transaction.ts`. Singleton at `src/lib/db.ts`.
- **organizationId enforcement**: required first parameter on every function (TypeScript-level), no defaults. Schema-level `@default("greenscout")` is still in place at the DB. `createUser`/`createCustomer`/`createStudy`/`createAuditEntry` all spread `data` first then override `organizationId` with the function parameter, so a caller cannot smuggle a different tenant id through the data payload.
- **`withOrg<T>` helper**: near-no-op sugar with single-seam Phase-3 swap point. Returns `fn(organizationId)`.
- **Transaction support**: `withTransaction(fn)` exports + every repository function accepts optional `tx?: PrismaTransaction` to participate. `PrismaTransaction` aliased to `Prisma.TransactionClient` (available in Prisma 5.22 generated client).
- **Soft-delete**: default filter `deletedAt: null` on reads (User/Customer/Study); opt-in `includeDeleted: true`. Write helpers: `softDelete*` (sets timestamp), `hardDelete*` (Prisma delete, marked `TODO(T-041b)` for DSGVO workflow). Only `hardDeleteUser` exposed in this PR; Customer/Study hard-delete added when the DSGVO admin flow lands.
- **Email normalisation**: User repo's `findUserByEmail`, `createUser`, and `updateUser` (when email is in the patch — both literal-string and `{ set }` operation shapes) all call `normaliseEmail()`.
- **Update-where with organizationId**: Prisma 5.x `UserWhereUniqueInput` etc. accept additional scalar filters via `Prisma.AtLeast<{id, ...}>`. We pass `{ id, organizationId }` so any cross-tenant ID guess silently no-ops instead of mutating a foreign row. No `findFirst → check → update` round-trip needed.
- **Pagination**: default `take: 50`, hard cap `200`. `skip: 0` default. Implemented via a private `clampTake()` helper per repo.
- **Sort**: default `orderBy: { createdAt: 'desc' }` on lists (audit-log: same). Setting list orders by `key ASC`. StudyImage list orders by `type ASC`. GeneratedDocument list orders by `generatedAt DESC` (matches the covering index).
- **Error handling**: Prisma native errors propagate — no custom wrapping in T-014.
- **StudyImage / GeneratedDocument repos**: no `organizationId` param — access control derived from parent Study; documented in module-level JSDoc.
- **Setting repo**: no `organizationId` (MVP single-tenant per schema).
- **AuditLog repo**: append-only — only `createAuditEntry` + `listAuditEntries`, no update/delete functions.
- **ESLint enforcement**: implemented via two-pattern `no-restricted-imports` in the default block (group 1 = `../*` per CLAUDE.md §4.3; group 2 = `@/generated/prisma` + `@/generated/prisma/*`) followed by a trusted-path override that disables `no-restricted-imports` wholesale for `src/lib/db.ts`, `src/lib/repositories/**/*.ts`, and `prisma/seed.ts`. Granular per-pattern overrides aren't possible in flat config — the wholesale-off shape is acceptable because every file in `src/lib/repositories/**` only sibling-imports inside the same folder (no cross-feature `../*` chains possible). Captured deliberate-violation output (rule fires on `src/app/page.tsx` `import { PrismaClient } from "@/generated/prisma"`):
  ```
  src/app/page.tsx
    3:1   error  '@/generated/prisma' import is restricted from being used by a pattern. Import Prisma Client only via @/lib/db (singleton) and run queries through @/lib/repositories/*. Direct Prisma Client access is restricted to the repository layer — see DECISIONS.md T-014  no-restricted-imports
  ```
- **Tests**: 9 co-located `*.test.ts` files (7 repos + with-org + transaction). Vitest API (`describe`/`it`/`expect`/`vi.mock`). Mock the `@/lib/db` singleton in each repo test rather than running real Prisma queries. Idle until T-018 installs Vitest — `tsconfig.json` already excludes `**/*.test.ts(x)`. Tests verify (1) `organizationId` applies to reads + cannot be overridden on writes; (2) soft-delete filter applies by default and is bypassable; (3) `normaliseEmail` is called on every User-repo email path.
- **Function count per entity**: User 12, Customer 5, Study 7, StudyImage 4, GeneratedDocument 2, AuditLog 2, Setting 3. Total 35 functions across 7 repositories + 2 infrastructure helpers (`withOrg`, `withTransaction`).
- **Husky pre-commit hook**: fired on all 7 commits; no `--no-verify`.
- **Dockerfile.web — `npx prisma generate` in builder stage**: required because `src/lib/db.ts` imports `@/generated/prisma`, which is gitignored. The first CI push (`26153916366`) failed the web Docker build with `Cannot find module '@/generated/prisma'` in `next build`. Standard Prisma + Next.js Docker pattern: run `npx prisma generate` after `COPY . .` and before `npm run build` in the builder stage. Local `next build` works because `db:generate` was already run during T-009 — the gap only showed up against a clean Docker context. Fix committed in 064708a; not a §7 pause-trigger (no architectural pivot — just the mechanical Docker-side consequence of introducing the singleton).

**Net top-level deps added:** none.

**Affected files:** `src/lib/db.ts` (new), `src/lib/repositories/**` (16 new files: 7 repository modules + 7 repository tests + with-org + with-org test + transaction + transaction test + index barrel), `eslint.config.mjs` (no-restricted-imports rule extended with Prisma-Client group + trusted-path override block), `Dockerfile.web` (`npx prisma generate` step added in builder stage), `TASKS.md` (T-013 → ✅ Recently completed), `DECISIONS.md` (this entry).
**Open question for the user:** —

---

## 2026-05-20 — T-015 silent decisions per §14 (consolidated)
**Context:** T-015 operationalises the user-approved argon2id policy from the "Password hashing algorithm & parameters (user-confirmed)" entry by creating an idempotent admin seed. Hash parameters and email normalisation come from already-approved entries; the seed itself was explicitly designated §14.2 silent by user directive (in the same instruction that gated T-016 / T-017 as §7.3 pause-triggers).

**Assumption / decision:**
- **argon2 package**: `@node-rs/argon2@2.0.2` — Rust bindings shipped as pre-built binaries for every major platform (Windows x64, macOS arm64+x64, Linux glibc+musl). No node-gyp / no Python build toolchain required, which makes it the robust default for lean CI runners and Windows developer machines. The alternative `argon2` npm package requires C++ build tools at install time and frequently breaks on CI images without a full build chain.
- **argon2 API binding**: type-only import of `Algorithm` (it is declared as `declare const enum`, which `isolatedModules: true` forbids from being referenced as a value). The numeric value `2` is cast to the `Algorithm` type via `2 as Algorithm` — equivalent at runtime, type-safe at compile time, sidesteps the `isolatedModules` error TS2748.
- **argon2 parameters**: SPEC §6.3 baseline (`memoryCost=19456 KiB`, `timeCost=2`, `parallelism=1`, `algorithm=Argon2id`). Runtime override via `PASSWORD_HASH_MEMORY_KIB` / `PASSWORD_HASH_TIME_COST` / `PASSWORD_HASH_PARALLELISM` env vars (already in `.env.example` from T-001). The `getArgon2Params()` helper parses each env var with positive-integer validation and falls back to the SPEC default on missing/invalid input.
- **Hash utility location**: `src/features/auth/utils/hash-password.ts` next to `normalise-email.ts` (T-010 pattern). Exports two pure async functions, `hashPassword(plaintext): Promise<string>` and `verifyPassword(hashString, plaintext): Promise<boolean>`. `hashPassword` throws on empty plaintext (defensive — password-policy rules in T-016 will catch this earlier). `verifyPassword` returns `false` on empty inputs rather than throwing, since callers may be checking arbitrary user input.
- **Hash utility test**: co-located `hash-password.test.ts` with Vitest API. Tests (1) `hashPassword` produces a PHC-string `$argon2id$v=19$m=...,t=...,p=...$`, (2) `hashPassword` rejects empty input, (3) round-trip `hash → verify` returns `true`, (4) mismatched plaintext returns `false`, (5) empty inputs to `verifyPassword` return `false`. Idle until T-018 lands Vitest. Smoke-tested manually via `npx tsx -e` during T-015 implementation — hash output verified as `$argon2id$v=19$m=19456,t=2,p=1$...`, round-trip works.
- **Seed runner**: `tsx@4.22.3` devDep. Prisma's `db seed` command expects a runnable entry; `tsx prisma/seed.ts` is the documented modern pattern.
- **Seed script location**: `prisma/seed.ts` (matches Prisma's `package.json` `"prisma": { "seed": "..." }` convention).
- **ESLint coverage**: `prisma/seed.ts` is already in the ESLint trusted-path override list from T-014. No additional config needed.
- **Idempotency check**: `findUserByEmail(ORG_ID, email, { includeDeleted: true })` — the soft-deleted flag must be opted-in so the seed never re-creates a previously-soft-deleted admin row. If any matching row exists, the script logs `(id=..., deletedAt=...)` and returns 0 with no DB writes.
- **Repository-layer-only Prisma access**: seed uses `createUser` and `findUserByEmail` from the User repository plus `createAuditEntry` from the AuditLog repository. The single direct touch of `@/lib/db` is the final `prisma.$disconnect()` call — necessary because `prisma db seed` would otherwise hang on an open Postgres connection. `prisma/seed.ts` is in the ESLint trusted-path override block from T-014, so `@/lib/db` import passes lint.
- **User defaults on create**: `firstName="Admin"`, `lastName="GreenScout"`, `role="ADMIN"` (string literal — `Prisma.UserCreateInput.role: $Enums.Role` resolves to `'ADMIN' | 'BERATER'`, so the literal is assignable without importing the enum value), `mustChangePassword=true`. organizationId is `"greenscout"` (constant in the seed module). Other fields (`active`, `failedLoginCount`) take Prisma schema defaults (`true`, `0`).
- **Audit log entry on create only**: written via `createAuditEntry()` with `entityType="User"`, `entityId=admin.id`, `action="CREATE"`, `changeSet={ email:[null,...], role:[null,"ADMIN"], mustChangePassword:[null,true] }`. The `user` relation is omitted entirely from the create input — this is a system event with no logged-in actor, and `AuditLog.userId` is nullable. The repository's signature is `Prisma.AuditLogCreateInput` (the "checked" form, where `userId` is not directly settable — only the `user` relation is), so omitting it is the type-clean way to persist `userId=NULL`. DB inspection confirmed `user_id` is NULL on the resulting row.
- **`passwordHash` excluded from changeSet**: per DECISIONS audit-log convention — DB inspection confirmed the JSON has no `passwordHash` field.
- **No audit entry on no-op**: when the seed finds an existing admin and returns early, no AuditLog row is written.
- **Logging**: plain `console.log` to stdout, `console.error` to stderr. Format `[seed] <message>`. Phases: load env → existence check → either no-op or hash + create + audit → done. **The temp password is never logged** (acceptance criterion).
- **Error handling**: `readRequiredEnv()` checks both `undefined` and empty-string-after-trim and `process.exit(1)`s with a clear stderr message pointing to `.env.example`. `.catch()` on `main()` logs the error and sets `process.exitCode = 1`. `.finally()` always calls `prisma.$disconnect()` so the process exits cleanly on both paths.
- **Disconnect Prisma client**: yes, in the final `.finally()` clause. Without it, `prisma db seed` hangs on the open Postgres connection.
- **`package.json` updates**: top-level `"prisma": { "seed": "tsx prisma/seed.ts" }` block + `"db:seed": "prisma db seed"` script.
- **`.dockerignore`**: verified — `prisma/seed.ts` is not excluded. The seed script is not bundled into the runtime Docker image (it ships only in the project source for CI / manual ops), but `prisma/` would already be included in the build context regardless.
- **`docs/prisma.md` update**: new "Seeding the admin user" section with `npm run db:seed` usage, both required env vars (`SEED_ADMIN_EMAIL`, `SEED_ADMIN_TEMP_PASSWORD`), the three optional argon2id tuning vars, idempotency guarantee, and the User + AuditLog rows the seed creates.
- **Local verification (Postgres on `localhost:5433` via `docker compose up -d db`)**:
  - Run 1 stdout: `[seed] loading env... → [seed] checking for existing admin 'consulting@lumina-intelligence.ai'... → [seed] hashing temp password (argon2id)... → [seed] creating admin user... → [seed] admin created (id=cmpe2klgw0000l9djynwm597x). Writing audit entry... → [seed] done. Admin must change password on first login.`
  - Run 2 stdout (idempotent): `[seed] loading env... → [seed] checking for existing admin 'consulting@lumina-intelligence.ai'... → [seed] admin user already exists (id=cmpe2klgw0000l9djynwm597x, deletedAt=—); no-op.`
  - DB inspection: 1 `User` row (email `consulting@lumina-intelligence.ai`, role `ADMIN`, `must_change_password=t`, `deleted_at=null`); 1 `AuditLog` row (`entity_type=User`, `action=CREATE`, `user_id=NULL`, `organization_id=greenscout`, `change_set={"role":[null,"ADMIN"],"email":[null,"consulting@lumina-intelligence.ai"],"mustChangePassword":[null,true]}`).
- **Commit chunking**: (1) T-014 status flip in `TASKS.md`; (2) `feat(auth): hash-password utility with @node-rs/argon2 SPEC §6.3 baseline` (includes both deps + utility + test); (3) `feat(seed): idempotent admin seed via prisma db seed`; (4) `docs(prisma): document admin seed in docs/prisma.md`; (5) this DECISIONS entry.
- **Husky pre-commit hook fired on all commits**, no `--no-verify`.

**Net top-level deps added:** `@node-rs/argon2` (dependencies), `tsx` (devDependencies). Both pre-approved per user directive that T-015 is §14.2 silent and per the already-approved policy in the "Password hashing algorithm & parameters" entry (argon2id was user-confirmed at SPEC §6.3 review) plus the Prisma-recommended convention for `prisma db seed` runners.

**Affected files:** `package.json` (deps + prisma block + db:seed script), `package-lock.json`, `prisma/seed.ts` (new), `src/features/auth/utils/hash-password.ts` (new), `src/features/auth/utils/hash-password.test.ts` (new), `docs/prisma.md` (new section), `TASKS.md` (T-014 → ✅ Recently completed), `DECISIONS.md` (this entry).
**Open question for the user:** —

---

## 2026-05-20 — T-016 password-policy module design (user-confirmed, binding)
**Context:** §7.3 pause-trigger — user-reviewed the agent's design proposal for the auth-security module before any code lands. Four explicit decision-points were resolved + one corrective directive on test ordering. This entry is the **binding contract** for T-016 implementation (which won't start until T-015b — Vitest-setup — has merged first).

**Assumption / decision:**

### Module structure
- **Public surface**: `src/features/auth/password-policy.ts`. All auth-security consumers (T-017 Auth.js, T-018 Login UI, T-019 forced password change, T-020 lockout, T-041b admin reset) import exclusively from here.
- **Re-exports** from existing `src/features/auth/utils/hash-password.ts` (T-015 implementation stays — single source of code, single source of constants).
- **Refactor**: `getArgon2Params()` in `hash-password.ts` now consumes constants exported from `password-policy.ts` instead of carrying its own env-fallback logic. Result: one source of truth for argon2 parameters.
- **Test coverage**: 100% required on `src/features/auth/password-policy.{ts,test.ts}` (acceptance criterion). Per the user's corrective directive, T-016 ships only when this is **CI-verified green** — see "Test-ordering correction" below.

### Constants (one canonical export)
```
PASSWORD_HASH_MEMORY_KIB    // default 19456, env-overridable
PASSWORD_HASH_TIME_COST     // default 2, env-overridable
PASSWORD_HASH_PARALLELISM   // default 1, env-overridable
MIN_PASSWORD_LENGTH         // 8
```
Env-var names match `.env.example` (not the stale `ARGON_*` names in T-016's TASKS description).

### Rule predicates — Unicode-aware (decision (a) Alt)
```
SPECIAL_CHAR_RE = /[^\p{L}\p{N}]/u    // not letter, not number
UPPER_RE        = /\p{Lu}/u            // any Unicode uppercase letter
LOWER_RE        = /\p{Ll}/u            // any Unicode lowercase letter
```
Rationale: ä/ö/ü/ß etc. count as letters (not as special), and `Á`/`á` count as upper/lower respectively. Consistently Unicode-bewusst — no ASCII/Unicode mixing. Digit-rule stays `[0-9]` (digits are unambiguous).

### Rule shape — i18n now (decision (b) Alt)
- `password-policy.ts` is **string-frei**. `PasswordRule` carries only `key` (stable identifier) + `test` (predicate). NO `label`.
- `validatePassword(input)` returns `{ ok, rules: Array<{ key, ok }> }` — no `label`.
- German labels live in **`src/i18n/de.ts`** (newly created in T-016 if it doesn't exist by then — preempts T-049 partially). Five keys: `auth.password.rule.min-length`, `auth.password.rule.upper`, `auth.password.rule.lower`, `auth.password.rule.digit`, `auth.password.rule.special`. Values are the German strings from the original proposal.
- UI maps `rule.key → t(rule.key)` to render. T-049 expands `src/i18n/de.ts` to the full dictionary later; the 5 password keys are an early seed.

### Hashing API — re-exported verbatim from T-015
- `hashPassword(plaintext: string): Promise<string>` — unchanged.
- `verifyPassword(hash: string, plaintext: string): Promise<boolean>` — signature `(hash, plaintext)` retained from T-015 (matches `@node-rs/argon2` API + crypto-library convention). T-016's TASKS description had `(plaintext, hash)` reversed — IGNORED, stale text.

### bulk validation
```
interface PasswordValidationResult {
  ok: boolean;
  rules: Array<{ key: PasswordRule["key"]; ok: boolean }>;
}
function validatePassword(input: string): PasswordValidationResult;
```
Pure sync (no async). Server-side gate calls `validatePassword(input).ok` before `hashPassword(input)`. UI maps `result.rules` for the live checklist (rot/grün).

### Deferred to Phase 4 V2 / Phase 5 V3 (decisions (c) + (d) Vorschlag)
- **No common-password blocklist** in MVP — added to TASKS.md `## Future (Phase 3+)` section.
- **No password-history** in MVP — added to TASKS.md `## Future (Phase 3+)` section. Would require new `PasswordHistory` table → schema change → §7-pause. V2.

### Lockout constants — NOT in T-016
Stay with T-020 (Lockout state machine). The `LOCKOUT_*` env vars in `.env.example` are unused until T-020.

### Test-ordering correction (user-mandated)
T-016 may NOT ship non-running test files. Vitest + React Testing Library + coverage config must be installed and CI-active **before or with** T-016. User-approved §2-stack — installation is not a §7.1 trigger.

**§14.2 silent decision**: insert **T-015b "Vitest + RTL + coverage setup"** as a separate PR **before** T-016 (instead of bundling). Rationale: 12 pre-written idle test files (normalise-email, hash-password, with-org, transaction, 7 repo tests) become live for the first time — a dedicated infra PR reviews cleaner than a mixed "infra + auth-module" PR. T-016 stays focused on auth-policy logic + the new password-policy.test.ts file. Sequence: T-015b → merge → T-016 → merge.

**Affected files (when T-016 implements, post-T-015b):** `src/features/auth/password-policy.ts` (new), `src/features/auth/password-policy.test.ts` (new — 100% coverage), `src/features/auth/utils/hash-password.ts` (refactor to consume policy constants), `src/features/auth/utils/hash-password.test.ts` (adjust to refactor), `src/i18n/de.ts` (new — 5 password rule keys), `TASKS.md` (T-015b → ✅), `DECISIONS.md` (T-016 consolidated implementation entry).
**Open question for the user:** —

---

## 2026-05-20 — T-015b inserted into backlog (Vitest + RTL + coverage setup)
**Context:** User's test-ordering correction in the T-016 design review mandated that Vitest infrastructure must be CI-active before T-016 can ship its test file. User explicitly delegated the "insert separate vs bundle into T-016" choice to the agent (§14.2).

**Assumption / decision:** New task **T-015b** inserted into TASKS.md between T-015 (current last DONE) and T-016 (next blocked). Scope:

1. Install `vitest`, `@vitejs/plugin-react`, `@vitest/coverage-v8`, `jsdom` (or `happy-dom`), `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event` — all SPEC §2-named, plugins-of-approved-framework per §14.3.
2. Create `vitest.config.ts` with:
   - environment `jsdom`
   - coverage provider `v8`
   - global thresholds: **80% lines/branches/functions/statements** (SPEC §5.2)
   - per-path threshold: **100% on `src/lib/calculations/**`** (SPEC §5.2 — currently empty path, no-op until T-031 lands calc module)
   - includes setup file for `@testing-library/jest-dom` matchers
3. Re-include `**/*.test.ts(x)` in `tsconfig.json` (T-010 had excluded these — Vitest's own resolution doesn't need tsconfig include, but `tsc --noEmit` needs to typecheck test files).
4. `package.json` scripts: `test`, `test:watch`, `test:coverage`.
5. Promote CI workflow's `web-tests` job: rename `Vitest (stub — T-018)` → `Vitest`, replace stub echo with real `npm run test:coverage` + coverage upload artifact.
6. Verify all 12 existing idle test files run and pass:
   - `src/features/auth/utils/normalise-email.test.ts` (T-010)
   - `src/features/auth/utils/hash-password.test.ts` (T-015)
   - `src/lib/repositories/with-org.test.ts` (T-014)
   - `src/lib/repositories/transaction.test.ts` (T-014)
   - 7 repository tests: user / customer / study / study-image / generated-document / audit-log / setting
7. If any test fails, fix the test (not the source) — the source has shipped to main and is presumed correct. Surface fixes in DECISIONS.

**Branch protection promotion required from user after T-015b merge**: add `Vitest` (renamed from stub) to required-status-checks. Same pattern as `Prisma migrate` promotion after T-013.

**Affected files:** `package.json` (+8 devDeps), `package-lock.json`, `vitest.config.ts` (new), `tsconfig.json` (re-include tests), `.github/workflows/ci.yml` (job rename + real Vitest run + coverage artifact), `TASKS.md` (T-015 → ✅ + T-015b new + Future Phase-3+ entries for blocklist/history), `DECISIONS.md` (this + T-016 design entries land via the T-015b PR carry-forward).

**Open question for the user:** — (a) The branch-protection promotion of `Vitest` to required-status-check (post-merge, §8.11 admin action). (b) Possible fix-test churn if any of the 12 idle tests fail on first real run.

---

## 2026-05-20 — T-015b silent decisions per §14 (consolidated)
**Context:** T-015b installs Vitest + RTL + coverage infrastructure and activates 11 pre-existing idle test files (T-010 wrote `normalise-email.test.ts` ahead of Vitest; T-014 wrote 9 repository-layer tests; T-015 wrote `hash-password.test.ts`). Per the user's correction during T-016 design review, this PR must merge before T-016 can ship its first new test.

**Assumption / decision:**
- **Vitest version**: 4.1.7 (current latest stable as of 2026-05-20). SPEC §2 names "latest stable". Vitest 4.x is a stable major release with the same surface area as v3 + a new default reporter; nothing in our tests needed migration.
- **DOM environment**: `jsdom` 29.1.1 (more complete than happy-dom). Vitest default companion.
- **Coverage provider**: `@vitest/coverage-v8` 4.1.7 (faster than istanbul, built-in Node V8 coverage, official Vitest plugin).
- **React-test stack**: `@testing-library/react` 16.3.2 + `@testing-library/jest-dom` 6.9.1 + `@testing-library/user-event` 14.6.1 + `@vitejs/plugin-react` 6.0.2 — all SPEC-named.
- **Vitest config**: `vitest.config.ts` at repo root. `environment: jsdom`, `globals: true`, `setupFiles: ["./vitest.setup.ts"]`. Path alias `@` → `src/`.
- **Setup file**: `vitest.setup.ts` imports `@testing-library/jest-dom/vitest` to extend `expect` matchers.
- **Coverage thresholds**: global 80% (lines/branches/functions/statements) + 100% on `src/lib/calculations/**` per SPEC §5.2. Calculations path is currently empty (T-031 lands it) — Vitest no-ops per-pattern thresholds when path matches zero files.
- **Coverage scope refinement (additional §14.2 silent decision)**: the briefing's draft used `include: ["src/**/*.{ts,tsx}"]` which pulled in Next.js `app/`, shadcn `components/ui/`, and other UI scaffold lacking tests today, dropping global coverage to ~41% and failing the 80% gate. Per SPEC §5.2's spirit ("80% global on logic code"), narrowed `include` to: `src/lib/**`, `src/features/**/{services,utils,schemas,hooks}/**`, and `src/features/**/*-policy.{ts,tsx}`. Excluded `src/lib/db.ts` (Prisma singleton — wiring, no logic) and `**/example.ts` (T-001 scaffold placeholders). Result: 92.62% statements / 89.71% branches / 95.83% functions / 92.98% lines — all above 80%. UI components and Next.js route shells will enter coverage scope as their feature PRs (T-018+, T-022+, etc.) land with co-located component tests; Playwright E2E (T-051a/b) covers route shells end-to-end.
- **Coverage excludes**: `src/generated/**`, `src/**/*.test.{ts,tsx}`, `src/**/*.d.ts`, `src/i18n/**`, `src/lib/db.ts`, `**/example.ts`, `**/*.config.{js,mjs,ts}`.
- **tsconfig**: removed `**/*.test.ts(x)` from `exclude` (T-010 had added it). Added `types: ["vitest/globals", "@testing-library/jest-dom"]` to `compilerOptions` so global `describe`/`it`/`expect` and DOM matchers resolve under `tsc --noEmit`.
- **npm scripts**: `test` → `vitest run`, `test:watch` → `vitest`, `test:coverage` → `vitest run --coverage`.
- **CI workflow promotion**: `web-tests` job renamed `Vitest (stub — T-018)` → `Vitest`. Real steps: `actions/checkout@v4` → `actions/setup-node@v4` (Node 24, npm cache) → `npm ci` → `npx prisma generate` (test imports transitively pull `@/lib/db` which imports `@/generated/prisma`) → `npm run test:coverage` → upload coverage artifact `actions/upload-artifact@v4` (name `coverage-report`, path `coverage/`, 7-day retention, `if: always()` so failures still publish). Also removed the now-obsolete "Coverage thresholds (stub — T-018)" echo step from `lint-typecheck`. Section comment in `ci.yml` updated from "Stubs for tooling not yet installed" (plural) to "Stub for tooling not yet installed" (singular — only the Playwright stub remains).
- **Test files activated**: 11 (briefing anticipated 12 incl. `prisma/seed.test.ts`, but T-015 shipped without one — the seed currently has no co-located test, tracked implicitly in T-015's history). Files: `src/features/auth/utils/normalise-email.test.ts`, `src/features/auth/utils/hash-password.test.ts`, `src/lib/repositories/with-org.test.ts`, `src/lib/repositories/transaction.test.ts`, `src/lib/repositories/user.repository.test.ts`, `src/lib/repositories/customer.repository.test.ts`, `src/lib/repositories/study.repository.test.ts`, `src/lib/repositories/study-image.repository.test.ts`, `src/lib/repositories/generated-document.repository.test.ts`, `src/lib/repositories/audit-log.repository.test.ts`, `src/lib/repositories/setting.repository.test.ts`.
- **Test results on first real run**: 11/11 files pass, 69/69 assertions pass. Zero test-side fixes required — all files already use the Vitest API (`vitest` imports, `vi.mock`, `vi.fn`, `beforeEach`, etc.) per T-010/T-014/T-015's "Vitest API-style" foresight.
- **Coverage on first run**: statements 92.62% (113/122), branches 89.71% (157/175), functions 95.83% (46/48), lines 92.98% (106/114). All four metrics above the 80% global threshold. Uncovered surface: `hash-password.ts` lines 40-42 (env-override fallback paths exercised only when env vars are set — T-016 will land env-override tests as part of password-policy.test.ts), `repositories/transaction.ts` line 29 (the `withTransaction` runtime body, exercised by integration tests that arrive with T-017+ auth flows).

**Net top-level deps added**: 7 devDependencies — `vitest` 4.1.7, `@vitejs/plugin-react` 6.0.2, `@vitest/coverage-v8` 4.1.7, `jsdom` 29.1.1, `@testing-library/react` 16.3.2, `@testing-library/jest-dom` 6.9.1, `@testing-library/user-event` 14.6.1. All SPEC §2-named, all plugins-of-approved-framework per §14.3 (Vitest is the "Test (TS unit)" stack named in §2).

**Affected files**: `package.json` (+7 devDeps + 3 scripts), `package-lock.json`, `vitest.config.ts` (new), `vitest.setup.ts` (new), `tsconfig.json` (`**/*.test.ts(x)` removed from `exclude`, `types` added), `.github/workflows/ci.yml` (`web-tests` job promoted, stub echo removed from `lint-typecheck`, section comment updated), `TASKS.md` (T-015 → ✅ Recently completed, T-015b/T-016/Future entries already dirty pre-PR), `DECISIONS.md` (this entry; the T-016 design + T-015b insertion entries were pre-dirty and carry forward in this PR).
**Open question for the user**: Add `Vitest` (renamed job) to required-status-checks on `main` branch protection after merge (§8.11 — admin-only). This would make 8 required checks total. Same workflow as `Prisma migrate` promotion after T-013 merged.

---

## 2026-05-20 — T-016 password-policy module implementation (consolidated)
**Context:** T-016 implements the user-approved design from the prior "T-016 password-policy module design (user-confirmed, binding)" DECISIONS entry. This entry captures the concrete execution choices made during implementation.

**Assumption / decision:**
- **Cycle avoidance via constants extraction**: Created `src/features/auth/password-constants.ts` as the single source of truth for `PASSWORD_HASH_*` and `MIN_PASSWORD_LENGTH`. Both `password-policy.ts` and `utils/hash-password.ts` consume from there. Avoids the circular-import structure that would arise from `password-policy.ts` re-exporting from `hash-password.ts` while `hash-password.ts` reads constants from `password-policy.ts`. `password-policy.ts` re-exports the constants verbatim so the public surface remains the canonical import target for all auth consumers.
- **`password-policy.ts` is string-frei** per the approved design — only `key`+`test` rule shape, no labels. Labels in `src/i18n/de.ts`.
- **i18n seed in `src/i18n/de.ts`**: 5 keys (`auth.password.rule.{min-length,upper,lower,digit,special}`) with German values. Exports a typed `t(TranslationKey)` helper so compile-time-unknown keys fail typecheck. Flat-key namespace structure compatible with T-049's full migration to a proper i18n library (next-intl or similar).
- **Unicode-aware predicates**: `\p{Lu}` for upper, `\p{Ll}` for lower, `[0-9]` for digit, `/[^\p{L}\p{N}]/u` for special — German umlauts and accented letters are correctly categorised; Arabic-Indic digits are recognised as digits (not as special).
- **`Object.freeze(passwordRules)`** + readonly types: defence against accidental mutation in consumers. Test verifies `Object.isFrozen(passwordRules) === true`.
- **`validatePassword`** returns `{ ok, rules: PasswordRuleResult[] }`. Pure synchronous; no async, no I/O. Rules order in the result matches `passwordRules` order — verified by test.
- **Vitest per-pattern 100% threshold** on `src/features/auth/password-policy.ts`: enforces user mandate "T-016 mergt erst, wenn password-policy.test.ts mit 100% Coverage in CI grün läuft". Added alongside the dormant `src/lib/calculations/**` 100% threshold from T-015b. Coverage on first run: lines 13/13, functions 8/8, statements 14/14, branches 0/0 — all 100%.
- **`src/i18n/**` stays in `coverage.exclude`** (inherited from T-015b) — `t()` is a trivial property accessor; the co-located `de.test.ts` verifies dictionary integrity + lookup behaviour without coverage attribution. Consistent with §14.2 "data + trivial accessor" treatment.
- **`password-constants.ts` not in `coverage.include`** — same rationale as i18n: pure constants + a single `parseIntEnv` helper. Not matched by the current `*-policy.{ts,tsx}` pattern. Adding `*-constants.{ts,tsx}` to the include would pull in zero coverage on `parseIntEnv` branches (env-override paths are exercised at runtime, not unit-tested) and would require env-stubbing module-cache gymnastics. Acceptable: the runtime-env-override path is exercised in production deployment via `.env` and is not the subject of T-016's acceptance.
- **hash-password.ts refactor**: imports `PASSWORD_HASH_*` constants from `password-constants.ts` via the `@/features/auth/password-constants` alias (ESLint `no-restricted-imports` rejects `../password-constants` per §4.3 — relative parent traversal). Public API unchanged (`hashPassword(plaintext)` and `verifyPassword(hash, plaintext)`). Existing `hash-password.test.ts` continues to pass unchanged (5/5 assertions). The previously uncovered `parseIntEnv` lines (T-015b coverage report flagged lines 40-42) moved to `password-constants.ts`; `hash-password.ts` now reports 100% coverage (lines 7/7, branches 6/6, functions 3/3, statements 8/8).
- **Test suite scope**: 27 assertions across 16 `it()` blocks on `password-policy.test.ts` (5 rule predicates × 3+ cases each — ASCII/Unicode/reject — plus `validatePassword` aggregation + `Object.freeze` + constants sanity); 2 assertions on `de.test.ts`. Vitest run: 13 test files / 96 tests / all pass.
- **`prisma/seed.ts` import path**: unchanged — still imports from `@/features/auth/utils/hash-password`. The re-export through `password-policy.ts` is purely additive; existing call sites stay legal.

**Net top-level deps added**: none.

**Affected files**: `src/features/auth/password-constants.ts` (new — argon2 constants + `MIN_PASSWORD_LENGTH` + `parseIntEnv` helper), `src/features/auth/password-policy.ts` (new — rule predicates + `validatePassword` + re-exports from constants module + hash-password), `src/features/auth/password-policy.test.ts` (new — 100% coverage on `password-policy.ts`), `src/features/auth/utils/hash-password.ts` (refactor — consume constants from `password-constants.ts`), `src/features/auth/utils/hash-password.test.ts` (unchanged; verified still passes 5/5), `src/i18n/de.ts` (new — 5 password-rule keys + typed `t()` helper), `src/i18n/de.test.ts` (new — dictionary integrity + lookup), `vitest.config.ts` (per-pattern 100% threshold added on `src/features/auth/password-policy.ts`), `TASKS.md` (T-015b → ✅ Recently completed), `DECISIONS.md` (this entry).
**Open question for the user:** —
