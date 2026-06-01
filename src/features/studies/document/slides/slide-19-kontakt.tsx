import { consultantFullName, customerDisplayName, formatTerminDe } from "../format";
import type { StudyDocumentData } from "../types";
import { SlideFrame } from "./_components/slide-frame";

/**
 * Slide 19 — Kontaktdaten + Termine + Berater.
 *
 * Original-PDF: Terminvorschläge (zwei optionale Slots, Defekt-D2-
 * konform: leere Termine → leere Phrase, kein „1) am  Uhr"-Fragment).
 * Zentrale GreenScout-Kontaktdaten bleiben statisch (resolved 2026-05-26
 * disambiguation item 4). Nur der Berater-Name rotiert.
 */
export default function Slide19Kontakt({ data }: { data: StudyDocumentData }) {
  const customerName = customerDisplayName(data.customer);
  const consultant = consultantFullName(data.consultant);

  const termin1 = formatTerminDe(data.study.terminVorschlag1);
  const termin2 = formatTerminDe(data.study.terminVorschlag2);
  const hasBothTermine = termin1.length > 0 && termin2.length > 0;

  return (
    <SlideFrame slideNumber={19} customerLabel={customerName}>
      <div className="flex h-full flex-col space-y-12">
        <div className="space-y-2">
          <div className="slide-caption uppercase tracking-widest text-plant-green">
            Nächste Schritte
          </div>
          <h2 className="slide-h2">Lassen Sie uns sprechen</h2>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-12">
          <div className="space-y-6">
            <div className="slide-caption uppercase tracking-widest">Terminvorschläge</div>
            <ol className="space-y-3">
              {termin1 ? (
                <li className="slide-h3 text-forest-green-700">1) {termin1}</li>
              ) : (
                <li className="slide-h3 text-forest-green-300">1) Termin auf Anfrage</li>
              )}
              {hasBothTermine ? <li className="slide-body text-forest-green-700">oder</li> : null}
              {termin2 ? <li className="slide-h3 text-forest-green-700">2) {termin2}</li> : null}
            </ol>
            <p className="slide-body text-forest-green-700">
              Wir freuen uns auf den weiteren Austausch und stehen für Rückfragen jederzeit zur
              Verfügung.
            </p>
          </div>
          <div className="space-y-6 rounded-2xl border-2 border-plant-green bg-plant-green-50 p-10">
            <div className="space-y-2">
              <div className="slide-caption uppercase tracking-widest text-plant-green">
                Ihr Berater
              </div>
              <div className="slide-h2">{consultant}</div>
            </div>
            <dl className="space-y-3">
              <ContactRow label="Telefon" value="+49 172 3794240" />
              <ContactRow label="E-Mail" value="projektberatung@greenscout-ev.de" />
              <ContactRow label="Adresse" value="Utechter Str. 5, 19217 Utecht" />
            </dl>
          </div>
        </div>
      </div>
    </SlideFrame>
  );
}

function ContactRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="slide-caption uppercase tracking-widest">{label}</dt>
      <dd className="slide-h4 mt-1 text-forest-green">{value}</dd>
    </div>
  );
}
