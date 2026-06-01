import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Vitest configuration for the Next.js workspace.
//
// - `environment: jsdom` so React component tests work without a
//   per-file `// @vitest-environment jsdom` directive.
// - `globals: true` so `describe`/`it`/`expect`/`vi` resolve without an
//   explicit import — the existing test files import them anyway, both forms
//   coexist fine.
// - `setupFiles` extends `expect` with @testing-library/jest-dom matchers
//   (`toBeInTheDocument`, `toHaveTextContent`, …).
// - Path alias `@/` mirrors `tsconfig.json` so test imports of `@/lib/db`,
//   `@/lib/repositories/*`, `@/features/*` resolve identically to app code.
//
// Coverage thresholds enforce CLAUDE.md §5.2:
//   * 80% global across lines / branches / functions / statements
//   * 100% on `src/lib/calculations/**` — the calculations module ships in
//     T-031; Vitest no-ops per-pattern thresholds when the path matches zero
//     files, so this rule is dormant until then.
//
// Coverage scope (T-024b): `include` is the whole `src/**/*.{ts,tsx}` tree.
// The "global 80%" gate from CLAUDE.md §5.2 / SPEC §5.2 measures the
// entire authored TypeScript surface as denominator — not a curated
// allow-list. Files that legitimately do not belong in the unit-coverage
// number live in `exclude` below, each with a one-line `//` justification.
// Route-shells under `src/app/**` are intentionally excluded because they
// are exercised end-to-end by Playwright (T-051a/b), not unit tests, per
// the strategy locked in by T-015b.

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov", "json-summary"],
      // T-024b — coverage scope flipped from a curated opt-in allow-list
      // to the entire `src/**` tree. The global 80% gate now measures the
      // full authored TypeScript denominator (auth actions, every
      // `components/` directory, app-shell, etc. — anything that lives
      // under `src` and is not in `exclude` below). See DECISIONS.md →
      // "T-024b — Coverage gate honesty (binding)".
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/generated/**", // Prisma generated client — vendored, not authored by us.
        "src/**/*.test.{ts,tsx}", // Test files themselves — they are the measurement, not the measured.
        "src/**/*.d.ts", // Declaration files — no executable code.
        "src/i18n/**", // i18n dictionary — strings, not logic.
        "src/lib/db.ts", // Prisma singleton — wiring, no branchable logic.
        "src/components/ui/**", // shadcn-generated primitives — vendored, not authored by us.
        "src/app/**", // Next.js route shells — exercised end-to-end by Playwright (T-051a/b), kept out of unit-coverage by design.
        "**/*.config.{js,mjs,ts}", // Config files (next.config, tailwind.config, vitest.config, etc.) — declarative.
        "**/example.ts", // T-001 scaffold placeholders, removed when real code lands.
      ],
      thresholds: {
        // Global SPEC §5.2 baseline.
        lines: 80,
        branches: 80,
        functions: 80,
        statements: 80,
        // 100% on the calculation logic per SPEC §5.2. Path is empty
        // until T-031 lands `src/lib/calculations/`; Vitest no-ops the
        // per-pattern threshold when zero files match.
        "src/lib/calculations/**": {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
        // 100% on the password-policy module per T-016 user mandate
        // ("T-016 mergt erst, wenn password-policy.test.ts mit 100% Coverage
        // in CI grün läuft"). See DECISIONS.md → "T-016 password-policy
        // module design (user-confirmed, binding)".
        "src/features/auth/password-policy.ts": {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
        // 100% on the T-017 authorize-credentials service per
        // DECISIONS T-017 corrective ②. The counter-based lockout
        // state machine is security-critical; every branch (counter
        // == 5, == 10, > 10, locked, soft-deleted, inactive,
        // non-existent) is covered.
        "src/features/auth/services/authorize-credentials.ts": {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
        // 100% on the admin-alerts stub. Cheap to maintain at 100%
        // (single function, 3 tests). T-020 will replace the no-op
        // body with a real SMTP send; the threshold catches any
        // regression in shape of the audit row at that point.
        "src/features/auth/services/admin-alerts.ts": {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
        // 100% on the T-019 change-password service per DECISIONS T-019
        // ("Vitest per-pattern thresholds (binding)") — auth-security
        // critical, every branch (locked, counter 1/5/9/10/11,
        // same-as-current, rules-not-satisfied, forced-success,
        // voluntary-success) is covered by change-password.test.ts.
        "src/features/auth/services/change-password.ts": {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
        // 100% on the T-019 password-rule-checklist component per
        // DECISIONS T-019 — reusable across T-019 / T-041b / future
        // signup. All three states (neutral / passed / not-passed) and
        // every rule branch are covered by
        // password-rule-checklist.test.tsx.
        "src/features/auth/components/password-rule-checklist.tsx": {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
        // 90% on the T-021 middleware. `applySecurityHeaders` is
        // unit-tested in middleware.test.ts; the auth-routing branches
        // (isPublicPath / session presence / mustChangePassword
        // redirect) are exercised end-to-end by Playwright in T-051a,
        // which is why the threshold is 90% rather than 100%.
        "src/middleware.ts": {
          lines: 90,
          branches: 90,
          functions: 90,
          statements: 90,
        },
        // 100% on the T-023 customer Server Actions per DECISIONS
        // T-023 ("per-pattern Vitest thresholds"). Multi-tenant
        // safety (the `findCustomerById` ownership check) +
        // audit-log writes are critical paths; every branch (no
        // session, validation, not-found, no-op diff, happy path,
        // repo-throws, header-absent) is covered by the co-located
        // *.test.ts.
        "src/features/customers/actions/create-customer.ts": {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
        "src/features/customers/actions/update-customer.ts": {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
        // 100% on the T-024 soft-delete-customer Server Action.
        // Multi-tenant ownership check + audit-log write + the
        // idempotency short-circuit are all security-critical; every
        // branch (zod-fail, no-session, not-found, already-deleted,
        // happy path, repo race-loss, repo-throws, header absent) is
        // covered by soft-delete-customer.test.ts.
        "src/features/customers/actions/soft-delete-customer.ts": {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
        // T-024b — 100% on the auth Server Actions. Same trust-boundary
        // class as `src/features/customers/actions/**`: they wrap
        // FormData → schema → service / Auth.js → typed result. Every
        // branch (schema-parse failure, signIn errors {LockedAccountError,
        // AccountUnavailableError "deleted"/"inactive", AuthError,
        // generic}, happy path; for change-password: no-session,
        // service-error vs ok → unstable_update, header extraction
        // with/without `x-forwarded-for`) is covered by the new
        // co-located *.test.ts files.
        "src/features/auth/actions/sign-in.ts": {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
        "src/features/auth/actions/change-password.ts": {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
        "src/features/auth/actions/sign-out.ts": {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
        // T-025/T-026/T-028 — 100% on the studies Server Actions.
        // Same trust-boundary class as the customer actions: they
        // wrap raw input → schema → repository → audit + revalidate.
        // Multi-tenant ownership + state-machine validation are
        // security-critical; every branch is covered by the co-
        // located *.test.ts files.
        "src/features/studies/actions/create-study.ts": {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
        "src/features/studies/actions/update-study.ts": {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
        "src/features/studies/actions/transition-status.ts": {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
        "src/features/studies/actions/soft-delete-study.ts": {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
        // T-040 — 100% on the generate-document Server Action.
        // Same trust-boundary class as the other studies actions: input
        // -> session -> repo lookups -> pyservice call -> persist +
        // audit. Every branch (validation, no-session, not-found,
        // forbidden, BERATER vs ADMIN, DRAFT-gate, missing customer /
        // consultant, pyservice failure, fallback-name paths,
        // co2-override propagation, server-throws, missing headers)
        // is covered by generate-document.test.ts.
        "src/features/studies/actions/generate-document.ts": {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
        // §7.10-Pivot PR 3 — `generate-document-phrases.ts` entfernt.
        // Phrase-Logik lebt jetzt in den React-Slides (`format.ts`),
        // d. h. die D1+D2+D3-Phrase-Schwelle ist redundant geworden.
        // Siehe DECISIONS 2026-06-01 PR 3.
        // T-035 — 100% on the Python service client. Trust-boundary
        // class: outbound HTTP with shared-secret auth + camel/snake
        // translation. Every branch (env-resolve happy/missing-URL/
        // missing-key/invalid-timeout, fetch happy/401/422/500/400/
        // 501/timeout/network, JSON-parse fallback, all three
        // endpoints including the Slice-3a 501 stub path and the
        // Slice-4 callProcessImage path) is covered by the co-located
        // python-service-client.test.ts.
        "src/lib/python-service-client.ts": {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
        // T-029a — 100% on the image-upload service. Trust-boundary
        // class: multipart bytes from the route handler → magic-bytes
        // sniff → ownership-checked repository write → Python service
        // → audit-log. Every branch (validation/ownership/oversize/
        // unsupported-MIME/magic-mismatch/server-write-fail/pyservice-
        // 422/pyservice-400/pyservice-timeout/dimensions-too-large/DB-
        // upsert-fail/audit-fail/replacement-cleanup/admin-god-mode)
        // is covered by the co-located upload-image.test.ts.
        "src/features/studies/services/upload-image.ts": {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
        // T-029a — 100% on the StudyImageUpload widget. Trust-boundary
        // class: HTML5 drag-drop / file-picker / fetch → typed
        // result → toast. Every branch (BEFORE/AFTER slot, empty/
        // preview tile, drag enter/leave/over/drop, file-input change,
        // disabled, error-code → German toast, replacement upload)
        // is covered by the co-located study-image-upload.test.tsx.
        "src/features/studies/components/study-image-upload.tsx": {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
        // T-030 — 100% on the handover-study Server Action. Same
        // trust-boundary class as the other studies actions: input →
        // session → repo lookups → audit + revalidate. Every branch
        // (validation, no-session, not-found, BERATER vs ADMIN, target
        // missing / inactive, idempotent no-op, happy path, audit
        // attribution to the session user, server-throws, missing
        // headers) is covered by handover-study.test.ts.
        "src/features/studies/actions/handover-study.ts": {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
        // Hotfix — 100% on the upload-study-image Server Action.
        // FormData → service adapter that replaced the multipart
        // Route Handler at `POST /api/uploads` for the browser path
        // (production nginx returned 502 on the latter; Server
        // Actions go through fine). Trust-boundary glue: session
        // gate, FormData parsing (every missing/invalid field
        // branch), header extraction, role mapping, revalidatePath,
        // service-result forwarding (happy + every error code). All
        // branches covered by upload-study-image.test.ts.
        "src/features/studies/actions/upload-study-image.ts": {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
        // T-030 — 100% on the can-access-study helper. The single
        // source of truth for F7 admin god-mode + F6 ownership; every
        // branch (no session, no user object, ADMIN, owner, foreign
        // berater) is covered by can-access-study.test.ts.
        "src/features/auth/utils/can-access-study.ts": {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
        // T-041a — 100% on the admin user-management Server Actions.
        // Same trust-boundary class as the customers + studies
        // actions: input → session → admin-role gate → repo write →
        // audit. Every branch (no session, non-admin, schema
        // validation, email-taken, idempotent no-op, self-deactivate
        // guard, happy path, server-throws, missing headers) is
        // covered by the co-located *.test.ts files.
        "src/features/users/actions/create-user.ts": {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
        "src/features/users/actions/update-user.ts": {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
        "src/features/users/actions/deactivate-user.ts": {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
        // §7.10-Pivot PR 2 — 100% on the document data assembler. It's
        // the single source of truth for "what data goes into a slide
        // render" and is reused by the PR 3 PDF endpoint + PR 4 public
        // online view. Every branch (study/customer/consultant missing,
        // images empty/before-only/both, co2Override propagation,
        // multi-tenant filter) is covered by the co-located
        // build-document-data.test.ts.
        "src/features/studies/document/services/build-document-data.ts": {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
        // §7.10-Pivot PR 3 — 100% on the Playwright PDF-Renderer. Trust-
        // boundary class: process-boundary call into Chromium with a
        // shared-secret header. Every branch (missing/empty token, launch
        // happy path with correct viewport + token + viewport + URL +
        // port + URL-encoding + font wait + pdf options + mkdir, non-OK
        // response with diagnostics, null response, page.pdf throws with
        // browser.close cleanup, close-throws-swallowed, launch fails
        // without close) is covered by render-pdf.test.ts.
        "src/features/studies/document/services/render-pdf.ts": {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
        // §7.10-Pivot PR 2 — 80% per-pattern on the document feature
        // module overall. The 19 slide components + the SlideFrame +
        // ImageSlot + the German number formatters all live here; the
        // smoke tests in slides.test.tsx + format.test.ts +
        // slide-frame.test.tsx + document.test.tsx exercise every
        // branch (image-empty / empty-flurstueck / both-termine vs
        // none / co2-override / chart with 3 szenarios). 80% leaves
        // room for tiny cosmetic branches without forcing 100% per
        // file.
        "src/features/studies/document/**": {
          lines: 80,
          branches: 80,
          functions: 80,
          statements: 80,
        },
      },
    },
  },
});
