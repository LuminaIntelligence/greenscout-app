import { customerDisplayName } from "../format";
import type { StudyDocumentData } from "../types";
import { SlideFrame } from "./_components/slide-frame";

/**
 * Slide 6 — Dafür stehen wir (Mission / Vision).
 *
 * Original-PDF: Static slide. Drei Werte-Spalten.
 */
export default function Slide06Mission({ data }: { data: StudyDocumentData }) {
  return (
    <SlideFrame slideNumber={6} customerLabel={customerDisplayName(data.customer)}>
      <div className="flex h-full flex-col space-y-12">
        <div className="space-y-2">
          <div className="slide-caption uppercase tracking-widest text-plant-green">
            Dafür stehen wir
          </div>
          <h2 className="slide-h2">Unsere Mission</h2>
        </div>
        <p className="slide-body-lg max-w-[1500px] text-forest-green-700">
          GreenScout e.V. begleitet Eigentümer und Investoren dabei, ungenutzte Dach- und
          Flächenpotenziale wirtschaftlich, rechtssicher und ökologisch wirksam in Photovoltaik
          umzuwandeln.
        </p>
        <div className="grid flex-1 grid-cols-3 gap-10">
          <ValueCard
            heading="Wirtschaftlich"
            body="Klar gerechnete Ertrags- und Pachtmodelle, transparent über die volle 20-Jahre-Laufzeit."
          />
          <ValueCard
            heading="Rechtssicher"
            body="Verträge, Genehmigungsprozesse und EEG-konforme Inbetriebnahme aus einer Hand."
          />
          <ValueCard
            heading="Ökologisch wirksam"
            body="Jede realisierte Anlage trägt messbar zur Energiewende und CO₂-Reduktion bei."
          />
        </div>
      </div>
    </SlideFrame>
  );
}

function ValueCard({ heading, body }: { heading: string; body: string }) {
  return (
    <div className="flex flex-col rounded-2xl border border-forest-green-200 bg-white p-10">
      <h3 className="slide-h3">{heading}</h3>
      <p className="slide-body mt-4 text-forest-green-700">{body}</p>
    </div>
  );
}
