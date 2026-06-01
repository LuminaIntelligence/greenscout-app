import { customerDisplayName, formatCentPerKwh, formatEur, formatEurNumber } from "../format";
import type { StudyDocumentData } from "../types";
import { SlideFrame } from "./_components/slide-frame";

/**
 * Slide 16 — Variantenvergleich und Empfehlung.
 *
 * Original-PDF: Zwei Varianten („A: Nur Flächenpacht" / „B: Pacht +
 * fixer PV-Strompreis"), darunter Empfehlung. R2-6-konform: variant
 * columns gleich hoch (CSS Grid).
 */
export default function Slide16Variantenvergleich({ data }: { data: StudyDocumentData }) {
  const customerName = customerDisplayName(data.customer);
  const pvCt = Number(data.study.pvVerkaufEurKwh) * 100;

  return (
    <SlideFrame slideNumber={16} customerLabel={customerName}>
      <div className="flex h-full flex-col space-y-12">
        <div className="space-y-2">
          <div className="slide-caption uppercase tracking-widest text-plant-green">
            Variantenvergleich
          </div>
          <h2 className="slide-h2">{data.study.objectName} — Welche Variante passt zu Ihnen?</h2>
        </div>
        <div
          className="grid flex-1 gap-10"
          style={{
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gridAutoRows: "1fr",
          }}
        >
          <VariantCard
            label="Variante A"
            title="Nur Flächenpacht"
            kpis={[
              { label: "Einmal-Dachpacht", value: formatEur(data.derived.pachtEinnahmeEinmalig) },
            ]}
            body="Sie verpachten die Dachfläche. Strom beziehen Sie weiterhin am Versorgermarkt zu schwankenden Konditionen."
          />
          <VariantCard
            label="Variante B"
            title="Pacht + fixer PV-Strompreis"
            kpis={[
              { label: "Einmal-Dachpacht", value: formatEur(data.derived.pachtEinnahmeEinmalig) },
              { label: "PV-Strompreis (fix)", value: formatCentPerKwh(pvCt) },
              {
                label: "Jährliche Ersparnis",
                value: `${formatEurNumber(data.derived.ersparnisProJahr)} €`,
              },
              {
                label: "Ersparnis 20 Jahre",
                value: formatEur(data.derived.ersparnis20Jahre),
              },
            ]}
            body="Sie verpachten die Fläche und beziehen den PV-Strom zu einem für die volle Laufzeit fixen Preis."
            accent
          />
        </div>
      </div>
    </SlideFrame>
  );
}

function VariantCard({
  label,
  title,
  kpis,
  body,
  accent = false,
}: {
  label: string;
  title: string;
  kpis: Array<{ label: string; value: string }>;
  body: string;
  accent?: boolean;
}) {
  const border = accent ? "border-2 border-plant-green" : "border border-forest-green-200";
  const bg = accent ? "bg-plant-green-50" : "bg-white";
  return (
    <div className={`flex h-full flex-col rounded-2xl ${border} ${bg} p-10`}>
      <div className="slide-caption uppercase tracking-widest">{label}</div>
      <h3 className="slide-h2 mt-2">{title}</h3>
      <dl className="mt-8 space-y-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="flex items-baseline justify-between border-b border-muted-lime-300 pb-3"
          >
            <dt className="slide-body text-forest-green-700">{k.label}</dt>
            <dd className="slide-h3 tabular-nums text-forest-green">{k.value}</dd>
          </div>
        ))}
      </dl>
      <p className="slide-body mt-auto pt-8 text-forest-green-700">{body}</p>
    </div>
  );
}
