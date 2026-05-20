/**
 * Password-policy constants — single source of truth for the auth module.
 *
 * Argon2id parameters default to the SPEC §6.3 baseline; runtime
 * overrides come from PASSWORD_HASH_* env vars (already in
 * .env.example).
 *
 * MIN_PASSWORD_LENGTH per SPEC §4.1.
 *
 * Both `password-policy.ts` and `utils/hash-password.ts` consume from
 * here — keeping it as a dedicated file avoids a circular import.
 *
 * @see DECISIONS.md → "T-016 password-policy module design (user-confirmed, binding)"
 */

/** argon2id memory cost in KiB. SPEC §6.3 baseline = 19456 (≈ 19 MiB). */
export const PASSWORD_HASH_MEMORY_KIB = parseIntEnv("PASSWORD_HASH_MEMORY_KIB", 19456);
/** argon2id time cost (iterations). SPEC §6.3 baseline = 2. */
export const PASSWORD_HASH_TIME_COST = parseIntEnv("PASSWORD_HASH_TIME_COST", 2);
/** argon2id parallelism factor. SPEC §6.3 baseline = 1. */
export const PASSWORD_HASH_PARALLELISM = parseIntEnv("PASSWORD_HASH_PARALLELISM", 1);

/** Password rule cutoff (SPEC §4.1). */
export const MIN_PASSWORD_LENGTH = 8;

function parseIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return parsed;
}
