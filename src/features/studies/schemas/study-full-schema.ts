/**
 * T-025 composed full study schema.
 *
 * Unions the seven step schemas into a single zod object. Used by:
 *
 *   - the `transition-status` Server Action when flipping
 *     `Study.status DRAFT → READY` (the consultant promises that
 *     every required field is now present);
 *   - the wizard's Step 8 review screen to compute whether the
 *     "Studie als bereit markieren" button is enabled;
 *   - the single-page layout's bottom Save button as the equivalent
 *     of the wizard's final review.
 *
 * Per CLAUDE.md §4.2 the inferred TS type is exported so callers
 * never need to reconstruct it from the zod schema.
 *
 * @see DECISIONS.md → Wizard-Step layout (decision #5)
 */

import { z } from "zod";

import { step1KundeSchema } from "./step1-kunde";
import { step2ObjektSchema } from "./step2-objekt";
import { step3PvInputsSchema } from "./step3-pv-inputs";
import { step4ModulSpecSchema } from "./step4-modul-spec";
import { step5SensitivitySchema } from "./step5-sensitivity";
import { step6TermineFieldsSchema } from "./step6-termine";
import { step7BilderSchema } from "./step7-bilder";

// Combine each step's shape into one object so we don't lose any of
// the per-field i18n keys. Step 6 carries a cross-field `.refine`
// ("Termine müssen sich unterscheiden") which would be stripped by a
// plain `.merge`, so we pull the underlying shape from
// `step6TermineFieldsSchema` (the raw `z.object(...)` exported by
// step6) and re-apply the refine on the composed object below.
export const studyFullSchema = z
  .object({
    ...step1KundeSchema.shape,
    ...step2ObjektSchema.shape,
    ...step3PvInputsSchema.shape,
    ...step4ModulSpecSchema.shape,
    ...step5SensitivitySchema.shape,
    ...step6TermineFieldsSchema.shape,
    ...step7BilderSchema.shape,
  })
  .refine((data) => data.terminVorschlag1.getTime() !== data.terminVorschlag2.getTime(), {
    message: "studies.error.termine-must-differ",
    path: ["terminVorschlag2"],
  });

export type StudyFullInput = z.infer<typeof studyFullSchema>;
