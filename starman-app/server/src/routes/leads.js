import { Router } from "express";
import { z } from "zod";
import { prisma, writeAudit, resolveAdvisorId } from "../db.js";
import { authRequired, roleRequired } from "../auth.js";

const router = Router();
router.use(authRequired);

const LEAD_STATUS = ["NEW","CONTACTED","QUALIFIED","DISCOVERY_BOOKED","PROPOSAL_SENT","WON","LOST","NURTURE"];
const PRIORITY = ["LOW","MED","HIGH"];

const leadSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  campaign: z.string().optional().nullable(),
  productInterest: z.array(z.string()).optional(),
  estimatedAum: z.coerce.number().min(0).optional(),
  status: z.enum(LEAD_STATUS).optional(),
  priority: z.enum(PRIORITY).optional(),
  advisorId: z.string().optional().nullable(),
  consent: z.boolean().optional(),
  nextFollowUp: z.coerce.date().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// GET /api/leads?status=&advisorId=&q=
router.get("/", async (req, res, next) => {
  try {
    const { status, advisorId, q } = req.query;
    const where = { orgId: req.user.orgId };
    if (status) where.status = status;
    if (advisorId) where.advisorId = advisorId;
    if (q) where.OR = [
      { firstName: { contains: String(q), mode: "insensitive" } },
      { lastName: { contains: String(q), mode: "insensitive" } },
      { email: { contains: String(q), mode: "insensitive" } },
    ];
    const leads = await prisma.lead.findMany({ where, orderBy: { createdAt: "desc" } });
    res.json({ data: leads });
  } catch (e) { next(e); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const lead = await prisma.lead.findFirst({ where: { id: req.params.id, orgId: req.user.orgId } });
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    res.json({ data: lead });
  } catch (e) { next(e); }
});

router.post("/", async (req, res, next) => {
  try {
    const d = leadSchema.parse(req.body);
    const advisorId = await resolveAdvisorId(req.user.orgId, d.advisorId, req.user.id);
    const lead = await prisma.lead.create({
      data: {
        orgId: req.user.orgId,
        firstName: d.firstName,
        lastName: d.lastName || null,
        email: d.email || null,
        phone: d.phone || null,
        source: d.source || null,
        campaign: d.campaign || null,
        productInterest: d.productInterest || [],
        estimatedAum: d.estimatedAum ?? 0,
        status: d.status || "NEW",
        priority: d.priority || "MED",
        advisorId,
        consent: d.consent ?? false,
        nextFollowUp: d.nextFollowUp || null,
        notes: d.notes || null,
      },
    });
    await writeAudit({ orgId: req.user.orgId, actorId: req.user.id, action: "Lead created", entity: "Lead", entityId: lead.id, detail: lead.firstName + " " + (lead.lastName || "") });
    await prisma.notification.create({
      data: { orgId: req.user.orgId, userId: req.user.id, title: "New lead created", message: `${lead.firstName} ${lead.lastName || ""}`.trim(), type: "lead", route: "leads", recordId: lead.id },
    });
    res.status(201).json({ data: lead });
  } catch (e) { next(e); }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.lead.findFirst({ where: { id: req.params.id, orgId: req.user.orgId } });
    if (!existing) return res.status(404).json({ error: "Lead not found" });
    const d = leadSchema.partial().parse(req.body);
    if (d.advisorId) d.advisorId = await resolveAdvisorId(req.user.orgId, d.advisorId, req.user.id);
    const lead = await prisma.lead.update({ where: { id: existing.id }, data: d });
    await writeAudit({ orgId: req.user.orgId, actorId: req.user.id, action: "Lead updated", entity: "Lead", entityId: lead.id });
    res.json({ data: lead });
  } catch (e) { next(e); }
});

router.delete("/:id", roleRequired("OWNER", "ADVISOR"), async (req, res, next) => {
  try {
    const existing = await prisma.lead.findFirst({ where: { id: req.params.id, orgId: req.user.orgId } });
    if (!existing) return res.status(404).json({ error: "Lead not found" });
    await prisma.lead.delete({ where: { id: existing.id } });
    await writeAudit({ orgId: req.user.orgId, actorId: req.user.id, action: "Lead deleted", entity: "Lead", entityId: existing.id });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
