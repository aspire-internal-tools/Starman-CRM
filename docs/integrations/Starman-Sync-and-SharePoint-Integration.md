# Starman: Multi-User Sync and SharePoint Integration Design

**Status:** Design document (not yet built). Describes how Starman moves from the
localStorage prototype to a live, multi-user system, and how it would sync
document files to SharePoint on a schedule.

**Audience:** Jack (product owner), any advisor stakeholder, and any AI or
developer implementing this later.

---

## 1. The problem this solves

The design prototype (`design/Starman.html`) saves everything to browser
**localStorage**. That is private to each browser on each device, so nothing is
shared: if one person creates a client, no one else sees it, and the same person
on a second device sees a different copy. GitHub Pages cannot fix this, because it
is static, read-only hosting with no database.

To get real multi-user sync, records must live in one **shared database** that all
devices read and write through a server. Starman already has this half built: the
`starman-app/` backend (Node, Express, Prisma, PostgreSQL).

This document covers two distinct jobs that are often confused:

1. **Live record sync** across users (client data), handled by PostgreSQL.
2. **Periodic file sync** to SharePoint (documents and exports), handled by a
   scheduled backend job.

---

## 2. Target architecture

```
Advisor A ─┐
Advisor B ─┼──▶  Starman API (starman-app)  ◀──▶  PostgreSQL  (shared source of truth)
You (phone)┘                                          │
                                                      │  scheduled sync worker
                                                      ▼  (reads "what changed")
                                               Microsoft Graph API
                                                      ▼
                                               SharePoint (document library)
```

- **PostgreSQL** is the single source of truth for records (clients, households,
  KYC, notes, tasks, tickets, audit). Deploy in a Canadian region for PIPEDA.
- **Starman API** mediates every read and write, and holds all secrets
  server-side. No credential ever reaches the browser.
- **Sync worker** is a scheduled job that pushes files to SharePoint.

---

## 3. Live record sync across users

Because there is one shared database, users do not sync copies to each other; they
all look at the same data through the API.

- **Default behaviour (already how the app is built):** a user sees another user's
  change the next time their screen loads data from the API (page load, navigation,
  or an explicit refresh). This covers almost all real use.
- **Instant live updates (optional add-on):** to have a new client appear on
  another screen with no refresh, add short polling or WebSockets. This is an
  incremental feature, not a rebuild.

Recommendation: ship with refresh-based sync first. Add live updates only for the
few screens where it clearly helps (for example the Command Centre or the Bulletin
Board).

---

## 4. Recognising changes (change detection)

Two mechanisms, both already present or trivial to add:

- **Audit log.** The app writes an `AuditLog` row on every create, update, login,
  convert, connector, and AI action (`writeAudit`). This already records what
  changed, when, and by whom.
- **`updatedAt` timestamps.** Each record carries a last-updated time (Prisma
  supports this directly).

Together these answer the only question the sync job needs: "which records changed
since the last successful run?" That is standard change data capture.

---

## 5. SharePoint file sync (the periodic push)

A scheduled backend job (the sync worker) runs on a cadence, for example hourly or
nightly, and does three things:

1. **Detect changes.** Query the database for records changed since the last run
   (using the audit log or `updatedAt`).
2. **Prepare files.** Generate or gather the documents for those records, for
   example a client summary PDF, a KYC package, or a review export.
3. **Upload.** Push those files to a SharePoint document library through the
   **Microsoft Graph API**, writing each to a predictable folder path (for example
   `/Clients/{lastname-firstname}/`).

This is server-to-server. The backend holds the SharePoint credentials, which is
exactly why this works where the static prototype could not.

It fits the existing connector pattern: SharePoint becomes one more connector
alongside Meta, Webhook, CSV, and DocuSign (see `server/src/routes/connectors.js`
and `aspire_connectors/`).

---

## 6. Two design choices

### Direction: one-way vs two-way

- **One-way (CRM to SharePoint), recommended.** Simple, safe, and matches the
  intent of "upload and push to SharePoint to sync files." The CRM stays the
  source of truth; SharePoint is a mirror for document management and backup.
- **Two-way (also pull edits back).** Much harder because of conflicts: if a record
  changed in both places, which wins? Only do this if there is a real need, and
  only with an explicit conflict-resolution rule (for example CRM always wins).

### Cadence: periodic vs event-driven

- **Periodic (a cron every X minutes or hours), recommended to start.** Predictable
  and simple.
- **Event-driven (push the instant a record changes).** Lower latency, more moving
  parts. Add later if needed.

---

## 7. Authentication and security

- Register an application in **Microsoft Entra ID (Azure AD)** for the firm's
  tenant. Grant it least-privilege Graph permissions (for example
  `Sites.Selected` scoped to one document library, not tenant-wide access).
- Store the client secret or certificate in a **secrets manager** (Azure Key
  Vault), keyed by connector, never in the database in plaintext and never in the
  browser. This matches the existing rule for connector secrets.
- Log every sync run to the audit trail (started, records processed, files
  uploaded, failures).

---

## 8. Data residency and compliance

- Keep PostgreSQL in a **Canadian region** (the docs target Azure Canada Central).
- Set the SharePoint tenant or the target site's residency to **Canada**.
- Push only what belongs in document storage. Sensitive records stay governed in
  the Canadian-region database, not duplicated to a location with weaker controls.
- No real client data flows through any of this until the pilot gates in
  `docs/compliance/Starman-Audit-Response-2026-07-14.md` pass. Until then, the public
  prototype stays demo-only and the sync worker runs against synthetic data.

---

## 9. Where this lives in the codebase

- **Records and API:** `starman-app/server/` (already built).
- **Connector framework:** `server/src/routes/connectors.js`, plus the Python
  connector prototype in `aspire_connectors/`.
- **Sync worker:** a new scheduled process (a cron container, an Azure Function on
  a timer trigger, or a worker in the same app) that reads change data and calls
  Graph. Keep it separate from request handling so a slow sync never blocks the UI.
- **Change detection:** the existing `AuditLog` plus `updatedAt` columns.

---

## 10. Suggested rollout

1. **Prove sync locally.** Run `starman-app` against a local or free managed
   PostgreSQL and confirm two browser windows share data.
2. **Host it.** Deploy the API plus a managed PostgreSQL in a Canadian region.
   Add real logins.
3. **Add the SharePoint connector.** One-way, periodic, synthetic data first.
4. **Pilot gates.** Pass the audit-response gates before any real client data.
5. **Optional live updates.** Add polling or WebSockets to the screens that
   benefit most.

---

## Summary

- Multi-user sync comes from one shared **PostgreSQL** database behind the Starman
  API, not from copies syncing to each other.
- The system already **recognises changes** through the audit log and timestamps.
- A scheduled **sync worker** can push files to **SharePoint** via the Graph API,
  one-way and periodic to start, with secrets held server-side.
- Keep records in a Canadian-region database, use SharePoint for document files,
  and hold real client data only after the pilot gates pass.
