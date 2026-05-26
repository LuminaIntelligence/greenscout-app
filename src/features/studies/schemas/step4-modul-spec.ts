/**
 * T-025 wizard Step 4 — Modul-/Anlagenspezifikation.
 *
 * Mirrors the optional Module-related Decimal columns on `Study`:
 *
 *   modulAnzahl, modulFlaecheM2, eigenverbrauchsquoteProzent,
 *   netzeinspeisungKwhJahr.
 *
 * Per SPEC §4.5 these come from PV-Sol; in MVP they are manually
 * entered numeric fields (PV-Sol-upload is parked in Phase 3 per
 * `TASKS.md` Future + DECISIONS #7). All four are optional at the
 * data-model level but the wizard treats them as required to advance
 * to step 5 — if a consultant doesn't have a PV-Sol number yet, they
 * save the draft and come back later.
 *
 * `eigenverbrauchsquoteProzent` accepts 0..100 (inclusive of 0 because
 * a 0 % own-consumption scenario, while atypical, is mathematically
 * valid for a full-feed-in installation).
 *
 * @see DECISIONS.md → Wizard-Step layout (decision #5)
 */

import { z } from "zod";

import { nonNegativeDecimal, positiveDecimal, positiveInt } from "./common";

export const step4ModulSpecSchema = z.object({
  modulAnzahl: positiveInt({
    requiredKey: "studies.error.modul-anzahl-required",
    invalidKey: "studies.error.modul-anzahl-invalid",
  }),
  modulFlaecheM2: positiveDecimal({
    requiredKey: "studies.error.modul-flaeche-required",
    invalidKey: "studies.error.modul-flaeche-invalid",
    max: 1_000_000,
    maxKey: "studies.error.modul-flaeche-out-of-range",
  }),
  eigenverbrauchsquoteProzent: nonNegativeDecimal({
    requiredKey: "studies.error.eigenverbrauchsquote-required",
    invalidKey: "studies.error.eigenverbrauchsquote-invalid",
    max: 100,
    maxKey: "studies.error.eigenverbrauchsquote-out-of-range",
  }),
  netzeinspeisungKwhJahr: nonNegativeDecimal({
    requiredKey: "studies.error.netzeinspeisung-required",
    invalidKey: "studies.error.netzeinspeisung-invalid",
    max: 200_000_000,
    maxKey: "studies.error.netzeinspeisung-out-of-range",
  }),
});

export type Step4ModulSpecInput = z.infer<typeof step4ModulSpecSchema>;
