import { customerDisplayName, formatIntegerDe, formatKwp } from "../format";
import type { StudyDocumentData } from "../types";
import { SlideFrame } from "./_components/slide-frame";

/**
 * Slide 10 — PV-Anlagenkonzept: Dachbelegung.
 *
 * Original-PDF: Objektname-Headline + Modul-Info-Phrase: `kWp, Module,
 * m²`. Defekt D3-konform: optionale Segmente entfallen bei leeren
 * Werten.
 */
export default function Slide10PVAnlagenkonzept({ data }: { data: StudyDocumentData }) {
  const customerName = customerDisplayName(data.customer);
  const anlageKwp = Number(data.study.anlageKwp);

  const segments: string[] = [formatKwp(anlageKwp)];
  if (data.study.modulAnzahl !== null && data.study.modulAnzahl !== undefined) {
    segments.push(`${formatIntegerDe(data.study.modulAnzahl)} Module`);
  }
  if (data.study.modulFlaecheM2 !== null && data.study.modulFlaecheM2 !== undefined) {
    segments.push(`${formatIntegerDe(Number(data.study.modulFlaecheM2))} m²`);
  }
  const modulInfoPhrase = segments.join(", ");

  return (
    <SlideFrame slideNumber={10} customerLabel={customerName}>
      <div className="flex h-full flex-col space-y-12">
        <div className="space-y-2">
          <div className="slide-caption uppercase tracking-widest text-plant-green">
            PV-Anlagenkonzept
          </div>
          <h2 className="slide-h2">
            Dachbelegung für <span className="text-plant-green">{data.study.objectName}</span>
          </h2>
        </div>
        <div className="rounded-2xl border-2 border-plant-green bg-plant-green-50 p-12">
          <div className="slide-caption uppercase tracking-widest text-plant-green">
            Konfiguration
          </div>
          <div className="slide-h2 mt-4 tabular-nums">{modulInfoPhrase}</div>
        </div>
        <div className="grid grid-cols-2 gap-10">
          <div className="space-y-4">
            <div className="slide-caption uppercase tracking-widest">Auslegungsannahmen</div>
            <ul className="slide-body space-y-2 text-forest-green-700">
              <li>— Süd-Ausrichtung mit moderater Dachneigung (15–25°)</li>
              <li>— Standard-Module 400+ Wp, monokristallin</li>
              <li>— Wechselrichter mit Netz-Stabilisierungsfunktion</li>
              <li>— Brandlast-konforme Verkabelung</li>
            </ul>
          </div>
          <div className="space-y-4">
            <div className="slide-caption uppercase tracking-widest">Nicht im Lieferumfang</div>
            <ul className="slide-body space-y-2 text-forest-green-700">
              <li>— Dachsanierung (separate Bewertung möglich)</li>
              <li>— Speichersysteme (auf Anfrage)</li>
              <li>— Wallbox-Infrastruktur (Phase 2)</li>
            </ul>
          </div>
        </div>
      </div>
    </SlideFrame>
  );
}
