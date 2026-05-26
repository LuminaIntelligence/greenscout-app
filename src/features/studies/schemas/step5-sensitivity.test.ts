import { describe, expect, it } from "vitest";

import { SENSITIVITY_DEFAULTS, step5SensitivitySchema } from "./step5-sensitivity";

describe("step5SensitivitySchema", () => {
  it("defaults to 35/40/45 ct/kWh constants", () => {
    expect(SENSITIVITY_DEFAULTS).toEqual({
      szenarioPreis1: 0.35,
      szenarioPreis2: 0.4,
      szenarioPreis3: 0.45,
    });
  });

  it("accepts the documented defaults", () => {
    expect(step5SensitivitySchema.safeParse(SENSITIVITY_DEFAULTS).success).toBe(true);
  });

  it("rejects zero", () => {
    const result = step5SensitivitySchema.safeParse({
      ...SENSITIVITY_DEFAULTS,
      szenarioPreis1: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects out-of-range (> 2)", () => {
    const result = step5SensitivitySchema.safeParse({
      ...SENSITIVITY_DEFAULTS,
      szenarioPreis2: 3,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("studies.error.szenario-out-of-range");
    }
  });

  it("rejects empty szenarioPreis1", () => {
    const result = step5SensitivitySchema.safeParse({
      ...SENSITIVITY_DEFAULTS,
      szenarioPreis1: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty szenarioPreis3", () => {
    const result = step5SensitivitySchema.safeParse({
      ...SENSITIVITY_DEFAULTS,
      szenarioPreis3: "",
    });
    expect(result.success).toBe(false);
  });
});
