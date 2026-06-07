import { notFound } from "next/navigation";

import { makeFixtureStudyDocumentData } from "@/features/studies/document/__fixtures__/study-document-data.fixture";
import { StudyDocument } from "@/features/studies/document/document";
import Slide01Cover from "@/features/studies/document/slides/slide-01-cover";
import Slide02Glueckwunsch from "@/features/studies/document/slides/slide-02-glueckwunsch";
import Slide03DreiVorteile from "@/features/studies/document/slides/slide-03-drei-vorteile";
import Slide04AufEinenBlick from "@/features/studies/document/slides/slide-04-auf-einen-blick";
import Slide05VorherNachher from "@/features/studies/document/slides/slide-05-vorher-nachher";
import Slide06Mission from "@/features/studies/document/slides/slide-06-mission";
import Slide07Partner from "@/features/studies/document/slides/slide-07-partner";
import Slide08Zusammenarbeit from "@/features/studies/document/slides/slide-08-zusammenarbeit";
import Slide09Ausgangssituation from "@/features/studies/document/slides/slide-09-ausgangssituation";
import Slide10PVAnlagenkonzept from "@/features/studies/document/slides/slide-10-pv-anlagenkonzept";
import Slide11Energiefluss from "@/features/studies/document/slides/slide-11-energiefluss";
import Slide12Stromliefervertrag from "@/features/studies/document/slides/slide-12-stromliefervertrag";
import Slide13Langfristig from "@/features/studies/document/slides/slide-13-langfristig";
import Slide14Vergleich from "@/features/studies/document/slides/slide-14-vergleich";
import Slide15Sensitivitaet from "@/features/studies/document/slides/slide-15-sensitivitaet";
import Slide16Variantenvergleich from "@/features/studies/document/slides/slide-16-variantenvergleich";
import Slide17Timeline from "@/features/studies/document/slides/slide-17-timeline";
import Slide18EEG from "@/features/studies/document/slides/slide-18-eeg";
import Slide19Kontakt from "@/features/studies/document/slides/slide-19-kontakt";

/**
 * §7.10-Pivot PR 2 — Dev-only Vorschau-Route für die 19 React-Slide-
 * Komponenten unter `src/features/studies/document/slides/`.
 *
 * **Storybook-Alternative.** Storybook ist NICHT im `package.json`
 * — eine neue Top-Level-Dep wäre §7.1-Pause-Trigger. Stattdessen
 * rendert diese Route alle Slides untereinander gegen die Mock-
 * `StudyDocumentData`-Fixture, so dass der User die Slide-Renders
 * visuell gegen `docs/reference/Machbarkeitsstudie-PV-Template_v1_6.pdf`
 * vergleichen kann.
 *
 * **Pivot-2b Erweiterung (`?only=N`).** Mit `?only=N` (1..19) rendert
 * die Route nur eine einzelne Slide, isoliert ohne Header und ohne
 * andere Slides. Wird vom `scripts/screenshot-slides.mjs`-Skript
 * konsumiert um pro Slide einen sauberen Playwright-Screenshot fürs
 * Side-by-Side-Verify im PR zu erzeugen.
 *
 * **Production-404.** Wir prüfen `process.env.NODE_ENV` und rufen
 * `notFound()` außerhalb der Dev-Umgebung — niemand soll diese Route
 * im Prod-Build erreichen können.
 */

export const dynamic = "force-dynamic";

const slideComponents = [
  Slide01Cover,
  Slide02Glueckwunsch,
  Slide03DreiVorteile,
  Slide04AufEinenBlick,
  Slide05VorherNachher,
  Slide06Mission,
  Slide07Partner,
  Slide08Zusammenarbeit,
  Slide09Ausgangssituation,
  Slide10PVAnlagenkonzept,
  Slide11Energiefluss,
  Slide12Stromliefervertrag,
  Slide13Langfristig,
  Slide14Vergleich,
  Slide15Sensitivitaet,
  Slide16Variantenvergleich,
  Slide17Timeline,
  Slide18EEG,
  Slide19Kontakt,
];

interface DevSlidesPageProps {
  searchParams: Promise<{ only?: string }>;
}

export default async function DevSlidesPage({ searchParams }: DevSlidesPageProps) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const { only } = await searchParams;
  const data = makeFixtureStudyDocumentData();

  // `?only=N` — Render nur eine Slide, isoliert ohne Header. Wird vom
  // Pivot-2b screenshot-slides.mjs konsumiert.
  if (only !== undefined) {
    const idx = Number.parseInt(only, 10);
    if (!Number.isFinite(idx) || idx < 1 || idx > slideComponents.length) {
      notFound();
    }
    const Slide = slideComponents[idx - 1];
    return (
      <div className="flex min-h-screen items-start justify-center bg-white">
        <Slide data={data} />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-100 py-12">
      <header className="mx-auto max-w-[1920px] px-8 pb-8">
        <h1 className="slide-h3">Dev-Vorschau: 19 React-Slides</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Mock-Daten aus{" "}
          <code className="rounded bg-white px-1 py-0.5">
            src/features/studies/document/__fixtures__/study-document-data.fixture.ts
          </code>
          . Visuelle Soll-Vorlage:{" "}
          <code>docs/reference/Machbarkeitsstudie-PV-Template_v1_6.pdf</code>. Einzel-Slide:{" "}
          <code>/dev/slides?only=N</code> (1..19) — Pivot-2b screenshot-slides.mjs.
        </p>
      </header>
      <div className="mx-auto flex max-w-[1920px] flex-col items-center gap-12 px-4">
        <StudyDocument data={data} />
      </div>
    </main>
  );
}
