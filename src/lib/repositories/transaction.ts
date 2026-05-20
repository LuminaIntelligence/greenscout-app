import type { Prisma } from "@/generated/prisma";

import { prisma } from "@/lib/db";

/**
 * The narrow client surface available inside `prisma.$transaction()`.
 * Prisma 5.x exposes `Prisma.TransactionClient` directly; we re-export
 * it under our own alias so repository signatures don't leak Prisma
 * namespace knowledge to call sites.
 */
export type PrismaTransaction = Prisma.TransactionClient;

/**
 * Wrap a multi-step write in a single Postgres transaction. Repository
 * functions accept an optional `tx?: PrismaTransaction` parameter to
 * participate in outer transactions; if omitted, they use the singleton
 * client directly.
 *
 * Usage:
 *
 *   await withTransaction(async (tx) => {
 *     await createStudy(organizationId, data, tx);
 *     await createAuditEntry(organizationId, entry, tx);
 *   });
 *
 * See DECISIONS.md → "T-014 silent decisions per §14 (consolidated)".
 */
export async function withTransaction<T>(fn: (tx: PrismaTransaction) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn);
}
