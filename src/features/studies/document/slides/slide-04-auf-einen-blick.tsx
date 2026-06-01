import {
  customerDisplayName,
  formatEur,
  formatEurNumber,
  formatFootballFields,
  formatHectares,
  formatIntegerDe,
  formatKwh,
  formatKwp,
  formatPercent,
  formatTonnes,
} from "../format";
import type { StudyDocumentData } from "../types";
import { SlideFrame } from "./_components/slide-frame";

/**
 * Slide 4 — Auf einen Blick (Money Slide).
 *
 * Original-PDF: Dichteste Zahl-Slide. Block oben links: Anlagengröße +
 * Jahresertrag + 20-Jahre-Ertrag. Block oben rechts: Eigenverbrauchs-
 * Quote + 20-Jahre-Ersparnis + Jahresersparnis. Block unten: CO₂-Block.
 * Footer: Objektstandort + Flurstück-Label.
 */
export default function Slide04AufEinenBlick({ data }: { data: StudyDocumentData }) {
  const customerName = customerDisplayName(data.customer);
  const flurstueckLabel =
    data.study.flurstueck && data.study.flurstueck.trim().length > 0
      ? `Flurstück: ${data.study.flurstueck}`
      : "";

  return (
    <SlideFrame slideNumber={4} customerLabel={customerName}>
      <div className="flex h-full flex-col space-y-8">
        <div className="space-y-2">
          <div className="slide-caption uppercase tracking-widest text-plant-green">
            Auf einen Blick
          </div>
          <h2 className="slide-h2">Ihre Anlage in Zahlen</h2>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <KeyNumberCard
            caption="Installierende Leistung"
            value={formatKwp(Number(data.study.anlageKwp))}
            note={`${formatKwh(Number(data.study.pvErzeugungKwhJahr))} Jahresertrag · ${formatKwh(data.derived.gesamterzeugung20j)} über 20 Jahre`}
          />
          <KeyNumberCard
            caption="Eigenverbrauchsquote"
            value={
              data.study.eigenverbrauchsquoteProzent === null
                ? "—"
                : formatPercent(Number(data.study.eigenverbrauchsquoteProzent))
            }
            note={`Eigenverbrauch ca. ${formatKwh(Number(data.study.pvEigenverbrauchKwhJahr))}`}
          />
          <KeyNumberCard
            caption="20-Jahre-Ersparnis"
            value={formatEur(data.derived.ersparnis20Jahre)}
            note={`Jährlich ca. ${formatEurNumber(data.derived.ersparnisProJahr)} €`}
          />
          <KeyNumberCard
            caption="Dachpacht (einmalig)"
            value={formatEur(data.derived.pachtEinnahmeEinmalig)}
            note="Auszahlung bei Vertragsabschluss"
          />
        </div>

        <div className="rounded-2xl border-2 border-plant-green bg-plant-green-50 p-8">
          <div className="slide-caption uppercase tracking-widest text-plant-green">
            Klimabilanz
          </div>
          <div className="mt-4 grid grid-cols-4 gap-6">
            <CO2Stat
              value={formatTonnes(data.derived.co2TonnenProJahr)}
              label="CO₂ vermieden / Jahr"
            />
            <CO2Stat
              value={formatHectares(data.derived.co2HektarMischwald)}
              label="Mischwald-Äquivalent"
            />
            <CO2Stat
              value={formatFootballFields(data.derived.co2FussballfelderProJahr)}
              label="Fußballfelder / Jahr"
            />
            <CO2Stat
              value={formatIntegerDe(
                data.derived.co2TonnenProJahr * data.study.vertragslaufzeitJahre,
              )}
              label="Tonnen CO₂ in 20 Jahren"
            />
          </div>
        </div>

        <div className="slide-caption mt-auto flex items-end justify-between">
          <span>
            Objektstandort: {data.study.objectName}, {data.study.objectCity}. {flurstueckLabel}
          </span>
        </div>
      </div>
    </SlideFrame>
  );
}

function KeyNumberCard({ caption, value, note }: { caption: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-muted-lime-300 bg-white p-8">
      <div className="slide-caption uppercase tracking-widest">{caption}</div>
      <div className="slide-data-headline mt-4 break-words leading-none">{value}</div>
      <p className="slide-body mt-4 text-forest-green-700">{note}</p>
    </div>
  );
}

function CO2Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="slide-h3 tabular-nums text-plant-green">{value}</div>
      <div className="slide-caption">{label}</div>
    </div>
  );
}
