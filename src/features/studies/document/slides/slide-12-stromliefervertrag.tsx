import { customerDisplayName, formatCentPerKwh, formatEurNumber, formatIntegerDe } from "../format";
import type { StudyDocumentData } from "../types";
import { SlideFrame } from "./_components/slide-frame";

/**
 * Slide 12 — "Wirtschaftlichkeit: Stromliefervertrag".
 *
 * Treue Reproduktion (Pivot-2b). Statische Texte wörtlich aus dem PPTX
 * (siehe `template-content.json` Slide 12):
 *
 *  - Text 0 — "Wirtschaftlichkeit: Stromliefervertrag".
 *  - Text 1 — "PV-Strom {{pv_verkauf_ct_kwh}} ct/kWh vs. Netzstrom
 *    {{versorger_preis_ct_kwh}} ct/kWh – Jährliche und 20-jährige
 *    Kundenvorteile".
 *  - Text 3 — "PV-Strompreis: {{pv_verkauf_ct_kwh}} ct/kWh fix".
 *  - Text 4 — "20 Jahre Stromliefervertrag ohne Investitionskosten
 *    abgesichert durch das EEG*".
 *  - Text 6 — "Netzstrompreis: {{versorger_preis_ct_kwh}} ct/kWh aktuell".
 *  - Text 7 — "Marktabhängiger Bezugspreis".
 *  - Text 9 — "Direkte jährliche Ersparnis: ca.
 *    {{ersparnis_pro_jahr_eur}} € 20 Jahre: ca.
 *    {{ersparnis_gesamt_vertragslaufzeit_eur}} €".
 *  - Text 10 — "Differenz bei Eigenverbrauch
 *    ({{pv_eigenverbrauch_kwh_jahr}} kWh/Jahr)".
 *  - Text 12 — "Kundenvorteile: keine Investitionskosten, planbar".
 *  - Text 13 — "Fixer Preis sorgt für Kostenstabilität".
 *  - Text 15 — "Zusammengefasst: sofortige jährliche Entlastung der
 *    Energiekosten – Sofortige Einsparung ab Jahr 1 – ein
 *    Stromliefervertrag wird dringend empfohlen.".
 *  - Text 12 (Footnote) — "*Durch das Erneuerbare-Energien-Gesetz (EEG)
 *    ist die Sicherheit des Gesamtkonzeptes staatlich garantiert".
 */
export default function Slide12Stromliefervertrag({ data }: { data: StudyDocumentData }) {
  const customerName = customerDisplayName(data.customer);
  const pvCt = formatCentPerKwh(Number(data.study.pvVerkaufEurKwh) * 100).replace(" ct/kWh", "");
  const versorgerCt = formatCentPerKwh(Number(data.study.versorgerPreisEurKwh) * 100).replace(
    " ct/kWh",
    "",
  );
  const ersparnisJahr = formatEurNumber(data.derived.ersparnisProJahr);
  const ersparnis20 = formatEurNumber(data.derived.ersparnis20Jahre);
  const pvEigenverbrauch = formatIntegerDe(Number(data.study.pvEigenverbrauchKwhJahr));

  return (
    <SlideFrame slideNumber={12} customerLabel={customerName}>
      <div className="flex h-full flex-col gap-4">
        {/* Headline + Subtitle */}
        <div className="space-y-1">
          <h2 className="text-[28px] font-bold text-forest-green">
            Wirtschaftlichkeit: Stromliefervertrag
          </h2>
          <p className="text-[18px] text-foreground">
            PV-Strom <span className="font-bold tabular-nums">{pvCt}</span> ct/kWh vs. Netzstrom{" "}
            <span className="font-bold tabular-nums">{versorgerCt}</span> ct/kWh – Jährliche und
            20-jährige Kundenvorteile
          </p>
        </div>

        {/* Two columns: PV vs Netz */}
        <div className="grid grid-cols-2 gap-6">
          <div className="rounded-xl border-2 border-plant-green bg-plant-green-50 p-5">
            <div className="text-[20px] font-bold text-plant-green">
              PV-Strompreis: <span className="tabular-nums">{pvCt}</span> ct/kWh fix
            </div>
            <p className="mt-2 text-[16px] leading-[1.4] text-foreground">
              20 Jahre Stromliefervertrag ohne Investitionskosten abgesichert durch das EEG*
            </p>
          </div>
          <div className="rounded-xl border-2 border-forest-green p-5">
            <div className="text-[20px] font-bold text-forest-green">
              Netzstrompreis: <span className="tabular-nums">{versorgerCt}</span> ct/kWh aktuell
            </div>
            <p className="mt-2 text-[16px] leading-[1.4] text-foreground">
              Marktabhängiger Bezugspreis
            </p>
          </div>
        </div>

        {/* Ersparnis-Block */}
        <div className="rounded-xl bg-muted-lime-50 p-5">
          <div className="text-[18px] font-bold text-forest-green">
            Direkte jährliche Ersparnis:{" "}
            <span className="text-plant-green">ca. {ersparnisJahr} €</span>
            {" · "}
            20 Jahre: <span className="text-plant-green">ca. {ersparnis20} €</span>
          </div>
          <p className="mt-1 text-[15px] text-foreground">
            Differenz bei Eigenverbrauch ({pvEigenverbrauch} kWh/Jahr)
          </p>
        </div>

        {/* Kundenvorteile */}
        <div className="grid flex-1 grid-cols-2 gap-6">
          <div className="rounded-xl bg-white p-5 ring-1 ring-muted-lime-300">
            <div className="text-[18px] font-bold text-forest-green">
              Kundenvorteile: keine Investitionskosten, planbar
            </div>
            <p className="mt-2 text-[16px] leading-[1.4] text-foreground">
              Fixer Preis sorgt für Kostenstabilität
            </p>
          </div>
          <div className="rounded-xl bg-forest-green p-5 text-white">
            <p className="text-[18px] font-bold leading-[1.4]">
              Zusammengefasst: sofortige jährliche Entlastung der Energiekosten – Sofortige
              Einsparung ab Jahr 1 – ein Stromliefervertrag wird dringend empfohlen.
            </p>
          </div>
        </div>

        {/* Footnote */}
        <p className="text-[12px] italic text-forest-green opacity-70">
          *Durch das Erneuerbare-Energien-Gesetz (EEG) ist die Sicherheit des Gesamtkonzeptes
          staatlich garantiert
        </p>
      </div>
    </SlideFrame>
  );
}
