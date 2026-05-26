"use server";

/**
 * T-025/T-028 transition-status Server Action.
 *
 * Drives the `DRAFT → READY → GENERATED` state machine on
 * `Study.status`. Responsibilities:
 *
 *   - re-fetch the session for `userId` + `organizationId`,
 *   - parse the envelope (`studyId`, `newStatus`),
 *   - read-first ownership check (`findStudyById`),
 *   - **gate the DRAFT → READY transition on `studyFullSchema`** so
 *     a study only flips to READY when every required field across
 *     all 8 wizard steps validates,
 *   - delegate to `setStudyStatus` which enforces the state-machine
 *     allow-list (throws `InvalidStudyStatusTransitionError` on
 *     invalid pairs),
 *   - emit a `STATUS_CHANGE` AuditLog entry with the diff
 *     `{ status: [oldStatus, newStatus] }`,
 *   - revalidate dashboard + study routes.
 *
 * `STATUS_CHANGE` was added to the SPEC §5.1 AuditLog allow-list
 * additively for this slice.
 *
 * @see DECISIONS.md → "T-025 silent decisions per §14 (consolidated)"
 */

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { studyFullSchema } from "@/features/studies/schemas/study-full-schema";
import { auth } from "@/lib/auth";
import { createAuditEntry } from "@/lib/repositories/audit-log.repository";
import {
  findStudyById,
  InvalidStudyStatusTransitionError,
  setStudyStatus,
} from "@/lib/repositories/study.repository";

// Mirror the Prisma `StudyStatus` enum locally so this action file
// does not pull `@/generated/prisma` (restricted to the repository
// layer by ESLint `no-restricted-imports`). The repository's
// `setStudyStatus` enforces the same value set at runtime via its
// `STATUS_TRANSITIONS` allow-list.
type StudyStatus = "DRAFT" | "READY" | "GENERATED";

export type TransitionStatusResult =
  | { ok: true; studyId: string; status: StudyStatus }
  | {
      ok: false;
      errorCode:
        | "validation"
        | "not-found"
        | "forbidden"
        | "invalid-transition"
        | "incomplete"
        | "server";
      fieldErrors?: Record<string, string>;
    };

const inputSchema = z.object({
  studyId: z.string().min(1),
  newStatus: z.enum(["DRAFT", "READY", "GENERATED"]),
});

export async function transitionStudyStatusAction(
  rawInput: unknown,
): Promise<TransitionStatusResult> {
  const envelope = inputSchema.safeParse(rawInput);
  if (!envelope.success) {
    return { ok: false, errorCode: "validation" };
  }

  const session = await auth();
  if (!session?.user) {
    return { ok: false, errorCode: "forbidden" };
  }

  const { studyId, newStatus } = envelope.data;

  const existing = await findStudyById(session.user.organizationId, studyId);
  if (existing === null) {
    return { ok: false, errorCode: "not-found" };
  }

  if (session.user.role !== "ADMIN" && existing.consultantId !== session.user.id) {
    return { ok: false, errorCode: "forbidden" };
  }

  const oldStatus = existing.status;
  if (oldStatus === newStatus) {
    // Idempotent no-op (e.g. button double-click).
    return { ok: true, studyId, status: newStatus };
  }

  // Gate the DRAFT → READY transition on full-schema validation. The
  // wizard's Step 8 has already nudged the user to fill every field,
  // but defence-in-depth: re-validate server-side so a tampered
  // request can't promote a draft to READY with missing data.
  if (newStatus === "READY") {
    const fullCheck = studyFullSchema.safeParse({
      customerId: existing.customerId,
      objectName: existing.objectName,
      objectAddress: existing.objectAddress,
      objectZipCode: existing.objectZipCode,
      objectCity: existing.objectCity,
      flurstueck: existing.flurstueck,
      anlageKwp: Number(existing.anlageKwp),
      pvErzeugungKwhJahr: Number(existing.pvErzeugungKwhJahr),
      pvEigenverbrauchKwhJahr: Number(existing.pvEigenverbrauchKwhJahr),
      pvVerkaufEurKwh: Number(existing.pvVerkaufEurKwh),
      verbrauchKwhJahr: Number(existing.verbrauchKwhJahr),
      versorgerPreisEurKwh: Number(existing.versorgerPreisEurKwh),
      pachtEurProKwp: Number(existing.pachtEurProKwp),
      vertragslaufzeitJahre: existing.vertragslaufzeitJahre,
      modulAnzahl: existing.modulAnzahl ?? "",
      modulFlaecheM2: existing.modulFlaecheM2 === null ? "" : Number(existing.modulFlaecheM2),
      eigenverbrauchsquoteProzent:
        existing.eigenverbrauchsquoteProzent === null
          ? ""
          : Number(existing.eigenverbrauchsquoteProzent),
      netzeinspeisungKwhJahr:
        existing.netzeinspeisungKwhJahr === null ? "" : Number(existing.netzeinspeisungKwhJahr),
      szenarioPreis1: existing.szenarioPreis1 === null ? "" : Number(existing.szenarioPreis1),
      szenarioPreis2: existing.szenarioPreis2 === null ? "" : Number(existing.szenarioPreis2),
      szenarioPreis3: existing.szenarioPreis3 === null ? "" : Number(existing.szenarioPreis3),
      terminVorschlag1: existing.terminVorschlag1 ?? "",
      terminVorschlag2: existing.terminVorschlag2 ?? "",
    });
    if (!fullCheck.success) {
      const fieldErrors = fullCheck.error.issues.reduce<Record<string, string>>((acc, issue) => {
        acc[issue.path.join(".")] = issue.message;
        return acc;
      }, {});
      return { ok: false, errorCode: "incomplete", fieldErrors };
    }
  }

  const headerList = await headers();
  const ipAddress = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = headerList.get("user-agent") ?? null;

  try {
    const updated = await setStudyStatus(session.user.organizationId, studyId, newStatus);
    if (updated === null) {
      return { ok: false, errorCode: "not-found" };
    }

    await createAuditEntry(session.user.organizationId, {
      user: { connect: { id: session.user.id } },
      entityType: "Study",
      entityId: studyId,
      action: "STATUS_CHANGE",
      changeSet: { status: [oldStatus, newStatus] },
      ipAddress,
      userAgent,
    });

    revalidatePath("/studies");
    revalidatePath(`/studies/${studyId}`);
    return { ok: true, studyId, status: newStatus };
  } catch (err) {
    if (err instanceof InvalidStudyStatusTransitionError) {
      return { ok: false, errorCode: "invalid-transition" };
    }
    console.error("[transition-study-status]", err);
    return { ok: false, errorCode: "server" };
  }
}
