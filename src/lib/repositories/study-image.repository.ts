/**
 * StudyImage repository — sole entry point for any Prisma access
 * touching the `StudyImage` table.
 *
 * Contract:
 *   - **No `organizationId` parameter.** `StudyImage` has no own org
 *     column; access control lives at the parent `Study` level. The
 *     caller MUST verify the parent study's `organizationId` (via the
 *     Study repository) before invoking these functions.
 *   - Per the schema `@@unique([studyId, type])` constraint, at most
 *     one row exists per `(studyId, type)` pair. `upsertStudyImage`
 *     uses that unique key.
 *   - No soft-delete — StudyImage lives and dies with the parent Study
 *     (Cascade onDelete).
 *
 * See DECISIONS.md → "Slice 2 schema design approved" and
 * "T-014 silent decisions per §14 (consolidated)".
 */

import type { ImageType, Prisma, StudyImage } from "@/generated/prisma";

import { prisma } from "@/lib/db";

import type { PrismaTransaction } from "./transaction";

type Client = typeof prisma | PrismaTransaction;

export async function findStudyImage(
  studyId: string,
  type: ImageType,
  tx?: PrismaTransaction,
): Promise<StudyImage | null> {
  const client: Client = tx ?? prisma;
  return client.studyImage.findUnique({
    where: { studyId_type: { studyId, type } },
  });
}

export async function listStudyImages(
  studyId: string,
  tx?: PrismaTransaction,
): Promise<StudyImage[]> {
  const client: Client = tx ?? prisma;
  return client.studyImage.findMany({
    where: { studyId },
    orderBy: { type: "asc" },
  });
}

/**
 * Replace (or create) the single BEFORE / AFTER image for a study.
 * `data` carries the non-key fields — `filename`, `mimeType`,
 * dimensions, byte size. `studyId` and `type` are provided as the
 * unique key.
 */
export async function upsertStudyImage(
  studyId: string,
  type: ImageType,
  data: Omit<Prisma.StudyImageCreateInput, "study" | "type">,
  tx?: PrismaTransaction,
): Promise<StudyImage> {
  const client: Client = tx ?? prisma;
  return client.studyImage.upsert({
    where: { studyId_type: { studyId, type } },
    create: {
      ...data,
      type,
      study: { connect: { id: studyId } },
    },
    update: data,
  });
}

export async function deleteStudyImage(
  studyId: string,
  type: ImageType,
  tx?: PrismaTransaction,
): Promise<StudyImage> {
  const client: Client = tx ?? prisma;
  return client.studyImage.delete({
    where: { studyId_type: { studyId, type } },
  });
}
