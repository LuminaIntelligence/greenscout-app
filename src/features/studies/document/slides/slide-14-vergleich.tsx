import { customerDisplayName, formatCentPerKwh, formatEurNumber } from "../format";
import type { StudyDocumentData } from "../types";
import { SlideFrame } from "./_components/slide-frame";

/**
 * Slide 14 — "Vergleich: Mit PV vs. Ohne PV".
 *
 * Treue Reproduktion (Pivot-2b). Statische Texte wörtlich aus dem PPTX
 * (siehe `template-content.json` Slide 14):
 *
 *  - Text 0 — "Vergleich: Mit PV vs. Ohne PV".
 *  - Text 1 — "Jährliche Stromkosten und direkte Einsparung".
 *  - Text 4/5 — "Ohne PV: ca. {{stromkosten_ohne_pv_eur_jahr}} €
 *    Stromkosten pro Jahr" / "Aktueller Bezug, volle Marktabhängigkeit".
 *  - Text 7/8 — "Mit PV: ca. {{stromkosten_mit_pv_eur_jahr}} €
 *    Stromkosten pro Jahr" / "Nach PV-Lieferung, fixer PV-Strompreis
 *    {{pv_verkauf_ct_kwh}} ct/kWh".
 *  - Text 10/11 — "Jährliche Reduktion der Stromkosten: ca.
 *    {{ersparnis_pro_jahr_eur}} €" / "Direkte Einsparung durch
 *    PV-Stromlieferung".
 *  - Text 13/14 — "Ihre Vorteile wenn Sie den Pachtvertrag inklusive
 *    eines Stromliefervertrags umsetzen." / "Wirtschaftlicher und
 *    planbarer Energiebezug".
 */
export default function Slide14Vergleich({ data }: { data: StudyDocumentData }) {
  const customerName = customerDisplayName(data.customer);
  const ohnePv = formatEurNumber(data.derived.stromkostenOhnePvEurJahr);
  const mitPv = formatEurNumber(data.derived.stromkostenMitPvEurJahr);
  const ersparnisJahr = formatEurNumber(data.derived.ersparnisProJahr);
  const pvCt = formatCentPerKwh(Number(data.study.pvVerkaufEurKwh) * 100).replace(" ct/kWh", "");

  return (
    <SlideFrame slideNumber={14} customerLabel={customerName}>
      <div className="flex h-full flex-col gap-5">
        {/* Headline + Subtitle */}
        <div className="space-y-1">
          <h2 className="text-[28px] font-bold text-forest-green">Vergleich: Mit PV vs. Ohne PV</h2>
          <p className="text-[18px] text-foreground">
            Jährliche Stromkosten und direkte Einsparung
          </p>
        </div>

        {/* Two columns: Ohne / Mit PV */}
        <div className="grid grid-cols-2 gap-6">
          <div className="rounded-xl border-2 border-forest-green p-6">
            <div className="text-[20px] font-bold text-forest-green">
              Ohne PV: <span className="tabular-nums">ca. {ohnePv}</span> € Stromkosten pro Jahr
            </div>
            <p className="mt-2 text-[16px] leading-[1.4] text-foreground">
              Aktueller Bezug, volle Marktabhängigkeit
            </p>
          </div>
          <div className="rounded-xl border-2 border-plant-green bg-plant-green-50 p-6">
            <div className="text-[20px] font-bold text-plant-green">
              Mit PV: <span className="tabular-nums">ca. {mitPv}</span> € Stromkosten pro Jahr
            </div>
            <p className="mt-2 text-[16px] leading-[1.4] text-foreground">
              Nach PV-Lieferung, fixer PV-Strompreis <span className="tabular-nums">{pvCt}</span>{" "}
              ct/kWh
            </p>
          </div>
        </div>

        {/* Reduktion-Block */}
        <div className="rounded-xl bg-muted-lime-100 p-6">
          <div className="text-[24px] font-bold text-plant-green">
            Jährliche Reduktion der Stromkosten:{" "}
            <span className="tabular-nums">ca. {ersparnisJahr} €</span>
          </div>
          <p className="mt-1 text-[16px] text-foreground">
            Direkte Einsparung durch PV-Stromlieferung
          </p>
        </div>

        {/* Closing */}
        <div className="mt-auto rounded-xl bg-forest-green p-6 text-white">
          <div className="text-[20px] font-bold">
            Ihre Vorteile wenn Sie den Pachtvertrag inklusive eines Stromliefervertrags umsetzen.
          </div>
          <p className="mt-2 text-[16px]">Wirtschaftlicher und planbarer Energiebezug</p>
        </div>
      </div>
    </SlideFrame>
  );
}
