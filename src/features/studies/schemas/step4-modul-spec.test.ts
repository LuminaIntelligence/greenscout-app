import { describe, expect, it } from "vitest";

import { step4ModulSpecSchema } from "./step4-modul-spec";

const VALID = {
  modulAnzahl: 200,
  modulFlaecheM2: 400,
  eigenverbrauchsquoteProzent: 65,
  netzeinspeisungKwhJahr: 30_000,
};

describe("step4ModulSpecSchema", () => {
  it("accepts a valid input", () => {
    expect(step4ModulSpecSchema.safeParse(VALID).success).toBe(true);
  });

  it("accepts zero eigenverbrauchsquoteProzent", () => {
    expect(
      step4ModulSpecSchema.safeParse({ ...VALID, eigenverbrauchsquoteProzent: 0 }).success,
    ).toBe(true);
  });

  it("rejects eigenverbrauchsquoteProzent > 100", () => {
    const result = step4ModulSpecSchema.safeParse({
      ...VALID,
      eigenverbrauchsquoteProzent: 110,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "studies.error.eigenverbrauchsquote-out-of-range",
      );
    }
  });

  it("rejects negative eigenverbrauchsquoteProzent", () => {
    const result = step4ModulSpecSchema.safeParse({
      ...VALID,
      eigenverbrauchsquoteProzent: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty eigenverbrauchsquoteProzent", () => {
    const result = step4ModulSpecSchema.safeParse({
      ...VALID,
      eigenverbrauchsquoteProzent: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer modulAnzahl", () => {
    const result = step4ModulSpecSchema.safeParse({ ...VALID, modulAnzahl: 1.5 });
    expect(result.success).toBe(false);
  });

  it("rejects empty modulAnzahl", () => {
    const result = step4ModulSpecSchema.safeParse({ ...VALID, modulAnzahl: "" });
    expect(result.success).toBe(false);
  });

  it("rejects zero modulFlaecheM2", () => {
    const result = step4ModulSpecSchema.safeParse({ ...VALID, modulFlaecheM2: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects out-of-range modulFlaecheM2", () => {
    const result = step4ModulSpecSchema.safeParse({ ...VALID, modulFlaecheM2: 2_000_000 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("studies.error.modul-flaeche-out-of-range");
    }
  });

  it("rejects empty modulFlaecheM2", () => {
    const result = step4ModulSpecSchema.safeParse({ ...VALID, modulFlaecheM2: "" });
    expect(result.success).toBe(false);
  });

  it("rejects out-of-range netzeinspeisungKwhJahr", () => {
    const result = step4ModulSpecSchema.safeParse({
      ...VALID,
      netzeinspeisungKwhJahr: 5e8,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty netzeinspeisungKwhJahr", () => {
    const result = step4ModulSpecSchema.safeParse({
      ...VALID,
      netzeinspeisungKwhJahr: "",
    });
    expect(result.success).toBe(false);
  });
});
