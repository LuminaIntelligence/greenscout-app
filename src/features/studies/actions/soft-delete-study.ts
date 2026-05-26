"use server";

/**
 * T-028 soft-delete-study Server Action.
 *
 * Mirrors the T-024 customer soft-delete pattern. Responsibilities:
 *
 *   - re-parse the FormData payload (`studyId`),
 *   - re-fetch the session,
 *   - read-first ownership check (`findStudyById` with
 *     `includeDeleted: true` so we can distinguish "already
 *     deleted" from "never existed"),
 *   - idempotent short-circuit when already deleted,
 *   - persist via race-safe `softDeleteStudy(orgId, id, deletedAt)`,
 *   - emit `SOFT_DELETE` AuditLog entry,
 *   - revalidate dashboard.
 *
 * BERATER may delete only their own studies; ADMIN may delete any
 * (F7).
 *
 * @see DECISIONS.md → "T-028 silent decisions per §14 (consolidated)"
 */

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { canAccessStudy } from "@/features/auth/utils/can-access-study";
import { auth } from "@/lib/auth";
import { createAuditEntry } from "@/lib/repositories/audit-log.repository";
import { findStudyById, softDeleteStudy } from "@/lib/repositories/study.repository";

export type SoftDeleteStudyResult =
  | { ok: true; studyId: string }
  | { ok: false; errorCode: "not-found" | "forbidden" | "server" };

const softDeleteInputSchema = z.object({
  studyId: z.string().min(1),
});

export async function softDeleteStudyAction(formData: FormData): Promise<SoftDeleteStudyResult> {
  const parsed = softDeleteInputSchema.safeParse({
    studyId: formData.get("studyId"),
  });
  if (!parsed.success) {
    return { ok: false, errorCode: "server" };
  }

  const session = await auth();
  if (!session?.user) {
    return { ok: false, errorCode: "server" };
  }

  const { studyId } = parsed.data;

  const existing = await findStudyById(session.user.organizationId, studyId, {
    includeDeleted: true,
  });
  if (existing === null) {
    return { ok: false, errorCode: "not-found" };
  }

  if (!canAccessStudy(session, existing)) {
    return { ok: false, errorCode: "forbidden" };
  }

  if (existing.deletedAt !== null) {
    return { ok: true, studyId };
  }

  const headerList = await headers();
  const ipAddress = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = headerList.get("user-agent") ?? null;

  const deletedAt = new Date();

  try {
    const updated = await softDeleteStudy(session.user.organizationId, studyId, deletedAt);
    if (updated === null) {
      // Race-loss: another caller soft-deleted between our read and
      // write. Treat as idempotent success — the user's intent is
      // fulfilled either way.
      return { ok: true, studyId };
    }

    await createAuditEntry(session.user.organizationId, {
      user: { connect: { id: session.user.id } },
      entityType: "Study",
      entityId: studyId,
      action: "SOFT_DELETE",
      changeSet: { deletedAt: [null, deletedAt.toISOString()] },
      ipAddress,
      userAgent,
    });

    revalidatePath("/studies");
    return { ok: true, studyId };
  } catch (err) {
    console.error("[soft-delete-study]", err);
    return { ok: false, errorCode: "server" };
  }
}
