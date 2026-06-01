import { customerDisplayName } from "../format";
import type { StudyDocumentData } from "../types";
import { SlideFrame } from "./_components/slide-frame";

/**
 * Slide 18 — Erneuerbare-Energien-Gesetz (EEG).
 *
 * Original-PDF: Static slide.
 */
export default function Slide18EEG({ data }: { data: StudyDocumentData }) {
  return (
    <SlideFrame slideNumber={18} customerLabel={customerDisplayName(data.customer)}>
      <div className="flex h-full flex-col space-y-12">
        <div className="space-y-2">
          <div className="slide-caption uppercase tracking-widest text-plant-green">
            Rechtsrahmen
          </div>
          <h2 className="slide-h2">Erneuerbare-Energien-Gesetz (EEG)</h2>
        </div>
        <div className="grid grid-cols-2 gap-12">
          <div className="space-y-6">
            <p className="slide-body-lg text-forest-green-700">
              Das EEG garantiert PV-Betreibern in Deutschland für 20 Jahre einen festen gesetzlichen
              Rahmen — sowohl bei der Einspeisevergütung als auch beim Netzzugang.
            </p>
            <ul className="slide-body space-y-3 text-forest-green-700">
              <li>— Vorrang erneuerbarer Energien bei der Netzeinspeisung</li>
              <li>— Festgelegte Vergütung für 20 Jahre ab Inbetriebnahme</li>
              <li>— Anpassungsmechanismus über die Bundesnetzagentur</li>
              <li>— Klar geregelte Marktprämien­modelle</li>
            </ul>
          </div>
          <div className="space-y-6 rounded-2xl border-2 border-plant-green bg-plant-green-50 p-10">
            <h3 className="slide-h3 text-plant-green-700">Was das für Sie bedeutet</h3>
            <p className="slide-body text-forest-green-700">
              Die in dieser Studie berechneten Erträge und Pachtmodelle stehen auf einer gesetzlich
              abgesicherten Grundlage. Der Vertrag und die Kalkulation halten der vollen
              20-Jahre-Laufzeit stand.
            </p>
          </div>
        </div>
      </div>
    </SlideFrame>
  );
}
