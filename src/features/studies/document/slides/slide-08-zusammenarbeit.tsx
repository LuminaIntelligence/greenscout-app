import { customerDisplayName } from "../format";
import type { StudyDocumentData } from "../types";
import { SlideFrame } from "./_components/slide-frame";

/**
 * Slide 8 — "Warum eine Zusammenarbeit sinnvoll ist".
 *
 * Treue Reproduktion (Pivot-2b PASS 2, siehe DECISIONS 2026-06-02).
 *
 * **Pass-3-Korrektur (Q15 User-Antwort 2026-06-03):** „Warum gerade jetzt?"
 * wird nicht mehr als dunkelgrüne Footer-Box gerendert, sondern als
 * Subheader + drei Pfeil-Bullets in normaler Forest-Green-Schrift auf
 * weißem Grund — entspricht dem Original-PDF-Layout.
 *
 * **Pass-2-Korrektur (Q6 User-Antwort):** Karten weiß statt
 * `bg-muted-lime-50`. SPEC §8.4 verlangt „sparing use of muted-lime for
 * accents" — die Nummerierung selbst ist Akzent genug.
 *
 * Statische Texte wörtlich aus dem PPTX (siehe `template-content.json`
 * Slide 8):
 *
 *  - Text 0 — "Warum eine Zusammenarbeit sinnvoll ist".
 *  - Text 1 — "Greifbare Vorteile auf mehreren Ebenen".
 *  - Vier nummerierte Karten 1/2/3/4 mit Titel + Body:
 *     1. Pachteinnahmen — "Flächen, die bislang ungenutzt blieben..."
 *     2. Günstigeren Strom — "Der Storm, welcher durch den
 *        Stromliefervertrag garantiert wird, ist meist bis zu 20%
 *        günstiger..."
 *     3. Strompreisstabilität — "Über eine Laufzeit von 20 Jahren..."
 *     4. Sicherheit für Investoren — "GreenScout e.V. übernimmt die
 *        initiale Prüfung..."
 *  - "Warum gerade jetzt?" — "Diese Machbarkeitsstudie bestätigt:"
 *  - Drei Bullets:
 *     - "Ihre eingereichte Fläche ist geeignet, um Sie an Investoren
 *       verpachtet zu werden."
 *     - "Die wirtschaftlichen Rahmenbedingungen sind tragfähig.
 *       Vorbehaltlich der Prüfung in Phase II"
 *     - "Wir gehen wie vertraglich vereinbart in Phase II über."
 */
export default function Slide08Zusammenarbeit({ data }: { data: StudyDocumentData }) {
  const customerName = customerDisplayName(data.customer);

  const cards = [
    {
      no: "1",
      title: "Pachteinnahmen",
      body: "Flächen, die bislang ungenutzt blieben, werden aktiviert und generieren stabile Pachteinnahmen für Eigentümer*innen.",
    },
    {
      no: "2",
      title: "Günstigeren Strom",
      body: "Der Storm, welcher durch den Stromliefervertrag garantiert wird, ist meist bis zu 20% günstiger als jener vom bisherigen Stromanbieter.",
    },
    {
      no: "3",
      title: "Strompreisstabilität",
      body: "Über eine Laufzeit von 20 Jahren, mit zwei optionalen Verlängerungen um jeweils 5 Jahre, bleibt der Strompreis stabil und ist weder von Inflation noch von kurzfristigen Preiserhöhungen betroffen.",
    },
    {
      no: "4",
      title: "Sicherheit für Investoren",
      body: "GreenScout e.V. übernimmt die initiale Prüfung, bewertet Flächen neutral und fundiert – bevor es zu Investitionen oder langfristigen Bindungen kommt. Diese frühe Risikominimierung ist entscheidend für Investoren.",
    },
  ];

  return (
    <SlideFrame slideNumber={8} customerLabel={customerName}>
      <div className="flex h-full flex-col gap-4">
        {/* Headline + Subtitle (Text 0 + Text 1) */}
        <div className="space-y-2">
          <h2 className="text-[32px] font-extrabold text-forest-green">
            Warum eine Zusammenarbeit sinnvoll ist
          </h2>
          <p className="text-[18px] text-foreground">Greifbare Vorteile auf mehreren Ebenen</p>
        </div>

        {/* 2x2 grid of numbered cards */}
        <div className="grid grid-cols-2 gap-4">
          {cards.map((c) => (
            <div
              key={c.no}
              className="rounded-xl border border-muted-lime-300 bg-white p-5 text-[15px] leading-[1.4] text-foreground"
            >
              <div className="flex items-start gap-3">
                <div className="text-[40px] font-bold tabular-nums leading-none text-plant-green">
                  {c.no}
                </div>
                <div>
                  <div className="text-[18px] font-bold text-forest-green">{c.title}</div>
                  <p className="mt-1">{c.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* "Warum gerade jetzt?" Subheader + drei Pfeil-Bullets (Q15-Korrektur). */}
        <div className="mt-2 space-y-2">
          <h3 className="text-[22px] font-bold text-forest-green">Warum gerade jetzt?</h3>
          <div className="text-[16px] font-bold text-forest-green">
            Diese Machbarkeitsstudie bestätigt:
          </div>
          <ul className="space-y-1 text-[15px] text-forest-green">
            <li className="flex items-start gap-2">
              <span aria-hidden="true" className="leading-[1.4]">
                →
              </span>
              <span>
                Ihre eingereichte Fläche ist geeignet, um Sie an Investoren verpachtet zu werden.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span aria-hidden="true" className="leading-[1.4]">
                →
              </span>
              <span>
                Die wirtschaftlichen Rahmenbedingungen sind tragfähig. Vorbehaltlich der Prüfung in
                Phase II
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span aria-hidden="true" className="leading-[1.4]">
                →
              </span>
              <span>Wir gehen wie vertraglich vereinbart in Phase II über.</span>
            </li>
          </ul>
        </div>
      </div>
    </SlideFrame>
  );
}
