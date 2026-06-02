import { buildObjectAddress, customerDisplayName } from "../format";
import type { StudyDocumentData } from "../types";
import { SlideFrame } from "./_components/slide-frame";

/**
 * Slide 2 — "Herzlichen Glückwunsch Ihre Fläche ist umsetzbar!"
 *
 * Treue Reproduktion (Pivot-2b). Statische Texte wörtlich aus dem PPTX
 * (siehe `template-content.json` Slide 2):
 *
 * - Textfeld 11 (14pt) — Tagline oben.
 * - Text 0 (24pt) — Headline "Herzlichen Glückwunsch Ihre Fläche ist
 *   umsetzbar!"
 * - Textfeld 4 (16pt bold) — Customer-Object-Adresse + Flurstück-Phrase.
 * - Textfeld 12 (20pt bold, paragraph-getrennt) — drei Absätze
 *   "Unsere Auswertung..." / "in die Phase II übergehen können." /
 *   "Entnehmen Sie die genaueren Erklärungen den folgenden Seiten!"
 */
export default function Slide02Glueckwunsch({ data }: { data: StudyDocumentData }) {
  const customerName = customerDisplayName(data.customer);
  const address = buildObjectAddress(
    data.study.objectName,
    data.study.objectAddress,
    data.study.objectZipCode,
    data.study.objectCity,
  );
  const flurstueck =
    data.study.flurstueck && data.study.flurstueck.trim().length > 0
      ? `in Flurstück ${data.study.flurstueck}`
      : "";

  return (
    <SlideFrame slideNumber={2} customerLabel={customerName}>
      <div className="flex h-full flex-col gap-10 py-4">
        {/* Tagline (Textfeld 11, 14pt) */}
        <div className="text-[14px] text-foreground">
          Flächen bewerten, Entscheidung treffen, Einnahmen ohne eigene Investitionen
        </div>

        {/* Headline (Text 0, 24pt) */}
        <h2 className="text-[24px] font-normal text-forest-green">
          Herzlichen Glückwunsch Ihre Fläche ist umsetzbar!
        </h2>

        {/* Address line (Textfeld 4, 16pt bold) */}
        <p className="text-[16px] font-bold text-foreground">
          {address} {flurstueck}
        </p>

        {/* Body block (Textfeld 12, 20pt bold) */}
        <div className="space-y-6 text-[20px] font-bold leading-[1.45] text-foreground">
          <p>
            Unsere Auswertung hat ergeben, dass wir nach Abstimmung mit Ihnen, in die Phase II
            übergehen können.
          </p>
          <p>Entnehmen Sie die genaueren Erklärungen den folgenden Seiten!</p>
        </div>
      </div>
    </SlideFrame>
  );
}
