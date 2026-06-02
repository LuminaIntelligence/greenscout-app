import { customerDisplayName, formatEurNumber } from "../format";
import type { StudyDocumentData } from "../types";
import { SlideFrame } from "./_components/slide-frame";

/**
 * Slide 13 — "Langfristige Wirtschaftlichkeit: 20 Jahre".
 *
 * Treue Reproduktion (Pivot-2b). Statische Texte wörtlich aus dem PPTX
 * (siehe `template-content.json` Slide 13):
 *
 *  - Text 0 — "Langfristige Wirtschaftlichkeit: 20 Jahre".
 *  - Text 1 — "Kumulative Einsparung und einmalige Dachpacht klar
 *    visualisiert".
 *  - Text 2/3 — "Jährliche Einsparung durch PV-Strom: ca.
 *    {{ersparnis_pro_jahr_eur}} €" / "Basisannahme für kumulierte
 *    Darstellung".
 *  - Text 4/5 — "Kumulierte Einsparung über 20 Jahre: ca.
 *    {{ersparnis_gesamt_vertragslaufzeit_eur}} €" / "Keine
 *    Strompreissteigerung".
 *  - Text 6/7 — "Einmalige Dachpacht: {{pacht_einnahme_einmalig_eur}} €
 *    (positive Einmalzahlung)" / "Separat hervorgehoben als zusätzlicher
 *    Vorteil".
 *  - Text 8/9 — "Gesamter wirtschaftlicher Vorteil: >
 *    {{gesamtvorteil_eur}} € über 20 Jahre" / "Kumulierte Ersparnis plus
 *    Dachpacht".
 *  - Text 10 — "Kernaussage: Keine Investition für ihr Unternehmen
 *    erforderlich; langfristige Preisabsicherung".
 *  - Text 11 — "Einfache Entscheidung da risikolos und ohne eigenen
 *    Kaptaleinsatz große wirtschaftliche Vorteile zu generieren sind".
 */
export default function Slide13Langfristig({ data }: { data: StudyDocumentData }) {
  const customerName = customerDisplayName(data.customer);
  const ersparnisJahr = formatEurNumber(data.derived.ersparnisProJahr);
  const ersparnis20 = formatEurNumber(data.derived.ersparnis20Jahre);
  const pacht = formatEurNumber(data.derived.pachtEinnahmeEinmalig);
  const gesamtvorteil = formatEurNumber(data.derived.gesamtvorteil);

  const rows = [
    {
      head: (
        <>
          Jährliche Einsparung durch PV-Strom:{" "}
          <span className="tabular-nums">ca. {ersparnisJahr} €</span>
        </>
      ),
      body: "Basisannahme für kumulierte Darstellung",
    },
    {
      head: (
        <>
          Kumulierte Einsparung über 20 Jahre:{" "}
          <span className="tabular-nums">ca. {ersparnis20} €</span>
        </>
      ),
      body: "Keine Strompreissteigerung",
    },
    {
      head: (
        <>
          Einmalige Dachpacht: <span className="tabular-nums">{pacht} €</span> (positive
          Einmalzahlung)
        </>
      ),
      body: "Separat hervorgehoben als zusätzlicher Vorteil",
    },
  ];

  return (
    <SlideFrame slideNumber={13} customerLabel={customerName}>
      <div className="flex h-full flex-col gap-5">
        {/* Headline + Subtitle */}
        <div className="space-y-1">
          <h2 className="text-[28px] font-bold text-forest-green">
            Langfristige Wirtschaftlichkeit: 20 Jahre
          </h2>
          <p className="text-[18px] text-foreground">
            Kumulative Einsparung und einmalige Dachpacht klar visualisiert
          </p>
        </div>

        {/* Three economy rows */}
        <div className="space-y-3">
          {rows.map((r, idx) => (
            <div key={idx} className="rounded-xl bg-muted-lime-50 p-4">
              <div className="text-[18px] font-bold text-forest-green">{r.head}</div>
              <p className="text-[15px] text-foreground">{r.body}</p>
            </div>
          ))}
        </div>

        {/* Gesamtvorteil highlight row */}
        <div className="rounded-xl bg-plant-green-50 p-5 ring-2 ring-plant-green">
          <div className="text-[22px] font-bold text-plant-green">
            Gesamter wirtschaftlicher Vorteil: &gt;{" "}
            <span className="tabular-nums">{gesamtvorteil}</span> € über 20 Jahre
          </div>
          <p className="mt-1 text-[15px] text-foreground">Kumulierte Ersparnis plus Dachpacht</p>
        </div>

        {/* Closing statements */}
        <div className="mt-auto space-y-2 text-[16px] leading-[1.4] text-foreground">
          <p className="font-bold">
            Kernaussage: Keine Investition für ihr Unternehmen erforderlich; langfristige
            Preisabsicherung
          </p>
          <p>
            Einfache Entscheidung da risikolos und ohne eigenen Kaptaleinsatz große wirtschaftliche
            Vorteile zu generieren sind
          </p>
        </div>
      </div>
    </SlideFrame>
  );
}
