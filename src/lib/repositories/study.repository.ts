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
 *   - `setStudyStatus` is the **state-machine-validated** status writer
 *     used by the Slice 5 Server Actions (`DRAFT → READY → GENERATED`,
 *     never backwards). Throws `InvalidStudyStatusTransitionError`
 *     when called with an invalid pair.
 *   - `transferStudy` is the consultant-handover seam for F6 (T-030).
 *
 * T-025/T-028 (Slice 5) extension: `listStudies` accepts an
 * `includeRelations?: boolean` flag. When true, every returned row
 * is enriched with `consultant: { id, firstName, lastName }` and
 * `customer: { id, companyName, contactFirstName, contactLastName }`.
 * The dashboard table consumes this single-query enrichment to avoid
 * N+1 lookups per row.
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
  /**
   * When true, each returned row is enriched with the joined
   * `consultant` + `customer` rows (subset of fields needed by the
   * dashboard). Default false.
   */
  includeRelations?: boolean;
}

interface CountStudiesOptions {
  consultantId?: string;
  customerId?: string;
  status?: StudyStatus;
  includeDeleted?: boolean;
}

/**
 * Study row enriched with the joined consultant + customer summary
 * rows used by the dashboard. Returned by `listStudies` when called
 * with `includeRelations: true`.
 */
export type StudyWithRelations = Study & {
  consultant: { id: string; firstName: string; lastName: string };
  customer: {
    id: string;
    companyName: string | null;
    contactFirstName: string;
    contactLastName: string;
  };
};

/**
 * Allow-listed status transitions for the DRAFT → READY → GENERATED
 * state machine. Going backwards is rejected — callers who need to
 * re-open a READY study for editing must use `updateStudy` (which
 * keeps the existing status) or call this with the same status on
 * both sides (no-op short-circuited at the action layer).
 */
const STATUS_TRANSITIONS: Record<StudyStatus, readonly StudyStatus[]> = {
  DRAFT: ["DRAFT", "READY"],
  READY: ["READY", "GENERATED"],
  GENERATED: ["GENERATED"],
};

export class InvalidStudyStatusTransitionError extends Error {
  constructor(
    public readonly from: StudyStatus,
    public readonly to: StudyStatus,
  ) {
    super(`Invalid study status transition: ${from} → ${to}`);
    this.name = "InvalidStudyStatusTransitionError";
  }
}

function clampTake(take?: number): number {
  if (take === undefined) return DEFAULT_TAKE;
  return Math.min(Math.max(take, 1), MAX_TAKE);
}

function buildWhere(
  organizationId: string,
  options: {
    consultantId?: string;
    customerId?: string;
    status?: StudyStatus;
    includeDeleted?: boolean;
  },
): Prisma.StudyWhereInput {
  return {
    organizationId,
    ...(options.includeDeleted ? {} : { deletedAt: null }),
    ...(options.consultantId ? { consultantId: options.consultantId } : {}),
    ...(options.customerId ? { customerId: options.customerId } : {}),
    ...(options.status ? { status: options.status } : {}),
  };
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

// Overload signatures — TypeScript picks the narrower return type
// when the caller statically asserts `includeRelations: true`.
export async function listStudies(
  organizationId: string,
  options: ListStudiesOptions & { includeRelations: true },
  tx?: PrismaTransaction,
): Promise<StudyWithRelations[]>;
export async function listStudies(
  organizationId: string,
  options?: ListStudiesOptions,
  tx?: PrismaTransaction,
): Promise<Study[]>;
export async function listStudies(
  organizationId: string,
  options: ListStudiesOptions = {},
  tx?: PrismaTransaction,
): Promise<Study[] | StudyWithRelations[]> {
  const client: Client = tx ?? prisma;
  const where = buildWhere(organizationId, options);
  const orderBy = options.orderBy ?? { createdAt: "desc" };
  const take = clampTake(options.take);
  const skip = options.skip ?? 0;

  if (options.includeRelations) {
    return client.study.findMany({
      where,
      orderBy,
      take,
      skip,
      include: {
        consultant: { select: { id: true, firstName: true, lastName: true } },
        customer: {
          select: {
            id: true,
            companyName: true,
            contactFirstName: true,
            contactLastName: true,
          },
        },
      },
    });
  }

  return client.study.findMany({ where, orderBy, take, skip });
}

/**
 * Total count of studies matching the filter, used by the dashboard
 * pagination. Mirrors `countCustomers` from the Customer repo.
 */
export async function countStudies(
  organizationId: string,
  options: CountStudiesOptions = {},
  tx?: PrismaTransaction,
): Promise<number> {
  const client: Client = tx ?? prisma;
  return client.study.count({ where: buildWhere(organizationId, options) });
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

/**
 * Race-safe, idempotent soft-delete. Mirrors `softDeleteCustomer`
 * from the Customer repo.
 *
 * Uses `updateMany` with a `deletedAt: null` filter so a second call
 * (concurrent click, replay, retry) matches zero rows and returns
 * `null` instead of overwriting a previously-stamped `deletedAt`.
 * Returns the persisted row when a write happened; returns `null`
 * if no row matched (already deleted, wrong org, or unknown id).
 */
export async function softDeleteStudy(
  organizationId: string,
  id: string,
  deletedAt: Date,
  tx?: PrismaTransaction,
): Promise<Study | null> {
  const client: Client = tx ?? prisma;
  const result = await client.study.updateMany({
    where: { id, organizationId, deletedAt: null },
    data: { deletedAt },
  });
  if (result.count === 0) {
    return null;
  }
  return findStudyById(organizationId, id, { includeDeleted: true }, tx);
}

/**
 * State-machine-validated status writer.
 *
 * Looks up the current status of the study and rejects any transition
 * not in `STATUS_TRANSITIONS`. The action-layer caller is responsible
 * for the `auth()` + ownership check before invoking this.
 *
 * Returns the updated row, or `null` if the study cannot be found
 * (org-scoped + soft-delete filter applies). On transition violation
 * throws `InvalidStudyStatusTransitionError`.
 */
export async function setStudyStatus(
  organizationId: string,
  id: string,
  newStatus: StudyStatus,
  tx?: PrismaTransaction,
): Promise<Study | null> {
  const client: Client = tx ?? prisma;
  const existing = await client.study.findFirst({
    where: { id, organizationId, deletedAt: null },
    select: { status: true },
  });
  if (existing === null) {
    return null;
  }
  if (!STATUS_TRANSITIONS[existing.status].includes(newStatus)) {
    throw new InvalidStudyStatusTransitionError(existing.status, newStatus);
  }
  // No-op transitions (DRAFT→DRAFT, READY→READY, GENERATED→GENERATED)
  // are allow-listed in STATUS_TRANSITIONS but should not touch
  // `generatedAt` or trip Prisma's `@updatedAt`. Short-circuit them.
  if (existing.status === newStatus) {
    return findStudyById(organizationId, id, {}, tx);
  }
  // GENERATED transitions are owned by `markStudyGenerated` (which
  // also stamps `generatedAt`). Plain `setStudyStatus` handles
  // DRAFT → READY.
  if (newStatus === "GENERATED") {
    return client.study.update({
      where: { id, organizationId },
      data: { status: newStatus, generatedAt: new Date() },
    });
  }
  return client.study.update({
    where: { id, organizationId },
    data: { status: newStatus },
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
