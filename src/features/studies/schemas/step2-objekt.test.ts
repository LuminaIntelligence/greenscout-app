import { describe, expect, it } from "vitest";

import { step2ObjektSchema } from "./step2-objekt";

const VALID = {
  objectName: "Hofgut Sonnenwiese",
  objectAddress: "Sonnenweg 12",
  objectZipCode: "78462",
  objectCity: "Konstanz",
  flurstueck: "123/4",
};

describe("step2ObjektSchema", () => {
  it("accepts a valid input", () => {
    expect(step2ObjektSchema.safeParse(VALID).success).toBe(true);
  });

  it("rejects empty objectName", () => {
    const result = step2ObjektSchema.safeParse({ ...VALID, objectName: "  " });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("studies.error.object-name-required");
    }
  });

  it("rejects empty flurstueck", () => {
    const result = step2ObjektSchema.safeParse({ ...VALID, flurstueck: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("studies.error.flurstueck-required");
    }
  });

  it("rejects empty objectAddress", () => {
    const result = step2ObjektSchema.safeParse({ ...VALID, objectAddress: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("studies.error.object-address-required");
    }
  });

  it("rejects empty objectZipCode", () => {
    const result = step2ObjektSchema.safeParse({ ...VALID, objectZipCode: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("studies.error.object-zip-required");
    }
  });

  it("rejects empty objectCity", () => {
    const result = step2ObjektSchema.safeParse({ ...VALID, objectCity: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("studies.error.object-city-required");
    }
  });
});
