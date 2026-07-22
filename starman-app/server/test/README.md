# Server Tests

Node built-in test-runner coverage for Starman server behavior.

`runtime.test.js` verifies production secret and TLS gates, Azure regional model configuration, trusted-proxy parsing, metadata-only correlation logging, generic database readiness failures, and redacted model-provider errors.

Run from `starman-app/server/`:

```bash
npm test
```

Add a failing test before changing server behavior. Tests must not contain real client information or production credentials.
