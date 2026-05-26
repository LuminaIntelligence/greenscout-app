# Quellenregister — Calculation-Konstanten

> Lebendiges Dokument für jede physische / finanzielle Konstante, die in den PV-Machbarkeitsstudien-Berechnungen verwendet wird.
> Pflegehinweis: jede Änderung in `src/lib/calculations/constants.ts` oder `services/python/app/domain/constants.py` zieht eine Aktualisierung der entsprechenden Zeile hier nach sich (gleicher PR).

## Konstanten

| Konstante | Wert | Quelle | Stand | Anmerkung |
|---|---|---|---|---|
| `CO2_KG_PER_KWH_PV` | 0,474 kg CO₂/kWh | SPEC §4.7 — abgeleitet aus dem deutschen Strommix-Faktor | 2026-05-19 | Tritt 1:1 in `co2TonnenProJahr` ein. Wird sich verschieben, wenn UBA / BMWK den Strommix neu mittelt. |
| `CO2_HA_MISCHWALD_PER_T_PER_YEAR` | 0,0177 ha/t CO₂/Jahr | SPEC §4.7 (`≈ to be confirmed`) | 2026-05-19 | **PROVISIONAL** — GreenScout-Bestätigung steht aus. Siehe DECISIONS.md → "CO₂ Mischwald-Faktor provisional". |
| `FOOTBALL_FIELDS_PER_HA` | 1,28 Felder/ha | UEFA Standard-Spielfeld (105 m × 68 m = 7 140 m²) | 2026-05-19 | Wird als 1 ha / 7 140 m² berechnet und auf zwei Stellen gerundet. |
| `DEFAULT_PACHT_EUR_PER_KWP` | 100 €/kWp | SPEC §4.5 (Default für `pachtEurProKwp`) | 2026-05-19 | Berater darf pro Studie überschreiben. |
| `DEFAULT_VERTRAGSLAUFZEIT_JAHRE` | 20 Jahre | SPEC §4.5 (Default für `vertragslaufzeitJahre`); EEG-aligned | 2026-05-19 | Spec lässt Override zu, MVP rechnet aber mit 20 in der Ersparnis-Hochrechnung. |
| `DEFAULT_SENSITIVITY_CT_KWH` | [35, 40, 45] ct/kWh | DECISIONS.md — Wizard step layout | 2026-05-19 | Vorbelegung der drei Step-5-Felder; Berater darf überschreiben (max 200 ct/kWh laut zod-Schema). |

## Toleranzen für Parity-Tests (T-034)

| Feldklasse | Erlaubte relative Abweichung TS vs Py | Begründung |
|---|---|---|
| Monetär (`ersparnis*`, `pachtEinnahmeEinmalig`, `gesamtvorteil`) | `1e-6` | Beide Sprachen rechnen in `Decimal` / `number` mit 2–4 Nachkommastellen; Floating-Point-Drift ist nur am letzten Bit zu erwarten. |
| Energetisch (`gesamterzeugung20j`) | `1e-6` | Reines Produkt — verhält sich identisch wie monetäre Größen. |
| CO₂-Derivate (`co2TonnenProJahr`, `co2HektarMischwald`, `co2FussballfelderProJahr`) | `1e-4` | Mehrere Multiplikationen + Konstanten-Produkte; etwas mehr Spielraum, weil das CO₂-Resultat in der PPTX auf eine Nachkommastelle gerundet ausgewiesen wird. |

## Änderungsprozess

1. Wert in beiden Konstanten-Dateien (TS + Py) ändern.
2. Diese Tabelle aktualisieren (Wert, Quelle, Stand, Anmerkung).
3. `DECISIONS.md`-Eintrag schreiben, der den vorherigen Wert dokumentiert.
4. Parity-Fixtures in `services/python/tests/fixtures/calc-parity-fixtures.json` neu erzeugen oder anpassen — siehe T-034.
