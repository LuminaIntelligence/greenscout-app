import { customerDisplayName, formatIntegerDe } from "../format";
import type { StudyDocumentData } from "../types";
import { SlideFrame } from "./_components/slide-frame";

/**
 * Slide 11 — "Energiefluss und Eigenverbrauch".
 *
 * Treue Reproduktion (Pivot-2b). Statische Texte wörtlich aus dem PPTX
 * (siehe `template-content.json` Slide 11):
 *
 *  - Text 0 — "Energiefluss und Eigenverbrauch".
 *  - Text 1 — "PV-Erzeugung {{pv_erzeugung_kwh_jahr}} kWh/Jahr –
 *    {{eigenverbrauchsquote_prozent}}% direkt genutzt".
 *  - Drei Phasen-Blöcke:
 *     PV-Erzeugung — "Gesamtertrag: {{pv_erzeugung_kwh_jahr}} kWh pro Jahr"
 *     Eigenverbrauch — "Direkter Verbrauch: {{pv_eigenverbrauch_kwh_jahr}}
 *        kWh pro Jahr ({{eigenverbrauchsquote_prozent}}% der PV-Menge)"
 *     Einspeisung — "Netzeinspeisung: {{netzeinspeisung_kwh_jahr}} kWh
 *        pro Jahr"
 *  - "Wirkung" — "Hoher direkter Verbrauch reduziert Netzbezug und Kosten
 *    – damit starke Unabhängigkeit vom bisherigen Netzbetreiber".
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

  return (
    <SlideFrame slideNumber={11} customerLabel={customerName}>
      <div className="flex h-full flex-col gap-6">
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

        {/* Three phase blocks */}
        <div className="grid grid-cols-3 gap-5">
          <PhaseBlock
            title="PV-Erzeugung"
            value={`${pvErzeugung} kWh`}
            label="Gesamtertrag pro Jahr"
          />
          <PhaseBlock
            title="Eigenverbrauch"
            value={`${pvEigenverbrauch} kWh`}
            label={`Direkter Verbrauch pro Jahr (${quote}% der PV-Menge)`}
          />
          <PhaseBlock
            title="Einspeisung"
            value={`${netzeinspeisung} kWh`}
            label="Netzeinspeisung pro Jahr"
          />
        </div>

        {/* Wirkung */}
        <div className="rounded-xl bg-plant-green-50 p-6">
          <div className="text-[20px] font-bold text-plant-green">Wirkung</div>
          <p className="mt-2 text-[18px] leading-[1.4] text-foreground">
            Hoher direkter Verbrauch reduziert Netzbezug und Kosten – damit starke Unabhängigkeit
            vom bisherigen Netzbetreiber
          </p>
        </div>
      </div>
    </SlideFrame>
  );
}

function PhaseBlock({ title, value, label }: { title: string; value: string; label: string }) {
  return (
    <div className="rounded-xl border-2 border-plant-green p-6">
      <div className="text-[20px] font-bold text-plant-green">{title}</div>
      <div className="mt-3 text-[36px] font-bold tabular-nums leading-none text-forest-green">
        {value}
      </div>
      <p className="mt-3 text-[16px] leading-[1.4] text-foreground">{label}</p>
    </div>
  );
}
