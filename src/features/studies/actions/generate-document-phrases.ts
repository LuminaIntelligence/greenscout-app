/**
 * Empty-Value-Phrase Helpers — Defekte D1+D2+D3 (2026-05-29).
 *
 * Pure, synchronous helpers extracted from `generate-document.ts` so the
 * Server Action file (which carries the `"use server"` directive) only
 * exports `async` functions. Next.js 15's `next build` enforces that
 * every export of a `"use server"` module is an async function — sync
 * exports trip the "Server Actions must be async functions" Turbopack
 * error. See DECISIONS.md "Defekte D1+D2+D3 hotfix".
 *
 * Production-Symptome bei leeren Optional-Feldern:
 *   - D1: `flurstueck` leer → Template-Run "in Flurstück {{flurstueck}}"
 *     rendert "in Flurstück " (hängender Präfix).
 *   - D2: `terminVorschlag1/2` leer → Template "1) am {{termin_vorschlag_1}} Uhr"
 *     rendert "1) am  Uhr".
 *   - D3: `modulAnzahl`/`modulFlaeche` leer → Template "{{anlage_kwp}} kWp,
 *     {{modul_anzahl}} Module, {{modul_flaeche_m2}} m²" rendert "500 kWp,
 *      Module,  m²" (Einheiten ohne Werte).
 *
 * Fix-Strategie: Server Action liefert pre-rendered Phrase-Keys statt
 * raw-fields. Bei leeren Werten ist die Phrase ein leerer String, sodass
 * Präfix/Suffix mit verschwinden. Template-Edit (siehe
 * `scripts/normalize-empty-value-phrases.py`) ersetzt die raw-Placeholders.
 *
 * Conditional Rendering bleibt damit voll testbar in TypeScript — keine
 * spezielle Template-Syntax, keine post-render line-removal-Logik im
 * pptx_generator. Trade-off: Template + Server Action müssen synchron
 * bleiben (anti-regression-Tests beidseitig erzwingen das).
 */

function formatGermanDateTime(date: Date | null): string | null {
  if (!date) return null;
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${day}.${month}.${year} um ${hours}:${minutes}`;
}

/** German-locale integer with `.` thousands separator (e.g. ``1.234.567``). */
function formatNumberDe(value: number): string {
  return Math.round(value).toLocaleString("de-DE");
}

/**
 * Phrase including ` in Flurstück <value>` (with leading space).
 * Empty when no flurstueck is set — prevents hanging "in Flurstück " prefix.
 */
export function buildFlurstueckPhrase(flurstueck: string | null | undefined): string {
  if (!flurstueck || flurstueck.trim() === "") return "";
  return ` in Flurstück ${flurstueck.trim()}`;
}

/**
 * Phrase like ``Flurstück: 78.10`` — used on Slide 4 footer block.
 * Empty when no flurstueck is set — prevents hanging "Flurstück: " label.
 */
export function buildFlurstueckLabelPhrase(flurstueck: string | null | undefined): string {
  if (!flurstueck || flurstueck.trim() === "") return "";
  return `Flurstück: ${flurstueck.trim()}`;
}

/**
 * Phrase like ``1) am 15.03.2026 um 14:00 Uhr`` (resp. ``2) am ...``)
 * for Slide 19. Empty when the slot is unset — prevents hanging
 * "1) am  Uhr" template fragments.
 */
export function buildTerminPhrase(index: 1 | 2, termin: Date | null | undefined): string {
  const formatted = formatGermanDateTime(termin ?? null);
  if (formatted === null) return "";
  return `${index}) am ${formatted} Uhr`;
}

/**
 * Conjunction between the two termin slots on Slide 19. Returns ``"oder"``
 * only when both slots are set — otherwise the standalone "oder" would
 * orphan in the output. Returns ``""`` when only one or no slots are
 * set.
 */
export function buildTerminOderPhrase(
  termin1: Date | null | undefined,
  termin2: Date | null | undefined,
): string {
  if (termin1 && termin2) return "oder";
  return "";
}

/**
 * Phrase like ``500 kWp, 1.428 Module, 2.856 m²`` for Slide 10's
 * Gesamtleistung headline. Drops the optional Module / m² segments when
 * those values are unset — prevents trailing ", Module, m²".
 */
export function buildModulInfoPhrase(
  anlageKwp: number,
  modulAnzahl: number | null | undefined,
  modulFlaecheM2: number | null | undefined,
): string {
  const parts: string[] = [`${formatNumberDe(anlageKwp)} kWp`];
  if (modulAnzahl !== null && modulAnzahl !== undefined) {
    parts.push(`${formatNumberDe(modulAnzahl)} Module`);
  }
  if (modulFlaecheM2 !== null && modulFlaecheM2 !== undefined) {
    parts.push(`${formatNumberDe(modulFlaecheM2)} m²`);
  }
  return parts.join(", ");
}
