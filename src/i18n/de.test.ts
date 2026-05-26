import { describe, expect, it } from "vitest";

import { de, t } from "./de";

describe("de translation dictionary", () => {
  it("has a non-empty key set covering every prior slice (regression guard, not exhaustive)", () => {
    const keys = Object.keys(de);
    expect(keys.length).toBeGreaterThan(100);
    // Sanity samples per slice — full asserts live in their own
    // it-blocks below.
    expect(keys).toContain("auth.password.rule.min-length");
    expect(keys).toContain("auth.error.invalid-credentials");
    expect(keys).toContain("auth.page.login.title");
    expect(keys).toContain("auth.checklist.aria-label");
    expect(keys).toContain("auth.page.password-change.title");
    expect(keys).toContain("app.nav.customers");
    expect(keys).toContain("customers.page.title");
    expect(keys).toContain("customers.field.first-name");
    expect(keys).toContain("customers.delete.dialog.title");
    // T-025 / Slice 5 studies keys
    expect(keys).toContain("app.nav.studies");
    expect(keys).toContain("studies.page.title");
    expect(keys).toContain("studies.wizard.step1.title");
    expect(keys).toContain("studies.error.customer-required");
    expect(keys).toContain("studies.toast.created");
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
    expect(t("customers.page.new.title")).toBe("Neuer Kunde");
    expect(t("customers.page.new.subtitle")).toBe(
      "Lege eine neue Kundin oder einen neuen Kunden an.",
    );
    expect(t("customers.page.edit.title")).toBe("Kunde bearbeiten");
    expect(t("customers.section.company")).toBe("Firma");
    expect(t("customers.section.contact")).toBe("Kontakt");
    expect(t("customers.section.billing")).toBe("Rechnungsadresse");
    expect(t("customers.field.company-name")).toBe("Firmenname");
    expect(t("customers.field.first-name")).toBe("Vorname");
    expect(t("customers.field.last-name")).toBe("Nachname");
    expect(t("customers.field.email")).toBe("E-Mail-Adresse");
    expect(t("customers.field.phone")).toBe("Telefon");
    expect(t("customers.field.billing-address")).toBe("Straße + Hausnummer");
    expect(t("customers.field.billing-zip")).toBe("Postleitzahl");
    expect(t("customers.field.billing-city")).toBe("Stadt");
    expect(t("customers.field.notes")).toBe("Notizen");
    expect(t("customers.action.cancel")).toBe("Abbrechen");
    expect(t("customers.action.create")).toBe("Anlegen");
    expect(t("customers.action.save")).toBe("Änderungen speichern");
    expect(t("customers.action.saving")).toBe("Wird gespeichert…");
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
    expect(t("customers.toast.created")).toBe("Kunde angelegt");
    expect(t("customers.toast.updated")).toBe("Änderungen gespeichert");
  });

  it("returns the German string for T-024 detail-page + delete-dialog keys", () => {
    expect(t("customers.detail.title")).toBe("Kundendetails");
    expect(t("customers.detail.section.company")).toBe("Firma");
    expect(t("customers.detail.section.contact")).toBe("Kontakt");
    expect(t("customers.detail.section.billing")).toBe("Rechnungsadresse");
    expect(t("customers.detail.section.studies")).toBe("Verknüpfte Studien");
    expect(t("customers.detail.studies.empty")).toBe("Noch keine Studien für diesen Kunden.");
    expect(t("customers.detail.action.edit")).toBe("Bearbeiten");
    expect(t("customers.detail.action.delete")).toBe("Löschen");
    expect(t("customers.detail.field.empty")).toBe("—");
    expect(t("customers.delete.dialog.title")).toBe("Kunde löschen?");
    expect(t("customers.delete.dialog.description")).toBe(
      "Soll {company} wirklich gelöscht werden? Der Eintrag verschwindet aus der Liste, die zugehörigen Studien bleiben erhalten.",
    );
    expect(t("customers.delete.dialog.confirm")).toBe("Endgültig löschen");
    expect(t("customers.delete.dialog.cancel")).toBe("Abbrechen");
    expect(t("customers.delete.toast.success")).toBe("{company} wurde gelöscht.");
    expect(t("customers.delete.toast.error.not-found")).toBe("Kunde nicht gefunden.");
    expect(t("customers.delete.toast.error.server")).toBe(
      "Beim Löschen ist ein Fehler aufgetreten. Bitte erneut versuchen.",
    );
  });

  it("preserves the {company} interpolation marker on customers.delete keys", () => {
    expect(t("customers.delete.dialog.description")).toContain("{company}");
    expect(t("customers.delete.toast.success")).toContain("{company}");
    const filled = t("customers.delete.toast.success").replace(
      "{company}",
      "Hofgut Sonnenwiese GmbH",
    );
    expect(filled).toBe("Hofgut Sonnenwiese GmbH wurde gelöscht.");
  });

  it("preserves the {minutes} interpolation marker on auth.error.locked-out", () => {
    expect(t("auth.error.locked-out")).toContain("{minutes}");
    const filled = t("auth.error.locked-out").replace("{minutes}", "7");
    expect(filled).toBe("Konto temporär gesperrt. Versuche es in 7 Minuten erneut.");
  });

  // ─── T-025 / Slice 5 studies dictionary ────────────────────────────
  it("returns the German string for T-028 studies dashboard keys", () => {
    expect(t("app.nav.studies")).toBe("Studien");
    expect(t("studies.page.title")).toBe("Studien");
    expect(t("studies.page.subtitle")).toBe("Übersicht aller Machbarkeitsstudien.");
    expect(t("studies.action.new")).toBe("Neue Studie");
    expect(t("studies.action.view")).toBe("Anzeigen");
    expect(t("studies.action.edit")).toBe("Bearbeiten");
    expect(t("studies.action.delete")).toBe("Löschen");
    expect(t("studies.action.save")).toBe("Speichern");
    expect(t("studies.action.previous")).toBe("Zurück");
    expect(t("studies.action.next")).toBe("Weiter");
    expect(t("studies.action.mark-ready")).toBe("Studie als bereit markieren");
    expect(t("studies.status.draft")).toBe("Entwurf");
    expect(t("studies.status.ready")).toBe("Bereit");
    expect(t("studies.status.generated")).toBe("Generiert");
    expect(t("studies.empty.no-studies")).toContain("Noch keine Studien");
    expect(t("studies.empty.no-results")).toContain("Keine Studien gefunden");
  });

  it("returns the German string for T-026 wizard step titles", () => {
    expect(t("studies.wizard.step1.title")).toBe("Kunde");
    expect(t("studies.wizard.step2.title")).toBe("Objekt & Flurstück");
    expect(t("studies.wizard.step3.title")).toBe("PV-Inputs");
    expect(t("studies.wizard.step4.title")).toBe("Modul-/Anlagenspezifikation");
    expect(t("studies.wizard.step5.title")).toBe("Sensitivitätsanalyse");
    expect(t("studies.wizard.step6.title")).toBe("Termine");
    expect(t("studies.wizard.step7.title")).toBe("Bilder");
    expect(t("studies.wizard.step8.title")).toBe("Review & Speichern");
  });

  it("returns the German string for T-025 studies validation keys", () => {
    expect(t("studies.error.customer-required")).toBe("Kunde ist erforderlich.");
    expect(t("studies.error.anlage-kwp-required")).toBe("Anlagengröße ist erforderlich.");
    expect(t("studies.error.termine-must-differ")).toBe("Termine müssen sich unterscheiden.");
  });

  it("preserves {object} interpolation on studies delete dialog", () => {
    expect(t("studies.delete.dialog.description")).toContain("{object}");
    const filled = t("studies.delete.dialog.description").replace("{object}", "Hofgut Sonnenwiese");
    expect(filled).toContain("Hofgut Sonnenwiese");
  });

  it("preserves {current}/{total} interpolation on studies wizard step counter", () => {
    expect(t("studies.wizard.step")).toContain("{current}");
    expect(t("studies.wizard.step")).toContain("{total}");
    const filled = t("studies.wizard.step").replace("{current}", "3").replace("{total}", "8");
    expect(filled).toBe("Schritt 3 von 8");
  });

  // ─── T-030 Handover (F6) ───────────────────────────────────────────
  it("returns the German string for T-030 handover dialog keys", () => {
    expect(t("studies.handover.action")).toBe("Studie übergeben");
    expect(t("studies.handover.dialog.title")).toBe("Studie an einen anderen Berater übergeben?");
    expect(t("studies.handover.dialog.confirm")).toBe("Übergeben");
    expect(t("studies.handover.dialog.cancel")).toBe("Abbrechen");
    expect(t("studies.handover.field.target")).toBe("Neue Beraterin / neuer Berater");
    expect(t("studies.handover.field.target.placeholder")).toBe("Bitte auswählen…");
    expect(t("studies.handover.toast.success")).toBe("Studie übergeben.");
  });

  it("preserves {object} interpolation on the handover dialog description", () => {
    expect(t("studies.handover.dialog.description")).toContain("{object}");
    const filled = t("studies.handover.dialog.description").replace("{object}", "Hofgut");
    expect(filled).toContain("Hofgut");
  });

  // ─── T-041a Admin user management ──────────────────────────────────
  it("returns the German string for T-041a users dashboard keys", () => {
    expect(t("app.nav.users")).toBe("Nutzer");
    expect(t("users.page.title")).toBe("Nutzer");
    expect(t("users.action.new")).toBe("Neuer Nutzer");
    expect(t("users.action.deactivate")).toBe("Deaktivieren");
    expect(t("users.column.name")).toBe("Name");
    expect(t("users.column.email")).toBe("E-Mail");
    expect(t("users.column.role")).toBe("Rolle");
    expect(t("users.role.admin")).toBe("Admin");
    expect(t("users.role.berater")).toBe("Berater");
    expect(t("users.state.active")).toBe("Aktiv");
    expect(t("users.state.inactive")).toBe("Deaktiviert");
  });

  it("returns the German string for T-041a user form + validation keys", () => {
    expect(t("users.field.email")).toBe("E-Mail-Adresse");
    expect(t("users.field.first-name")).toBe("Vorname");
    expect(t("users.field.last-name")).toBe("Nachname");
    expect(t("users.field.role")).toBe("Rolle");
    expect(t("users.error.email-required")).toBe("E-Mail-Adresse ist erforderlich.");
    expect(t("users.error.email-invalid")).toBe("Bitte gib eine gültige E-Mail-Adresse ein.");
    expect(t("users.error.first-name-required")).toBe("Vorname ist erforderlich.");
    expect(t("users.error.email-taken")).toBe("Diese E-Mail-Adresse ist bereits vergeben.");
  });

  it("preserves {name} interpolation on the deactivate dialog description", () => {
    expect(t("users.deactivate.dialog.description")).toContain("{name}");
    const filled = t("users.deactivate.dialog.description").replace("{name}", "Anna Beispiel");
    expect(filled).toContain("Anna Beispiel");
  });

  it("returns the German string for T-041a temp-password dialog keys", () => {
    expect(t("users.temp-password.dialog.title")).toBe("Temporäres Passwort");
    expect(t("users.temp-password.action.copy")).toBe("In Zwischenablage kopieren");
    expect(t("users.temp-password.action.close")).toBe("Schließen");
  });
});
