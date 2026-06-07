import { customerDisplayName, formatIntegerDe } from "../format";
import type { StudyDocumentData } from "../types";
import { SlideFrame } from "./_components/slide-frame";

/**
 * Slide 11 — "Energiefluss und Eigenverbrauch".
 *
 * Treue Reproduktion (Pivot-2b PASS 3, siehe DECISIONS 2026-06-03).
 *
 * **Pass-3-Korrektur (Q16 User-Antwort 2026-06-03):** Komplett-Rewrite
 * vom Pass-2-3-Spalten-Layout zum Original-PDF-Layout — vertikale
 * 4-Schritt-Liste mit nummerierten Pfeil-Shape-Icons links + großes Foto
 * rechts. Die vier Schritte:
 *   1. PV-Erzeugung
 *   2. Eigenverbrauch
 *   3. Einspeisung
 *   4. Wirkung
 *
 * Pfeil-Shape-Icons und das Foto kommen aus dem PPTX-Asset-Pool
 * (`public/assets/slide11-step{1..4}.png` + `public/assets/slide11-foto.png`,
 * extrahiert via `scripts/extract-template-images.py`).
 *
 * Statische Texte wörtlich aus dem PPTX (siehe `template-content.json`
 * Slide 11):
 *
 *  - Text 0 — "Energiefluss und Eigenverbrauch".
 *  - Text 1 — "PV-Erzeugung {{pv_erzeugung_kwh_jahr}} kWh/Jahr –
 *    {{eigenverbrauchsquote_prozent}}% direkt genutzt".
 *  - Schritt 1 (PV-Erzeugung) — "Gesamtertrag: {{pv_erzeugung_kwh_jahr}}
 *    kWh pro Jahr".
 *  - Schritt 2 (Eigenverbrauch) — "Direkter Verbrauch:
 *    {{pv_eigenverbrauch_kwh_jahr}} kWh pro Jahr
 *    ({{eigenverbrauchsquote_prozent}}% der PV-Menge)".
 *  - Schritt 3 (Einspeisung) — "Netzeinspeisung:
 *    {{netzeinspeisung_kwh_jahr}} kWh pro Jahr".
 *  - Schritt 4 (Wirkung) — "Hoher direkter Verbrauch reduziert Netzbezug
 *    und Kosten – damit starke Unabhängigkeit vom bisherigen
 *    Netzbetreiber".
 */
export default function Slide11Energiefluss({ data }: { data: StudyDocumentData }) {
  const customerName = customerDisplayName(data.customer);
  const pvErzeugung = formatIntegerDe(Number(data.study.pvErzeugungKwhJahr));
  const pvEigenverbrauch = formatIntegerDe(Number(data.study.pvEigenverbrauchKwhJahr));
  const quote =
    data.study.eigenverbrauchsquoteProzent === null
      ? "—"
      : formatIntegerDe(Number(data.study.eigenverbrauchsquoteProzent));
  const netzeinspeisung =
    data.study.netzeinspeisungKwhJahr === null
      ? "—"
      : formatIntegerDe(Number(data.study.netzeinspeisungKwhJahr));

  const steps: Array<{ index: 1 | 2 | 3 | 4; title: string; body: string }> = [
    {
      index: 1,
      title: "PV-Erzeugung",
      body: `Gesamtertrag: ${pvErzeugung} kWh pro Jahr`,
    },
    {
      index: 2,
      title: "Eigenverbrauch",
      body: `Direkter Verbrauch: ${pvEigenverbrauch} kWh pro Jahr (${quote}% der PV-Menge)`,
    },
    {
      index: 3,
      title: "Einspeisung",
      body: `Netzeinspeisung: ${netzeinspeisung} kWh pro Jahr`,
    },
    {
      index: 4,
      title: "Wirkung",
      body: "Hoher direkter Verbrauch reduziert Netzbezug und Kosten – damit starke Unabhängigkeit vom bisherigen Netzbetreiber",
    },
  ];

  return (
    <SlideFrame slideNumber={11} customerLabel={customerName}>
      <div className="flex h-full flex-col gap-5">
        {/* Headline + Subtitle */}
        <div className="space-y-1">
          <h2 className="text-[28px] font-bold text-forest-green">
            Energiefluss und Eigenverbrauch
          </h2>
          <p className="text-[18px] text-foreground">
            PV-Erzeugung <span className="font-bold tabular-nums">{pvErzeugung}</span> kWh/Jahr –{" "}
            <span className="font-bold tabular-nums">{quote}%</span> direkt genutzt
          </p>
        </div>

        {/* Two-column body: 4-step vertical list links, großes Foto rechts. */}
        <div className="grid flex-1 grid-cols-[3fr_2fr] gap-10">
          {/* Vertikale 4-Schritt-Liste mit nummerierten Pfeil-Shape-Icons */}
          <ol className="flex flex-col justify-between gap-4">
            {steps.map((s) => (
              <li key={s.index} className="flex items-start gap-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/assets/slide11-step${s.index}.png`}
                  alt={`Schritt ${s.index}`}
                  className="h-16 w-auto flex-shrink-0"
                />
                <div className="flex-1">
                  <div className="text-[22px] font-bold text-forest-green">{s.title}</div>
                  <p className="mt-1 text-[16px] leading-[1.4] text-foreground">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>

          {/* Großes Foto rechts (PPTX-Asset) */}
          <div className="flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/slide11-foto.png"
              alt="Energiefluss"
              className="h-full max-h-[600px] w-full rounded-xl object-cover"
            />
          </div>
        </div>
      </div>
    </SlideFrame>
  );
}
