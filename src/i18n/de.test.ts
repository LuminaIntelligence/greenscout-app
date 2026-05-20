import { describe, expect, it } from "vitest";

import { de, t } from "./de";

describe("de translation dictionary", () => {
  it("contains all 5 password-rule keys + 5 auth-error keys", () => {
    expect(Object.keys(de).sort()).toEqual([
      "auth.error.inactive",
      "auth.error.invalid-credentials",
      "auth.error.locked-out",
      "auth.error.must-change-password",
      "auth.error.server",
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
});
