import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { makeFixtureStudyDocumentData } from "../__fixtures__/study-document-data.fixture";

import Slide01Cover from "./slide-01-cover";
import Slide02Glueckwunsch from "./slide-02-glueckwunsch";
import Slide03DreiVorteile from "./slide-03-drei-vorteile";
import Slide04AufEinenBlick from "./slide-04-auf-einen-blick";
import Slide05VorherNachher from "./slide-05-vorher-nachher";
import Slide06Mission from "./slide-06-mission";
import Slide07Partner from "./slide-07-partner";
import Slide08Zusammenarbeit from "./slide-08-zusammenarbeit";
import Slide09Ausgangssituation from "./slide-09-ausgangssituation";
import Slide10PVAnlagenkonzept from "./slide-10-pv-anlagenkonzept";
import Slide11Energiefluss from "./slide-11-energiefluss";
import Slide12Stromliefervertrag from "./slide-12-stromliefervertrag";
import Slide13Langfristig from "./slide-13-langfristig";
import Slide14Vergleich from "./slide-14-vergleich";
import Slide15Sensitivitaet from "./slide-15-sensitivitaet";
import Slide16Variantenvergleich from "./slide-16-variantenvergleich";
import Slide17Timeline from "./slide-17-timeline";
import Slide18EEG from "./slide-18-eeg";
import Slide19Kontakt from "./slide-19-kontakt";

/**
 * §7.10-Pivot PR 2 — Smoke tests for every slide component.
 *
 * Each slide gets:
 *   - render-without-crash check,
 *   - one or two `expect(content).toContain(...)` assertions against
 *     the fixture data so a future refactor that drops a key field
 *     surfaces immediately.
 *
 * Tests use the shared fixture (`makeFixtureStudyDocumentData()`) so
 * the assertions track the "Linzgau Center" example deck used in the
 * original PPTX, and the fixture survives a single edit if SPEC fields
 * grow.
 */

const data = makeFixtureStudyDocumentData();

describe("Slide01Cover", () => {
  it("renders the customer display name", () => {
    const { container } = render(<Slide01Cover data={data} />);
    expect(container.textContent).toContain("Einkaufszentrum Linzgau Center GmbH");
    expect(container.textContent).toContain("Bernd Berater");
    expect(container.querySelector('[data-slide-number="1"]')).not.toBeNull();
  });
});

describe("Slide02Glueckwunsch", () => {
  it("renders object address with flurstueck", () => {
    const { container } = render(<Slide02Glueckwunsch data={data} />);
    expect(container.textContent).toContain("Bergwaldstraße 4");
    expect(container.textContent).toContain("Flurstück 78.10");
  });

  it("omits flurstueck phrase when blank", () => {
    const empty = makeFixtureStudyDocumentData({
      study: { ...data.study, flurstueck: "" },
    });
    const { container } = render(<Slide02Glueckwunsch data={empty} />);
    expect(container.textContent).not.toContain("in Flurstück");
  });
});

describe("Slide03DreiVorteile", () => {
  it("renders pacht + ersparnis values", () => {
    const { container } = render(<Slide03DreiVorteile data={data} />);
    // pacht einmalig = 500 kWp × 100 €/kWp = 50.000 €
    expect(container.textContent).toContain("50.000,00");
  });
});

describe("Slide04AufEinenBlick", () => {
  it("renders headline KPIs and CO2 block", () => {
    const { container } = render(<Slide04AufEinenBlick data={data} />);
    expect(container.textContent).toContain("500"); // anlageKwp
    expect(container.textContent).toContain("41"); // eigenverbrauchsquote
    expect(container.textContent).toContain("Klimabilanz");
  });
});

describe("Slide05VorherNachher", () => {
  it("renders BEFORE/AFTER placeholders when images are null", () => {
    const { container } = render(<Slide05VorherNachher data={data} />);
    expect(container.textContent).toContain("Vorher-Bild fehlt");
    expect(container.textContent).toContain("Nachher-Bild fehlt");
  });

  it("renders <img> tags when image URLs are present", () => {
    const withImages = makeFixtureStudyDocumentData({
      images: { beforeUrl: "/api/uploads/before-id", afterUrl: "/api/uploads/after-id" },
    });
    const { container } = render(<Slide05VorherNachher data={withImages} />);
    const imgs = container.querySelectorAll("img");
    expect(imgs.length).toBe(2);
    expect(imgs[0].getAttribute("src")).toBe("/api/uploads/before-id");
    expect(imgs[1].getAttribute("src")).toBe("/api/uploads/after-id");
  });
});

describe("Slide06Mission", () => {
  it("renders mission cards", () => {
    const { container } = render(<Slide06Mission data={data} />);
    expect(container.textContent).toContain("Mission");
  });
});

describe("Slide07Partner", () => {
  it("renders partner blocks", () => {
    const { container } = render(<Slide07Partner data={data} />);
    expect(container.textContent).toContain("Strategischer Partner");
  });
});

describe("Slide08Zusammenarbeit", () => {
  it("renders three reasons", () => {
    const { container } = render(<Slide08Zusammenarbeit data={data} />);
    expect(container.textContent).toContain("01");
    expect(container.textContent).toContain("02");
    expect(container.textContent).toContain("03");
  });
});

describe("Slide09Ausgangssituation", () => {
  it("renders versorger ct and three sums", () => {
    const { container } = render(<Slide09Ausgangssituation data={data} />);
    expect(container.textContent).toContain("35,00");
    expect(container.textContent).toContain("Pachteinnahmen");
  });
});

describe("Slide10PVAnlagenkonzept", () => {
  it("renders modul info phrase with all three segments", () => {
    const { container } = render(<Slide10PVAnlagenkonzept data={data} />);
    expect(container.textContent).toContain("500");
    expect(container.textContent).toContain("1.428");
    expect(container.textContent).toContain("2.856");
  });

  it("collapses modul phrase when optional fields are null", () => {
    const minimal = makeFixtureStudyDocumentData({
      study: { ...data.study, modulAnzahl: null, modulFlaecheM2: null },
    });
    const { container } = render(<Slide10PVAnlagenkonzept data={minimal} />);
    expect(container.textContent).not.toContain("Module,");
  });
});

describe("Slide11Energiefluss", () => {
  it("renders the three flow phases", () => {
    const { container } = render(<Slide11Energiefluss data={data} />);
    expect(container.textContent).toContain("Erzeugung");
    expect(container.textContent).toContain("Eigenverbrauch");
    expect(container.textContent).toContain("Netzeinspeisung");
  });

  it("renders placeholder when netzeinspeisung is null", () => {
    const minimal = makeFixtureStudyDocumentData({
      study: { ...data.study, netzeinspeisungKwhJahr: null },
    });
    const { container } = render(<Slide11Energiefluss data={minimal} />);
    expect(container.textContent).toContain("Netzeinspeisung");
  });
});

describe("Slide12Stromliefervertrag", () => {
  it("renders pv vs netz preis", () => {
    const { container } = render(<Slide12Stromliefervertrag data={data} />);
    expect(container.textContent).toContain("22,00");
    expect(container.textContent).toContain("35,00");
  });
});

describe("Slide13Langfristig", () => {
  it("renders the four bilanz rows with highlight on gesamtvorteil", () => {
    const { container } = render(<Slide13Langfristig data={data} />);
    expect(container.textContent).toContain("Gesamter wirtschaftlicher Vorteil");
    expect(container.textContent).toContain("über 20 Jahre");
  });
});

describe("Slide14Vergleich", () => {
  it("renders mit/ohne pv comparison", () => {
    const { container } = render(<Slide14Vergleich data={data} />);
    expect(container.textContent).toContain("Ohne PV");
    expect(container.textContent).toContain("Mit PV");
    expect(container.textContent).toContain("22,00");
  });
});

describe("Slide15Sensitivitaet", () => {
  it("renders three szenarios + SVG chart", () => {
    const { container } = render(<Slide15Sensitivitaet data={data} />);
    expect(container.textContent).toContain("Basis");
    expect(container.textContent).toContain("Moderat");
    expect(container.textContent).toContain("Hoch");
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    const bars = container.querySelectorAll("rect");
    expect(bars.length).toBe(3);
  });
});

describe("Slide16Variantenvergleich", () => {
  it("renders both variants with grid-auto-rows", () => {
    const { container } = render(<Slide16Variantenvergleich data={data} />);
    expect(container.textContent).toContain("Variante A");
    expect(container.textContent).toContain("Variante B");
    const grid = container.querySelector('[style*="repeat(2"]');
    expect(grid).not.toBeNull();
  });
});

describe("Slide17Timeline", () => {
  it("renders 6 timeline cells in a 6-column grid with grid-auto-rows: 1fr", () => {
    const { container } = render(<Slide17Timeline data={data} />);
    const grid = container.querySelector('[style*="repeat(6"]');
    expect(grid).not.toBeNull();
    expect((grid as HTMLElement | null)?.style.gridAutoRows).toBe("1fr");
    // 6 cells × <h4>
    const headings = container.querySelectorAll("h4");
    expect(headings.length).toBeGreaterThanOrEqual(6);
  });
});

describe("Slide18EEG", () => {
  it("renders the EEG slide", () => {
    const { container } = render(<Slide18EEG data={data} />);
    expect(container.textContent).toContain("Erneuerbare-Energien-Gesetz");
  });
});

describe("Slide19Kontakt", () => {
  it("renders both termine when set", () => {
    const { container } = render(<Slide19Kontakt data={data} />);
    expect(container.textContent).toContain("1)");
    expect(container.textContent).toContain("2)");
    expect(container.textContent).toContain("oder");
    expect(container.textContent).toContain("+49 172 3794240");
  });

  it("renders placeholder when both termine are null", () => {
    const noTermine = makeFixtureStudyDocumentData({
      study: {
        ...data.study,
        terminVorschlag1: null,
        terminVorschlag2: null,
      },
    });
    const { container } = render(<Slide19Kontakt data={noTermine} />);
    expect(container.textContent).toContain("Termin auf Anfrage");
    expect(container.textContent).not.toContain("oder");
  });
});
