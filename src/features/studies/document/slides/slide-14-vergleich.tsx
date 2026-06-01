import { customerDisplayName, formatCentPerKwh, formatEur, formatEurNumber } from "../format";
import type { StudyDocumentData } from "../types";
import { SlideFrame } from "./_components/slide-frame";

/**
 * Slide 14 — Vergleich: Mit PV vs. Ohne PV.
 *
 * Original-PDF: Zwei nebeneinander stehende Säulen-Karten („Ohne PV"
 * vs „Mit PV") und Hervorhebung der jährlichen Reduktion.
 */
export default function Slide14Vergleich({ data }: { data: StudyDocumentData }) {
  const pvCt = Number(data.study.pvVerkaufEurKwh) * 100;
  const customerName = customerDisplayName(data.customer);

  return (
    <SlideFrame slideNumber={14} customerLabel={customerName}>
      <div className="flex h-full flex-col space-y-12">
        <div className="space-y-2">
          <div className="slide-caption uppercase tracking-widest text-plant-green">Vergleich</div>
          <h2 className="slide-h2">Mit PV vs. Ohne PV — Stromkosten pro Jahr</h2>
        </div>
        <div className="grid grid-cols-2 gap-12">
          <ComparisonCard
            label="Ohne PV"
            value={formatEur(data.derived.stromkostenOhnePvEurJahr)}
            sub="Vollbezug am Netzstrompreis"
          />
          <ComparisonCard
            label="Mit PV"
            value={formatEur(data.derived.stromkostenMitPvEurJahr)}
            sub={`Fixer PV-Strompreis ${formatCentPerKwh(pvCt)}`}
            accent
          />
        </div>
        <div className="rounded-2xl border-2 border-plant-green bg-plant-green-50 p-10">
          <div className="slide-caption uppercase tracking-widest text-plant-green">
            Jährliche Reduktion
          </div>
          <div className="slide-data-headline-lg mt-4 tabular-nums leading-none">
            {formatEurNumber(data.derived.ersparnisProJahr)} €
          </div>
        </div>
      </div>
    </SlideFrame>
  );
}

function ComparisonCard({
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
    <div className={`flex flex-col rounded-2xl ${border} ${bg} p-12`}>
      <div className="slide-caption uppercase tracking-widest">{label}</div>
      <div className="slide-data-headline mt-6 tabular-nums leading-none">{value}</div>
      <p className="slide-body mt-6 text-forest-green-700">{sub}</p>
    </div>
  );
}
