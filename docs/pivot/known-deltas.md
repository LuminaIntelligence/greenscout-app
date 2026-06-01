# Known visuelle Deltas — React-Slides ↔ Original-PDF

> §7.10-Pivot PR 2/4 (2026-06-01). Liste der bewussten und der noch
> offenen Abweichungen zwischen den 19 React-Slide-Komponenten
> (`src/features/studies/document/slides/`) und der visuellen
> Soll-Vorlage `docs/reference/Machbarkeitsstudie-PV-Template_v1_6.pdf`.

## Bewusste Abweichungen ("Modernisierung statt 1:1-PPTX-Reproduktion")

| Slide(s) | Abweichung                                                                          | Begründung                                                                                                  |
| -------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Alle     | Brand-Token-Farben aus SPEC §8.1 statt frei-zusammengewürfeltem PPTX-Color-Sample   | SPEC §8.1 ist verbindlich, der PPTX-Author hat z. T. außerhalb der Palette gepickt                          |
| Alle     | Gabarito statt Original-PPTX-Font (häufig Calibri-Default)                          | SPEC §8.2 fordert Gabarito Semibold + Regular                                                              |
| Alle     | Generöses Whitespace-Layout statt enges PPTX-Grid                                   | SPEC §8.4 „modern, white-canvas SaaS, generous whitespace"                                                |
| 1        | „Eingereicht über"-Block linksbündig unten statt rechtsoben                         | Bessere visuelle Hierarchie; SPEC §8.4 visuelle Sprache erlaubt                                            |
| 6 / 7 / 8 / 18 | Inhalt aus dem PPTX-Text-Lauf nicht 1:1 übernommen (statische Slides)         | Originaltext war für PV-Sol-Kontext geschrieben; React-Version verwendet plausibel-ähnliche Slot-Texte     |
| 15       | Pure-SVG-Chart statt PPTX-Grafik-Asset                                              | SPEC §4.8 schreibt Recharts-oder-SVG vor; Recharts nicht im `package.json` → SVG                          |
| 17       | CSS-Grid mit `grid-auto-rows: 1fr` ersetzt PPTX-Slide-17-Grid-Normalisierung        | R2-10 / C2-Defekt-Mitigation — ist explizit von SPEC §4.8 als Ersatz benannt                              |

## Offene visuelle Verifikation (User-Aufgabe nach Merge)

Die folgenden Punkte erfordern Auge-am-Original — nach Merge bitte
gegen `/dev/slides` checken und falls > 5 % Abweichung: Folge-Issue
gegen PR 2 öffnen oder im PR-3-Branch direkt iterieren.

- **Slide 5** — BEFORE/AFTER-Foto-Hosen: visuelle Bildhöhen abgleichen,
  ob die Container-Höhe (`aspect-[16/9]`) zur Original-PPTX-Bounding-Box
  passt (PPTX hatte forced-EMU-Geometrie, siehe `docs/archive/pptx-mapping.md`).
- **Slide 4 CO₂-Block** — Reihenfolge der vier CO₂-Stats stimmt mit
  PPTX-Lesefluss?
- **Slide 17 Roadmap-Zellen** — Inhalt der 6 Phasen im PPTX verbatim
  abgleichen (React-Version verwendet aktuell Plausibel-Texte; Original
  hat die genaue Phase-Beschreibung).
- **Slide 18 EEG-Text** — Originaltext ist von Slide-Author geschrieben;
  React-Version paraphrasiert mit korrektem Inhalt aber nicht verbatim.

Visuelle Abweichungen bei statischen Slides (6 / 7 / 8 / 18) sind
explizit niedrigste Priorität, da die SPEC §1 Vision das Layout-Format
„modern, white-canvas SaaS" priorisiert über PPTX-1:1-Reproduktion.

## Tools für visuelle Verifikation

- **Lokal**: `npm run dev` → http://localhost:3000/dev/slides
- **PR 3** wird einen Playwright-Render-Endpoint anbieten, der ein PDF
  generiert; das PDF kann seitenweise gegen das Original verglichen
  werden (PDF-Diff-Tools, manuelle Sichtung).
- **PR 4** öffnet die HMAC-gated Online-Ansicht — gleicher Inhalt wie
  PDF, durchschaubar mit normalem Browser.
