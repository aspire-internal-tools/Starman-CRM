# Web Client

Vanilla JavaScript web client for the database-backed Starman app.

## Files

| File | Purpose |
|---|---|
| `index.html` | HTML shell for the functional app. |
| `app.js` | Single-page app views and UI behavior. |
| `api.js` | Fetch wrapper for server API calls. |

## Important Note

Docker currently mounts `../design/Starman-5.0.html` over `/web/index.html` so the latest prototype appears at `http://localhost:4000`.

To use this functional web client instead, remove the design-file bind mounts in `../docker-compose.yml`.

## Rules

- Route API calls through `api.js`.
- Do not store secrets in browser code.
- Keep production data in the server/database path, not localStorage.
