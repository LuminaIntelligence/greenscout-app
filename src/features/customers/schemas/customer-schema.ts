/**
 * T-023 Customer create/edit form schema.
 *
 * Field contract per SPEC §4.4 / §5.1 → only `contactFirstName` and
 * `contactLastName` are required. Every other field is optional;
 * empty-string input from RHF (the default for an unfilled `<Input>`)
 * is normalised to `undefined` so optional fields don't trip a
 * "must be a string" check on the server.
 *
 * `email` gets light RFC-ish validation via `z.string().email()` when
 * present. SPEC explicitly does NOT require a phone-number format
 * (international variation is too wide) — `phone` is a free string.
 * `billingZipCode` is also a free string in MVP (a strict 5-digit
 * German-PLZ regex would over-fit; multi-tenant Phase-3 will see
 * non-DE addresses).
 *
 * Error messages are i18n keys, resolved by `t()` in the consuming
 * form. The pattern mirrors `login-schema.ts` / `change-password-schema.ts`.
 *
 * @see DECISIONS.md → "T-023 silent decisions per §14 (consolidated)"
 */

import { z } from "zod";

// Empty-string → undefined for optional fields. RHF emits "" for an
// unfilled `<Input>`; without this transform the empty string would
// flow into the DB and through `Object.entries()` audit-diff loops.
const optionalString = z
  .string()
  .trim()
  .transform((value) => (value === "" ? undefined : value))
  .optional();

// Optional email. `superRefine` validates the RFC-ish shape only when
// the field is present (transform returned a string). Empty input
// reaches `data === undefined` and skips the email check.
const optionalEmail = z
  .string()
  .trim()
  .transform((value) => (value === "" ? undefined : value))
  .optional()
  .superRefine((value, ctx) => {
    if (value === undefined) return;
    const parsed = z.string().email().safeParse(value);
    if (!parsed.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "customers.error.invalid-email",
      });
    }
  });

export const customerSchema = z.object({
  companyName: optionalString,
  contactFirstName: z.string().trim().min(1, "customers.error.first-name-required"),
  contactLastName: z.string().trim().min(1, "customers.error.last-name-required"),
  email: optionalEmail,
  phone: optionalString,
  billingAddress: optionalString,
  billingZipCode: optionalString,
  billingCity: optionalString,
  notes: optionalString,
});

export type CustomerInput = z.infer<typeof customerSchema>;
