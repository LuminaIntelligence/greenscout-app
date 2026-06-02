import { customerDisplayName, formatCentPerKwh, formatEurNumber, formatIntegerDe } from "../format";
import type { StudyDocumentData } from "../types";
import { ImageSlot } from "./_components/image-slot";
import { SlideFrame } from "./_components/slide-frame";

/**
 * Slide 5 — "Vorher - Nachher".
 *
 * Treue Reproduktion (Pivot-2b PASS 2, siehe DECISIONS 2026-06-02).
 *
 * **Pass-2-Korrektur (Q4 User-Antwort):** Die Footnotes wurden in Pass 1
 * verdichtet — User-Direktive ist „voller PPTX-Wortlaut, Reproduktion
 * nicht Verdichtung". Die dritte Footnote endet jetzt mit „…zzgl.
 * Stromsteuer" (laut Pass-2-Extract-JSON Slide 5 Textfeld 9). Schriftgröße
 * bleibt 11pt (innerhalb der 9-10pt-Toleranz der User-Antwort).
 *
 * Statische Texte wörtlich aus dem PPTX (siehe `template-content.json`
 * Slide 5):
 *  - Textfeld 19 (Title) — "Vorher - Nachher".
 *  - Textfeld 7 — "Jetzt:" Spalten-Header.
 *  - Textfeld 1 — "Später:" Spalten-Header.
 *  - Textfeld 13 — "Pachtzahlung vorab*  ca. {{pacht_einnahme_einmalig_eur}}
 *    EUR netto**  einmalige Pachtzahlung für 20 Jahre".
 *  - Textfeld 15 — "Stromliefervertrag***: Direkter Bezug aus der PV-Anlage
 *    ca. {{pv_eigenverbrauch_kwh_gesamt_vertragslaufzeit}} kWh** laut PV-SOL".
 *  - Textfeld 11 — "{{pv_verkauf_ct_kwh}} CENT netto / kWh
 *    Einsparpotential gegenüber dem heutigen Stromlieferanten
 *    ca. {{ersparnis_gesamt_vertragslaufzeit_eur}} €** für 20 Jahre".
 *  - Textfeld 9 (Footnote, lang) — voller PPTX-Wortlaut, alle drei
 *    Sterne (*, **, ***), Endung „…zzgl. Stromsteuer".
 *
 * Bilder: BEFORE links ("Jetzt:"), AFTER rechts ("Später:"). Beide mit
 * identischer Bounding-Box via ImageSlot.
 */
export default function Slide05VorherNachher({ data }: { data: StudyDocumentData }) {
  const customerName = customerDisplayName(data.customer);
  const pacht = formatEurNumber(data.derived.pachtEinnahmeEinmalig);
  const eigenverbrauchGesamt = formatIntegerDe(
    data.derived.pvEigenverbrauchKwhGesamtVertragslaufzeit,
  );
  const pvVerkaufCt = formatCentPerKwh(Number(data.study.pvVerkaufEurKwh) * 100).replace(
    " ct/kWh",
    "",
  );
  const ersparnis20 = formatEurNumber(data.derived.ersparnis20Jahre);

  return (
    <SlideFrame slideNumber={5} customerLabel={customerName}>
      <div className="flex h-full flex-col gap-4">
        {/* Headline (Textfeld 19) */}
        <h2 className="text-[28px] font-bold text-forest-green">Vorher - Nachher</h2>

        {/* Two-column layout: Jetzt / Später */}
        <div className="grid flex-1 grid-cols-2 gap-12">
          {/* Left — Jetzt */}
          <div className="flex flex-col gap-4">
            <div className="text-[24px] font-bold text-forest-green">Jetzt:</div>
            <ImageSlot
              src={data.images.beforeUrl}
              alt="Dach vor PV-Installation"
              emptyLabel="Vorher-Bild fehlt"
              aspectClassName="aspect-[16/9]"
            />
            <div className="rounded-xl bg-muted-lime-50 p-6 text-[18px] leading-[1.4] text-foreground">
              <div className="font-bold">Pachtzahlung vorab*</div>
              <div className="mt-1 text-[24px] font-bold tabular-nums text-plant-green">
                ca. {pacht} EUR netto**
              </div>
              <div className="mt-1">einmalige Pachtzahlung für 20 Jahre</div>
            </div>
          </div>

          {/* Right — Später */}
          <div className="flex flex-col gap-4">
            <div className="text-[24px] font-bold text-forest-green">Später:</div>
            <ImageSlot
              src={data.images.afterUrl}
              alt="Dach mit installierter PV-Anlage"
              emptyLabel="Nachher-Bild fehlt"
              aspectClassName="aspect-[16/9]"
            />
            <div className="rounded-xl bg-plant-green-50 p-6 text-[18px] leading-[1.4] text-foreground">
              <div className="font-bold">
                Stromliefervertrag***: Direkter Bezug aus der PV-Anlage
              </div>
              <div className="mt-1 text-[20px] tabular-nums">
                ca. {eigenverbrauchGesamt} kWh** laut PV-SOL
              </div>
              <div className="mt-3 text-[24px] font-bold tabular-nums text-plant-green">
                {pvVerkaufCt} CENT netto / kWh
              </div>
              <div className="mt-1">Einsparpotential gegenüber dem heutigen Stromlieferanten</div>
              <div className="mt-1 text-[20px] font-bold tabular-nums">
                ca. {ersparnis20} €** für 20 Jahre
              </div>
            </div>
          </div>
        </div>

        {/* Footnote (Textfeld 9) — vollständiger PPTX-Wortlaut (Q4-Korrektur:
            keine Verdichtung, alle drei Footnotes im Original-Wortlaut). */}
        <div className="text-[11px] leading-[1.4] text-foreground opacity-70">
          * Nach Zeichnung Verkauf des zu entwickelnden Projektrechtes - Pachtkonditionen 100 EUR je
          kWp zzgl. USt. Laufzeit 20 Jahre (5 m² nutzbare Fläche = 1 kWp) (Verlängerung optional 2x
          5 Jahre) Umsetzung, Betrieb, Wartung vorbehaltlich der Prüfung Phase II
          <br />
          ** Werte basieren auf der realitätsnahen Simulation von PV-Sol, siehe Anhang.
          <br />
          *** Abnahme PV-Strom fester Strompreis über 20 Jahre ohne weitere Umlagen zzgl.
          Stromsteuer
        </div>
      </div>
    </SlideFrame>
  );
}
