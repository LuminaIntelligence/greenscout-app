/**
 * Password policy: argon2id hashing constants + rule predicates.
 *
 * This module is the canonical auth-security public surface. All
 * consumers (T-017 Auth.js, T-018 Login UI, T-019 forced password
 * change, T-020 lockout, T-041b admin reset) import exclusively from
 * here.
 *
 * Rules are Unicode-aware (\p{Lu}, \p{Ll}, \p{L}, \p{N}) per the
 * approved design — ä/Ä/ß count as letters, not as special.
 *
 * Module is intentionally string-frei. German labels live in
 * `src/i18n/de.ts` (5 keys: auth.password.rule.{min-length,upper,
 * lower,digit,special}). UI maps `rule.key → t(rule.key)`.
 *
 * @see DECISIONS.md → "T-016 password-policy module design (user-confirmed, binding)"
 */

// Re-export argon2id constants + MIN_PASSWORD_LENGTH so all consumers
// see them via the canonical password-policy surface.
export {
  MIN_PASSWORD_LENGTH,
  PASSWORD_HASH_MEMORY_KIB,
  PASSWORD_HASH_PARALLELISM,
  PASSWORD_HASH_TIME_COST,
} from "@/features/auth/password-constants";

// NOTE: `hashPassword` / `verifyPassword` are NOT re-exported here.
// They live in `@/features/auth/utils/hash-password` and back onto
// `@node-rs/argon2` (a Node-only native binding). Re-exporting them
// from this file would pull the argon2 binding into the client bundle
// for any client component that imports `passwordRules` /
// `PasswordRuleKey` / `validatePassword` (e.g. the T-019
// PasswordRuleChecklist). Server-side consumers import directly from
// `@/features/auth/utils/hash-password` instead. See DECISIONS T-019.

import { MIN_PASSWORD_LENGTH } from "@/features/auth/password-constants";

/** Unicode-aware regexes for the five rule predicates. */
const UPPER_RE = /\p{Lu}/u;
const LOWER_RE = /\p{Ll}/u;
const DIGIT_RE = /[0-9]/;
const SPECIAL_CHAR_RE = /[^\p{L}\p{N}]/u;

/**
 * Stable identifiers for each rule. Used by UI as React keys and by
 * the i18n module to resolve labels. NEVER translated — these are
 * machine-facing identifiers.
 */
export type PasswordRuleKey = "min-length" | "upper" | "lower" | "digit" | "special";

/**
 * A single password rule: stable key + pure predicate.
 * Labels live in src/i18n/de.ts under the `auth.password.rule.<key>` namespace.
 */
export interface PasswordRule {
  readonly key: PasswordRuleKey;
  readonly test: (input: string) => boolean;
}

/**
 * The full ruleset, frozen at module load. UI iterates over this to
 * render the live checklist; server-side validation iterates the same
 * array via `validatePassword`.
 */
export const passwordRules: readonly PasswordRule[] = Object.freeze([
  { key: "min-length", test: (s: string) => s.length >= MIN_PASSWORD_LENGTH },
  { key: "upper", test: (s: string) => UPPER_RE.test(s) },
  { key: "lower", test: (s: string) => LOWER_RE.test(s) },
  { key: "digit", test: (s: string) => DIGIT_RE.test(s) },
  { key: "special", test: (s: string) => SPECIAL_CHAR_RE.test(s) },
] as const);

/** Per-rule evaluation result for UI rendering. */
export interface PasswordRuleResult {
  readonly key: PasswordRuleKey;
  readonly ok: boolean;
}

/** Aggregate result of password validation. */
export interface PasswordValidationResult {
  /** True iff every rule passes. */
  readonly ok: boolean;
  /** Per-rule pass/fail for UI checklist rendering. */
  readonly rules: readonly PasswordRuleResult[];
}

/**
 * Evaluate every rule against the input. Pure, synchronous, no I/O.
 *
 * UI: maps `result.rules` for the live checklist (rot/grün per rule).
 * Server: gates `hashPassword` behind `validatePassword(input).ok`.
 */
export function validatePassword(input: string): PasswordValidationResult {
  const rules = passwordRules.map((r) => ({
    key: r.key,
    ok: r.test(input),
  }));
  return {
    ok: rules.every((r) => r.ok),
    rules,
  };
}
