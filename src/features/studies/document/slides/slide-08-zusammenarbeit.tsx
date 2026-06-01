import { customerDisplayName } from "../format";
import type { StudyDocumentData } from "../types";
import { SlideFrame } from "./_components/slide-frame";

/**
 * Slide 8 — Warum eine Zusammenarbeit sinnvoll ist.
 *
 * Original-PDF: Static slide.
 */
export default function Slide08Zusammenarbeit({ data }: { data: StudyDocumentData }) {
  return (
    <SlideFrame slideNumber={8} customerLabel={customerDisplayName(data.customer)}>
      <div className="flex h-full flex-col space-y-12">
        <div className="space-y-2">
          <div className="slide-caption uppercase tracking-widest text-plant-green">
            Zusammenarbeit
          </div>
          <h2 className="slide-h2">Warum jetzt der richtige Zeitpunkt ist</h2>
        </div>
        <div className="grid flex-1 grid-cols-3 gap-10">
          <ReasonCard
            number="01"
            heading="Energiekosten steigen"
            body="Volatile Netzstrompreise bleiben das größte unkalkulierbare Risiko der nächsten zehn Jahre."
          />
          <ReasonCard
            number="02"
            heading="Eigenverbrauch lohnt sich"
            body="Selbst genutzter PV-Strom ist günstiger als jeder externe Versorgertarif – mit voller Preisstabilität."
          />
          <ReasonCard
            number="03"
            heading="Klimaschutz wird messbar"
            body="EEG-konforme PV-Erzeugung verbessert ESG-Kennzahlen und Reporting für institutionelle Stakeholder."
          />
        </div>
      </div>
    </SlideFrame>
  );
}

function ReasonCard({ number, heading, body }: { number: string; heading: string; body: string }) {
  return (
    <div className="flex flex-col rounded-2xl border border-muted-lime-300 bg-muted-lime-50 p-10">
      <div className="slide-data-headline text-[64px] text-plant-green">{number}</div>
      <h3 className="slide-h3 mt-6">{heading}</h3>
      <p className="slide-body mt-4 text-forest-green-700">{body}</p>
    </div>
  );
}
