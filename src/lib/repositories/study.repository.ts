/**
 * Study repository — sole entry point for any Prisma access touching
 * the `Study` table.
 *
 * Contract:
 *   - `organizationId` is a required first parameter on every function.
 *   - Soft-delete filter (`deletedAt: null`) applies by default to
 *     reads; opt out via `options.includeDeleted = true`.
 *   - `markStudyGenerated` flips `status = GENERATED` and stamps
 *     `generatedAt`. This is the only write path that mutates status
 *     to GENERATED; callers should not pass `status` through
 *     `updateStudy`.
 *   - `transferStudy` is the consultant-handover seam for F6 (T-030).
 *
 * Decimal precisions and the §7.7 money matrix live in `schema.prisma`;
 * the repository surface treats them as opaque `Prisma.Decimal`.
 *
 * See DECISIONS.md → "Slice 2 schema design approved" and
 * "T-014 silent decisions per §14 (consolidated)".
 */

import type { Prisma, Study, StudyStatus } from "@/generated/prisma";

import { prisma } from "@/lib/db";

import type { PrismaTransaction } from "./transaction";

type Client = typeof prisma | PrismaTransaction;

const DEFAULT_TAKE = 50;
const MAX_TAKE = 200;

interface FindOptions {
  includeDeleted?: boolean;
}

interface ListStudiesOptions extends FindOptions {
  take?: number;
  skip?: number;
  consultantId?: string;
  customerId?: string;
  status?: StudyStatus;
  orderBy?: Prisma.StudyOrderByWithRelationInput;
}

function clampTake(take?: number): number {
  if (take === undefined) return DEFAULT_TAKE;
  return Math.min(Math.max(take, 1), MAX_TAKE);
}

export async function findStudyById(
  organizationId: string,
  id: string,
  options: FindOptions = {},
  tx?: PrismaTransaction,
): Promise<Study | null> {
  const client: Client = tx ?? prisma;
  return client.study.findFirst({
    where: {
      id,
      organizationId,
      ...(options.includeDeleted ? {} : { deletedAt: null }),
    },
  });
}

export async function listStudies(
  organizationId: string,
  options: ListStudiesOptions = {},
  tx?: PrismaTransaction,
): Promise<Study[]> {
  const client: Client = tx ?? prisma;
  return client.study.findMany({
    where: {
      organizationId,
      ...(options.includeDeleted ? {} : { deletedAt: null }),
      ...(options.consultantId ? { consultantId: options.consultantId } : {}),
      ...(options.customerId ? { customerId: options.customerId } : {}),
      ...(options.status ? { status: options.status } : {}),
    },
    orderBy: options.orderBy ?? { createdAt: "desc" },
    take: clampTake(options.take),
    skip: options.skip ?? 0,
  });
}

export async function createStudy(
  organizationId: string,
  data: Prisma.StudyCreateInput,
  tx?: PrismaTransaction,
): Promise<Study> {
  const client: Client = tx ?? prisma;
  return client.study.create({
    data: {
      ...data,
      organizationId,
    },
  });
}

export async function updateStudy(
  organizationId: string,
  id: string,
  patch: Prisma.StudyUpdateInput,
  tx?: PrismaTransaction,
): Promise<Study> {
  const client: Client = tx ?? prisma;
  return client.study.update({
    where: { id, organizationId },
    data: patch,
  });
}

export async function softDeleteStudy(
  organizationId: string,
  id: string,
  tx?: PrismaTransaction,
): Promise<Study> {
  const client: Client = tx ?? prisma;
  return client.study.update({
    where: { id, organizationId },
    data: { deletedAt: new Date() },
  });
}

/**
 * Flip a study to `GENERATED` status and stamp `generatedAt`. Idempotent
 * at the Postgres level — re-running for an already-generated study
 * just updates `generatedAt` to the new now(). Callers that need
 * strict-once semantics should check the prior status first inside a
 * transaction.
 */
export async function markStudyGenerated(
  organizationId: string,
  id: string,
  tx?: PrismaTransaction,
): Promise<Study> {
  const client: Client = tx ?? prisma;
  return client.study.update({
    where: { id, organizationId },
    data: { status: "GENERATED", generatedAt: new Date() },
  });
}

/**
 * Re-assign a study to a different consultant. Used by the F6
 * consultant-handover flow (T-030). The target user must already
 * exist; the FK constraint enforces that at the DB level.
 */
export async function transferStudy(
  organizationId: string,
  id: string,
  newConsultantId: string,
  tx?: PrismaTransaction,
): Promise<Study> {
  const client: Client = tx ?? prisma;
  return client.study.update({
    where: { id, organizationId },
    data: { consultantId: newConsultantId },
  });
}
