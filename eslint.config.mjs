import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// Flat ESLint config for GreenScout.
//
// `next/core-web-vitals` + `next/typescript` already register and configure the
// CLAUDE.md §2 plugin set: `eslint-plugin-react`, `eslint-plugin-react-hooks`,
// `eslint-plugin-jsx-a11y`, `eslint-plugin-import`, and `@typescript-eslint/*`.
// Re-registering those plugins in this file causes ESLint flat-config to throw
// (`Cannot redefine plugin`). Instead, we layer on top with rule overrides only.
//
// Layering order:
//   1. Global ignores.
//   2. Next.js `core-web-vitals` + `typescript` configs (via FlatCompat).
//   3. typescript-eslint recommended set, scoped to TS files.
//   4. Project rule overrides (no-explicit-any, no-unused-vars, alt-text,
//      no-relative-parent-imports).
//   5. eslint-config-prettier last, to disable any rules that fight Prettier.
const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "dist/**",
      "coverage/**",
      "public/**",
      "next-env.d.ts",
      "**/*.config.{js,mjs,ts}",
      // Python service venv ships bundled pyright JS that fails our rules.
      "services/python/.venv/**",
      // Prisma-generated client (gitignored, regenerated on every `db:generate`).
      "src/generated/**",
    ],
  },

  ...compat.extends("next/core-web-vitals", "next/typescript"),

  ...tseslint.configs.recommended,

  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },

  {
    files: ["**/*.{jsx,tsx}"],
    rules: {
      // next/core-web-vitals ships alt-text as "warn"; T-004 acceptance criterion 1
      // requires it to fail the lint pass. Promote to "error" and enforce on
      // <img>, Next's <Image>, and anything that looks like an image component.
      "jsx-a11y/alt-text": [
        "error",
        {
          elements: ["img"],
          img: ["Image"],
        },
      ],
    },
  },

  {
    files: ["**/*.{ts,tsx,js,jsx,mjs}"],
    rules: {
      // Two-pattern `no-restricted-imports`:
      //
      //  1. CLAUDE.md §4.3 — no relative `../../..` chains across feature
      //     boundaries. `import/no-relative-parent-imports` would flag the
      //     prescribed `@/...` alias too (since `@/` resolves above feature
      //     folders). This pattern bans literal `../` specifiers only.
      //
      //  2. T-014 — Prisma Client direct-import is restricted to the
      //     repository layer. App code uses `@/lib/repositories/*`; only
      //     `src/lib/db.ts` (the singleton), `src/lib/repositories/**` (the
      //     functions themselves), and `prisma/seed.ts` (T-015) get to reach
      //     into the generated client. The override block below switches the
      //     whole rule off for exactly those paths — granular `patterns`
      //     overrides aren't supported in flat config, so the trusted-path
      //     block disables the rule wholesale, then re-establishes the
      //     §4.3 `../*` ban via the dedicated block immediately after.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../*"],
              message:
                "Use the `@/...` path alias instead of `../` chains across feature boundaries (see CLAUDE.md §4.3).",
            },
            {
              group: ["@/generated/prisma", "@/generated/prisma/*"],
              message:
                "Import Prisma Client only via @/lib/db (singleton) and run queries through @/lib/repositories/*. Direct Prisma Client access is restricted to the repository layer — see DECISIONS.md T-014.",
            },
          ],
        },
      ],
    },
  },

  // Trusted-path override: the repository layer, the singleton, and the
  // (T-015) seed script are the only places allowed to import from
  // `@/generated/prisma`. Disabling `no-restricted-imports` wholesale here
  // also re-allows `../*` for these files — acceptable because every file
  // in `src/lib/repositories/**` only sibling-imports inside that folder.
  //
  // T-017 added `src/features/auth/types.ts` to the trusted paths because
  // Auth.js v5 type augmentation (`declare module "next-auth"`) needs the
  // generated `Role` and `FormPref` enum types to type the JWT/Session
  // payload. The file is *only* type imports — no runtime Prisma access.
  {
    files: [
      "src/lib/db.ts",
      "src/lib/repositories/**/*.ts",
      "prisma/seed.ts",
      "src/features/auth/types.ts",
    ],
    rules: {
      "no-restricted-imports": "off",
    },
  },

  // T-022 — TanStack Table v8's `useReactTable()` returns functions that
  // React Compiler refuses to memoize. The compiler safely skips the
  // component as a result, but the `react-hooks/incompatible-library`
  // rule still emits a warning, which `--max-warnings 0` (CLAUDE.md §5.2)
  // promotes to a build failure. Scoping the rule off for any
  // `*-table.tsx` component file under `src/features/` accepts the
  // documented React-Compiler-skip behaviour without disabling the rule
  // anywhere it could surface a real footgun.
  {
    files: ["src/features/**/components/**/*-table.tsx"],
    rules: {
      "react-hooks/incompatible-library": "off",
    },
  },

  prettierConfig,
];

export default eslintConfig;
