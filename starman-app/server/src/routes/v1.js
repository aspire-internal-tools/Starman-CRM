// Public integration API (v1). Authenticated with an org API key via the
// `x-api-key` header — designed for partner systems, Zapier, Meta webhooks, etc.
// Example:
//   curl -H "x-api-key: sk_live_..." https://your-host/api/v1/leads
//   curl -X POST -H "x-api-key: sk_live_..." -H "Content-Type: application/json" \
//        -d '{"firstName":"Sarah","source":"partner"}' https://your-host/api/v1/leads
import { Router } from "express";
import { z } from "zod";
import { prisma, writeAudit } from "../db.js";
import { sha256 } from "./apikeys.js";
import { apiLimiter } from "../rateLimit.js";

const router = Router();
router.use(apiLimiter);

async function apiKeyAuth(req, res, next) {
  const raw = req.headers["x-api-key"];
  if (!raw) return res.status(401).json({ error: "Missing x-api-key header" });
  const key = await prisma.apiKey.findFirst({ where: { hash: sha256(String(raw)), revoked: false } });
  if (!key) return res.status(401).json({ error: "Invalid or revoked API key" });
  prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  req.apiOrgId = key.orgId;
  req.apiScopes = key.scopes || [];
  next();
}
const scope = (s) => (req, res, next) => (req.apiScopes.includes(s) ? next() : res.status(403).json({ error: `Missing scope: ${s}` }));

router.use(apiKeyAuth);

router.get("/", (_req, res) => res.json({ service: "starman-public-api", version: "v1", endpoints: ["/leads", "/intakes"] }));

router.get("/leads", scope("leads:read"), async (req, res, next) => {
  try {
    const data = await prisma.lead.findMany({ where: { orgId: req.apiOrgId }, orderBy: { createdAt: "desc" }, take: 200 });
    res.json({ data });
  } catch (e) { next(e); }
});

const leadIn = z.object({
  firstName: z.string().min(1), lastName: z.string().optional(), email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(), source: z.string().optional(), estimatedAum: z.coerce.number().optional(),
});
router.post("/leads", scope("leads:write"), async (req, res, next) => {
  try {
    const d = leadIn.parse(req.body);
    const lead = await prisma.lead.create({
      data: { orgId: req.apiOrgId, firstName: d.firstName, lastName: d.lastName || null, email: d.email || null, phone: d.phone || null, source: d.source || "API", estimatedAum: d.estimatedAum ?? 0 },
    });
    await prisma.notification.create({ data: { orgId: req.apiOrgId, title: "New lead (API)", message: `${lead.firstName} ${lead.lastName || ""}`.trim(), type: "lead", route: "leads", recordId: lead.id } });
    await writeAudit({ orgId: req.apiOrgId, action: "Lead created via API", entity: "Lead", entityId: lead.id });
    res.status(201).json({ data: lead });
  } catch (e) { next(e); }
});

const intakeIn = z.object({ type: z.string().default("other"), name: z.string().min(1), email: z.string().email().optional().or(z.literal("")), phone: z.string().optional(), source: z.string().optional(), reason: z.string().optional() });
router.post("/intakes", scope("intakes:write"), async (req, res, next) => {
  try {
    const d = intakeIn.parse(req.body);
    const intake = await prisma.intake.create({ data: { orgId: req.apiOrgId, type: d.type, name: d.name, email: d.email || null, phone: d.phone || null, source: d.source || "API", reason: d.reason || null } });
    await prisma.notification.create({ data: { orgId: req.apiOrgId, title: "New intake (API)", message: intake.name, type: "intake", route: "intake", recordId: intake.id } });
    res.status(201).json({ data: intake });
  } catch (e) { next(e); }
});

export default router;
