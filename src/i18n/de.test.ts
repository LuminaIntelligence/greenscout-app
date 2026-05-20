import { describe, expect, it } from "vitest";

import { de, t } from "./de";

describe("de translation dictionary", () => {
  it("contains all 5 password-rule keys", () => {
    expect(Object.keys(de).sort()).toEqual([
      "auth.password.rule.digit",
      "auth.password.rule.lower",
      "auth.password.rule.min-length",
      "auth.password.rule.special",
      "auth.password.rule.upper",
    ]);
  });

  it("returns the German string for a valid key", () => {
    expect(t("auth.password.rule.min-length")).toBe("Mindestens 8 Zeichen");
    expect(t("auth.password.rule.upper")).toBe("Mindestens ein Großbuchstabe");
    expect(t("auth.password.rule.lower")).toBe("Mindestens ein Kleinbuchstabe");
    expect(t("auth.password.rule.digit")).toBe("Mindestens eine Ziffer");
    expect(t("auth.password.rule.special")).toBe("Mindestens ein Sonderzeichen");
  });
});
