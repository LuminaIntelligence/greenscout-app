import {
  customerDisplayName,
  formatCentPerKwh,
  formatEur,
  formatEurNumber,
  formatKwh,
} from "../format";
import type { StudyDocumentData } from "../types";
import { SlideFrame } from "./_components/slide-frame";

/**
 * Slide 12 — Wirtschaftlichkeit: Stromliefervertrag.
 *
 * Original-PDF: PV-Strompreis vs Netz-Strompreis, dann Jahres- und 20-
 * Jahres-Ersparnis, plus Eigenverbrauchsmenge.
 */
export default function Slide12Stromliefervertrag({ data }: { data: StudyDocumentData }) {
  const pvCt = Number(data.study.pvVerkaufEurKwh) * 100;
  const netzCt = Number(data.study.versorgerPreisEurKwh) * 100;
  const eigenverbrauch = Number(data.study.pvEigenverbrauchKwhJahr);

  return (
    <SlideFrame slideNumber={12} customerLabel={customerDisplayName(data.customer)}>
      <div className="flex h-full flex-col space-y-12">
        <div className="space-y-2">
          <div className="slide-caption uppercase tracking-widest text-plant-green">
            Wirtschaftlichkeit
          </div>
          <h2 className="slide-h2">Stromliefervertrag im Vergleich</h2>
        </div>
        <div className="grid grid-cols-2 gap-10">
          <PreisCard
            label="PV-Strom (fix)"
            value={formatCentPerKwh(pvCt)}
            note="Vertraglich für die volle Laufzeit garantiert"
            accent
          />
          <PreisCard
            label="Netzstrom (aktuell)"
            value={formatCentPerKwh(netzCt)}
            note="Marktrisiko: Preisanpassung jederzeit möglich"
          />
        </div>
        <div className="grid grid-cols-3 gap-10">
          <NumberCard caption="Eigenverbrauchsmenge" value={formatKwh(eigenverbrauch)} />
          <NumberCard
            caption="Jährliche Ersparnis"
            value={`${formatEurNumber(data.derived.ersparnisProJahr)} €`}
          />
          <NumberCard
            caption="20-Jahre-Ersparnis"
            value={formatEur(data.derived.ersparnis20Jahre)}
          />
        </div>
      </div>
    </SlideFrame>
  );
}

function PreisCard({
  label,
  value,
  note,
  accent = false,
}: {
  label: string;
  value: string;
  note: string;
  accent?: boolean;
}) {
  const border = accent ? "border-plant-green border-2" : "border-forest-green-200 border";
  const bg = accent ? "bg-plant-green-50" : "bg-white";
  return (
    <div className={`rounded-2xl ${border} ${bg} p-10`}>
      <div className="slide-caption uppercase tracking-widest">{label}</div>
      <div className="slide-data-headline mt-4 tabular-nums leading-none">{value}</div>
      <p className="slide-body mt-4 text-forest-green-700">{note}</p>
    </div>
  );
}

function NumberCard({ caption, value }: { caption: string; value: string }) {
  return (
    <div className="rounded-2xl border border-muted-lime-300 bg-muted-lime-50 p-8">
      <div className="slide-caption uppercase tracking-widest">{caption}</div>
      <div className="slide-h2 mt-3 tabular-nums text-plant-green">{value}</div>
    </div>
  );
}
