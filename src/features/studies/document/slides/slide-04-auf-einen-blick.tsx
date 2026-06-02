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
 * Treue Reproduktion (Pivot-2b). Statische Texte wörtlich aus dem PPTX
 * (siehe `template-content.json` Slide 4):
 *
 *  - Headline (Text 2, 24pt) — "Auf einen Blick".
 *  - KPI-Tile 1: {{anlage_kwp}} + "kWp" / Caption "Installierende Leistung"
 *    / Note "Gesamtleistung der geplanten Anlage".
 *  - KPI-Tile 2: {{pv_erzeugung_kwh_jahr}} + "kWh" / Caption "Jahresertrag"
 *    / Note "ca. {{gesamterzeugung_vertragslaufzeit_kwh}} kWh auf 20 Jahre"
 *    + "Jahresproduktion ca. {{pv_erzeugung_kwh_jahr}} kWh".
 *  - KPI-Tile 3: {{eigenverbrauchsquote_prozent}}% / Caption "Eigenverbrauch"
 *    / Note "Eigenverbrauch des Bedarfs: ca. {{pv_eigenverbrauch_kwh_jahr}}
 *    kWh (41 %)" + "Überschuss Produktion:- Wird ins öffentliche Netz
 *    eingespeist Oder z.T. in einem zu errichteten Speicher
 *    zwischengespeichert".
 *  - KPI-Tile 4: "ca. {{ersparnis_gesamt_vertragslaufzeit_eur}} €" / Caption
 *    "Mögliche Stromersparnis für 20 Jahre" / Note "Jährlich ca.
 *    {{ersparnis_pro_jahr_eur}} €".
 *  - KPI-Tile 5: "{{pacht_einnahme_einmalig_eur}} €" / Caption
 *    "Pachteinnahmen" / Note "Einmalig gleich zu Beginn".
 *  - Footnote (Textfeld 26): "Vorläufige Kernergebnisse auf Basis der von
 *    Ihnen gelieferten Dokumente."
 *  - CO2-Block (Textfeld 27): "Ihre Fläche erspart rund
 *    {{co2_tonnen_pro_jahr}} Tonnen CO2 pro Jahr. Dieser Wert entspricht
 *    einer jährlichen CO2-Bindung von bis zu {{co2_hektar_mischwald}}
 *    Hektar nachhaltig bewirtschafteten deutschen Mischwald, das
 *    entspricht ca. {{co2_fussballfelder_pro_jahr}} Fußballfelder pro
 *    Jahr. Bei 20 Jahren Nutzungsdauer sind das
 *    {{co2_tonnen_gesamt_vertragslaufzeit}} Tonnen CO2, das sind ca.
 *    {{co2_fussballfelder_gesamt_vertragslaufzeit}}..." (vollständiger
 *    PPTX-Text).
 *  - Objektstandort (Textfeld 34): "Objektstandort:
 *    {{customer_object_short_name_and_city}}. {{flurstueck_label_phrase}}".
 *  - Thanks (Textfeld 4): "VIELEN DANK für Ihren Einsatz zu einer
 *    besseren CO2 Bilanz !"
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
  const co2Gesamt = data.derived.co2TonnenProJahr * data.study.vertragslaufzeitJahre;
  const co2GesamtFmt = formatIntegerDe(co2Gesamt);
  const co2FussballfelderGesamt = formatIntegerDe(
    data.derived.co2FussballfelderProJahr * data.study.vertragslaufzeitJahre,
  );

  const objectShortNameAndCity = `${data.study.objectName}, ${data.study.objectCity}`;
  const flurstueckLabel =
    data.study.flurstueck && data.study.flurstueck.trim().length > 0
      ? `Flurstück: ${data.study.flurstueck}`
      : "";

  return (
    <SlideFrame slideNumber={4} customerLabel={customerName}>
      <div className="flex h-full flex-col gap-6">
        {/* Headline (Text 2, 24pt) */}
        <h2 className="text-[24px] font-normal text-forest-green">Auf einen Blick</h2>

        {/* Five KPI tiles in a 3x2 grid (5 used, 6th slot for CO2 thanks) */}
        <div className="grid grid-cols-3 gap-6">
          {/* Tile 1 — Installierte Leistung */}
          <KpiTile
            value={anlageKwp}
            unit="kWp"
            caption="Installierende Leistung"
            note="Gesamtleistung der geplanten Anlage"
          />

          {/* Tile 2 — Jahresertrag */}
          <KpiTile
            value={pvErzeugung}
            unit="kWh"
            caption="Jahresertrag"
            note={
              <>
                ca. {gesamterzeugung20} kWh auf 20 Jahre
                <br />
                Jahresproduktion ca. {pvErzeugung} kWh
              </>
            }
          />

          {/* Tile 3 — Eigenverbrauch */}
          <KpiTile
            value={eigenverbrauchsquote}
            unit="%"
            caption="Eigenverbrauch"
            note={
              <>
                Eigenverbrauch des Bedarfs: ca. {pvEigenverbrauch} kWh ({eigenverbrauchsquote} %)
                <br />
                Überschuss Produktion:
                <br />- Wird ins öffentliche Netz eingespeist Oder z.T. in einem zu errichteten
                Speicher zwischengespeichert
              </>
            }
          />

          {/* Tile 4 — 20-Jahre Stromersparnis */}
          <KpiTile
            value={`ca. ${ersparnis20} €`}
            caption="Mögliche Stromersparnis für 20 Jahre"
            note={`Jährlich ca. ${ersparnisJahr} €`}
          />

          {/* Tile 5 — Pachteinnahmen */}
          <KpiTile
            value={`${pachtEinmalig} €`}
            caption="Pachteinnahmen"
            note="Einmalig gleich zu Beginn"
          />

          {/* Tile 6 — CO2 Thanks */}
          <div className="rounded-2xl bg-muted-lime-100 p-6 text-[18px] font-bold leading-[1.3] text-forest-green">
            VIELEN DANK für Ihren Einsatz zu einer besseren CO2 Bilanz !
          </div>
        </div>

        {/* Footnote (Textfeld 26) */}
        <p className="text-[14px] italic text-forest-green opacity-70">
          Vorläufige Kernergebnisse auf Basis der von Ihnen gelieferten Dokumente.
        </p>

        {/* CO2 long-text block (Textfeld 27) */}
        <div className="rounded-2xl border-2 border-plant-green bg-plant-green-50 p-6 text-[16px] leading-[1.4] text-forest-green">
          Ihre Fläche erspart rund <span className="font-bold">{co2Jahr}</span> CO2 pro Jahr. Dieser
          Wert entspricht einer jährlichen CO2-Bindung von bis zu{" "}
          <span className="font-bold">{co2Mischwald}</span> Hektar nachhaltig bewirtschafteten
          deutschen Mischwald, das entspricht ca.{" "}
          <span className="font-bold">{co2Fussballfelder}</span> Fußballfelder pro Jahr. Bei{" "}
          {data.study.vertragslaufzeitJahre} Jahren Nutzungsdauer sind das{" "}
          <span className="font-bold">{co2GesamtFmt}</span> Tonnen CO2, das sind ca.{" "}
          <span className="font-bold">{co2FussballfelderGesamt}</span> Fußballfelder über die
          gesamte Vertragslaufzeit.
        </div>

        {/* Object location (Textfeld 34) */}
        <p className="mt-auto text-[14px] text-forest-green opacity-70">
          Objektstandort: {objectShortNameAndCity}. {flurstueckLabel}
        </p>
      </div>
    </SlideFrame>
  );
}

interface KpiTileProps {
  value: string;
  unit?: string;
  caption: string;
  note: React.ReactNode;
}

function KpiTile({ value, unit, caption, note }: KpiTileProps) {
  return (
    <div className="rounded-2xl border border-muted-lime-300 bg-white p-6">
      <div className="flex items-baseline gap-2">
        <span className="text-[37px] font-normal tabular-nums leading-none text-plant-green">
          {value}
        </span>
        {unit ? <span className="text-[20px] text-forest-green">{unit}</span> : null}
      </div>
      <div className="mt-3 text-[20px] font-normal leading-[1.2] text-forest-green">{caption}</div>
      <p className="mt-2 text-[14px] leading-[1.4] text-foreground">{note}</p>
    </div>
  );
}
