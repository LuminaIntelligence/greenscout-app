"use server";

/**
 * T-030 handover-study Server Action.
 *
 * Implements SPEC §4.3 F6: the owning consultant — or any admin — can
 * re-assign a study to another consultant. Responsibilities:
 *
 *   - re-fetch the session for `userId` + `organizationId`,
 *   - parse the envelope (`studyId`, `newConsultantId`),
 *   - read-first ownership check via `canAccessStudy`
 *     (owner OR admin),
 *   - target-user validation: must exist, same org, BERATER or ADMIN
 *     role, `active === true`, not soft-deleted, not identical to the
 *     current owner (idempotent short-circuit),
 *   - persist via `transferStudy(orgId, id, newConsultantId)` and emit
 *     a `HANDOVER` AuditLog entry with `changeSet`
 *     `{ consultantId: [oldId, newId] }`. The audit actor is the
 *     **session user**, not the previous consultant — so admin-driven
 *     handovers are attributable.
 *   - revalidate dashboard + study detail routes.
 *
 * `HANDOVER` is added to the SPEC §5.1 AuditLog action allow-list
 * additively for this slice.
 *
 * @see DECISIONS.md → "Slice 5a (T-030 / T-041a) silent decisions per §14"
 */

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { canAccessStudy } from "@/features/auth/utils/can-access-study";
import { auth } from "@/lib/auth";
import { createAuditEntry } from "@/lib/repositories/audit-log.repository";
import { findStudyById, transferStudy } from "@/lib/repositories/study.repository";
import { findUserById } from "@/lib/repositories/user.repository";

export type HandoverStudyResult =
  | { ok: true; studyId: string; newConsultantId: string }
  | {
      ok: false;
      errorCode:
        | "validation"
        | "forbidden"
        | "not-found"
        | "target-not-found"
        | "target-not-eligible"
        | "server";
    };

const inputSchema = z.object({
  studyId: z.string().min(1),
  newConsultantId: z.string().min(1),
});

export async function handoverStudyAction(rawInput: unknown): Promise<HandoverStudyResult> {
  const envelope = inputSchema.safeParse(rawInput);
  if (!envelope.success) {
    return { ok: false, errorCode: "validation" };
  }

  const session = await auth();
  if (!session?.user) {
    return { ok: false, errorCode: "forbidden" };
  }

  const { studyId, newConsultantId } = envelope.data;
  const organizationId = session.user.organizationId;

  const study = await findStudyById(organizationId, studyId);
  if (study === null) {
    return { ok: false, errorCode: "not-found" };
  }

  // Owner-or-admin gate (SPEC §4.3 F6 + F7 god-mode).
  if (!canAccessStudy(session, study)) {
    return { ok: false, errorCode: "forbidden" };
  }

  const oldConsultantId = study.consultantId;

  // Idempotent no-op: re-assigning to the current owner is a click-
  // re-submit, not a user-visible error.
  if (newConsultantId === oldConsultantId) {
    return { ok: true, studyId, newConsultantId };
  }

  const target = await findUserById(organizationId, newConsultantId);
  if (target === null) {
    return { ok: false, errorCode: "target-not-found" };
  }

  // SPEC §3.1 + §3.2: a study can only belong to a BERATER or ADMIN
  // (the two enum values). The repo's soft-delete filter already
  // excludes `deletedAt !== null`; the `active` check is the second
  // gate — a deactivated account must not receive new work.
  if (!target.active) {
    return { ok: false, errorCode: "target-not-eligible" };
  }

  const headerList = await headers();
  const ipAddress = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = headerList.get("user-agent") ?? null;

  try {
    await transferStudy(organizationId, studyId, newConsultantId);

    await createAuditEntry(organizationId, {
      user: { connect: { id: session.user.id } },
      entityType: "Study",
      entityId: studyId,
      action: "HANDOVER",
      changeSet: { consultantId: [oldConsultantId, newConsultantId] },
      ipAddress,
      userAgent,
    });

    revalidatePath("/studies");
    revalidatePath(`/studies/${studyId}`);
    return { ok: true, studyId, newConsultantId };
  } catch (err) {
    console.error("[handover-study]", err);
    return { ok: false, errorCode: "server" };
  }
}
