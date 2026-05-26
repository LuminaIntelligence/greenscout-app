/**
 * T-034 — TS parity test against the shared fixture JSON.
 *
 * Loads `services/python/tests/fixtures/calc-parity-fixtures.json`,
 * runs each `input` through the TS `composeAll()`, and asserts every
 * derived field matches the `expected` value within the per-class
 * tolerance documented in `docs/calc-sources.md`.
 *
 * The same JSON file is consumed by
 * `services/python/tests/test_parity.py`. When both suites are green,
 * both implementations produce the same `expected` for every fixture
 * within tolerance — that's "parity".
 *
 * To regenerate the fixtures (e.g. after a constants change):
 *
 *   npx tsx scripts/generate-calc-parity-fixtures.mjs
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { composeAll } from "./index";
import type { DerivedValues, StudyCalcInput } from "./types";

interface ParityFixture {
  name: string;
  input: StudyCalcInput;
  expected: DerivedValues;
}

interface ParityFile {
  description: string;
  toleranceMonetary: number;
  toleranceCo2: number;
  fixtures: ParityFixture[];
}

const fixtureFile: ParityFile = JSON.parse(
  readFileSync(
    resolve(__dirname, "../../../services/python/tests/fixtures/calc-parity-fixtures.json"),
    "utf-8",
  ),
);

/** Fields that flow through the monetary / energetic path. */
const MONETARY_FIELDS: ReadonlyArray<keyof DerivedValues> = [
  "ersparnisProJahr",
  "ersparnisProMonat",
  "ersparnis20Jahre",
  "pachtEinnahmeEinmalig",
  "gesamterzeugung20j",
  "gesamtvorteil",
];

/** Fields that flow through the CO₂ derivation chain. */
const CO2_FIELDS: ReadonlyArray<keyof DerivedValues> = [
  "co2TonnenProJahr",
  "co2HektarMischwald",
  "co2FussballfelderProJahr",
];

function within(actual: number, expected: number, tolerance: number): boolean {
  if (expected === 0) {
    return Math.abs(actual) <= tolerance;
  }
  return Math.abs(actual - expected) / Math.abs(expected) <= tolerance;
}

describe("T-034 parity — TS composeAll() vs shared fixtures", () => {
  it("loaded fixtures (sanity check)", () => {
    expect(fixtureFile.fixtures.length).toBeGreaterThanOrEqual(20);
    expect(fixtureFile.toleranceMonetary).toBe(1e-6);
    expect(fixtureFile.toleranceCo2).toBe(1e-4);
  });

  for (const fx of fixtureFile.fixtures) {
    it(`matches fixture ${fx.name}`, () => {
      const actual = composeAll(fx.input);
      for (const field of MONETARY_FIELDS) {
        expect(
          within(actual[field], fx.expected[field], fixtureFile.toleranceMonetary),
          `${field} drifted: actual=${actual[field]} expected=${fx.expected[field]}`,
        ).toBe(true);
      }
      for (const field of CO2_FIELDS) {
        expect(
          within(actual[field], fx.expected[field], fixtureFile.toleranceCo2),
          `${field} drifted: actual=${actual[field]} expected=${fx.expected[field]}`,
        ).toBe(true);
      }
    });
  }
});
