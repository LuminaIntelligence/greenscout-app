import { customerDisplayName } from "../format";
import type { StudyDocumentData } from "../types";
import { SlideFrame } from "./_components/slide-frame";

/**
 * Slide 7 — "Wir sind ihr strategischer Partner in der Energiewende".
 *
 * Treue Reproduktion (Pivot-2b PASS 2, siehe DECISIONS 2026-06-02).
 *
 * **Pass-2-Korrektur (Q5 User-Antwort):** Originale Bullet-Anzahl strikt
 * einhalten — drei Phase-II-Bullets (Aufbau / Unterstützung / Förderung),
 * keine Konsolidierung. Layout-Korrektur: Single-Liste mit Phase I- und
 * Phase II-Subheaders als Listen-Einträge (nicht 2 Karten). Das matcht
 * das Original-PDF (original-slide-07.png).
 *
 * Statische Texte wörtlich aus dem PPTX (siehe `template-content.json`
 * Slide 7):
 *  - Text 1 (Headline) — "Wir sind ihr strategischer Partner in der
 *    Energiewende".
 *  - Text 2 (Subtitle) — "Seit über zwei Jahrzehnten hat unser Management
 *    Erfahrung bei der Flächengewinnung, Entwicklung zu Projektrechten,
 *    sowie der Vermarktung der entwickelten Projektrechte."
 *  - Text 5 — "Durch Beauftragung des Auswertepaketes - Identifikation
 *    geeigneter Flächen für 998 €".
 *  - Text 8 (Phase-I Header) — "Phase I: Professionelle Erstbewertung
 *    und Machbarkeitsprüfung von Potentialflächen".
 *  - Text 8 (Phase-II Header) — "Phase II: Entwicklung von Projektrechten".
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
 *
 * Reihenfolge der Liste (laut original-slide-07.png):
 *  1. Durch Beauftragung des Auswertepaketes... (Top-Bullet)
 *  2. **Phase I: …** (Subheader, bold)
 *  3. **Phase II: …** (Subheader, bold)
 *  4. Aufbau tragfähiger Kontakte... (Phase-II-Bullet #1)
 *  5. Unterstützung bei Vertragsumsetzung... (Phase-II-Bullet #2)
 *  6. Förderung nachhaltiger Energieerzeugung... (Phase-II-Bullet #3)
 *  + Outro-Absatz als Footer.
 */
export default function Slide07Partner({ data }: { data: StudyDocumentData }) {
  const customerName = customerDisplayName(data.customer);

  type Entry = { type: "bullet" | "header"; text: string };
  const entries: Entry[] = [
    {
      type: "bullet",
      text: "Durch Beauftragung des Auswertepaketes - Identifikation geeigneter Flächen für 998 €",
    },
    {
      type: "header",
      text: "Phase I: Professionelle Erstbewertung und Machbarkeitsprüfung von Potentialflächen",
    },
    { type: "header", text: "Phase II: Entwicklung von Projektrechten" },
    {
      type: "bullet",
      text: "Aufbau tragfähiger Kontakte zwischen Flächenbesitzer*innen und Projektpartnern",
    },
    {
      type: "bullet",
      text: "Unterstützung bei Vertragsumsetzung bis zur Vermarktbarkeit der „Ready to build“ Projektrechte.",
    },
    { type: "bullet", text: "Förderung nachhaltiger Energieerzeugung in der Region" },
  ];

  return (
    <SlideFrame slideNumber={7} customerLabel={customerName}>
      <div className="flex h-full flex-col gap-6">
        {/* Headline + Subtitle */}
        <div className="space-y-2">
          <h2 className="text-[32px] font-extrabold leading-[1.1] text-forest-green">
            Wir sind ihr strategischer Partner in der Energiewende
          </h2>
          <p className="text-[18px] leading-[1.4] text-foreground">
            Seit über zwei Jahrzehnten hat unser Management Erfahrung bei der Flächengewinnung,
            Entwicklung zu Projektrechten, sowie der Vermarktung der entwickelten Projektrechte.
          </p>
        </div>

        {/* Single-list mit Phase-Headers + Bullets (kein 2-Spalten-Karten-Layout) */}
        <ul className="flex flex-1 flex-col gap-3 text-foreground">
          {entries.map((e, idx) => (
            <li key={idx} className="flex items-start gap-3 text-[18px] leading-[1.45]">
              {/* Icon-Punkt: plant-green Kreis */}
              <span
                className="mt-2 inline-block h-2 w-2 flex-shrink-0 rounded-full bg-plant-green"
                aria-hidden="true"
              />
              {e.type === "header" ? (
                <span className="font-bold text-forest-green">{e.text}</span>
              ) : (
                <span>{e.text}</span>
              )}
            </li>
          ))}
        </ul>

        {/* Outro */}
        <p className="text-[14px] leading-[1.4] text-forest-green opacity-80">
          Die Rolle von GreenScout e.V. ist es, Projekte planbar, skalierbar und wirtschaftlich
          attraktiv zu machen – ohne Risiko für Flächeneigentümer*innen. Der Verein agiert dabei
          unabhängig, transparent und mit klarem Fokus auf Wirkung für die Flächeneingentümer*innen
          und die Umwelt.
        </p>
      </div>
    </SlideFrame>
  );
}
