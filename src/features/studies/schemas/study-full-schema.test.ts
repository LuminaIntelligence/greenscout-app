import { describe, expect, it } from "vitest";

import { studyFullSchema } from "./study-full-schema";

const VALID = {
  customerId: "cust-1",
  objectName: "Hofgut Sonnenwiese",
  objectAddress: "Sonnenweg 12",
  objectZipCode: "78462",
  objectCity: "Konstanz",
  flurstueck: "123/4",
  anlageKwp: 100,
  pvErzeugungKwhJahr: 95_000,
  pvEigenverbrauchKwhJahr: 30_000,
  pvVerkaufEurKwh: 0.08,
  verbrauchKwhJahr: 50_000,
  versorgerPreisEurKwh: 0.35,
  pachtEurProKwp: 100,
  vertragslaufzeitJahre: 20,
  modulAnzahl: 200,
  modulFlaecheM2: 400,
  eigenverbrauchsquoteProzent: 65,
  netzeinspeisungKwhJahr: 30_000,
  szenarioPreis1: 0.35,
  szenarioPreis2: 0.4,
  szenarioPreis3: 0.45,
  terminVorschlag1: new Date("2026-06-01T10:00:00"),
  terminVorschlag2: new Date("2026-06-02T10:00:00"),
  bildBeforeId: "img-before-1",
  bildAfterId: "img-after-1",
};

describe("studyFullSchema", () => {
  it("accepts a complete valid study", () => {
    const result = studyFullSchema.safeParse(VALID);
    expect(result.success).toBe(true);
  });

  it("rejects when a step 2 field is missing", () => {
    const { objectName: _objectName, ...rest } = VALID;
    const result = studyFullSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects when a step 3 field is invalid", () => {
    const result = studyFullSchema.safeParse({ ...VALID, anlageKwp: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects when termine are identical (cross-field refine)", () => {
    const result = studyFullSchema.safeParse({
      ...VALID,
      terminVorschlag2: new Date("2026-06-01T10:00:00"),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message === "studies.error.termine-must-differ"),
      ).toBe(true);
    }
  });
});
