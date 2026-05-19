# Python service (`services/python/`)

FastAPI service for PPTX templating + PDF rendering + image processing.
Consumed by the Next.js app over internal HTTP inside the Docker network
(SPEC §7.1). Single-port HTTP service, no message queue.

## Prerequisites

- **Python 3.12** — install via:
  - Windows: `winget install Python.Python.3.12` (then `py -3.12 --version`)
  - macOS: `brew install python@3.12`
  - Linux: distro package or `pyenv install 3.12`
- A POSIX-compatible shell (Git Bash on Windows is fine).
- Node 24 (already required by the Next side; needed for the lint-staged
  Python-tool launcher).

## First-time setup

```bash
cd services/python

# Create the venv — Windows:
py -3.12 -m venv .venv
# or macOS / Linux:
# python3.12 -m venv .venv

# Activate — Windows Git Bash / WSL:
source .venv/Scripts/activate
# or macOS / Linux:
# source .venv/bin/activate

pip install --upgrade pip
pip install -r requirements-dev.txt
```

The venv is gitignored (`/.venv/` in the repo-root `.gitignore`). Re-run
`pip install -r requirements-dev.txt` whenever either `requirements.txt`
or `requirements-dev.txt` changes.

## Day-to-day

```bash
# Activate venv first (per first-time setup), then from services/python/:
uvicorn app.main:app --reload --port 8000     # local server with hot reload
pytest                                         # test suite
ruff check . && ruff format --check .          # lint + format check
pyright                                        # strict type-check (mirrors TS strict on the Next side)
```

`uvicorn app.main:app` exposes `GET /health` at
`http://localhost:8000/health` returning `{"status": "ok"}`. Use this to
verify the service boots cleanly during local development and as the
Docker health probe in T-007.

## Pre-commit integration (no venv activation required)

The Husky hook (`docs/pre-commit.md`) runs `ruff check`, `ruff format
--check`, and `pyright` against staged `services/python/**/*.py` files
via `scripts/run-py-tool.mjs`. The wrapper:

1. Locates the platform-appropriate binary (`services/python/.venv/Scripts/<tool>.exe`
   on Windows, `services/python/.venv/bin/<tool>` on Unix).
2. Rewrites path arguments to be relative to `services/python/` so the
   tools pick up `pyproject.toml`.
3. Forwards stdio + exit code.

This means **once the venv is created** (`pip install -r requirements-dev.txt`),
no further setup is required — developers do not need to activate the
venv before committing, and ruff/pyright never need to be installed
globally.

If the wrapper reports "tool not found at .venv/...", create the venv per
the first-time setup above.

## Layout

Per SPEC §7.4:

```
services/python/
├── app/
│   ├── api/                # FastAPI routers (currently: health)
│   ├── domain/             # calc logic + constants (filled by T-031 / T-033)
│   ├── services/           # PPTX/PDF/image (filled by T-029b / T-038 / T-039)
│   ├── schemas/            # pydantic models
│   ├── config.py           # env loader stub (filled by T-035)
│   └── main.py             # FastAPI app + router mounts
├── tests/                  # pytest, conftest.py + per-feature
├── templates/              # GreenScout PPTX template lands here in T-036 / T-037
├── requirements.txt        # runtime deps
├── requirements-dev.txt    # ruff / pyright / pytest / httpx (incl. `-r requirements.txt`)
└── pyproject.toml          # tool config only — no [project] block
```

The existing root-level `Machbarkeitsstudie-PV-Template_v1_6.pptx` is
**not** moved into `services/python/templates/` as part of T-006 — that
move happens in T-036 / T-037 once the placeholder mapping is wired up.

## Why no Poetry / PDM / uv?

CLAUDE.md §2 pins the package manager to `pip + venv` for MVP. Adopting
a richer tool is a §7.10 architectural decision and out of scope. See
`DECISIONS.md` for the recorded reasoning.

## Why a separate Python service at all?

`python-pptx` is the only mature library for editing existing PowerPoint
templates with placeholder replacement while preserving formatting;
headless LibreOffice is the most reliable open-source PPTX→PDF renderer.
SPEC §7.2 covers the architectural rationale.
