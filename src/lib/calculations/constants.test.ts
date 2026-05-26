/**
 * T-031 — Constants module sanity tests.
 *
 * Per DECISIONS.md "CO₂ Mischwald-Faktor provisional": tests assert
 * the constants are *referenced* (exist and have the expected type),
 * not their exact numeric values. This keeps a future GreenScout
 * correction (e.g. updating the Mischwald factor) a single-line edit.
 *
 * Parity with the Python mirror (`services/python/app/domain/constants.py`)
 * is enforced by the T-034 fixture suite.
 */

import { describe, expect, it } from "vitest";

import {
  CO2_HA_MISCHWALD_PER_T_PER_YEAR,
  CO2_KG_PER_KWH_PV,
  DEFAULT_PACHT_EUR_PER_KWP,
  DEFAULT_SENSITIVITY_CT_KWH,
  DEFAULT_VERTRAGSLAUFZEIT_JAHRE,
  EINSPEISE_VERGUETUNG_DEFAULT_EUR_KWH,
  FOOTBALL_FIELDS_PER_HA,
} from "./constants";

describe("calculation constants", () => {
  it("exports a positive CO2_KG_PER_KWH_PV", () => {
    expect(typeof CO2_KG_PER_KWH_PV).toBe("number");
    expect(CO2_KG_PER_KWH_PV).toBeGreaterThan(0);
    expect(CO2_KG_PER_KWH_PV).toBeLessThan(2); // sanity ceiling
  });

  it("exports a positive provisional CO2_HA_MISCHWALD_PER_T_PER_YEAR", () => {
    expect(typeof CO2_HA_MISCHWALD_PER_T_PER_YEAR).toBe("number");
    expect(CO2_HA_MISCHWALD_PER_T_PER_YEAR).toBeGreaterThan(0);
    expect(CO2_HA_MISCHWALD_PER_T_PER_YEAR).toBeLessThan(1);
  });

  it("exports a positive FOOTBALL_FIELDS_PER_HA close to UEFA reference", () => {
    expect(typeof FOOTBALL_FIELDS_PER_HA).toBe("number");
    expect(FOOTBALL_FIELDS_PER_HA).toBeGreaterThan(0);
    expect(FOOTBALL_FIELDS_PER_HA).toBeLessThan(5);
  });

  it("exports DEFAULT_PACHT_EUR_PER_KWP as a positive integer matching SPEC §4.5", () => {
    expect(DEFAULT_PACHT_EUR_PER_KWP).toBe(100);
  });

  it("exports DEFAULT_VERTRAGSLAUFZEIT_JAHRE as 20 years", () => {
    expect(DEFAULT_VERTRAGSLAUFZEIT_JAHRE).toBe(20);
  });

  it("exports DEFAULT_SENSITIVITY_CT_KWH as the wizard's three defaults", () => {
    expect(DEFAULT_SENSITIVITY_CT_KWH).toEqual([35, 40, 45]);
  });

  it("exports a positive provisional EINSPEISE_VERGUETUNG_DEFAULT_EUR_KWH", () => {
    expect(typeof EINSPEISE_VERGUETUNG_DEFAULT_EUR_KWH).toBe("number");
    expect(EINSPEISE_VERGUETUNG_DEFAULT_EUR_KWH).toBeGreaterThan(0);
    expect(EINSPEISE_VERGUETUNG_DEFAULT_EUR_KWH).toBeLessThan(1);
  });

  it("constants are frozen-like immutables (readonly array)", () => {
    // Compile-time `as const` keeps DEFAULT_SENSITIVITY_CT_KWH as a
    // readonly tuple — runtime, JS arrays are not frozen by `as const`,
    // but the tuple shape is preserved. Verify length + ordering.
    expect(DEFAULT_SENSITIVITY_CT_KWH).toHaveLength(3);
    expect(DEFAULT_SENSITIVITY_CT_KWH[0]).toBe(35);
    expect(DEFAULT_SENSITIVITY_CT_KWH[1]).toBe(40);
    expect(DEFAULT_SENSITIVITY_CT_KWH[2]).toBe(45);
  });
});
