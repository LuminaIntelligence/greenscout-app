import { consultantFullName, customerDisplayName, formatTerminDe } from "../format";
import type { StudyDocumentData } from "../types";
import { SlideFrame } from "./_components/slide-frame";

/**
 * Slide 19 — "So geht es weiter!" Kontaktseite.
 *
 * Treue Reproduktion (Pivot-2c FINALE, siehe DECISIONS 2026-06-04).
 *
 * **Pivot-2c-Korrekturen (2026-06-04) gegen `original-slide-19.png`:**
 *  - **A2 Team-Foto:** Rechte Hälfte zeigt jetzt das PPTX-Original-Team-
 *    Foto (`pptx-slide19-image1.png`) statt der dunkelgrünen Kontaktbox.
 *  - **Berater-Name separat:** „Fachstelle Flächenprüfung" + Berater-Name
 *    + GreenScout-Affiliation liegen links oben als separater Block —
 *    nicht mehr verschachtelt in der Kontaktbox.
 *  - **„Wir melden uns bei Ihnen!" als eigenständiger Text** links unter
 *    den Terminen, nicht mehr in der dunklen Box rechts.
 *  - **Kontaktdaten kompakt** unter dem Team-Foto / im Bottom-Bereich.
 *
 * Layout (gegen `original-slide-19.png` abgemessen):
 *
 *   ┌────────────────────────────────────────┐
 *   │ So geht es weiter!                     │
 *   ├──────────────────┬─────────────────────┤
 *   │ Fachstelle …     │                     │
 *   │ Bernd Berater    │   Team-Foto         │
 *   │ GreenScout e.V.  │   (PPTX-Original)   │
 *   │                  │                     │
 *   │ Termin-Text +    │                     │
 *   │ Vorschläge       │                     │
 *   │                  ├─────────────────────┤
 *   │ Wir melden uns!  │ Unsere Kontaktdaten │
 *   │                  │ Telefon / Mail/Addr │
 *   ├──────────────────┴─────────────────────┤
 *   │ Zusätzlich zu dieser Machbarkeitsstudie│
 *   └────────────────────────────────────────┘
 *
 * Statische Texte wörtlich aus dem PPTX (siehe `template-content.json`
 * Slide 19):
 *
 *  - Text 0 — "So geht es weiter!".
 *  - Text 2 (Headline links) — "Fachstelle Flächenprüfung".
 *  - Text 2 (Berater-Name) — "{{consultant_full_name}}".
 *  - Text 2 (GreenScout-Label) — "GreenScout e.V."
 *  - Text 3 — "Zur weiteren Planung und Vorbereitung, sowie Abstimmung
 *    Ihrer Fragen zu dieser Machbarkeitsstudie, vereinbaren wir einen
 *    Termin. Wir hätten folgenden zwei Vorschläge für Sie:
 *    {{termin_1_phrase}}{{termin_oder_phrase}}{{termin_2_phrase}}".
 *  - Text 7 — "Wir melden uns bei Ihnen!".
 *  - Text 2 (Kontaktdaten-Label) — "Unsere Kontaktdaten:".
 *  - Text 4 — "Telefon: +49 172 3794240".
 *  - Text 5 — "E-Mail: projektberatung@greenscout-ev.de".
 *  - Text 6 — "Adresse: GreenScout eV - Utechter Str. 5 - 19217 Utecht".
 *  - Textfeld 1 — "Zusätzlich zu dieser Machbarkeitsstudie erhalten Sie
 *    von uns: die PV-Sol, den Pacht- und den Stromliefervertrag".
 */
export default function Slide19Kontakt({ data }: { data: StudyDocumentData }) {
  const customerName = customerDisplayName(data.customer);
  const consultant = consultantFullName(data.consultant);
  const t1 = data.study.terminVorschlag1;
  const t2 = data.study.terminVorschlag2;
  const t1Label = t1 ? formatTerminDe(t1) : "";
  const t2Label = t2 ? formatTerminDe(t2) : "";

  const hatTermine = Boolean(t1 || t2);

  return (
    <SlideFrame slideNumber={19} customerLabel={customerName}>
      <div className="flex h-full flex-col gap-6">
        {/* Headline (Text 0) */}
        <h2 className="text-[40px] font-bold text-forest-green">So geht es weiter!</h2>

        {/* Two columns: Links (55%) Termine + Berater + Closer
            Rechts (45%) Team-Foto + Kontaktdaten */}
        <div className="grid flex-1 grid-cols-[55fr_45fr] gap-10">
          {/* Linke Spalte */}
          <div className="flex flex-col">
            {/* Berater-Block separat oben links */}
            <div className="space-y-1">
              <div className="text-[20px] font-semibold text-forest-green">
                Fachstelle Flächenprüfung
              </div>
              <div className="text-[24px] font-bold text-link">{consultant}</div>
              <div className="text-[18px] text-foreground">GreenScout e.V.</div>
            </div>

            {/* Termin-Block */}
            <div className="mt-8 text-[16px] leading-[1.5] text-foreground">
              <p>
                Zur weiteren Planung und Vorbereitung, sowie Abstimmung Ihrer Fragen zu dieser
                Machbarkeitsstudie, vereinbaren wir einen Termin.
              </p>
              <p className="mt-2">Wir hätten folgenden zwei Vorschläge für Sie:</p>
              {hatTermine ? (
                <div className="mt-4 space-y-2 text-[16px] font-bold text-forest-green">
                  {t1 ? (
                    <div>
                      <span className="text-plant-green">1)</span> {t1Label}
                    </div>
                  ) : null}
                  {t1 && t2 ? <div className="font-normal text-foreground">oder</div> : null}
                  {t2 ? (
                    <div>
                      <span className="text-plant-green">2)</span> {t2Label}
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="mt-4 italic text-foreground opacity-70">Termin auf Anfrage</p>
              )}
            </div>

            {/* Pivot-2c: Eigenständiger Closer-Text links unter den Terminen,
                nicht mehr in der dunklen Box rechts (Original-PDF-Layout). */}
            <div className="mt-6 text-[22px] font-bold text-plant-green">
              Wir melden uns bei Ihnen!
            </div>
          </div>

          {/* Rechte Spalte: Team-Foto oben + Kontaktdaten darunter */}
          <div className="flex flex-col gap-5">
            {/* Pivot-2c A2: Team-Foto aus PPTX-Asset-Pool. */}
            <div className="overflow-hidden rounded-xl border-4 border-link">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/pptx-slide19-image1.png"
                alt="GreenScout-Team"
                className="aspect-[4/3] w-full object-cover"
              />
            </div>

            {/* Kontaktdaten in eigener Box — Berater-Name NICHT mehr drin. */}
            <div className="mt-2 flex flex-col gap-2 text-[16px] text-foreground">
              <div className="text-[18px] font-bold text-forest-green">Unsere Kontaktdaten:</div>
              <div>
                <span className="font-semibold">Telefon:</span> +49 172 3794240
              </div>
              <div>
                <span className="font-semibold">E-Mail:</span> projektberatung@greenscout-ev.de
              </div>
              <div>
                <span className="font-semibold">Adresse:</span> GreenScout eV - Utechter Str. 5 -
                19217 Utecht
              </div>
            </div>
          </div>
        </div>

        {/* Bottom note (Textfeld 1) */}
        <div className="rounded-xl bg-muted-lime-50 p-4 text-[16px] leading-[1.4] text-foreground">
          Zusätzlich zu dieser Machbarkeitsstudie erhalten Sie von uns:{" "}
          <span className="font-bold">die PV-Sol, den Pacht- und den Stromliefervertrag</span>
        </div>
      </div>
    </SlideFrame>
  );
}
