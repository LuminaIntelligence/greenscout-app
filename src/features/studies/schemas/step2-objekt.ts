/**
 * T-025 wizard Step 2 — Objekt & Flurstück.
 *
 * Mirrors `Study.objectName / objectAddress / objectZipCode /
 * objectCity / flurstueck` (all `String` non-null in the schema —
 * required at this step).
 *
 * @see DECISIONS.md → Wizard-Step layout (decision #5)
 */

import { z } from "zod";

import { requiredString } from "./common";

export const step2ObjektSchema = z.object({
  objectName: requiredString("studies.error.object-name-required"),
  objectAddress: requiredString("studies.error.object-address-required"),
  objectZipCode: requiredString("studies.error.object-zip-required"),
  objectCity: requiredString("studies.error.object-city-required"),
  flurstueck: requiredString("studies.error.flurstueck-required"),
});

export type Step2ObjektInput = z.infer<typeof step2ObjektSchema>;
