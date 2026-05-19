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
- **`gitleaks/gitleaks-action@v2`** with `fetch-depth: 0` so the scan covers full history, not just the PR diff. The action reads `.gitleaks.toml` automatically via `GITLEAKS_CONFIG` env var. No `GITLEAKS_LICENSE` needed (this repo is small / not enterprise-tier).
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
