import { customerDisplayName, formatEur, formatEurNumber } from "../format";
import type { StudyDocumentData } from "../types";
import { SlideFrame } from "./_components/slide-frame";

/**
 * Slide 13 — Langfristige Wirtschaftlichkeit: 20 Jahre.
 *
 * Original-PDF: Vier-Zeilen-Bilanz: Jahresersparnis, 20-Jahre-Ersparnis,
 * Pacht-Einmalzahlung, Gesamtvorteil.
 */
export default function Slide13Langfristig({ data }: { data: StudyDocumentData }) {
  const customerName = customerDisplayName(data.customer);

  return (
    <SlideFrame slideNumber={13} customerLabel={customerName}>
      <div className="flex h-full flex-col space-y-12">
        <div className="space-y-2">
          <div className="slide-caption uppercase tracking-widest text-plant-green">
            Langfristig
          </div>
          <h2 className="slide-h2">Bilanz über die Laufzeit</h2>
        </div>
        <div className="space-y-6">
          <BilanzRow
            label="Jährliche Einsparung"
            value={`${formatEurNumber(data.derived.ersparnisProJahr)} €`}
          />
          <BilanzRow
            label={`Einsparung über ${data.study.vertragslaufzeitJahre} Jahre`}
            value={formatEur(data.derived.ersparnis20Jahre)}
          />
          <BilanzRow
            label="Einmalige Dachpacht"
            value={formatEur(data.derived.pachtEinnahmeEinmalig)}
          />
          <BilanzRow
            label="Gesamter wirtschaftlicher Vorteil"
            value={formatEur(data.derived.gesamtvorteil)}
            highlight
          />
        </div>
      </div>
    </SlideFrame>
  );
}

function BilanzRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  if (highlight) {
    return (
      <div className="flex items-center justify-between rounded-2xl border-2 border-plant-green bg-plant-green-50 px-10 py-8">
        <span className="slide-h3 text-forest-green">{label}</span>
        <span className="slide-data-headline tabular-nums leading-none">{value}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between border-b-2 border-muted-lime-300 px-2 py-4">
      <span className="slide-h4 text-forest-green-700">{label}</span>
      <span className="slide-h2 tabular-nums text-forest-green">{value}</span>
    </div>
  );
}
