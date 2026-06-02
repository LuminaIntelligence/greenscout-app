import { consultantFullName, customerDisplayName } from "../format";
import type { StudyDocumentData } from "../types";
import { SlideFrame } from "./_components/slide-frame";

/**
 * Slide 1 — Deckblatt "Ihr Ergebnis".
 *
 * Treue Reproduktion (Pivot-2b PASS 2, siehe DECISIONS 2026-06-02).
 *
 * **Pass-2-Korrektur (Q1 User-Antwort):** Die Tagline „Flächen bewerten,
 * Entscheidung treffen, Einnahmen ohne eigene Investitionen" gehört
 * **direkt unter den GreenScout-Schriftzug als Subtitle der Marken-
 * Einheit** — nicht oben links, nicht unter „Ihr Ergebnis", sondern als
 * gebundene Subtitle der Brand-Lockup-Einheit. Die PPTX-Mittenkoordinate
 * für das Tagline-Textfeld ist irreführend gegenüber dem visuellen
 * Original-PDF.
 *
 * **Weitere Pass-2-Korrekturen aus visueller Verifikation gegen
 * original-slide-01.png:**
 *  - Background: forest-green (statt weiß).
 *  - Hero-Lockup zentriert: "GreenScout e.V." Schriftzug in weiß +
 *    Tagline darunter in weiß.
 *  - "Ihr Ergebnis" zentriert weiß bold.
 *  - "Eingereicht über..." unten rechts in weiß; "Berater"-Name in
 *    Akzent-Rot (#CC3366 = SPEC §8.1 link-Farbe).
 *
 * Statische Texte wörtlich aus dem PPTX (siehe `template-content.json`
 * Slide 1):
 *  - Textfeld 6 (24pt) — Tagline-Zeile.
 *  - Textfeld 7 (80pt bold) — Hero "Ihr Ergebnis".
 *  - Textfeld 3 (16pt bold) — "Eingereicht über {{consultant_full_name}}
 *    / direkt vom Unternehmen".
 *
 * `showFooter={false}`: das Deckblatt hat keinen Slide-Footer — im
 * Original-PPTX trägt es nur das eigene Layout.
 */
export default function Slide01Cover({ data }: { data: StudyDocumentData }) {
  const customerName = customerDisplayName(data.customer);
  const consultant = consultantFullName(data.consultant);

  return (
    <SlideFrame
      slideNumber={1}
      customerLabel={customerName}
      showFooter={false}
      frameClassName="bg-forest-green text-white"
      contentClassName="text-white"
    >
      <div className="flex h-full flex-col items-center justify-between py-12">
        {/* Hero brand lockup — GreenScout-Schriftzug + Tagline als visuelle Einheit */}
        <div className="mt-12 flex flex-col items-center gap-3">
          {/* Brand wordmark (Logo-Asset fehlt im Asset-Pool — Text-Lockup als
              treuer Stand-in für den visuellen "GreenScout e.V."-Schriftzug
              aus dem PPTX). */}
          <div className="font-[var(--font-gabarito-heading),system-ui,sans-serif] text-[72px] font-semibold leading-none text-white">
            GreenScout e.V.
            <span className="ml-1 align-top text-[20px]">®</span>
          </div>
          {/* Tagline als direkte Subtitle der Marken-Einheit (Q1-Korrektur) */}
          <div className="text-[24px] font-normal text-white">
            Flächen bewerten, Entscheidung treffen, Einnahmen ohne eigene Investitionen
          </div>
        </div>

        {/* Center — Hero "Ihr Ergebnis" + Customer/Object identification */}
        <div className="flex flex-col items-center gap-8">
          <h1 className="font-[var(--font-gabarito-heading),system-ui,sans-serif] text-[120px] font-semibold leading-none text-white">
            Ihr Ergebnis
          </h1>
          <div className="space-y-1 text-center">
            <div className="text-[28px] font-semibold text-white">{customerName}</div>
            <div className="text-[20px] text-white opacity-90">{data.study.objectName}</div>
          </div>
        </div>

        {/* Bottom — "Eingereicht über <consultant> / direkt vom Unternehmen" */}
        <div className="self-end text-[16px] font-bold text-white">
          Eingereicht über <span className="text-link">{consultant}</span> / direkt vom Unternehmen
        </div>
      </div>
    </SlideFrame>
  );
}
