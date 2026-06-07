import { consultantFullName, customerDisplayName } from "../format";
import type { StudyDocumentData } from "../types";
import { BrandMark } from "./_components/brand-mark";
import { SlideFrame } from "./_components/slide-frame";

/**
 * Slide 1 — Deckblatt "Ihr Ergebnis".
 *
 * Treue Reproduktion (Pivot-2c FINALE, siehe DECISIONS 2026-06-04).
 *
 * **Pivot-2c-Korrekturen (2026-06-04) gegen `original-slide-01.png`:**
 *  - **A5 Hintergrund:** Plant-Green (`#6A8F4E`) statt Forest-Green —
 *    Original ist mittel-grünes Sage, nicht dunkelgrünes Forest-Green.
 *  - **A1 Logo lädt jetzt:** Middleware-`/assets/`-Bypass repariert
 *    (siehe `src/middleware.ts`). Das war der eigentliche A1-Bug.
 *  - **Kundenname-Doppelung entfernt:** Pass-3 zeigte erst Company-Name
 *    + dann ObjectName — Original zeigt nur einen Kundennamen unter
 *    der „Ihr Ergebnis"-Headline.
 *  - **Hero-Hierarchie geschärft:** „Ihr Ergebnis" als zentraler Hero
 *    ~120px, direkt darunter der Kundenname als Untertitel.
 *
 * **Pass-3 Q13:** GreenScout-Logo aus dem PPTX-Asset-Pool
 * (`public/assets/greenscout-logo-hero.png`).
 *
 * **Pass-2 Q1:** Tagline „Flächen bewerten…" als direkte Subtitle der
 * Brand-Lockup-Einheit unter dem Wordmark — nicht losgelöst.
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
      showBrandMark={false}
      frameClassName="bg-plant-green text-white"
      contentClassName="text-white"
    >
      <div className="flex h-full flex-col items-center justify-between py-16">
        {/* Hero brand lockup — GreenScout-Wordmark + Tagline als visuelle Einheit */}
        <div className="flex flex-col items-center gap-4">
          {/* Q13-Korrektur: echtes Logo aus dem PPTX-Asset-Pool statt Text-Stand-in. */}
          <BrandMark variant="wordmark" alt="GreenScout e.V." className="h-[180px] w-auto" />
          {/* Tagline als direkte Subtitle der Marken-Einheit (Q1-Korrektur) */}
          <div className="text-[28px] font-normal text-white">
            Flächen bewerten, Entscheidung treffen, Einnahmen ohne eigene Investitionen
          </div>
        </div>

        {/* Center — Hero "Ihr Ergebnis" + Customer/Object identification */}
        <div className="flex flex-col items-center gap-6">
          <h1 className="font-[var(--font-gabarito-heading),system-ui,sans-serif] text-[140px] font-semibold leading-none text-white">
            Ihr Ergebnis
          </h1>
          {/* Pivot-2c: nur ein Kundenname (vorher Doppelung Company + Object). */}
          <div className="text-[32px] font-semibold text-white">{customerName}</div>
        </div>

        {/* Bottom — "Eingereicht über <consultant> / direkt vom Unternehmen" */}
        <div className="self-end text-[18px] font-bold text-white">
          Eingereicht über <span className="text-link">{consultant}</span> / direkt vom Unternehmen
        </div>
      </div>
    </SlideFrame>
  );
}
