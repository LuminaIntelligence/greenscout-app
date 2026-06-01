import {
  customerDisplayName,
  formatCentPerKwh,
  formatEur,
  formatEurNumber,
  formatIntegerDe,
} from "../format";
import type { StudyDocumentData } from "../types";
import { SlideFrame } from "./_components/slide-frame";

/**
 * Slide 9 — Ausgangssituation: Markt- und Kostenrisiken.
 *
 * Original-PDF: Headline-ct-Wert + drei zusammengefasste Sparbeiträge
 * (Pacht, Ersparnis 20 Jahre, CO₂ 20 Jahre).
 */
export default function Slide09Ausgangssituation({ data }: { data: StudyDocumentData }) {
  const versorgerCt = Number(data.study.versorgerPreisEurKwh) * 100;
  const co2Gesamt = data.derived.co2TonnenProJahr * data.study.vertragslaufzeitJahre;

  return (
    <SlideFrame slideNumber={9} customerLabel={customerDisplayName(data.customer)}>
      <div className="flex h-full flex-col space-y-12">
        <div className="space-y-2">
          <div className="slide-caption uppercase tracking-widest text-plant-green">
            Ausgangssituation
          </div>
          <h2 className="slide-h2">Markt- und Kostenrisiken</h2>
        </div>
        <div className="rounded-2xl border border-forest-green-200 bg-white p-10">
          <p className="slide-body-lg text-forest-green-700">
            Ihr aktueller Netzstrompreis liegt bei{" "}
            <span className="tabular-nums text-forest-green">{formatCentPerKwh(versorgerCt)}</span>{" "}
            netto. Über 20 Jahre summieren sich die Mehrkosten gegenüber einer eigenen PV-Versorgung
            erheblich.
          </p>
        </div>
        <div className="grid flex-1 grid-cols-3 gap-10">
          <SparBeitrag
            label="Pachteinnahmen"
            value={formatEur(data.derived.pachtEinnahmeEinmalig)}
          />
          <SparBeitrag
            label="Stromersparnis auf 20 Jahre"
            value={`${formatEurNumber(data.derived.ersparnis20Jahre)} €`}
          />
          <SparBeitrag
            label="CO₂-Ersparnis auf 20 Jahre"
            value={`${formatIntegerDe(co2Gesamt)} t`}
          />
        </div>
      </div>
    </SlideFrame>
  );
}

function SparBeitrag({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-muted-lime-300 bg-muted-lime-50 p-10">
      <div className="slide-caption uppercase tracking-widest">{label}</div>
      <div className="slide-data-headline mt-6 tabular-nums leading-none">{value}</div>
    </div>
  );
}
