# Services

Shared service adapters used by API routes.

## Current Service

| File | Purpose |
|---|---|
| `llm.js` | Provider-flexible OpenAI-compatible chat client for local, Azure, or OpenAI endpoints. |

## Rules

- Keep provider credentials server-side only.
- Do not call external services directly from browser code.
- Prefer small, testable service functions over embedding provider logic inside routes.

