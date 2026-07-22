// Provider-flexible LLM client. Talks to any OpenAI-compatible Chat Completions
// endpoint: OpenAI, Azure OpenAI (Canada region), or a self-hosted model (Ollama).
// If nothing is configured, llmConfigured() is false and callers fall back to a
// built-in deterministic answer (no model, no cost, no data leaves the app).
import { env } from "../env.js";
import { upstreamFailure } from "../runtime.js";

export function llmConfigured() {
  // A self-hosted/local model needs only a base URL; cloud providers also need a key.
  if (!env.ai.baseUrl) return false;
  if (env.ai.provider === "local") return true;
  return !!env.ai.key;
}

export function llmInfo() {
  return { provider: env.ai.provider, model: env.ai.model, configured: llmConfigured() };
}

export async function llmChat(messages, { temperature = 0.2, maxTokens = 700 } = {}) {
  if (!llmConfigured()) throw new Error("LLM not configured");

  const isAzure = env.ai.provider === "azure";
  const url = `${env.ai.baseUrl}/chat/completions` + (isAzure ? `?api-version=${env.ai.apiVersion}` : "");
  const headers = { "Content-Type": "application/json" };
  if (env.ai.key) headers[isAzure ? "api-key" : "Authorization"] = isAzure ? env.ai.key : `Bearer ${env.ai.key}`;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ model: env.ai.model, messages, temperature, max_tokens: maxTokens }),
  });
  if (!res.ok) {
    await res.arrayBuffer().catch(() => undefined);
    throw upstreamFailure(isAzure ? "Azure OpenAI" : "Model provider", res.status);
  }
  const json = await res.json();
  return json.choices?.[0]?.message?.content?.trim() || "";
}
