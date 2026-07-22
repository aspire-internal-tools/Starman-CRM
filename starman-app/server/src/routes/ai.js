// Starman AI Support — grounded on the org's OWN data (CRM records + uploaded
// knowledge documents). No web access: the model only sees the CONTEXT we build.
// Falls back to a deterministic, data-derived answer when no model is configured.
import { Router } from "express";
import { z } from "zod";
import { prisma, writeAudit } from "../db.js";
import { authRequired, roleRequired } from "../auth.js";
import { llmChat, llmConfigured, llmInfo } from "../services/llm.js";

const router = Router();
router.use(authRequired);

const GUARDRAILS = [
  "You are Starman, an AI assistant. Give direct, useful answers tailored to the user's specific situation.",
  "Always address the user's core question in the first 1-2 sentences. Prefer concrete, actionable steps over vague advice. When making a key recommendation, give one short reason.",
  "Use conversation history without recycling wording. Do not copy sentences or paragraphs from earlier replies unless the user explicitly asks for a restatement. When a topic comes up again, go deeper or reframe it for a different use case, format, or level of detail.",
  "When the current message is similar to earlier ones, vary at least two things: output format, examples, focus, strategy options, tradeoffs, pitfalls, or measurement angle. Do not start multiple answers in a row with the same phrase.",
  "Default to concise but information-dense responses: usually 1-3 short paragraphs or 5-9 bullets. Expand only when the task clearly needs a fuller blueprint or the user asks for more depth.",
  "Be clear, direct, and practical. Avoid filler phrases and unnecessary apologies. If unsure, say so briefly and provide a bounded guess or a way to verify.",
  "Never invent specific real-world data, logs, analytics, clients, numbers, or facts. Answer ONLY from the CONTEXT provided, which is the firm's own CRM data and uploaded documents. If the answer is not in the context, say you don't have that information.",
  "You are also advisor-grade AI support for a CIRO-regulated Canadian investment and insurance advisory firm. Surface regulatory and suitability concerns before revenue opportunities.",
  "Provide operational and workflow guidance only. Do NOT give final investment, tax, legal, or insurance advice, and do not recommend specific buy/sell actions. Defer final compliance decisions to the compliance officer.",
  "Assume actions must be documented in the firm's Canadian compliance workflow with clear, auditable rationale. When you use a fact, name the record it came from.",
].join(" ");

// Build a compact, relevant context from the org's data + knowledge docs.
async function buildContext(orgId, query) {
  const q = (query || "").toLowerCase();
  const [clients, leads, intakes, tasks, docs] = await Promise.all([
    prisma.client.findMany({ where: { orgId }, take: 200, orderBy: { updatedAt: "desc" } }),
    prisma.lead.findMany({ where: { orgId }, take: 100, orderBy: { createdAt: "desc" } }),
    prisma.intake.findMany({ where: { orgId }, take: 100, orderBy: { createdAt: "desc" } }),
    prisma.task.findMany({ where: { orgId }, take: 100, orderBy: { createdAt: "desc" } }),
    prisma.knowledgeDoc.findMany({ where: { orgId }, take: 50, orderBy: { createdAt: "desc" } }),
  ]);

  const hit = (s) => q && String(s || "").toLowerCase().split(/\W+/).some((w) => w.length > 3 && q.includes(w));
  const rank = (txt) => (hit(txt) ? 1 : 0);

  const clientLines = clients
    .map((c) => ({ c, r: rank(c.name) }))
    .sort((a, b) => b.r - a.r)
    .slice(0, 25)
    .map(({ c }) => `- CLIENT ${c.name} | KYC ${c.kycStatus}${c.kycDate ? " (" + c.kycDate.toISOString().slice(0, 10) + ")" : ""} | AUM $${Number(c.aum)} | risk ${c.risk || "-"} | ${c.email || "no email"} | next review ${c.nextReview ? c.nextReview.toISOString().slice(0, 10) : "-"}`);

  const leadLines = leads.slice(0, 20).map((l) => `- LEAD ${l.firstName} ${l.lastName || ""} | ${l.status} | source ${l.source || "-"} | est AUM $${Number(l.estimatedAum)}`);
  const intakeLines = intakes.slice(0, 20).map((i) => `- INTAKE ${i.name} | type ${i.type} | ${i.status} | source ${i.source || "-"}`);
  const taskLines = tasks.filter((t) => t.status !== "DONE").slice(0, 20).map((t) => `- TASK ${t.title} | ${t.status} | due ${t.dueDate ? t.dueDate.toISOString().slice(0, 10) : "-"}`);

  // Knowledge docs: prefer ones whose text overlaps the query; cap length.
  const scoredDocs = docs
    .map((d) => ({ d, r: rank(d.title) + rank(d.text.slice(0, 400)) }))
    .sort((a, b) => b.r - a.r)
    .slice(0, 4)
    .map(({ d }) => `### DOCUMENT: ${d.title}\n${d.text.slice(0, 1500)}`);

  const context = [
    `FIRM SNAPSHOT: ${clients.length} clients, ${leads.length} leads, ${intakes.length} intakes, ${tasks.length} tasks, ${docs.length} knowledge documents.`,
    clientLines.length ? "CLIENTS:\n" + clientLines.join("\n") : "",
    leadLines.length ? "LEADS:\n" + leadLines.join("\n") : "",
    intakeLines.length ? "INTAKES:\n" + intakeLines.join("\n") : "",
    taskLines.length ? "OPEN TASKS:\n" + taskLines.join("\n") : "",
    scoredDocs.length ? "KNOWLEDGE DOCUMENTS:\n" + scoredDocs.join("\n\n") : "",
  ].filter(Boolean).join("\n\n");

  return { context, counts: { clients: clients.length, leads: leads.length, intakes: intakes.length, tasks: tasks.length, docs: docs.length } };
}

// Deterministic fallback so the assistant is useful even with no model configured.
function simulatedAnswer(query, ctx) {
  const q = (query || "").toLowerCase();
  if (/overdue|kyc/.test(q)) {
    const overdue = (ctx.context.match(/CLIENT [^\n]*KYC OVERDUE[^\n]*/g) || []).slice(0, 10);
    return overdue.length ? "From your CRM, these look overdue/at-risk on KYC:\n" + overdue.join("\n") + "\n\n(Confirm with your compliance officer.)" : "I don't see any clients flagged OVERDUE for KYC in the current data.";
  }
  if (/how many|count|summary|overview/.test(q)) {
    const c = ctx.counts; return `Firm snapshot from your data: ${c.clients} clients, ${c.leads} leads, ${c.intakes} intakes, ${c.tasks} tasks, ${c.docs} knowledge documents.`;
  }
  return "AI Support is in simulated mode (no model connected yet), so I can only summarize from your data. Connect a model in the server settings (self-hosted, Azure Canada, or OpenAI) for full answers. Your question was: \"" + (query || "") + "\".";
}

const chatSchema = z.object({
  message: z.string().min(1),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).optional(),
});

router.post("/chat", async (req, res, next) => {
  try {
    const { message, history = [] } = chatSchema.parse(req.body);
    const { context, counts } = await buildContext(req.user.orgId, message);

    let answer, mode;
    if (llmConfigured()) {
      const messages = [
        { role: "system", content: GUARDRAILS },
        { role: "system", content: "CONTEXT (the firm's own data — answer only from this):\n\n" + context },
        ...history.slice(-8),
        { role: "user", content: message },
      ];
      try { answer = await llmChat(messages); mode = llmInfo().provider; }
      catch (e) { answer = simulatedAnswer(message, { context, counts }) + `\n\n(Note: model call failed — ${String(e.message).slice(0, 120)})`; mode = "simulated-fallback"; }
    } else {
      answer = simulatedAnswer(message, { context, counts });
      mode = "simulated";
    }

    await writeAudit({ orgId: req.user.orgId, actorId: req.user.id, action: "AI query", detail: message.slice(0, 80) });
    res.json({ answer, mode, grounding: counts, disclaimer: "Guidance only — verify before client advice or compliance decisions." });
  } catch (e) { next(e); }
});

router.get("/info", (_req, res) => res.json(llmInfo()));

// ---- Knowledge documents (the "files as sourcing" part) ----
router.get("/docs", async (req, res, next) => {
  try {
    const docs = await prisma.knowledgeDoc.findMany({ where: { orgId: req.user.orgId }, orderBy: { createdAt: "desc" }, select: { id: true, title: true, source: true, createdAt: true } });
    res.json({ data: docs });
  } catch (e) { next(e); }
});

const docSchema = z.object({ title: z.string().min(1), text: z.string().min(1), source: z.string().optional() });
router.post("/docs", roleRequired("OWNER", "ADVISOR", "COMPLIANCE"), async (req, res, next) => {
  try {
    const d = docSchema.parse(req.body);
    const doc = await prisma.knowledgeDoc.create({ data: { orgId: req.user.orgId, title: d.title, text: d.text.slice(0, 100000), source: d.source || "paste" } });
    await writeAudit({ orgId: req.user.orgId, actorId: req.user.id, action: "Knowledge doc added", entity: "KnowledgeDoc", entityId: doc.id, detail: doc.title });
    res.status(201).json({ data: { id: doc.id, title: doc.title, source: doc.source, createdAt: doc.createdAt } });
  } catch (e) { next(e); }
});

router.delete("/docs/:id", roleRequired("OWNER", "ADVISOR", "COMPLIANCE"), async (req, res, next) => {
  try {
    const doc = await prisma.knowledgeDoc.findFirst({ where: { id: req.params.id, orgId: req.user.orgId } });
    if (!doc) return res.status(404).json({ error: "Document not found" });
    await prisma.knowledgeDoc.delete({ where: { id: doc.id } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
