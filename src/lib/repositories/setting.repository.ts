/**
 * Setting repository — key/value store for app-wide config.
 *
 * Contract:
 *   - **No `organizationId` parameter.** The MVP `Setting` table is
 *     single-tenant by design (DECISIONS); Phase-3 will add an org
 *     column.
 *   - `getSetting(key)` returns `null` for unknown keys (no throw).
 *   - `setSetting(key, value)` is an upsert.
 *   - `listSettings(prefix?)` optionally filters by key prefix
 *     (e.g. `"smtp."`).
 *
 * Encryption: certain values (notably `smtp.password_enc`) are
 * AES-256-GCM ciphertext per DECISIONS T-004. The repository stores
 * raw strings; the encryption/decryption boundary lives in the
 * settings service (T-042). Plaintext at this layer is the deliberate
 * MVP shape until that task lands.
 */

import type { Setting } from "@/generated/prisma";

import { prisma } from "@/lib/db";

import type { PrismaTransaction } from "./transaction";

type Client = typeof prisma | PrismaTransaction;

export async function getSetting(key: string, tx?: PrismaTransaction): Promise<Setting | null> {
  const client: Client = tx ?? prisma;
  return client.setting.findUnique({ where: { key } });
}

export async function setSetting(
  key: string,
  value: string,
  tx?: PrismaTransaction,
): Promise<Setting> {
  const client: Client = tx ?? prisma;
  return client.setting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

export async function listSettings(prefix?: string, tx?: PrismaTransaction): Promise<Setting[]> {
  const client: Client = tx ?? prisma;
  return client.setting.findMany({
    where: prefix ? { key: { startsWith: prefix } } : {},
    orderBy: { key: "asc" },
  });
}
