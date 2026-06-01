/**
 * §7.10-Pivot PR 2 — Shared German formatting helpers for slide
 * components.
 *
 * Mirrors the existing Python `formatters.py` (Defekt E1, 2026-05-30)
 * and the TS `generate-document-phrases.ts` (Defekte D1+D2+D3,
 * 2026-05-29) but lives separately because the slide renderer renders
 * JSX, not strings. NBSP between value and unit so the value never
 * wraps off from its unit.
 *
 * SPEC §8.3:
 *   - thousand separator `.`
 *   - decimal `,`
 *   - currency `27.500 €` with NBSP between value and `€`
 *   - money: always two decimals (Defekt E1)
 *   - ct/kWh: always two decimals (Defekt E1)
 *   - dates: `DD.MM.YYYY`
 *   - datetimes for Slide 19: `DD.MM.YYYY um HH:mm Uhr`
 */

const NBSP = " ";

/**
 * Format a money value in EUR with German locale, always two decimals,
 * and NBSP between number and `€`. Example: `27500` → `27.500,00 €`.
 */
export function formatEur(value: number): string {
  const formatted = new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${formatted}${NBSP}€`;
}

/** Same as `formatEur` but without the `€` glyph (caller appends it). */
export function formatEurNumber(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format a ct/kWh value with German locale, always two decimals,
 * trailing ` ct/kWh`. Example: `0.22` (€/kWh) → `22,00 ct/kWh`.
 * Accepts the value already in cents (e.g. `22`) — the caller multiplies
 * `pv_verkauf_eur_kwh × 100` before passing in.
 */
export function formatCentPerKwh(valueInCents: number): string {
  const formatted = new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valueInCents);
  return `${formatted}${NBSP}ct/kWh`;
}

/**
 * Integer German thousands-separated. Example: `12345` → `12.345`.
 */
export function formatIntegerDe(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

/**
 * Format kWp value. Show two decimals if non-integer, otherwise whole.
 * Example: `500` → `500 kWp`; `257.12` → `257,12 kWp`.
 */
export function formatKwp(value: number): string {
  const isWhole = Number.isInteger(value);
  const formatted = new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: isWhole ? 0 : 2,
  }).format(value);
  return `${formatted}${NBSP}kWp`;
}

/**
 * Format an integer kWh value with the `kWh` suffix. Example:
 * `236000` → `236.000 kWh`.
 */
export function formatKwh(value: number): string {
  return `${formatIntegerDe(value)}${NBSP}kWh`;
}

/** Format a percent value as an integer. Example: `41` → `41 %`. */
export function formatPercent(value: number): string {
  return `${formatIntegerDe(value)}${NBSP}%`;
}

/** Format a tonnage value. Example: `110.2` → `110 t`. */
export function formatTonnes(value: number): string {
  return `${formatIntegerDe(value)}${NBSP}t`;
}

/** Format a hectare value as integer. Example: `39.4` → `39 ha`. */
export function formatHectares(value: number): string {
  return `${formatIntegerDe(value)}${NBSP}ha`;
}

/** Format football-fields as integer (no unit appended). */
export function formatFootballFields(value: number): string {
  return formatIntegerDe(value);
}

/**
 * Format a date as `DD.MM.YYYY`. Returns empty string for null /
 * undefined so callers can defensively render nothing.
 */
export function formatDateDe(date: Date | null | undefined): string {
  if (!date) return "";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = String(date.getFullYear());
  return `${dd}.${mm}.${yyyy}`;
}

/**
 * Format a Termin slot as the SPEC §4.5 datetime phrase
 * `am DD.MM.YYYY um HH:mm Uhr`. Returns empty string for null.
 */
export function formatTerminDe(date: Date | null | undefined): string {
  if (!date) return "";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = String(date.getFullYear());
  const HH = String(date.getHours()).padStart(2, "0");
  const MM = String(date.getMinutes()).padStart(2, "0");
  return `am ${dd}.${mm}.${yyyy} um ${HH}:${MM} Uhr`;
}

/**
 * Build the customer-object-address phrase used in Slide 2 (long form)
 * and Slide 3 (with Flurstück appended).
 */
export function buildObjectAddress(
  objectName: string,
  street: string,
  zip: string,
  city: string,
): string {
  return `${objectName}, ${street}, ${zip} ${city}`;
}

/**
 * Customer-facing display name: prefer `companyName`, fall back to
 * `firstName lastName`. SPEC §4.4: contact name is always required, so
 * the fallback is guaranteed to exist.
 */
export function customerDisplayName(customer: {
  companyName: string | null;
  contactFirstName: string;
  contactLastName: string;
}): string {
  if (customer.companyName && customer.companyName.trim().length > 0) {
    return customer.companyName;
  }
  return `${customer.contactFirstName} ${customer.contactLastName}`.trim();
}

/**
 * Consultant full name. Falls back to email when both names are empty
 * (defensive — Prisma fields are required, so this should never fire).
 */
export function consultantFullName(user: {
  firstName: string;
  lastName: string;
  email: string;
}): string {
  const joined = `${user.firstName} ${user.lastName}`.trim();
  return joined.length > 0 ? joined : user.email;
}
