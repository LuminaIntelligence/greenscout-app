import { consultantFullName, customerDisplayName } from "../format";
import type { StudyDocumentData } from "../types";
import { SlideFrame } from "./_components/slide-frame";

/**
 * Slide 1 — Deckblatt "Ihr Ergebnis".
 *
 * Treue Reproduktion (Pivot-2b, siehe DECISIONS 2026-06-02). Statische
 * Texte wörtlich aus dem PPTX (siehe `template-content.json` Slide 1):
 *
 * - Textfeld 6 (24pt) — Tagline-Zeile.
 * - Textfeld 7 (80pt bold) — Hero "Ihr Ergebnis".
 * - Textfeld 3 (16pt bold) — "Eingereicht über {{consultant_full_name}}
 *   / direkt vom Unternehmen". Der `{{consultant_full_name}}`-Marker
 *   wird durch den realen Berater-Namen ersetzt.
 *
 * Customer-Display-Name + Berater-Name kommen aus den Props.
 * `showFooter={false}`: das Deckblatt hat keinen Slide-Footer (im
 * Original-PPTX trägt es nur das eigene Layout).
 */
export default function Slide01Cover({ data }: { data: StudyDocumentData }) {
  const customerName = customerDisplayName(data.customer);
  const consultant = consultantFullName(data.consultant);

  return (
    <SlideFrame slideNumber={1} customerLabel={customerName} showFooter={false}>
      <div className="flex h-full flex-col justify-between py-8">
        {/* Top — Tagline */}
        <div>
          <div className="text-[24px] font-normal text-foreground">
            Flächen bewerten, Entscheidung treffen, Einnahmen ohne eigene Investitionen
          </div>
        </div>

        {/* Center — Hero "Ihr Ergebnis" + Customer/Object identification */}
        <div className="space-y-10">
          <h1 className="font-[var(--font-gabarito-heading),system-ui,sans-serif] text-[80px] font-semibold leading-[1.05] text-forest-green">
            Ihr Ergebnis
          </h1>
          <div className="space-y-3">
            <div className="slide-h3">{customerName}</div>
            <div className="slide-body-lg text-forest-green-700">{data.study.objectName}</div>
          </div>
        </div>

        {/* Bottom — "Eingereicht über <consultant> / direkt vom Unternehmen" */}
        <div className="text-[16px] font-bold text-foreground">
          Eingereicht über <span className="text-forest-green">{consultant}</span> / direkt vom
          Unternehmen
        </div>
      </div>
    </SlideFrame>
  );
}
