import { customerDisplayName, formatIntegerDe } from "../format";
import type { StudyDocumentData } from "../types";
import { SlideFrame } from "./_components/slide-frame";

/**
 * Slide 10 — "PV-Anlagenkonzept: Dachbelegung und Eignung".
 *
 * Treue Reproduktion (Pivot-2b PASS 2, siehe DECISIONS 2026-06-02).
 *
 * **Pass-2-Korrektur (Q8 User-Antwort):** Modul-Info-Phrase folgt dem
 * Original-PDF-Format: `{{anlage_kwp}} kWp, {{modul_anzahl}} Module,
 * {{modul_flaeche_m2}} m²` — Komma-Trennung, kein „Modulfläche"-Wort.
 * Auch Karten weiß statt `bg-muted-lime-50` (analog Q6 für Slide 8).
 *
 * Statische Texte wörtlich aus dem PPTX (siehe `template-content.json`
 * Slide 10):
 *
 *  - Text 0 — "PV-Anlagenkonzept: Dachbelegung und Eignung*".
 *  - Text 1 — "Für {{customer_object_name}} – {{anlage_kwp}} kWp,
 *    technisch geeignet".
 *  - 4 nummerierte Tiles:
 *     1. "Gesamtleistung: {{modul_info_phrase}}" / "Detaillierte Modul-
 *        und Wechselrichteraufteilung"
 *     2. "Keine relevanten Verschattungen" / "Dachflächen technisch sehr
 *        gut geeignet für PV"
 *     3. "Hoher spezifischer Ertrag und stabile Prognose" / "Ergebnis
 *        basiert auf bisheriger Simulation und gelieferten Dokumenten"
 *     4. "Wahlweise mit Speicher" / "Sofern die Gesamtkalkulation dies
 *        rechenbar macht. Feststellung in Phase II. Mehr Eigenverbrauch,
 *        dadurch höhere Einsparung"
 *  - Footnote (Text 18) — "*Geplant durch PV-Sol".
 *
 * `{{modul_info_phrase}}` wird aus Anlagengröße + Modulanzahl + Modulfläche
 * zusammengesetzt; fehlende Felder werden weggelassen (Defekt-D-Pattern).
 */
export default function Slide10PVAnlagenkonzept({ data }: { data: StudyDocumentData }) {
  const customerName = customerDisplayName(data.customer);
  const objectName = data.study.objectName;
  const anlageKwp = formatIntegerDe(Number(data.study.anlageKwp));

  // Modul-Info-Phrase (Q8): Format „X kWp, Y Module, Z m²" mit
  // Komma-Trennung und ohne das Wort „Modulfläche". Fehlende Felder
  // werden weggelassen (Defekt-D-Pattern: nie Lücken-Komma stehen
  // lassen).
  const phraseParts: string[] = [`${anlageKwp} kWp`];
  if (data.study.modulAnzahl !== null) {
    phraseParts.push(`${formatIntegerDe(data.study.modulAnzahl)} Module`);
  }
  if (data.study.modulFlaecheM2 !== null) {
    phraseParts.push(`${formatIntegerDe(Number(data.study.modulFlaecheM2))} m²`);
  }
  const modulInfoPhrase = phraseParts.join(", ");

  const tiles = [
    {
      no: "1",
      head: <>Gesamtleistung: {modulInfoPhrase}</>,
      body: "Detaillierte Modul- und Wechselrichteraufteilung",
    },
    {
      no: "2",
      head: "Keine relevanten Verschattungen",
      body: "Dachflächen technisch sehr gut geeignet für PV",
    },
    {
      no: "3",
      head: "Hoher spezifischer Ertrag und stabile Prognose",
      body: "Ergebnis basiert auf bisheriger Simulation und gelieferten Dokumenten",
    },
    {
      no: "4",
      head: "Wahlweise mit Speicher",
      body: "Sofern die Gesamtkalkulation dies rechenbar macht. Feststellung in Phase II. Mehr Eigenverbrauch, dadurch höhere Einsparung",
    },
  ];

  return (
    <SlideFrame slideNumber={10} customerLabel={customerName}>
      <div className="flex h-full flex-col gap-5">
        {/* Headline + Subtitle */}
        <div className="space-y-1">
          <h2 className="text-[28px] font-extrabold text-forest-green">
            PV-Anlagenkonzept: Dachbelegung und Eignung*
          </h2>
          <p className="text-[18px] text-foreground">
            Für <span className="font-bold">{objectName}</span> –{" "}
            <span className="font-bold tabular-nums text-plant-green">{anlageKwp} kWp</span>,
            technisch geeignet
          </p>
        </div>

        {/* 4 tiles 2x2 */}
        <div className="grid flex-1 grid-cols-2 gap-5">
          {tiles.map((t) => (
            <div
              key={t.no}
              className="rounded-xl border border-muted-lime-300 bg-white p-5 text-[16px] leading-[1.4]"
            >
              <div className="flex items-start gap-3">
                <div className="text-[36px] font-bold tabular-nums leading-none text-plant-green">
                  {t.no}
                </div>
                <div>
                  <div className="text-[18px] font-bold text-forest-green">{t.head}</div>
                  <p className="mt-1 text-foreground">{t.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footnote */}
        <p className="text-[12px] italic text-forest-green opacity-70">*Geplant durch PV-Sol</p>
      </div>
    </SlideFrame>
  );
}
