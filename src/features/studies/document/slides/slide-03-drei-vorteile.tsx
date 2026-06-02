import { buildObjectAddress, customerDisplayName, formatEurNumber } from "../format";
import type { StudyDocumentData } from "../types";
import { SlideFrame } from "./_components/slide-frame";

/**
 * Slide 3 — "Für ihr Unternehmen hat sich die Beauftragung unserer
 *           Auswertung gelohnt." — Drei zentrale Vorteile.
 *
 * Treue Reproduktion (Pivot-2b). Statische Texte wörtlich aus dem PPTX
 * (siehe `template-content.json` Slide 3):
 *
 * - Text 0 (24pt) — Headline.
 * - Text 1 (20pt) — Einleitung "In der Prüfung haben wir..." +
 *   "Für die Liegenschaft: {{customer_object_address_with_flurstueck}}."
 *   + "Öffnen sich drei zentrale Vorteile:".
 * - Text 2 (20pt, mehrere Absätze) — Erstens / Zweitens / Drittens
 *   mit gefetteten Detail-Sätzen und drei {{}}-Markern.
 *
 * Marker:
 *  - {{customer_object_address_with_flurstueck}} → address + Flurstück.
 *  - {{pacht_einnahme_einmalig_eur}} → derived.pachtEinnahmeEinmalig.
 *  - {{ersparnis_pro_monat_eur}} → derived.ersparnisProMonat.
 *  - {{ersparnis_gesamt_vertragslaufzeit_eur}} → derived.ersparnis20Jahre.
 */
export default function Slide03DreiVorteile({ data }: { data: StudyDocumentData }) {
  const customerName = customerDisplayName(data.customer);
  const address = buildObjectAddress(
    data.study.objectName,
    data.study.objectAddress,
    data.study.objectZipCode,
    data.study.objectCity,
  );
  const addressWithFlurstueck =
    data.study.flurstueck && data.study.flurstueck.trim().length > 0
      ? `${address}, Flurstück ${data.study.flurstueck}`
      : address;

  const pacht = formatEurNumber(data.derived.pachtEinnahmeEinmalig);
  const ersparnisMonat = formatEurNumber(data.derived.ersparnisProMonat);
  const ersparnis20 = formatEurNumber(data.derived.ersparnis20Jahre);

  return (
    <SlideFrame slideNumber={3} customerLabel={customerName}>
      <div className="flex h-full flex-col gap-6">
        {/* Text 0 — Headline */}
        <h2 className="text-[24px] font-normal text-forest-green">
          Für ihr Unternehmen hat sich die Beauftragung unserer Auswertung gelohnt.
        </h2>

        {/* Text 1 — Einleitung */}
        <div className="text-[20px] leading-[1.45] text-foreground">
          <p>
            In der Prüfung haben wir die grundsätzliche Eignung Ihrer Fläche und deren potenzielle
            Weiterentwicklung dieser zu einem handelbaren Projektrecht beleuchtet.
          </p>
          <p className="mt-2">
            Für die Liegenschaft: <span className="font-bold">{addressWithFlurstueck}</span>.
          </p>
          <p className="mt-2">Öffnen sich drei zentrale Vorteile:</p>
        </div>

        {/* Text 2 — Drei Vorteile */}
        <div className="space-y-4 text-[20px] leading-[1.45] text-foreground">
          <div>
            <span className="font-normal">Erstens:</span>{" "}
            <span>
              Ihre Fläche kann für ihr Unternehmen{" "}
              <span className="font-bold">
                einmalige Pachteinnahmen, von bis zu {pacht} € erwirtschaften.
              </span>
            </span>
          </div>
          <div>
            <span className="font-normal">Zweitens:</span>{" "}
            <span>
              Grundsätzlich besteht die Möglichkeit, über einen Stromliefervertrag Ihr Unternehmen
              mit Strom aus der auf Ihrer Fläche zu errichtender Anlage zu versorgen, damit
              monatlich bis zu <span className="font-bold">{ersparnisMonat} €</span> gegenüber ihren
              heutigen Stromlieferanten einzusparen.{" "}
              <span className="font-bold">Das sind bei 20 Jahren Laufzeit ca. {ersparnis20} €</span>
            </span>
          </div>
          <div>
            <span className="font-normal">Drittens:</span>{" "}
            <span>
              Diese Vorteile könnten Sie{" "}
              <span className="font-bold">ohne weitere Investitionen</span> durch ihr Unternehmen
              erzielen.
            </span>
          </div>
        </div>
      </div>
    </SlideFrame>
  );
}
