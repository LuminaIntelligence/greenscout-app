import { composeAll } from "@/lib/calculations";
import type { StudyCalcInput } from "@/lib/calculations/types";

import { customerDisplayName, formatCentPerKwh, formatEurNumber } from "../format";
import type { StudyDocumentData } from "../types";
import { SlideFrame } from "./_components/slide-frame";

/**
 * Slide 15 — Sensitivitätsanalyse: Strompreis-Szenarien.
 *
 * Original-PDF: Drei Szenarien (Basis / Moderat / Hoch). Pro Szenario
 * Netzpreis + resultierende Jahres-Ersparnis. Re-Berechnung via
 * `composeAll` mit substituiertem `versorgerPreisEurKwh`.
 *
 * **Chart-Wahl:** Pure SVG-Bar-Chart, kein Recharts. Recharts ist
 * nicht im `package.json` — neue Top-Level-Dep wäre §7.1-Pause-Trigger
 * und der User hat „SVG oder Recharts" als Alternative explizit
 * benannt. Drei Bars sind trivial in SVG.
 */
export default function Slide15Sensitivitaet({ data }: { data: StudyDocumentData }) {
  const pvCt = Number(data.study.pvVerkaufEurKwh) * 100;
  const baseInput = toCalcInput(data);

  const szenarien: Array<{ label: string; preisCt: number; ersparnisEur: number }> = [];
  if (data.study.szenarioPreis1 !== null) {
    const preisCt = Number(data.study.szenarioPreis1) * 100;
    const ersparnis = composeAll({
      ...baseInput,
      versorgerPreisEurKwh: Number(data.study.szenarioPreis1),
    }).ersparnisProJahr;
    szenarien.push({ label: "Basis", preisCt, ersparnisEur: ersparnis });
  }
  if (data.study.szenarioPreis2 !== null) {
    const preisCt = Number(data.study.szenarioPreis2) * 100;
    const ersparnis = composeAll({
      ...baseInput,
      versorgerPreisEurKwh: Number(data.study.szenarioPreis2),
    }).ersparnisProJahr;
    szenarien.push({ label: "Moderat", preisCt, ersparnisEur: ersparnis });
  }
  if (data.study.szenarioPreis3 !== null) {
    const preisCt = Number(data.study.szenarioPreis3) * 100;
    const ersparnis = composeAll({
      ...baseInput,
      versorgerPreisEurKwh: Number(data.study.szenarioPreis3),
    }).ersparnisProJahr;
    szenarien.push({ label: "Hoch", preisCt, ersparnisEur: ersparnis });
  }

  const maxValue = szenarien.length > 0 ? Math.max(...szenarien.map((s) => s.ersparnisEur), 1) : 1;

  return (
    <SlideFrame slideNumber={15} customerLabel={customerDisplayName(data.customer)}>
      <div className="flex h-full flex-col space-y-12">
        <div className="space-y-2">
          <div className="slide-caption uppercase tracking-widest text-plant-green">
            Sensitivität
          </div>
          <h2 className="slide-h2">Netzpreisvarianten bei PV-Strom {formatCentPerKwh(pvCt)}</h2>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-12">
          <SensitivityChart szenarien={szenarien} maxValue={maxValue} />
          <div className="space-y-6">
            {szenarien.map((s) => (
              <SzenarioRow
                key={s.label}
                label={s.label}
                preisLabel={formatCentPerKwh(s.preisCt)}
                ersparnisLabel={`${formatEurNumber(s.ersparnisEur)} €`}
              />
            ))}
          </div>
        </div>
      </div>
    </SlideFrame>
  );
}

function SensitivityChart({
  szenarien,
  maxValue,
}: {
  szenarien: Array<{ label: string; preisCt: number; ersparnisEur: number }>;
  maxValue: number;
}) {
  const width = 700;
  const height = 600;
  const padding = { top: 40, right: 40, bottom: 80, left: 80 };
  const chartHeight = height - padding.top - padding.bottom;
  const chartWidth = width - padding.left - padding.right;
  const barCount = Math.max(szenarien.length, 1);
  const slot = chartWidth / barCount;
  const barWidth = Math.min(slot * 0.6, 120);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-full w-full"
      role="img"
      aria-label="Sensitivitäts-Chart"
    >
      {/* Y-Axis */}
      <line
        x1={padding.left}
        x2={padding.left}
        y1={padding.top}
        y2={height - padding.bottom}
        stroke="#2D473E"
        strokeWidth="2"
      />
      {/* X-Axis */}
      <line
        x1={padding.left}
        x2={width - padding.right}
        y1={height - padding.bottom}
        y2={height - padding.bottom}
        stroke="#2D473E"
        strokeWidth="2"
      />
      {/* Bars */}
      {szenarien.map((s, i) => {
        const ratio = s.ersparnisEur / maxValue;
        const barHeight = chartHeight * ratio;
        const cx = padding.left + slot * i + slot / 2;
        const x = cx - barWidth / 2;
        const y = height - padding.bottom - barHeight;
        return (
          <g key={s.label}>
            <rect x={x} y={y} width={barWidth} height={barHeight} fill="#6A8F4E" rx="6" />
            <text
              x={cx}
              y={y - 16}
              textAnchor="middle"
              fontFamily="var(--font-gabarito-heading), system-ui, sans-serif"
              fontWeight="600"
              fontSize="22"
              fill="#2D473E"
            >
              {formatEurNumber(s.ersparnisEur)} €
            </text>
            <text
              x={cx}
              y={height - padding.bottom + 32}
              textAnchor="middle"
              fontFamily="var(--font-gabarito-body), system-ui, sans-serif"
              fontSize="20"
              fill="#2D473E"
            >
              {s.label}
            </text>
            <text
              x={cx}
              y={height - padding.bottom + 58}
              textAnchor="middle"
              fontFamily="var(--font-gabarito-body), system-ui, sans-serif"
              fontSize="16"
              fill="#2D473E"
              opacity="0.7"
            >
              {formatCentPerKwh(s.preisCt)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function SzenarioRow({
  label,
  preisLabel,
  ersparnisLabel,
}: {
  label: string;
  preisLabel: string;
  ersparnisLabel: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-muted-lime-300 bg-muted-lime-50 px-8 py-6">
      <div>
        <div className="slide-caption uppercase tracking-widest">Szenario {label}</div>
        <div className="slide-h4 tabular-nums text-forest-green-700">{preisLabel}</div>
      </div>
      <div className="slide-h2 tabular-nums text-plant-green">{ersparnisLabel}</div>
    </div>
  );
}

function toCalcInput(data: StudyDocumentData): StudyCalcInput {
  return {
    anlageKwp: Number(data.study.anlageKwp),
    pvErzeugungKwhJahr: Number(data.study.pvErzeugungKwhJahr),
    pvEigenverbrauchKwhJahr: Number(data.study.pvEigenverbrauchKwhJahr),
    pvVerkaufEurKwh: Number(data.study.pvVerkaufEurKwh),
    verbrauchKwhJahr: Number(data.study.verbrauchKwhJahr),
    versorgerPreisEurKwh: Number(data.study.versorgerPreisEurKwh),
    pachtEurProKwp: Number(data.study.pachtEurProKwp),
    vertragslaufzeitJahre: data.study.vertragslaufzeitJahre,
    co2Override: data.study.co2Override,
    co2TonnenProJahrOverride:
      data.study.co2TonnenProJahr === null ? undefined : Number(data.study.co2TonnenProJahr),
    co2HektarMischwaldOverride:
      data.study.co2HektarMischwald === null ? undefined : Number(data.study.co2HektarMischwald),
    co2FussballfelderProJahrOverride:
      data.study.co2FussballfelderProJahr === null
        ? undefined
        : Number(data.study.co2FussballfelderProJahr),
  };
}
