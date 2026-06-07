import { customerDisplayName, formatCentPerKwh, formatEurNumber } from "../format";
import type { StudyDocumentData } from "../types";
import { SlideFrame } from "./_components/slide-frame";

/**
 * Slide 14 — "Vergleich: Mit PV vs. Ohne PV".
 *
 * Treue Reproduktion (Pivot-2b PASS 3, siehe DECISIONS 2026-06-03).
 *
 * **Pass-3-Korrektur (Q17 User-Antwort 2026-06-03):** Komplett-Rewrite
 * vom Pass-2-Text-2-Karten-Layout zum Original-PDF-Balkendiagramm. Zwei
 * vertikale Bars side-by-side (Ohne PV / Mit PV) als pure SVG (analog
 * Slide 15), Y-Achse mit €-Tick-Labels, darunter die Differenz als
 * „Jährliche Reduktion der Stromkosten" beziffert. **Kein Recharts** —
 * §7.1-Trigger vermieden, konsistent mit Slide-15-Entscheidung.
 *
 * Statische Texte wörtlich aus dem PPTX (siehe `template-content.json`
 * Slide 14):
 *
 *  - Text 0 — "Vergleich: Mit PV vs. Ohne PV".
 *  - Text 1 — "Jährliche Stromkosten und direkte Einsparung".
 *  - Text 4/5 — "Ohne PV: ca. {{stromkosten_ohne_pv_eur_jahr}} €
 *    Stromkosten pro Jahr" / "Aktueller Bezug, volle Marktabhängigkeit".
 *  - Text 7/8 — "Mit PV: ca. {{stromkosten_mit_pv_eur_jahr}} €
 *    Stromkosten pro Jahr" / "Nach PV-Lieferung, fixer PV-Strompreis
 *    {{pv_verkauf_ct_kwh}} ct/kWh".
 *  - Text 10/11 — "Jährliche Reduktion der Stromkosten: ca.
 *    {{ersparnis_pro_jahr_eur}} €" / "Direkte Einsparung durch
 *    PV-Stromlieferung".
 *  - Text 13/14 — "Ihre Vorteile wenn Sie den Pachtvertrag inklusive
 *    eines Stromliefervertrags umsetzen." / "Wirtschaftlicher und
 *    planbarer Energiebezug".
 */
export default function Slide14Vergleich({ data }: { data: StudyDocumentData }) {
  const customerName = customerDisplayName(data.customer);
  const ohnePvNum = data.derived.stromkostenOhnePvEurJahr;
  const mitPvNum = data.derived.stromkostenMitPvEurJahr;
  const ohnePv = formatEurNumber(ohnePvNum);
  const mitPv = formatEurNumber(mitPvNum);
  const ersparnisJahr = formatEurNumber(data.derived.ersparnisProJahr);
  const pvCt = formatCentPerKwh(Number(data.study.pvVerkaufEurKwh) * 100).replace(" ct/kWh", "");

  return (
    <SlideFrame slideNumber={14} customerLabel={customerName}>
      <div className="flex h-full flex-col gap-5">
        {/* Headline + Subtitle */}
        <div className="space-y-1">
          <h2 className="text-[28px] font-bold text-forest-green">Vergleich: Mit PV vs. Ohne PV</h2>
          <p className="text-[18px] text-foreground">
            Jährliche Stromkosten und direkte Einsparung
          </p>
        </div>

        {/* Side-by-side: Bar-Chart links, Text-Beschreibung rechts */}
        <div className="grid flex-1 grid-cols-2 gap-8">
          <StromkostenBarChart ohnePvEur={ohnePvNum} mitPvEur={mitPvNum} />

          <div className="flex flex-col gap-4">
            <div className="rounded-xl border-2 border-forest-green p-5">
              <div className="text-[20px] font-bold text-forest-green">
                Ohne PV: <span className="tabular-nums">ca. {ohnePv}</span> € Stromkosten pro Jahr
              </div>
              <p className="mt-1 text-[15px] leading-[1.4] text-foreground">
                Aktueller Bezug, volle Marktabhängigkeit
              </p>
            </div>
            <div className="rounded-xl border-2 border-plant-green bg-plant-green-50 p-5">
              <div className="text-[20px] font-bold text-plant-green">
                Mit PV: <span className="tabular-nums">ca. {mitPv}</span> € Stromkosten pro Jahr
              </div>
              <p className="mt-1 text-[15px] leading-[1.4] text-foreground">
                Nach PV-Lieferung, fixer PV-Strompreis <span className="tabular-nums">{pvCt}</span>{" "}
                ct/kWh
              </p>
            </div>
            <div className="rounded-xl bg-muted-lime-100 p-5">
              <div className="text-[22px] font-bold text-plant-green">
                Jährliche Reduktion der Stromkosten:{" "}
                <span className="tabular-nums">ca. {ersparnisJahr} €</span>
              </div>
              <p className="mt-1 text-[15px] text-foreground">
                Direkte Einsparung durch PV-Stromlieferung
              </p>
            </div>
          </div>
        </div>

        {/* Closing */}
        <div className="rounded-xl bg-forest-green p-5 text-white">
          <div className="text-[20px] font-bold">
            Ihre Vorteile wenn Sie den Pachtvertrag inklusive eines Stromliefervertrags umsetzen.
          </div>
          <p className="mt-1 text-[16px]">Wirtschaftlicher und planbarer Energiebezug</p>
        </div>
      </div>
    </SlideFrame>
  );
}

/**
 * Pure-SVG-BarChart (analog Slide 15) — zwei vertikale Bars side-by-side
 * mit linearer €-Y-Achse, Tick-Labels und Bar-Top-Labels.
 *
 * Q17 ausdrücklich: pure SVG, keine Recharts-Dep, §7.1-Trigger vermieden.
 */
function StromkostenBarChart({ ohnePvEur, mitPvEur }: { ohnePvEur: number; mitPvEur: number }) {
  const width = 600;
  const height = 500;
  const padding = { top: 40, right: 40, bottom: 80, left: 100 };
  const chartHeight = height - padding.top - padding.bottom;
  const chartWidth = width - padding.left - padding.right;

  // Y-Skala: lineare €-Skala bis zum nächsten 1.000er-Schritt über dem
  // höheren Wert. Mit fünf Tick-Labels (0/25/50/75/100 % vom Max).
  const rawMax = Math.max(ohnePvEur, mitPvEur, 1);
  const tickStep = niceTickStep(rawMax / 4);
  const yMax = Math.ceil(rawMax / tickStep) * tickStep;
  const tickCount = Math.round(yMax / tickStep);

  const bars = [
    { label: "Ohne PV", value: ohnePvEur, fill: "#2D473E" },
    { label: "Mit PV", value: mitPvEur, fill: "#6A8F4E" },
  ];
  const slot = chartWidth / bars.length;
  const barWidth = Math.min(slot * 0.55, 120);

  const yToPx = (val: number) => padding.top + chartHeight * (1 - val / yMax);

  const eurFormatter = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-full w-full"
      role="img"
      aria-label="Stromkosten-Vergleich: Mit PV vs. Ohne PV"
    >
      {/* Y-Achse */}
      <line
        x1={padding.left}
        x2={padding.left}
        y1={padding.top}
        y2={height - padding.bottom}
        stroke="#2D473E"
        strokeWidth="2"
      />
      {/* X-Achse */}
      <line
        x1={padding.left}
        x2={width - padding.right}
        y1={height - padding.bottom}
        y2={height - padding.bottom}
        stroke="#2D473E"
        strokeWidth="2"
      />

      {/* Y-Achsen-Ticks + Gridlines */}
      {Array.from({ length: tickCount + 1 }).map((_, i) => {
        const val = i * tickStep;
        const y = yToPx(val);
        return (
          <g key={i}>
            <line
              x1={padding.left - 6}
              x2={padding.left}
              y1={y}
              y2={y}
              stroke="#2D473E"
              strokeWidth="2"
            />
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y}
              y2={y}
              stroke="#2D473E"
              strokeOpacity="0.1"
              strokeWidth="1"
            />
            <text
              x={padding.left - 12}
              y={y + 5}
              textAnchor="end"
              fontFamily="var(--font-gabarito-body), system-ui, sans-serif"
              fontSize="14"
              fill="#2D473E"
            >
              {eurFormatter.format(val)} €
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {bars.map((b, i) => {
        const cx = padding.left + slot * i + slot / 2;
        const x = cx - barWidth / 2;
        const y = yToPx(b.value);
        const barHeight = height - padding.bottom - y;
        return (
          <g key={b.label}>
            <rect x={x} y={y} width={barWidth} height={barHeight} fill={b.fill} rx="6" />
            <text
              x={cx}
              y={y - 12}
              textAnchor="middle"
              fontFamily="var(--font-gabarito-heading), system-ui, sans-serif"
              fontWeight="600"
              fontSize="20"
              fill="#2D473E"
            >
              {eurFormatter.format(b.value)} €
            </text>
            <text
              x={cx}
              y={height - padding.bottom + 32}
              textAnchor="middle"
              fontFamily="var(--font-gabarito-body), system-ui, sans-serif"
              fontSize="20"
              fontWeight="600"
              fill="#2D473E"
            >
              {b.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/**
 * Round a raw step value to the next "nice" magnitude — 1/2/2.5/5 × 10^n.
 * Keeps Y-axis tick labels readable (e.g. 5.000 € / 10.000 € / 25.000 €).
 */
function niceTickStep(raw: number): number {
  if (raw <= 0) return 1;
  const exp = Math.floor(Math.log10(raw));
  const base = Math.pow(10, exp);
  const norm = raw / base;
  let stepNorm: number;
  if (norm <= 1) stepNorm = 1;
  else if (norm <= 2) stepNorm = 2;
  else if (norm <= 2.5) stepNorm = 2.5;
  else if (norm <= 5) stepNorm = 5;
  else stepNorm = 10;
  return stepNorm * base;
}
