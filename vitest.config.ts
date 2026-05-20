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
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/generated/**",
        "src/**/*.test.{ts,tsx}",
        "src/**/*.d.ts",
        "src/i18n/**",
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
      },
    },
  },
});
