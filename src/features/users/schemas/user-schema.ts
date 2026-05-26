/**
 * T-041a Admin user-management form schemas.
 *
 * Two parallel schemas because the create vs edit form have a
 * different contract:
 *
 *   - `createUserSchema` requires `email`, `firstName`, `lastName`,
 *     `role`. The temp-password is generated server-side via
 *     `crypto.randomUUID().slice(0, 12)` — never accepted from the
 *     client (see `create-user.ts`).
 *
 *   - `updateUserSchema` accepts an arbitrary subset of
 *     `{ firstName, lastName, role, active }`. **`email` is
 *     intentionally NOT included** — changing a user's login email
 *     is auth-adjacent (§7.3) and out of scope for this slice.
 *
 * The role enum matches the Prisma `Role` enum literally. Error
 * messages are i18n keys, resolved by `t()` in the consuming form.
 *
 * @see DECISIONS.md → "Slice 5a (T-030 / T-041a) silent decisions per §14"
 */

import { z } from "zod";

export const userRoleSchema = z.enum(["ADMIN", "BERATER"]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const createUserSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: "users.error.email-required" })
    .email({ message: "users.error.email-invalid" }),
  firstName: z.string().trim().min(1, { message: "users.error.first-name-required" }),
  lastName: z.string().trim().min(1, { message: "users.error.last-name-required" }),
  role: userRoleSchema,
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z
  .object({
    firstName: z.string().trim().min(1, { message: "users.error.first-name-required" }).optional(),
    lastName: z.string().trim().min(1, { message: "users.error.last-name-required" }).optional(),
    role: userRoleSchema.optional(),
    active: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "users.error.update-empty",
  });

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
