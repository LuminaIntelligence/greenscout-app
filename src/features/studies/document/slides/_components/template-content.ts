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

export interface TemplateParagraph {
  paragraph_index: number;
  joined_text: string;
  run_count: number;
}

export interface TemplateShape {
  shape_name: string;
  shape_id: number;
  left_emu: number;
  top_emu: number;
  width_emu: number;
  height_emu: number;
  /**
   * Pass-2 Extract-Schema (2026-06-02): `is_group` unterscheidet
   * normale Shapes von rekursiv extrahierten Group-Shapes. Bei
   * `is_group=true` haben die Shapes keine eigenen Runs / Paragraphen,
   * sondern eine `nested_shapes`-Collection.
   */
  is_group: boolean;
  /** Optional bei Group-Shapes. */
  joined_text?: string;
  /** Optional bei Group-Shapes. */
  paragraphs?: TemplateParagraph[];
  /** Optional bei Group-Shapes. */
  runs?: TemplateRun[];
  /** Nur für Group-Shapes. */
  nested_shapes?: TemplateShape[];
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
 *
 * Pass-2 (2026-06-02): Bevorzugt das vom Extract-Skript vorberechnete
 * `joined_text` (Source of Truth), fallback auf Run-Konkatenierung für
 * Group-Shapes oder den Edge-Case dass die JSON aus einem alten
 * Extract-Lauf stammt.
 */
export function shapeFullText(shape: TemplateShape): string {
  if (typeof shape.joined_text === "string") return shape.joined_text;
  if (shape.runs) return shape.runs.map((r) => r.text).join("");
  return "";
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
