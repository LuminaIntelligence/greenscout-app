import { describe, expect, it } from "vitest";

import { de, t } from "./de";

describe("de translation dictionary", () => {
  it("contains all expected keys: 5 password-rule + 5 auth-error + 8 T-018 login UI + 4 T-019 checklist a11y + 11 T-019 change-password UI + 2 T-022 app-shell + 14 T-022 customers (T-024 retired pending-t024) + 25 T-023 customer form + 16 T-024 detail-page + delete-dialog", () => {
    expect(Object.keys(de).sort()).toEqual([
      "app.action.sign-out",
      "app.nav.customers",
      "auth.action.change-password",
      "auth.action.changing-password",
      "auth.action.sign-in",
      "auth.action.signing-in",
      "auth.checklist.aria-label",
      "auth.checklist.fulfilled",
      "auth.checklist.neutral",
      "auth.checklist.unfulfilled",
      "auth.error.inactive",
      "auth.error.invalid-credentials",
      "auth.error.locked-out",
      "auth.error.lockout-banner-title",
      "auth.error.must-change-password",
      "auth.error.passwords-mismatch",
      "auth.error.rules-not-satisfied",
      "auth.error.same-as-current",
      "auth.error.server",
      "auth.error.wrong-current-password",
      "auth.field.confirm-new-password",
      "auth.field.current-password",
      "auth.field.email",
      "auth.field.new-password",
      "auth.field.password",
      "auth.page.login.forgot-password-hint",
      "auth.page.login.subtitle",
      "auth.page.login.title",
      "auth.page.password-change.subtitle",
      "auth.page.password-change.title",
      "auth.password.rule.digit",
      "auth.password.rule.lower",
      "auth.password.rule.min-length",
      "auth.password.rule.special",
      "auth.password.rule.upper",
      "customers.action.cancel",
      "customers.action.create",
      "customers.action.edit",
      "customers.action.new",
      "customers.action.save",
      "customers.action.saving",
      "customers.action.view",
      "customers.column.city",
      "customers.column.company",
      "customers.column.contact",
      "customers.column.studies",
      "customers.delete.dialog.cancel",
      "customers.delete.dialog.confirm",
      "customers.delete.dialog.description",
      "customers.delete.dialog.title",
      "customers.delete.toast.error.not-found",
      "customers.delete.toast.error.server",
      "customers.delete.toast.success",
      "customers.detail.action.delete",
      "customers.detail.action.edit",
      "customers.detail.field.empty",
      "customers.detail.section.billing",
      "customers.detail.section.company",
      "customers.detail.section.contact",
      "customers.detail.section.studies",
      "customers.detail.studies.empty",
      "customers.detail.title",
      "customers.empty.no-customers",
      "customers.empty.no-results",
      "customers.error.first-name-required",
      "customers.error.forbidden",
      "customers.error.invalid-email",
      "customers.error.last-name-required",
      "customers.error.not-found",
      "customers.error.server",
      "customers.field.billing-address",
      "customers.field.billing-city",
      "customers.field.billing-zip",
      "customers.field.company-name",
      "customers.field.email",
      "customers.field.first-name",
      "customers.field.last-name",
      "customers.field.notes",
      "customers.field.phone",
      "customers.page.edit.title",
      "customers.page.new.subtitle",
      "customers.page.new.title",
      "customers.page.subtitle",
      "customers.page.title",
      "customers.pagination.next",
      "customers.pagination.previous",
      "customers.pagination.summary",
      "customers.search.placeholder",
      "customers.section.billing",
      "customers.section.company",
      "customers.section.contact",
      "customers.toast.created",
      "customers.toast.updated",
    ]);
  });

  it("returns the German string for T-022 app-shell + customers keys", () => {
    expect(t("app.nav.customers")).toBe("Kunden");
    expect(t("app.action.sign-out")).toBe("Abmelden");
    expect(t("customers.page.title")).toBe("Kunden");
    expect(t("customers.page.subtitle")).toBe(
      "Verwalte deine Kundinnen und Kunden und ihre Machbarkeitsstudien.",
    );
    expect(t("customers.action.new")).toBe("Neuer Kunde");
    expect(t("customers.action.view")).toBe("Anzeigen");
    expect(t("customers.action.edit")).toBe("Bearbeiten");
    expect(t("customers.column.company")).toBe("Firma");
    expect(t("customers.column.contact")).toBe("Ansprechpartner");
    expect(t("customers.column.city")).toBe("Stadt");
    expect(t("customers.column.studies")).toBe("Studien");
    expect(t("customers.search.placeholder")).toBe("Nach Name oder Firma suchen…");
    expect(t("customers.empty.no-customers")).toBe(
      "Noch keine Kunden angelegt. Lege deine erste Kundin oder deinen ersten Kunden an, um zu starten.",
    );
    expect(t("customers.empty.no-results")).toBe(
      "Keine Kunden gefunden, die deiner Suche entsprechen.",
    );
    expect(t("customers.pagination.summary")).toBe("{from}–{to} von {total}");
    expect(t("customers.pagination.previous")).toBe("Zurück");
    expect(t("customers.pagination.next")).toBe("Weiter");
  });

  it("preserves the {from}/{to}/{total} interpolation markers on customers.pagination.summary", () => {
    const filled = t("customers.pagination.summary")
      .replace("{from}", "1")
      .replace("{to}", "25")
      .replace("{total}", "100");
    expect(filled).toBe("1–25 von 100");
  });

  it("returns the German string for a password-rule key", () => {
    expect(t("auth.password.rule.min-length")).toBe("Mindestens 8 Zeichen");
    expect(t("auth.password.rule.upper")).toBe("Mindestens ein Großbuchstabe");
    expect(t("auth.password.rule.lower")).toBe("Mindestens ein Kleinbuchstabe");
    expect(t("auth.password.rule.digit")).toBe("Mindestens eine Ziffer");
    expect(t("auth.password.rule.special")).toBe("Mindestens ein Sonderzeichen");
  });

  it("returns the German string for an auth-error key", () => {
    expect(t("auth.error.invalid-credentials")).toBe("Email oder Passwort falsch.");
    expect(t("auth.error.locked-out")).toBe(
      "Konto temporär gesperrt. Versuche es in {minutes} Minuten erneut.",
    );
    expect(t("auth.error.inactive")).toBe(
      "Konto deaktiviert. Bitte wende dich an den Administrator.",
    );
    expect(t("auth.error.must-change-password")).toBe("Bitte ändere zunächst dein Passwort.");
    expect(t("auth.error.server")).toBe(
      "Anmeldung fehlgeschlagen. Bitte versuche es später erneut.",
    );
  });

  it("returns the German string for T-018 login UI keys", () => {
    expect(t("auth.page.login.title")).toBe("Melde dich an");
    expect(t("auth.page.login.subtitle")).toBe("Willkommen zurück bei GreenScout");
    expect(t("auth.page.login.forgot-password-hint")).toBe(
      "Passwort vergessen? Bitte wende dich an den Administrator.",
    );
    expect(t("auth.field.email")).toBe("E-Mail-Adresse");
    expect(t("auth.field.password")).toBe("Passwort");
    expect(t("auth.action.sign-in")).toBe("Anmelden");
    expect(t("auth.action.signing-in")).toBe("Wird angemeldet…");
    expect(t("auth.error.lockout-banner-title")).toBe("Konto gesperrt");
  });

  it("returns the German string for T-019 PasswordRuleChecklist a11y keys", () => {
    expect(t("auth.checklist.aria-label")).toBe("Passwort-Anforderungen");
    expect(t("auth.checklist.fulfilled")).toBe("erfüllt");
    expect(t("auth.checklist.unfulfilled")).toBe("nicht erfüllt");
    expect(t("auth.checklist.neutral")).toBe("noch nicht geprüft");
  });

  it("returns the German string for T-019 change-password UI keys", () => {
    expect(t("auth.page.password-change.title")).toBe("Passwort ändern");
    expect(t("auth.page.password-change.subtitle")).toBe(
      "Aus Sicherheitsgründen muss dein Passwort jetzt geändert werden.",
    );
    expect(t("auth.field.current-password")).toBe("Aktuelles Passwort");
    expect(t("auth.field.new-password")).toBe("Neues Passwort");
    expect(t("auth.field.confirm-new-password")).toBe("Neues Passwort bestätigen");
    expect(t("auth.action.change-password")).toBe("Passwort ändern");
    expect(t("auth.action.changing-password")).toBe("Wird geändert…");
    expect(t("auth.error.wrong-current-password")).toBe("Aktuelles Passwort falsch.");
    expect(t("auth.error.same-as-current")).toBe(
      "Neues Passwort darf nicht dem aktuellen entsprechen.",
    );
    expect(t("auth.error.rules-not-satisfied")).toBe(
      "Neues Passwort erfüllt nicht alle Anforderungen.",
    );
    expect(t("auth.error.passwords-mismatch")).toBe("Passwörter stimmen nicht überein.");
  });

  it("returns the German string for T-023 customer-form keys", () => {
    // Sections + pages
    expect(t("customers.page.new.title")).toBe("Neuer Kunde");
    expect(t("customers.page.new.subtitle")).toBe(
      "Lege eine neue Kundin oder einen neuen Kunden an.",
    );
    expect(t("customers.page.edit.title")).toBe("Kunde bearbeiten");
    expect(t("customers.section.company")).toBe("Firma");
    expect(t("customers.section.contact")).toBe("Kontakt");
    expect(t("customers.section.billing")).toBe("Rechnungsadresse");
    // Fields
    expect(t("customers.field.company-name")).toBe("Firmenname");
    expect(t("customers.field.first-name")).toBe("Vorname");
    expect(t("customers.field.last-name")).toBe("Nachname");
    expect(t("customers.field.email")).toBe("E-Mail-Adresse");
    expect(t("customers.field.phone")).toBe("Telefon");
    expect(t("customers.field.billing-address")).toBe("Straße + Hausnummer");
    expect(t("customers.field.billing-zip")).toBe("Postleitzahl");
    expect(t("customers.field.billing-city")).toBe("Stadt");
    expect(t("customers.field.notes")).toBe("Notizen");
    // Actions
    expect(t("customers.action.cancel")).toBe("Abbrechen");
    expect(t("customers.action.create")).toBe("Anlegen");
    expect(t("customers.action.save")).toBe("Änderungen speichern");
    expect(t("customers.action.saving")).toBe("Wird gespeichert…");
    // Validation messages
    expect(t("customers.error.first-name-required")).toBe("Vorname ist erforderlich.");
    expect(t("customers.error.last-name-required")).toBe("Nachname ist erforderlich.");
    expect(t("customers.error.invalid-email")).toBe("Bitte gib eine gültige E-Mail-Adresse ein.");
    expect(t("customers.error.not-found")).toBe("Kunde nicht gefunden.");
    expect(t("customers.error.forbidden")).toBe(
      "Du bist nicht berechtigt, diesen Kunden zu bearbeiten.",
    );
    expect(t("customers.error.server")).toBe(
      "Speichern fehlgeschlagen. Bitte versuche es später erneut.",
    );
    // Toasts
    expect(t("customers.toast.created")).toBe("Kunde angelegt");
    expect(t("customers.toast.updated")).toBe("Änderungen gespeichert");
  });

  it("returns the German string for T-024 detail-page + delete-dialog keys", () => {
    // Detail page
    expect(t("customers.detail.title")).toBe("Kundendetails");
    expect(t("customers.detail.section.company")).toBe("Firma");
    expect(t("customers.detail.section.contact")).toBe("Kontakt");
    expect(t("customers.detail.section.billing")).toBe("Rechnungsadresse");
    expect(t("customers.detail.section.studies")).toBe("Verknüpfte Studien");
    expect(t("customers.detail.studies.empty")).toBe("Noch keine Studien für diesen Kunden.");
    expect(t("customers.detail.action.edit")).toBe("Bearbeiten");
    expect(t("customers.detail.action.delete")).toBe("Löschen");
    expect(t("customers.detail.field.empty")).toBe("—");
    // Soft-delete dialog
    expect(t("customers.delete.dialog.title")).toBe("Kunde löschen?");
    expect(t("customers.delete.dialog.description")).toBe(
      "Soll {company} wirklich gelöscht werden? Der Eintrag verschwindet aus der Liste, die zugehörigen Studien bleiben erhalten.",
    );
    expect(t("customers.delete.dialog.confirm")).toBe("Endgültig löschen");
    expect(t("customers.delete.dialog.cancel")).toBe("Abbrechen");
    // Toasts
    expect(t("customers.delete.toast.success")).toBe("{company} wurde gelöscht.");
    expect(t("customers.delete.toast.error.not-found")).toBe("Kunde nicht gefunden.");
    expect(t("customers.delete.toast.error.server")).toBe(
      "Beim Löschen ist ein Fehler aufgetreten. Bitte erneut versuchen.",
    );
  });

  it("preserves the {company} interpolation marker on customers.delete keys", () => {
    // T-024 CustomerDeleteDialog replaces this token client-side. The
    // token MUST stay intact in the source string — any edit here would
    // surface as "{company}" leaking into the German UI.
    expect(t("customers.delete.dialog.description")).toContain("{company}");
    expect(t("customers.delete.toast.success")).toContain("{company}");
    const filled = t("customers.delete.toast.success").replace(
      "{company}",
      "Hofgut Sonnenwiese GmbH",
    );
    expect(filled).toBe("Hofgut Sonnenwiese GmbH wurde gelöscht.");
  });

  it("preserves the {minutes} interpolation marker on auth.error.locked-out", () => {
    // T-018 LoginForm replaces this token client-side. The token MUST stay
    // intact in the source string — any edit here is a soft-distinguished UX bug.
    expect(t("auth.error.locked-out")).toContain("{minutes}");
    const filled = t("auth.error.locked-out").replace("{minutes}", "7");
    expect(filled).toBe("Konto temporär gesperrt. Versuche es in 7 Minuten erneut.");
  });
});
