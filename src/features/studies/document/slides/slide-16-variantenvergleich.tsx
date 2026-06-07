import { customerDisplayName, formatCentPerKwh, formatEurNumber } from "../format";
import type { StudyDocumentData } from "../types";
import { SlideFrame } from "./_components/slide-frame";

/**
 * Slide 16 — "Variantenvergleich und Empfehlung".
 *
 * Treue Reproduktion (Pivot-2b). Statische Texte wörtlich aus dem PPTX
 * (siehe `template-content.json` Slide 16):
 *
 *  - Text 0 — "Variantenvergleich und Empfehlung".
 *  - Text 1 — "Klare Gegenüberstellung: Kosten, Nutzen, Risiko für das
 *    {{customer_object_name}}".
 *  - Variante A (Text 2..7):
 *     "Variante A: Nur Flächenpacht"
 *     "Einmalige Pacht: ca. {{pacht_einnahme_einmalig_eur}} €"
 *     "Betreiber verkauft Strom anderweitig, kein direkter Stromnutzen
 *      für Mieter"
 *     "Kein Investitionsrisiko für Eigentümer"
 *     "Kein planbarer Strompreis für Mieter"
 *     "Geringerer Kundennutzen im Vergleich zu Variante B
 *      Fazit: Projektrecht schwerer platzierbar bei Investoren."
 *  - Variante B (Text 8..13):
 *     "Variante B: Flächenpacht und Stromlieferung (empfohlen)"
 *     "Pachteinnahmen ca. {{pacht_einnahme_einmalig_eur}} € plus einen
 *      konstanten Strompreis {{pv_verkauf_ct_kwh}} ct/kWh fix"
 *     "Konstante jährliche Einsparung: ca. {{ersparnis_pro_jahr_eur}} €
 *      und bei 20 Jahren ca. {{ersparnis_gesamt_vertragslaufzeit_eur}} €"
 *     "Kein Investitionsaufwand für Eigentümer, planbare Einnahmen und
 *      Ersparnisse"
 *     "Langfristige Planbarkeit ohne operatives Risiko für Eigentümer"
 *     "Höchster Kundennutzen: Ersparnis plus Pachteinnahmen"
 *
 * **Grid-auto-rows-1fr** auf dem `grid-cols-2`-Container für gleiche
 * Spalten-Höhe (analog Slide 17, ersetzt die fragile PPTX-Grid-
 * Normalisierung).
 */
export default function Slide16Variantenvergleich({ data }: { data: StudyDocumentData }) {
  const customerName = customerDisplayName(data.customer);
  const objectName = data.study.objectName;
  const pacht = formatEurNumber(data.derived.pachtEinnahmeEinmalig);
  const pvCt = formatCentPerKwh(Number(data.study.pvVerkaufEurKwh) * 100).replace(" ct/kWh", "");
  const ersparnisJahr = formatEurNumber(data.derived.ersparnisProJahr);
  const ersparnis20 = formatEurNumber(data.derived.ersparnis20Jahre);

  const varianteA: string[] = [
    `Einmalige Pacht: ca. ${pacht} €`,
    "Betreiber verkauft Strom anderweitig, kein direkter Stromnutzen für Mieter",
    "Kein Investitionsrisiko für Eigentümer",
    "Kein planbarer Strompreis für Mieter",
    "Geringerer Kundennutzen im Vergleich zu Variante B",
    "Fazit: Projektrecht schwerer platzierbar bei Investoren.",
  ];
  const varianteB: string[] = [
    `Pachteinnahmen ca. ${pacht} € plus einen konstanten Strompreis ${pvCt} ct/kWh fix`,
    `Konstante jährliche Einsparung: ca. ${ersparnisJahr} € und bei 20 Jahren ca. ${ersparnis20} €`,
    "Kein Investitionsaufwand für Eigentümer, planbare Einnahmen und Ersparnisse",
    "Langfristige Planbarkeit ohne operatives Risiko für Eigentümer",
    "Höchster Kundennutzen: Ersparnis plus Pachteinnahmen",
  ];

  return (
    <SlideFrame slideNumber={16} customerLabel={customerName}>
      <div className="flex h-full flex-col gap-5">
        {/* Headline + Subtitle */}
        <div className="space-y-1">
          <h2 className="text-[28px] font-extrabold text-forest-green">
            Variantenvergleich und Empfehlung
          </h2>
          <p className="text-[18px] text-foreground">
            Klare Gegenüberstellung: Kosten, Nutzen, Risiko für das{" "}
            <span className="font-bold">{objectName}</span>
          </p>
        </div>

        {/* Two columns with equal height via grid-auto-rows: 1fr */}
        <div
          className="grid flex-1 grid-cols-2 gap-6"
          style={{ gridAutoRows: "1fr", gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}
        >
          {/* Variante A */}
          <div className="flex flex-col rounded-xl border-2 border-forest-green p-6">
            <div className="text-[22px] font-bold text-forest-green">
              Variante A: Nur Flächenpacht
            </div>
            <ul className="mt-4 flex-1 space-y-2 text-[15px] leading-[1.4] text-foreground">
              {varianteA.map((b, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-forest-green">•</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Variante B */}
          <div className="flex flex-col rounded-xl border-2 border-plant-green bg-plant-green-50 p-6">
            <div className="text-[22px] font-bold text-plant-green">
              Variante B: Flächenpacht und Stromlieferung (empfohlen)
            </div>
            <ul className="mt-4 flex-1 space-y-2 text-[15px] leading-[1.4] text-foreground">
              {varianteB.map((b, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-plant-green">•</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </SlideFrame>
  );
}
