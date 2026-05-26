# PPTX-Mapping — `Machbarkeitsstudie-PV-Template_v1_6.pptx`

> **⚠️ DRAFT — awaiting user sign-off before T-037 modifies the template.**
> Slice 3b (T-037+) starts **only** after the user confirms the mapping below.
>
> Tracker: T-036 in `TASKS.md`. Author: implementer subagent.
> Source of truth for the extraction: `scripts/inspect-pptx.py` against
> `templates/Machbarkeitsstudie-PV-Template_v1_6.pptx` (19 slides).
>
> Naming convention: snake_case keys aligned with the Python pydantic
> schemas in `services/python/app/schemas/calc.py` (`StudyCalcInput`,
> `DerivedValues`) and the Prisma fields in `prisma/schema.prisma`
> (`Study`, `Customer`, `User`).

---

## How to read this document

Every row describes one **red text run** (or image placeholder shape)
extracted from the template. Static black text that does **not** change
per study is intentionally omitted to keep the table reviewable.

Column meanings:

| Column                | Meaning                                                                                                                                                                                                                                                              |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Slide #**           | Slide number as PowerPoint shows it (1-indexed).                                                                                                                                                                                                                     |
| **Shape \| run**      | python-pptx-style coordinate: shape display name + 0-based run index within the shape's text frame.                                                                                                                                                                  |
| **Current literal**   | The exact red text currently in the template.                                                                                                                                                                                                                        |
| **Proposed key**      | `{{snake_case_key}}` to substitute. `?` suffix flags an ambiguous case for user disambiguation.                                                                                                                                                                      |
| **Source**            | Where the value comes from. `StudyCalcInput.*` / `DerivedValues.*` are the snake_case fields on the pydantic models. `Study.*` / `Customer.*` / `User.*` reference Prisma fields. `format(...)` calls out a value that needs SPEC §8.3 German formatting at render time. |
| **Notes**             | Disambiguation, units, formatter hints, derived-value pathways.                                                                                                                                                                                                      |

Image placeholder shapes (`Picture` / `Grafik` shapes with no text) are
listed at the end of each slide section if they are intended to be
swapped at render time. The two known image swaps for the MVP are
`{{image_before}}` and `{{image_after}}`; the user must confirm which
shapes on which slides receive those.

---

## Sign-off checklist (user)

Review the table below, then mark this section once you're satisfied.
**T-037 will not start until at least the first four boxes are checked.**

- [ ] All static text correctly identified (i.e. nothing the consultant
      should be able to change has been left as static text).
- [ ] All dynamic placeholders cover the data needed (every red value
      maps to a `{{key}}` with a defined source).
- [ ] Snake_case names align with the pydantic schemas
      (`StudyCalcInput`, `DerivedValues`) and Prisma fields.
- [ ] Image placeholders (`{{image_before}}`, `{{image_after}}`) are
      assigned to the correct shapes on Slides 2, 4, 5 (cross-check the
      "Image placeholder candidates" rows below).
- [ ] Ambiguous keys (marked `?` in the table) have been disambiguated —
      either resolved here in this file or left for a follow-up
      discussion before T-037.
- [ ] No additional slots discovered post-review (i.e. the template has
      no other red values beyond those captured here).

When all of the above are checked, post the comment `mapping signed-off`
on the PR. The orchestrator dispatches Slice 3b (T-037, T-038a, T-038b,
T-039, T-040) on that signal.

---

## Aggregated key list (alphabetical, deduplicated)

Reference list of every distinct `{{key}}` proposed below. T-037 must
implement exactly this set; any deviation should be flagged before merge.

### Customer + object fields (sourced from `Customer` / `Study`)

- `{{customer_object_address}}` — combined `objectName, street, ZIP city in Flurstück X`.
- `{{customer_object_name}}` — short `Study.objectName` (e.g. "Linzgau Center").
- `{{customer_object_short_name_and_city}}` — short `Study.objectName, Study.objectCity`
  (used where the long-form address would not fit; see Slide 4 → "Objektstandort").

### PV-input fields (sourced from `StudyCalcInput`)

- `{{anlage_kwp}}` — `StudyCalcInput.anlage_kwp`, format as `1.234,5 kWp`.
- `{{modul_anzahl}}` — `Study.modulAnzahl` (int).
- `{{modul_flaeche_m2}}` — `Study.modulFlaecheM2`, format `1.234,5 m²`.
- `{{pv_erzeugung_kwh_jahr}}` — `StudyCalcInput.pv_erzeugung_kwh_jahr`, format `12.345 kWh`.
- `{{pv_eigenverbrauch_kwh_jahr}}` — `StudyCalcInput.pv_eigenverbrauch_kwh_jahr`, format `12.345 kWh`.
- `{{pv_verkauf_ct_kwh}}` — `StudyCalcInput.pv_verkauf_eur_kwh * 100`, format `20 ct/kWh`.
- `{{eigenverbrauchsquote_prozent}}` — `Study.eigenverbrauchsquoteProzent`, format `41 %`.
- `{{netzeinspeisung_kwh_jahr}}` — `Study.netzeinspeisungKwhJahr`, format `12.345 kWh`.
- `{{versorger_preis_ct_kwh}}` — `StudyCalcInput.versorger_preis_eur_kwh * 100`, format `35 ct/kWh`.

### Derived monetary values (sourced from `DerivedValues`)

- `{{pacht_einnahme_einmalig_eur}}` — `DerivedValues.pacht_einnahme_einmalig`, format `27.500 €`.
- `{{ersparnis_pro_jahr_eur}}` — `DerivedValues.ersparnis_pro_jahr`, format `24.600 €`.
- `{{ersparnis_pro_monat_eur}}` — `DerivedValues.ersparnis_pro_monat`, format `2.050 €`.
- `{{ersparnis_gesamt_vertragslaufzeit_eur}}` — `DerivedValues.ersparnis_20_jahre`, format `492.000 €`.
- `{{gesamterzeugung_vertragslaufzeit_kwh}}` — `DerivedValues.gesamterzeugung_20j`, format `4.720.000 kWh`.
- `{{gesamtvorteil_eur}}` — `DerivedValues.gesamtvorteil`, format `517.500 €`.

### Sensitivity scenarios (sourced from `Study.szenarioPreis*` + recomputed via `StudyCalcInput` substitution)

- `{{szenario_1_preis_ct_kwh}}` — `Study.szenarioPreis1` (default 35), format `35 ct/kWh`.
- `{{szenario_1_ersparnis_eur}}` — `composeAll(input with versorgerPreis = szenarioPreis1).ersparnisProJahr`, format `24.600 €`.
- `{{szenario_2_preis_ct_kwh}}` — `Study.szenarioPreis2` (default 40), format `40 ct/kWh`.
- `{{szenario_2_ersparnis_eur}}` — same pattern with `szenarioPreis2`, format `36.200 €`.
- `{{szenario_3_preis_ct_kwh}}` — `Study.szenarioPreis3` (default 45), format `45 ct/kWh`.
- `{{szenario_3_ersparnis_eur}}` — same pattern with `szenarioPreis3`, format `47.800 €`.

### CO₂ / Umwelt fields (sourced from `DerivedValues` honouring `Study.co2Override`)

- `{{co2_tonnen_pro_jahr}}` — `DerivedValues.co2_tonnen_pro_jahr`, format `110 t` (no decimals if `>= 10`).
- `{{co2_hektar_mischwald}}` — `DerivedValues.co2_hektar_mischwald`, format `39 ha`.
- `{{co2_fussballfelder_pro_jahr}}` — `DerivedValues.co2_fussballfelder_pro_jahr`, format `50 Fußballfelder`.
- `{{co2_tonnen_gesamt_vertragslaufzeit}}` — derived: `co2_tonnen_pro_jahr * vertragslaufzeit_jahre`, format `2.200 t`.
- `{{co2_fussballfelder_gesamt_vertragslaufzeit}}` — derived: `co2_fussballfelder_pro_jahr * vertragslaufzeit_jahre`, format `1.000 Fußballfelder`.

### Termin / Konsultation fields (Slide 19, sourced from `Study.terminVorschlag1/2`)

- `{{termin_vorschlag_1}}` — `Study.terminVorschlag1`, format `DD.MM.YYYY um HH.MM`.
- `{{termin_vorschlag_2}}` — `Study.terminVorschlag2`, format `DD.MM.YYYY um HH.MM`.

### Berater fields (sourced from the assigned `User`)

- `{{consultant_full_name}}` — `User.firstName + ' ' + User.lastName`.
- `{{consultant_phone}}` — `User.phone` (or `User.mobile` fallback).
- `{{consultant_email}}` — `User.email`.
- `{{consultant_address_line}}` — `User.addressLine`.

### Image placeholders

- `{{image_before}}` — `StudyImage.type = BEFORE` processed file (T-029b).
- `{{image_after}}` — `StudyImage.type = AFTER` processed file (T-029b).

---

## Per-slide breakdown

> ℹ️ Static black text (headings, body copy that stays the same across
> every study) is omitted. Only red dynamic values and known image
> placeholders are listed.

### Slide 1 — Titelseite

| Slide # | Shape \| run         | Current literal | Proposed key                | Source                              | Notes                                                                                                                                                                                |
| ------- | -------------------- | --------------- | --------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1       | `Textfeld 3 \| run 1` | `Berater `      | `{{consultant_full_name}}`  | `User.firstName + User.lastName`    | Replace the red `Berater ` literal so the slide reads "Eingereicht über **Bernd Berater** / direkt vom Unternehmen". The space after the name comes from existing static runs 0 + 2. |
| 1       | `Grafik 4 \| —`       | _PIC shape_     | _(no swap — brand graphic)_ | static                              | Likely the GreenScout logo; static asset, not part of the per-study swap.                                                                                                            |

### Slide 2 — Herzlichen Glückwunsch / Objektkennung

| Slide # | Shape \| run             | Current literal                                                              | Proposed key                            | Source                                                                                  | Notes                                                                                                                                                                                                          |
| ------- | ------------------------ | ---------------------------------------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2       | `Textfeld 4 \| run 0`     | `Einkaufszentrum Linzgau Center, Bergwaldstraße 4, 88630 Pfullendorf `      | `{{customer_object_address}}`           | `Study.objectName + ', ' + Study.objectAddress + ', ' + Study.objectZipCode + ' ' + Study.objectCity` | Long-line text — T-037 must set `auto_size = MSO_AUTO_SIZE.TEXT_TO_FIT_SHAPE` on this shape.                                                                                                                   |
| 2       | `Textfeld 4 \| run 1`     | `in Flurstück XYZ `                                                          | `in Flurstück {{flurstueck}}`           | `Study.flurstueck`                                                                      | The "in Flurstück " prefix is static text; only the parcel number is dynamic. Implementer choice: either keep "in Flurstück " literal and replace only `XYZ`, **or** replace the whole run with the prefixed form. Recommended: replace the whole run with `in Flurstück {{flurstueck}}` for consistent run boundaries. |
| 2       | `Grafik 5/8/10 \| —`      | _PIC shapes_                                                                 | _(brand graphics — no swap)_            | static                                                                                  | Decoration; not study-specific.                                                                                                                                                                                |

### Slide 3 — Drei zentrale Vorteile

| Slide # | Shape \| run        | Current literal                                                                | Proposed key                                  | Source                                                                                          | Notes                                                                                                                                                                                                                          |
| ------- | ------------------- | ------------------------------------------------------------------------------ | --------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 3       | `Text 1 \| run 4`    | `Einkaufszentrum Linzgau Center, Bergwaldstraße 4, 88630 Pfullendorf in Flurstück 78.10 ` | `{{customer_object_address_with_flurstueck}}` | `Study.objectName + ', ' + Study.objectAddress + ', ' + Study.objectZipCode + ' ' + Study.objectCity + ' in Flurstück ' + Study.flurstueck` | Includes Flurstück in-line, distinct from Slide 2's pattern which keeps the prefix as a separate run. Long-line — `TEXT_TO_FIT_SHAPE` recommended.                                                                            |
| 3       | `Text 2 \| run 7`    | `27.500 `                                                                      | `{{pacht_einnahme_einmalig_eur}} `            | `DerivedValues.pacht_einnahme_einmalig`                                                         | Formula: `Study.anlageKwp × Study.pachtEurProKwp × Study.vertragslaufzeitJahre`. Format `1.234.567 €` (NBSP between value and €; the existing `€ erwirtschaften.` run 8 already provides the `€` glyph, so the placeholder gets just the number + NBSP). |
| 3       | `Text 2 \| run 11`   | `2050 `                                                                        | `{{ersparnis_pro_monat_eur}} `                | `DerivedValues.ersparnis_pro_monat`                                                             | "Monatlich bis zu X € einsparen". Format `2.050 €` (NBSP).                                                                                                                                                                     |
| 3       | `Text 2 \| run 17`   | `492.000`                                                                      | `{{ersparnis_gesamt_vertragslaufzeit_eur}}`   | `DerivedValues.ersparnis_20_jahre`                                                              | "Bei 20 Jahren Laufzeit ca. X €".                                                                                                                                                                                              |

### Slide 4 — Auf einen Blick

Slide 4 is the **money slide** — it densely repeats key figures. Six shapes contribute and several values appear more than once, which is the SPEC's "24.600 € on multiple slides" disambiguation case.

| Slide # | Shape \| run                    | Current literal                  | Proposed key                                       | Source                                                                                          | Notes                                                                                                                                  |
| ------- | ------------------------------- | -------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 4       | `Text 4 \| run 0`                | `257`                            | `{{anlage_kwp}}`                                   | `StudyCalcInput.anlage_kwp`                                                                     | "Installierende Leistung — N kWp". Format: round to whole number if integer-valued (`257`), else `257,1`.                              |
| 4       | `Text 7 \| run 0`                | `236.000`                        | `{{pv_erzeugung_kwh_jahr}}`                        | `StudyCalcInput.pv_erzeugung_kwh_jahr`                                                          | "Jahresertrag" headline number, kWh.                                                                                                   |
| 4       | `Text 9 \| run 2`                | `4.720.000`                      | `{{gesamterzeugung_vertragslaufzeit_kwh}}`         | `DerivedValues.gesamterzeugung_20j`                                                             | "X kWh auf 20 Jahre". Formula: `pv_erzeugung × vertragslaufzeit`.                                                                      |
| 4       | `Text 9 \| run 6`                | `236.000 `                       | `{{pv_erzeugung_kwh_jahr}} `                       | `StudyCalcInput.pv_erzeugung_kwh_jahr`                                                          | Duplicate of `Text 7` — same source key. T-037 may replace both with the same placeholder; python-pptx will just write twice.          |
| 4       | `Text 13 \| run 0`               | `41`                             | `{{eigenverbrauchsquote_prozent}}`                 | `Study.eigenverbrauchsquoteProzent`                                                             | Eigenverbrauchsquote, large headline %.                                                                                                |
| 4       | `Text 15 \| run 1`               | `164.000`                        | `{{pv_eigenverbrauch_kwh_jahr}}`                   | `StudyCalcInput.pv_eigenverbrauch_kwh_jahr`                                                     | "Eigenverbrauch des Bedarfs: ca. X kWh (41 %)".                                                                                        |
| 4       | `Text 16 \| run 1`               | `492.000 `                       | `{{ersparnis_gesamt_vertragslaufzeit_eur}} `       | `DerivedValues.ersparnis_20_jahre`                                                              | "Mögliche Stromersparnis für 20 Jahre — ca. X €".                                                                                      |
| 4       | `Text 18 \| run 1`               | `24.600 `                        | `{{ersparnis_pro_jahr_eur}} `                      | `DerivedValues.ersparnis_pro_jahr`                                                              | "Jährlich ca. X €".                                                                                                                    |
| 4       | `Textfeld 27 \| run 2`           | `110 `                           | `{{co2_tonnen_pro_jahr}} `                         | `DerivedValues.co2_tonnen_pro_jahr`                                                             | Tonnen CO₂ pro Jahr. Honours `Study.co2Override`.                                                                                      |
| 4       | `Textfeld 27 \| run 8`           | ` 39 `                           | ` {{co2_hektar_mischwald}} `                       | `DerivedValues.co2_hektar_mischwald`                                                            | Hektar Mischwald-Äquivalent.                                                                                                           |
| 4       | `Textfeld 27 \| run 12`          | `50 `                            | `{{co2_fussballfelder_pro_jahr}} `                 | `DerivedValues.co2_fussballfelder_pro_jahr`                                                     | Fußballfelder pro Jahr.                                                                                                                |
| 4       | `Textfeld 27 \| run 16`          | `2200 `                          | `{{co2_tonnen_gesamt_vertragslaufzeit}} `          | derived: `co2_tonnen_pro_jahr × vertragslaufzeit_jahre`                                          | "Bei 20 Jahren Nutzungsdauer X Tonnen". Format `1.234 t` (NBSP-separator if appended unit).                                            |
| 4       | `Textfeld 27 \| run 22`          | `1000 `                          | `{{co2_fussballfelder_gesamt_vertragslaufzeit}} `  | derived: `co2_fussballfelder_pro_jahr × vertragslaufzeit_jahre`                                  | "Ca. X Fußballfelder!" total over contract.                                                                                            |
| 4       | `Text 16 \| run 0` (Pacht block) | `27.500 `                        | `{{pacht_einnahme_einmalig_eur}} `                 | `DerivedValues.pacht_einnahme_einmalig`                                                         | Second occurrence on Slide 4 (Pachteinnahmen-Block). Identical source to Slide 3 run 7.                                                |
| 4       | `Textfeld 34 \| run 1`           | `Linzgau Center, Pfullendorf. `  | `{{customer_object_short_name_and_city}}. `        | `Study.objectName + ', ' + Study.objectCity + '.'`                                              | Footer "Objektstandort: …" — short form, **not** the full address. Disambiguation note: this is shorter than `{{customer_object_address}}`. |
| 4       | `Textfeld 34 \| run 2`           | `Flurstück: 78.10`               | `Flurstück: {{flurstueck}}`                        | `Study.flurstueck`                                                                              | Static prefix `Flurstück: ` + dynamic value.                                                                                          |
| 4       | `Image 0` / `Grafik 25` shapes   | _PIC shapes_                     | **image placeholder candidates** — see note below   | TBD                                                                                             | **Disambiguate at sign-off**: which of `Image 0` / `Grafik 25` is the BEFORE photo on Slide 4 (vs. brand-graphic)? Default assumption: `Image 0` becomes `{{image_before}}`. |

### Slide 5 — Jetzt / Später Wirtschaftlichkeit

| Slide # | Shape \| run               | Current literal | Proposed key                                       | Source                                                                                          | Notes                                                                                                                                  |
| ------- | -------------------------- | --------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 5       | `Textfeld 13 \| run 1`      | `27.500 `       | `{{pacht_einnahme_einmalig_eur}} `                 | `DerivedValues.pacht_einnahme_einmalig`                                                         | Third occurrence — same source.                                                                                                        |
| 5       | `Textfeld 15 \| run 3`      | `468.982`       | `{{pv_erzeugung_kwh_gesamt_vertragslaufzeit}}`     | derived: `pv_erzeugung × vertragslaufzeit`                                                       | **Disambiguation**: this is the **20-year PV total** from PV-Sol, but the existing template's literal `468.982` differs from `Text 9 \| run 2 = 4.720.000` on Slide 4. **Open question**: is this slide's value supposed to be `pv_eigenverbrauch × vertragslaufzeit_jahre` rather than `pv_erzeugung × ...`? Awaiting user confirmation. Provisional key suggestion: `{{pv_eigenverbrauch_kwh_gesamt_vertragslaufzeit}}` — please confirm. |
| 5       | `Textfeld 11 \| run 0`      | `20,00 `        | `{{pv_verkauf_ct_kwh}}`                            | `StudyCalcInput.pv_verkauf_eur_kwh × 100`                                                       | PV-Stromlieferpreis in ct/kWh. Format `20,00` (German decimal).                                                                        |
| 5       | `Textfeld 11 \| run 7`      | `492.000`       | `{{ersparnis_gesamt_vertragslaufzeit_eur}}`        | `DerivedValues.ersparnis_20_jahre`                                                              | "Einsparpotential gegenüber dem heutigen Stromlieferanten ca. X €".                                                                    |
| 5       | `Grafik 2/5/10` shapes      | _PIC shapes_    | **image placeholder candidates** — see note below   | TBD                                                                                             | "Vorher - Nachher"-Block. **Disambiguate at sign-off**: which two of these three shapes are `{{image_before}}` and `{{image_after}}`? Default assumption based on shape ordering: `Grafik 2 = {{image_before}}`, `Grafik 5 = {{image_after}}`, `Grafik 10` = static brand mark. |

### Slide 6 — Dafür stehen wir (Mission/Vision)

No red text runs. Slide is fully static. No placeholders required.

### Slide 7 — Wir sind ihr strategischer Partner

No red text runs. Static.

### Slide 8 — Warum eine Zusammenarbeit sinnvoll ist

No red text runs. Static.

### Slide 9 — Ausgangssituation: Markt- und Kostenrisiken

| Slide # | Shape \| run    | Current literal | Proposed key                                  | Source                                                                                          | Notes                                                                                                                                                                                                          |
| ------- | --------------- | --------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 9       | `Text 4 \| run 1` | `32`            | `{{versorger_preis_ct_kwh}}`                  | `StudyCalcInput.versorger_preis_eur_kwh × 100`                                                  | "Ihr aktueller Netzstrompreis X netto ct/kWh". **Disambiguation**: the template currently has `32` here but `35` on Slide 12 / 14 / 15. Slide 9 likely an older draft; map to same single source `{{versorger_preis_ct_kwh}}` so all three reflect the consultant-entered value uniformly. |
| 9       | `Text 21 \| run 2` | `27.500`       | `{{pacht_einnahme_einmalig_eur}}`             | `DerivedValues.pacht_einnahme_einmalig`                                                         | Pachteinnahmen Summary.                                                                                                                                                                                        |
| 9       | `Text 21 \| run 5` | `492.000 `     | `{{ersparnis_gesamt_vertragslaufzeit_eur}} `  | `DerivedValues.ersparnis_20_jahre`                                                              | Stromersparnis 20 Jahre.                                                                                                                                                                                       |
| 9       | `Text 21 \| run 8` | `2200 `        | `{{co2_tonnen_gesamt_vertragslaufzeit}} `     | derived                                                                                         | CO₂-Ersparnis 20 Jahre.                                                                                                                                                                                        |

### Slide 10 — PV-Anlagenkonzept: Dachbelegung

| Slide # | Shape \| run    | Current literal  | Proposed key                              | Source                              | Notes                                                                                                                                  |
| ------- | --------------- | ---------------- | ----------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 10      | `Text 1 \| run 1` | `Linzgau Center ` | `{{customer_object_name}} `              | `Study.objectName`                  | Short form of object name only.                                                                                                       |
| 10      | `Text 1 \| run 3` | `257,12`         | `{{anlage_kwp}}`                          | `StudyCalcInput.anlage_kwp`         | German decimal `,`. Format: 2 fractional digits if non-integer.                                                                       |
| 10      | `Text 5 \| run 1` | `257,12`         | `{{anlage_kwp}}`                          | same source                         | Duplicate.                                                                                                                            |
| 10      | `Text 5 \| run 3` | `587`            | `{{modul_anzahl}}`                        | `Study.modulAnzahl`                 | Modulanzahl from PV-Sol (manual in MVP).                                                                                              |
| 10      | `Text 5 \| run 5` | `1.178,6`        | `{{modul_flaeche_m2}}`                    | `Study.modulFlaecheM2`              | Modulfläche m².                                                                                                                       |

### Slide 11 — Energiefluss und Eigenverbrauch

| Slide # | Shape \| run    | Current literal | Proposed key                            | Source                                                | Notes                                                                                          |
| ------- | --------------- | --------------- | --------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 11      | `Text 1 \| run 1` | `236.000`       | `{{pv_erzeugung_kwh_jahr}}`             | `StudyCalcInput.pv_erzeugung_kwh_jahr`                | "PV-Erzeugung X kWh/Jahr".                                                                     |
| 11      | `Text 1 \| run 3` | `41%`           | `{{eigenverbrauchsquote_prozent}}%`     | `Study.eigenverbrauchsquoteProzent`                   | "X% direkt genutzt". Static `%` after the placeholder.                                         |
| 11      | `Text 3 \| run 1` | `236000 `       | `{{pv_erzeugung_kwh_jahr}} `            | same source                                           | Note: literal in template is `236000` (no `.` separator). Output uses `1.234.567` formatter — that's a **template normalisation** the rendering layer handles. |
| 11      | `Text 5 \| run 1` | `164000 `       | `{{pv_eigenverbrauch_kwh_jahr}} `       | `StudyCalcInput.pv_eigenverbrauch_kwh_jahr`           | Same normalisation note.                                                                       |
| 11      | `Text 5 \| run 5` | `41% `          | `{{eigenverbrauchsquote_prozent}}% `    | `Study.eigenverbrauchsquoteProzent`                   | "(X% der PV-Menge)".                                                                           |
| 11      | `Text 7 \| run 1` | `72000 `        | `{{netzeinspeisung_kwh_jahr}} `         | `Study.netzeinspeisungKwhJahr`                        | Netzeinspeisung.                                                                               |

### Slide 12 — Wirtschaftlichkeit: Stromliefervertrag

| Slide # | Shape \| run    | Current literal | Proposed key                              | Source                                          | Notes                                                                                            |
| ------- | --------------- | --------------- | ----------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 12      | `Text 1 \| run 1` | `20`            | `{{pv_verkauf_ct_kwh}}`                   | `StudyCalcInput.pv_verkauf_eur_kwh × 100`       | PV-Strompreis ct/kWh.                                                                            |
| 12      | `Text 1 \| run 3` | `35 `           | `{{versorger_preis_ct_kwh}} `             | `StudyCalcInput.versorger_preis_eur_kwh × 100`  | Netzstrompreis aktuell.                                                                          |
| 12      | `Text 3 \| run 1` | `20 `           | `{{pv_verkauf_ct_kwh}} `                  | same source                                     | Duplicate.                                                                                       |
| 12      | `Text 6 \| run 1` | `35`            | `{{versorger_preis_ct_kwh}}`              | same source                                     | Duplicate.                                                                                       |
| 12      | `Text 9 \| run 1` | `24.600 `       | `{{ersparnis_pro_jahr_eur}} `             | `DerivedValues.ersparnis_pro_jahr`              | Jährliche Ersparnis.                                                                             |
| 12      | `Text 9 \| run 4` | `492.000`       | `{{ersparnis_gesamt_vertragslaufzeit_eur}}` | `DerivedValues.ersparnis_20_jahre`            | 20-Jahre-Ersparnis.                                                                              |
| 12      | `Text 10 \| run 1` | `164.000`      | `{{pv_eigenverbrauch_kwh_jahr}}`          | `StudyCalcInput.pv_eigenverbrauch_kwh_jahr`     | "Differenz bei Eigenverbrauch (X kWh/Jahr)".                                                     |

### Slide 13 — Langfristige Wirtschaftlichkeit: 20 Jahre

| Slide # | Shape \| run    | Current literal | Proposed key                                  | Source                                          | Notes                                                                                                                                              |
| ------- | --------------- | --------------- | --------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 13      | `Text 2 \| run 1` | `24.600`        | `{{ersparnis_pro_jahr_eur}}`                  | `DerivedValues.ersparnis_pro_jahr`              | Jährliche Einsparung.                                                                                                                              |
| 13      | `Text 4 \| run 1` | `490.000`       | `{{ersparnis_gesamt_vertragslaufzeit_eur}}`   | `DerivedValues.ersparnis_20_jahre`              | **Disambiguation**: template literal is `490.000` here but `492.000` elsewhere. Same source key — the difference is rounding in the existing template; T-037 will normalise via the formatter so all occurrences agree. |
| 13      | `Text 6 \| run 1` | `27.500`        | `{{pacht_einnahme_einmalig_eur}}`             | `DerivedValues.pacht_einnahme_einmalig`         | Einmalige Dachpacht.                                                                                                                               |
| 13      | `Text 8 \| run 1` | `517.500 `      | `{{gesamtvorteil_eur}} `                      | `DerivedValues.gesamtvorteil`                   | "Gesamter wirtschaftlicher Vorteil: > X € über 20 Jahre". Formula: `ersparnis_20_jahre + pacht_einnahme_einmalig`.                                |

### Slide 14 — Vergleich: Mit PV vs. Ohne PV

| Slide # | Shape \| run    | Current literal | Proposed key                                   | Source                                          | Notes                                                                                                                                                                                                         |
| ------- | --------------- | --------------- | ---------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 14      | `Text 4 \| run 1` | `140.000 `      | `{{stromkosten_ohne_pv_eur_jahr}} `            | derived: `Study.verbrauchKwhJahr × Study.versorgerPreisEurKwh` | "Ohne PV: ca. X € Stromkosten pro Jahr". `verbrauch × versorger_preis`. **Disambiguation needed**: is this denominator the full annual consumption, or the consumption portion not covered by eigenverbrauch? Default: full consumption. |
| 14      | `Text 7 \| run 1` | `115.400`       | `{{stromkosten_mit_pv_eur_jahr}}`              | derived: `(verbrauch − pv_eigenverbrauch) × versorger_preis + pv_eigenverbrauch × pv_verkauf` | "Mit PV: ca. X € Stromkosten pro Jahr". Formula: residual-from-grid at supplier price + self-consumed at PV-Liefervertrag price.                                                                              |
| 14      | `Text 8 \| run 1` | `20 `           | `{{pv_verkauf_ct_kwh}} `                       | `StudyCalcInput.pv_verkauf_eur_kwh × 100`       | "Fixer PV-Strompreis X ct/kWh".                                                                                                                                                                               |
| 14      | `Text 10 \| run 1` | `24.600`       | `{{ersparnis_pro_jahr_eur}}`                   | `DerivedValues.ersparnis_pro_jahr`              | "Jährliche Reduktion der Stromkosten".                                                                                                                                                                        |

### Slide 15 — Sensitivitätsanalyse: Strompreis-Szenarien

| Slide # | Shape \| run    | Current literal | Proposed key                          | Source                                                                          | Notes                                                            |
| ------- | --------------- | --------------- | ------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 15      | `Text 1 \| run 1` | `20`            | `{{pv_verkauf_ct_kwh}}`               | `StudyCalcInput.pv_verkauf_eur_kwh × 100`                                       | "Netzpreisvarianten und jährliche Einsparung bei PV-Strom X ct/kWh". |
| 15      | `Text 3 \| run 1` | `35`            | `{{szenario_1_preis_ct_kwh}}`         | `Study.szenarioPreis1`                                                          | Basisszenario.                                                   |
| 15      | `Text 3 \| run 3` | `24.600`        | `{{szenario_1_ersparnis_eur}}`        | recompute via `composeAll(...{ versorgerPreis: szenarioPreis1 / 100 })`        | Computed per-scenario.                                           |
| 15      | `Text 5 \| run 1` | `40`            | `{{szenario_2_preis_ct_kwh}}`         | `Study.szenarioPreis2`                                                          | Moderates Szenario.                                              |
| 15      | `Text 5 \| run 3` | `36.200`        | `{{szenario_2_ersparnis_eur}}`        | recompute via `composeAll(...{ versorgerPreis: szenarioPreis2 / 100 })`        | Computed per-scenario.                                           |
| 15      | `Text 7 \| run 1` | `45 `           | `{{szenario_3_preis_ct_kwh}} `        | `Study.szenarioPreis3`                                                          | Hohes Szenario.                                                  |
| 15      | `Text 7 \| run 3` | `47.800`        | `{{szenario_3_ersparnis_eur}}`        | recompute via `composeAll(...{ versorgerPreis: szenarioPreis3 / 100 })`        | Computed per-scenario.                                           |

### Slide 16 — Variantenvergleich und Empfehlung

| Slide # | Shape \| run     | Current literal | Proposed key                                | Source                                          | Notes                                                                                                                                                                          |
| ------- | ---------------- | --------------- | ------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 16      | `Text 1 \| run 1`  | `Linzgau Center` | `{{customer_object_name}}`                  | `Study.objectName`                              | Headline name only.                                                                                                                                                            |
| 16      | `Text 3 \| run 1`  | `27.500 `       | `{{pacht_einnahme_einmalig_eur}} `          | `DerivedValues.pacht_einnahme_einmalig`         | Variante A: Nur Flächenpacht.                                                                                                                                                  |
| 16      | `Text 9 \| run 1`  | `27.500`        | `{{pacht_einnahme_einmalig_eur}}`           | same source                                     | Variante B: ditto pacht.                                                                                                                                                       |
| 16      | `Text 9 \| run 5`  | `20 `           | `{{pv_verkauf_ct_kwh}} `                    | `StudyCalcInput.pv_verkauf_eur_kwh × 100`       | "Konstanter Strompreis X ct/kWh fix".                                                                                                                                          |
| 16      | `Text 10 \| run 1` | `24.600 `       | `{{ersparnis_pro_jahr_eur}} `               | `DerivedValues.ersparnis_pro_jahr`              | Konstante jährliche Einsparung.                                                                                                                                                |
| 16      | `Text 10 \| run 4` | `492.000`       | `{{ersparnis_gesamt_vertragslaufzeit_eur}}` | `DerivedValues.ersparnis_20_jahre`              | "bei 20 Jahren ca. X €".                                                                                                                                                       |

### Slide 17 — Der Weg zur Inbetriebnahme

| Slide # | Shape \| run         | Current literal | Proposed key                       | Source                                          | Notes                                              |
| ------- | -------------------- | --------------- | ---------------------------------- | ----------------------------------------------- | -------------------------------------------------- |
| 17      | `Textfeld 7 \| run 5` | `24.600 `       | `{{ersparnis_pro_jahr_eur}} `      | `DerivedValues.ersparnis_pro_jahr`              | "Strom direkt vom eigenen Dach — X € pro Jahr Ersparnis". |
| 17      | `Textfeld 7 \| run 9` | `490.000 `      | `{{ersparnis_gesamt_vertragslaufzeit_eur}} ` | `DerivedValues.ersparnis_20_jahre`     | "ca. X € in 20 Jahren". Rounding note as on Slide 13. |
| 17      | `Textfeld 20 \| run 6` | `27.500`       | `{{pacht_einnahme_einmalig_eur}}`  | `DerivedValues.pacht_einnahme_einmalig`         | "Zahlung Dachpacht ca. X €".                       |

### Slide 18 — EEG (Erneuerbare-Energien-Gesetz)

No red text runs. Fully static.

### Slide 19 — Kontaktdaten + Termine + Berater

| Slide # | Shape \| run    | Current literal       | Proposed key                | Source                                          | Notes                                                                                                                |
| ------- | --------------- | --------------------- | --------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 19      | `Text 3 \| run 3` | `XX.XX.XXXX um XX.XX` | `{{termin_vorschlag_1}}`    | `Study.terminVorschlag1`                        | Format `DD.MM.YYYY um HH.MM`.                                                                                        |
| 19      | `Text 3 \| run 8` | `XX.XX.XXXX um XX.XX ` | `{{termin_vorschlag_2}} ` | `Study.terminVorschlag2`                        | Format same.                                                                                                         |
| 19      | `Text 2 \| run 0` | `Bernd Berater`       | `{{consultant_full_name}}`  | `User.firstName + ' ' + User.lastName`          | Bottom-card Berater name. **Disambiguation**: The `Text 4 (Telefon:)` and the `Text 5 (E-Mail:)` literal lines below are also currently hard-coded to the GreenScout default. The user must decide: keep them static (GreenScout-V e.V. central contact) or swap to the assigned consultant's `User.phone` / `User.email`. **Recommended for MVP**: keep `Text 4/5/6` static (the central GreenScout e.V. contact line — phone +49 172 3794240, projektberatung@greenscout-ev.de, Utechter Str. 5) and only personalise the bottom-right "Bernd Berater" card via `{{consultant_full_name}}`. Confirm at sign-off. |

---

## Disambiguation summary — items the user must resolve at sign-off

These flagged items require an explicit answer before T-037 starts:

| # | Slide(s) | Question                                                                                          | Default assumption (if no other answer)                                                                                |
| - | -------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1 | 5        | What is `Textfeld 15 \| run 3 = 468.982` supposed to be?                                          | Provisional: `{{pv_eigenverbrauch_kwh_gesamt_vertragslaufzeit}}` — `pv_eigenverbrauch × vertragslaufzeit_jahre`.       |
| 2 | 14       | Is `140.000 €` "Ohne PV" the full annual consumption × supplier price?                            | Default: yes — `verbrauchKwhJahr × versorgerPreisEurKwh`.                                                              |
| 3 | 14       | Is `115.400 €` "Mit PV" the residual-from-grid + eigenverbrauch-at-PV-price?                       | Default: yes — `(verbrauch − pv_eigenverbrauch) × versorger_preis + pv_eigenverbrauch × pv_verkauf`.                   |
| 4 | 19       | Should `Telefon` / `E-Mail` / `Adresse` lines stay as the central GreenScout contact, or rotate per-consultant? | Default: stay central; only `{{consultant_full_name}}` rotates per study.                                              |
| 5 | 4, 5     | Which exact shape names receive `{{image_before}}` and `{{image_after}}`?                          | Default: Slide 4 `Image 0` = `{{image_before}}`; Slide 5 `Grafik 2` = `{{image_before}}` and `Grafik 5` = `{{image_after}}`. |
| 6 | 9        | Slide 9's `32` ct/kWh literal differs from Slide 12/14/15's `35`. Unify to a single placeholder?  | Default: yes — single placeholder `{{versorger_preis_ct_kwh}}`; user-entered value drives all four slides.            |

---

## Notes on the rendering layer (forward-looking, **not** in scope of T-036)

These notes are not actionable here — they are pointers for the
implementer of T-037 and T-038a to consume:

1. **German number formatting** (SPEC §8.3) is the responsibility of the
   document-generation layer (T-038a), not the placeholder template. The
   placeholders carry **pre-formatted** strings. Implementing the
   formatter once (numbers, currency NBSP, dates `DD.MM.YYYY`,
   percentages, units) belongs to the new `app.services.formatters`
   module to be added in T-038a.
2. **Run-stitching across the `{{` and `}}`**: python-pptx splits runs
   on style boundaries. T-038a's text replacement must scan paragraph-
   level joined text and re-write the placeholder across runs while
   preserving the formatting of the **first** run that began the
   placeholder. See SPEC §4.8 + the existing `Textfeld 13` patterns
   where the red value and the trailing space live in adjacent runs.
3. **`TEXT_TO_FIT_SHAPE`**: shapes flagged in the Notes column above
   (long addresses, object names) need the auto-size attribute set in
   T-037's `apply_placeholders.py` script — see T-037 acceptance criteria.

---

## Provenance

This document was produced by walking the .pptx-archive XML
(`ppt/slides/slide*.xml`) with `scripts/inspect-pptx.py`. The script is
stdlib-only (no python-pptx dependency) so it runs in CI without
extending `requirements.txt`. To regenerate the raw dump:

```bash
python scripts/inspect-pptx.py templates/Machbarkeitsstudie-PV-Template_v1_6.pptx
```

The mapping table above is the **human-curated** interpretation of that
dump — it cannot be regenerated mechanically because the snake_case key
assignments and the source-field bindings require domain knowledge.
