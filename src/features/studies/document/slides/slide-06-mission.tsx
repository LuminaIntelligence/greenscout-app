import { customerDisplayName } from "../format";
import type { StudyDocumentData } from "../types";
import { SlideFrame } from "./_components/slide-frame";

/**
 * Slide 6 — "Dafür stehen wir:" Vier-Quadranten Mission.
 *
 * Treue Reproduktion (Pivot-2b). Statische Texte wörtlich aus dem PPTX
 * (siehe `template-content.json` Slide 6):
 *
 *  - Textfeld 29 (Tagline oben) — "Flächen bewerten, Entscheidung treffen,
 *    Einnahmen ohne eigene Investitionen".
 *  - Text 3 (Headline) — "Dafür stehen wir:".
 *  - Text 6 (Quadrant 1) — "Eigentümer:innen erhalten für Bereitstellung
 *    ihrer Flächen einmalig Pachteinnahmen und 20 Jahre günstigeren und
 *    CO2-neutraleren Strom, ohne selbst zu investieren."
 *  - Text 9 (Quadrant 2) — "Solarunternehmen erhalten skalierbare
 *    Projektpotenziale".
 *  - Text 12 (Quadrant 3 oben) — "Die Gesellschaft profitiert von mehr
 *    sauberer Energie und weniger CO₂-Emissionen".
 *  - Text 9 (Quadrant 4 oben) — "Die Investoren erhalten eine gute
 *    Kapitalrendite für die Investition, welche sie tätigen.".
 *  - Text 12 (Quadrant 5 — EEG-Hinweis) — "Durch das Erneuerbare-
 *    Energien-Gesetz (EEG) ist die Sicherheit des Gesamtkonzeptes
 *    staatlich garantiert".
 */
export default function Slide06Mission({ data }: { data: StudyDocumentData }) {
  const customerName = customerDisplayName(data.customer);

  return (
    <SlideFrame slideNumber={6} customerLabel={customerName}>
      <div className="flex h-full flex-col gap-6">
        {/* Tagline (Textfeld 29) */}
        <div className="text-[14px] text-foreground">
          Flächen bewerten, Entscheidung treffen, Einnahmen ohne eigene Investitionen
        </div>

        {/* Headline (Text 3) */}
        <h2 className="text-[32px] font-bold text-forest-green">Dafür stehen wir:</h2>

        {/* Four quadrants */}
        <div className="grid flex-1 grid-cols-2 gap-6">
          {/* Quadrant 1 — Eigentümer */}
          <div className="rounded-xl bg-plant-green-50 p-6 text-[20px] leading-[1.4] text-foreground">
            <div className="mb-2 text-[20px] font-bold text-plant-green">Eigentümer:innen</div>
            <p>
              Eigentümer:innen erhalten für Bereitstellung ihrer Flächen einmalig Pachteinnahmen und
              20 Jahre günstigeren und CO2-neutraleren Strom, ohne selbst zu investieren.
            </p>
          </div>

          {/* Quadrant 2 — Solarunternehmen */}
          <div className="rounded-xl bg-muted-lime-50 p-6 text-[20px] leading-[1.4] text-foreground">
            <div className="mb-2 text-[20px] font-bold text-plant-green">Solarunternehmen</div>
            <p>Solarunternehmen erhalten skalierbare Projektpotenziale</p>
          </div>

          {/* Quadrant 3 — Gesellschaft */}
          <div className="rounded-xl bg-muted-lime-50 p-6 text-[20px] leading-[1.4] text-foreground">
            <div className="mb-2 text-[20px] font-bold text-plant-green">Gesellschaft</div>
            <p>Die Gesellschaft profitiert von mehr sauberer Energie und weniger CO₂-Emissionen</p>
          </div>

          {/* Quadrant 4 — Investoren */}
          <div className="rounded-xl bg-plant-green-50 p-6 text-[20px] leading-[1.4] text-foreground">
            <div className="mb-2 text-[20px] font-bold text-plant-green">Investoren</div>
            <p>
              Die Investoren erhalten eine gute Kapitalrendite für die Investition, welche sie
              tätigen.
            </p>
          </div>
        </div>

        {/* EEG-Hinweis Footer */}
        <div className="rounded-lg bg-forest-green p-4 text-center text-[18px] font-bold text-white">
          Durch das Erneuerbare-Energien-Gesetz (EEG) ist die Sicherheit des Gesamtkonzeptes
          staatlich garantiert
        </div>
      </div>
    </SlideFrame>
  );
}
