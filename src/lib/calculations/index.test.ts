/**
 * T-032 — Tests for the TypeScript calculation module.
 *
 * Coverage discipline: every function + every branch (CO₂ override
 * on/off + missing override values) must be hit. Parity with the
 * Python mirror is enforced separately by `parity.test.ts` (T-034).
 */

import { describe, expect, it } from "vitest";

import {
  co2FussballfelderProJahr,
  co2HektarMischwald,
  co2TonnenProJahr,
  composeAll,
  ersparnisGesamtVertragslaufzeit,
  ersparnisProJahr,
  ersparnisProMonat,
  gesamterzeugungVertragslaufzeit,
  gesamtvorteil,
  pachtEinnahmeEinmalig,
} from "./index";
import type { StudyCalcInput } from "./types";

/** Baseline realistic study input — small commercial roof, mid-sized PV. */
function makeInput(overrides: Partial<StudyCalcInput> = {}): StudyCalcInput {
  return {
    anlageKwp: 100,
    pvErzeugungKwhJahr: 95_000,
    pvEigenverbrauchKwhJahr: 40_000,
    pvVerkaufEurKwh: 0.08,
    verbrauchKwhJahr: 60_000,
    versorgerPreisEurKwh: 0.4,
    pachtEurProKwp: 100,
    vertragslaufzeitJahre: 20,
    co2Override: false,
    ...overrides,
  };
}

describe("ersparnisProJahr", () => {
  it("computes (versorger - verkauf) * eigenverbrauch", () => {
    expect(ersparnisProJahr(makeInput())).toBeCloseTo(12_800, 6);
  });

  it("returns zero when eigenverbrauch is zero", () => {
    expect(ersparnisProJahr(makeInput({ pvEigenverbrauchKwhJahr: 0 }))).toBe(0);
  });

  it("can go negative when verkauf > versorger (pathological but defined)", () => {
    expect(
      ersparnisProJahr(makeInput({ versorgerPreisEurKwh: 0.05, pvVerkaufEurKwh: 0.1 })),
    ).toBeCloseTo(-2_000, 6);
  });
});

describe("ersparnisProMonat", () => {
  it("is ersparnisProJahr / 12", () => {
    expect(ersparnisProMonat(makeInput())).toBeCloseTo(12_800 / 12, 6);
  });
});

describe("ersparnisGesamtVertragslaufzeit", () => {
  it("uses vertragslaufzeitJahre as the multiplier", () => {
    expect(ersparnisGesamtVertragslaufzeit(makeInput())).toBeCloseTo(12_800 * 20, 6);
  });

  it("scales with non-default contract duration", () => {
    expect(ersparnisGesamtVertragslaufzeit(makeInput({ vertragslaufzeitJahre: 15 }))).toBeCloseTo(
      12_800 * 15,
      6,
    );
  });
});

describe("pachtEinnahmeEinmalig", () => {
  it("is anlageKwp * pachtEurProKwp * vertragslaufzeitJahre", () => {
    expect(pachtEinnahmeEinmalig(makeInput())).toBeCloseTo(100 * 100 * 20, 6);
  });

  it("collapses to zero when pacht is zero", () => {
    expect(pachtEinnahmeEinmalig(makeInput({ pachtEurProKwp: 0 }))).toBe(0);
  });
});

describe("gesamterzeugungVertragslaufzeit", () => {
  it("is pvErzeugung * vertragslaufzeitJahre", () => {
    expect(gesamterzeugungVertragslaufzeit(makeInput())).toBeCloseTo(95_000 * 20, 6);
  });
});

describe("gesamtvorteil", () => {
  it("sums ersparnisGesamtVertragslaufzeit + pachtEinnahmeEinmalig", () => {
    expect(gesamtvorteil(makeInput())).toBeCloseTo(12_800 * 20 + 100 * 100 * 20, 6);
  });
});

describe("co2TonnenProJahr", () => {
  it("computes pvErzeugung * 0.474 / 1000 when override is off", () => {
    expect(co2TonnenProJahr(makeInput())).toBeCloseTo((95_000 * 0.474) / 1000, 6);
  });

  it("honours override value when co2Override is true", () => {
    expect(co2TonnenProJahr(makeInput({ co2Override: true, co2TonnenProJahrOverride: 99 }))).toBe(
      99,
    );
  });

  it("falls back to compute when co2Override is true but value is missing", () => {
    expect(co2TonnenProJahr(makeInput({ co2Override: true }))).toBeCloseTo(
      (95_000 * 0.474) / 1000,
      6,
    );
  });
});

describe("co2HektarMischwald", () => {
  it("is co2TonnenProJahr * 0.0177 when override is off", () => {
    const expected = ((95_000 * 0.474) / 1000) * 0.0177;
    expect(co2HektarMischwald(makeInput())).toBeCloseTo(expected, 6);
  });

  it("honours override value when co2Override is true", () => {
    expect(
      co2HektarMischwald(makeInput({ co2Override: true, co2HektarMischwaldOverride: 12 })),
    ).toBe(12);
  });

  it("falls back to compute when co2Override is true but value is missing", () => {
    const expected = ((95_000 * 0.474) / 1000) * 0.0177;
    expect(co2HektarMischwald(makeInput({ co2Override: true }))).toBeCloseTo(expected, 6);
  });
});

describe("co2FussballfelderProJahr", () => {
  it("is co2HektarMischwald * 1.28 when override is off", () => {
    const expected = ((95_000 * 0.474) / 1000) * 0.0177 * 1.28;
    expect(co2FussballfelderProJahr(makeInput())).toBeCloseTo(expected, 6);
  });

  it("honours override value when co2Override is true", () => {
    expect(
      co2FussballfelderProJahr(
        makeInput({ co2Override: true, co2FussballfelderProJahrOverride: 7 }),
      ),
    ).toBe(7);
  });

  it("falls back to compute when co2Override is true but value is missing", () => {
    const expected = ((95_000 * 0.474) / 1000) * 0.0177 * 1.28;
    expect(co2FussballfelderProJahr(makeInput({ co2Override: true }))).toBeCloseTo(expected, 6);
  });
});

describe("composeAll", () => {
  it("returns every DerivedValues field for a baseline input", () => {
    const derived = composeAll(makeInput());
    expect(derived).toMatchObject({
      ersparnisProJahr: expect.any(Number),
      ersparnisProMonat: expect.any(Number),
      ersparnis20Jahre: expect.any(Number),
      pachtEinnahmeEinmalig: expect.any(Number),
      gesamterzeugung20j: expect.any(Number),
      gesamtvorteil: expect.any(Number),
      co2TonnenProJahr: expect.any(Number),
      co2HektarMischwald: expect.any(Number),
      co2FussballfelderProJahr: expect.any(Number),
    });
  });

  it("snapshot of a representative input (regression guard)", () => {
    // Snapshot uses round numbers to defend against floating-point drift.
    expect(composeAll(makeInput())).toEqual({
      ersparnisProJahr: 12_800,
      ersparnisProMonat: 12_800 / 12,
      ersparnis20Jahre: 256_000,
      pachtEinnahmeEinmalig: 200_000,
      gesamterzeugung20j: 1_900_000,
      gesamtvorteil: 456_000,
      co2TonnenProJahr: (95_000 * 0.474) / 1000,
      co2HektarMischwald: ((95_000 * 0.474) / 1000) * 0.0177,
      co2FussballfelderProJahr: ((95_000 * 0.474) / 1000) * 0.0177 * 1.28,
    });
  });

  it("composeAll propagates all three CO₂ overrides when active", () => {
    const derived = composeAll(
      makeInput({
        co2Override: true,
        co2TonnenProJahrOverride: 50,
        co2HektarMischwaldOverride: 1,
        co2FussballfelderProJahrOverride: 2,
      }),
    );
    expect(derived.co2TonnenProJahr).toBe(50);
    expect(derived.co2HektarMischwald).toBe(1);
    expect(derived.co2FussballfelderProJahr).toBe(2);
  });

  it("handles the all-zero edge case without divide-by-zero", () => {
    const derived = composeAll(
      makeInput({
        anlageKwp: 0,
        pvErzeugungKwhJahr: 0,
        pvEigenverbrauchKwhJahr: 0,
        pvVerkaufEurKwh: 0,
        verbrauchKwhJahr: 0,
        versorgerPreisEurKwh: 0,
        pachtEurProKwp: 0,
      }),
    );
    expect(derived.ersparnisProJahr).toBe(0);
    expect(derived.ersparnisProMonat).toBe(0);
    expect(derived.gesamtvorteil).toBe(0);
    expect(derived.co2TonnenProJahr).toBe(0);
  });
});
