/**
 * Barrel export for the repository layer. Application code should
 * import from `@/lib/repositories` rather than individual files:
 *
 *   import { findUserByEmail, withTransaction } from "@/lib/repositories";
 *
 * Direct imports from `@/generated/prisma` outside this directory are
 * forbidden by an ESLint rule — see `eslint.config.mjs`
 * `no-restricted-imports` block.
 */

export * from "./with-org";
export * from "./transaction";
export * from "./user.repository";
export * from "./customer.repository";
export * from "./study.repository";
export * from "./study-image.repository";
export * from "./generated-document.repository";
export * from "./audit-log.repository";
export * from "./setting.repository";
