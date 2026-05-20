/**
 * GeneratedDocument repository — sole entry point for any Prisma
 * access touching the `GeneratedDocument` table.
 *
 * Contract:
 *   - **No `organizationId` parameter.** `GeneratedDocument` has no
 *     own org column; access control lives at the parent `Study`
 *     level. The caller MUST verify the parent study's
 *     `organizationId` (via the Study repository) before invoking
 *     these functions.
 *   - Listed newest-first per the `@@index([studyId, generatedAt(Desc)])`
 *     covering index.
 *   - No update / delete in T-014. DSGVO hard-delete cascades from
 *     the parent Study (Cascade onDelete in the schema).
 *
 * See DECISIONS.md → "Slice 2 schema design approved" and
 * "T-014 silent decisions per §14 (consolidated)".
 */

import type { GeneratedDocument, Prisma } from "@/generated/prisma";

import { prisma } from "@/lib/db";

import type { PrismaTransaction } from "./transaction";

type Client = typeof prisma | PrismaTransaction;

const DEFAULT_TAKE = 50;
const MAX_TAKE = 200;

interface ListDocumentsOptions {
  take?: number;
  skip?: number;
}

function clampTake(take?: number): number {
  if (take === undefined) return DEFAULT_TAKE;
  return Math.min(Math.max(take, 1), MAX_TAKE);
}

export async function listDocumentsForStudy(
  studyId: string,
  options: ListDocumentsOptions = {},
  tx?: PrismaTransaction,
): Promise<GeneratedDocument[]> {
  const client: Client = tx ?? prisma;
  return client.generatedDocument.findMany({
    where: { studyId },
    orderBy: { generatedAt: "desc" },
    take: clampTake(options.take),
    skip: options.skip ?? 0,
  });
}

/**
 * Record a freshly produced PPTX / PDF artefact. `data` carries the
 * non-key fields — `format`, `filename`, optional `generatedById`.
 * The parent study is provided via the `studyId` parameter.
 */
export async function createDocument(
  studyId: string,
  data: Omit<Prisma.GeneratedDocumentCreateInput, "study">,
  tx?: PrismaTransaction,
): Promise<GeneratedDocument> {
  const client: Client = tx ?? prisma;
  return client.generatedDocument.create({
    data: {
      ...data,
      study: { connect: { id: studyId } },
    },
  });
}
