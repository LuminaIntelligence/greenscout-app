/**
 * Normalise an email address for case-insensitive storage and lookup.
 *
 * Per DECISIONS.md → "Slice 2 schema design approved" — the User
 * repository layer (T-014) calls this before every `create`,
 * `findUnique`, `update`, or `upsert` involving the email column.
 * This prevents duplicate accounts with different casings, since
 * Postgres `String @unique` is case-sensitive by default and we
 * intentionally chose not to use the `citext` extension.
 *
 * Pure string operation — no IO, no Prisma dependency.
 *
 * @param email Raw input email (possibly with whitespace + mixed case).
 * @returns Lowercased, trimmed email suitable for DB storage.
 */
export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}
