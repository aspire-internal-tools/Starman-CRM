// Households — group related clients (family / entity) and roll up AUM.
import { Router } from "express";
import { z } from "zod";
import { prisma, writeAudit } from "../db.js";
import { authRequired } from "../auth.js";

const router = Router();
router.use(authRequired);

// GET /api/households — each with its member clients and a rolled-up AUM total.
router.get("/", async (req, res, next) => {
  try {
    const households = await prisma.household.findMany({
      where: { orgId: req.user.orgId },
      orderBy: { name: "asc" },
      include: { clients: { select: { id: true, name: true, aum: true, kycStatus: true, risk: true } } },
    });
    const data = households.map((h) => ({
      ...h,
      memberCount: h.clients.length,
      totalAum: h.clients.reduce((s, c) => s + Number(c.aum || 0), 0),
    }));
    res.json({ data });
  } catch (e) { next(e); }
});

const householdSchema = z.object({ name: z.string().min(1, "Name is required"), clientIds: z.array(z.string()).optional() });

router.post("/", async (req, res, next) => {
  try {
    const d = householdSchema.parse(req.body);
    const household = await prisma.household.create({ data: { orgId: req.user.orgId, name: d.name } });
    if (d.clientIds?.length) {
      // Only re-parent clients that belong to this org.
      await prisma.client.updateMany({ where: { id: { in: d.clientIds }, orgId: req.user.orgId }, data: { householdId: household.id } });
    }
    await writeAudit({ orgId: req.user.orgId, actorId: req.user.id, action: "Household created", entity: "Household", entityId: household.id, detail: household.name });
    res.status(201).json({ data: household });
  } catch (e) { next(e); }
});

// Attach a client to a household (org-scoped on both sides).
router.post("/:id/clients/:clientId", async (req, res, next) => {
  try {
    const [household, client] = await Promise.all([
      prisma.household.findFirst({ where: { id: req.params.id, orgId: req.user.orgId } }),
      prisma.client.findFirst({ where: { id: req.params.clientId, orgId: req.user.orgId } }),
    ]);
    if (!household || !client) return res.status(404).json({ error: "Household or client not found" });
    await prisma.client.update({ where: { id: client.id }, data: { householdId: household.id } });
    await writeAudit({ orgId: req.user.orgId, actorId: req.user.id, action: "Client added to household", entity: "Household", entityId: household.id, detail: client.name });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Detach a client from its household.
router.delete("/:id/clients/:clientId", async (req, res, next) => {
  try {
    const client = await prisma.client.findFirst({ where: { id: req.params.clientId, orgId: req.user.orgId, householdId: req.params.id } });
    if (!client) return res.status(404).json({ error: "Client not in this household" });
    await prisma.client.update({ where: { id: client.id }, data: { householdId: null } });
    await writeAudit({ orgId: req.user.orgId, actorId: req.user.id, action: "Client removed from household", entity: "Household", entityId: req.params.id, detail: client.name });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
