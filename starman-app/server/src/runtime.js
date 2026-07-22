import { randomUUID as nodeRandomUUID } from "node:crypto";

const DEFAULT_JWT_SECRET = "dev-only-change-me-in-production";
const SAFE_CORRELATION_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export function validateRuntimeEnv(runtimeEnv) {
  const isProd = runtimeEnv.NODE_ENV === "production";
  const provider = (runtimeEnv.AI_PROVIDER || "simulated").toLowerCase();

  if (isProd) {
    if (!runtimeEnv.JWT_SECRET || runtimeEnv.JWT_SECRET === DEFAULT_JWT_SECRET || runtimeEnv.JWT_SECRET.length < 32) {
      throw new Error("Production configuration has an unsafe JWT_SECRET");
    }
    if (!runtimeEnv.DATABASE_URL?.includes("sslmode=require")) {
      throw new Error("Production DATABASE_URL must include sslmode=require");
    }
    if (provider === "openai") {
      throw new Error("AI_PROVIDER=openai is not approved for production Canadian-residency requirements");
    }
  }

  if (provider === "azure") {
    let endpoint;
    try {
      endpoint = new URL(runtimeEnv.AI_BASE_URL || "");
    } catch {
      throw new Error("Azure OpenAI endpoint is invalid");
    }
    if (endpoint.protocol !== "https:") throw new Error("Azure OpenAI endpoint must use HTTPS");
    if (!endpoint.hostname.endsWith(".openai.azure.com") || !endpoint.pathname.includes("/openai/deployments/")) {
      throw new Error("Azure OpenAI endpoint must identify an Azure deployment");
    }
    if (!runtimeEnv.AI_KEY) throw new Error("Azure OpenAI requires AI_KEY");
    if (isProd && runtimeEnv.AI_DEPLOYMENT_TYPE !== "regional") {
      throw new Error("Production Azure OpenAI requires an approved regional deployment");
    }
  }
}

export function parseTrustProxy(value) {
  if (value === undefined || value === "" || value === "false") return false;
  if (value === "true") return true;
  if (/^[1-9]\d*$/.test(value)) return Number.parseInt(value, 10);
  throw new Error("TRUST_PROXY must be false, true, or a positive hop count");
}

export function createRequestContext({
  randomUUID = nodeRandomUUID,
  now = Date.now,
  logger = (entry) => console.log(JSON.stringify(entry)),
} = {}) {
  return (req, res, next) => {
    const requestedId = req.headers?.["x-correlation-id"];
    const correlationId = typeof requestedId === "string" && SAFE_CORRELATION_ID.test(requestedId)
      ? requestedId
      : randomUUID();
    const startedAt = now();

    req.correlationId = correlationId;
    res.setHeader("X-Correlation-ID", correlationId);
    res.on("finish", () => {
      logger({
        event: "request.complete",
        correlationId,
        method: req.method,
        path: String(req.originalUrl || "/").split("?", 1)[0],
        status: res.statusCode,
        durationMs: Math.max(0, now() - startedAt),
      });
    });
    next();
  };
}

export function healthPayload() {
  return { ok: true, service: "starman-api" };
}

export async function readyPayload(databaseCheck) {
  try {
    await databaseCheck();
    return { status: 200, body: { ok: true, service: "starman-api" } };
  } catch {
    return {
      status: 503,
      body: { ok: false, service: "starman-api", dependency: "database" },
    };
  }
}

export function upstreamFailure(service, status) {
  return new Error(`${service} request failed (${status})`);
}
