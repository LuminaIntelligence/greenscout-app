/**
 * Login form input schema.
 *
 * Used by:
 *  - the T-018 login page (`react-hook-form` + `@hookform/resolvers/zod`)
 *  - the T-017 `sign-in` Server Action
 *  - the Auth.js Credentials provider's `authorize` callback (raw
 *    `credentials` input passes through `safeParse` before reaching
 *    the authorize service).
 *
 * `password.min(1)` is intentional: the full rule set (length, upper,
 * lower, digit, special) is validated by `validatePassword` from
 * `password-policy.ts` on signup / reset flows. Login only needs to
 * confirm both fields are present — anything else leaks rule details
 * to attackers.
 *
 * Error messages are i18n keys, not literal German. `src/i18n/de.ts`
 * resolves the keys to text.
 */

import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("auth.error.invalid-credentials"),
  password: z.string().min(1, "auth.error.invalid-credentials"),
});

export type LoginInput = z.infer<typeof loginSchema>;
