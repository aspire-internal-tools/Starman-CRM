# Starman CRM - Version History

Last updated: 2026-07-22

## Version Standard

**Starman** is the codename for the CRM.

Version numbers are tracked **internally** — in this log and in the prototype's
HTML metadata — never in file names.

- Active prototype file: `design/Starman.html` (versionless filename, permanent)
- HTML title: `Starman — Advisor OS · Aspire CRM`
- HTML metadata: `<meta name="version" content="2.0.0">`
- Current product line: `2.x`

Current feature and module documents should use **Starman 2.x** unless they are
explicitly documenting an older historical artifact.

## How to bump a version

1. Edit `design/Starman.html` — update the `<meta name="version">` value.
2. Add a row to the Version Log below (date, version, summary).
3. Do **not** rename the file or create a parallel versioned copy.

## Source Of Truth

| Area | Version rule |
|---|---|
| Current design prototype | `design/Starman.html`, metadata version in this log |
| Current module docs | `Starman 2.x module` |
| Current production port | `Starman CRM`, aligned to the 2.x product line |
| Historical decisions | Summarize in `JOURNEY.md`; do not keep parallel prototype files in the working tree |
| Launch/pilot scope | Describe as `Starman 2.x pilot scope` unless a separate release number is formally assigned |

## Version Log

| Date | Version | Notes |
|---|---|---|
| 2026-07-22 | **2.2.0** | **Bulletin Board (shared ticket system)** added under Administration, between Meeting Intel and Data Vault. Advisors post improvements and recommendations, vote, and discuss; the President is an admin who can set each post's status (New, Under Review, Planned, In Progress, Done). New posts and status changes raise a notification, and every action is audit-logged. **Team accounts:** advisor/staff accounts now match the real Aspire team from aspireplanning.ca/our-team (Mark Zeltserman and Theresa Huang excluded per request); each has a profile (name, role, email, avatar) and per-user demo login using the existing public demo password. Default signed-in user is Jack Duzan; Andrew Lee is the admin. The rail footer now reflects the signed-in user. |
| 2026-07-22 | **2.1.0** | Prototype polish + resilience. **Login:** fixed a hang where a stalled/throttled intro animation (`requestAnimationFrame`) left users stranded on the login screen — added a wall-clock safety net, made the cinematic `finish()` idempotent, hardened `boot()` so the form always binds, and gave `doLogin` a guaranteed fall-through. **Branding:** rail lockup now stays the white variant in light mode (was invisible on the deep-green rail); collapsed rail crops to the "Aspire" mark instead of an unreadable squish; all four logo `<img>`s get an `onerror` text-wordmark fallback. **Accessibility:** light/dark contrast pass across the sidebar, KPI tiles, status pills, and muted/faint/gold text tiers so every view clears WCAG AA in both themes. **Demo data:** expanded the seeded client book from 12 → 40 (ids 13–40), with segment-appropriate AUM, referral chains, and a spread of KYC/review dates. |
| 2026-07-17 | **2.0.0** | Version reset: filename de-versioned (`Starman-5.0.html` → `Starman.html`); the old marketing-style 5.x numbering retired; versions now tracked only in HTML metadata + this log. Content is the former 5.0 "Advisor OS" prototype, unchanged. |
| 2026-07-15 | 5.0.0 (historical) | Post-Azure-incident recovery; prototype restored and re-mounted as the :4000 front end. |
| 2026-06-26 → 07-03 | 5.0.0 (historical) | "Advisor OS" reboot: new design language, Monte Carlo planning engine, constellation view (later removed). |
| 2026-06-01 → 06-03 | 3.x–4.x (historical) | Single-file prototype era; 4.x data later exported to `starman4-export.json`. |
| 2026-05-31 | 1.x–2.x (historical) | First prototypes. |

## Historical Lineage Policy

Older prototype files have been removed from the working tree so the CRM has one
active design file. The old 5.x line (May–July 2026) is recorded above and in
`JOURNEY.md`; active work should always point to `design/Starman.html`.

## Naming Rules

- Use `Starman` as the CRM codename.
- The prototype file is always `design/Starman.html` — no version in the filename.
- Use `Starman 2.x` for current modules, pilots, and production-port planning.
- Keep historical labels (3.0, 4.x, 5.0) only in narrative documentation when they explain prior decisions.
- Do not assign new standalone version numbers to individual feature docs unless the release plan explicitly creates one.
