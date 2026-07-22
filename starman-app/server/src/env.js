import dotenv from "dotenv";
import { parseTrustProxy, validateRuntimeEnv } from "./runtime.js";
dotenv.config();

validateRuntimeEnv(process.env);

function required(name, fallback) {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const env = {
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET", "dev-only-change-me-in-production"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "12h",
  port: parseInt(process.env.PORT || "4000", 10),
  webOrigin: process.env.WEB_ORIGIN || "http://localhost:4000",
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  isProd: process.env.NODE_ENV === "production",

  // AI Support — provider-flexible. Leave AI_BASE_URL blank to keep the free
  // built-in "simulated" answers (no model, no cost, no data leaves the app).
  //   • OpenAI:        AI_PROVIDER=openai  AI_BASE_URL=https://api.openai.com/v1                       AI_KEY=sk-...        AI_MODEL=gpt-4o-mini
  //   • Azure (Canada):AI_PROVIDER=azure   AI_BASE_URL=https://<res>.openai.azure.com/openai/deployments/<dep>  AI_KEY=...  AI_MODEL=<dep>  AI_API_VERSION=2024-06-01
  //   • Self-hosted:   AI_PROVIDER=local   AI_BASE_URL=http://host.docker.internal:11434/v1            (no key)             AI_MODEL=llama3.1
  ai: {
    provider: (process.env.AI_PROVIDER || "simulated").toLowerCase(),
    baseUrl: (process.env.AI_BASE_URL || "").replace(/\/$/, ""),
    key: process.env.AI_KEY || "",
    model: process.env.AI_MODEL || "gpt-4o-mini",
    apiVersion: process.env.AI_API_VERSION || "2024-06-01",
    deploymentType: process.env.AI_DEPLOYMENT_TYPE || "",
  },
};
