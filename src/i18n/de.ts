/**
 * German translation dictionary.
 *
 * Currently seeded with the 5 password-rule labels needed by T-016 +
 * T-018. T-049 will expand this into the full app dictionary covering
 * all UI strings (forms, dashboard, error messages, etc.).
 *
 * Convention: flat keys with dotted namespaces (e.g.
 * `auth.password.rule.min-length`). When T-049 migrates to a real i18n
 * library (next-intl or similar), the flat-key structure maps 1:1.
 */

export const de = {
  // Password-rule labels (T-016)
  "auth.password.rule.min-length": "Mindestens 8 Zeichen",
  "auth.password.rule.upper": "Mindestens ein Großbuchstabe",
  "auth.password.rule.lower": "Mindestens ein Kleinbuchstabe",
  "auth.password.rule.digit": "Mindestens eine Ziffer",
  "auth.password.rule.special": "Mindestens ein Sonderzeichen",
  // Auth error messages (T-017)
  "auth.error.invalid-credentials": "Email oder Passwort falsch.",
  "auth.error.locked-out": "Konto temporär gesperrt. Versuche es in {minutes} Minuten erneut.",
  "auth.error.inactive": "Konto deaktiviert. Bitte wende dich an den Administrator.",
  "auth.error.must-change-password": "Bitte ändere zunächst dein Passwort.",
  "auth.error.server": "Anmeldung fehlgeschlagen. Bitte versuche es später erneut.",
  // ─── T-018 Login UI keys ───────────────────────────────────────────
  "auth.page.login.title": "Melde dich an",
  "auth.page.login.subtitle": "Willkommen zurück bei GreenScout",
  "auth.page.login.forgot-password-hint":
    "Passwort vergessen? Bitte wende dich an den Administrator.",
  "auth.field.email": "E-Mail-Adresse",
  "auth.field.password": "Passwort",
  "auth.action.sign-in": "Anmelden",
  "auth.action.signing-in": "Wird angemeldet…",
  "auth.error.lockout-banner-title": "Konto gesperrt",
  // ─── T-019 PasswordRuleChecklist a11y keys ─────────────────────────
  "auth.checklist.aria-label": "Passwort-Anforderungen",
  "auth.checklist.fulfilled": "erfüllt",
  "auth.checklist.unfulfilled": "nicht erfüllt",
  "auth.checklist.neutral": "noch nicht geprüft",
  // ─── T-019 Forced password change UI keys ──────────────────────────
  "auth.page.password-change.title": "Passwort ändern",
  "auth.page.password-change.subtitle":
    "Aus Sicherheitsgründen muss dein Passwort jetzt geändert werden.",
  "auth.field.current-password": "Aktuelles Passwort",
  "auth.field.new-password": "Neues Passwort",
  "auth.field.confirm-new-password": "Neues Passwort bestätigen",
  "auth.action.change-password": "Passwort ändern",
  "auth.action.changing-password": "Wird geändert…",
  "auth.error.wrong-current-password": "Aktuelles Passwort falsch.",
  "auth.error.same-as-current": "Neues Passwort darf nicht dem aktuellen entsprechen.",
  "auth.error.rules-not-satisfied": "Neues Passwort erfüllt nicht alle Anforderungen.",
  "auth.error.passwords-mismatch": "Passwörter stimmen nicht überein.",
  // ─── T-022 App shell ───────────────────────────────────────────────
  "app.nav.customers": "Kunden",
  "app.action.sign-out": "Abmelden",
  // ─── T-022 Customers list ──────────────────────────────────────────
  "customers.page.title": "Kunden",
  "customers.page.subtitle": "Verwalte deine Kundinnen und Kunden und ihre Machbarkeitsstudien.",
  "customers.action.new": "Neuer Kunde",
  "customers.action.view": "Anzeigen",
  "customers.action.edit": "Bearbeiten",
  "customers.action.pending-t023": "verfügbar in T-023",
  "customers.action.pending-t024": "verfügbar in T-024",
  "customers.column.company": "Firma",
  "customers.column.contact": "Ansprechpartner",
  "customers.column.city": "Stadt",
  "customers.column.studies": "Studien",
  "customers.search.placeholder": "Nach Name oder Firma suchen…",
  "customers.empty.no-customers":
    "Noch keine Kunden angelegt. Lege deine erste Kundin oder deinen ersten Kunden an, um zu starten.",
  "customers.empty.no-results": "Keine Kunden gefunden, die deiner Suche entsprechen.",
  "customers.pagination.summary": "{from}–{to} von {total}",
  "customers.pagination.previous": "Zurück",
  "customers.pagination.next": "Weiter",
} as const;

export type TranslationKey = keyof typeof de;

/**
 * Lookup the German translation for a key.
 * TypeScript rejects keys not present in `de` at compile time.
 */
export function t(key: TranslationKey): string {
  return de[key];
}
