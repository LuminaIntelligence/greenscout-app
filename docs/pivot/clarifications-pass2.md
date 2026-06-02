# Pivot-2b — Klärungsfragen aus PASS 2 Cross-Check

> Diese Liste sammelt **NEUE** visuelle Diskrepanzen die beim systematischen
> Vergleich `rendered-slide-NN.png` ↔ `original-slide-NN.png` während
> PASS 2 aufgefallen sind — über die 12 User-beantworteten Fragen aus
> `clarifications.md` hinaus.
>
> Implementer hat diese NICHT eigenmächtig geändert (CLAUDE.md §7.4 —
> Layout-Anpassungen jenseits Tokens sind Pause-Trigger). User-Sign-off
> vor jeder einzelnen Korrektur.

---

## Slide 1 — Hero-Lockup ohne Original-Logo-Asset

**Frage:** Das Original-PDF zeigt das eigentliche GreenScout-Logo
(stilisiertes Haus mit Blatt + Wortmarke „GreenScout e.V.®") auf
forest-green-Background. Im Repo gibt es kein SVG/PNG-Asset dafür.
Die Pass-2-Reproduktion nutzt den **Text** „GreenScout e.V." in
Gabarito Semibold 72pt als Stand-in. Soll ein echtes Logo-Asset
unter `public/brand/` eingecheckt werden? Wenn ja: SVG erwartet.

**Kontext:** Slide 1 Hero-Komposition; Q1-Antwort fordert „Subtitle
direkt unter Marken-Schriftzug" — das nutzt der Text-Stand-in
erfolgreich, aber visuell ist das Original-Logo deutlich erkennbarer.

---

## Slide 4 — CO₂ als „CO2" vs. „CO₂"

**Frage:** Original-PDF schreibt durchgängig „CO2" (ohne ₂-Subscript)
— das ist der PPTX-Wortlaut. Die Reproduktion verwendet `<sub>2</sub>`
für korrekteres Textsatz-Verhalten (siehe SPEC §8.4 SaaS-Niveau).
Bewusste Abweichung oder soll die Reproduktion textgetreu „CO2"
ohne Subscript bleiben?

**Kontext:** Q3-Antwort sagt nur „1:1 Wortlaut" — das ist character-by-
character oder kann Typografie-Glätten? Default Pass 2: `<sub>` für
visuelle Qualität, kann auf User-Wunsch entfernt werden.

---

## Slide 8 — „Warum gerade jetzt?"-Block Layout

**Frage:** Im Original-PDF ist „Warum gerade jetzt?" nicht eine
forest-green-Box am Fuß der Karten, sondern ein eigener Subheader
mit drei Pfeil-Bullets (→ Symbol) in normaler Forest-Green-Schrift.
Die Pass-1-Reproduktion zeigt es als dunkelgrünen, kompakten
Footer-Block. Soll das auch in PASS 2 angepasst werden — analog zu
Q6 das „sparsame Akzent-Verwendung" befolgt?

**Kontext:** Q6 betraf nur die 4 Karten oben (muted-lime → weiß).
„Warum gerade jetzt?" war in Q6 nicht adressiert.

---

## Slide 11 — Layout „4-Step-Liste mit Pfeilen" vs. „3-KPI-Box + Wirkung"

**Frage:** Original-PDF zeigt Slide 11 als vertikale 4-Schritt-Liste
mit nummerierten Pfeil-Shapes (1=PV-Erzeugung, 2=Eigenverbrauch,
3=Einspeisung, 4=Wirkung) plus großes Foto rechts. Die Pass-1-
Reproduktion macht 3-Spalten-KPI-Boxen + Wirkung-Footer-Banner. Soll
das umgebaut werden? Q12 hat „Marker-Rot → Bold" approved, aber
das Slide-11-Layout selbst war nicht Thema.

**Kontext:** Q11 (Slide 19 Termin-Vorschläge) approved, aber Slide
11 wurde nicht explizit besprochen. Konservativ: nicht angetastet
in PASS 2.

---

## Slide 14 — Vergleich-Layout

**Frage:** Original-PDF zeigt Slide 14 als zwei-Spalten Balkendiagramm
oder Tabelle „Mit PV / Ohne PV" mit konkreten Zahlen. Pass-1-Repro
ist eine textbasierte 2-Karten-Variante. User-Antworten 1-12 haben
das nicht angesprochen. Soll das nachgezogen werden?

**Kontext:** Layout-Diskrepanz mittlerer Schwere — Text-Strings
passen, visuelle Hierarchie weicht ab.

---

## Slide 6, 12, 13, 15, 16, 18, 19 — visuell akzeptabel

**Status:** Im Pass-2-Cross-Check keine groben Layout-Diskrepanzen
oder Text-Lücken aufgefallen über die Q1-Q12-Antworten hinaus. Sollte
der User beim Sign-off-PR-Review trotzdem etwas finden, wird das in
einer dritten Klärungsrunde nachgezogen.

---

## Methodische Anmerkung — Pass-2-Scope-Disziplin

Implementer hat sich auf die **12 User-beantworteten Klärungsfragen**
beschränkt. Die hier gelisteten Befunde sind ausdrücklich
**out-of-scope für PASS 2** und werden erst nach User-Sign-off in
PASS 3 angegangen. Das entspricht CLAUDE.md §7.4: visuelle
Layout-Änderungen jenseits der Design-Tokens sind Pause-Trigger.
