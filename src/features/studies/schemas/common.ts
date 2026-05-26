/**
 * T-025 shared zod primitives for the eight study-wizard step schemas.
 *
 * Convention:
 *   - All numeric fields are validated as `number` at the schema level.
 *     Form components are responsible for normalising user input
 *     (`<Input type="number">` or a German-locale parser) into JS
 *     numbers BEFORE handing values to RHF — the schema does not
 *     reach across the client/server boundary.
 *   - Validation messages are i18n keys (resolved by `t()` in the
 *     consuming form). Mirrors `customers/schemas/customer-schema.ts`.
 *   - String fields are trimmed; empty string → undefined for
 *     optional fields.
 *
 * @see DECISIONS.md → Wizard-Step layout (decision #5)
 */

import { z } from "zod";

/**
 * Empty-string → undefined for optional fields. RHF emits "" for an
 * unfilled `<Input>`; without this transform the empty string would
 * either trip a "must not be empty" check or flow into the database
 * as a literal "".
 */
export const optionalString = z
  .string()
  .trim()
  .transform((value) => (value === "" ? undefined : value))
  .optional();

/**
 * Trimmed required string with an i18n error key.
 */
export function requiredString(requiredKey: string) {
  return z.string().trim().min(1, requiredKey);
}

/**
 * Coerce + validate a positive decimal (`> 0`). Accepts a JS number,
 * a numeric string, or `null`/`undefined`/empty-string (which fail the
 * required check). The output type is always `number`.
 */
export function positiveDecimal(opts: {
  requiredKey: string;
  invalidKey: string;
  max?: number;
  maxKey?: string;
}) {
  return z.union([z.number(), z.string()]).transform((value, ctx) => {
    const asString = String(value).trim();
    if (asString === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: opts.requiredKey });
      return z.NEVER;
    }
    const num = typeof value === "number" ? value : Number(asString);
    if (!Number.isFinite(num)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: opts.invalidKey });
      return z.NEVER;
    }
    if (num <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: opts.invalidKey });
      return z.NEVER;
    }
    if (opts.max !== undefined && num > opts.max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: opts.maxKey ?? opts.invalidKey,
      });
      return z.NEVER;
    }
    return num;
  });
}

/**
 * Coerce + validate a non-negative decimal (`>= 0`). Same machinery as
 * `positiveDecimal`, lower bound relaxed.
 */
export function nonNegativeDecimal(opts: {
  requiredKey: string;
  invalidKey: string;
  max?: number;
  maxKey?: string;
}) {
  return z.union([z.number(), z.string()]).transform((value, ctx) => {
    const asString = String(value).trim();
    if (asString === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: opts.requiredKey });
      return z.NEVER;
    }
    const num = typeof value === "number" ? value : Number(asString);
    if (!Number.isFinite(num)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: opts.invalidKey });
      return z.NEVER;
    }
    if (num < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: opts.invalidKey });
      return z.NEVER;
    }
    if (opts.max !== undefined && num > opts.max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: opts.maxKey ?? opts.invalidKey,
      });
      return z.NEVER;
    }
    return num;
  });
}

/**
 * Coerce + validate a positive integer (`>= 1`).
 */
export function positiveInt(opts: { requiredKey: string; invalidKey: string }) {
  return z.union([z.number(), z.string()]).transform((value, ctx) => {
    const asString = String(value).trim();
    if (asString === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: opts.requiredKey });
      return z.NEVER;
    }
    const num = typeof value === "number" ? value : Number(asString);
    if (!Number.isInteger(num) || num <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: opts.invalidKey });
      return z.NEVER;
    }
    return num;
  });
}
