import { customerDisplayName, formatCentPerKwh, formatEur, formatEurNumber } from "../format";
import type { StudyDocumentData } from "../types";
import { ImageSlot } from "./_components/image-slot";
import { SlideFrame } from "./_components/slide-frame";

/**
 * Slide 5 — Jetzt / Später Wirtschaftlichkeit (VORHER / NACHHER).
 *
 * Original-PDF: Linke Spalte „Vorher"-Foto, rechte Spalte „Nachher"-
 * Foto (BEFORE/AFTER). Unter den Fotos je eine Kennzahlen-Karte. Defekt
 * R2-3-konform: beide Fotos in identischer Bounding-Box.
 */
export default function Slide05VorherNachher({ data }: { data: StudyDocumentData }) {
  const customerName = customerDisplayName(data.customer);
  const pvVerkaufCt = Number(data.study.pvVerkaufEurKwh) * 100;

  return (
    <SlideFrame slideNumber={5} customerLabel={customerName}>
      <div className="flex h-full flex-col space-y-8">
        <div className="space-y-2">
          <div className="slide-caption uppercase tracking-widest text-plant-green">
            Vorher · Nachher
          </div>
          <h2 className="slide-h2">Ihr Dach vor und nach der Installation</h2>
        </div>

        <div className="grid flex-1 grid-cols-2 gap-12">
          <div className="space-y-4">
            <div className="slide-caption uppercase tracking-widest">Vorher</div>
            <ImageSlot
              src={data.images.beforeUrl}
              alt="Dach vor PV-Installation"
              emptyLabel="Vorher-Bild fehlt"
            />
            <div className="rounded-xl border border-muted-lime-300 bg-muted-lime-50 p-6">
              <div className="slide-caption uppercase">Status quo</div>
              <p className="slide-body mt-2">
                Ungenutzte Dachfläche. Stromkosten weiterhin am Versorgermarkt.
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="slide-caption uppercase tracking-widest">Nachher</div>
            <ImageSlot
              src={data.images.afterUrl}
              alt="Dach mit installierter PV-Anlage"
              emptyLabel="Nachher-Bild fehlt"
            />
            <div className="rounded-xl border border-plant-green bg-plant-green-50 p-6">
              <div className="slide-caption uppercase text-plant-green">Mit PV-Eigenverbrauch</div>
              <p className="slide-body mt-2">
                PV-Strom für {formatCentPerKwh(pvVerkaufCt)} —{" "}
                {formatEurNumber(data.derived.ersparnis20Jahre)} € Einsparpotential gegenüber dem
                heutigen Stromlieferanten.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-muted-lime-300 bg-white p-8">
          <div className="slide-caption uppercase tracking-widest">Einmal-Dachpacht</div>
          <div className="slide-h2 mt-2 tabular-nums text-plant-green">
            {formatEur(data.derived.pachtEinnahmeEinmalig)}
          </div>
        </div>
      </div>
    </SlideFrame>
  );
}
