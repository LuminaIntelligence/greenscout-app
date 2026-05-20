/**
 * Password hashing utilities using argon2id per SPEC §6.3 baseline:
 *
 *   memoryCost = 19456 KiB (≈ 19 MiB)
 *   timeCost   = 2
 *   parallelism = 1
 *   algorithm  = Argon2id
 *
 * Parameter constants live in `../password-constants.ts` (single
 * source of truth). They default to the SPEC §6.3 baseline and can be
 * overridden at runtime via env vars (PASSWORD_HASH_MEMORY_KIB,
 * PASSWORD_HASH_TIME_COST, PASSWORD_HASH_PARALLELISM) — present in
 * `.env.example` from the original setup.
 *
 * Backed by `@node-rs/argon2` (Rust bindings shipped as pre-built binaries
 * for every major platform — no node-gyp / Python build toolchain needed
 * on lean CI runners or Windows).
 *
 * @see DECISIONS.md → "Password hashing algorithm & parameters (user-confirmed)"
 * @see DECISIONS.md → "T-015 silent decisions per §14 (consolidated)"
 * @see DECISIONS.md → "T-016 password-policy module design (user-confirmed, binding)"
 */

import { type Algorithm, hash, verify } from "@node-rs/argon2";

import {
  PASSWORD_HASH_MEMORY_KIB,
  PASSWORD_HASH_PARALLELISM,
  PASSWORD_HASH_TIME_COST,
} from "@/features/auth/password-constants";

// `Algorithm` from @node-rs/argon2 is a `declare const enum` — under
// tsconfig `isolatedModules: true` we cannot reference its members,
// so we use the numeric value (2 = Argon2id) and pin the TypeScript
// shape via the type-only import above. See @node-rs/argon2 README:
//   0 = Argon2d, 1 = Argon2i, 2 = Argon2id.
const ARGON2ID: Algorithm = 2 as Algorithm;

interface Argon2Params {
  algorithm: Algorithm;
  memoryCost: number;
  timeCost: number;
  parallelism: number;
}

function getArgon2Params(): Argon2Params {
  return {
    algorithm: ARGON2ID,
    memoryCost: PASSWORD_HASH_MEMORY_KIB,
    timeCost: PASSWORD_HASH_TIME_COST,
    parallelism: PASSWORD_HASH_PARALLELISM,
  };
}

/**
 * Hash a plaintext password using argon2id with the configured parameters.
 * Returns a PHC-string-format hash (algorithm + parameters embedded).
 *
 * Throws on empty plaintext — callers are responsible for running the
 * password-policy rules (T-016) before reaching this function.
 */
export async function hashPassword(plaintext: string): Promise<string> {
  if (plaintext.length === 0) {
    throw new Error("hashPassword: plaintext must not be empty");
  }
  return hash(plaintext, getArgon2Params());
}

/**
 * Verify a plaintext password against a stored PHC-string hash.
 * Returns true on match, false on mismatch or invalid inputs.
 *
 * argon2id's `verify` reads the algorithm + parameters from the hash
 * string itself — older hashes with weaker parameters remain verifiable
 * after we bump the baseline.
 */
export async function verifyPassword(hashString: string, plaintext: string): Promise<boolean> {
  if (hashString.length === 0 || plaintext.length === 0) return false;
  return verify(hashString, plaintext);
}
