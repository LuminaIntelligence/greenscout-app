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
 * Pivot-2b — Smoke tests für jede Slide-Komponente.
 *
 * Diese Tests prüfen ausschließlich die WÖRTLICHEN PPTX-Texte (aus
 * `template-content.json`) sowie die dynamischen Werte aus der Fixture.
 * Jede Assertion zitiert direkt aus dem PPTX-Original — eine Drift im
 * Slide-Code (jemand "verbessert" eine Headline) lässt den Test rot
 * werden, was im Pivot-2b explizit gewünscht ist.
 */

const data = makeFixtureStudyDocumentData();

describe("Slide01Cover", () => {
  it("renders the cover headlines and consultant", () => {
    const { container } = render(<Slide01Cover data={data} />);
    expect(container.textContent).toContain(
      "Flächen bewerten, Entscheidung treffen, Einnahmen ohne eigene Investitionen",
    );
    expect(container.textContent).toContain("Ihr Ergebnis");
    expect(container.textContent).toContain("Eingereicht über");
    expect(container.textContent).toContain("Bernd Berater");
    expect(container.textContent).toContain("direkt vom Unternehmen");
    expect(container.querySelector('[data-slide-number="1"]')).not.toBeNull();
  });
});

describe("Slide02Glueckwunsch", () => {
  it("renders the verbatim headline + flurstueck address", () => {
    const { container } = render(<Slide02Glueckwunsch data={data} />);
    expect(container.textContent).toContain("Herzlichen Glückwunsch Ihre Fläche ist umsetzbar!");
    expect(container.textContent).toContain("Bergwaldstraße 4");
    expect(container.textContent).toContain("Flurstück 78.10");
    expect(container.textContent).toContain("in die Phase II übergehen können");
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
  it("renders all three Vorteile and the verbatim intro", () => {
    const { container } = render(<Slide03DreiVorteile data={data} />);
    expect(container.textContent).toContain(
      "Für ihr Unternehmen hat sich die Beauftragung unserer Auswertung gelohnt.",
    );
    expect(container.textContent).toContain("Erstens:");
    expect(container.textContent).toContain("Zweitens:");
    expect(container.textContent).toContain("Drittens:");
    expect(container.textContent).toContain("ohne weitere Investitionen");
    // pacht einmalig = 500 kWp × 100 €/kWp × 20 Jahre = 1.000.000 €
    // Just sanity-check that some euro value lands in the text.
    expect(container.textContent).toMatch(/\d{1,3}(\.\d{3})*,\d{2}/);
  });
});

describe("Slide04AufEinenBlick", () => {
  it("renders the verbatim 'Auf einen Blick' headline + CO2 thanks", () => {
    const { container } = render(<Slide04AufEinenBlick data={data} />);
    expect(container.textContent).toContain("Auf einen Blick");
    expect(container.textContent).toContain("Installierende Leistung");
    expect(container.textContent).toContain("Jahresertrag");
    expect(container.textContent).toContain("Eigenverbrauch");
    expect(container.textContent).toContain("Pachteinnahmen");
    expect(container.textContent).toContain("Einmalig gleich zu Beginn");
    expect(container.textContent).toContain(
      "VIELEN DANK für Ihren Einsatz zu einer besseren CO2 Bilanz",
    );
  });
});

describe("Slide05VorherNachher", () => {
  it("renders the 'Vorher - Nachher' headline + Jetzt/Später cards", () => {
    const { container } = render(<Slide05VorherNachher data={data} />);
    expect(container.textContent).toContain("Vorher - Nachher");
    expect(container.textContent).toContain("Jetzt:");
    expect(container.textContent).toContain("Später:");
    expect(container.textContent).toContain("Pachtzahlung vorab");
    expect(container.textContent).toContain("einmalige Pachtzahlung für 20 Jahre");
    expect(container.textContent).toContain("Stromliefervertrag");
    expect(container.textContent).toContain("CENT netto / kWh");
  });

  it("renders placeholders when image URLs are null", () => {
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
  it("renders the 'Dafür stehen wir:' verbatim with all four roles + EEG", () => {
    const { container } = render(<Slide06Mission data={data} />);
    expect(container.textContent).toContain("Dafür stehen wir:");
    expect(container.textContent).toContain("Eigentümer:innen");
    expect(container.textContent).toContain("Solarunternehmen");
    expect(container.textContent).toContain("Gesellschaft");
    expect(container.textContent).toContain("Investoren");
    expect(container.textContent).toContain("Erneuerbare-Energien-Gesetz (EEG) ist die Sicherheit");
  });
});

describe("Slide07Partner", () => {
  it("renders the strategic partner headline + both phases", () => {
    const { container } = render(<Slide07Partner data={data} />);
    expect(container.textContent).toContain(
      "Wir sind ihr strategischer Partner in der Energiewende",
    );
    expect(container.textContent).toContain(
      "Phase I: Professionelle Erstbewertung und Machbarkeitsprüfung",
    );
    expect(container.textContent).toContain("Phase II: Entwicklung von Projektrechten");
    expect(container.textContent).toContain("998 €");
  });
});

describe("Slide08Zusammenarbeit", () => {
  it("renders the four numbered Zusammenarbeit cards + Warum gerade jetzt", () => {
    const { container } = render(<Slide08Zusammenarbeit data={data} />);
    expect(container.textContent).toContain("Warum eine Zusammenarbeit sinnvoll ist");
    expect(container.textContent).toContain("Greifbare Vorteile auf mehreren Ebenen");
    expect(container.textContent).toContain("Pachteinnahmen");
    expect(container.textContent).toContain("Günstigeren Strom");
    expect(container.textContent).toContain("Strompreisstabilität");
    expect(container.textContent).toContain("Sicherheit für Investoren");
    expect(container.textContent).toContain("Warum gerade jetzt?");
    expect(container.textContent).toContain("Diese Machbarkeitsstudie bestätigt:");
  });
});

describe("Slide09Ausgangssituation", () => {
  it("renders all five tiles + summary KPIs", () => {
    const { container } = render(<Slide09Ausgangssituation data={data} />);
    expect(container.textContent).toContain("Ausgangssituation: Markt- und Kostenrisiken");
    expect(container.textContent).toContain("Ihr aktueller Netzstrompreis");
    expect(container.textContent).toContain("Maßnahmenbedarf");
    expect(container.textContent).toContain("Nutzen der PV-Lösung");
    expect(container.textContent).toContain("Pachteinnahmen");
    expect(container.textContent).toContain("Stromersparnis auf 20 Jahre");
    expect(container.textContent).toContain("CO2 Ersparnis auf 20 Jahre");
  });
});

describe("Slide10PVAnlagenkonzept", () => {
  it("renders the four numbered konzept tiles + modul info", () => {
    const { container } = render(<Slide10PVAnlagenkonzept data={data} />);
    expect(container.textContent).toContain("PV-Anlagenkonzept: Dachbelegung und Eignung");
    expect(container.textContent).toContain("Einkaufszentrum Linzgau Center");
    expect(container.textContent).toContain("500"); // anlageKwp
    expect(container.textContent).toContain("1.428"); // modulAnzahl
    expect(container.textContent).toContain("2.856"); // modulFlaecheM2
    expect(container.textContent).toContain("Keine relevanten Verschattungen");
    expect(container.textContent).toContain("Wahlweise mit Speicher");
    expect(container.textContent).toContain("Geplant durch PV-Sol");
  });
});

describe("Slide11Energiefluss", () => {
  it("renders the three flow phases", () => {
    const { container } = render(<Slide11Energiefluss data={data} />);
    expect(container.textContent).toContain("Energiefluss und Eigenverbrauch");
    expect(container.textContent).toContain("PV-Erzeugung");
    expect(container.textContent).toContain("Eigenverbrauch");
    expect(container.textContent).toContain("Einspeisung");
    expect(container.textContent).toContain("Wirkung");
    expect(container.textContent).toContain("Unabhängigkeit");
  });
});

describe("Slide12Stromliefervertrag", () => {
  it("renders verbatim Stromliefervertrag headline + PV/Netz vergleich", () => {
    const { container } = render(<Slide12Stromliefervertrag data={data} />);
    expect(container.textContent).toContain("Wirtschaftlichkeit: Stromliefervertrag");
    expect(container.textContent).toContain("PV-Strompreis:");
    expect(container.textContent).toContain("Netzstrompreis:");
    expect(container.textContent).toContain("Marktabhängiger Bezugspreis");
    expect(container.textContent).toContain("Direkte jährliche Ersparnis");
    expect(container.textContent).toContain("ein Stromliefervertrag wird dringend empfohlen");
  });
});

describe("Slide13Langfristig", () => {
  it("renders the gesamtvorteil highlight and verbatim closer", () => {
    const { container } = render(<Slide13Langfristig data={data} />);
    expect(container.textContent).toContain("Langfristige Wirtschaftlichkeit: 20 Jahre");
    expect(container.textContent).toContain("Gesamter wirtschaftlicher Vorteil");
    expect(container.textContent).toContain("über 20 Jahre");
    expect(container.textContent).toContain(
      "Kernaussage: Keine Investition für ihr Unternehmen erforderlich",
    );
  });
});

describe("Slide14Vergleich", () => {
  it("renders mit/ohne pv comparison + reduktion", () => {
    const { container } = render(<Slide14Vergleich data={data} />);
    expect(container.textContent).toContain("Vergleich: Mit PV vs. Ohne PV");
    expect(container.textContent).toContain("Ohne PV");
    expect(container.textContent).toContain("Mit PV");
    expect(container.textContent).toContain("Jährliche Reduktion der Stromkosten");
    expect(container.textContent).toContain("Wirtschaftlicher und planbarer Energiebezug");
  });
});

describe("Slide15Sensitivitaet", () => {
  it("renders three szenarios + SVG chart", () => {
    const { container } = render(<Slide15Sensitivitaet data={data} />);
    expect(container.textContent).toContain("Sensitivitätsanalyse: Strompreis-Szenarien");
    expect(container.textContent).toContain("Basisszenario");
    expect(container.textContent).toContain("Moderates Szenario");
    expect(container.textContent).toContain("Hohes Szenario");
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    const bars = container.querySelectorAll("rect");
    expect(bars.length).toBe(3);
  });
});

describe("Slide16Variantenvergleich", () => {
  it("renders both variants with the verbatim names", () => {
    const { container } = render(<Slide16Variantenvergleich data={data} />);
    expect(container.textContent).toContain("Variantenvergleich und Empfehlung");
    expect(container.textContent).toContain("Variante A: Nur Flächenpacht");
    expect(container.textContent).toContain("Variante B: Flächenpacht und Stromlieferung");
    expect(container.textContent).toContain("(empfohlen)");
    const grid = container.querySelector('[style*="repeat(2"]');
    expect(grid).not.toBeNull();
  });
});

describe("Slide17Timeline", () => {
  it("renders the 7 phases in a 7-column grid (Q10 PASS 2)", () => {
    const { container } = render(<Slide17Timeline data={data} />);
    expect(container.textContent).toContain("Der Weg zur Inbetriebnahme");
    expect(container.textContent).toContain("Jetzt ist notwendig");
    // User-verified 7-Spalten-Reihenfolge mit Phasen-Headers.
    expect(container.textContent).toContain("Phase I");
    expect(container.textContent).toContain("Machbarkeitsstudie");
    expect(container.textContent).toContain("Vor-Phase II");
    expect(container.textContent).toContain("Vertragsbedingungen");
    expect(container.textContent).toContain("Phase II");
    expect(container.textContent).toContain("Projektierung");
    expect(container.textContent).toContain("Phase III");
    expect(container.textContent).toContain("Investorensuche");
    expect(container.textContent).toContain("Projektumsetzung");
    expect(container.textContent).toContain("Inbetriebnahme");
    expect(container.textContent).toContain("Bis 20 Jahre");
    // Ergebnis-Texte aller 7 Spalten (User-verifizierte Liste).
    expect(container.textContent).toContain("Technisch und wirtschaftlich tragfähiges Vorprojekt");
    expect(container.textContent).toContain(
      "Rechtliche Grundlage zur Einleitung der Projektentwicklung",
    );
    expect(container.textContent).toContain("Baureifestatus PV-Anlage");
    expect(container.textContent).toContain("Projektrechte Vermarktung und -Verkauf");
    expect(container.textContent).toContain("Abschluss Installation PV-Anlage");
    expect(container.textContent).toContain("Auszahlung Pacht und PV-Anlage im Betrieb");
    expect(container.textContent).toContain("Sie sparen");
    // 7-Spalten-Grid.
    const grid = container.querySelector('[style*="repeat(7"]');
    expect(grid).not.toBeNull();
    // 7 phase titles as <h4>.
    const headings = container.querySelectorAll("h4");
    expect(headings.length).toBeGreaterThanOrEqual(7);
  });
});

describe("Slide18EEG", () => {
  it("renders the EEG headline + six cards", () => {
    const { container } = render(<Slide18EEG data={data} />);
    expect(container.textContent).toContain("Das Erneuerbare-Energien-Gesetz (EEG)");
    expect(container.textContent).toContain("Vorteile für Flächenverpächter");
    expect(container.textContent).toContain("Staatlich garantierter Rahmen");
    expect(container.textContent).toContain("20 Jahre Planungssicherheit");
    expect(container.textContent).toContain("Hohe Zahlungssicherheit");
    expect(container.textContent).toContain("Netzanschluss & Einspeisevorrang");
    expect(container.textContent).toContain("Starker Investoren- und Bankenstandard");
    expect(container.textContent).toContain("Wertsteigerung & Risikominimierung");
  });
});

describe("Slide19Kontakt", () => {
  it("renders both termine when set + contact block", () => {
    const { container } = render(<Slide19Kontakt data={data} />);
    expect(container.textContent).toContain("So geht es weiter!");
    expect(container.textContent).toContain("Fachstelle Flächenprüfung");
    expect(container.textContent).toContain("Unsere Kontaktdaten:");
    expect(container.textContent).toContain("+49 172 3794240");
    expect(container.textContent).toContain("projektberatung@greenscout-ev.de");
    expect(container.textContent).toContain("GreenScout eV - Utechter Str. 5 - 19217 Utecht");
    expect(container.textContent).toContain("Wir melden uns bei Ihnen!");
    expect(container.textContent).toContain("1)");
    expect(container.textContent).toContain("2)");
    expect(container.textContent).toContain("oder");
    expect(container.textContent).toContain("Zusätzlich zu dieser Machbarkeitsstudie");
  });

  it("renders 'Termin auf Anfrage' when both termine are null", () => {
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
