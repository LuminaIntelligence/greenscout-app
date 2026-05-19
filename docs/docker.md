# Local Docker development stack

Three-service Docker Compose setup for GreenScout's local development:
`web` (Next.js), `pyservice` (FastAPI), `db` (Postgres 16). All three
talk to each other over the `gs-network` bridge network, and the two
app services share the host's `./uploads` and `./generated` directories
via bind mounts (CLAUDE.md §3).

> **Production deployment is OUT OF SCOPE for the Claude Code agent**
> per `CLAUDE.md` §8.10. The same `docker-compose.yml` may be reused on
> the Hetzner VPS by a human operator, but the agent never runs
> `docker compose up` against the production target.

## Prerequisites

- Docker Engine 24+ or Docker Desktop with Compose v2 / v5
  (`docker compose version` should print a version ≥ 2.x).

## First-time setup

```bash
cp .env.example .env
# Edit .env and set the placeholders to real LOCAL values:
#   - POSTGRES_PASSWORD
#   - AUTH_SECRET                (openssl rand -base64 32)
#   - SETTINGS_ENCRYPTION_KEY    (openssl rand -base64 32)
#   - SEED_ADMIN_TEMP_PASSWORD
#   - PYTHON_SERVICE_API_KEY
docker compose build       # ~2–5 minutes the first time, then cached
docker compose up -d
```

Verify the stack:

```bash
docker compose ps                                       # all three "healthy"
docker compose exec web wget -qO- http://pyservice:8000/health
# expect: {"status":"ok"}
curl http://localhost:3000/                              # Next.js placeholder
```

## Common commands

| Command                                              | Purpose                                   |
| ---------------------------------------------------- | ----------------------------------------- |
| `docker compose up -d`                               | Start the stack (detached)                |
| `docker compose up -d --build`                       | Rebuild images then start                 |
| `docker compose logs -f web`                         | Tail logs of one service                  |
| `docker compose exec web sh`                         | Shell into the web container              |
| `docker compose exec db psql -U greenscout greenscout_dev` | Open a psql shell on the dev database |
| `docker compose down`                                | Stop containers (preserve the volume)     |
| `docker compose down -v`                             | Stop AND delete `postgres-data` volume    |
| `docker compose config`                              | Validate the compose file (no daemon)     |

## Networking

| Service     | Container DNS  | Host port               |
| ----------- | -------------- | ----------------------- |
| `web`       | `web`          | `127.0.0.1:3000`        |
| `pyservice` | `pyservice`    | `127.0.0.1:8000`        |
| `db`        | `db`           | `127.0.0.1:5432`        |

All ports are bound to `127.0.0.1` only — they are not exposed to your
LAN. Containers reach each other by **service name** on `gs-network`.

## Persistence

| Data                              | Backing store                                   |
| --------------------------------- | ----------------------------------------------- |
| Postgres data                     | named volume `postgres-data` (survives `down`)  |
| Uploaded images                   | host bind mount `./uploads/`                    |
| Generated PPTX/PDF                | host bind mount `./generated/`                  |

`./uploads/` and `./generated/` are git-ignored — they hold dev-only
state. `docker compose down -v` destroys the Postgres volume; the bind
mounts on host disk are untouched by Compose.

## Container users

| Service     | User inside container        |
| ----------- | ---------------------------- |
| `web`       | `nextjs` (UID 1001)          |
| `pyservice` | `gsuser` (UID 1001)          |
| `db`        | `postgres` (UID 999, image default) |

Both app services run as non-root inside the container as a defence-in-depth
hardening measure.

## What's intentionally NOT in the pyservice image yet

- **LibreOffice headless.** Lands in T-039 (PDF rendering). Until then,
  `pyservice` is a thin FastAPI runtime exposing `/health`.
- **`python-pptx`, `Pillow`.** Land in T-026 / T-027.

## Quality gates the agent runs on this stack

- `docker compose config` exits 0.
- `docker compose build` succeeds for both `web` and `pyservice`.
- `docker compose up -d db` brings Postgres up healthy.
- `docker compose exec web wget -qO- http://pyservice:8000/health` returns
  `{"status":"ok"}` — proving service-name DNS works across the network.

## Reminder — production deploys are human-only

`CLAUDE.md` §8.10 forbids the agent from spinning up production. If you
copy this file to the Hetzner VPS:

- The agent will never run `docker compose up -d` against that target.
- Production secrets live only on the VPS, never in `.env` in the repo.
- Production database migrations (`prisma migrate deploy`) are a human
  workflow, not an agent workflow (`CLAUDE.md` §8.6).
