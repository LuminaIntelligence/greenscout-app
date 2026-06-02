/**
 * Pivot-2b — Helpers für den Zugriff auf das mechanisch extrahierte
 * PPTX-Template-Content-JSON (`../template-content.json`).
 *
 * Slide-Komponenten ziehen sich ihre statischen Texte aus dem JSON; nur
 * dynamische Werte (Customer-Name, KPIs, Datums-Termine etc.) kommen aus
 * den StudyDocumentData-Props. So bleibt der Slide-Code frei von
 * Verbatim-Abschriften des PPTX und der nächste PPTX-Re-Extract zeigt
 * im Review was sich textuell geändert hat.
 *
 * **EMU → px Konvertierung.** PowerPoint-Slides sind 12192000 EMU breit
 * x 6858000 EMU hoch (16:9 Widescreen). Unser SlideFrame ist 1920x1080
 * px (siehe `../_components/slide-frame.tsx` + `src/app/globals.css`).
 * Skalierung: 1 px = 6350 EMU. Das ist eine pragmatische Hilfsfunktion,
 * keine pixel-perfekte Vermessung — die Reproduktion erfolgt im
 * visuellen Side-by-Side-Vergleich, nicht via koordinaten-getreuer
 * Auto-Positionierung.
 */

import rawTemplateContent from "../../template-content.json";

export interface TemplateRun {
  paragraph_index: number;
  run_index: number;
  text: string;
  is_red_marker: boolean;
  font_size_pt: number | null;
  bold: boolean;
  italic: boolean;
}

export interface TemplateShape {
  shape_name: string;
  shape_id: number;
  left_emu: number;
  top_emu: number;
  width_emu: number;
  height_emu: number;
  runs: TemplateRun[];
}

export interface TemplateSlide {
  slide_number: number;
  shapes: TemplateShape[];
}

interface TemplateContent {
  slides: TemplateSlide[];
}

const templateContent = rawTemplateContent as TemplateContent;

/**
 * Konvertierungsfaktor: PowerPoint English Metric Units → CSS-Pixel.
 *
 * - Slide-Breite: 12 192 000 EMU = 1920 px → `1920 / 12192000 ≈ 1/6350`.
 * - Slide-Höhe: 6 858 000 EMU = 1080 px → identischer Faktor.
 */
export const EMU_PER_PX = 6350;

/** Rundet EMU auf CSS-Pixel ab. */
export function emuToPx(emu: number): number {
  return Math.round(emu / EMU_PER_PX);
}

/** Liefert den TemplateSlide-Datensatz für eine 1-basierte Slide-Nummer. */
export function getTemplateSlide(slideNumber: number): TemplateSlide {
  const slide = templateContent.slides.find((s) => s.slide_number === slideNumber);
  if (!slide) {
    throw new Error(
      `template-content.json hat keinen Datensatz für Slide ${slideNumber}. ` +
        "Erneut extract-template-text.py laufen lassen?",
    );
  }
  return slide;
}

/**
 * Liefert den vollständigen sichtbaren Text einer Shape — wörtlich aus
 * dem PPTX, alle Runs in Paragraph-Reihenfolge konkateniert.
 * Marker-Rot-Platzhalter ({{snake_case}}) bleiben im Output erhalten;
 * Aufrufer entscheiden ob sie diese ersetzen wollen.
 */
export function shapeFullText(shape: TemplateShape): string {
  return shape.runs.map((r) => r.text).join("");
}

/**
 * Sucht eine Shape per `shape_name` (z. B. "Text 2" oder "Textfeld 26").
 * Die PPTX-Shape-Namen sind nicht eindeutig (mehrere Slides haben
 * "Text 2"); diese Funktion sucht nur innerhalb des gegebenen Slides.
 */
export function findShape(slide: TemplateSlide, shapeName: string): TemplateShape | undefined {
  return slide.shapes.find((s) => s.shape_name === shapeName);
}

/**
 * Sucht eine Shape per `shape_id` — eindeutig innerhalb des Slides,
 * stabil gegen umbenennungs-Drift beim PPTX-Editieren.
 */
export function findShapeById(slide: TemplateSlide, shapeId: number): TemplateShape | undefined {
  return slide.shapes.find((s) => s.shape_id === shapeId);
}
