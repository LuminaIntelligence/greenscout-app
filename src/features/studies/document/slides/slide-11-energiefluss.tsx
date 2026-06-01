import { customerDisplayName, formatKwh, formatPercent } from "../format";
import type { StudyDocumentData } from "../types";
import { SlideFrame } from "./_components/slide-frame";

/**
 * Slide 11 — Energiefluss und Eigenverbrauch.
 *
 * Original-PDF: Drei Säulen: PV-Erzeugung → Eigenverbrauch → Netz-
 * einspeisung.
 */
export default function Slide11Energiefluss({ data }: { data: StudyDocumentData }) {
  const pvErzeugung = Number(data.study.pvErzeugungKwhJahr);
  const pvEigenverbrauch = Number(data.study.pvEigenverbrauchKwhJahr);
  const netzeinspeisung =
    data.study.netzeinspeisungKwhJahr === null ? null : Number(data.study.netzeinspeisungKwhJahr);
  const eigenverbrauchsquote =
    data.study.eigenverbrauchsquoteProzent === null
      ? null
      : Number(data.study.eigenverbrauchsquoteProzent);

  return (
    <SlideFrame slideNumber={11} customerLabel={customerDisplayName(data.customer)}>
      <div className="flex h-full flex-col space-y-12">
        <div className="space-y-2">
          <div className="slide-caption uppercase tracking-widest text-plant-green">
            Energiefluss
          </div>
          <h2 className="slide-h2">Wo der Strom hinfließt</h2>
        </div>
        <div className="grid flex-1 grid-cols-3 gap-10">
          <FlowCard
            phase="Erzeugung"
            value={formatKwh(pvErzeugung)}
            sub={
              eigenverbrauchsquote === null
                ? "Jährliche PV-Produktion"
                : `${formatPercent(eigenverbrauchsquote)} direkt genutzt`
            }
          />
          <FlowCard
            phase="Eigenverbrauch"
            value={formatKwh(pvEigenverbrauch)}
            sub={
              eigenverbrauchsquote === null
                ? "der PV-Menge selbst genutzt"
                : `${formatPercent(eigenverbrauchsquote)} der PV-Menge`
            }
            accent
          />
          <FlowCard
            phase="Netzeinspeisung"
            value={netzeinspeisung === null ? "—" : formatKwh(netzeinspeisung)}
            sub="Vergütung gemäß EEG"
          />
        </div>
      </div>
    </SlideFrame>
  );
}

function FlowCard({
  phase,
  value,
  sub,
  accent = false,
}: {
  phase: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  const border = accent ? "border-plant-green border-2" : "border-muted-lime-300 border";
  const bg = accent ? "bg-plant-green-50" : "bg-white";
  return (
    <div className={`flex flex-col rounded-2xl ${border} ${bg} p-10`}>
      <div className="slide-caption uppercase tracking-widest">{phase}</div>
      <div className="slide-h2 mt-6 tabular-nums text-plant-green">{value}</div>
      <p className="slide-body mt-4 text-forest-green-700">{sub}</p>
    </div>
  );
}
