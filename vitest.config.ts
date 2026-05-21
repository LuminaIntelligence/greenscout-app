import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Vitest configuration for the Next.js workspace.
//
// - `environment: jsdom` so React component tests (T-018+) work without a
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
// Coverage scope (`include`) targets **business-logic code** — repositories,
// feature services, auth utilities, calculation modules, etc. Presentational
// UI scaffolding (Next.js `app/`, `components/`, `components/ui/`) is excluded
// because: (a) `components/ui/` is shadcn-generated primitives we don't
// modify; (b) `app/` is route shells exercised end-to-end by Playwright
// (T-051a/b), not unit tests; (c) `components/` will be covered piece-by-piece
// as feature components land with their own React Testing Library tests. The
// `feature/**/components/**` slice is excluded for the same reason — those
// arrive with T-018, T-022, T-028, etc. and get co-located component tests.
// This scope mirrors how Vitest projects typically interpret a "80% global"
// SPEC clause: 80% of the *tested* logic surface, not 80% of every file the
// build produces.

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
      // Scope: business-logic surface (see file-level comment above).
      // Components are normally excluded — they get covered piece-by-piece
      // by their own RTL tests as features land. EXCEPT: any
      // `-checklist.tsx` / `-policy-*.tsx` pattern files that ship as
      // reusable auth-security primitives (T-019 password-rule-checklist
      // is the first; T-041b admin-reset reuses it; future signup too).
      // We pull those into the include set so the per-pattern 100%
      // threshold below has files to measure.
      include: [
        "src/lib/**/*.{ts,tsx}",
        "src/features/**/services/**/*.{ts,tsx}",
        "src/features/**/utils/**/*.{ts,tsx}",
        "src/features/**/schemas/**/*.{ts,tsx}",
        "src/features/**/hooks/**/*.{ts,tsx}",
        // T-023 — Customer Server Actions sit on the trust boundary
        // between the client form and the repository layer. They embed
        // the auth session lookup + audit-log writes, which we treat
        // as security-critical surface and gate at 100% per-pattern
        // coverage (see thresholds below). Other features' action
        // folders join this include set as they pick up coverage tests.
        "src/features/customers/actions/**/*.{ts,tsx}",
        "src/features/**/*-policy.{ts,tsx}",
        "src/features/auth/components/password-rule-checklist.tsx",
        // T-021 security headers — middleware ships the
        // `applySecurityHeaders` helper used by every response
        // branch. 90% threshold below (per-pattern); routing
        // branches are covered end-to-end by Playwright in T-051a.
        "src/middleware.ts",
      ],
      exclude: [
        "src/generated/**",
        "src/**/*.test.{ts,tsx}",
        "src/**/*.d.ts",
        "src/i18n/**",
        "src/lib/db.ts", // Prisma singleton — wiring, no logic to cover.
        "**/example.ts", // T-001 scaffold placeholders, removed when real code lands.
        "**/*.config.{js,mjs,ts}",
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
      },
    },
  },
});
