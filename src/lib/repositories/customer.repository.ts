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
 * See DECISIONS.md → "Slice 2 schema design approved" and
 * "T-014 silent decisions per §14 (consolidated)".
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
}

function clampTake(take?: number): number {
  if (take === undefined) return DEFAULT_TAKE;
  return Math.min(Math.max(take, 1), MAX_TAKE);
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

export async function listCustomers(
  organizationId: string,
  options: ListCustomersOptions = {},
  tx?: PrismaTransaction,
): Promise<Customer[]> {
  const client: Client = tx ?? prisma;
  const search = options.search?.trim();
  return client.customer.findMany({
    where: {
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
    },
    orderBy: options.orderBy ?? { createdAt: "desc" },
    take: clampTake(options.take),
    skip: options.skip ?? 0,
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

export async function softDeleteCustomer(
  organizationId: string,
  id: string,
  tx?: PrismaTransaction,
): Promise<Customer> {
  const client: Client = tx ?? prisma;
  return client.customer.update({
    where: { id, organizationId },
    data: { deletedAt: new Date() },
  });
}
