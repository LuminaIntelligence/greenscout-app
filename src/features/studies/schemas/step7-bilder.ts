/**
 * T-025 wizard Step 7 — Bilder (BEFORE / AFTER).
 *
 * Placeholder schema. The actual image-upload widget arrives in
 * Slice 4 (T-029a/b). For Slice 1 we only define a slot for the two
 * `StudyImage.id` references so the composed `studyFullSchema` is
 * shape-complete; the values are always optional at this point and
 * are filled by the upload route handler that lands in T-029a.
 *
 * @see DECISIONS.md → Wizard-Step layout (decision #5)
 * @todo(T-029a) Replace the optional cuid placeholders with the
 *   actual `StudyImage` association once the upload pipeline lands.
 */

import { z } from "zod";

export const step7BilderSchema = z.object({
  bildBeforeId: z.string().optional(),
  bildAfterId: z.string().optional(),
});

export type Step7BilderInput = z.infer<typeof step7BilderSchema>;
