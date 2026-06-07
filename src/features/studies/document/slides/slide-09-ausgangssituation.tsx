import { customerDisplayName, formatCentPerKwh, formatEurNumber, formatTonnes } from "../format";
import type { StudyDocumentData } from "../types";
import { SlideFrame } from "./_components/slide-frame";

/**
 * Slide 9 — "Ausgangssituation: Markt- und Kostenrisiken".
 *
 * Treue Reproduktion (Pivot-2b). Statische Texte wörtlich aus dem PPTX
 * (siehe `template-content.json` Slide 9):
 *
 *  - Text 0 — "Ausgangssituation: Markt- und Kostenrisiken".
 *  - Text 1 — "Planbarkeit und Nutzen der Absicherung durch Photovoltaik".
 *  - Fünf nummerierte Tiles 01–05:
 *     01 "Ihr aktueller Netzstrompreis {{versorger_preis_ct_kwh}} netto
 *        ct/kWh" / "Laut Ihrer Unterlagen"
 *     02 "Derzeitig volle Abhängigkeit von Ihrem aktuellen Stromversorger"
 *        / "Keine Preisgarantie, hohe Volatilität"
 *     03 "Steigende Energiepreise und unsichere Planung"
 *        / "Belastung für Budget und Margen"
 *     04 "Maßnahmenbedarf: Preisstabilisierung und Absicherung"
 *        / "Kurzfristig planbare Kostensicherheit schaffen"
 *     05 "Nutzen der PV-Lösung: Kostensenkung, Planbarkeit, Reduktion"
 *        / "Kostenvorteil, Prognosesicherheit"
 *  - Summary-Block (Text 21) — drei tabellierte KPI-Zeilen:
 *     "Pachteinnahmen: ca. {{pacht_einnahme_einmalig_eur}} €"
 *     "Stromersparnis auf 20 Jahre: ca. {{ersparnis_gesamt_vertragslaufzeit_eur}} €"
 *     "CO2 Ersparnis auf 20 Jahre: ca. {{co2_tonnen_gesamt_vertragslaufzeit}} t CO2"
 */
export default function Slide09Ausgangssituation({ data }: { data: StudyDocumentData }) {
  const customerName = customerDisplayName(data.customer);
  const versorgerCt = formatCentPerKwh(Number(data.study.versorgerPreisEurKwh) * 100).replace(
    " ct/kWh",
    "",
  );
  const pacht = formatEurNumber(data.derived.pachtEinnahmeEinmalig);
  const ersparnis20 = formatEurNumber(data.derived.ersparnis20Jahre);
  const co2Gesamt = formatTonnes(
    data.derived.co2TonnenProJahr * data.study.vertragslaufzeitJahre,
  ).replace(" t", " t CO2");

  const tiles = [
    {
      no: "01",
      head: (
        <>
          Ihr aktueller Netzstrompreis <span className="font-bold tabular-nums">{versorgerCt}</span>{" "}
          netto ct/kWh
        </>
      ),
      body: "Laut Ihrer Unterlagen",
    },
    {
      no: "02",
      head: "Derzeitig volle Abhängigkeit von Ihrem aktuellen Stromversorger",
      body: "Keine Preisgarantie, hohe Volatilität",
    },
    {
      no: "03",
      head: "Steigende Energiepreise und unsichere Planung",
      body: "Belastung für Budget und Margen",
    },
    {
      no: "04",
      head: "Maßnahmenbedarf: Preisstabilisierung und Absicherung",
      body: "Kurzfristig planbare Kostensicherheit schaffen",
    },
    {
      no: "05",
      head: "Nutzen der PV-Lösung: Kostensenkung, Planbarkeit, Reduktion",
      body: "Kostenvorteil, Prognosesicherheit",
    },
  ];

  return (
    <SlideFrame slideNumber={9} customerLabel={customerName}>
      <div className="flex h-full flex-col gap-4">
        {/* Headline + Subtitle */}
        <div className="space-y-1">
          <h2 className="text-[28px] font-bold text-forest-green">
            Ausgangssituation: Markt- und Kostenrisiken
          </h2>
          <p className="text-[18px] text-foreground">
            Planbarkeit und Nutzen der Absicherung durch Photovoltaik
          </p>
        </div>

        {/* Five numbered tiles in a 5-column row */}
        <div className="grid flex-1 grid-cols-5 gap-3">
          {tiles.map((t) => (
            <div key={t.no} className="rounded-xl bg-muted-lime-50 p-4 text-[14px] leading-[1.4]">
              <div className="text-[24px] font-bold tabular-nums leading-none text-plant-green">
                {t.no}
              </div>
              <div className="mt-3 text-[15px] font-bold text-forest-green">{t.head}</div>
              <p className="mt-1 text-[13px] text-foreground">{t.body}</p>
            </div>
          ))}
        </div>

        {/* Summary KPIs (Text 21) */}
        <div className="rounded-xl bg-plant-green-50 p-5 text-[18px] leading-[1.4] text-foreground">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <span className="font-bold">Pachteinnahmen:</span>
              <br />
              <span className="text-[22px] font-bold tabular-nums text-plant-green">
                ca. {pacht} €
              </span>
            </div>
            <div>
              <span className="font-bold">Stromersparnis auf 20 Jahre:</span>
              <br />
              <span className="text-[22px] font-bold tabular-nums text-plant-green">
                ca. {ersparnis20} €
              </span>
            </div>
            <div>
              <span className="font-bold">CO2 Ersparnis auf 20 Jahre:</span>
              <br />
              <span className="text-[22px] font-bold tabular-nums text-plant-green">
                ca. {co2Gesamt}
              </span>
            </div>
          </div>
        </div>
      </div>
    </SlideFrame>
  );
}
