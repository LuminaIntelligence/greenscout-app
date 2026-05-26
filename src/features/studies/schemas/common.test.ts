import { describe, expect, it } from "vitest";

import {
  nonNegativeDecimal,
  optionalString,
  positiveDecimal,
  positiveInt,
  requiredString,
} from "./common";

describe("studies/schemas/common — optionalString", () => {
  it("strips whitespace and returns undefined for empty input", () => {
    expect(optionalString.parse("   ")).toBeUndefined();
    expect(optionalString.parse("")).toBeUndefined();
  });

  it("returns the trimmed string when populated", () => {
    expect(optionalString.parse("  hello  ")).toBe("hello");
  });

  it("accepts undefined", () => {
    expect(optionalString.parse(undefined)).toBeUndefined();
  });
});

describe("studies/schemas/common — requiredString", () => {
  const schema = requiredString("missing");

  it("trims and returns the value", () => {
    expect(schema.parse("  abc  ")).toBe("abc");
  });

  it("rejects empty input with the configured key", () => {
    const result = schema.safeParse("   ");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("missing");
    }
  });
});

describe("studies/schemas/common — positiveDecimal", () => {
  const schema = positiveDecimal({
    requiredKey: "req",
    invalidKey: "inv",
    max: 1000,
    maxKey: "max",
  });

  it("accepts a plain number", () => {
    expect(schema.parse(12.5)).toBe(12.5);
  });

  it("accepts a numeric string", () => {
    expect(schema.parse("42")).toBe(42);
  });

  it("rejects empty input with requiredKey", () => {
    const result = schema.safeParse("");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("req");
    }
  });

  it("rejects non-numeric input with invalidKey", () => {
    const result = schema.safeParse("not-a-number");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("inv");
    }
  });

  it("rejects zero with invalidKey", () => {
    const result = schema.safeParse(0);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("inv");
    }
  });

  it("rejects negative numbers with invalidKey", () => {
    const result = schema.safeParse(-1);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("inv");
    }
  });

  it("rejects values above max with maxKey", () => {
    const result = schema.safeParse(2000);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("max");
    }
  });

  it("falls back to invalidKey when maxKey is omitted", () => {
    const inner = positiveDecimal({ requiredKey: "r", invalidKey: "i", max: 10 });
    const result = inner.safeParse(99);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("i");
    }
  });

  it("accepts the boundary max value", () => {
    expect(schema.parse(1000)).toBe(1000);
  });

  it("rejects Infinity (Zod's number type rejects it pre-transform)", () => {
    const result = schema.safeParse(Number.POSITIVE_INFINITY);
    expect(result.success).toBe(false);
  });
});

describe("studies/schemas/common — nonNegativeDecimal", () => {
  const schema = nonNegativeDecimal({
    requiredKey: "req",
    invalidKey: "inv",
    max: 100,
    maxKey: "max",
  });

  it("accepts zero", () => {
    expect(schema.parse(0)).toBe(0);
  });

  it("accepts a positive number", () => {
    expect(schema.parse(50)).toBe(50);
  });

  it("rejects negative numbers", () => {
    const result = schema.safeParse(-1);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("inv");
    }
  });

  it("rejects empty input with requiredKey", () => {
    const result = schema.safeParse("");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("req");
    }
  });

  it("rejects non-numeric input", () => {
    const result = schema.safeParse("xyz");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("inv");
    }
  });

  it("rejects values above max", () => {
    const result = schema.safeParse(200);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("max");
    }
  });

  it("uses invalidKey when maxKey is omitted", () => {
    const inner = nonNegativeDecimal({ requiredKey: "r", invalidKey: "i", max: 10 });
    const result = inner.safeParse(99);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("i");
    }
  });
});

describe("studies/schemas/common — positiveInt", () => {
  const schema = positiveInt({
    requiredKey: "req",
    invalidKey: "inv",
  });

  it("accepts a positive integer", () => {
    expect(schema.parse(20)).toBe(20);
  });

  it("accepts a numeric string integer", () => {
    expect(schema.parse("12")).toBe(12);
  });

  it("rejects empty input with requiredKey", () => {
    const result = schema.safeParse("");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("req");
    }
  });

  it("rejects a non-integer", () => {
    const result = schema.safeParse(1.5);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("inv");
    }
  });

  it("rejects zero", () => {
    const result = schema.safeParse(0);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("inv");
    }
  });

  it("rejects negative", () => {
    const result = schema.safeParse(-1);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("inv");
    }
  });

  it("rejects non-numeric", () => {
    const result = schema.safeParse("abc");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("inv");
    }
  });
});
