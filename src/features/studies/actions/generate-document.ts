"use server";

/**
 * T-040 generate-document Server Action.
 *
 * Trust boundary between the study detail page's "Dokument generieren"
 * button and the Python service. Responsibilities:
 *
 *   - re-fetch the session for ownership + organizationId,
 *   - parse the studyId envelope,
 *   - load the Study + Customer + Consultant rows,
 *   - assemble a `StudyCalcInput`, run `composeAll()` for the
 *     derived values,
 *   - call the Python pyservice document-generate endpoint via
 *     `callDocumentsGenerate` (Slice-3a client),
 *   - persist two `GeneratedDocument` rows (PPTX + PDF) keyed off the
 *     paths the pyservice returned,
 *   - emit a `GENERATE_DOCUMENT` AuditLog entry,
 *   - flip `Study.status = GENERATED` (idempotent) and revalidate
 *     the detail + dashboard routes.
 *
 * Returns a discriminated `GenerateDocumentResult`; the caller maps
 * `errorCode` to copy via `src/i18n/de.ts`.
 *
 * @see docs/pptx-mapping.md (signed-off placeholder mapping)
 * @see DECISIONS.md "Slice 3a sign-off + Slice 3b design"
 */

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { canAccessStudy } from "@/features/auth/utils/can-access-study";
import { composeAll } from "@/lib/calculations";
import type { StudyCalcInput } from "@/lib/calculations/types";
import { auth } from "@/lib/auth";
import { callDocumentsGenerate } from "@/lib/python-service-client";
import { createAuditEntry } from "@/lib/repositories/audit-log.repository";
import { findCustomerById } from "@/lib/repositories/customer.repository";
import { createDocument } from "@/lib/repositories/generated-document.repository";
import { findStudyById, markStudyGenerated } from "@/lib/repositories/study.repository";
import { listStudyImages } from "@/lib/repositories/study-image.repository";
import { findUserById } from "@/lib/repositories/user.repository";

export type GenerateDocumentResult =
  | {
      ok: true;
      studyId: string;
      pptxDocumentId: string;
      pdfDocumentId: string;
    }
  | {
      ok: false;
      errorCode: "validation" | "forbidden" | "not-found" | "incomplete" | "pyservice" | "server";
      message?: string;
    };

const inputSchema = z.object({
  studyId: z.string().min(1),
});

/**
 * Empty-Value-Phrase Helpers — Defekte D1+D2+D3 (2026-05-29).
 *
 * Production-Symptome bei leeren Optional-Feldern:
 *   - D1: `flurstueck` leer → Template-Run "in Flurstück {{flurstueck}}"
 *     rendert "in Flurstück " (hängender Präfix).
 *   - D2: `terminVorschlag1/2` leer → Template "1) am {{termin_vorschlag_1}} Uhr"
 *     rendert "1) am  Uhr".
 *   - D3: `modulAnzahl`/`modulFlaeche` leer → Template "{{anlage_kwp}} kWp,
 *     {{modul_anzahl}} Module, {{modul_flaeche_m2}} m²" rendert "500 kWp,
 *      Module,  m²" (Einheiten ohne Werte).
 *
 * Fix-Strategie: Server Action liefert pre-rendered Phrase-Keys statt
 * raw-fields. Bei leeren Werten ist die Phrase ein leerer String, sodass
 * Präfix/Suffix mit verschwinden. Template-Edit (siehe
 * `scripts/normalize-empty-value-phrases.py`) ersetzt die raw-Placeholders.
 *
 * Conditional Rendering bleibt damit voll testbar in TypeScript — keine
 * spezielle Template-Syntax, keine post-render line-removal-Logik im
 * pptx_generator. Trade-off: Template + Server Action müssen synchron
 * bleiben (anti-regression-Tests beidseitig erzwingen das).
 */
function formatGermanDateTime(date: Date | null): string | null {
  if (!date) return null;
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${day}.${month}.${year} um ${hours}:${minutes}`;
}

/** German-locale integer with `.` thousands separator (e.g. ``1.234.567``). */
function formatNumberDe(value: number): string {
  return Math.round(value).toLocaleString("de-DE");
}

/**
 * Phrase including ` in Flurstück <value>` (with leading space).
 * Empty when no flurstueck is set — prevents hanging "in Flurstück " prefix.
 */
export function buildFlurstueckPhrase(flurstueck: string | null | undefined): string {
  if (!flurstueck || flurstueck.trim() === "") return "";
  return ` in Flurstück ${flurstueck.trim()}`;
}

/**
 * Phrase like ``Flurstück: 78.10`` — used on Slide 4 footer block.
 * Empty when no flurstueck is set — prevents hanging "Flurstück: " label.
 */
export function buildFlurstueckLabelPhrase(flurstueck: string | null | undefined): string {
  if (!flurstueck || flurstueck.trim() === "") return "";
  return `Flurstück: ${flurstueck.trim()}`;
}

/**
 * Phrase like ``1) am 15.03.2026 um 14:00 Uhr`` (resp. ``2) am ...``)
 * for Slide 19. Empty when the slot is unset — prevents hanging
 * "1) am  Uhr" template fragments.
 */
export function buildTerminPhrase(index: 1 | 2, termin: Date | null | undefined): string {
  const formatted = formatGermanDateTime(termin ?? null);
  if (formatted === null) return "";
  return `${index}) am ${formatted} Uhr`;
}

/**
 * Conjunction between the two termin slots on Slide 19. Returns ``"oder"``
 * only when both slots are set — otherwise the standalone "oder" would
 * orphan in the output. Returns ``""`` when only one or no slots are
 * set.
 */
export function buildTerminOderPhrase(
  termin1: Date | null | undefined,
  termin2: Date | null | undefined,
): string {
  if (termin1 && termin2) return "oder";
  return "";
}

/**
 * Phrase like ``500 kWp, 1.428 Module, 2.856 m²`` for Slide 10's
 * Gesamtleistung headline. Drops the optional Module / m² segments when
 * those values are unset — prevents trailing ", Module, m²".
 */
export function buildModulInfoPhrase(
  anlageKwp: number,
  modulAnzahl: number | null | undefined,
  modulFlaecheM2: number | null | undefined,
): string {
  const parts: string[] = [`${formatNumberDe(anlageKwp)} kWp`];
  if (modulAnzahl !== null && modulAnzahl !== undefined) {
    parts.push(`${formatNumberDe(modulAnzahl)} Module`);
  }
  if (modulFlaecheM2 !== null && modulFlaecheM2 !== undefined) {
    parts.push(`${formatNumberDe(modulFlaecheM2)} m²`);
  }
  return parts.join(", ");
}

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

  // Slice-3b gate: refuse to generate if the user hasn't progressed
  // the study to READY yet. The READY transition itself validates the
  // full schema (see transition-status.ts).
  if (study.status === "DRAFT") {
    return { ok: false, errorCode: "incomplete" };
  }

  const customer = await findCustomerById(organizationId, study.customerId);
  if (customer === null) {
    return { ok: false, errorCode: "not-found" };
  }

  const consultant = await findUserById(organizationId, study.consultantId);
  if (consultant === null) {
    return { ok: false, errorCode: "not-found" };
  }

  const calcInput: StudyCalcInput = {
    anlageKwp: Number(study.anlageKwp),
    pvErzeugungKwhJahr: Number(study.pvErzeugungKwhJahr),
    pvEigenverbrauchKwhJahr: Number(study.pvEigenverbrauchKwhJahr),
    pvVerkaufEurKwh: Number(study.pvVerkaufEurKwh),
    verbrauchKwhJahr: Number(study.verbrauchKwhJahr),
    versorgerPreisEurKwh: Number(study.versorgerPreisEurKwh),
    pachtEurProKwp: Number(study.pachtEurProKwp),
    vertragslaufzeitJahre: study.vertragslaufzeitJahre,
    co2Override: study.co2Override,
    co2TonnenProJahrOverride:
      study.co2TonnenProJahr === null ? undefined : Number(study.co2TonnenProJahr),
    co2HektarMischwaldOverride:
      study.co2HektarMischwald === null ? undefined : Number(study.co2HektarMischwald),
    co2FussballfelderProJahrOverride:
      study.co2FussballfelderProJahr === null ? undefined : Number(study.co2FussballfelderProJahr),
  };
  const derived = composeAll(calcInput);

  const customerName = [customer.contactFirstName, customer.contactLastName]
    .filter((s) => s.length > 0)
    .join(" ");
  const consultantName = [consultant.firstName, consultant.lastName]
    .filter((s) => s.length > 0)
    .join(" ");

  // Slice 4 — load the per-study image uploads (T-029a) so the Python
  // service can swap the BEFORE / AFTER placeholder shapes on slides 4
  // + 5. Missing images fall back to null and the template's
  // placeholder graphics survive (pptx_generator log will note the
  // skip).
  const studyImages = await listStudyImages(studyId);
  const imageBeforePath = studyImages.find((i) => i.type === "BEFORE")?.filename ?? null;
  const imageAfterPath = studyImages.find((i) => i.type === "AFTER")?.filename ?? null;

  // Pre-render empty-value-safe phrases here so the conditional logic
  // stays in TypeScript (testable via Vitest) and the Python service /
  // PPTX template stay 100% declarative. Defekte D1+D2+D3 (2026-05-29).
  const modulAnzahl = study.modulAnzahl ?? null;
  const modulFlaecheM2 =
    study.modulFlaecheM2 === null || study.modulFlaecheM2 === undefined
      ? null
      : Number(study.modulFlaecheM2);

  const pyResult = await callDocumentsGenerate({
    study: calcInput,
    derivedValues: derived,
    customerName: customerName || "Kunde",
    objectName: study.objectName || "Studie",
    consultantName: consultantName || consultant.email,
    imageBeforePath,
    imageAfterPath,
    flurstueckPhrase: buildFlurstueckPhrase(study.flurstueck),
    flurstueckLabelPhrase: buildFlurstueckLabelPhrase(study.flurstueck),
    termin1Phrase: buildTerminPhrase(1, study.terminVorschlag1 ?? null),
    termin2Phrase: buildTerminPhrase(2, study.terminVorschlag2 ?? null),
    terminOderPhrase: buildTerminOderPhrase(
      study.terminVorschlag1 ?? null,
      study.terminVorschlag2 ?? null,
    ),
    modulInfoPhrase: buildModulInfoPhrase(Number(study.anlageKwp), modulAnzahl, modulFlaecheM2),
  });

  if (!pyResult.ok) {
    return {
      ok: false,
      errorCode: "pyservice",
      message: pyResult.message,
    };
  }

  const headerList = await headers();
  const ipAddress = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = headerList.get("user-agent") ?? null;

  try {
    const [pptxDoc, pdfDoc] = await Promise.all([
      createDocument(studyId, {
        format: "PPTX",
        filename: pyResult.data.pptxPath,
        generatedBy: { connect: { id: session.user.id } },
      }),
      createDocument(studyId, {
        format: "PDF",
        filename: pyResult.data.pdfPath,
        generatedBy: { connect: { id: session.user.id } },
      }),
    ]);

    await markStudyGenerated(organizationId, studyId);

    await createAuditEntry(organizationId, {
      user: { connect: { id: session.user.id } },
      entityType: "Study",
      entityId: studyId,
      action: "GENERATE_DOCUMENT",
      changeSet: {
        pptxDocumentId: [null, pptxDoc.id],
        pdfDocumentId: [null, pdfDoc.id],
        pptxPath: [null, pyResult.data.pptxPath],
        pdfPath: [null, pyResult.data.pdfPath],
      },
      ipAddress,
      userAgent,
    });

    revalidatePath("/studies");
    revalidatePath(`/studies/${studyId}`);

    return {
      ok: true,
      studyId,
      pptxDocumentId: pptxDoc.id,
      pdfDocumentId: pdfDoc.id,
    };
  } catch (err) {
    console.error("[generate-document]", err);
    return { ok: false, errorCode: "server" };
  }
}
