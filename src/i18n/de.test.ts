import { describe, expect, it } from "vitest";

import { de, t } from "./de";

describe("de translation dictionary", () => {
  it("contains all expected keys: 5 password-rule + 5 auth-error + 8 T-018 login UI", () => {
    expect(Object.keys(de).sort()).toEqual([
      "auth.action.sign-in",
      "auth.action.signing-in",
      "auth.error.inactive",
      "auth.error.invalid-credentials",
      "auth.error.locked-out",
      "auth.error.lockout-banner-title",
      "auth.error.must-change-password",
      "auth.error.server",
      "auth.field.email",
      "auth.field.password",
      "auth.page.login.forgot-password-hint",
      "auth.page.login.subtitle",
      "auth.page.login.title",
      "auth.password.rule.digit",
      "auth.password.rule.lower",
      "auth.password.rule.min-length",
      "auth.password.rule.special",
      "auth.password.rule.upper",
    ]);
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

  it("preserves the {minutes} interpolation marker on auth.error.locked-out", () => {
    // T-018 LoginForm replaces this token client-side. The token MUST stay
    // intact in the source string — any edit here is a soft-distinguished UX bug.
    expect(t("auth.error.locked-out")).toContain("{minutes}");
    const filled = t("auth.error.locked-out").replace("{minutes}", "7");
    expect(filled).toBe("Konto temporär gesperrt. Versuche es in 7 Minuten erneut.");
  });
});
