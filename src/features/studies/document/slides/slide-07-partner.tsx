import { customerDisplayName } from "../format";
import type { StudyDocumentData } from "../types";
import { SlideFrame } from "./_components/slide-frame";

/**
 * Slide 7 — Wir sind Ihr strategischer Partner.
 *
 * Original-PDF: Static slide.
 */
export default function Slide07Partner({ data }: { data: StudyDocumentData }) {
  return (
    <SlideFrame slideNumber={7} customerLabel={customerDisplayName(data.customer)}>
      <div className="flex h-full flex-col space-y-12">
        <div className="space-y-2">
          <div className="slide-caption uppercase tracking-widest text-plant-green">
            Strategischer Partner
          </div>
          <h2 className="slide-h2">Eine Beratung. Eine Verantwortung.</h2>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-10">
          <div className="space-y-6">
            <PartnerRow
              label="Bedarf erfassen"
              body="Wir erheben Verbrauch, Dachfläche und individuelle Ziele in einem Vor-Ort-Termin."
            />
            <PartnerRow
              label="Wirtschaftlichkeit prüfen"
              body="Diese Machbarkeitsstudie quantifiziert Ertrag, Ersparnis, Pacht und CO₂ – belastbar gerechnet."
            />
            <PartnerRow
              label="Umsetzen"
              body="Anlagenplanung, Förderanträge, Installation und Inbetriebnahme aus einer Hand."
            />
          </div>
          <div className="rounded-2xl border-2 border-plant-green bg-plant-green-50 p-10">
            <h3 className="slide-h3 text-plant-green-700">Ihr Vorteil bei der Zusammenarbeit</h3>
            <ul className="mt-6 space-y-4 text-forest-green-700">
              <li className="slide-body">— Kein technisches Risiko auf Eigentümer-Seite</li>
              <li className="slide-body">— Pacht-Einnahmen und Ersparnis kombiniert</li>
              <li className="slide-body">— Voller Zugriff auf Berater während Laufzeit</li>
              <li className="slide-body">— Transparente Reporting-Strukturen</li>
            </ul>
          </div>
        </div>
      </div>
    </SlideFrame>
  );
}

function PartnerRow({ label, body }: { label: string; body: string }) {
  return (
    <div className="border-l-4 border-plant-green pl-6">
      <div className="slide-caption uppercase tracking-widest text-plant-green">{label}</div>
      <p className="slide-body mt-2 text-forest-green-700">{body}</p>
    </div>
  );
}
