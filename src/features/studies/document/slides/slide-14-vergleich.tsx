import { customerDisplayName, formatEurNumber, formatNumberDe2 } from "../format";
import type { StudyDocumentData } from "../types";
import { SlideFrame } from "./_components/slide-frame";

/**
 * Slide 14 — "Vergleich: Mit PV vs. Ohne PV".
 *
 * Treue Reproduktion (Pivot-2c FINALE, siehe DECISIONS 2026-06-04).
 *
 * **Pivot-2c Komplett-Rewrite (2026-06-04 User-Korrektur Q17):** Der
 * PASS-3-SVG-Balkendiagramm-Versuch wird verworfen — User hat sich nach
 * Verifikation gegen `original-slide-14.png` doch für das ursprüngliche
 * PPTX-Layout entschieden: **horizontales 4-Zeilen-Listen-Layout links
 * (60-65%) + Roof-Foto rechts (35-40%)**.
 *
 * Vier Zeilen:
 *  1. **Ohne PV** — `formatEur(stromkostenOhnePv)` (forest-green bold)
 *  2. **Mit PV** — `formatEur(stromkostenMitPv)` mit fixem PV-Strompreis
 *  3. **Jährliche Reduktion der Stromkosten** — `formatEur(ersparnisProJahr)`
 *  4. **Vorteils-Statement** — „Ihre Vorteile wenn Sie den Pachtvertrag
 *     inklusive eines Stromliefervertrags umsetzen." (forest-green bold,
 *     KEIN separater dunkelgrüner Footer-Block — Teil der Liste)
 *
 * Foto rechts: `pptx-slide14-image1.png` aus dem PPTX-Asset-Pool,
 * `object-cover` mit fester Aspect-Ratio.
 *
 * **Pivot-2c A3-Fix:** `formatNumberDe2()` statt
 * `formatCentPerKwh(...).replace(" ct/kWh", "")` — die alte Variante hat
 * den NBSP-Suffix nie gestrippt (Needle war reguläres Space), Resultat war
 * vorher „22,00 ct/kWh ct/kWh".
 *
 * Statische Texte wörtlich aus dem PPTX (siehe `template-content.json`
 * Slide 14):
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
  const pvCtRaw = formatNumberDe2(Number(data.study.pvVerkaufEurKwh) * 100);

  return (
    <SlideFrame slideNumber={14} customerLabel={customerName}>
      <div className="flex h-full flex-col gap-6">
        {/* Headline + Subtitle */}
        <div className="space-y-1">
          <h2 className="text-[32px] font-bold text-forest-green">Vergleich: Mit PV vs. Ohne PV</h2>
          <p className="text-[20px] text-foreground">
            Jährliche Stromkosten und direkte Einsparung
          </p>
        </div>

        {/* Two-column body: 4-Zeilen-Listen-Layout links (65%) + Foto rechts (35%) */}
        <div className="grid flex-1 grid-cols-[65fr_35fr] gap-10">
          {/* Linke Hälfte: horizontale 4-Zeilen-Liste */}
          <ol className="flex flex-col justify-around gap-5">
            <li>
              <div className="text-[22px] font-bold text-forest-green">
                Ohne PV: ca. <span className="tabular-nums text-link">{ohnePv} €</span> Stromkosten
                pro Jahr
              </div>
              <p className="mt-1 text-[16px] leading-[1.4] text-foreground">
                Aktueller Bezug, volle Marktabhängigkeit
              </p>
            </li>
            <li>
              <div className="text-[22px] font-bold text-forest-green">
                Mit PV: ca. <span className="tabular-nums text-plant-green">{mitPv} €</span>{" "}
                Stromkosten pro Jahr
              </div>
              <p className="mt-1 text-[16px] leading-[1.4] text-foreground">
                Nach PV-Lieferung, fixer PV-Strompreis{" "}
                <span className="tabular-nums">{pvCtRaw}</span> ct/kWh
              </p>
            </li>
            <li>
              <div className="text-[22px] font-bold text-forest-green">
                Jährliche Reduktion der Stromkosten: ca.{" "}
                <span className="tabular-nums text-plant-green">{ersparnisJahr} €</span>
              </div>
              <p className="mt-1 text-[16px] leading-[1.4] text-foreground">
                Direkte Einsparung durch PV-Stromlieferung
              </p>
            </li>
            <li>
              <div className="text-[20px] font-bold text-forest-green">
                Ihre Vorteile wenn Sie den Pachtvertrag inklusive eines Stromliefervertrags
                umsetzen.
              </div>
              <p className="mt-1 text-[16px] leading-[1.4] text-foreground">
                Wirtschaftlicher und planbarer Energiebezug
              </p>
            </li>
          </ol>

          {/* Rechte Hälfte: Roof-Foto aus PPTX-Asset-Pool */}
          <div className="flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/pptx-slide14-image1.png"
              alt="PV-Anlage auf Dach"
              className="h-full max-h-[700px] w-full rounded-xl object-cover"
            />
          </div>
        </div>
      </div>
    </SlideFrame>
  );
}
