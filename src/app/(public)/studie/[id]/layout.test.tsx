/**
 * §7.10-Pivot PR 4 — Layout-Smoke-Tests für die Kunden-Online-Ansicht.
 *
 * Verifiziert:
 *   - `metadata.robots` ist auf `noindex, nofollow` gesetzt (defense-in-
 *     depth, verhindert Suchmaschinen-Indexierung).
 *   - Layout rendert die Kinder + Footer mit Copyright und „GreenScout"-
 *     Brand-Marker.
 */

import { describe, expect, it } from "vitest";

import PublicStudyLayout, { metadata } from "./layout";

describe("PublicStudyLayout", () => {
  it("declares robots noindex+nofollow in the page metadata", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("renders the children inside the document container", () => {
    const out = PublicStudyLayout({
      children: "PUBLIC_CHILDREN_MARKER",
    });
    const html = JSON.stringify(out);
    expect(html).toContain("study-document-root");
    expect(html).toContain("PUBLIC_CHILDREN_MARKER");
    expect(html).toContain("GreenScout");
    expect(html).toContain("© GreenScout 2026");
  });
});
