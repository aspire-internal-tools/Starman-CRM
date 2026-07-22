# Design Prototype

This folder contains the latest Starman design source of truth.

## Version Standard

The prototype file name is **versionless**: `Starman.html`. The version is
tracked internally, not in the filename:

- Current file: `Starman.html`
- Metadata version: `2.0.0` (`<meta name="version">` inside the file)
- Product line: `2.x`
- Version log: `../docs/Starman-Version-History.md` (the internal record of
  every version change, including the 2026-07-17 reset from the old 5.x line)

Feature docs for the active prototype should say `Starman 2.x module`.

## Current File

| File | Purpose |
|---|---|
| `Starman.html` | Current single-file Starman Advisor OS prototype. It runs locally with demo/localStorage data and is also mounted by Docker as the visual front end at `http://localhost:4000`. |

The prototype's Data Residency page reflects the selected Azure Container Apps architecture in Canada Central. AWS and Google Cloud remain comparison options only; production details belong in `../docs/Starman-Azure-Architecture.md` and `../starman-app/infra/`.

## Subfolders

| Folder | Purpose |
|---|---|
| `screenshots/` | Visual screenshots captured during design and QA passes. |

## Working Rules

- Edit `Starman.html` for prototype/design changes.
- Do not create parallel or versioned HTML files in this folder — bump the
  `<meta name="version">` tag and add a line to
  `../docs/Starman-Version-History.md` instead.
- Do not put production secrets or real client data in this folder.
