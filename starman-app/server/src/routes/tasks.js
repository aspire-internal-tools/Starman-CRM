// Tasks — advisor to-dos, org-scoped and JWT-authed.
import { Router } from "express";
import { z } from "zod";
import { prisma, writeAudit, resolveAdvisorId } from "../db.js";
import { authRequired } from "../auth.js";

const router = Router();
router.use(authRequired);

const STATUS = ["OPEN", "IN_PROGRESS", "DONE"];
const PRIORITY = ["LOW", "MED", "HIGH"];

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  clientId: z.string().optional().nullable(),
  advisorId: z.string().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  priority: z.enum(PRIORITY).optional(),
  status: z.enum(STATUS).optional(),
  notes: z.string().optional().nullable(),
});

// GET /api/tasks?status=&advisorId=&clientId=&overdue=1
router.get("/", async (req, res, next) => {
  try {
    const { status, advisorId, clientId, overdue } = req.query;
    const where = { orgId: req.user.orgId };
    if (status) where.status = status;
    if (advisorId) where.advisorId = advisorId;
    if (clientId) where.clientId = clientId;
    if (overdue) { where.status = { not: "DONE" }; where.dueDate = { lt: new Date() }; }
    const tasks = await prisma.task.findMany({ where, orderBy: [{ status: "asc" }, { dueDate: "asc" }] });
    res.json({ data: tasks });
  } catch (e) { next(e); }
});

router.post("/", async (req, res, next) => {
  try {
    const d = taskSchema.parse(req.body);
    const advisorId = await resolveAdvisorId(req.user.orgId, d.advisorId, req.user.id);
    const task = await prisma.task.create({
      data: {
        orgId: req.user.orgId,
        title: d.title,
        clientId: d.clientId || null,
        advisorId,
        dueDate: d.dueDate || null,
        priority: d.priority || "MED",
        status: d.status || "OPEN",
        notes: d.notes || null,
      },
    });
    await writeAudit({ orgId: req.user.orgId, actorId: req.user.id, action: "Task created", entity: "Task", entityId: task.id, detail: task.title });
    res.status(201).json({ data: task });
  } catch (e) { next(e); }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.task.findFirst({ where: { id: req.params.id, orgId: req.user.orgId } });
    if (!existing) return res.status(404).json({ error: "Task not found" });
    const d = taskSchema.partial().parse(req.body);
    if (d.advisorId) d.advisorId = await resolveAdvisorId(req.user.orgId, d.advisorId, req.user.id);
    const task = await prisma.task.update({ where: { id: existing.id }, data: d });
    await writeAudit({ orgId: req.user.orgId, actorId: req.user.id, action: "Task updated", entity: "Task", entityId: task.id });
    res.json({ data: task });
  } catch (e) { next(e); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.task.findFirst({ where: { id: req.params.id, orgId: req.user.orgId } });
    if (!existing) return res.status(404).json({ error: "Task not found" });
    await prisma.task.delete({ where: { id: existing.id } });
    await writeAudit({ orgId: req.user.orgId, actorId: req.user.id, action: "Task deleted", entity: "Task", entityId: existing.id });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
