# `extract-template-text.py` — PPTX-Original → `template-content.json`

> **Wer das liest:** Implementer-Agent oder Mensch, der das PPTX-Template
> aktualisiert hat und die statischen Slide-Texte neu generieren möchte.

## Was tut das Skript?

`scripts/extract-template-text.py` läuft mit `python-pptx` durch
`templates/Machbarkeitsstudie-PV-Template_v1_6.pptx` und schreibt für jede
Slide alle Text-Runs (samt Shape-Geometrie, Schriftgröße, Bold/Italic und
einer Marker-Rot-Heuristik) nach
`src/features/studies/document/template-content.json`.

Das JSON ist die **Source of Truth** für die statischen Slide-Texte der
treuen React-Reproduktion (Pivot-2b, siehe `DECISIONS.md` 2026-06-02).
Slides werden gegen das JSON ausgelesen — nicht gegen manuelles Abtippen
des PPTX.

## Warum lokal-only?

`python-pptx` ist **NICHT** Production-Dep des FastAPI-Services
(`services/python/requirements.txt` enthält es nicht — siehe Pivot-PR-1
2026-06-01, das hatte den Service explizit von `python-pptx` + LibreOffice
befreit). Wir wollen die Dep nicht zurückbringen.

Stattdessen lebt `python-pptx` in einem **lokalen Mini-Venv**, das nicht
versioniert ist (`.venv-pptx-extract/` in `.gitignore` über das
`.venv-*/`-Pattern abgedeckt). Das generierte JSON wird dann committed.

## Reproduzierbarkeit — Setup

```bash
# Im Repo-Root
cd scripts
python -m venv .venv-pptx-extract
.venv-pptx-extract/Scripts/python -m pip install python-pptx==1.0.2
# (auf Linux/macOS: .venv-pptx-extract/bin/python -m pip install ...)
```

## Reproduzierbarkeit — Ausführen

```bash
# Im Repo-Root
scripts/.venv-pptx-extract/Scripts/python scripts/extract-template-text.py
# (auf Linux/macOS: scripts/.venv-pptx-extract/bin/python ...)
```

Output:

```
Wrote src/features/studies/document/template-content.json (19 slides, NN shapes, NNN runs)
```

## Wann erneut laufen?

- Nach jedem PPTX-Template-Update (`templates/Machbarkeitsstudie-PV-Template_v1_6.pptx`).
- Der entstehende JSON-Diff zeigt im PR was sich textuell geändert hat.

## Fallback-Setup (System-Python ohne Venv)

Wenn das lokale `.venv-pptx-extract`-Setup an einem Maschinen-Quirk
scheitert (z. B. eingeschränkte Sandbox die `venv/Scripts/python.exe`
nicht starten lässt), kann das Skript auch mit System-Python laufen:

```bash
python -m pip install --user python-pptx==1.0.2
python scripts/extract-template-text.py
```

Das ist nur für den lokalen one-shot OK — das System-Python soll nicht
zur Build-/CI-Dep werden.

## Wo lebt das PPTX selbst?

`templates/Machbarkeitsstudie-PV-Template_v1_6.pptx`. Das File wurde im
§7.10-Pivot 2026-06-01 (PR #60) aus dem Repo entfernt; mit Pivot-2b
2026-06-02 wieder restored (aus git history, vor-Pivot-Commit
`e54dd35`). Begründung in `DECISIONS.md` 2026-06-02.
