import { describe, expect, it } from "vitest";

import {
  buildObjectAddress,
  consultantFullName,
  customerDisplayName,
  formatCentPerKwh,
  formatDateDe,
  formatEur,
  formatEurNumber,
  formatFootballFields,
  formatHectares,
  formatIntegerDe,
  formatKwh,
  formatKwp,
  formatNumberDe2,
  formatPercent,
  formatTerminDe,
  formatTonnes,
} from "./format";

const NBSP = " ";

describe("formatEur", () => {
  it("formats integer values with two decimals + NBSP + €", () => {
    expect(formatEur(27500)).toBe(`27.500,00${NBSP}€`);
  });
  it("rounds to two decimals", () => {
    expect(formatEur(27500.123)).toBe(`27.500,12${NBSP}€`);
  });
  it("formats zero", () => {
    expect(formatEur(0)).toBe(`0,00${NBSP}€`);
  });
});

describe("formatEurNumber", () => {
  it("formats without €", () => {
    expect(formatEurNumber(27500)).toBe("27.500,00");
  });
});

describe("formatCentPerKwh", () => {
  it("always two decimals + NBSP + ct/kWh", () => {
    expect(formatCentPerKwh(22)).toBe(`22,00${NBSP}ct/kWh`);
    expect(formatCentPerKwh(35.5)).toBe(`35,50${NBSP}ct/kWh`);
  });
});

describe("formatNumberDe2 (Pivot-2c A3)", () => {
  it("two decimals, NO unit suffix", () => {
    expect(formatNumberDe2(22)).toBe("22,00");
    expect(formatNumberDe2(35.5)).toBe("35,50");
    expect(formatNumberDe2(1234.567)).toBe("1.234,57");
  });
  it("formats zero", () => {
    expect(formatNumberDe2(0)).toBe("0,00");
  });
});

describe("formatIntegerDe", () => {
  it("German thousands separator with no decimals", () => {
    expect(formatIntegerDe(1234)).toBe("1.234");
    expect(formatIntegerDe(1234567)).toBe("1.234.567");
  });
  it("rounds to whole", () => {
    expect(formatIntegerDe(1234.6)).toBe("1.235");
  });
});

describe("formatKwp", () => {
  it("integers get no decimals", () => {
    expect(formatKwp(500)).toBe(`500${NBSP}kWp`);
  });
  it("non-integers get two decimals", () => {
    expect(formatKwp(257.12)).toBe(`257,12${NBSP}kWp`);
  });
});

describe("formatKwh", () => {
  it("integer kWh with thousands sep + NBSP + kWh", () => {
    expect(formatKwh(236000)).toBe(`236.000${NBSP}kWh`);
  });
});

describe("formatPercent", () => {
  it("integer percent + NBSP + %", () => {
    expect(formatPercent(41)).toBe(`41${NBSP}%`);
  });
});

describe("formatTonnes", () => {
  it("integer tonnes + NBSP + t", () => {
    expect(formatTonnes(110)).toBe(`110${NBSP}t`);
  });
});

describe("formatHectares", () => {
  it("integer ha + NBSP + ha", () => {
    expect(formatHectares(39)).toBe(`39${NBSP}ha`);
  });
});

describe("formatFootballFields", () => {
  it("plain integer with thousands sep", () => {
    expect(formatFootballFields(50)).toBe("50");
    expect(formatFootballFields(1000)).toBe("1.000");
  });
});

describe("formatDateDe", () => {
  it("formats DD.MM.YYYY", () => {
    expect(formatDateDe(new Date("2026-03-15T00:00:00.000"))).toBe("15.03.2026");
  });
  it("returns empty for null", () => {
    expect(formatDateDe(null)).toBe("");
    expect(formatDateDe(undefined)).toBe("");
  });
});

describe("formatTerminDe", () => {
  it("formats `am DD.MM.YYYY um HH:mm Uhr`", () => {
    const date = new Date(2026, 2, 15, 14, 0); // local time
    expect(formatTerminDe(date)).toBe("am 15.03.2026 um 14:00 Uhr");
  });
  it("returns empty for null/undefined", () => {
    expect(formatTerminDe(null)).toBe("");
    expect(formatTerminDe(undefined)).toBe("");
  });
});

describe("buildObjectAddress", () => {
  it("joins name + street + zip + city with comma+space", () => {
    expect(buildObjectAddress("Linzgau Center", "Bergwaldstraße 4", "88630", "Pfullendorf")).toBe(
      "Linzgau Center, Bergwaldstraße 4, 88630 Pfullendorf",
    );
  });
});

describe("customerDisplayName", () => {
  it("prefers companyName when set", () => {
    expect(
      customerDisplayName({
        companyName: "ACME GmbH",
        contactFirstName: "Max",
        contactLastName: "Mustermann",
      }),
    ).toBe("ACME GmbH");
  });
  it("falls back to firstName + lastName when company is null", () => {
    expect(
      customerDisplayName({
        companyName: null,
        contactFirstName: "Max",
        contactLastName: "Mustermann",
      }),
    ).toBe("Max Mustermann");
  });
  it("falls back when companyName is blank whitespace", () => {
    expect(
      customerDisplayName({
        companyName: "   ",
        contactFirstName: "Max",
        contactLastName: "Mustermann",
      }),
    ).toBe("Max Mustermann");
  });
});

describe("consultantFullName", () => {
  it("joins firstName + lastName", () => {
    expect(
      consultantFullName({ firstName: "Bernd", lastName: "Berater", email: "b@example.com" }),
    ).toBe("Bernd Berater");
  });
  it("falls back to email when both names are blank", () => {
    expect(consultantFullName({ firstName: "", lastName: "", email: "fallback@example.com" })).toBe(
      "fallback@example.com",
    );
  });
});
