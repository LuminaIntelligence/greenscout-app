# Pre-commit gates

GreenScout runs the following checks **on every local commit** via Husky 9 + lint-staged 17.

## Pipeline

1. **`tsc --noEmit`** — full-project TypeScript check.
2. **`lint-staged`** — per-file commands on the staged files:
   - `*.{ts,tsx,js,jsx,mjs,cjs}` → `eslint --max-warnings 0 --fix` then `prettier --check`
   - `*.{md,json,yml,yaml,css}` → `prettier --check` (Markdown is `.prettierignore`d in MVP and therefore a no-op until that policy changes)
   - `services/python/**/*.py` → `node scripts/run-py-tool.mjs ruff check --no-fix`, then `ruff format --check`, then `pyright`. The wrapper resolves the tool from `services/python/.venv/{Scripts,bin}/` so no global ruff/pyright install is needed (see `docs/python-service.md`).
3. **`gitleaks git --staged`** — scan staged content for secrets using gitleaks defaults plus the repo allowlist in `.gitleaks.toml`. (Gitleaks 8.30+ replaced the legacy `protect --staged` subcommand with `git --staged`.)

A clean commit should complete in **under 10 seconds** on a modern dev machine. `tsc --noEmit` is project-wide and dominates cold-cache runs; subsequent commits in the same session benefit from the incremental cache and are sub-second.

## Required tooling

| Tool | Install |
|---|---|
| Node 24 | matches `.nvmrc`; install via `nvm install 24` or the official installer |
| `gitleaks` | `winget install gitleaks` (Windows) / `brew install gitleaks` (macOS) / [release binaries](https://github.com/gitleaks/gitleaks/releases) (Linux) |

Ruff and Pyright live inside the Python service venv (`services/python/.venv/`) — installed via `pip install -r services/python/requirements-dev.txt` per the first-time setup in `docs/python-service.md`. The Husky hook invokes them through `scripts/run-py-tool.mjs`, which auto-resolves the platform-appropriate venv binary; developers do **not** need to activate the venv or install ruff/pyright globally.

If the venv is missing, the wrapper exits 1 with a pointer to `docs/python-service.md` — fix by creating the venv, not by `--no-verify`.

If `gitleaks` is missing from `PATH` the hook **fails the commit** with an install hint rather than silently skipping. The CI workflow in T-008 installs `gitleaks` separately.

## Bypassing

`git commit --no-verify` skips the hook entirely. **This is a `CLAUDE.md §8.12` violation** and agents must never use it. Human contributors who bypass the hook in an emergency must document the reason and re-run the gates manually before pushing.

## Adjusting rules

- **ESLint**: `eslint.config.mjs`
- **Prettier**: `prettier.config.mjs` + `.prettierignore`
- **Lint-staged scopes**: `package.json` `lint-staged` block
- **Gitleaks rules / allowlist**: `.gitleaks.toml`
- **Hook order**: `.husky/pre-commit`
- **Line-ending enforcement on hook scripts**: `.gitattributes`
