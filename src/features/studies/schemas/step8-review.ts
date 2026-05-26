/**
 * T-025 wizard Step 8 — Review & Speichern.
 *
 * Read-only summary of all prior steps. The actual validation surface
 * is `studyFullSchema` (composed from steps 1..7) — Step 8 itself
 * adds no fields, just the user's confirmation that the study should
 * flip to `READY` status.
 *
 * Exported here so the wizard shell can `safeParse` the assembled
 * RHF values against the full schema before posting the
 * status-transition Server Action.
 *
 * @see DECISIONS.md → Wizard-Step layout (decision #5)
 */

export { studyFullSchema, type StudyFullInput } from "./study-full-schema";
