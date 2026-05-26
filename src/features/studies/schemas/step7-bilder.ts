/**
 * Wizard Step 7 — Bilder (BEFORE / AFTER).
 *
 * Slice 4 (T-029a/b) wires the real upload pipeline. The schema now
 * requires both images for a `DRAFT → READY` transition: the
 * `transition-status` Server Action reads the persisted `StudyImage`
 * rows and passes the resolved IDs through `studyFullSchema`, which
 * fails with `incomplete` if either slot is missing.
 *
 * Per-step validation (the wizard's `updateStudyAction` flow) does
 * NOT use this schema — Step 7 has no autosave call, the user uploads
 * directly via the `/api/uploads` route. The schema's required-ness
 * only fires at the READY transition gate.
 *
 * @see DECISIONS.md → "Slice 4 — Image Upload"
 */

import { z } from "zod";

export const step7BilderSchema = z.object({
  bildBeforeId: z
    .string({ error: "studies.error.bild-before-required" })
    .min(1, "studies.error.bild-before-required"),
  bildAfterId: z
    .string({ error: "studies.error.bild-after-required" })
    .min(1, "studies.error.bild-after-required"),
});

export type Step7BilderInput = z.infer<typeof step7BilderSchema>;
