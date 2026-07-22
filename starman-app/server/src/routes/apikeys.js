import { Router } from "express";
import { z } from "zod";
import crypto from "node:crypto";
import { prisma, writeAudit } from "../db.js";
import { authRequired, roleRequired } from "../auth.js";

const router = Router();
router.use(authRequired);

export const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

router.get("/", async (req, res, next) => {
  try {
    const keys = await prisma.apiKey.findMany({
      where: { orgId: req.user.orgId },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, prefix: true, scopes: true, lastUsedAt: true, revoked: true, createdAt: true },
    });
    res.json({ data: keys });
  } catch (e) { next(e); }
});

const createSchema = z.object({ name: z.string().min(2), scopes: z.array(z.string()).optional() });

// Returns the FULL key exactly once; only a hash is stored.
router.post("/", roleRequired("OWNER"), async (req, res, next) => {
  try {
    const d = createSchema.parse(req.body);
    const raw = "sk_live_" + crypto.randomBytes(24).toString("hex");
    const key = await prisma.apiKey.create({
      data: { orgId: req.user.orgId, name: d.name, prefix: raw.slice(0, 12), hash: sha256(raw), scopes: d.scopes || ["leads:read", "leads:write", "intakes:write"] },
    });
    await writeAudit({ orgId: req.user.orgId, actorId: req.user.id, action: "API key created", entity: "ApiKey", entityId: key.id, detail: d.name });
    res.status(201).json({ data: { id: key.id, name: key.name, prefix: key.prefix, scopes: key.scopes }, secret: raw });
  } catch (e) { next(e); }
});

router.post("/:id/revoke", roleRequired("OWNER"), async (req, res, next) => {
  try {
    const k = await prisma.apiKey.findFirst({ where: { id: req.params.id, orgId: req.user.orgId } });
    if (!k) return res.status(404).json({ error: "Key not found" });
    await prisma.apiKey.update({ where: { id: k.id }, data: { revoked: true } });
    await writeAudit({ orgId: req.user.orgId, actorId: req.user.id, action: "API key revoked", entity: "ApiKey", entityId: k.id });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
