import { describe, expect, it } from "vitest";

import { makeFixtureStudyDocumentData } from "./study-document-data.fixture";

describe("makeFixtureStudyDocumentData", () => {
  it("returns a sensible Linzgau-Center bundle", () => {
    const d = makeFixtureStudyDocumentData();
    expect(d.customer.contactLastName).toBe("Smolka");
    expect(d.study.objectName).toBe("Einkaufszentrum Linzgau Center");
    expect(d.consultant.firstName).toBe("Bernd");
    // composeAll calls follow the same calc as the live preview
    // ersparnis = (0.35 − 0.22) × 164000
    expect(d.derived.ersparnisProJahr).toBeCloseTo(0.13 * 164000, 1);
    // pacht = 500 × 100 = 50000 (SPEC §4.7 one-shot)
    expect(d.derived.pachtEinnahmeEinmalig).toBe(50000);
  });

  it("respects overrides", () => {
    const d = makeFixtureStudyDocumentData({
      images: { beforeUrl: "/x", afterUrl: "/y" },
    });
    expect(d.images.beforeUrl).toBe("/x");
    expect(d.images.afterUrl).toBe("/y");
  });
});
