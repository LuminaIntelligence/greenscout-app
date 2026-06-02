# Pivot-2b — Offene Klärungsfragen an den User

> Diese Liste ist im PR-Body referenziert. Implementer hat für diese Punkte
> bewusst **nicht eigeninterpretiert** sondern eine sicht-bare Annahme im
> Code gewählt + hier dokumentiert. User-Sign-off vor Ready-for-Review.

---

## Slide 1 — Tagline-Plazierung im Deckblatt

**Frage:** Im PPTX ist „Flächen bewerten, Entscheidung treffen, Einnahmen
ohne eigene Investitionen" ein Textfeld mit 24pt; im Original-PDF erscheint
es als Untertitel/Tagline unterhalb der zentralen „Ihr Ergebnis"-Headline.
Die Reproduktion setzt es nach **oben links**. Soll es unter die Hero-
Headline?

**Kontext:** Layout-Position aus PPTX EMU (top=3677524 ≈ Mitte) vs.
Reproduktion (top oben).

---

## Slide 4 — KPI-Tile-Reihenfolge & 6er-Slot

**Frage:** Im PPTX gibt es 5 KPI-Tiles (Anlagengröße / Jahresertrag /
Eigenverbrauch / 20-Jahre-Stromersparnis / Pachteinnahmen). Die
Reproduktion ordnet diese in einem 3×2-Grid an und füllt den 6. Slot mit
dem „VIELEN DANK"-Block. Ist das die gewünschte Ordnung? Im Original-PDF
liegen die Tiles flexibler verteilt.

**Kontext:** PPTX gibt keine klare Grid-Struktur vor — die KPI-Shapes
liegen auf der Slide absolut positioniert.

---

## Slide 4 — CO2-Text-Vervollständigung

**Frage:** Der CO2-Text im PPTX endet beim {{co2_fussballfelder_gesamt_vertragslaufzeit}}-
Platzhalter mit Auslassung — der vollständige Schlusssatz fehlt im
Extract (die letzte run ist abgeschnitten). Die Reproduktion ergänzt
„Fußballfelder über die gesamte Vertragslaufzeit." als naheliegendes
Komplement. Soll das so bleiben oder lieber ein expliziter PPTX-Schlusssatz
nachgereicht werden?

**Kontext:** Original-Text aus `template-content.json` Slide 4
Textfeld 27 endet mid-sentence.

---

## Slide 5 — Footnote vs. PPTX-Sterne

**Frage:** Der PPTX-Original-Fußnotenblock ist sehr lang („* Nach
Zeichnung ... ** ... *** ..."). In der Reproduktion ist er auf drei
kompakte Zeilen reduziert (11pt-Schriftgröße). Ist die Reduktion OK
oder soll der volle PPTX-Wortlaut beibehalten werden?

**Kontext:** Slide-5 Textfeld 9 hat im PPTX 400+ Zeichen Footnote-Text.

---

## Slide 7 — Phase-II-Bullet-Konsolidierung

**Frage:** Im PPTX sind die zwei Phasen (I + II) als zwei separate
Textboxen mit jeweils Bullet-Lists realisiert. Die Reproduktion
konsolidiert die Inhalte zu jeweils 2 Bullets pro Phase. Soll die
genaue PPTX-Bullet-Struktur (auch wenn redundant) 1:1 erhalten bleiben?

**Kontext:** Slide-7 Phase-II-Bullets im Original sind „Unterstützung
bei Vertragsumsetzung..." + „Förderung nachhaltiger Energieerzeugung
in der Region" — die Repro hat beide drin, korrekt.

---

## Slide 8 — Kartenfarben

**Frage:** Im PPTX sind die 4 nummerierten Karten farblich nicht
unterschieden (alle gleicher Hintergrund). In der Reproduktion sind sie
auf `bg-muted-lime-50` gesetzt. Ist das OK oder sollen sie weiß sein?

**Kontext:** SPEC §8.1 + §8.4 fordert „white-canvas SaaS, restrained
accent". Aktuelle muted-lime-Wahl ist defensible aber nicht garantiert.

---

## Slide 9 — Versorgerpreis-Tile Hervorhebung

**Frage:** Tile 01 zeigt den dynamischen Wert
`{{versorger_preis_ct_kwh}}` als bold-Span. Sollen ALLE numerischen
Werte in den Tiles bold sein (KPI-Stil) oder nur die Marker-Werte?

**Kontext:** Im PPTX ist nur der `{{versorger_preis_ct_kwh}}`-Marker
rot — die Reproduktion macht ihn bold. Default-Annahme.

---

## Slide 10 — Modul-Info-Phrase Formattierung

**Frage:** Die Reproduktion baut `{{modul_info_phrase}}` als
„500 kWp 1.428 Module, 2.856 m² Modulfläche" zusammen. Im PPTX hat
die Phrase wahrscheinlich Spacing/Trennzeichen (Komma vs. Bullet vs.
Slash). Im Original-PDF erkennbar wie?

**Kontext:** Der PPTX-Run-Text ist
`"Gesamtleistung: {{modul_info_phrase}}"` — keine Hinweise auf die
intendierte Trennung.

---

## Slide 17 — Footnote „Sie sparen" Position

**Frage:** Das Textfeld 13 enthält die kurze Zeile „Sie sparen" als
eigene Shape im PPTX. Die Reproduktion hat es ans Ende der Phase-5
Ergebnisse-Bulletliste gesetzt. Soll es als separater Block (z. B.
Mitten-Box) gerendert werden?

**Kontext:** PPTX-Shape „Textfeld 13" steht offenbar als Standalone-
Label, nicht in der Spalten-Bullet-Logik.

---

## Slide 17 — Phase-6 „Ergebnisse"-Liste

**Frage:** Phase 6 (Projektrechte Vermarktung) hat im PPTX KEINE
Ergebnisse-Bullets (nur Inhalte). Die Reproduktion lässt den
Ergebnisse-Block für Phase 6 weg. Bestätigt?

**Kontext:** `template-content.json` Slide 17 hat für die Phase-6-Spalte
nur den Inhalt-Block (Textfeld 20), keine Ergebnis-Shape.

---

## Slide 19 — Termin-Vorschläge Layout

**Frage:** Im PPTX werden die zwei Termine als verschachtelte Phrase
in einer einzigen Textbox („…vereinbaren wir einen Termin. Wir hätten
folgenden zwei Vorschläge: 1) … oder 2) …") gezeigt. Die Reproduktion
formatiert sie als visuell getrennten Block mit „oder"-Separator. OK?

**Kontext:** PPTX-Marker ist `{{termin_1_phrase}}{{termin_oder_phrase}}{{termin_2_phrase}}`
— die Phrase-Konstruktion ist im SPEC §4.5 datetime-`am DD.MM.YYYY um
HH:mm Uhr`-Format.

---

## Cross-Slide — Marker-Rot ↔ React-Bold

**Frage:** Im PPTX sind alle `{{}}`-Marker rot eingefärbt (#FF0000),
damit sie im PPTX-Authoring sichtbar sind. In der Reproduktion gibt es
**keine** rote Hervorhebung — die dynamischen Werte sind oft `bold` /
`tabular-nums` in `text-plant-green` gestyled. Ist das gewünschte
End-User-Optik oder soll explizit eine andere Markierung verwendet
werden?

**Kontext:** Die PPTX-Rot-Färbung war ein Authoring-Marker für den
PPTX-Pivot-Workflow (vor §7.10), nicht End-User-Optik.
