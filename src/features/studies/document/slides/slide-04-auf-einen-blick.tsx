import {
  customerDisplayName,
  formatEurNumber,
  formatFootballFields,
  formatHectares,
  formatIntegerDe,
  formatTonnes,
} from "../format";
import type { StudyDocumentData } from "../types";
import { SlideFrame } from "./_components/slide-frame";

/**
 * Slide 4 — "Auf einen Blick" (KPI-Dashboard).
 *
 * Treue Reproduktion (Pivot-2b PASS 2, siehe DECISIONS 2026-06-02).
 *
 * **Pass-3-Korrektur (Q14):** „CO2" wird durchgängig plain geschrieben
 * (kein `<sub>2</sub>`, kein Unicode-₂) — das entspricht dem PPTX-
 * Wortlaut und ist bewusste GreenScout-Schreibweise.
 *
 * **Pass-2-Korrekturen (Q2 + Q3 User-Antworten):**
 *  - **Kein 3×2-Grid** — freies Layout wie im Original-PDF:
 *    - CO2-Absatz oben als breiter Fließtext + zentrierter "VIELEN DANK"-
 *      Bold-Satz (gehört zum CO2-Absatz, kein eigenes 6. Tile).
 *    - kWp-Hero zentriert oben-mitte (großer Wert + Caption).
 *    - Eigenverbrauch-Kreis-Block links daneben, mit Text rechts.
 *    - Drei Geld-Tiles als Reihe am unteren Rand: Pachteinnahmen /
 *      Jahresertrag / Stromersparnis.
 *    - Objektstandort unten links.
 *  - **CO2-Schlusssatz endet mit "Fußballfelder!"** (Q3) — die früher
 *    in der Repro erfundene Endung "über die gesamte Vertragslaufzeit."
 *    war falsch; die Pass-2-Extract-JSON enthält jetzt den
 *    vollständigen Satz mit `!` als Endung.
 *
 * Statische Texte wörtlich aus dem PPTX (siehe `template-content.json`
 * Slide 4, Pass-2-Regenerierung):
 *  - Headline (Text 2, 24pt) — "Auf einen Blick".
 *  - Hero-kWp-Tile: {{anlage_kwp}} + "kWp" / Caption "Installierende
 *    Leistung" / Note "Gesamtleistung der geplanten Anlage".
 *  - Jahresertrag-Tile (Text 7+8+9): {{pv_erzeugung_kwh_jahr}} + "kWh" /
 *    "Jahresertrag" / "ca. {{gesamterzeugung_vertragslaufzeit_kwh}} kWh
 *    auf 20 Jahre Jahresproduktion ca. {{pv_erzeugung_kwh_jahr}} kWh".
 *  - Eigenverbrauch-Block (Text 13+14+15): {{eigenverbrauchsquote_prozent}}%
 *    / "Eigenverbrauch" / "Eigenverbrauch des Bedarfs: ca.
 *    {{pv_eigenverbrauch_kwh_jahr}} kWh (41 %) Überschuss Produktion:-
 *    Wird ins öffentliche Netz eingespeist Oder z.T. in einem zu
 *    errichteten Speicher zwischengespeichert".
 *  - 20-Jahre-Stromersparnis-Tile (Text 16+17+18): "ca.
 *    {{ersparnis_gesamt_vertragslaufzeit_eur}} €" / "Mögliche
 *    Stromersparnis für 20 Jahre" / "Jährlich ca.
 *    {{ersparnis_pro_jahr_eur}} €".
 *  - Pachteinnahmen-Tile (Text 16+17+18 duplikat-shape-id):
 *    "{{pacht_einnahme_einmalig_eur}} €" / "Pachteinnahmen" /
 *    "Einmalig gleich zu Beginn".
 *  - Footnote (Textfeld 26): "Vorläufige Kernergebnisse auf Basis der
 *    von Ihnen gelieferten Dokumente."
 *  - CO2-Block (Textfeld 27, voller Satz mit "Fußballfelder!"-Endung).
 *  - Objektstandort (Textfeld 34): "Objektstandort:
 *    {{customer_object_short_name_and_city}}.
 *    {{flurstueck_label_phrase}}".
 *  - Thanks (Textfeld 4): "VIELEN DANK für Ihren Einsatz zu einer
 *    besseren CO2 Bilanz !" (gehört in den CO2-Absatz, kein eigenes
 *    Tile — Q2).
 */
export default function Slide04AufEinenBlick({ data }: { data: StudyDocumentData }) {
  const customerName = customerDisplayName(data.customer);

  // Dynamic values pulled from props.
  const anlageKwp = formatIntegerDe(Number(data.study.anlageKwp));
  const pvErzeugung = formatIntegerDe(Number(data.study.pvErzeugungKwhJahr));
  const gesamterzeugung20 = formatIntegerDe(data.derived.gesamterzeugung20j);
  const eigenverbrauchsquote =
    data.study.eigenverbrauchsquoteProzent === null
      ? "—"
      : formatIntegerDe(Number(data.study.eigenverbrauchsquoteProzent));
  const pvEigenverbrauch = formatIntegerDe(Number(data.study.pvEigenverbrauchKwhJahr));
  const ersparnis20 = formatEurNumber(data.derived.ersparnis20Jahre);
  const ersparnisJahr = formatEurNumber(data.derived.ersparnisProJahr);
  const pachtEinmalig = formatEurNumber(data.derived.pachtEinnahmeEinmalig);
  const co2Jahr = formatTonnes(data.derived.co2TonnenProJahr);
  const co2Mischwald = formatHectares(data.derived.co2HektarMischwald);
  const co2Fussballfelder = formatFootballFields(data.derived.co2FussballfelderProJahr);
  const co2GesamtFmt = formatIntegerDe(data.derived.co2TonnenProJahr * 20);
  const co2FussballfelderGesamt = formatIntegerDe(data.derived.co2FussballfelderProJahr * 20);

  const objectShortNameAndCity = `${data.study.objectName}, ${data.study.objectCity}`;
  const flurstueckLabel =
    data.study.flurstueck && data.study.flurstueck.trim().length > 0
      ? `Flurstück: ${data.study.flurstueck}`
      : "";

  return (
    <SlideFrame slideNumber={4} customerLabel={customerName}>
      {/* Pivot-2d P3 (Whitespace-Reduktion): `gap-4` zwischen den Sektionen
          statt `mt-auto`-getriebener Spreizung. Der Slide hängt jetzt direkt
          oben an, nutzt Mid-Section-Gaps statt großer Lücken, und die
          Bottom-Tiles sind nicht mehr „nach unten gedrückt". */}
      <div className="flex h-full flex-col gap-4">
        {/* Headline (Pivot-2d P1: font-extrabold für PowerPoint-Dichte) */}
        <h2 className="text-center text-[32px] font-extrabold text-forest-green">
          Auf einen Blick
        </h2>

        {/* CO2-Fließtext über volle Breite — Q3-Korrektur: voller Satz inkl.
            "Fußballfelder!"-Endung, plus "VIELEN DANK"-Satz als integraler
            Bestandteil (Q2). Pivot-2d P4: Hero-Zahlen plant-green-bold. */}
        <div className="space-y-2 text-[16px] leading-[1.5] text-forest-green">
          <p>
            Ihre Fläche erspart rund{" "}
            <span className="font-bold tabular-nums text-plant-green">{co2Jahr}</span> CO2 pro Jahr.
            Dieser Wert entspricht einer jährlichen CO2-Bindung von bis zu{" "}
            <span className="font-bold tabular-nums text-plant-green">{co2Mischwald}</span> Hektar
            nachhaltig bewirtschafteten deutschen Mischwald, das entspricht ca.{" "}
            <span className="font-bold tabular-nums text-plant-green">{co2Fussballfelder}</span>{" "}
            Fußballfelder pro Jahr. Bei 20 Jahren Nutzungsdauer sind das{" "}
            <span className="font-bold tabular-nums text-plant-green">{co2GesamtFmt}</span> Tonnen
            CO2, das sind ca.{" "}
            <span className="font-bold tabular-nums text-plant-green">
              {co2FussballfelderGesamt}
            </span>{" "}
            Fußballfelder!
          </p>
          <p className="text-center text-[18px] font-extrabold">
            VIELEN DANK für Ihren Einsatz zu einer besseren CO2 Bilanz !
          </p>
        </div>

        {/* Hero-kWp-Block zentriert — der visuelle Anker des Slides
            Pivot-2d P1: font-extrabold (800) für Hero-KPI. */}
        <div className="flex flex-col items-center">
          <div className="flex items-baseline gap-2">
            <span className="text-[96px] font-extrabold tabular-nums leading-none text-plant-green">
              {anlageKwp}
            </span>
            <span className="text-[44px] font-normal text-forest-green">kWp</span>
          </div>
          <div className="mt-2 text-[22px] font-bold text-forest-green">
            Installierende Leistung
          </div>
          <div className="text-[15px] text-foreground opacity-70">
            Gesamtleistung der geplanten Anlage
          </div>
        </div>

        {/* Mittelblock: Objektstandort links, Eigenverbrauchskreis mittig,
            Hinweistext rechts. */}
        <div className="grid grid-cols-3 items-center gap-4">
          {/* Left — Objektstandort */}
          <div className="text-[14px] text-forest-green">
            <div className="font-bold">Objektstandort:</div>
            <div>{objectShortNameAndCity}.</div>
            {flurstueckLabel ? <div>{flurstueckLabel}</div> : null}
          </div>

          {/* Middle — Eigenverbrauchs-Kreis (Pivot-2d P2 + B2):
              Solid-Filled Plant-Green-Kreis mit weißem Text drin — ersetzt
              den vorigen Outline-Kreis (`border-4 border-plant-green`). */}
          <div className="flex justify-center">
            <div className="flex h-[180px] w-[180px] flex-col items-center justify-center rounded-full bg-plant-green">
              <div className="text-[44px] font-extrabold tabular-nums leading-none text-white">
                {eigenverbrauchsquote}%
              </div>
              <div className="mt-1 text-[14px] font-bold text-white">Eigenverbrauch</div>
            </div>
          </div>

          {/* Right — Eigenverbrauchs-Erklärung */}
          <div className="text-[13px] leading-[1.4] text-foreground">
            <div>
              Eigenverbrauch des Bedarfs: ca.{" "}
              <span className="font-bold tabular-nums text-plant-green">{pvEigenverbrauch}</span>{" "}
              kWh ({eigenverbrauchsquote} %)
            </div>
            <div className="mt-1">Überschuss Produktion:</div>
            <div>
              - Wird ins öffentliche Netz eingespeist Oder z.T. in einem zu errichteten Speicher
              zwischengespeichert
            </div>
          </div>
        </div>

        {/* Drei Geld-Tiles als Reihe unten — `mt-auto` schiebt sie an den
            Boden des verfügbaren Slide-Innenraums.
            Pivot-2d P1: font-extrabold (800) für Hero-Geld-Zahlen. */}
        <div className="mt-auto grid grid-cols-3 gap-6 pt-4">
          {/* Pachteinnahmen */}
          <div className="flex flex-col items-center text-center">
            <div className="text-[44px] font-extrabold tabular-nums leading-none text-plant-green">
              {pachtEinmalig} €
            </div>
            <div className="mt-2 text-[18px] font-bold text-forest-green">Pachteinnahmen</div>
            <div className="text-[13px] text-foreground opacity-70">Einmalig gleich zu Beginn</div>
          </div>

          {/* Jahresertrag */}
          <div className="flex flex-col items-center text-center">
            <div className="text-[44px] font-extrabold tabular-nums leading-none text-plant-green">
              {pvErzeugung} kWh
            </div>
            <div className="mt-2 text-[18px] font-bold text-forest-green">Jahresertrag</div>
            <div className="text-[13px] text-foreground opacity-70">
              ca. <span className="tabular-nums">{gesamterzeugung20}</span> kWh auf 20 Jahre
            </div>
            <div className="text-[13px] text-foreground opacity-70">
              Jahresproduktion ca. <span className="tabular-nums">{pvErzeugung}</span> kWh
            </div>
          </div>

          {/* Stromersparnis 20 Jahre */}
          <div className="flex flex-col items-center text-center">
            <div className="text-[44px] font-extrabold tabular-nums leading-none text-plant-green">
              ca. {ersparnis20} €
            </div>
            <div className="mt-2 text-[18px] font-bold text-forest-green">
              Mögliche Stromersparnis für 20 Jahre
            </div>
            <div className="text-[13px] text-foreground opacity-70">
              Jährlich ca. <span className="tabular-nums">{ersparnisJahr}</span> €
            </div>
          </div>
        </div>

        {/* Footnote */}
        <p className="mt-2 text-[12px] italic text-forest-green opacity-60">
          Vorläufige Kernergebnisse auf Basis der von Ihnen gelieferten Dokumente.
        </p>
      </div>
    </SlideFrame>
  );
}
