"use server";

/**
 * T-025/T-026 create-study Server Action.
 *
 * Trust boundary between the React wizard / single-page entry
 * surface and the `study.repository` + `audit-log.repository`
 * modules. Responsibilities:
 *
 *   - re-fetch the session for `userId` + `organizationId` (the
 *     client never sends them; `consultantId` is the session user),
 *   - re-parse the Step-1 payload via `step1KundeSchema` (the only
 *     piece of input that exists on create — the wizard's first
 *     step picks the customer),
 *   - persist the new `Study` in `DRAFT` status with sentinel zero /
 *     empty-string defaults for the NOT-NULL columns that are
 *     filled later by autosave (`anlageKwp`, `pvErzeugung…`,
 *     `object*`, `flurstueck`). The user-facing per-step zod
 *     schemas validate the populated state; the database accepts
 *     a placeholder draft until the consultant completes Step 8,
 *     at which point `studyFullSchema` gates the
 *     `STATUS_CHANGE DRAFT → READY` transition (Server Action
 *     `transition-status.ts`),
 *   - emit a `CREATE` AuditLog entry with `changeSet` recording
 *     `customerId` (the only user-supplied field at create),
 *   - revalidate the dashboard route so the new study appears.
 *
 * Return type is a discriminated `CreateStudyResult`. The client
 * maps `errorCode` to copy via `src/i18n/de.ts`.
 *
 * @see DECISIONS.md → "T-025 silent decisions per §14 (consolidated)"
 */

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { step1KundeSchema } from "@/features/studies/schemas/step1-kunde";
import { auth } from "@/lib/auth";
import { createAuditEntry } from "@/lib/repositories/audit-log.repository";
import { createStudy } from "@/lib/repositories/study.repository";

export type CreateStudyResult =
  | { ok: true; studyId: string }
  | {
      ok: false;
      errorCode: "validation" | "forbidden" | "server";
      fieldErrors?: Record<string, string>;
    };

export async function createStudyAction(rawData: unknown): Promise<CreateStudyResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, errorCode: "forbidden" };
  }

  const parsed = step1KundeSchema.safeParse(rawData);
  if (!parsed.success) {
    const fieldErrors = parsed.error.issues.reduce<Record<string, string>>((acc, issue) => {
      acc[issue.path.join(".")] = issue.message;
      return acc;
    }, {});
    return { ok: false, errorCode: "validation", fieldErrors };
  }

  const headerList = await headers();
  const ipAddress = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = headerList.get("user-agent") ?? null;

  try {
    // DRAFT placeholder values for NOT-NULL columns the wizard fills
    // in later steps. The studyFullSchema gates the READY transition;
    // here we just need legal DB values so the row can exist as DRAFT.
    const study = await createStudy(session.user.organizationId, {
      consultant: { connect: { id: session.user.id } },
      customer: { connect: { id: parsed.data.customerId } },
      status: "DRAFT",
      objectName: "",
      objectAddress: "",
      objectZipCode: "",
      objectCity: "",
      flurstueck: "",
      anlageKwp: 0,
      pvErzeugungKwhJahr: 0,
      pvEigenverbrauchKwhJahr: 0,
      pvVerkaufEurKwh: 0,
      verbrauchKwhJahr: 0,
      versorgerPreisEurKwh: 0,
    });

    await createAuditEntry(session.user.organizationId, {
      user: { connect: { id: session.user.id } },
      entityType: "Study",
      entityId: study.id,
      action: "CREATE",
      changeSet: { customerId: [null, parsed.data.customerId] },
      ipAddress,
      userAgent,
    });

    revalidatePath("/studies");
    return { ok: true, studyId: study.id };
  } catch (err) {
    // DSGVO §7.11 — never log raw input.
    console.error("[create-study]", err);
    return { ok: false, errorCode: "server" };
  }
}
