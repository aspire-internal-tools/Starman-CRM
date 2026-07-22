// Insurance needs — coverage gaps tracked per client, org-scoped and JWT-authed.
import { Router } from "express";
import { z } from "zod";
import { prisma, writeAudit, resolveAdvisorId } from "../db.js";
import { authRequired, roleRequired } from "../auth.js";

const router = Router();
router.use(authRequired);

const insuranceSchema = z.object({
  clientName: z.string().min(1, "Client name is required"),
  coverage: z.array(z.string()).optional(),
  amount: z.coerce.number().min(0).optional(),
  existing: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  advisorId: z.string().optional().nullable(),
});

// GET /api/insurance?advisorId=
router.get("/", async (req, res, next) => {
  try {
    const { advisorId } = req.query;
    const where = { orgId: req.user.orgId };
    if (advisorId) where.advisorId = advisorId;
    const data = await prisma.insuranceNeed.findMany({ where, orderBy: { createdAt: "desc" } });
    res.json({ data });
  } catch (e) { next(e); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const need = await prisma.insuranceNeed.findFirst({ where: { id: req.params.id, orgId: req.user.orgId } });
    if (!need) return res.status(404).json({ error: "Insurance need not found" });
    res.json({ data: need });
  } catch (e) { next(e); }
});

router.post("/", async (req, res, next) => {
  try {
    const d = insuranceSchema.parse(req.body);
    const advisorId = await resolveAdvisorId(req.user.orgId, d.advisorId, req.user.id);
    const need = await prisma.insuranceNeed.create({
      data: {
        orgId: req.user.orgId,
        clientName: d.clientName,
        coverage: d.coverage || [],
        amount: d.amount ?? 0,
        existing: d.existing || null,
        notes: d.notes || null,
        advisorId,
      },
    });
    await writeAudit({ orgId: req.user.orgId, actorId: req.user.id, action: "Insurance need created", entity: "InsuranceNeed", entityId: need.id, detail: need.clientName });
    res.status(201).json({ data: need });
  } catch (e) { next(e); }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.insuranceNeed.findFirst({ where: { id: req.params.id, orgId: req.user.orgId } });
    if (!existing) return res.status(404).json({ error: "Insurance need not found" });
    const d = insuranceSchema.partial().parse(req.body);
    if (d.advisorId) d.advisorId = await resolveAdvisorId(req.user.orgId, d.advisorId, req.user.id);
    const need = await prisma.insuranceNeed.update({ where: { id: existing.id }, data: d });
    await writeAudit({ orgId: req.user.orgId, actorId: req.user.id, action: "Insurance need updated", entity: "InsuranceNeed", entityId: need.id });
    res.json({ data: need });
  } catch (e) { next(e); }
});

router.delete("/:id", roleRequired("OWNER", "ADVISOR"), async (req, res, next) => {
  try {
    const existing = await prisma.insuranceNeed.findFirst({ where: { id: req.params.id, orgId: req.user.orgId } });
    if (!existing) return res.status(404).json({ error: "Insurance need not found" });
    await prisma.insuranceNeed.delete({ where: { id: existing.id } });
    await writeAudit({ orgId: req.user.orgId, actorId: req.user.id, action: "Insurance need deleted", entity: "InsuranceNeed", entityId: existing.id, detail: existing.clientName });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
