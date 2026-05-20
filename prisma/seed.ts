/**
 * GreenScout admin-account seed.
 *
 * Idempotent: if an admin with the email from SEED_ADMIN_EMAIL already
 * exists (including soft-deleted), the script logs and exits 0 without
 * changes. If no admin is present, a new ADMIN user is created with
 * `mustChangePassword=true` so the first login forces a real password.
 *
 * Required env vars (templated in `.env.example`):
 *   SEED_ADMIN_EMAIL          — e.g. consulting@lumina-intelligence.ai
 *   SEED_ADMIN_TEMP_PASSWORD  — temporary password, must be changed on
 *                                first login
 *
 * Repository-layer-only Prisma access: this script imports
 * `createUser`, `findUserByEmail`, and `createAuditEntry` from
 * `@/lib/repositories/*`. The single direct touch of `@/lib/db` is the
 * final `prisma.$disconnect()` call, which keeps the Node process from
 * hanging when `prisma db seed` finishes.
 *
 * @see DECISIONS.md → "Admin account provisioning via seed (user-confirmed)"
 * @see DECISIONS.md → "T-015 silent decisions per §14 (consolidated)"
 */

import { hashPassword } from "@/features/auth/utils/hash-password";
import { normaliseEmail } from "@/features/auth/utils/normalise-email";
import { prisma } from "@/lib/db";
import { createAuditEntry } from "@/lib/repositories/audit-log.repository";
import { createUser, findUserByEmail } from "@/lib/repositories/user.repository";

const ORG_ID = "greenscout";

function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") {
    console.error(`[seed] FATAL: env var ${name} is missing or empty.`);
    console.error("[seed] Populate .env from .env.example and re-run.");
    process.exit(1);
  }
  return value;
}

async function main(): Promise<void> {
  console.log("[seed] loading env...");
  const rawEmail = readRequiredEnv("SEED_ADMIN_EMAIL");
  const tempPassword = readRequiredEnv("SEED_ADMIN_TEMP_PASSWORD");
  const email = normaliseEmail(rawEmail);

  console.log(`[seed] checking for existing admin '${email}'...`);
  const existing = await findUserByEmail(ORG_ID, email, { includeDeleted: true });
  if (existing !== null) {
    const deletedSuffix = existing.deletedAt === null ? "—" : existing.deletedAt.toISOString();
    console.log(
      `[seed] admin user already exists (id=${existing.id}, deletedAt=${deletedSuffix}); no-op.`,
    );
    return;
  }

  console.log("[seed] hashing temp password (argon2id)...");
  const passwordHash = await hashPassword(tempPassword);

  console.log("[seed] creating admin user...");
  const admin = await createUser(ORG_ID, {
    email,
    passwordHash,
    firstName: "Admin",
    lastName: "GreenScout",
    role: "ADMIN",
    mustChangePassword: true,
  });

  console.log(`[seed] admin created (id=${admin.id}). Writing audit entry...`);
  await createAuditEntry(ORG_ID, {
    // No `user` relation: this is a system event with no logged-in actor.
    // `AuditLog.userId` is nullable; omitting the relation persists null.
    entityType: "User",
    entityId: admin.id,
    action: "CREATE",
    changeSet: {
      email: [null, email],
      role: [null, "ADMIN"],
      mustChangePassword: [null, true],
    },
  });

  console.log("[seed] done. Admin must change password on first login.");
}

main()
  .catch((err: unknown) => {
    console.error("[seed] FATAL:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
