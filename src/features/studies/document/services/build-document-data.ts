/**
 * §7.10-Pivot PR 2 — `buildStudyDocumentData(organizationId, studyId)`
 *
 * Trust-boundary entry point for assembling the `StudyDocumentData`
 * bundle that every React-Slide-Komponente consumes. Reused in PR 3
 * by the Playwright-PDF-Endpoint and in PR 4 by the HMAC-gated Public
 * Online-Ansicht — so this function MUST be the single source of truth
 * for "what data goes into a slide render".
 *
 * Pipeline:
 *   1. Look up the `Study` by id + organizationId. If missing or
 *      soft-deleted → returns `null`.
 *   2. Look up the linked `Customer` and `Consultant`. If either is
 *      missing (referential-integrity violation — should not happen in
 *      practice because Study.customerId / consultantId have
 *      `onDelete: Restrict`) → return `null`.
 *   3. Load all `StudyImage` rows for the study; map to the
 *      `/api/uploads/<id>` URLs the existing T-029a route serves.
 *   4. Build a `StudyCalcInput` from the Study's typed Decimal fields,
 *      run `composeAll()`, and bundle the result.
 *
 * Callers are responsible for their own auth / ownership gates. This
 * function does NOT call `auth()` — PR 4's public route uses an HMAC
 * gate rather than a session check, so wiring `auth()` here would
 * make the function unusable on that path.
 *
 * Pure function modulo Prisma reads — no side effects, no writes, no
 * caching, no header-reads. Same studyId → same output (assuming the
 * row doesn't change between calls).
 */

import { composeAll } from "@/lib/calculations";
import type { StudyCalcInput } from "@/lib/calculations/types";
import { findCustomerById } from "@/lib/repositories/customer.repository";
import { findStudyById } from "@/lib/repositories/study.repository";
import { listStudyImages } from "@/lib/repositories/study-image.repository";
import { findUserById } from "@/lib/repositories/user.repository";

import type { StudyDocumentData, StudyDocumentImages } from "../types";

/**
 * Build the `StudyDocumentData` bundle for a study. Returns `null` if
 * the study (or any of its required FK rows) cannot be found within
 * the organization.
 */
export async function buildStudyDocumentData(
  organizationId: string,
  studyId: string,
): Promise<StudyDocumentData | null> {
  const study = await findStudyById(organizationId, studyId);
  if (study === null) {
    return null;
  }

  const customer = await findCustomerById(organizationId, study.customerId);
  if (customer === null) {
    return null;
  }

  const consultant = await findUserById(organizationId, study.consultantId);
  if (consultant === null) {
    return null;
  }

  const images = await listStudyImages(studyId);
  const beforeImage = images.find((i) => i.type === "BEFORE") ?? null;
  const afterImage = images.find((i) => i.type === "AFTER") ?? null;

  const documentImages: StudyDocumentImages = {
    beforeUrl: beforeImage === null ? null : `/api/uploads/${beforeImage.id}`,
    afterUrl: afterImage === null ? null : `/api/uploads/${afterImage.id}`,
  };

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

  return {
    customer,
    study,
    consultant,
    derived,
    images: documentImages,
  };
}
