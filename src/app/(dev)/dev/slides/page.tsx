import { notFound } from "next/navigation";

import { makeFixtureStudyDocumentData } from "@/features/studies/document/__fixtures__/study-document-data.fixture";
import { StudyDocument } from "@/features/studies/document/document";

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
 * **Production-404.** Wir prüfen `process.env.NODE_ENV` und rufen
 * `notFound()` außerhalb der Dev-Umgebung — niemand soll diese Route
 * im Prod-Build erreichen können.
 */

export const dynamic = "force-dynamic";

export default function DevSlidesPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const data = makeFixtureStudyDocumentData();

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
          <code>docs/reference/Machbarkeitsstudie-PV-Template_v1_6.pdf</code>.
        </p>
      </header>
      <div className="mx-auto flex max-w-[1920px] flex-col items-center gap-12 px-4">
        <StudyDocument data={data} />
      </div>
    </main>
  );
}
