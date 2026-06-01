import { customerDisplayName, formatEur, formatEurNumber } from "../format";
import type { StudyDocumentData } from "../types";
import { SlideFrame } from "./_components/slide-frame";

/**
 * Slide 17 — Der Weg zur Inbetriebnahme.
 *
 * Original-PDF: 6-Spalten-Timeline mit gleichen Spaltenhöhen. R2-10/C2-
 * konform: CSS Grid mit `grid-auto-rows: 1fr` zwingt alle Spalten in
 * dieselbe Höhe — ersetzt die fragile PPTX-Slide-17-Grid-Normalisierung.
 *
 * Ein zusätzlicher Highlight-Block unten zeigt die Erspar­nis und das
 * 20-Jahre-Pacht-Summen-Volumen (entspricht den dynamischen Werten in
 * `Textfeld 7` / `Textfeld 20` der PPTX-Vorlage).
 */
export default function Slide17Timeline({ data }: { data: StudyDocumentData }) {
  const customerName = customerDisplayName(data.customer);

  const steps: Array<{ phase: string; title: string; inhalt: string; ergebnis: string }> = [
    {
      phase: "01",
      title: "Vor-Ort-Termin",
      inhalt: "Aufnahme von Dachfläche, Verbrauchsdaten und individueller Eigentümer-Situation.",
      ergebnis: "Standortprotokoll",
    },
    {
      phase: "02",
      title: "Machbarkeit",
      inhalt: "Diese Studie quantifiziert Ertrag, Ersparnis, Pacht und Klimanutzen.",
      ergebnis: "Machbarkeitsbericht",
    },
    {
      phase: "03",
      title: "Vertragsentwurf",
      inhalt:
        "Pacht- und Stromliefervertrag werden auf Basis der vereinbarten Variante ausgearbeitet.",
      ergebnis: "Vertragsentwurf",
    },
    {
      phase: "04",
      title: "Detailplanung",
      inhalt:
        "Anlagenlayout, statische Prüfung, Netzanschluss-Anfrage und Förderanträge werden vorbereitet.",
      ergebnis: "Genehmigte Planung",
    },
    {
      phase: "05",
      title: "Installation",
      inhalt:
        "Aufbau, Verkabelung und Wechselrichter-Anbindung durch zertifizierte Installations­partner.",
      ergebnis: "PV-Anlage betriebsbereit",
    },
    {
      phase: "06",
      title: "Inbetriebnahme",
      inhalt: "Netzanschluss, EEG-Anmeldung und Übergabe an die laufende Betriebsphase.",
      ergebnis: "Strom vom eigenen Dach",
    },
  ];

  return (
    <SlideFrame slideNumber={17} customerLabel={customerName}>
      <div className="flex h-full flex-col space-y-10">
        <div className="space-y-2">
          <div className="slide-caption uppercase tracking-widest text-plant-green">Roadmap</div>
          <h2 className="slide-h2">Der Weg zur Inbetriebnahme</h2>
        </div>
        <div
          className="grid flex-1 gap-4"
          style={{
            gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
            gridAutoRows: "1fr",
          }}
        >
          {steps.map((step) => (
            <TimelineCell key={step.phase} {...step} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-8">
          <HighlightCard
            label="Strom vom eigenen Dach"
            value={`${formatEurNumber(data.derived.ersparnisProJahr)} €`}
            sub="Jährliche Ersparnis nach Inbetriebnahme"
          />
          <HighlightCard
            label="Zahlung Dachpacht"
            value={formatEur(data.derived.pachtEinnahmeEinmalig)}
            sub="Einmalig bei Vertragsabschluss"
            accent
          />
        </div>
      </div>
    </SlideFrame>
  );
}

function TimelineCell({
  phase,
  title,
  inhalt,
  ergebnis,
}: {
  phase: string;
  title: string;
  inhalt: string;
  ergebnis: string;
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-muted-lime-300 bg-white p-5">
      <div className="slide-data-headline text-[36px] text-plant-green">{phase}</div>
      <h4 className="slide-h4 mt-2">{title}</h4>
      <p className="slide-body mt-3 flex-1 text-[16px] leading-snug text-forest-green-700">
        {inhalt}
      </p>
      <div className="mt-4 rounded-md bg-plant-green-50 px-3 py-2">
        <div className="slide-caption text-[12px] uppercase tracking-widest text-plant-green">
          Ergebnis
        </div>
        <div className="slide-caption text-[14px] text-forest-green">{ergebnis}</div>
      </div>
    </div>
  );
}

function HighlightCard({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  const border = accent ? "border-2 border-plant-green" : "border border-forest-green-200";
  const bg = accent ? "bg-plant-green-50" : "bg-white";
  return (
    <div className={`rounded-2xl ${border} ${bg} p-8`}>
      <div className="slide-caption uppercase tracking-widest">{label}</div>
      <div className="slide-h2 mt-3 tabular-nums text-plant-green">{value}</div>
      <p className="slide-body mt-2 text-forest-green-700">{sub}</p>
    </div>
  );
}
