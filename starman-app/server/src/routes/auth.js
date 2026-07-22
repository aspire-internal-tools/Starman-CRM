import { Router } from "express";
import { z } from "zod";
import { prisma, writeAudit } from "../db.js";
import { hashPassword, verifyPassword, signToken, authRequired } from "../auth.js";
import { authLimiter } from "../rateLimit.js";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

// Advisor sign-up: Starman is single-firm — new accounts join the existing Org
// as ADVISOR. (The firm itself is created once by the seed; there is no
// self-serve "new firm" flow.) Owners promote roles directly in the database
// or a future team-management screen.
router.post("/register", authLimiter, async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const org = await prisma.org.findFirst({ orderBy: { createdAt: "asc" } });
    if (!org) return res.status(409).json({ error: "Firm not initialized yet — run the database seed first." });

    const passwordHash = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: { orgId: org.id, email: data.email, passwordHash, name: data.name, role: "ADVISOR" },
    });
    await writeAudit({ orgId: org.id, actorId: user.id, action: "Advisor account created", entity: "User", entityId: user.id, detail: user.email });
    const token = signToken(user);
    res.status(201).json({ token, user: publicUser(user), org: { id: org.id, name: org.name } });
  } catch (e) { next(e); }
});

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

router.post("/login", authLimiter, async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user || !user.active || !(await verifyPassword(data.password, user.passwordHash))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    await writeAudit({ orgId: user.orgId, actorId: user.id, action: "Login" });
    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (e) { next(e); }
});

router.get("/me", authRequired, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: "User not found" });
    const org = await prisma.org.findUnique({ where: { id: user.orgId } });
    const team = await prisma.user.findMany({
      where: { orgId: user.orgId, active: true },
      select: { id: true, name: true, title: true, role: true },
    });
    res.json({ user: publicUser(user), org: { id: org.id, name: org.name }, team });
  } catch (e) { next(e); }
});

function publicUser(u) {
  return { id: u.id, email: u.email, name: u.name, title: u.title, role: u.role, orgId: u.orgId };
}

export default router;
