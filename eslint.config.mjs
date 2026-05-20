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
      // CLAUDE.md §4.3 — no relative `../../..` chains across feature boundaries.
      // The use of `no-restricted-imports` here (rather than the literal
      // `import/no-relative-parent-imports`) is deliberate:
      // `import/no-relative-parent-imports` flags *any* import that resolves
      // upwards in the file tree — including the prescribed `@/...` alias
      // imports, since those alias to `src/` which sits above feature folders.
      // The intent of §4.3 is to ban literal `../` chains; `@/...` is the
      // prescribed cross-feature pattern. This rule narrows the prohibition to
      // exactly that intent: literal relative-parent specifiers (`../foo`,
      // `../../bar`, etc.) are blocked; `@/...` imports stay clean.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../*"],
              message:
                "Use the `@/...` path alias instead of `../` chains across feature boundaries (see CLAUDE.md §4.3).",
            },
          ],
        },
      ],
    },
  },

  prettierConfig,
];

export default eslintConfig;
