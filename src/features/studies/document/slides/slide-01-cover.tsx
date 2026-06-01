import { consultantFullName, customerDisplayName } from "../format";
import type { StudyDocumentData } from "../types";
import { SlideFrame } from "./_components/slide-frame";

/**
 * Slide 1 — Titelseite.
 *
 * Original-PDF: Großes Hero-„Machbarkeitsstudie PV"-Layout, mit
 * Customer/Object-Name und „Eingereicht über <Berater>".
 */
export default function Slide01Cover({ data }: { data: StudyDocumentData }) {
  const customerName = customerDisplayName(data.customer);
  const consultant = consultantFullName(data.consultant);

  return (
    <SlideFrame slideNumber={1} customerLabel={customerName} showFooter={false}>
      <div className="flex h-full flex-col justify-between py-12">
        <div className="slide-caption uppercase tracking-widest">GreenScout e.V.</div>
        <div className="space-y-10">
          <div className="slide-caption uppercase tracking-widest text-plant-green">
            Machbarkeitsstudie Photovoltaik
          </div>
          <h1 className="slide-title text-[96px]">{customerName}</h1>
          <div className="slide-h3 text-forest-green-700">{data.study.objectName}</div>
        </div>
        <div className="space-y-2">
          <div className="slide-caption uppercase tracking-widest">Eingereicht über</div>
          <div className="slide-h3">{consultant}</div>
        </div>
      </div>
    </SlideFrame>
  );
}
