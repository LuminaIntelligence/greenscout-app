/**
 * T-019 change-password form input schema.
 *
 * Client-side validation surface only. The detailed rule set
 * (≥ 8 chars, upper/lower/digit/special) is enforced server-side via
 * `validatePassword` from `@/features/auth/password-policy` — duplicating
 * that here would split the source of truth.
 *
 * The schema therefore only enforces:
 *   - all three fields present (`min(1)`),
 *   - `newPassword === confirmNewPassword` via `.refine()`.
 *
 * Both check messages are i18n keys; `src/i18n/de.ts` resolves them.
 *
 * @see DECISIONS.md → "T-019 Forced password change design (user-confirmed, binding)"
 *      decision-point ③ — confirmNewPassword via zod `.refine()`.
 */

import { z } from "zod";

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "auth.error.wrong-current-password"),
    newPassword: z.string().min(1, "auth.error.rules-not-satisfied"),
    confirmNewPassword: z.string().min(1, "auth.error.passwords-mismatch"),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "auth.error.passwords-mismatch",
    path: ["confirmNewPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
