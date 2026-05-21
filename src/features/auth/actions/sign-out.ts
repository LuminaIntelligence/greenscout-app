"use server";

/**
 * T-022 sign-out Server Action.
 *
 * Wraps Auth.js v5's `signOut` so the app-shell topbar's user menu can
 * fire it via `<form action={signOutAction}>`. Server-Actions-only is
 * the pattern established in DECISIONS T-017 ⑥: no `/api/sign-out`
 * route, no client `fetch`, no CSRF token plumbing — Server Actions
 * carry their own per-request CSRF guarantee.
 *
 * `redirectTo: "/login"` lets Auth.js perform the post-sign-out
 * redirect server-side. The middleware's CSP/security-header chain
 * applies to the 302 response as usual.
 *
 * @see DECISIONS.md → "T-022 silent decisions per §14 (consolidated)"
 */

import { signOut } from "@/lib/auth";

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
