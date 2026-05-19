# Continuous Integration

GreenScout's CI runs on every pull request and every push to non-`main`
branches via [`.github/workflows/ci.yml`](../.github/workflows/ci.yml). The
workflow reproduces all pre-commit gates plus the broader tests required by
CLAUDE.md §5.2.

## Trigger

```yaml
on:
  pull_request: {}
  push:
    branches-ignore:
      - main
```

The `branches-ignore: [main]` prevents duplicate runs when a PR is merged
(the `pull_request` event already covers the validation pass; a second run
on the resulting `main` push would be redundant).

Stale runs on the same ref are cancelled automatically via:

```yaml
concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

## Permissions

The workflow declares `permissions: { contents: read }` at the top level.
No job currently elevates beyond that. There is no deploy step, no token
write, no package publish — production deployment is a human-operator
workflow per CLAUDE.md §8.10.

## Job map

| Job | What it runs | Local equivalent | Status |
|---|---|---|---|
| `actionlint` | Lints `.github/workflows/*.yml` via `reviewdog/action-actionlint@v1` | `actionlint .github/workflows/ci.yml` | live |
| `lint-typecheck` | `npm ci` → `npm run lint` → `npm run format:check` → `npm run typecheck` | `npm run lint && npm run format:check && npm run typecheck` | live |
| `python-checks` | `pip install -r requirements-dev.txt` → `ruff check` → `ruff format --check` → `pyright` → `pytest` | inside `services/python/.venv` | live |
| `build-images` | Matrix builds `Dockerfile.web` and `services/python/Dockerfile` via `docker/build-push-action@v6` with `push: false` | `docker compose build` | live |
| `gitleaks-scan` | Full-history secret scan via `gitleaks/gitleaks-action@v2` | `gitleaks detect --config .gitleaks.toml` | live |
| `web-tests` | Vitest with coverage 80 % global / 100 % on calc | `npm test` | stub — enabled in T-018 |
| `e2e` | Playwright headless E2E for F1-F7 | `npm run test:e2e` | stub — enabled in T-051a/b |
| `prisma-migrate-check` | `prisma migrate deploy` against an ephemeral Postgres service | `npx prisma migrate dev` | stub — enabled in T-013 |

### Parallelism

All jobs run in parallel except `e2e`, which `needs: [lint-typecheck,
web-tests]`. The dependency is structurally correct (E2E should not start
before the build is known-good and unit tests pass) but currently has no
practical effect because `web-tests` is a stub that exits in seconds. When
Vitest lands in T-018 the dependency becomes meaningful.

### Stubs

Three jobs are stubs that echo `"STUB: ... enabled in T-0XX"` and exit `0`.
This keeps the workflow structure visible without failing on tools that
have not been installed yet. The future-task IDs are embedded in the stub
messages themselves:

| Stub job | Tracked by | Replace stub step with |
|---|---|---|
| `web-tests` | TASKS.md → T-018 | `npm ci`, then `npm test -- --coverage` with `c8`/`v8` thresholds (80 % global / 100 % `src/lib/calculations/`) |
| `e2e` | TASKS.md → T-051a/b | Playwright install + browser binaries + `npx playwright test` |
| `prisma-migrate-check` | TASKS.md → T-013 | `npm ci`, then `DATABASE_URL=postgresql://greenscout:greenscout_ci_only@localhost:5432/greenscout_ci npx prisma migrate deploy`. The Postgres service block is already wired. |

## Caching

- `actions/setup-node@v4` with `cache: 'npm'` and
  `cache-dependency-path: package-lock.json`.
- `actions/setup-python@v5` with `cache: 'pip'` and
  `cache-dependency-path: services/python/requirements-dev.txt`.
- `docker/build-push-action@v6` with `cache-from: type=gha` and
  `cache-to: type=gha,mode=max` for the GitHub Actions cache backend.

First-run cache misses are expected and harmless — caches populate on the
first successful run for subsequent runs to consume.

## Branch protection

CLAUDE.md §5.2 requires CI to pass before any PR can merge into `main`.
A repository **administrator** must enable branch protection in the GitHub
UI:

1. `Settings → Branches → Add rule` with the pattern `main`.
2. Enable **Require status checks to pass before merging** and select the
   following checks:
   - `Lint workflow YAML`
   - `TS lint + format + typecheck`
   - `Python ruff + pyright + pytest`
   - `Build Docker image (web)`
   - `Build Docker image (pyservice)`
   - `gitleaks secret scan`
3. Enable **Require branches to be up to date before merging**.
4. Enable **Require linear history** (no merge commits on `main`).
5. Do **not** enable the three stub jobs (`Vitest (stub — T-018)`,
   `Playwright (stub — T-051a/b)`, `Prisma migrate (stub — T-013)`) as
   required-for-merge yet. Flip each one to required when its underlying
   task lands and the stub step is replaced with the real invocation.

### §8.11 — never bypass branch protection

CLAUDE.md §8.11 is a hard line: even with `Administrators` permission, the
agent must not toggle branch protection off to force-land a PR. Branch-
protection configuration changes are a human-operator action.

## Local validation

The workflow is validated in CI by the `actionlint` job. To pre-flight the
file locally before pushing:

```bash
# Linux/macOS:
brew install actionlint && actionlint .github/workflows/ci.yml

# Windows (Scoop / winget):
winget install rhysd.actionlint
actionlint .github/workflows/ci.yml

# Cross-platform via Docker:
docker run --rm -v ${PWD}:/repo rhysd/actionlint:latest -color /repo/.github/workflows/ci.yml
```

## Action version upgrades

Action versions used today (audit at each bump):

- `actions/checkout@v4`
- `actions/setup-node@v4`
- `actions/setup-python@v5`
- `docker/setup-buildx-action@v3`
- `docker/build-push-action@v6`
- `reviewdog/action-actionlint@v1`
- `gitleaks/gitleaks-action@v2`

When bumping, verify the action is still maintained and that the version
tag has not been yanked. Watch the **release notes** rather than the
shipped major-version tag — the major tag is a moving pointer.

## Production?

CI **never** references production secrets or deploys to any target. Per
CLAUDE.md §8.10, production deployment is a human-operator action done
outside the agent / CI pipeline. The `build-images` job builds the Docker
images for verification only (`push: false`) — they are not tagged for any
registry.

The only secret referenced by the workflow is the built-in
`secrets.GITHUB_TOKEN`, which the gitleaks action consumes implicitly for
its scan annotations.
