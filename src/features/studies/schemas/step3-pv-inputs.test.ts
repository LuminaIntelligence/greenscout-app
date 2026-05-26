import { describe, expect, it } from "vitest";

import { step3PvInputsSchema } from "./step3-pv-inputs";

const VALID = {
  anlageKwp: 100,
  pvErzeugungKwhJahr: 95_000,
  pvEigenverbrauchKwhJahr: 30_000,
  pvVerkaufEurKwh: 0.08,
  verbrauchKwhJahr: 50_000,
  versorgerPreisEurKwh: 0.35,
  pachtEurProKwp: 100,
  vertragslaufzeitJahre: 20,
};

describe("step3PvInputsSchema", () => {
  it("accepts a valid input", () => {
    const result = step3PvInputsSchema.safeParse(VALID);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.anlageKwp).toBe(100);
    }
  });

  it("rejects zero anlageKwp", () => {
    const result = step3PvInputsSchema.safeParse({ ...VALID, anlageKwp: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects an out-of-range anlageKwp (> 100 000)", () => {
    const result = step3PvInputsSchema.safeParse({ ...VALID, anlageKwp: 200_000 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("studies.error.anlage-kwp-out-of-range");
    }
  });

  it("rejects empty anlageKwp", () => {
    const result = step3PvInputsSchema.safeParse({ ...VALID, anlageKwp: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("studies.error.anlage-kwp-required");
    }
  });

  it("rejects out-of-range pvErzeugungKwhJahr", () => {
    const result = step3PvInputsSchema.safeParse({ ...VALID, pvErzeugungKwhJahr: 5e8 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("studies.error.pv-erzeugung-out-of-range");
    }
  });

  it("rejects empty pvErzeugungKwhJahr", () => {
    const result = step3PvInputsSchema.safeParse({ ...VALID, pvErzeugungKwhJahr: "" });
    expect(result.success).toBe(false);
  });

  it("rejects empty pvEigenverbrauchKwhJahr", () => {
    const result = step3PvInputsSchema.safeParse({ ...VALID, pvEigenverbrauchKwhJahr: "" });
    expect(result.success).toBe(false);
  });

  it("rejects out-of-range pvEigenverbrauchKwhJahr", () => {
    const result = step3PvInputsSchema.safeParse({ ...VALID, pvEigenverbrauchKwhJahr: 5e8 });
    expect(result.success).toBe(false);
  });

  it("rejects an out-of-range pvVerkaufEurKwh (> 1)", () => {
    const result = step3PvInputsSchema.safeParse({ ...VALID, pvVerkaufEurKwh: 5 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("studies.error.pv-verkauf-out-of-range");
    }
  });

  it("rejects empty pvVerkaufEurKwh", () => {
    const result = step3PvInputsSchema.safeParse({ ...VALID, pvVerkaufEurKwh: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an out-of-range verbrauchKwhJahr", () => {
    const result = step3PvInputsSchema.safeParse({ ...VALID, verbrauchKwhJahr: 5e8 });
    expect(result.success).toBe(false);
  });

  it("rejects empty verbrauchKwhJahr", () => {
    const result = step3PvInputsSchema.safeParse({ ...VALID, verbrauchKwhJahr: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an out-of-range versorgerPreisEurKwh", () => {
    const result = step3PvInputsSchema.safeParse({ ...VALID, versorgerPreisEurKwh: 5 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("studies.error.versorger-preis-out-of-range");
    }
  });

  it("rejects empty versorgerPreisEurKwh", () => {
    const result = step3PvInputsSchema.safeParse({ ...VALID, versorgerPreisEurKwh: "" });
    expect(result.success).toBe(false);
  });

  it("rejects out-of-range pachtEurProKwp", () => {
    const result = step3PvInputsSchema.safeParse({ ...VALID, pachtEurProKwp: 20_000 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("studies.error.pacht-out-of-range");
    }
  });

  it("rejects empty pachtEurProKwp", () => {
    const result = step3PvInputsSchema.safeParse({ ...VALID, pachtEurProKwp: "" });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer vertragslaufzeitJahre", () => {
    const result = step3PvInputsSchema.safeParse({ ...VALID, vertragslaufzeitJahre: 1.5 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("studies.error.vertragslaufzeit-invalid");
    }
  });

  it("rejects empty vertragslaufzeitJahre", () => {
    const result = step3PvInputsSchema.safeParse({ ...VALID, vertragslaufzeitJahre: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("studies.error.vertragslaufzeit-required");
    }
  });

  it("accepts German-locale numeric strings", () => {
    const result = step3PvInputsSchema.safeParse({ ...VALID, anlageKwp: "100" });
    expect(result.success).toBe(true);
  });

  it("rejects non-numeric strings", () => {
    const result = step3PvInputsSchema.safeParse({ ...VALID, anlageKwp: "viel" });
    expect(result.success).toBe(false);
  });
});
