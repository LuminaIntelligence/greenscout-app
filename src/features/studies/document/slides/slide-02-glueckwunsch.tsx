import { buildObjectAddress, customerDisplayName } from "../format";
import type { StudyDocumentData } from "../types";
import { SlideFrame } from "./_components/slide-frame";

/**
 * Slide 2 — Herzlichen Glückwunsch / Objektkennung.
 *
 * Original-PDF: Begrüßung + komplette Objekt-Adresse (Long-Line) +
 * optionaler Flurstück-Suffix. Defekt D1-konform: leerer Flurstück →
 * kein hängender „in Flurstück"-Präfix.
 */
export default function Slide02Glueckwunsch({ data }: { data: StudyDocumentData }) {
  const customerName = customerDisplayName(data.customer);
  const address = buildObjectAddress(
    data.study.objectName,
    data.study.objectAddress,
    data.study.objectZipCode,
    data.study.objectCity,
  );
  const flurstueckSuffix =
    data.study.flurstueck && data.study.flurstueck.trim().length > 0
      ? ` in Flurstück ${data.study.flurstueck}`
      : "";

  return (
    <SlideFrame slideNumber={2} customerLabel={customerName}>
      <div className="flex h-full flex-col justify-center space-y-12">
        <h2 className="slide-title">Herzlichen Glückwunsch</h2>
        <p className="slide-body-lg max-w-[1600px] text-forest-green-700">
          Sie haben sich entschieden, das volle Potenzial Ihres Daches zu erschließen — eine
          Investition in Energieunabhängigkeit, Wirtschaftlichkeit und Klimaschutz.
        </p>
        <div className="space-y-4 border-l-8 border-plant-green pl-10">
          <div className="slide-caption uppercase tracking-widest">Objekt</div>
          <p className="slide-h3">
            {address}
            {flurstueckSuffix}
          </p>
        </div>
      </div>
    </SlideFrame>
  );
}
