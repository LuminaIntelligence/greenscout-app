/**
 * Admin lockout-alert emitter — no-op stub until T-020 wires real SMTP.
 *
 * Called by `authorize-credentials.ts` when a user hits counter == 10
 * consecutive failed login attempts. Currently console.warn + AuditLog
 * entry only; T-020 replaces this with a real SMTP send.
 *
 * @see DECISIONS.md → "T-017 Auth.js v5 Credentials + session config"
 *      (corrective ② lockout state machine)
 */

import { createAuditEntry } from "@/lib/repositories/audit-log.repository";

export interface AdminAlertContext {
  userId: string;
  userEmail: string;
  counter: number;
  ipAddress: string | null;
  userAgent: string | null;
}

const ORG_ID = "greenscout";

export async function emitAdminLockoutAlert(ctx: AdminAlertContext): Promise<void> {
  // Forensic audit row is written even though the real SMTP send is
  // a no-op for now. `userId` is wired via the relation form because
  // `Prisma.AuditLogCreateInput` is the checked variant.
  console.warn(
    `[admin-alert] User ${ctx.userId} (${ctx.userEmail}) reached counter=${ctx.counter}; locked 1h.`,
  );
  await createAuditEntry(ORG_ID, {
    user: { connect: { id: ctx.userId } },
    entityType: "Auth",
    entityId: null,
    action: "LOCKOUT",
    changeSet: { counter: [null, ctx.counter] },
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });
}
