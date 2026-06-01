# Slide-Inventory — 19 React-Slide-Komponenten

> §7.10-Pivot PR 2/4 (2026-06-01). Visuelle Soll-Vorlage:
> `docs/reference/Machbarkeitsstudie-PV-Template_v1_6.pdf` (19 Seiten).
> Diese Datei kartographiert jede Slide auf
> `src/features/studies/document/slides/slide-NN-*.tsx` und auf die
> Daten-Quellen aus dem `StudyDocumentData`-Bundle.

## Slide → Komponenten-Mapping

| Nr  | Komponenten-Datei                              | Default-Export             | Visueller Soll-Layout                                 |
| --- | ---------------------------------------------- | -------------------------- | ----------------------------------------------------- |
| 01  | `slide-01-cover.tsx`                           | `Slide01Cover`             | Titelseite Hero + Eingereicht-über-Berater            |
| 02  | `slide-02-glueckwunsch.tsx`                    | `Slide02Glueckwunsch`      | „Herzlichen Glückwunsch" + Objekt-Adresse + Flurstück |
| 03  | `slide-03-drei-vorteile.tsx`                   | `Slide03DreiVorteile`      | Drei Vorteile als Karten                              |
| 04  | `slide-04-auf-einen-blick.tsx`                 | `Slide04AufEinenBlick`     | Money-Slide — 4 Kennzahlen + CO₂-Block                |
| 05  | `slide-05-vorher-nachher.tsx`                  | `Slide05VorherNachher`     | BEFORE / AFTER side-by-side + Einmal-Dachpacht        |
| 06  | `slide-06-mission.tsx`                         | `Slide06Mission`           | Mission / Vision (static)                             |
| 07  | `slide-07-partner.tsx`                         | `Slide07Partner`           | Strategischer Partner (static)                        |
| 08  | `slide-08-zusammenarbeit.tsx`                  | `Slide08Zusammenarbeit`    | Warum Zusammenarbeit (static)                         |
| 09  | `slide-09-ausgangssituation.tsx`               | `Slide09Ausgangssituation` | Markt- und Kostenrisiken + 3-Summary                  |
| 10  | `slide-10-pv-anlagenkonzept.tsx`               | `Slide10PVAnlagenkonzept`  | Dachbelegung + Modul-Info-Phrase                      |
| 11  | `slide-11-energiefluss.tsx`                    | `Slide11Energiefluss`      | Energiefluss 3 Phasen                                 |
| 12  | `slide-12-stromliefervertrag.tsx`              | `Slide12Stromliefervertrag`| Stromliefervertrag Vergleich + Ersparnis              |
| 13  | `slide-13-langfristig.tsx`                     | `Slide13Langfristig`       | 20-Jahre-Bilanz + Gesamtvorteil                       |
| 14  | `slide-14-vergleich.tsx`                       | `Slide14Vergleich`         | Mit PV vs Ohne PV — Stromkosten-Jahr                  |
| 15  | `slide-15-sensitivitaet.tsx`                   | `Slide15Sensitivitaet`     | Sensitivitäts-Chart (3 Szenarien, pure SVG)           |
| 16  | `slide-16-variantenvergleich.tsx`              | `Slide16Variantenvergleich`| Variante A vs B — grid-auto-rows:1fr                  |
| 17  | `slide-17-timeline.tsx`                        | `Slide17Timeline`          | 6-Spalten-Roadmap + 2 Highlight-Karten                |
| 18  | `slide-18-eeg.tsx`                             | `Slide18EEG`               | EEG-Rechtsrahmen (static)                             |
| 19  | `slide-19-kontakt.tsx`                         | `Slide19Kontakt`           | Termine + Berater + statische Zentral-Kontaktdaten    |

## Daten-Quellen pro Slide

Alle Slides bekommen `StudyDocumentData` als einzige Prop:

```ts
interface StudyDocumentData {
  customer: Customer;       // Prisma-Row
  study: Study;             // Prisma-Row
  consultant: User;          // Prisma-Row
  derived: DerivedValues;    // composeAll()-Output (src/lib/calculations)
  images: {
    beforeUrl: string | null; // /api/uploads/<imageId> oder null
    afterUrl:  string | null;
  };
}
```

Verbatim-Mapping der dynamischen Felder pro Slide siehe Original-PPTX-
Mapping unter `docs/archive/pptx-mapping.md` (signed-off 2026-05-26).
Die React-Slides hier implementieren die gleichen Quell-Daten — nur
das Visual-Format ist React/Tailwind statt PPTX-XML.

## Slide-Container

Jede Slide wrappt ihre Inhalte in `<SlideFrame slideNumber={n}>`
(`src/features/studies/document/slides/_components/slide-frame.tsx`).
`<SlideFrame>` setzt:

- Exakt 1920×1080 logical pixels (16:9 Landscape) via `.slide-frame`-
  Utility-Klasse in `globals.css` → Print-CSS in PR 3 mapped das auf
  die finale PDF-Page.
- Footer-Zeile mit Customer-Display-Name + Slide-Nummer.
- `data-slide-number` / `data-slide-total` für die PR 3 Playwright-
  Page-Break-Logic.

## Bekannte visuelle Deltas gegen Original-PDF

Siehe `docs/pivot/known-deltas.md` — list of Slides bei denen die
React-Komponente bewusst vom PDF abweicht (z. B. „typografische
Modernisierung statt 1:1-PPTX-Reproduktion") oder bei denen
visuelle Verifikation in PR 3 noch ausstehen muss.

## Verifikation

Lokal: `npm run dev` → `/dev/slides` rendert alle 19 Slides untereinander
gegen die `makeFixtureStudyDocumentData()`-Mockdaten. Diese Route ist in
Production via `notFound()` 404 — kein Auth-Leak.

Die Verifikation, dass die Pixel ≤5% Abweichung gegen das Original-PDF
treffen, ist eine User-Aufgabe nach Merge — siehe T-060 Acceptance-
Criteria.
