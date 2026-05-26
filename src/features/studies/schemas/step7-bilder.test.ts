import { describe, expect, it } from "vitest";

import { step7BilderSchema } from "./step7-bilder";

describe("step7BilderSchema", () => {
  it("rejects an empty payload (both slots required for READY)", () => {
    const result = step7BilderSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects when only the BEFORE slot is filled", () => {
    const result = step7BilderSchema.safeParse({ bildBeforeId: "img-1" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("studies.error.bild-after-required");
    }
  });

  it("rejects when only the AFTER slot is filled", () => {
    const result = step7BilderSchema.safeParse({ bildAfterId: "img-1" });
    expect(result.success).toBe(false);
  });

  it("rejects empty-string IDs as missing", () => {
    const result = step7BilderSchema.safeParse({
      bildBeforeId: "",
      bildAfterId: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts both populated bildBeforeId/bildAfterId", () => {
    expect(
      step7BilderSchema.safeParse({
        bildBeforeId: "img-before-1",
        bildAfterId: "img-after-1",
      }).success,
    ).toBe(true);
  });
});
