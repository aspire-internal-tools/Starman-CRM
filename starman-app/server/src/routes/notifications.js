import { Router } from "express";
import { prisma } from "../db.js";
import { authRequired } from "../auth.js";

const router = Router();
router.use(authRequired);

router.get("/", async (req, res, next) => {
  try {
    const data = await prisma.notification.findMany({
      where: { orgId: req.user.orgId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const unread = data.filter((n) => !n.read).length;
    res.json({ data, unread });
  } catch (e) { next(e); }
});

router.post("/:id/read", async (req, res, next) => {
  try {
    const n = await prisma.notification.findFirst({ where: { id: req.params.id, orgId: req.user.orgId } });
    if (!n) return res.status(404).json({ error: "Not found" });
    await prisma.notification.update({ where: { id: n.id }, data: { read: true } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post("/read-all", async (req, res, next) => {
  try {
    await prisma.notification.updateMany({ where: { orgId: req.user.orgId, read: false }, data: { read: true } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
