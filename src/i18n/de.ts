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
  // ─── T-023 Customer form: pages ────────────────────────────────────
  "customers.page.new.title": "Neuer Kunde",
  "customers.page.new.subtitle": "Lege eine neue Kundin oder einen neuen Kunden an.",
  "customers.page.edit.title": "Kunde bearbeiten",
  // ─── T-023 Customer form: sections ─────────────────────────────────
  "customers.section.company": "Firma",
  "customers.section.contact": "Kontakt",
  "customers.section.billing": "Rechnungsadresse",
  // ─── T-023 Customer form: fields ───────────────────────────────────
  "customers.field.company-name": "Firmenname",
  "customers.field.first-name": "Vorname",
  "customers.field.last-name": "Nachname",
  "customers.field.email": "E-Mail-Adresse",
  "customers.field.phone": "Telefon",
  "customers.field.billing-address": "Straße + Hausnummer",
  "customers.field.billing-zip": "Postleitzahl",
  "customers.field.billing-city": "Stadt",
  "customers.field.notes": "Notizen",
  // ─── T-023 Customer form: actions ──────────────────────────────────
  "customers.action.cancel": "Abbrechen",
  "customers.action.create": "Anlegen",
  "customers.action.save": "Änderungen speichern",
  "customers.action.saving": "Wird gespeichert…",
  // ─── T-023 Customer form: validation messages ──────────────────────
  "customers.error.first-name-required": "Vorname ist erforderlich.",
  "customers.error.last-name-required": "Nachname ist erforderlich.",
  "customers.error.invalid-email": "Bitte gib eine gültige E-Mail-Adresse ein.",
  "customers.error.not-found": "Kunde nicht gefunden.",
  "customers.error.forbidden": "Du bist nicht berechtigt, diesen Kunden zu bearbeiten.",
  "customers.error.server": "Speichern fehlgeschlagen. Bitte versuche es später erneut.",
  // ─── T-023 Customer form: toast messages ───────────────────────────
  "customers.toast.created": "Kunde angelegt",
  "customers.toast.updated": "Änderungen gespeichert",
  // ─── T-024 Customer detail page ────────────────────────────────────
  "customers.detail.title": "Kundendetails",
  "customers.detail.section.company": "Firma",
  "customers.detail.section.contact": "Kontakt",
  "customers.detail.section.billing": "Rechnungsadresse",
  "customers.detail.section.studies": "Verknüpfte Studien",
  "customers.detail.studies.empty": "Noch keine Studien für diesen Kunden.",
  "customers.detail.action.edit": "Bearbeiten",
  "customers.detail.action.delete": "Löschen",
  "customers.detail.field.empty": "—",
  // ─── T-024 Customer soft-delete dialog ─────────────────────────────
  "customers.delete.dialog.title": "Kunde löschen?",
  // `{company}` is replaced by the caller (`<CustomerDeleteDialog>`)
  // with the live customer label. Keep the marker intact.
  "customers.delete.dialog.description":
    "Soll {company} wirklich gelöscht werden? Der Eintrag verschwindet aus der Liste, die zugehörigen Studien bleiben erhalten.",
  "customers.delete.dialog.confirm": "Endgültig löschen",
  "customers.delete.dialog.cancel": "Abbrechen",
  // ─── T-024 Customer soft-delete toasts ─────────────────────────────
  // `{company}` is replaced by the caller before passing to sonner.
  "customers.delete.toast.success": "{company} wurde gelöscht.",
  "customers.delete.toast.error.not-found": "Kunde nicht gefunden.",
  "customers.delete.toast.error.server":
    "Beim Löschen ist ein Fehler aufgetreten. Bitte erneut versuchen.",
  // ─── T-022 / Slice 5 app shell extension ───────────────────────────
  "app.nav.studies": "Studien",
  // ─── T-028 Studies list / dashboard ────────────────────────────────
  "studies.page.title": "Studien",
  "studies.page.subtitle": "Übersicht aller Machbarkeitsstudien.",
  "studies.action.new": "Neue Studie",
  "studies.action.view": "Anzeigen",
  "studies.action.edit": "Bearbeiten",
  "studies.action.delete": "Löschen",
  "studies.action.save": "Speichern",
  "studies.action.saving": "Wird gespeichert…",
  "studies.action.create": "Studie anlegen",
  "studies.action.cancel": "Abbrechen",
  "studies.action.previous": "Zurück",
  "studies.action.next": "Weiter",
  "studies.action.mark-ready": "Studie als bereit markieren",
  "studies.column.object": "Objekt",
  "studies.column.customer": "Kunde",
  "studies.column.status": "Status",
  "studies.column.consultant": "Berater",
  "studies.column.created": "Angelegt",
  "studies.column.updated": "Aktualisiert",
  "studies.column.actions": "",
  "studies.filter.all-statuses": "Alle Status",
  "studies.filter.all-consultants": "Alle Berater",
  "studies.filter.placeholder.consultant": "Berater filtern",
  "studies.filter.placeholder.status": "Status filtern",
  "studies.empty.no-studies":
    "Noch keine Studien angelegt. Lege deine erste Machbarkeitsstudie an, um zu starten.",
  "studies.empty.no-results": "Keine Studien gefunden, die den Filtern entsprechen.",
  "studies.pagination.summary": "{from}–{to} von {total}",
  "studies.pagination.previous": "Zurück",
  "studies.pagination.next": "Weiter",
  "studies.status.draft": "Entwurf",
  "studies.status.ready": "Bereit",
  "studies.status.generated": "Generiert",
  // ─── T-026 Wizard pages / sections ─────────────────────────────────
  "studies.page.new.title": "Neue Studie",
  "studies.page.new.subtitle": "Erfasse die Daten für eine neue Machbarkeitsstudie.",
  "studies.page.edit.title": "Studie bearbeiten",
  "studies.page.detail.title": "Studiendetails",
  "studies.wizard.step": "Schritt {current} von {total}",
  "studies.wizard.step1.title": "Kunde",
  "studies.wizard.step2.title": "Objekt & Flurstück",
  "studies.wizard.step3.title": "PV-Inputs",
  "studies.wizard.step4.title": "Modul-/Anlagenspezifikation",
  "studies.wizard.step5.title": "Sensitivitätsanalyse",
  "studies.wizard.step6.title": "Termine",
  "studies.wizard.step7.title": "Bilder",
  "studies.wizard.step8.title": "Review & Speichern",
  "studies.single-page.nav-heading": "Abschnitte",
  // ─── T-026 Wizard field labels ─────────────────────────────────────
  "studies.field.customer": "Kunde",
  "studies.field.customer.placeholder": "Kunde auswählen…",
  "studies.field.object-name": "Objektname",
  "studies.field.object-address": "Straße + Hausnummer",
  "studies.field.object-zip": "Postleitzahl",
  "studies.field.object-city": "Stadt",
  "studies.field.flurstueck": "Flurstück",
  "studies.field.anlage-kwp": "Anlagengröße (kWp)",
  "studies.field.pv-erzeugung": "PV-Erzeugung (kWh/Jahr)",
  "studies.field.pv-eigenverbrauch": "PV-Eigenverbrauch (kWh/Jahr)",
  "studies.field.pv-verkauf": "PV-Stromverkauf (€/kWh)",
  "studies.field.verbrauch": "Stromverbrauch gesamt (kWh/Jahr)",
  "studies.field.versorger-preis": "Versorger-Strompreis (€/kWh)",
  "studies.field.pacht": "Pachtzahlung (€/kWp)",
  "studies.field.vertragslaufzeit": "Vertragslaufzeit (Jahre)",
  "studies.field.modul-anzahl": "Modulanzahl",
  "studies.field.modul-flaeche": "Modulfläche (m²)",
  "studies.field.eigenverbrauchsquote": "Eigenverbrauchsquote (%)",
  "studies.field.netzeinspeisung": "Netzeinspeisung (kWh/Jahr)",
  "studies.field.szenario-preis-1": "Szenario 1 (€/kWh)",
  "studies.field.szenario-preis-2": "Szenario 2 (€/kWh)",
  "studies.field.szenario-preis-3": "Szenario 3 (€/kWh)",
  "studies.field.termin-vorschlag-1": "Termin 1",
  "studies.field.termin-vorschlag-2": "Termin 2",
  "studies.field.bild-before": "Bild VORHER",
  "studies.field.bild-after": "Bild NACHHER",
  // ─── T-026 Wizard hints ────────────────────────────────────────────
  "studies.hint.sensitivity":
    "Vorbelegung 35 / 40 / 45 ct/kWh entsprechend der Vorlage. Werte können je Kunde überschrieben werden.",
  "studies.hint.sensitivity-preview":
    "Vorschau Jahresersparnis (echte Berechnung gemäß Calc-Modul):",
  "studies.hint.sensitivity-incomplete":
    "Erst Schritte 3 + 4 ausfüllen (Anlagengröße, PV-Erzeugung, Eigenverbrauch, Verkaufspreis), dann erscheint hier die Live-Vorschau.",
  "studies.hint.sensitivity-price-empty": "kein Preis eingegeben",
  "studies.hint.images-placeholder":
    "Bilder-Upload wird in einem späteren Schritt freigeschaltet (T-029a). Dieser Bereich ist im aktuellen Slice noch ein Platzhalter.",
  "studies.hint.review":
    'Prüfe deine Eingaben. Mit „Studie als bereit markieren" wechselt der Status von Entwurf auf Bereit. Du kannst die Studie danach weiter bearbeiten.',
  "studies.review.summary-empty": "—",
  // ─── T-025 Validation messages ─────────────────────────────────────
  "studies.error.customer-required": "Kunde ist erforderlich.",
  "studies.error.object-name-required": "Objektname ist erforderlich.",
  "studies.error.object-address-required": "Straße + Hausnummer ist erforderlich.",
  "studies.error.object-zip-required": "Postleitzahl ist erforderlich.",
  "studies.error.object-city-required": "Stadt ist erforderlich.",
  "studies.error.flurstueck-required": "Flurstück ist erforderlich.",
  "studies.error.anlage-kwp-required": "Anlagengröße ist erforderlich.",
  "studies.error.anlage-kwp-invalid": "Anlagengröße muss eine positive Zahl sein.",
  "studies.error.anlage-kwp-out-of-range": "Anlagengröße liegt außerhalb des plausiblen Bereichs.",
  "studies.error.pv-erzeugung-required": "PV-Erzeugung ist erforderlich.",
  "studies.error.pv-erzeugung-invalid": "PV-Erzeugung muss eine positive Zahl sein.",
  "studies.error.pv-erzeugung-out-of-range":
    "PV-Erzeugung liegt außerhalb des plausiblen Bereichs.",
  "studies.error.pv-eigenverbrauch-required": "PV-Eigenverbrauch ist erforderlich.",
  "studies.error.pv-eigenverbrauch-invalid": "PV-Eigenverbrauch muss eine positive Zahl sein.",
  "studies.error.pv-eigenverbrauch-out-of-range":
    "PV-Eigenverbrauch liegt außerhalb des plausiblen Bereichs.",
  "studies.error.pv-verkauf-required": "PV-Stromverkauf ist erforderlich.",
  "studies.error.pv-verkauf-invalid": "PV-Stromverkauf muss eine positive Zahl sein.",
  "studies.error.pv-verkauf-out-of-range":
    "PV-Stromverkauf liegt außerhalb des plausiblen Bereichs (max. 1 €/kWh).",
  "studies.error.verbrauch-required": "Stromverbrauch ist erforderlich.",
  "studies.error.verbrauch-invalid": "Stromverbrauch muss eine positive Zahl sein.",
  "studies.error.verbrauch-out-of-range": "Stromverbrauch liegt außerhalb des plausiblen Bereichs.",
  "studies.error.versorger-preis-required": "Versorger-Strompreis ist erforderlich.",
  "studies.error.versorger-preis-invalid": "Versorger-Strompreis muss eine positive Zahl sein.",
  "studies.error.versorger-preis-out-of-range":
    "Versorger-Strompreis liegt außerhalb des plausiblen Bereichs (max. 2 €/kWh).",
  "studies.error.pacht-required": "Pachtzahlung ist erforderlich.",
  "studies.error.pacht-invalid": "Pachtzahlung muss eine positive Zahl sein.",
  "studies.error.pacht-out-of-range": "Pachtzahlung liegt außerhalb des plausiblen Bereichs.",
  "studies.error.vertragslaufzeit-required": "Vertragslaufzeit ist erforderlich.",
  "studies.error.vertragslaufzeit-invalid":
    "Vertragslaufzeit muss eine positive Ganzzahl sein (Jahre).",
  "studies.error.modul-anzahl-required": "Modulanzahl ist erforderlich.",
  "studies.error.modul-anzahl-invalid": "Modulanzahl muss eine positive Ganzzahl sein.",
  "studies.error.modul-flaeche-required": "Modulfläche ist erforderlich.",
  "studies.error.modul-flaeche-invalid": "Modulfläche muss eine positive Zahl sein.",
  "studies.error.modul-flaeche-out-of-range":
    "Modulfläche liegt außerhalb des plausiblen Bereichs.",
  "studies.error.eigenverbrauchsquote-required": "Eigenverbrauchsquote ist erforderlich.",
  "studies.error.eigenverbrauchsquote-invalid": "Eigenverbrauchsquote muss eine Zahl ≥ 0 sein.",
  "studies.error.eigenverbrauchsquote-out-of-range":
    "Eigenverbrauchsquote muss zwischen 0 und 100 liegen.",
  "studies.error.netzeinspeisung-required": "Netzeinspeisung ist erforderlich.",
  "studies.error.netzeinspeisung-invalid": "Netzeinspeisung muss eine Zahl ≥ 0 sein.",
  "studies.error.netzeinspeisung-out-of-range":
    "Netzeinspeisung liegt außerhalb des plausiblen Bereichs.",
  "studies.error.szenario-required": "Szenario-Preis ist erforderlich.",
  "studies.error.szenario-invalid": "Szenario-Preis muss eine positive Zahl sein.",
  "studies.error.szenario-out-of-range":
    "Szenario-Preis liegt außerhalb des plausiblen Bereichs (max. 2 €/kWh).",
  "studies.error.termin-required": "Termin ist erforderlich.",
  "studies.error.termin-invalid": "Bitte ein gültiges Datum eingeben.",
  "studies.error.termine-must-differ": "Termine müssen sich unterscheiden.",
  // ─── T-026 Wizard / action error keys ──────────────────────────────
  "studies.error.not-found": "Studie nicht gefunden.",
  "studies.error.forbidden": "Du bist nicht berechtigt, diese Studie zu bearbeiten.",
  "studies.error.server": "Speichern fehlgeschlagen. Bitte versuche es später erneut.",
  "studies.error.invalid-transition": "Statuswechsel ist nicht erlaubt.",
  "studies.error.incomplete":
    "Es fehlen noch Pflichtangaben in einem der Schritte — bitte vor dem Abschluss vervollständigen.",
  // ─── T-026 Wizard toast messages ───────────────────────────────────
  "studies.toast.created": "Studie angelegt",
  "studies.toast.updated": "Schritt gespeichert",
  "studies.toast.ready": "Studie ist jetzt bereit",
  "studies.toast.deleted": "Studie wurde gelöscht",
  // ─── T-028 Studies delete dialog ───────────────────────────────────
  "studies.delete.dialog.title": "Studie löschen?",
  // `{object}` is replaced by the caller with the live object label.
  "studies.delete.dialog.description":
    'Soll die Studie „{object}" wirklich gelöscht werden? Der Eintrag verschwindet aus der Liste.',
  "studies.delete.dialog.confirm": "Endgültig löschen",
  "studies.delete.dialog.cancel": "Abbrechen",
  "studies.delete.toast.error.not-found": "Studie nicht gefunden.",
  "studies.delete.toast.error.server":
    "Beim Löschen ist ein Fehler aufgetreten. Bitte erneut versuchen.",
  // ─── T-040 Document generation + version list ──────────────────────
  "studies.document.section-title": "Dokumente",
  "studies.document.section-subtitle":
    "Generierte PPTX- und PDF-Versionen dieser Studie. Neue Generierung erzeugt eine neue Version – alte bleiben erhalten.",
  "studies.document.generate-button": "Dokument generieren",
  "studies.document.generating": "Generierung läuft…",
  "studies.document.toast.success": "Dokumente wurden erstellt.",
  "studies.document.toast.error.incomplete":
    'Die Studie ist noch nicht bereit. Markiere sie zuerst als „bereit".',
  "studies.document.toast.error.pyservice":
    "Dokumentenservice nicht erreichbar oder Generierung fehlgeschlagen. Bitte später erneut versuchen.",
  "studies.document.toast.error.forbidden":
    "Du bist nicht berechtigt, ein Dokument für diese Studie zu generieren.",
  "studies.document.toast.error.not-found":
    "Studie, Kunde oder Berater konnten nicht gefunden werden.",
  "studies.document.toast.error.server":
    "Bei der Dokumenterstellung ist ein Fehler aufgetreten. Bitte erneut versuchen.",
  "studies.document.toast.error.validation": "Ungültige Anfrage.",
  "studies.document.list.empty": "Noch keine Dokumente generiert.",
  "studies.document.list.column.version": "Version",
  "studies.document.list.column.format": "Format",
  "studies.document.list.column.created-at": "Erstellt am",
  "studies.document.list.column.generated-by": "Von",
  "studies.document.list.column.actions": "Aktion",
  "studies.document.list.action.download": "Herunterladen",
} as const;

export type TranslationKey = keyof typeof de;

/**
 * Lookup the German translation for a key.
 * TypeScript rejects keys not present in `de` at compile time.
 */
export function t(key: TranslationKey): string {
  return de[key];
}
