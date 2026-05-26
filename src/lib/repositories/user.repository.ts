/**
 * User repository — sole entry point for any Prisma access touching the
 * `User` table.
 *
 * Contract (see DECISIONS.md → "Slice 2 schema design approved" and
 * "T-014 silent decisions per §14 (consolidated)"):
 *   - `organizationId` is a required first parameter on every function.
 *   - Soft-delete filter (`deletedAt: null`) applies by default to
 *     reads; opt out via `options.includeDeleted = true`.
 *   - All email-touching calls funnel through `normaliseEmail()` so the
 *     stored value matches the case-insensitive lookup contract.
 *   - Hard-delete is reserved for the DSGVO admin workflow (T-041b).
 *
 * Domain helpers (lockout / password / must-change) exist here so the
 * Auth.js Credentials provider and the password-policy module can
 * mutate User state without reaching past the repository boundary.
 */

import type { Prisma, Role, User } from "@/generated/prisma";

import { normaliseEmail } from "@/features/auth/utils/normalise-email";
import { prisma } from "@/lib/db";

import type { PrismaTransaction } from "./transaction";

type Client = typeof prisma | PrismaTransaction;

const DEFAULT_TAKE = 50;
const MAX_TAKE = 200;

interface FindOptions {
  includeDeleted?: boolean;
}

interface ListUsersOptions extends FindOptions {
  take?: number;
  skip?: number;
  role?: Role;
  active?: boolean;
  orderBy?: Prisma.UserOrderByWithRelationInput;
}

interface CountUsersOptions {
  role?: Role;
  active?: boolean;
  includeDeleted?: boolean;
}

function clampTake(take?: number): number {
  if (take === undefined) return DEFAULT_TAKE;
  return Math.min(Math.max(take, 1), MAX_TAKE);
}

export async function findUserById(
  organizationId: string,
  id: string,
  options: FindOptions = {},
  tx?: PrismaTransaction,
): Promise<User | null> {
  const client: Client = tx ?? prisma;
  return client.user.findFirst({
    where: {
      id,
      organizationId,
      ...(options.includeDeleted ? {} : { deletedAt: null }),
    },
  });
}

export async function findUserByEmail(
  organizationId: string,
  email: string,
  options: FindOptions = {},
  tx?: PrismaTransaction,
): Promise<User | null> {
  const client: Client = tx ?? prisma;
  return client.user.findFirst({
    where: {
      email: normaliseEmail(email),
      organizationId,
      ...(options.includeDeleted ? {} : { deletedAt: null }),
    },
  });
}

export async function listUsers(
  organizationId: string,
  options: ListUsersOptions = {},
  tx?: PrismaTransaction,
): Promise<User[]> {
  const client: Client = tx ?? prisma;
  return client.user.findMany({
    where: {
      organizationId,
      ...(options.role ? { role: options.role } : {}),
      ...(options.active !== undefined ? { active: options.active } : {}),
      ...(options.includeDeleted ? {} : { deletedAt: null }),
    },
    orderBy: options.orderBy ?? { createdAt: "desc" },
    take: clampTake(options.take),
    skip: options.skip ?? 0,
  });
}

/**
 * Total count of users matching the filter, used by the T-041a admin
 * users dashboard pagination. Mirrors `countCustomers` from the
 * Customer repo.
 */
export async function countUsers(
  organizationId: string,
  options: CountUsersOptions = {},
  tx?: PrismaTransaction,
): Promise<number> {
  const client: Client = tx ?? prisma;
  return client.user.count({
    where: {
      organizationId,
      ...(options.role ? { role: options.role } : {}),
      ...(options.active !== undefined ? { active: options.active } : {}),
      ...(options.includeDeleted ? {} : { deletedAt: null }),
    },
  });
}

/**
 * Create a new user. The `email` field on `data` is normalised before
 * the Prisma call — callers may pass any casing or surrounding
 * whitespace. `organizationId` is always overridden with the parameter
 * (callers cannot smuggle a different value through `data`).
 */
export async function createUser(
  organizationId: string,
  data: Prisma.UserCreateInput,
  tx?: PrismaTransaction,
): Promise<User> {
  const client: Client = tx ?? prisma;
  return client.user.create({
    data: {
      ...data,
      email: normaliseEmail(data.email),
      organizationId,
    },
  });
}

/**
 * Partial update. If `patch.email` is supplied (as either a literal
 * string or the Prisma `{ set: string }` operation), the value is
 * normalised before the Prisma call.
 */
export async function updateUser(
  organizationId: string,
  id: string,
  patch: Prisma.UserUpdateInput,
  tx?: PrismaTransaction,
): Promise<User> {
  const client: Client = tx ?? prisma;
  const normalisedPatch: Prisma.UserUpdateInput = { ...patch };
  if (patch.email !== undefined) {
    if (typeof patch.email === "string") {
      normalisedPatch.email = normaliseEmail(patch.email);
    } else if (
      typeof patch.email === "object" &&
      patch.email !== null &&
      "set" in patch.email &&
      typeof patch.email.set === "string"
    ) {
      normalisedPatch.email = { set: normaliseEmail(patch.email.set) };
    }
  }
  return client.user.update({
    where: { id, organizationId },
    data: normalisedPatch,
  });
}

export async function softDeleteUser(
  organizationId: string,
  id: string,
  tx?: PrismaTransaction,
): Promise<User> {
  const client: Client = tx ?? prisma;
  return client.user.update({
    where: { id, organizationId },
    data: { deletedAt: new Date() },
  });
}

/**
 * Hard-delete is restricted to the DSGVO admin workflow.
 * TODO(T-041b): wire DSGVO hard-delete UI / API and add the admin-role
 * authorisation check at the calling layer.
 */
export async function hardDeleteUser(
  organizationId: string,
  id: string,
  tx?: PrismaTransaction,
): Promise<User> {
  const client: Client = tx ?? prisma;
  return client.user.delete({ where: { id, organizationId } });
}

export async function incrementFailedLoginCount(
  organizationId: string,
  id: string,
  tx?: PrismaTransaction,
): Promise<User> {
  const client: Client = tx ?? prisma;
  return client.user.update({
    where: { id, organizationId },
    data: { failedLoginCount: { increment: 1 } },
  });
}

/**
 * Reset both `failedLoginCount` and `lockoutUntil` atomically. Called
 * on the success path of the Auth.js Credentials authorize flow
 * (T-017) — a successful login wipes the lockout state entirely. The
 * counter resets to 0 **only on a successful login**; lockout-expiry
 * does NOT reset the counter (counter-based, not time-window-based,
 * per DECISIONS T-017 corrective ② and SPEC §4.1).
 */
export async function resetFailedLoginCount(
  organizationId: string,
  id: string,
  tx?: PrismaTransaction,
): Promise<User> {
  const client: Client = tx ?? prisma;
  return client.user.update({
    where: { id, organizationId },
    data: { failedLoginCount: 0, lockoutUntil: null },
  });
}

export async function setLockoutUntil(
  organizationId: string,
  id: string,
  until: Date | null,
  tx?: PrismaTransaction,
): Promise<User> {
  const client: Client = tx ?? prisma;
  return client.user.update({
    where: { id, organizationId },
    data: { lockoutUntil: until },
  });
}

export async function setMustChangePassword(
  organizationId: string,
  id: string,
  flag: boolean,
  tx?: PrismaTransaction,
): Promise<User> {
  const client: Client = tx ?? prisma;
  return client.user.update({
    where: { id, organizationId },
    data: { mustChangePassword: flag },
  });
}

/**
 * Update password hash and stamp `passwordChangedAt`. Callers are
 * responsible for producing the argon2id hash via the password-policy
 * module (T-016).
 */
export async function updatePasswordHash(
  organizationId: string,
  id: string,
  hash: string,
  tx?: PrismaTransaction,
): Promise<User> {
  const client: Client = tx ?? prisma;
  return client.user.update({
    where: { id, organizationId },
    data: { passwordHash: hash, passwordChangedAt: new Date() },
  });
}
