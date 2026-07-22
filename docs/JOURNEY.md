# Starman CRM — The Build Journey

*An intrapreneurship log. Last updated: 2026-07-17.*

## Timeline

### May 31, 2026 — Day zero
- First single-file prototype created, sketching what an Aspire-shaped CRM could look like.
- The project gets its Starman codename the same day.

### June 1–3 — Rapid single-file iteration
- The prototype expands quickly through several internal design milestones.
- The consolidated prototype becomes the reference point for the production port.

### June 4 — The production pivot
- `starman-app/` is born: a real Node 20 + Express + Prisma + PostgreSQL
  backend. Core files (`auth.js`, `db.js`, `leads.js`, `intakes.js`,
  `connectors.js`, `apikeys.js`, `v1.js`) all land this day.
- Decision locked in code: every query org-scoped; API keys stored as SHA-256
  hashes; Canada Life & Quadrus connectors hard-disabled.

### June 8 — Foundations hardened
- Env validation (`env.js`), AI Support route (grounded, provider-flexible,
  simulated by default), database seed, README, Docker setup.

### June 11 — Design milestone
- Major design iteration.
- Household grouping design notes (`Starman-Household-Suggestions-Design.md`).

### June 17–18 — Compliance posture
- Visual overhaul.
- `Starman-Canada-Data-Residency-Guide.md` — PIPEDA/data-residency strategy
  documented (Canadian-region Postgres, no US-hosted client data).

### June 22 — Getting serious
- `Starman-Go-Live-Plan-30-Days.md` — the 30-day launch plan.

### June 26 → July 3 — Starman 5.0 "Advisor OS"
- Complete design-language reboot: deep-space dark UI, glass panels,
  constellation book-of-business view, Monte Carlo planning engine (1,000 paths),
  animated KPIs.

### July 6–7 — Packaging the venture
- Meeting-intelligence feature spec written.
- `Starman-Funding-Package.docx` and `Starman-Master-Prompt.md` — the
  intrapreneurship pitch materials.
- One-click launcher (`launch_starman.command`) + Docker Compose finalized:
  anyone at the firm can run Starman with a double-click.

### July 8–9 — Backend feature completion
- Clients, Tasks, Households, Documents, and Dashboard API routes built —
  the production backend reaches feature parity with the core CRM concept.

### July 13 — 5.0 design update
- Files/integrations prompt iteration on the design prototype.

### July 14 — Hardening, completion, and organization (this pass)
- **Security**: cross-org `advisorId` validation on every assignable record;
  rate limiting on auth + public API; `helmet` headers; JWT algorithm pinned;
  RBAC made consistent across all routes.
- **Data model**: indexes added on every filtered foreign key; API-key hash
  made unique; schema migrated cleanly in place.
- **Insurance module**: the modeled-but-unreachable `InsuranceNeed` table got
  its API route and UI.
- **Frontend catch-up**: the database-wired web client gained Command Centre,
  Clients, Households, Tasks, Documents, and Insurance views — full parity
  with the backend, verified end-to-end in the browser against Postgres.
- **Single-firm auth**: "new firm" self-signup removed; new registrations join
  the firm as ADVISOR accounts. Demo credentials removed from the login screen.
- **This reorganization**: `design/` and `docs/` structure, naming
  conventions, README, MVP definition, and this journey log — so the whole
  venture is legible to anyone who opens the folder.

### July 16–17 — Recovery and the version reset
- July 16: diagnosed and fixed the "missing frontend": Docker.app had been moved
  to /Applications (breaking the `/usr/local/bin/docker` symlink) and the old
  `starman-server` container held a bind mount to the prototype's pre-reorg
  path. Recreating the container restored :4000. No file was ever lost.
- July 17: **version reset**. The prototype filename is now permanent and
  versionless — `design/Starman.html` — and the old marketing-style 5.x
  numbering was retired in favour of **2.0.0**, tracked only in the file's
  `<meta name="version">` tag and the version log in
  `docs/Starman-Version-History.md`. Lesson: version numbers in filenames
  break bind mounts, links, and docs every time they change; internal
  metadata + a log never does.

## Data

- Live database: Docker volume `starman_pgdata` (does not travel with this folder).
- Snapshot: `~/docker-backups/starman_pgdata.tar.gz`.
- JSON export from the 4.x era: `~/Downloads/starman4-export.json`.
- To back up: `docker exec starman-db pg_dump -U starman starman > starman-$(date +%F).sql`

## Lessons captured along the way

1. **Prototype in one file, port deliberately.** The single-HTML era (May 31 –
   Jun 3) found the product shape fast; the June 4 pivot to a real backend kept
   only what earned its place.
2. **Compliance is a feature, not a checkbox.** Locked carriers stay locked in
   code, not config. Data residency was documented before go-live, not after.
3. **Keep the design north star separate from the working software.** 5.0 pushes
   the vision; `starman-app/web` ships the function. Merge is a roadmap item,
   not a blocker.
4. **Snapshot before surgery.** Every risky change got a dated backup first —
   which is why the whole history can be told from the filesystem.
