// scripts/generate-calc-parity-fixtures.mjs
//
// T-034 — One-off fixture generator. Produces parity expectations by
// running the TS calculation module against a curated input set. The
// JSON output is the shared parity fixture for both the Vitest and
// pytest parity suites.
//
// Re-run when constants or formulas change:
//   npx tsx scripts/generate-calc-parity-fixtures.mjs
//
// TS is the source of truth here for the `expected` values; if pytest
// disagrees with the JSON, the Python implementation has drifted.

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

// The `scripts/` folder is whitelisted in eslint.config.mjs for the
// `no-restricted-imports` rule so this `../src/...` relative import
// stays clean — the @/* alias isn't configured for node-side tsx
// execution.
import { composeAll } from "../src/lib/calculations/index.ts";

const inputs = [
  // 1 — baseline mid-sized commercial PV.
  {
    name: "baseline-mid-commercial",
    input: {
      anlageKwp: 100,
      pvErzeugungKwhJahr: 95000,
      pvEigenverbrauchKwhJahr: 40000,
      pvVerkaufEurKwh: 0.08,
      verbrauchKwhJahr: 60000,
      versorgerPreisEurKwh: 0.4,
      pachtEurProKwp: 100,
      vertragslaufzeitJahre: 20,
      co2Override: false,
    },
  },
  // 2 — small residential PV.
  {
    name: "small-residential",
    input: {
      anlageKwp: 10,
      pvErzeugungKwhJahr: 9500,
      pvEigenverbrauchKwhJahr: 3800,
      pvVerkaufEurKwh: 0.082,
      verbrauchKwhJahr: 4500,
      versorgerPreisEurKwh: 0.38,
      pachtEurProKwp: 80,
      vertragslaufzeitJahre: 20,
      co2Override: false,
    },
  },
  // 3 — large industrial PV.
  {
    name: "large-industrial",
    input: {
      anlageKwp: 750,
      pvErzeugungKwhJahr: 712500,
      pvEigenverbrauchKwhJahr: 425000,
      pvVerkaufEurKwh: 0.065,
      verbrauchKwhJahr: 580000,
      versorgerPreisEurKwh: 0.32,
      pachtEurProKwp: 120,
      vertragslaufzeitJahre: 20,
      co2Override: false,
    },
  },
  // 4 — high-eigenverbrauch (90%).
  {
    name: "high-eigenverbrauch",
    input: {
      anlageKwp: 50,
      pvErzeugungKwhJahr: 47500,
      pvEigenverbrauchKwhJahr: 42750,
      pvVerkaufEurKwh: 0.085,
      verbrauchKwhJahr: 55000,
      versorgerPreisEurKwh: 0.45,
      pachtEurProKwp: 100,
      vertragslaufzeitJahre: 20,
      co2Override: false,
    },
  },
  // 5 — zero eigenverbrauch (100% feed-in).
  {
    name: "zero-eigenverbrauch",
    input: {
      anlageKwp: 200,
      pvErzeugungKwhJahr: 190000,
      pvEigenverbrauchKwhJahr: 0,
      pvVerkaufEurKwh: 0.075,
      verbrauchKwhJahr: 0,
      versorgerPreisEurKwh: 0.35,
      pachtEurProKwp: 100,
      vertragslaufzeitJahre: 20,
      co2Override: false,
    },
  },
  // 6 — zero pacht.
  {
    name: "zero-pacht",
    input: {
      anlageKwp: 100,
      pvErzeugungKwhJahr: 95000,
      pvEigenverbrauchKwhJahr: 40000,
      pvVerkaufEurKwh: 0.08,
      verbrauchKwhJahr: 60000,
      versorgerPreisEurKwh: 0.4,
      pachtEurProKwp: 0,
      vertragslaufzeitJahre: 20,
      co2Override: false,
    },
  },
  // 7 — non-standard contract duration (15 years).
  {
    name: "fifteen-year-contract",
    input: {
      anlageKwp: 100,
      pvErzeugungKwhJahr: 95000,
      pvEigenverbrauchKwhJahr: 40000,
      pvVerkaufEurKwh: 0.08,
      verbrauchKwhJahr: 60000,
      versorgerPreisEurKwh: 0.4,
      pachtEurProKwp: 100,
      vertragslaufzeitJahre: 15,
      co2Override: false,
    },
  },
  // 8 — non-standard contract duration (25 years).
  {
    name: "twenty-five-year-contract",
    input: {
      anlageKwp: 100,
      pvErzeugungKwhJahr: 95000,
      pvEigenverbrauchKwhJahr: 40000,
      pvVerkaufEurKwh: 0.08,
      verbrauchKwhJahr: 60000,
      versorgerPreisEurKwh: 0.4,
      pachtEurProKwp: 100,
      vertragslaufzeitJahre: 25,
      co2Override: false,
    },
  },
  // 9 — sensitivity scenario S1 at 35 ct/kWh.
  {
    name: "sensitivity-35-ct",
    input: {
      anlageKwp: 100,
      pvErzeugungKwhJahr: 95000,
      pvEigenverbrauchKwhJahr: 40000,
      pvVerkaufEurKwh: 0.08,
      verbrauchKwhJahr: 60000,
      versorgerPreisEurKwh: 0.35,
      pachtEurProKwp: 100,
      vertragslaufzeitJahre: 20,
      co2Override: false,
    },
  },
  // 10 — sensitivity scenario S2 at 40 ct/kWh.
  {
    name: "sensitivity-40-ct",
    input: {
      anlageKwp: 100,
      pvErzeugungKwhJahr: 95000,
      pvEigenverbrauchKwhJahr: 40000,
      pvVerkaufEurKwh: 0.08,
      verbrauchKwhJahr: 60000,
      versorgerPreisEurKwh: 0.4,
      pachtEurProKwp: 100,
      vertragslaufzeitJahre: 20,
      co2Override: false,
    },
  },
  // 11 — sensitivity scenario S3 at 45 ct/kWh.
  {
    name: "sensitivity-45-ct",
    input: {
      anlageKwp: 100,
      pvErzeugungKwhJahr: 95000,
      pvEigenverbrauchKwhJahr: 40000,
      pvVerkaufEurKwh: 0.08,
      verbrauchKwhJahr: 60000,
      versorgerPreisEurKwh: 0.45,
      pachtEurProKwp: 100,
      vertragslaufzeitJahre: 20,
      co2Override: false,
    },
  },
  // 12 — verkauf > versorger (pathological loss case).
  {
    name: "verkauf-greater-than-versorger",
    input: {
      anlageKwp: 100,
      pvErzeugungKwhJahr: 95000,
      pvEigenverbrauchKwhJahr: 40000,
      pvVerkaufEurKwh: 0.5,
      verbrauchKwhJahr: 60000,
      versorgerPreisEurKwh: 0.3,
      pachtEurProKwp: 100,
      vertragslaufzeitJahre: 20,
      co2Override: false,
    },
  },
  // 13 — co2Override on with all three values.
  {
    name: "co2-override-all-three",
    input: {
      anlageKwp: 100,
      pvErzeugungKwhJahr: 95000,
      pvEigenverbrauchKwhJahr: 40000,
      pvVerkaufEurKwh: 0.08,
      verbrauchKwhJahr: 60000,
      versorgerPreisEurKwh: 0.4,
      pachtEurProKwp: 100,
      vertragslaufzeitJahre: 20,
      co2Override: true,
      co2TonnenProJahrOverride: 50,
      co2HektarMischwaldOverride: 0.9,
      co2FussballfelderProJahrOverride: 1.15,
    },
  },
  // 14 — co2Override on with tonnen only (others fall back to compute).
  {
    name: "co2-override-tonnen-only",
    input: {
      anlageKwp: 100,
      pvErzeugungKwhJahr: 95000,
      pvEigenverbrauchKwhJahr: 40000,
      pvVerkaufEurKwh: 0.08,
      verbrauchKwhJahr: 60000,
      versorgerPreisEurKwh: 0.4,
      pachtEurProKwp: 100,
      vertragslaufzeitJahre: 20,
      co2Override: true,
      co2TonnenProJahrOverride: 60,
    },
  },
  // 15 — co2Override on but no override values (all fall back).
  {
    name: "co2-override-no-values",
    input: {
      anlageKwp: 100,
      pvErzeugungKwhJahr: 95000,
      pvEigenverbrauchKwhJahr: 40000,
      pvVerkaufEurKwh: 0.08,
      verbrauchKwhJahr: 60000,
      versorgerPreisEurKwh: 0.4,
      pachtEurProKwp: 100,
      vertragslaufzeitJahre: 20,
      co2Override: true,
    },
  },
  // 16 — decimal-heavy values (test Decimal precision path).
  {
    name: "decimal-heavy",
    input: {
      anlageKwp: 123.45,
      pvErzeugungKwhJahr: 117450.5,
      pvEigenverbrauchKwhJahr: 50125.75,
      pvVerkaufEurKwh: 0.0825,
      verbrauchKwhJahr: 70250.5,
      versorgerPreisEurKwh: 0.4125,
      pachtEurProKwp: 95.5,
      vertragslaufzeitJahre: 20,
      co2Override: false,
    },
  },
  // 17 — extreme small (1 kWp residential).
  {
    name: "extreme-small-1kwp",
    input: {
      anlageKwp: 1,
      pvErzeugungKwhJahr: 950,
      pvEigenverbrauchKwhJahr: 600,
      pvVerkaufEurKwh: 0.082,
      verbrauchKwhJahr: 3500,
      versorgerPreisEurKwh: 0.42,
      pachtEurProKwp: 100,
      vertragslaufzeitJahre: 20,
      co2Override: false,
    },
  },
  // 18 — extreme large (2000 kWp commercial).
  {
    name: "extreme-large-2000kwp",
    input: {
      anlageKwp: 2000,
      pvErzeugungKwhJahr: 1900000,
      pvEigenverbrauchKwhJahr: 850000,
      pvVerkaufEurKwh: 0.055,
      verbrauchKwhJahr: 1200000,
      versorgerPreisEurKwh: 0.28,
      pachtEurProKwp: 130,
      vertragslaufzeitJahre: 20,
      co2Override: false,
    },
  },
  // 19 — all-zero edge case (vertragslaufzeit = 1 for schema validity).
  {
    name: "all-zero",
    input: {
      anlageKwp: 0,
      pvErzeugungKwhJahr: 0,
      pvEigenverbrauchKwhJahr: 0,
      pvVerkaufEurKwh: 0,
      verbrauchKwhJahr: 0,
      versorgerPreisEurKwh: 0,
      pachtEurProKwp: 0,
      vertragslaufzeitJahre: 1,
      co2Override: false,
    },
  },
  // 20 — equal eigenverbrauch == erzeugung (every kWh self-consumed).
  {
    name: "all-self-consumed",
    input: {
      anlageKwp: 80,
      pvErzeugungKwhJahr: 76000,
      pvEigenverbrauchKwhJahr: 76000,
      pvVerkaufEurKwh: 0.08,
      verbrauchKwhJahr: 95000,
      versorgerPreisEurKwh: 0.4,
      pachtEurProKwp: 100,
      vertragslaufzeitJahre: 20,
      co2Override: false,
    },
  },
  // 21 — high pacht (200 EUR/kWp).
  {
    name: "high-pacht-200",
    input: {
      anlageKwp: 100,
      pvErzeugungKwhJahr: 95000,
      pvEigenverbrauchKwhJahr: 40000,
      pvVerkaufEurKwh: 0.08,
      verbrauchKwhJahr: 60000,
      versorgerPreisEurKwh: 0.4,
      pachtEurProKwp: 200,
      vertragslaufzeitJahre: 20,
      co2Override: false,
    },
  },
  // 22 — realistic Berater-typical entry.
  {
    name: "realistic-typical",
    input: {
      anlageKwp: 250,
      pvErzeugungKwhJahr: 237500,
      pvEigenverbrauchKwhJahr: 95000,
      pvVerkaufEurKwh: 0.078,
      verbrauchKwhJahr: 140000,
      versorgerPreisEurKwh: 0.41,
      pachtEurProKwp: 100,
      vertragslaufzeitJahre: 20,
      co2Override: false,
    },
  },
  // 23 — §7.7 pacht-formula regression: 500 kWp × 100 €/kWp = 50.000 € (NOT 1.000.000 €).
  // Verbatim the example the user confirmed on 2026-05-27 — if anyone
  // re-introduces the erroneous `× vertragslaufzeitJahre` factor, this
  // fixture breaks parity with `expected 50000, got 1000000`.
  // See DECISIONS 2026-05-27 §7.7 Pacht-Formel User-Confirmed.
  {
    name: "pacht-formula-regression-500kwp",
    input: {
      anlageKwp: 500,
      pvErzeugungKwhJahr: 475_000,
      pvEigenverbrauchKwhJahr: 200_000,
      pvVerkaufEurKwh: 0.08,
      verbrauchKwhJahr: 400_000,
      versorgerPreisEurKwh: 0.35,
      pachtEurProKwp: 100,
      vertragslaufzeitJahre: 20,
      co2Override: false,
    },
  },
];

const fixtures = inputs.map(({ name, input }) => ({
  name,
  input,
  expected: composeAll(input),
}));

const out = {
  description:
    "T-034 — Calculation parity fixtures (TS = source of truth). " +
    "Both Vitest (src/lib/calculations/parity.test.ts) and pytest " +
    "(services/python/tests/test_parity.py) consume this file.",
  toleranceMonetary: 1e-6,
  toleranceCo2: 1e-4,
  fixtures,
};

const target = resolve("services/python/tests/fixtures/calc-parity-fixtures.json");
writeFileSync(target, JSON.stringify(out, null, 2) + "\n");
console.log("wrote", fixtures.length, "fixtures to", target);
