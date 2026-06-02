import { customerDisplayName } from "../format";
import type { StudyDocumentData } from "../types";
import { SlideFrame } from "./_components/slide-frame";

/**
 * Slide 7 — "Wir sind ihr strategischer Partner in der Energiewende".
 *
 * Treue Reproduktion (Pivot-2b). Statische Texte wörtlich aus dem PPTX
 * (siehe `template-content.json` Slide 7):
 *
 *  - Text 1 (Headline) — "Wir sind ihr strategischer Partner in der
 *    Energiewende".
 *  - Text 2 (Subtitle) — "Seit über zwei Jahrzehnten hat unser Management
 *    Erfahrung bei der Flächengewinnung, Entwicklung zu Projektrechten,
 *    sowie der Vermarktung der entwickelten Projektrechte."
 *  - Text 5 — "Durch Beauftragung des Auswertepaketes - Identifikation
 *    geeigneter Flächen für 998 €".
 *  - Text 8 (Phase-I Headline) — "Phase I: Professionelle Erstbewertung
 *    und Machbarkeitsprüfung von Potentialflächen".
 *  - Text 11 — "Aufbau tragfähiger Kontakte zwischen Flächenbesitzer*innen
 *    und Projektpartnern".
 *  - Text 14 — 'Unterstützung bei Vertragsumsetzung bis zur Vermarkt-
 *    barkeit der "Ready to build" Projektrechte.'
 *  - Text 17 — "Förderung nachhaltiger Energieerzeugung in der Region".
 *  - Text 18 (Outro) — "Die Rolle von GreenScout e.V. ist es, Projekte
 *    planbar, skalierbar und wirtschaftlich attraktiv zu machen – ohne
 *    Risiko für Flächeneigentümer*innen. Der Verein agiert dabei
 *    unabhängig, transparent und mit klarem Fokus auf Wirkung für die
 *    Flächeneingentümer*innen und die Umwelt."
 *  - Text 8 (Phase-II Headline) — "Phase II: Entwicklung von
 *    Projektrechten".
 */
export default function Slide07Partner({ data }: { data: StudyDocumentData }) {
  const customerName = customerDisplayName(data.customer);

  return (
    <SlideFrame slideNumber={7} customerLabel={customerName}>
      <div className="flex h-full flex-col gap-5">
        {/* Headline + Subtitle */}
        <div className="space-y-2">
          <h2 className="text-[32px] font-bold leading-[1.1] text-forest-green">
            Wir sind ihr strategischer Partner in der Energiewende
          </h2>
          <p className="text-[18px] leading-[1.4] text-foreground">
            Seit über zwei Jahrzehnten hat unser Management Erfahrung bei der Flächengewinnung,
            Entwicklung zu Projektrechten, sowie der Vermarktung der entwickelten Projektrechte.
          </p>
        </div>

        {/* Two phases — side by side */}
        <div className="grid flex-1 grid-cols-2 gap-8">
          {/* Phase I */}
          <div className="rounded-xl border-2 border-plant-green p-6">
            <div className="mb-3 text-[20px] font-bold text-plant-green">
              Phase I: Professionelle Erstbewertung und Machbarkeitsprüfung von Potentialflächen
            </div>
            <ul className="space-y-3 text-[16px] leading-[1.4] text-foreground">
              <li>
                Durch Beauftragung des Auswertepaketes - Identifikation geeigneter Flächen für 998 €
              </li>
              <li>
                Aufbau tragfähiger Kontakte zwischen Flächenbesitzer*innen und Projektpartnern
              </li>
            </ul>
          </div>

          {/* Phase II */}
          <div className="rounded-xl border-2 border-forest-green p-6">
            <div className="mb-3 text-[20px] font-bold text-forest-green">
              Phase II: Entwicklung von Projektrechten
            </div>
            <ul className="space-y-3 text-[16px] leading-[1.4] text-foreground">
              <li>
                Unterstützung bei Vertragsumsetzung bis zur Vermarkt-barkeit der „Ready to
                build&ldquo; Projektrechte.
              </li>
              <li>Förderung nachhaltiger Energieerzeugung in der Region</li>
            </ul>
          </div>
        </div>

        {/* Outro */}
        <p className="text-[16px] leading-[1.4] text-foreground">
          Die Rolle von GreenScout e.V. ist es, Projekte planbar, skalierbar und wirtschaftlich
          attraktiv zu machen – ohne Risiko für Flächeneigentümer*innen. Der Verein agiert dabei
          unabhängig, transparent und mit klarem Fokus auf Wirkung für die Flächeneingentümer*innen
          und die Umwelt.
        </p>
      </div>
    </SlideFrame>
  );
}
