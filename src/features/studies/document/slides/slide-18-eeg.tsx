import { customerDisplayName } from "../format";
import type { StudyDocumentData } from "../types";
import { SlideFrame } from "./_components/slide-frame";

/**
 * Slide 18 — "Das Erneuerbare-Energien-Gesetz (EEG) - Vorteile für
 * Flächenverpächter".
 *
 * Treue Reproduktion (Pivot-2b). Statische Texte wörtlich aus dem PPTX
 * (siehe `template-content.json` Slide 18):
 *
 *  - Text 0 — "Das Erneuerbare-Energien-Gesetz (EEG) - Vorteile für
 *    Flächenverpächter".
 *  - Text 1 — "20 Jahre Planungssicherheit durch staatlich garantierten
 *    Rahmen".
 *  - 6 Vorteils-Karten (Text 4/5 ... Text 24/25):
 *     "Staatlich garantierter Rahmen" — "Das EEG schafft einen
 *      gesetzlich geregelten Markt für Solarstrom..."
 *     "20 Jahre Planungssicherheit" — "Vergütung und Abnahme sind auf
 *      langfristige Stabilität ausgelegt..."
 *     "Hohe Zahlungssicherheit" — "Betreiber können ihre Einnahmen
 *      belastbar prognostizieren..."
 *     "Netzanschluss & Einspeisevorrang" — "EEG-Strom wird bevorzugt
 *      ins öffentliche Netz eingespeist..."
 *     "Starker Investoren- und Bankenstandard" — "Das EEG ist ein
 *      etabliertes, finanzierungsfähiges Regelwerk..."
 *     "Wertsteigerung & Risikominimierung" — "Sie nutzen Ihre Fläche
 *      ohne eigenes Investitionsrisiko..."
 *  - Text 26 (Bottom 1) — "Das EEG stellt sicher, dass Solarprojekte
 *    über 20 Jahre verlässliche Einnahmen erzielen..."
 *  - Text 26 (Bottom 2) — "Das Erneuerbare-Energien-Gesetz (EEG) regelt
 *    die Förderung von Strom aus erneuerbaren Energien..."
 */
export default function Slide18EEG({ data }: { data: StudyDocumentData }) {
  const customerName = customerDisplayName(data.customer);

  const cards = [
    {
      title: "Staatlich garantierter Rahmen",
      body: "Das EEG schafft einen gesetzlich geregelten Markt für Solarstrom. Die Rahmenbedingungen sind politisch und rechtlich abgesichert.",
    },
    {
      title: "20 Jahre Planungssicherheit",
      body: "Vergütung und Abnahme sind auf langfristige Stabilität ausgelegt. Projekte sind über 20 Jahre verlässlich kalkulierbar.",
    },
    {
      title: "Hohe Zahlungssicherheit",
      body: "Betreiber können ihre Einnahmen belastbar prognostizieren. Das sichert stabile und fristgerechte Pachtzahlungen.",
    },
    {
      title: "Netzanschluss & Einspeisevorrang",
      body: "EEG-Strom wird bevorzugt ins öffentliche Netz eingespeist. Das reduziert das Risiko von Ertragsausfällen.",
    },
    {
      title: "Starker Investoren- und Bankenstandard",
      body: "Das EEG ist ein etabliertes, finanzierungsfähiges Regelwerk. Banken finanzieren solche Projekte regelmäßig.",
    },
    {
      title: "Wertsteigerung & Risikominimierung",
      body: "Sie nutzen Ihre Fläche ohne eigenes Investitionsrisiko. Sie erzielen zusätzliche Einnahmen und stärken den Wert Ihrer Immobilie.",
    },
  ];

  return (
    <SlideFrame slideNumber={18} customerLabel={customerName}>
      <div className="flex h-full flex-col gap-5">
        {/* Headline + Subtitle */}
        <div className="space-y-1">
          <h2 className="text-[24px] font-bold leading-[1.2] text-forest-green">
            Das Erneuerbare-Energien-Gesetz (EEG) - Vorteile für Flächenverpächter
          </h2>
          <p className="text-[18px] text-foreground">
            20 Jahre Planungssicherheit durch staatlich garantierten Rahmen
          </p>
        </div>

        {/* 6-card 3x2 grid */}
        <div className="grid flex-1 grid-cols-3 gap-3">
          {cards.map((c, i) => (
            <div key={i} className="rounded-xl bg-muted-lime-50 p-4 text-[14px] leading-[1.4]">
              <div className="text-[16px] font-bold text-plant-green">{c.title}</div>
              <p className="mt-2 text-foreground">{c.body}</p>
            </div>
          ))}
        </div>

        {/* Bottom long-text blocks */}
        <div className="space-y-2 text-[13px] leading-[1.4] text-foreground">
          <p>
            Das EEG stellt sicher, dass Solarprojekte über 20 Jahre verlässliche Einnahmen erzielen.
            Diese Stabilität bildet die Grundlage für eine sichere, langfristige Flächenpacht und
            unterstützt zugleich die Erreichung der Klimaziele in Deutschland und Europa.
          </p>
          <p>
            Das Erneuerbare-Energien-Gesetz (EEG) regelt die Förderung von Strom aus erneuerbaren
            Energien und schafft Investitionssicherheit durch garantierte Vergütungsmechanismen
            sowie einen gesetzlich verankerten Einspeisevorrang.
          </p>
        </div>
      </div>
    </SlideFrame>
  );
}
