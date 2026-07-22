// Documents — request/track client paperwork (KYC forms, transfers, e-sign, etc.).
import { Router } from "express";
import { z } from "zod";
import { prisma, writeAudit } from "../db.js";
import { authRequired } from "../auth.js";

const router = Router();
router.use(authRequired);

const STATUS = ["Requested", "Sent", "Viewed", "Signed", "Declined", "Expired"];
const PRIORITY = ["LOW", "MED", "HIGH"];

const docSchema = z.object({
  clientId: z.string().optional().nullable(),
  docType: z.string().min(1, "Document type is required"),
  status: z.enum(STATUS).optional(),
  dueDate: z.coerce.date().optional().nullable(),
  priority: z.enum(PRIORITY).optional(),
  delivery: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// GET /api/documents?clientId=&status=
router.get("/", async (req, res, next) => {
  try {
    const { clientId, status } = req.query;
    const where = { orgId: req.user.orgId };
    if (clientId) where.clientId = clientId;
    if (status) where.status = status;
    const docs = await prisma.document.findMany({
      where, orderBy: { createdAt: "desc" },
      include: { client: { select: { id: true, name: true } } },
    });
    res.json({ data: docs });
  } catch (e) { next(e); }
});

router.post("/", async (req, res, next) => {
  try {
    const d = docSchema.parse(req.body);
    const doc = await prisma.document.create({
      data: {
        orgId: req.user.orgId,
        clientId: d.clientId || null,
        docType: d.docType,
        status: d.status || "Requested",
        dueDate: d.dueDate || null,
        priority: d.priority || "MED",
        delivery: d.delivery || null,
        notes: d.notes || null,
      },
    });
    await writeAudit({ orgId: req.user.orgId, actorId: req.user.id, action: "Document requested", entity: "Document", entityId: doc.id, detail: doc.docType });
    res.status(201).json({ data: doc });
  } catch (e) { next(e); }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.document.findFirst({ where: { id: req.params.id, orgId: req.user.orgId } });
    if (!existing) return res.status(404).json({ error: "Document not found" });
    const d = docSchema.partial().parse(req.body);
    const doc = await prisma.document.update({ where: { id: existing.id }, data: d });
    await writeAudit({ orgId: req.user.orgId, actorId: req.user.id, action: "Document updated", entity: "Document", entityId: doc.id, detail: `${doc.docType} → ${doc.status}` });
    res.json({ data: doc });
  } catch (e) { next(e); }
});

export default router;
