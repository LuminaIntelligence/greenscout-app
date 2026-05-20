/**
 * AuditLog repository — append-only audit trail.
 *
 * Contract:
 *   - **Only `createAuditEntry` and `listAuditEntries` exist.** No
 *     update, no delete — the table has no `@updatedAt`, and DSGVO
 *     hard-deletes of users only `SET NULL` on `userId` rather than
 *     removing entries.
 *   - `organizationId` is a required first parameter.
 *   - `changeSet` is `jsonb` at the DB. The application-layer
 *     convention is `{ "fieldName": [oldValue, newValue], ... }` per
 *     DECISIONS. `passwordHash` must NEVER appear inside `changeSet`
 *     (DECISIONS rule); enforcement is at the caller, not here.
 *   - `entityType` and `action` are free-form strings at the DB; the
 *     allow-list of valid values is enforced in code at the caller
 *     side (T-045 admin audit view).
 *
 * See DECISIONS.md → "Slice 2 schema design approved" → AuditLog
 * section and `AuditLog.changeSet` JSON convention.
 */

import type { AuditLog, Prisma } from "@/generated/prisma";

import { prisma } from "@/lib/db";

import type { PrismaTransaction } from "./transaction";

type Client = typeof prisma | PrismaTransaction;

const DEFAULT_TAKE = 50;
const MAX_TAKE = 200;

interface ListAuditEntriesOptions {
  take?: number;
  skip?: number;
  userId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  fromDate?: Date;
  toDate?: Date;
  orderBy?: Prisma.AuditLogOrderByWithRelationInput;
}

function clampTake(take?: number): number {
  if (take === undefined) return DEFAULT_TAKE;
  return Math.min(Math.max(take, 1), MAX_TAKE);
}

export async function createAuditEntry(
  organizationId: string,
  data: Prisma.AuditLogCreateInput,
  tx?: PrismaTransaction,
): Promise<AuditLog> {
  const client: Client = tx ?? prisma;
  return client.auditLog.create({
    data: {
      ...data,
      organizationId,
    },
  });
}

export async function listAuditEntries(
  organizationId: string,
  options: ListAuditEntriesOptions = {},
  tx?: PrismaTransaction,
): Promise<AuditLog[]> {
  const client: Client = tx ?? prisma;
  const { fromDate, toDate, userId, entityType, entityId, action } = options;
  return client.auditLog.findMany({
    where: {
      organizationId,
      ...(userId ? { userId } : {}),
      ...(entityType ? { entityType } : {}),
      ...(entityId ? { entityId } : {}),
      ...(action ? { action } : {}),
      ...(fromDate || toDate
        ? {
            createdAt: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {}),
            },
          }
        : {}),
    },
    orderBy: options.orderBy ?? { createdAt: "desc" },
    take: clampTake(options.take),
    skip: options.skip ?? 0,
  });
}
