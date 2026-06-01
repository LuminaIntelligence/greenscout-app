import { buildObjectAddress, customerDisplayName, formatEur, formatEurNumber } from "../format";
import type { StudyDocumentData } from "../types";
import { SlideFrame } from "./_components/slide-frame";

/**
 * Slide 3 — Drei zentrale Vorteile.
 *
 * Original-PDF: Headline mit der vollen Objektadresse + Flurstück
 * inline, dann drei Vorteile als Karten: Pacht-Einmalzahlung,
 * monatliche Ersparnis, 20-Jahre-Ersparnis.
 */
export default function Slide03DreiVorteile({ data }: { data: StudyDocumentData }) {
  const customerName = customerDisplayName(data.customer);
  const address = buildObjectAddress(
    data.study.objectName,
    data.study.objectAddress,
    data.study.objectZipCode,
    data.study.objectCity,
  );
  const flurstueckSuffix =
    data.study.flurstueck && data.study.flurstueck.trim().length > 0
      ? ` in Flurstück ${data.study.flurstueck}`
      : "";

  return (
    <SlideFrame slideNumber={3} customerLabel={customerName}>
      <div className="flex h-full flex-col space-y-12">
        <div className="space-y-3">
          <div className="slide-caption uppercase tracking-widest text-plant-green">
            Drei zentrale Vorteile
          </div>
          <h2 className="slide-h2">Für Ihr Dach am Standort</h2>
          <p className="slide-body-lg text-forest-green-700">
            {address}
            {flurstueckSuffix}
          </p>
        </div>
        <div className="grid flex-1 grid-cols-3 gap-10">
          <VorteilCard
            label="Einmal-Dachpacht"
            value={formatEur(data.derived.pachtEinnahmeEinmalig)}
            description="bei Vertragsabschluss"
          />
          <VorteilCard
            label="Monatliche Ersparnis"
            value={`${formatEurNumber(data.derived.ersparnisProMonat)} €`}
            description="durch günstigeren PV-Strom"
          />
          <VorteilCard
            label="20-Jahre-Ersparnis"
            value={formatEur(data.derived.ersparnis20Jahre)}
            description="kumulierter Vorteil über die Laufzeit"
          />
        </div>
      </div>
    </SlideFrame>
  );
}

function VorteilCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-muted-lime-300 bg-muted-lime-50 p-10">
      <div className="slide-caption uppercase tracking-widest">{label}</div>
      <div className="slide-data-headline mt-6 break-words leading-none">{value}</div>
      <p className="slide-body mt-6 text-forest-green-700">{description}</p>
    </div>
  );
}
