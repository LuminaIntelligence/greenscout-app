/**
 * Customer repository — sole entry point for any Prisma access touching
 * the `Customer` table.
 *
 * Contract:
 *   - `organizationId` is a required first parameter on every function.
 *   - Soft-delete filter (`deletedAt: null`) applies by default to
 *     reads; opt out via `options.includeDeleted = true`.
 *   - Default sort: `createdAt DESC`. Pagination capped at 200.
 *   - `search` filters by `companyName` OR `contactLastName` (case-
 *     insensitive `contains`).
 *
 * T-022 extension: `listCustomers` accepts `includeStudyCount?: boolean`.
 * When true, the result rows carry a `_count: { studies: number }` field
 * (Prisma's relation-count aggregate — single query, no N+1). Return
 * type is narrowed via TypeScript overloads. The companion
 * `countCustomers` provides the total-row count used by paginated UIs.
 *
 * See DECISIONS.md → "Slice 2 schema design approved",
 * "T-014 silent decisions per §14 (consolidated)", and
 * "T-022 silent decisions per §14 (consolidated)".
 */

import type { Customer, Prisma } from "@/generated/prisma";

import { prisma } from "@/lib/db";

import type { PrismaTransaction } from "./transaction";

type Client = typeof prisma | PrismaTransaction;

const DEFAULT_TAKE = 50;
const MAX_TAKE = 200;

interface FindOptions {
  includeDeleted?: boolean;
}

interface ListCustomersOptions extends FindOptions {
  take?: number;
  skip?: number;
  search?: string;
  orderBy?: Prisma.CustomerOrderByWithRelationInput;
  /**
   * When true, each returned row includes a `_count: { studies: number }`
   * aggregate. Used by the T-022 customer list page. Default false.
   */
  includeStudyCount?: boolean;
}

/**
 * Customer row enriched with the Prisma relation-count aggregate for
 * the `studies` back-relation. Returned by `listCustomers` when called
 * with `includeStudyCount: true`.
 */
export type CustomerWithStudyCount = Customer & { _count: { studies: number } };

interface CountCustomersOptions {
  search?: string;
  includeDeleted?: boolean;
}

function clampTake(take?: number): number {
  if (take === undefined) return DEFAULT_TAKE;
  return Math.min(Math.max(take, 1), MAX_TAKE);
}

function buildWhere(
  organizationId: string,
  options: { search?: string; includeDeleted?: boolean },
): Prisma.CustomerWhereInput {
  const search = options.search?.trim();
  return {
    organizationId,
    ...(options.includeDeleted ? {} : { deletedAt: null }),
    ...(search
      ? {
          OR: [
            { contactLastName: { contains: search, mode: "insensitive" } },
            { companyName: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

export async function findCustomerById(
  organizationId: string,
  id: string,
  options: FindOptions = {},
  tx?: PrismaTransaction,
): Promise<Customer | null> {
  const client: Client = tx ?? prisma;
  return client.customer.findFirst({
    where: {
      id,
      organizationId,
      ...(options.includeDeleted ? {} : { deletedAt: null }),
    },
  });
}

// Overload signatures — TypeScript picks the narrower return type when
// the caller statically asserts `includeStudyCount: true`.
export async function listCustomers(
  organizationId: string,
  options: ListCustomersOptions & { includeStudyCount: true },
  tx?: PrismaTransaction,
): Promise<CustomerWithStudyCount[]>;
export async function listCustomers(
  organizationId: string,
  options?: ListCustomersOptions,
  tx?: PrismaTransaction,
): Promise<Customer[]>;
export async function listCustomers(
  organizationId: string,
  options: ListCustomersOptions = {},
  tx?: PrismaTransaction,
): Promise<Customer[] | CustomerWithStudyCount[]> {
  const client: Client = tx ?? prisma;
  const where = buildWhere(organizationId, options);
  const orderBy = options.orderBy ?? { createdAt: "desc" };
  const take = clampTake(options.take);
  const skip = options.skip ?? 0;

  if (options.includeStudyCount) {
    return client.customer.findMany({
      where,
      orderBy,
      take,
      skip,
      include: { _count: { select: { studies: true } } },
    });
  }

  return client.customer.findMany({
    where,
    orderBy,
    take,
    skip,
  });
}

export async function countCustomers(
  organizationId: string,
  options: CountCustomersOptions = {},
  tx?: PrismaTransaction,
): Promise<number> {
  const client: Client = tx ?? prisma;
  return client.customer.count({
    where: buildWhere(organizationId, options),
  });
}

export async function createCustomer(
  organizationId: string,
  data: Prisma.CustomerCreateInput,
  tx?: PrismaTransaction,
): Promise<Customer> {
  const client: Client = tx ?? prisma;
  return client.customer.create({
    data: {
      ...data,
      organizationId,
    },
  });
}

export async function updateCustomer(
  organizationId: string,
  id: string,
  patch: Prisma.CustomerUpdateInput,
  tx?: PrismaTransaction,
): Promise<Customer> {
  const client: Client = tx ?? prisma;
  return client.customer.update({
    where: { id, organizationId },
    data: patch,
  });
}

/**
 * Race-safe, idempotent soft-delete.
 *
 * Uses `updateMany` with a `deletedAt: null` filter so a second call
 * (concurrent click, replay, retry) matches zero rows and returns
 * `null` instead of overwriting a previously-stamped `deletedAt`.
 * The `deletedAt` timestamp is passed in by the caller so the
 * Server Action can record the exact same value in the audit
 * `changeSet` diff that lands in the database.
 *
 * Returns the persisted customer row when a write happened; returns
 * `null` if no row matched (already deleted, wrong org, or unknown id).
 */
export async function softDeleteCustomer(
  organizationId: string,
  id: string,
  deletedAt: Date,
  tx?: PrismaTransaction,
): Promise<Customer | null> {
  const client: Client = tx ?? prisma;
  const result = await client.customer.updateMany({
    where: { id, organizationId, deletedAt: null },
    data: { deletedAt },
  });
  if (result.count === 0) {
    return null;
  }
  // Re-read so the caller has the persisted row (including the exact
  // `deletedAt` written + `updatedAt` refreshed by Prisma). Must opt
  // into `includeDeleted: true` — the just-soft-deleted row is
  // invisible to the default soft-delete filter.
  return findCustomerById(organizationId, id, { includeDeleted: true }, tx);
}
