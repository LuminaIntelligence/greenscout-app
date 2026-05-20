import { describe, expect, it } from "vitest";

import {
  MIN_PASSWORD_LENGTH,
  PASSWORD_HASH_MEMORY_KIB,
  PASSWORD_HASH_PARALLELISM,
  PASSWORD_HASH_TIME_COST,
  passwordRules,
  validatePassword,
} from "./password-policy";

describe("argon2 constants", () => {
  it("expose SPEC §6.3 baseline values", () => {
    // The defaults must match the SPEC. Env overrides are tested separately.
    expect(PASSWORD_HASH_MEMORY_KIB).toBeGreaterThanOrEqual(19456);
    expect(PASSWORD_HASH_TIME_COST).toBeGreaterThanOrEqual(2);
    expect(PASSWORD_HASH_PARALLELISM).toBeGreaterThanOrEqual(1);
  });

  it("MIN_PASSWORD_LENGTH is 8", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8);
  });
});

describe("passwordRules", () => {
  it("contains exactly 5 rules with stable keys in declared order", () => {
    expect(passwordRules.map((r) => r.key)).toEqual([
      "min-length",
      "upper",
      "lower",
      "digit",
      "special",
    ]);
  });

  it("is frozen (immutable)", () => {
    expect(Object.isFrozen(passwordRules)).toBe(true);
  });

  describe("min-length rule", () => {
    const rule = passwordRules.find((r) => r.key === "min-length")!;

    it("rejects strings shorter than 8 characters", () => {
      expect(rule.test("")).toBe(false);
      expect(rule.test("1234567")).toBe(false);
    });

    it("accepts strings >= 8 characters", () => {
      expect(rule.test("12345678")).toBe(true);
      expect(rule.test("a-very-long-passphrase")).toBe(true);
    });
  });

  describe("upper rule (Unicode-aware)", () => {
    const rule = passwordRules.find((r) => r.key === "upper")!;

    it("accepts ASCII uppercase letters", () => {
      expect(rule.test("A")).toBe(true);
      expect(rule.test("aAa")).toBe(true);
    });

    it("accepts Unicode uppercase (Ä, Ö, Ü, accented variants)", () => {
      expect(rule.test("Ä")).toBe(true);
      expect(rule.test("Ö")).toBe(true);
      expect(rule.test("Ü")).toBe(true);
      expect(rule.test("Á")).toBe(true);
    });

    it("rejects strings without uppercase", () => {
      expect(rule.test("")).toBe(false);
      expect(rule.test("alllowercase")).toBe(false);
      expect(rule.test("123!")).toBe(false);
    });
  });

  describe("lower rule (Unicode-aware)", () => {
    const rule = passwordRules.find((r) => r.key === "lower")!;

    it("accepts ASCII lowercase letters", () => {
      expect(rule.test("a")).toBe(true);
      expect(rule.test("AaA")).toBe(true);
    });

    it("accepts Unicode lowercase (ä, ö, ü, accented variants)", () => {
      expect(rule.test("ä")).toBe(true);
      expect(rule.test("ö")).toBe(true);
      expect(rule.test("ü")).toBe(true);
      expect(rule.test("á")).toBe(true);
    });

    it("rejects strings without lowercase", () => {
      expect(rule.test("")).toBe(false);
      expect(rule.test("ALLUPPER")).toBe(false);
      expect(rule.test("123!")).toBe(false);
    });
  });

  describe("digit rule", () => {
    const rule = passwordRules.find((r) => r.key === "digit")!;

    it("accepts strings with at least one digit", () => {
      expect(rule.test("0")).toBe(true);
      expect(rule.test("abc123")).toBe(true);
    });

    it("rejects strings without digits", () => {
      expect(rule.test("")).toBe(false);
      expect(rule.test("abcdef")).toBe(false);
    });
  });

  describe("special rule (Unicode-aware)", () => {
    const rule = passwordRules.find((r) => r.key === "special")!;

    it("accepts ASCII special characters", () => {
      expect(rule.test("!")).toBe(true);
      expect(rule.test("a@b")).toBe(true);
      expect(rule.test("password#1")).toBe(true);
    });

    it("treats Unicode letters as NON-special (ä, Ä, é are Letters)", () => {
      expect(rule.test("ä")).toBe(false);
      expect(rule.test("Ä")).toBe(false);
      expect(rule.test("é")).toBe(false);
    });

    it("treats Unicode digits as NON-special (Arabic-Indic digits etc.)", () => {
      // Persian/Arabic-Indic digit 0
      expect(rule.test("۰")).toBe(false);
    });

    it("rejects pure alphanumeric strings", () => {
      expect(rule.test("")).toBe(false);
      expect(rule.test("abc123")).toBe(false);
      expect(rule.test("HelloWorld42")).toBe(false);
    });

    it("accepts punctuation and symbols", () => {
      expect(rule.test("hello!")).toBe(true);
      expect(rule.test("a/b")).toBe(true);
      expect(rule.test("€")).toBe(true);
      expect(rule.test(" ")).toBe(true); // space counts as special
    });
  });
});

describe("validatePassword", () => {
  it("returns ok=false with all rules failing for empty input", () => {
    const result = validatePassword("");
    expect(result.ok).toBe(false);
    expect(result.rules).toEqual([
      { key: "min-length", ok: false },
      { key: "upper", ok: false },
      { key: "lower", ok: false },
      { key: "digit", ok: false },
      { key: "special", ok: false },
    ]);
  });

  it("returns ok=true with all rules passing for a strong password", () => {
    const result = validatePassword("Aa1!aaaa");
    expect(result.ok).toBe(true);
    expect(result.rules.every((r) => r.ok)).toBe(true);
  });

  it("returns mixed results for partial-rule passwords", () => {
    // "abc" — too short, has lower, no upper/digit/special
    const result = validatePassword("abc");
    expect(result.ok).toBe(false);
    expect(result.rules.find((r) => r.key === "min-length")!.ok).toBe(false);
    expect(result.rules.find((r) => r.key === "lower")!.ok).toBe(true);
    expect(result.rules.find((r) => r.key === "upper")!.ok).toBe(false);
    expect(result.rules.find((r) => r.key === "digit")!.ok).toBe(false);
    expect(result.rules.find((r) => r.key === "special")!.ok).toBe(false);
  });

  it("works with Unicode characters (Päßwörd1! has Ü-class, ä/ß/ö lowers, digit, special)", () => {
    const result = validatePassword("Päßwörd1!");
    expect(result.ok).toBe(true);
  });

  it("returns rules in the same order as passwordRules", () => {
    const result = validatePassword("anything");
    expect(result.rules.map((r) => r.key)).toEqual(passwordRules.map((r) => r.key));
  });

  it("treats long-but-no-special-no-digit-no-upper input as min-length+lower only", () => {
    const result = validatePassword("longlowercasestring");
    expect(result.ok).toBe(false);
    expect(result.rules.find((r) => r.key === "min-length")!.ok).toBe(true);
    expect(result.rules.find((r) => r.key === "lower")!.ok).toBe(true);
    expect(result.rules.find((r) => r.key === "upper")!.ok).toBe(false);
    expect(result.rules.find((r) => r.key === "digit")!.ok).toBe(false);
    expect(result.rules.find((r) => r.key === "special")!.ok).toBe(false);
  });
});
