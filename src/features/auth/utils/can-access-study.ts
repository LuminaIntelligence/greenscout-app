/**
 * T-030 ownership-vs-admin check.
 *
 * Single source of truth for "may the current session user read/write
 * this study?". Implements SPEC §4.3 F7 (admin god-mode) on top of the
 * default "BERATER owns their own studies" rule.
 *
 * Callers pass:
 *   - `session` — the result of `await auth()` (may be `null` for
 *     unauthenticated requests),
 *   - `study` — a minimal projection containing `consultantId` (any
 *     row shape the repository emits is compatible).
 *
 * Returns `true` when:
 *   - the user is authenticated AND has `role === "ADMIN"`, OR
 *   - the user is authenticated AND owns the study
 *     (`study.consultantId === session.user.id`).
 *
 * Returns `false` for unauthenticated callers, deactivated accounts
 * (the session is dropped at sign-out time — `null` here), and
 * non-admin BERATER on someone else's study.
 *
 * The helper is intentionally tiny + pure so it lives outside the
 * repository layer (which is `organizationId`-aware) and outside the
 * Server Action layer (which already has its own discriminated
 * `errorCode` returns). Use it inside Server Actions to consolidate
 * the 7 inline copies of this rule that existed before T-030.
 *
 * @see SPEC.md §4.3 — F6 hand-over + F7 admin god-mode
 * @see DECISIONS.md → "Slice 5a (T-030 / T-041a) silent decisions per §14"
 */

import type { Session } from "next-auth";

/**
 * The minimal study projection this helper inspects. Any row returned
 * by `findStudyById` (or any other Study repository function) is
 * structurally compatible; we only need `consultantId`.
 */
export interface StudyOwnershipProjection {
  consultantId: string;
}

export function canAccessStudy(session: Session | null, study: StudyOwnershipProjection): boolean {
  if (!session?.user) return false;
  if (session.user.role === "ADMIN") return true;
  return study.consultantId === session.user.id;
}
