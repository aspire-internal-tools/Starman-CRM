import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import {
  createRequestContext,
  parseTrustProxy,
  readyPayload,
  upstreamFailure,
  validateRuntimeEnv,
} from "../src/runtime.js";

test("production rejects the development JWT secret", () => {
  assert.throws(
    () => validateRuntimeEnv({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://user:secret@db.internal/starman",
      JWT_SECRET: "dev-only-change-me-in-production",
      AI_PROVIDER: "simulated",
    }),
    /unsafe JWT_SECRET/,
  );
});

test("production requires an encrypted PostgreSQL connection", () => {
  assert.throws(
    () => validateRuntimeEnv({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://user:secret@db.internal/starman",
      JWT_SECRET: "a-strong-separate-production-secret-with-more-than-32-characters",
      AI_PROVIDER: "simulated",
    }),
    /sslmode=require/,
  );
});

test("Azure model configuration requires an HTTPS Azure deployment endpoint", () => {
  const common = {
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://user:secret@db.internal/starman?sslmode=require",
    JWT_SECRET: "a-strong-separate-production-secret-with-more-than-32-characters",
    AI_PROVIDER: "azure",
    AI_KEY: "secret",
    AI_DEPLOYMENT_TYPE: "regional",
  };

  assert.throws(
    () => validateRuntimeEnv({ ...common, AI_BASE_URL: "https://api.openai.com/v1" }),
    /Azure OpenAI endpoint/,
  );
  assert.throws(
    () => validateRuntimeEnv({ ...common, AI_BASE_URL: "http://example.openai.azure.com/openai/deployments/starman" }),
    /HTTPS/,
  );
  assert.doesNotThrow(() => validateRuntimeEnv({
    ...common,
    AI_BASE_URL: "https://starman-canada.openai.azure.com/openai/deployments/starman-regional",
  }));
  assert.throws(
    () => validateRuntimeEnv({
      ...common,
      AI_DEPLOYMENT_TYPE: "global-standard",
      AI_BASE_URL: "https://starman-canada.openai.azure.com/openai/deployments/starman-global",
    }),
    /regional deployment/,
  );
});

test("production rejects direct OpenAI processing", () => {
  assert.throws(
    () => validateRuntimeEnv({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://user:secret@db.internal/starman?sslmode=require",
      JWT_SECRET: "a-strong-separate-production-secret-with-more-than-32-characters",
      AI_PROVIDER: "openai",
      AI_BASE_URL: "https://api.openai.com/v1",
      AI_KEY: "secret",
    }),
    /not approved for production/,
  );
});

test("trust proxy parsing accepts only explicit booleans or hop counts", () => {
  assert.equal(parseTrustProxy(undefined), false);
  assert.equal(parseTrustProxy("false"), false);
  assert.equal(parseTrustProxy("true"), true);
  assert.equal(parseTrustProxy("1"), 1);
  assert.throws(() => parseTrustProxy("loopback, linklocal"), /TRUST_PROXY/);
});

test("request context replaces unsafe IDs and logs metadata without request content", () => {
  const entries = [];
  const middleware = createRequestContext({
    randomUUID: () => "11111111-1111-4111-8111-111111111111",
    now: (() => {
      const values = [1000, 1025];
      return () => values.shift();
    })(),
    logger: (entry) => entries.push(entry),
  });
  const req = {
    method: "POST",
    originalUrl: "/api/auth/login?email=private@example.ca",
    headers: { "x-correlation-id": "unsafe value with spaces" },
    body: { password: "must-not-be-logged" },
  };
  const res = new EventEmitter();
  res.statusCode = 401;
  res.setHeader = (name, value) => { res.headers = { ...(res.headers || {}), [name]: value }; };

  middleware(req, res, () => {});
  res.emit("finish");

  assert.equal(req.correlationId, "11111111-1111-4111-8111-111111111111");
  assert.equal(res.headers["X-Correlation-ID"], req.correlationId);
  assert.deepEqual(entries, [{
    event: "request.complete",
    correlationId: req.correlationId,
    method: "POST",
    path: "/api/auth/login",
    status: 401,
    durationMs: 25,
  }]);
  assert.equal(JSON.stringify(entries).includes("private@example.ca"), false);
  assert.equal(JSON.stringify(entries).includes("must-not-be-logged"), false);
});

test("readiness failures do not expose database errors", async () => {
  const result = await readyPayload(async () => {
    throw new Error("password authentication failed for secret-user");
  });

  assert.deepEqual(result, {
    status: 503,
    body: { ok: false, service: "starman-api", dependency: "database" },
  });
  assert.equal(JSON.stringify(result).includes("secret-user"), false);
});

test("upstream failures never copy provider response bodies", () => {
  const error = upstreamFailure("Azure OpenAI", 429, "provider response with client transcript");
  assert.equal(error.message, "Azure OpenAI request failed (429)");
  assert.equal(JSON.stringify(error).includes("client transcript"), false);
});
