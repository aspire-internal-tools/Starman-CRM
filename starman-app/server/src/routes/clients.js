// Clients — the core CRM record. Org-scoped, JWT-authed. Full CRUD plus nested
// accounts, notes, and KYC updates. Mirrors the field names in prisma/schema.prisma.
import { Router } from "express";
import { z } from "zod";
import { prisma, writeAudit, resolveAdvisorId } from "../db.js";
import { authRequired, roleRequired } from "../auth.js";

const router = Router();
router.use(authRequired);

const KYC = ["CURRENT", "DUE_SOON", "OVERDUE", "IN_PROGRESS"];
const PRIORITY = ["LOW", "MED", "HIGH"];

const clientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  segment: z.string().optional().nullable(),
  risk: z.string().optional().nullable(),
  horizon: z.string().optional().nullable(),
  aum: z.coerce.number().min(0).optional(),
  kycStatus: z.enum(KYC).optional(),
  kycDate: z.coerce.date().optional().nullable(),
  nextReview: z.coerce.date().optional().nullable(),
  householdId: z.string().optional().nullable(),
  advisorId: z.string().optional().nullable(),
});

// GET /api/clients?q=&kyc=&segment=&advisorId=&sort=name|aum|nextReview&dir=asc|desc&take=&skip=
router.get("/", async (req, res, next) => {
  try {
    const { q, kyc, segment, advisorId, sort, dir } = req.query;
    const where = { orgId: req.user.orgId };
    if (kyc) where.kycStatus = kyc;
    if (segment) where.segment = segment;
    if (advisorId) where.advisorId = advisorId;
    if (q) where.OR = [
      { name: { contains: String(q), mode: "insensitive" } },
      { email: { contains: String(q), mode: "insensitive" } },
      { city: { contains: String(q), mode: "insensitive" } },
    ];
    const sortField = ["name", "aum", "nextReview", "updatedAt", "kycDate"].includes(String(sort)) ? String(sort) : "name";
    const orderBy = { [sortField]: dir === "desc" ? "desc" : "asc" };
    const take = Math.min(parseInt(String(req.query.take || "200"), 10) || 200, 500);
    const skip = parseInt(String(req.query.skip || "0"), 10) || 0;
    const [data, total] = await Promise.all([
      prisma.client.findMany({ where, orderBy, take, skip, include: { household: { select: { id: true, name: true } }, _count: { select: { accounts: true, documents: true } } } }),
      prisma.client.count({ where }),
    ]);
    res.json({ data, total });
  } catch (e) { next(e); }
});

// GET /api/clients/:id — full record with children.
router.get("/:id", async (req, res, next) => {
  try {
    const client = await prisma.client.findFirst({
      where: { id: req.params.id, orgId: req.user.orgId },
      include: {
        accounts: true,
        household: true,
        notes: { orderBy: { createdAt: "desc" }, take: 50 },
        documents: { orderBy: { createdAt: "desc" }, take: 50 },
        kycUpdates: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
    if (!client) return res.status(404).json({ error: "Client not found" });
    res.json({ data: client });
  } catch (e) { next(e); }
});

router.post("/", async (req, res, next) => {
  try {
    const d = clientSchema.parse(req.body);
    const advisorId = await resolveAdvisorId(req.user.orgId, d.advisorId, req.user.id);
    const client = await prisma.client.create({
      data: {
        orgId: req.user.orgId,
        name: d.name,
        email: d.email || null,
        phone: d.phone || null,
        city: d.city || null,
        province: d.province || null,
        segment: d.segment || "Retail",
        risk: d.risk || "Balanced",
        horizon: d.horizon || null,
        aum: d.aum ?? 0,
        kycStatus: d.kycStatus || "IN_PROGRESS",
        kycDate: d.kycDate || null,
        nextReview: d.nextReview || null,
        householdId: d.householdId || null,
        advisorId,
      },
    });
    await writeAudit({ orgId: req.user.orgId, actorId: req.user.id, action: "Client created", entity: "Client", entityId: client.id, detail: client.name });
    res.status(201).json({ data: client });
  } catch (e) { next(e); }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.client.findFirst({ where: { id: req.params.id, orgId: req.user.orgId } });
    if (!existing) return res.status(404).json({ error: "Client not found" });
    const d = clientSchema.partial().parse(req.body);
    if (d.advisorId) d.advisorId = await resolveAdvisorId(req.user.orgId, d.advisorId, req.user.id);
    const client = await prisma.client.update({ where: { id: existing.id }, data: d });
    await writeAudit({ orgId: req.user.orgId, actorId: req.user.id, action: "Client updated", entity: "Client", entityId: client.id });
    res.json({ data: client });
  } catch (e) { next(e); }
});

// Deleting a client is a principal-level action.
router.delete("/:id", roleRequired("OWNER"), async (req, res, next) => {
  try {
    const existing = await prisma.client.findFirst({ where: { id: req.params.id, orgId: req.user.orgId } });
    if (!existing) return res.status(404).json({ error: "Client not found" });
    await prisma.client.delete({ where: { id: existing.id } });
    await writeAudit({ orgId: req.user.orgId, actorId: req.user.id, action: "Client deleted", entity: "Client", entityId: existing.id, detail: existing.name });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// --- Nested: accounts -------------------------------------------------------
const accountSchema = z.object({ type: z.string().min(1), balance: z.coerce.number().optional() });
router.post("/:id/accounts", async (req, res, next) => {
  try {
    const client = await prisma.client.findFirst({ where: { id: req.params.id, orgId: req.user.orgId } });
    if (!client) return res.status(404).json({ error: "Client not found" });
    const d = accountSchema.parse(req.body);
    const account = await prisma.account.create({ data: { clientId: client.id, type: d.type, balance: d.balance ?? 0 } });
    await writeAudit({ orgId: req.user.orgId, actorId: req.user.id, action: "Account added", entity: "Account", entityId: account.id, detail: `${d.type} for ${client.name}` });
    res.status(201).json({ data: account });
  } catch (e) { next(e); }
});

// --- Nested: notes ----------------------------------------------------------
const noteSchema = z.object({ body: z.string().min(1), category: z.string().optional() });
router.post("/:id/notes", async (req, res, next) => {
  try {
    const client = await prisma.client.findFirst({ where: { id: req.params.id, orgId: req.user.orgId } });
    if (!client) return res.status(404).json({ error: "Client not found" });
    const d = noteSchema.parse(req.body);
    const note = await prisma.note.create({ data: { orgId: req.user.orgId, clientId: client.id, category: d.category || "General", body: d.body, authorId: req.user.id } });
    await writeAudit({ orgId: req.user.orgId, actorId: req.user.id, action: "Note added", entity: "Note", entityId: note.id, detail: client.name });
    res.status(201).json({ data: note });
  } catch (e) { next(e); }
});

// --- Nested: KYC updates ----------------------------------------------------
// Records a KYC review AND advances the client's headline kycStatus/kycDate.
const kycSchema = z.object({
  status: z.enum(KYC).optional(),
  reviewDate: z.coerce.date().optional().nullable(),
  risk: z.string().optional().nullable(),
  horizon: z.string().optional().nullable(),
  knowledge: z.string().optional().nullable(),
  liquidity: z.string().optional().nullable(),
  lifeChanges: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  complianceReview: z.boolean().optional(),
});
router.post("/:id/kyc", async (req, res, next) => {
  try {
    const client = await prisma.client.findFirst({ where: { id: req.params.id, orgId: req.user.orgId } });
    if (!client) return res.status(404).json({ error: "Client not found" });
    const d = kycSchema.parse(req.body);
    const kyc = await prisma.kycUpdate.create({ data: { orgId: req.user.orgId, clientId: client.id, ...d } });
    // Advance the headline KYC state on the client so dashboards stay accurate.
    await prisma.client.update({
      where: { id: client.id },
      data: {
        kycStatus: d.status || "CURRENT",
        kycDate: d.reviewDate || new Date(),
        ...(d.risk ? { risk: d.risk } : {}),
        ...(d.horizon ? { horizon: d.horizon } : {}),
      },
    });
    await writeAudit({ orgId: req.user.orgId, actorId: req.user.id, action: "KYC updated", entity: "Client", entityId: client.id, detail: `${client.name} → ${d.status || "CURRENT"}` });
    res.status(201).json({ data: kyc });
  } catch (e) { next(e); }
});

export default router;
