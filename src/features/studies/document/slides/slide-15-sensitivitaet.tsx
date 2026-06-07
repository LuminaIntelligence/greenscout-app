import { composeAll } from "@/lib/calculations";
import type { StudyCalcInput } from "@/lib/calculations/types";

import { customerDisplayName, formatCentPerKwh, formatEurNumber } from "../format";
import type { StudyDocumentData } from "../types";
import { SlideFrame } from "./_components/slide-frame";

/**
 * Slide 15 — "Sensitivitätsanalyse: Strompreis-Szenarien".
 *
 * Treue Reproduktion (Pivot-2b). Statische Texte wörtlich aus dem PPTX
 * (siehe `template-content.json` Slide 15):
 *
 *  - Text 0 — "Sensitivitätsanalyse: Strompreis-Szenarien".
 *  - Text 1 — "Netzpreisvarianten und jährliche Einsparung bei PV-Strom
 *    {{pv_verkauf_ct_kwh}} ct/kWh".
 *  - Text 2/3 — Basisszenario / "Bei {{szenario_1_preis_ct_kwh}} ct/kWh
 *    Netzstrom: ca. {{szenario_1_ersparnis_eur}} € Einsparung pro Jahr".
 *  - Text 4/5 — "Moderates Szenario" / "Bei {{szenario_2_preis_ct_kwh}}
 *    ct/kWh Netzstrom: ca. {{szenario_2_ersparnis_eur}} € Einsparung pro
 *    Jahr".
 *  - Text 6/7 — "Hohes Szenario" / "Bei {{szenario_3_preis_ct_kwh}}
 *    ct/kWh Netzstrom: ca. {{szenario_3_ersparnis_eur}} € Einsparung pro
 *    Jahr".
 *  - Text 9 — "Je höher der Netzstrompreis steigt, desto größer wird der
 *    wirtschaftliche Vorteil der PV-Anlage. Studien zeigen dass der
 *    zukünftige Strombedarf von Unternehmen voraussichtlich steigen wird
 *    – getrieben durch KI-Anwendungen, fortschreitende Automatisierung
 *    sowie die Elektrifizierung von Fahrzeugflotten."
 *
 * **Chart-Wahl:** Pure SVG-Bar-Chart, kein Recharts. User-Bestätigung
 * 2026-06-02: Slide 15 bleibt pure SVG, kein neuer Dependency-Layer.
 */
export default function Slide15Sensitivitaet({ data }: { data: StudyDocumentData }) {
  const customerName = customerDisplayName(data.customer);
  const pvCt = formatCentPerKwh(Number(data.study.pvVerkaufEurKwh) * 100).replace(" ct/kWh", "");
  const baseInput = toCalcInput(data);

  type Scenario = {
    label: "Basisszenario" | "Moderates Szenario" | "Hohes Szenario";
    preisCt: number;
    ersparnisEur: number;
  };
  const szenarien: Scenario[] = [];
  const scenarioMeta: Array<{ src: typeof data.study.szenarioPreis1; label: Scenario["label"] }> = [
    { src: data.study.szenarioPreis1, label: "Basisszenario" },
    { src: data.study.szenarioPreis2, label: "Moderates Szenario" },
    { src: data.study.szenarioPreis3, label: "Hohes Szenario" },
  ];
  for (const m of scenarioMeta) {
    if (m.src === null) continue;
    const preisCt = Number(m.src) * 100;
    const ersparnis = composeAll({
      ...baseInput,
      versorgerPreisEurKwh: Number(m.src),
    }).ersparnisProJahr;
    szenarien.push({ label: m.label, preisCt, ersparnisEur: ersparnis });
  }

  const maxValue = szenarien.length > 0 ? Math.max(...szenarien.map((s) => s.ersparnisEur), 1) : 1;

  return (
    <SlideFrame slideNumber={15} customerLabel={customerName}>
      <div className="flex h-full flex-col gap-5">
        {/* Headline + Subtitle */}
        <div className="space-y-1">
          <h2 className="text-[28px] font-bold text-forest-green">
            Sensitivitätsanalyse: Strompreis-Szenarien
          </h2>
          <p className="text-[18px] text-foreground">
            Netzpreisvarianten und jährliche Einsparung bei PV-Strom{" "}
            <span className="font-bold tabular-nums">{pvCt}</span> ct/kWh
          </p>
        </div>

        {/* Side-by-side: Chart links, Text-Liste rechts */}
        <div className="grid flex-1 grid-cols-2 gap-8">
          <SensitivityChart szenarien={szenarien} maxValue={maxValue} />
          <div className="flex flex-col gap-4">
            {szenarien.map((s) => (
              <div key={s.label} className="rounded-xl bg-muted-lime-50 p-5">
                <div className="text-[18px] font-bold text-forest-green">{s.label}</div>
                <p className="mt-1 text-[16px] leading-[1.4] text-foreground">
                  Bei{" "}
                  <span className="font-bold tabular-nums">
                    {formatCentPerKwh(s.preisCt).replace(" ct/kWh", "")}
                  </span>{" "}
                  ct/kWh Netzstrom: <span className="font-bold">ca.</span>{" "}
                  <span className="font-bold tabular-nums text-plant-green">
                    {formatEurNumber(s.ersparnisEur)} €
                  </span>{" "}
                  Einsparung pro Jahr
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Closing */}
        <p className="text-[15px] leading-[1.4] text-foreground">
          Je höher der Netzstrompreis steigt, desto größer wird der wirtschaftliche Vorteil der
          PV-Anlage. Studien zeigen dass der zukünftige Strombedarf von Unternehmen voraussichtlich
          steigen wird – getrieben durch KI-Anwendungen, fortschreitende Automatisierung sowie die
          Elektrifizierung von Fahrzeugflotten.
        </p>
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
  const height = 500;
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
      <line
        x1={padding.left}
        x2={padding.left}
        y1={padding.top}
        y2={height - padding.bottom}
        stroke="#2D473E"
        strokeWidth="2"
      />
      <line
        x1={padding.left}
        x2={width - padding.right}
        y1={height - padding.bottom}
        y2={height - padding.bottom}
        stroke="#2D473E"
        strokeWidth="2"
      />
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
              {new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(s.ersparnisEur)}{" "}
              €
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
              {new Intl.NumberFormat("de-DE", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }).format(s.preisCt)}{" "}
              ct/kWh
            </text>
          </g>
        );
      })}
    </svg>
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
