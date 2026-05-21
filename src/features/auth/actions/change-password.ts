"use server";

/**
 * T-019 change-password Server Action.
 *
 * Boundary between the React form (`change-password-form.tsx`) and the
 * pure-function service (`change-password.ts`). Responsibilities:
 *
 *   - parse the FormData via `changePasswordSchema` (the only place
 *     this happens — the service trusts its caller),
 *   - re-fetch the active session to obtain `userId` + `organizationId`
 *     from the JWT (the client never sends them),
 *   - extract `x-forwarded-for` and `user-agent` for audit context,
 *   - call `changePassword`,
 *   - on success, trigger `unstable_update({})` so the jwt callback
 *     re-fetches `mustChangePassword=false` from DB BEFORE the form
 *     navigates to `/`. Without this step, the middleware would read
 *     the stale token and bounce the user straight back to
 *     `/password-change` (infinite redirect loop).
 *
 * Return type is the same discriminated `ChangePasswordResult` produced
 * by the service. Client maps `errorCode` to copy via `src/i18n/de.ts`.
 *
 * @see DECISIONS.md → "T-019 Forced password change design" → KRITISCH JWT
 */

import { headers } from "next/headers";

import { changePasswordSchema } from "@/features/auth/schemas/change-password-schema";
import {
  changePassword,
  type ChangePasswordResult,
} from "@/features/auth/services/change-password";
import { auth, unstable_update } from "@/lib/auth";

export async function changePasswordAction(formData: FormData): Promise<ChangePasswordResult> {
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmNewPassword: formData.get("confirmNewPassword"),
  });
  if (!parsed.success) {
    // The form's RHF resolver already surfaces field-level messages —
    // this branch only triggers if the client bypasses the form
    // (direct curl, manual fetch). Return generic server error to
    // avoid leaking field-level mismatch details to programmatic
    // callers.
    return { ok: false, errorCode: "server" };
  }

  const session = await auth();
  if (session?.user === undefined) {
    // Middleware should have redirected; treat as server error.
    return { ok: false, errorCode: "server" };
  }

  const headerList = await headers();
  const ipAddress = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = headerList.get("user-agent") ?? null;

  const result = await changePassword({
    userId: session.user.id,
    organizationId: session.user.organizationId,
    currentPassword: parsed.data.currentPassword,
    newPassword: parsed.data.newPassword,
    ipAddress,
    userAgent,
  });

  if (result.ok) {
    // KRITISCH (DECISIONS T-019) — refresh the JWT BEFORE the client
    // redirects. `unstable_update({})` triggers the jwt callback with
    // `trigger === "update"`, which re-reads the user row and pushes
    // the now-false `mustChangePassword` into the token. The next
    // middleware run reads the fresh token and routes to "/" instead
    // of bouncing back to "/password-change".
    await unstable_update({});
  }

  return result;
}
