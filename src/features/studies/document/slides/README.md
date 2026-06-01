# 19 Slide-Inventory

> §7.10-Pivot PR 2/4 (2026-06-01). Visuelle Soll-Vorlage:
> `docs/reference/Machbarkeitsstudie-PV-Template_v1_6.pdf`.
>
> Persistente Doku siehe `docs/pivot/slide-inventory.md`. Diese Datei
> dient als Schnellreferenz neben den Komponenten-Files.

| Nr  | Datei                                | Titel                            | Daten-Quellen                                                                                     |
| --- | ------------------------------------ | -------------------------------- | ------------------------------------------------------------------------------------------------- |
| 01  | `slide-01-cover.tsx`                 | Titelseite                       | `customer`, `study.objectName`, `consultant`                                                      |
| 02  | `slide-02-glueckwunsch.tsx`          | Herzlichen Glückwunsch           | `study.objectName/Address/ZipCode/City/flurstueck`                                                |
| 03  | `slide-03-drei-vorteile.tsx`         | Drei zentrale Vorteile           | `derived.pachtEinnahmeEinmalig`, `derived.ersparnisProMonat`, `derived.ersparnis20Jahre`          |
| 04  | `slide-04-auf-einen-blick.tsx`       | Auf einen Blick (Money Slide)    | Anlage-kWp + Jahresertrag + Gesamterzeugung + Eigenverbrauchsquote + CO₂                          |
| 05  | `slide-05-vorher-nachher.tsx`        | Vorher · Nachher                 | `images.beforeUrl/afterUrl`, `pvVerkaufEurKwh`, `derived.ersparnis20Jahre`, `derived.pacht…`     |
| 06  | `slide-06-mission.tsx`               | Mission / Vision                 | static                                                                                            |
| 07  | `slide-07-partner.tsx`               | Strategischer Partner            | static                                                                                            |
| 08  | `slide-08-zusammenarbeit.tsx`        | Warum Zusammenarbeit             | static                                                                                            |
| 09  | `slide-09-ausgangssituation.tsx`     | Markt- und Kostenrisiken         | `versorgerPreisEurKwh`, `derived.pacht…`, `derived.ersparnis20Jahre`, CO₂-20-Jahre               |
| 10  | `slide-10-pv-anlagenkonzept.tsx`     | PV-Anlagenkonzept                | `study.objectName`, `anlageKwp`, optional `modulAnzahl`, `modulFlaecheM2` (Defekt D3-konform)    |
| 11  | `slide-11-energiefluss.tsx`          | Energiefluss + Eigenverbrauch    | `pvErzeugung…`, `pvEigenverbrauch…`, `eigenverbrauchsquoteProzent`, `netzeinspeisung…`           |
| 12  | `slide-12-stromliefervertrag.tsx`    | Wirtschaftlichkeit Stromvertrag  | `pvVerkaufEurKwh`, `versorgerPreisEurKwh`, `derived.ersparnis…`                                  |
| 13  | `slide-13-langfristig.tsx`           | 20-Jahre-Bilanz                  | `derived.ersparnisProJahr`, `derived.ersparnis20Jahre`, `derived.pacht…`, `derived.gesamtvorteil` |
| 14  | `slide-14-vergleich.tsx`             | Vergleich Mit PV vs Ohne PV      | `derived.stromkostenOhne/MitPvEurJahr`, `derived.ersparnisProJahr`, `pvVerkaufEurKwh`            |
| 15  | `slide-15-sensitivitaet.tsx`         | Sensitivität / Szenarien (Chart) | `study.szenarioPreis1/2/3`, re-`composeAll` mit substituiertem `versorgerPreis…`                 |
| 16  | `slide-16-variantenvergleich.tsx`    | Variantenvergleich               | `study.objectName`, `derived.pacht…`, `pvVerkaufEurKwh`, `derived.ersparnis…`                    |
| 17  | `slide-17-timeline.tsx`              | Weg zur Inbetriebnahme           | Static 6-Spalten-Grid (`grid-auto-rows:1fr` R2-10-konform) + Highlight-Karten dynamisch          |
| 18  | `slide-18-eeg.tsx`                   | EEG                              | static                                                                                            |
| 19  | `slide-19-kontakt.tsx`               | Kontakt + Termine + Berater      | `study.terminVorschlag1/2`, `consultant`, statische Zentral-Kontaktdaten (resolved 2026-05-26)   |

## Tech-Choices (PR 2)

- **Chart:** pure SVG (kein Recharts — nicht im `package.json` und User hat „SVG oder Recharts" gleichwertig zugelassen).
- **Slide-Container:** `.slide-frame` Utility-Klasse → exact 1920×1080 logical pixels (16:9 Landscape).
- **Image-Slots:** `aspect-[16/9] object-cover` + Brand-Lime-Outline-Platzhalter wenn `null`.
- **Server-Components only** — keine Client-Boundaries; PR 3 Playwright kann den Tree direkt rendern.
