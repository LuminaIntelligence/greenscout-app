"use server";

/**
 * §7.10-Pivot PR 3 — generate-document Server Action, rewired auf
 * den Playwright-PDF-Renderer.
 *
 * Trust boundary zwischen dem Study-Detail-„Dokument generieren"-Button
 * und dem internen Render-Stack. Verantwortlichkeiten:
 *
 *   - re-fetch der Session für Ownership + organizationId,
 *   - Studie + Customer + Consultant aus der DB laden (Ownership-Check
 *     via `canAccessStudy`),
 *   - DRAFT-Studien ablehnen (READY-Gate aus `transitionStatus`),
 *   - `renderStudyToPdf(studyId)` aufrufen (Playwright → interne Render-
 *     Route → PDF auf Disk),
 *   - EIN `GeneratedDocument`-Eintrag (`format = "PDF"`) persistieren,
 *   - `GENERATE_DOCUMENT` AuditLog-Entry schreiben (changeSet enthält
 *     nur noch pdfDocumentId + pdfPath),
 *   - `Study.status = GENERATED` flippen (idempotent) + revalidate.
 *
 * **Bestehende PPTX-Einträge in der DB bleiben unberührt** (historische
 * Datenintegrität, DECISIONS 2026-06-01). Neue Generation erzeugt nur
 * noch PDF.
 *
 * Die Phrase-Helper aus PR 2 wurden in die React-Slides verschoben (über
 * `format.ts`) — `generate-document-phrases.ts` wird im selben PR-3-Diff
 * entfernt; hier ist kein Import mehr nötig.
 *
 * @see SPEC.md §4.8 (React-Slide-Renderer-Architektur)
 * @see DECISIONS.md 2026-06-01 (§7.10-Pivot)
 */

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { canAccessStudy } from "@/features/auth/utils/can-access-study";
import { renderStudyToPdf } from "@/features/studies/document/services/render-pdf";
import { auth } from "@/lib/auth";
import { createAuditEntry } from "@/lib/repositories/audit-log.repository";
import { findCustomerById } from "@/lib/repositories/customer.repository";
import { createDocument } from "@/lib/repositories/generated-document.repository";
import { findStudyById, markStudyGenerated } from "@/lib/repositories/study.repository";
import { findUserById } from "@/lib/repositories/user.repository";

export type GenerateDocumentResult =
  | {
      ok: true;
      studyId: string;
      pdfDocumentId: string;
    }
  | {
      ok: false;
      errorCode: "validation" | "forbidden" | "not-found" | "incomplete" | "render" | "server";
      message?: string;
    };

const inputSchema = z.object({
  studyId: z.string().min(1),
});

export async function generateDocumentAction(rawInput: unknown): Promise<GenerateDocumentResult> {
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, errorCode: "validation" };
  }

  const session = await auth();
  if (!session?.user) {
    return { ok: false, errorCode: "forbidden" };
  }

  const { studyId } = parsed.data;
  const organizationId = session.user.organizationId;

  const study = await findStudyById(organizationId, studyId);
  if (study === null) {
    return { ok: false, errorCode: "not-found" };
  }
  if (!canAccessStudy(session, study)) {
    return { ok: false, errorCode: "forbidden" };
  }

  // Slice-3b gate (unchanged): refuse to generate if the user hasn't
  // progressed the study to READY yet. The READY transition itself
  // validates the full schema (see transition-status.ts).
  if (study.status === "DRAFT") {
    return { ok: false, errorCode: "incomplete" };
  }

  // Existence-Checks für Customer + Consultant — die Render-Route ruft
  // `buildStudyDocumentData` intern erneut auf, aber wir wollen
  // hier early-fail mit klarer Error-Code-Differenzierung statt eines
  // generischen "render" wenn z. B. der Consultant gelöscht wurde.
  const customer = await findCustomerById(organizationId, study.customerId);
  if (customer === null) {
    return { ok: false, errorCode: "not-found" };
  }

  const consultant = await findUserById(organizationId, study.consultantId);
  if (consultant === null) {
    return { ok: false, errorCode: "not-found" };
  }

  // Render PDF via Playwright. Die Render-Route lädt sich Customer +
  // Consultant + StudyImages + Derived-Values selbst über
  // `buildStudyDocumentData()` — kein Daten-Transport hier mehr.
  let pdfFilename: string;
  let pdfAbsolutePath: string;
  try {
    const result = await renderStudyToPdf(studyId);
    pdfFilename = result.filename;
    pdfAbsolutePath = result.absolutePath;
  } catch (err) {
    console.error("[generate-document] renderStudyToPdf failed", err);
    return {
      ok: false,
      errorCode: "render",
      message: err instanceof Error ? err.message : "Unbekannter Render-Fehler",
    };
  }

  const headerList = await headers();
  const ipAddress = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = headerList.get("user-agent") ?? null;

  try {
    const pdfDoc = await createDocument(studyId, {
      format: "PDF",
      filename: pdfAbsolutePath,
      generatedBy: { connect: { id: session.user.id } },
    });

    await markStudyGenerated(organizationId, studyId);

    await createAuditEntry(organizationId, {
      user: { connect: { id: session.user.id } },
      entityType: "Study",
      entityId: studyId,
      action: "GENERATE_DOCUMENT",
      changeSet: {
        pdfDocumentId: [null, pdfDoc.id],
        pdfPath: [null, pdfAbsolutePath],
        pdfFilename: [null, pdfFilename],
      },
      ipAddress,
      userAgent,
    });

    revalidatePath("/studies");
    revalidatePath(`/studies/${studyId}`);

    return {
      ok: true,
      studyId,
      pdfDocumentId: pdfDoc.id,
    };
  } catch (err) {
    console.error("[generate-document]", err);
    return { ok: false, errorCode: "server" };
  }
}
