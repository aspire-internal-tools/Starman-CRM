import { Router } from "express";
import { z } from "zod";
import { prisma, writeAudit, resolveAdvisorId } from "../db.js";
import { authRequired } from "../auth.js";

const router = Router();
router.use(authRequired);

const INTAKE_STATUS = ["NEW","NEEDS_REVIEW","IN_PROGRESS","WAITING_ON_CLIENT","CONVERTED","ARCHIVED"];
const PRIORITY = ["LOW","MED","HIGH"];

const intakeSchema = z.object({
  type: z.string().min(1),
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  reason: z.string().optional().nullable(),
  priority: z.enum(PRIORITY).optional(),
  status: z.enum(INTAKE_STATUS).optional(),
  advisorId: z.string().optional().nullable(),
  consent: z.boolean().optional(),
  payload: z.any().optional(),
});

router.get("/", async (req, res, next) => {
  try {
    const where = { orgId: req.user.orgId };
    if (req.query.status) where.status = req.query.status;
    if (req.query.type) where.type = req.query.type;
    const intakes = await prisma.intake.findMany({ where, orderBy: { createdAt: "desc" } });
    res.json({ data: intakes });
  } catch (e) { next(e); }
});

router.post("/", async (req, res, next) => {
  try {
    const d = intakeSchema.parse(req.body);
    const advisorId = await resolveAdvisorId(req.user.orgId, d.advisorId, req.user.id);
    const intake = await prisma.intake.create({
      data: {
        orgId: req.user.orgId, type: d.type, name: d.name, email: d.email || null, phone: d.phone || null,
        source: d.source || null, reason: d.reason || null, priority: d.priority || "MED",
        status: d.status || "NEW", advisorId, consent: d.consent ?? false,
        payload: d.payload ?? undefined,
      },
    });
    await writeAudit({ orgId: req.user.orgId, actorId: req.user.id, action: "Intake created", entity: "Intake", entityId: intake.id, detail: intake.name });
    await prisma.notification.create({
      data: { orgId: req.user.orgId, userId: req.user.id, title: "New intake created", message: intake.name, type: "intake", route: "intake", recordId: intake.id },
    });
    res.status(201).json({ data: intake });
  } catch (e) { next(e); }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.intake.findFirst({ where: { id: req.params.id, orgId: req.user.orgId } });
    if (!existing) return res.status(404).json({ error: "Intake not found" });
    const d = intakeSchema.partial().parse(req.body);
    if (d.advisorId) d.advisorId = await resolveAdvisorId(req.user.orgId, d.advisorId, req.user.id);
    const intake = await prisma.intake.update({ where: { id: existing.id }, data: d });
    await writeAudit({ orgId: req.user.orgId, actorId: req.user.id, action: "Intake updated", entity: "Intake", entityId: intake.id, detail: intake.status });
    res.json({ data: intake });
  } catch (e) { next(e); }
});

// Convert an intake into a Client (kept, status -> CONVERTED). Nothing is deleted.
router.post("/:id/convert", async (req, res, next) => {
  try {
    const intake = await prisma.intake.findFirst({ where: { id: req.params.id, orgId: req.user.orgId } });
    if (!intake) return res.status(404).json({ error: "Intake not found" });
    const client = await prisma.client.create({
      data: {
        orgId: req.user.orgId, name: intake.name, email: intake.email, phone: intake.phone,
        segment: "Retail", risk: "Balanced", kycStatus: "IN_PROGRESS", advisorId: intake.advisorId,
      },
    });
    await prisma.intake.update({ where: { id: intake.id }, data: { status: "CONVERTED" } });
    await writeAudit({ orgId: req.user.orgId, actorId: req.user.id, action: "Intake converted to client", entity: "Client", entityId: client.id, detail: client.name });
    await prisma.notification.create({
      data: { orgId: req.user.orgId, userId: req.user.id, title: "Client added", message: `${client.name} (converted from intake)`, type: "client", route: "clients", recordId: client.id },
    });
    res.status(201).json({ data: { client, intakeStatus: "CONVERTED" } });
  } catch (e) { next(e); }
});

export default router;
