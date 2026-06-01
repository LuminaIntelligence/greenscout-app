import Slide01Cover from "./slides/slide-01-cover";
import Slide02Glueckwunsch from "./slides/slide-02-glueckwunsch";
import Slide03DreiVorteile from "./slides/slide-03-drei-vorteile";
import Slide04AufEinenBlick from "./slides/slide-04-auf-einen-blick";
import Slide05VorherNachher from "./slides/slide-05-vorher-nachher";
import Slide06Mission from "./slides/slide-06-mission";
import Slide07Partner from "./slides/slide-07-partner";
import Slide08Zusammenarbeit from "./slides/slide-08-zusammenarbeit";
import Slide09Ausgangssituation from "./slides/slide-09-ausgangssituation";
import Slide10PVAnlagenkonzept from "./slides/slide-10-pv-anlagenkonzept";
import Slide11Energiefluss from "./slides/slide-11-energiefluss";
import Slide12Stromliefervertrag from "./slides/slide-12-stromliefervertrag";
import Slide13Langfristig from "./slides/slide-13-langfristig";
import Slide14Vergleich from "./slides/slide-14-vergleich";
import Slide15Sensitivitaet from "./slides/slide-15-sensitivitaet";
import Slide16Variantenvergleich from "./slides/slide-16-variantenvergleich";
import Slide17Timeline from "./slides/slide-17-timeline";
import Slide18EEG from "./slides/slide-18-eeg";
import Slide19Kontakt from "./slides/slide-19-kontakt";
import type { StudyDocumentData } from "./types";

/**
 * §7.10-Pivot PR 2 — Root composition of all 19 slide components.
 *
 * Consumed by:
 *   - PR 3 Playwright-PDF-Endpoint (server-side render → headless
 *     Chromium → PDF buffer).
 *   - PR 4 public HMAC-gated online view (read-only Kunden-Sicht).
 *   - the dev-only `/dev/slides` preview route (this PR).
 *
 * The slide order is intentionally hardcoded — the 19-slide structure
 * is the customer-facing deliverable contract per SPEC §4.5 / §4.8,
 * not a runtime configuration knob.
 */
export function StudyDocument({ data }: { data: StudyDocumentData }) {
  return (
    <div className="study-document flex flex-col gap-12">
      <Slide01Cover data={data} />
      <Slide02Glueckwunsch data={data} />
      <Slide03DreiVorteile data={data} />
      <Slide04AufEinenBlick data={data} />
      <Slide05VorherNachher data={data} />
      <Slide06Mission data={data} />
      <Slide07Partner data={data} />
      <Slide08Zusammenarbeit data={data} />
      <Slide09Ausgangssituation data={data} />
      <Slide10PVAnlagenkonzept data={data} />
      <Slide11Energiefluss data={data} />
      <Slide12Stromliefervertrag data={data} />
      <Slide13Langfristig data={data} />
      <Slide14Vergleich data={data} />
      <Slide15Sensitivitaet data={data} />
      <Slide16Variantenvergleich data={data} />
      <Slide17Timeline data={data} />
      <Slide18EEG data={data} />
      <Slide19Kontakt data={data} />
    </div>
  );
}
