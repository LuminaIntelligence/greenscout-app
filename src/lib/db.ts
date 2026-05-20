// Prisma Client singleton with Next.js dev hot-reload protection.
// All repository files import `prisma` from here; nothing else should
// reach into `@/generated/prisma` directly (enforced by an ESLint rule
// in this PR — see eslint.config.mjs `no-restricted-imports`).
//
// See CLAUDE.md §3 (architectural decisions) and DECISIONS.md
// "T-014 silent decisions per §14 (consolidated)".

import { PrismaClient } from "@/generated/prisma";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ log: ["warn", "error"] });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
