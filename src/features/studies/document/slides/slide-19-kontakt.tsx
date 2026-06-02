import { consultantFullName, customerDisplayName, formatTerminDe } from "../format";
import type { StudyDocumentData } from "../types";
import { SlideFrame } from "./_components/slide-frame";

/**
 * Slide 19 — "So geht es weiter!" Kontaktseite.
 *
 * Treue Reproduktion (Pivot-2b). Statische Texte wörtlich aus dem PPTX
 * (siehe `template-content.json` Slide 19):
 *
 *  - Text 0 — "So geht es weiter!".
 *  - Text 2 (Headline rechts) — "Fachstelle Flächenprüfung".
 *  - Text 3 — "Zur weiteren Planung und Vorbereitung, sowie Abstimmung
 *    Ihrer Fragen zu dieser Machbarkeitsstudie, vereinbaren wir einen
 *    Termin. Wir hätten folgenden zwei Vorschläge für Sie:
 *    {{termin_1_phrase}}{{termin_oder_phrase}}{{termin_2_phrase}}".
 *  - Text 4 — "Telefon: +49 172 3794240".
 *  - Text 5 — "E-Mail: projektberatung@greenscout-ev.de".
 *  - Text 6 — "Adresse: GreenScout eV - Utechter Str. 5 - 19217 Utecht".
 *  - Text 7 — "Wir melden uns bei Ihnen!".
 *  - Text 2 (Berater-Name) — "{{consultant_full_name}}".
 *  - Text 2 (Kontaktdaten-Label) — "Unsere Kontaktdaten:".
 *  - Textfeld 1 — "Zusätzlich zu dieser Machbarkeitsstudie erhalten Sie
 *    von uns: die PV-Sol, den Pacht- und den Stromliefervertrag".
 *  - Textfeld 12 — "GreenScout e.V."
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
        <h2 className="text-[36px] font-bold text-forest-green">So geht es weiter!</h2>

        {/* Two columns */}
        <div className="grid flex-1 grid-cols-2 gap-10">
          {/* Left — Fachstelle Flächenprüfung */}
          <div className="rounded-xl bg-muted-lime-50 p-6">
            <div className="text-[22px] font-bold text-plant-green">Fachstelle Flächenprüfung</div>
            <div className="mt-4 text-[16px] leading-[1.5] text-foreground">
              <p>
                Zur weiteren Planung und Vorbereitung, sowie Abstimmung Ihrer Fragen zu dieser
                Machbarkeitsstudie, vereinbaren wir einen Termin. Wir hätten folgenden zwei
                Vorschläge für Sie:
              </p>
              {hatTermine ? (
                <div className="mt-4 space-y-2 text-[16px] font-bold text-forest-green">
                  {t1 ? (
                    <div>
                      <span className="text-plant-green">1)</span> {t1Label}
                    </div>
                  ) : null}
                  {t1 && t2 ? <div className="text-foreground">oder</div> : null}
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
          </div>

          {/* Right — Kontaktdaten */}
          <div className="flex flex-col rounded-xl bg-forest-green p-6 text-white">
            <div className="text-[22px] font-bold">Unsere Kontaktdaten:</div>
            <div className="mt-4 space-y-2 text-[16px]">
              <div>Telefon: +49 172 3794240</div>
              <div>E-Mail: projektberatung@greenscout-ev.de</div>
              <div>Adresse: GreenScout eV - Utechter Str. 5 - 19217 Utecht</div>
            </div>
            <div className="mt-auto pt-6">
              <div className="text-[18px] font-bold">{consultant}</div>
              <div className="mt-2 text-[14px] opacity-80">GreenScout e.V.</div>
            </div>
            <div className="mt-3 text-[20px] font-bold">Wir melden uns bei Ihnen!</div>
          </div>
        </div>

        {/* Bottom note (Textfeld 1) */}
        <div className="rounded-xl bg-plant-green-50 p-4 text-[16px] leading-[1.4] text-foreground">
          Zusätzlich zu dieser Machbarkeitsstudie erhalten Sie von uns: die PV-Sol, den Pacht- und
          den Stromliefervertrag
        </div>
      </div>
    </SlideFrame>
  );
}
