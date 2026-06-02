# Pivot-2b — Klärungsfragen (Audit-Trail)

> Diese Liste war im PR-Body referenziert. Implementer hat für diese Punkte
> bewusst **nicht eigeninterpretiert** sondern eine sicht-bare Annahme im
> Code gewählt + hier dokumentiert. User-Sign-off-Antworten am 2026-06-02.
> Implementiert in PASS 2 — siehe DECISIONS.md 2026-06-02.

---

## Slide 1 — Tagline-Plazierung im Deckblatt

**Frage:** Im PPTX ist „Flächen bewerten, Entscheidung treffen, Einnahmen
ohne eigene Investitionen" ein Textfeld mit 24pt; im Original-PDF erscheint
es als Untertitel/Tagline unterhalb der zentralen „Ihr Ergebnis"-Headline.
Die Reproduktion setzt es nach **oben links**. Soll es unter die Hero-
Headline?

**Kontext:** Layout-Position aus PPTX EMU (top=3677524 ≈ Mitte) vs.
Reproduktion (top oben).

✅ **Beantwortet vom User 2026-06-02:** Weder oben links noch unter „Ihr
Ergebnis". Sie gehört **direkt unter den GreenScout-Schriftzug als
Subtitle der Marken-Einheit** (so wie im Original-PDF). Die PPTX-
Mittenkoordinate ist irreführend.

---

## Slide 4 — KPI-Tile-Reihenfolge & 6er-Slot

**Frage:** Im PPTX gibt es 5 KPI-Tiles (Anlagengröße / Jahresertrag /
Eigenverbrauch / 20-Jahre-Stromersparnis / Pachteinnahmen). Die
Reproduktion ordnet diese in einem 3×2-Grid an und füllt den 6. Slot mit
dem „VIELEN DANK"-Block. Ist das die gewünschte Ordnung? Im Original-PDF
liegen die Tiles flexibler verteilt.

**Kontext:** PPTX gibt keine klare Grid-Struktur vor — die KPI-Shapes
liegen auf der Slide absolut positioniert.

✅ **Beantwortet vom User 2026-06-02:** **Kein 3×2-Grid.** Das ist
Neuinterpretation. Reproduziere die ursprüngliche freie Anordnung:
- kWp-Headline groß zentriert oben
- drei Geld-Tiles (Pachteinnahmen / Jahresertrag / Stromersparnis) als
  Reihe am unteren Rand
- Eigenverbrauchsquote mit dazugehörigem Textblock seitlich
- CO₂-Absatz inkl. „VIELEN DANK"-Schlusssatz als Fließtext oben
- „Objektstandort"-Block unten links

„VIELEN DANK" ist Bestandteil des CO₂-Absatzes, kein eigenes 6. Tile.

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

✅ **Beantwortet vom User 2026-06-02:** Die Reproduktions-Erfindung „über
die gesamte Vertragslaufzeit." ist **falsch**. Das Original endet mit
„Fußballfelder!" (Ausrufezeichen, kein Nachsatz). Vollständiger Satz:

> „Bei 20 Jahren Nutzungsdauer sind das `{{co2_tonnen_gesamt_vertragslaufzeit}}`
> Tonnen CO2, das sind ca.
> `{{co2_fussballfelder_gesamt_vertragslaufzeit}}` Fußballfelder!"

Folge: Extract-Skript-Bug-Verdacht bestätigt → PASS 2 fixt das Skript
(joined_text per Paragraph), regeneriert die JSON, danach übernimmt die
Slide-Komponente den vollständigen Satz 1:1.

---

## Slide 5 — Footnote vs. PPTX-Sterne

**Frage:** Der PPTX-Original-Fußnotenblock ist sehr lang („* Nach
Zeichnung ... ** ... *** ..."). In der Reproduktion ist er auf drei
kompakte Zeilen reduziert (11pt-Schriftgröße). Ist die Reduktion OK
oder soll der volle PPTX-Wortlaut beibehalten werden?

**Kontext:** Slide-5 Textfeld 9 hat im PPTX 400+ Zeichen Footnote-Text.

✅ **Beantwortet vom User 2026-06-02:** **Vollen PPTX-Wortlaut behalten.**
Reproduktion, nicht Verdichtung. Schriftgröße darf 9-10pt sein, aber
Wortlaut 1:1.

---

## Slide 7 — Phase-II-Bullet-Konsolidierung

**Frage:** Im PPTX sind die zwei Phasen (I + II) als zwei separate
Textboxen mit jeweils Bullet-Lists realisiert. Die Reproduktion
konsolidiert die Inhalte zu jeweils 2 Bullets pro Phase. Soll die
genaue PPTX-Bullet-Struktur (auch wenn redundant) 1:1 erhalten bleiben?

**Kontext:** Slide-7 Phase-II-Bullets im Original sind „Unterstützung
bei Vertragsumsetzung..." + „Förderung nachhaltiger Energieerzeugung
in der Region" — die Repro hat beide drin, korrekt.

✅ **Beantwortet vom User 2026-06-02:** **Originale Bullet-Anzahl strikt
einhalten.** Wenn das PPTX drei Phase-II-Bullets hat (Aufbau /
Unterstützung / Förderung), kommen drei in die React-Komponente. Keine
Konsolidierung.

---

## Slide 8 — Kartenfarben

**Frage:** Im PPTX sind die 4 nummerierten Karten farblich nicht
unterschieden (alle gleicher Hintergrund). In der Reproduktion sind sie
auf `bg-muted-lime-50` gesetzt. Ist das OK oder sollen sie weiß sein?

**Kontext:** SPEC §8.1 + §8.4 fordert „white-canvas SaaS, restrained
accent". Aktuelle muted-lime-Wahl ist defensible aber nicht garantiert.

✅ **Beantwortet vom User 2026-06-02:** **Weiß, wie im Original.** SPEC
§8.4 verlangt „sparing use of muted-lime for accents" — die Karten
brauchen keinen Hintergrund, die Nummerierung selbst ist Akzent genug.
`bg-muted-lime-50` herausnehmen.

---

## Slide 9 — Versorgerpreis-Tile Hervorhebung

**Frage:** Tile 01 zeigt den dynamischen Wert
`{{versorger_preis_ct_kwh}}` als bold-Span. Sollen ALLE numerischen
Werte in den Tiles bold sein (KPI-Stil) oder nur die Marker-Werte?

**Kontext:** Im PPTX ist nur der `{{versorger_preis_ct_kwh}}`-Marker
rot — die Reproduktion macht ihn bold. Default-Annahme.

✅ **Beantwortet vom User 2026-06-02:** Nur die **Marker-Werte** (also
die ehemaligen `{{...}}`-Stellen) bekommen den Bold+tabular-nums-Stil.
**Default approved.**

---

## Slide 10 — Modul-Info-Phrase Formattierung

**Frage:** Die Reproduktion baut `{{modul_info_phrase}}` als
„500 kWp 1.428 Module, 2.856 m² Modulfläche" zusammen. Im PPTX hat
die Phrase wahrscheinlich Spacing/Trennzeichen (Komma vs. Bullet vs.
Slash). Im Original-PDF erkennbar wie?

**Kontext:** Der PPTX-Run-Text ist
`"Gesamtleistung: {{modul_info_phrase}}"` — keine Hinweise auf die
intendierte Trennung.

✅ **Beantwortet vom User 2026-06-02:** Format nach Original-PDF:
`{{anlage_kwp}} kWp, {{modul_anzahl}} Module, {{modul_flaeche_m2}} m²` —
**Trennzeichen sind Kommata**, das Wort „Modulfläche" ist im Original
**nicht** dabei. Aktuelle Repro raus.

---

## Slide 17 — Footnote „Sie sparen" Position

**Frage:** Das Textfeld 13 enthält die kurze Zeile „Sie sparen" als
eigene Shape im PPTX. Die Reproduktion hat es ans Ende der Phase-5
Ergebnisse-Bulletliste gesetzt. Soll es als separater Block (z. B.
Mitten-Box) gerendert werden?

**Kontext:** PPTX-Shape „Textfeld 13" steht offenbar als Standalone-
Label, nicht in der Spalten-Bullet-Logik.

✅ **Beantwortet vom User 2026-06-02:** Nicht als Mitten-Box, sondern
als **Ergebnisse-Eintrag der rechtesten Spalte („Bis 20 Jahre")**. Im
PPTX sitzt Textfeld 13 auf L=1223 — das ist klar Spalten-zugeordnet.
Belass es dort als kurzes Ergebnis-Label.

---

## Slide 17 — Phase-6 „Ergebnisse"-Liste

**Frage:** Phase 6 (Projektrechte Vermarktung) hat im PPTX KEINE
Ergebnisse-Bullets (nur Inhalte). Die Reproduktion lässt den
Ergebnisse-Block für Phase 6 weg. Bestätigt?

**Kontext:** `template-content.json` Slide 17 hat für die Phase-6-Spalte
nur den Inhalt-Block (Textfeld 20), keine Ergebnis-Shape.

✅ **Beantwortet vom User 2026-06-02:** **Nicht bestätigt — alle Spalten
haben Ergebnis-Texte im Original-PPTX.** Direkt-Inspektion zeigte 7
Spalten in dieser Reihenfolge:

- Spalte 1 (Phase I): „Technisch und wirtschaftlich tragfähiges Vorprojekt..."
- Spalte 2 (Vor-Phase II): „Rechtliche Grundlage zur Einleitung..."
- Spalte 3 (Phase II): „Baureifestatus PV-Anlage..."
- Spalte 4 (Phase III): „Projektrechte Vermarktung und -Verkauf"
- Spalte 5 (Projektumsetzung): „Abschluss Installation PV-Anlage"
- Spalte 6 (Inbetriebnahme): „Auszahlung Pacht und PV-Anlage im Betrieb"
- Spalte 7 (Bis 20 Jahre): „Sie sparen"

Wenn `template-content.json` in einer Spalte keinen Ergebnis-Text hat,
ist das **Extract-Skript fehlerhaft** — es muss korrigiert und neu
ausgeführt werden. Keine Spalte darf ohne Ergebnis bleiben.

Folge: PASS 2 ändert Layout auf 7-Spalten-Grid mit korrekter
Phasen-Reihenfolge. „Projektrechte Vermarktung" wird Spalte 4 (Phase III)
statt Spalte 6.

---

## Slide 19 — Termin-Vorschläge Layout

**Frage:** Im PPTX werden die zwei Termine als verschachtelte Phrase
in einer einzigen Textbox („…vereinbaren wir einen Termin. Wir hätten
folgenden zwei Vorschläge: 1) … oder 2) …") gezeigt. Die Reproduktion
formatiert sie als visuell getrennten Block mit „oder"-Separator. OK?

**Kontext:** PPTX-Marker ist `{{termin_1_phrase}}{{termin_oder_phrase}}{{termin_2_phrase}}`
— die Phrase-Konstruktion ist im SPEC §4.5 datetime-`am DD.MM.YYYY um
HH:mm Uhr`-Format.

✅ **Beantwortet vom User 2026-06-02:** Visuell getrennter Block mit
„oder"-Separator passt — entspricht dem Original-PDF. **Default
approved.**

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

✅ **Beantwortet vom User 2026-06-02:** Bestätigt: kein Rot im Output.
Das Rot war reiner Authoring-Marker für die PPTX-Bauphase, nicht
End-User-Optik. Aktuelle React-Styling-Wahl (Bold + tabular-nums in
plant-green oder forest-green) ist **genau richtig. Approved.**
