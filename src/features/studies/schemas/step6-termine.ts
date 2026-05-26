/**
 * T-025 wizard Step 6 — Termine (Slide 19).
 *
 * Two preferred meeting dates/times for the customer presentation.
 * Mirrors `Study.terminVorschlag1 / terminVorschlag2` (DateTime?).
 * Both are required at this step (the slide reserves both slots).
 *
 * Accepts a JS `Date` or an ISO-string (the form's `DateTimePicker`
 * emits one or the other depending on its mode); the schema coerces
 * to `Date` and rejects invalid dates.
 *
 * @see DECISIONS.md → Wizard-Step layout (decision #5)
 */

import { z } from "zod";

function dateField(requiredKey: string, invalidKey: string) {
  return z.union([z.date(), z.string(), z.number()]).transform((value, ctx) => {
    if (value === "" || value === null || value === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: requiredKey });
      return z.NEVER;
    }
    const asDate = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(asDate.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: invalidKey });
      return z.NEVER;
    }
    return asDate;
  });
}

/**
 * Raw ZodObject for Step 6 — exposed so the composed
 * `studyFullSchema` can opt into the same `.shape` without losing
 * the per-field rules (a `ZodEffects` from `.refine()` does not
 * expose `.shape`).
 */
export const step6TermineFieldsSchema = z.object({
  terminVorschlag1: dateField("studies.error.termin-required", "studies.error.termin-invalid"),
  terminVorschlag2: dateField("studies.error.termin-required", "studies.error.termin-invalid"),
});

export const step6TermineSchema = step6TermineFieldsSchema.refine(
  (data) => data.terminVorschlag1.getTime() !== data.terminVorschlag2.getTime(),
  { message: "studies.error.termine-must-differ", path: ["terminVorschlag2"] },
);

export type Step6TermineInput = z.infer<typeof step6TermineSchema>;
