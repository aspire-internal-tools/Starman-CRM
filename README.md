# Starman CRM — Aspire Investments & Insurance

**Starman** is the codename for the CRM: an in-house ("intrapreneurship") platform built for a CIRO-regulated Canadian
investment & insurance advisory practice. One firm, multiple advisor accounts,
PIPEDA-conscious by design: all data lives in the firm's own PostgreSQL database,
nothing is scraped, and locked carriers (Canada Life, Quadrus) are disabled in code.

The selected deployment target is **Microsoft Azure Container Apps in Canada Central**. Azure resources have not been provisioned; real client information remains prohibited until the Project Map pilot gates and Azure security/residency checklist are approved.


## Current version

The active design prototype file is **versionless**: `design/Starman.html`.
Versions are tracked internally, never in file names:

- File: `design/Starman.html` (permanent name)
- HTML title: `Starman — Advisor OS · Aspire CRM`
- Metadata: `<meta name="version" content="2.0.0">`
- Version log: `docs/Starman-Version-History.md` (the internal record of every version change)

Use `2.x` for current prototype/module documentation. Do not create parallel versioned prototype files — bump the metadata version and log it instead.

## Quick start

### Prototype only — no Docker needed (fastest)

The design prototype (`design/Starman.html`) is a single self-contained page with
built-in demo data. It needs **no database, no build, and no Docker**.

Double-click **`run-prototype.command`** — it serves the page and opens it at
http://localhost:4173/Starman.html (login: `andrew@aspire.ca` / `starman123`).

```bash
# manual equivalent — any static server works, or just open the file:
cd design && python3 -m http.server 4173   # then open http://localhost:4173/Starman.html
open design/Starman.html                    # or simply open it in a browser
```

### Full app (API + database)

Double-click **`launch_starman.command`** — it starts Docker, builds the app, and
opens http://localhost:4000.

```bash
cd starman-app && docker compose up --build   # manual equivalent
```

Docker is only used here to run **PostgreSQL** alongside the Node server. To run
the full app without Docker you need Node 20 + a local PostgreSQL instance:

```bash
cd starman-app/server
cp .env.example .env      # set DATABASE_URL to your local Postgres + a JWT_SECRET
npm install
npm run setup             # prisma migrate deploy + seed
PORT=4001 npm run dev     # http://localhost:4001
```

## What's in this folder

| Path | What it is |
|---|---|
| `starman-app/` | **The product.** Node 20 + Express + Prisma + PostgreSQL API with a vanilla-JS web client (`starman-app/web/`). This is the database-wired, working application. |
| `starman-app/infra/` | Approval-gated Bicep foundation for Azure Container Apps, PostgreSQL Flexible Server, Blob Storage, Key Vault, managed identity, and monitoring. |
| `design/Starman.html` | **The design prototype** ("Advisor OS"): the visual/UX north star. Runs standalone on local demo data — it is *not* connected to the database. `docker compose up` currently serves this file at `/` (see note below). |
| `design/screenshots/` | UI screenshots taken during design iterations. |
| `branding/` | Aspire source branding kit and logo reference assets. Implemented UI logo copies live in `design/assets/` and `starman-app/web/assets/`. |
| `docs/` | Business & planning documents — MVP definition, project map, build journey, version standard, audit response, funding package, go-live plan, data-residency guide, master prompt. Start with `docs/PROJECT-MAP.md`, `docs/MVP.md`, `docs/JOURNEY.md`, `docs/Starman-Version-History.md`, and `docs/Starman-Audit-Response-2026-07-14.md`. |
| `aspire_connectors/` | Python/FastAPI connector layer prototype (Meta leads, webhooks, CSV import). |
| `launch_starman.command` | One-click macOS launcher. |

## The two frontends (important)

There are deliberately **two** frontends right now:

1. **`starman-app/web/`** — functional, wired to the real API and database.
   Login, clients, households, leads, intake, tasks, documents, insurance,
   AI support, integrations, API keys — all persist to Postgres.
2. **`design/Starman.html`** — the polished design target (dark "Advisor OS"
   theme, planning engine). Demo data only.

`starman-app/docker-compose.yml` mounts the design prototype over `/`. To serve
the functional app instead, remove the design-file bind mount from the compose file.

## Accounts & roles

Single-firm model: the firm is created once by the database seed; there is no
self-serve "new firm" signup. New users register as **ADVISOR** accounts from the
login screen. Roles: `OWNER > ADVISOR > ASSISTANT > COMPLIANCE` (role changes are
an owner/database operation for now).

## Conventions

- **Folders**: lowercase (`design/`, `docs/`, `starman-app/`).
- **Docs**: `Starman-<Topic>.md` for business docs; `UPPERCASE.md` for
  repo-meta docs (README, MVP, JOURNEY, INVENTORY).
- **Versions**: keep one active Starman prototype file: `design/Starman.html`; track version numbers in its metadata + `docs/Starman-Version-History.md`, never in file names.
- Never commit or store real client data, credentials, or API keys in this tree.

## If this folder moves off local storage

Everything needed is inside this folder — the app, its Docker definition, the
latest design prototype, and the docs. After moving:

1. Install Docker Desktop on the new machine.
2. Run `launch_starman.command` (or `docker compose up --build` in `starman-app/`).
3. The database is a Docker volume (`starman_pgdata`) — it does **not** travel
   with the folder. Export/import it with `docker exec starman-db pg_dump ...`
   before decommissioning the old machine (see `docs/JOURNEY.md` § Data).
4. A known-good pg dump snapshot exists at `~/docker-backups/starman_pgdata.tar.gz`
   (outside this folder) and an export at `~/Downloads/starman4-export.json`.
