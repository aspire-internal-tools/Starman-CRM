import { Router } from "express";
import { z } from "zod";
import { prisma, writeAudit } from "../db.js";
import { authRequired, roleRequired } from "../auth.js";

const router = Router();
router.use(authRequired);

const LOCKED = new Set(["canada_life", "quadrus"]);

router.get("/", async (req, res, next) => {
  try {
    const data = await prisma.connector.findMany({ where: { orgId: req.user.orgId }, orderBy: { displayName: "asc" } });
    res.json({ data });
  } catch (e) { next(e); }
});

const configSchema = z.object({ config: z.record(z.any()).optional(), status: z.string().optional() });

// Save non-secret config. Locked providers can be edited but never set to CONNECTED here.
router.patch("/:provider", roleRequired("OWNER", "ADVISOR"), async (req, res, next) => {
  try {
    const { provider } = req.params;
    const d = configSchema.parse(req.body);
    const existing = await prisma.connector.findUnique({ where: { orgId_provider: { orgId: req.user.orgId, provider } } });
    if (!existing) return res.status(404).json({ error: "Connector not found" });
    if (LOCKED.has(provider) && d.status === "CONNECTED") {
      return res.status(409).json({ error: "This provider is locked: official API access and dealer/compliance approval are required. Manual CSV import only." });
    }
    const c = await prisma.connector.update({
      where: { id: existing.id },
      data: { config: d.config ?? existing.config, status: LOCKED.has(provider) ? "LOCKED" : (d.status || existing.status) },
    });
    await writeAudit({ orgId: req.user.orgId, actorId: req.user.id, action: "Connector updated", entity: "Connector", entityId: c.id, detail: provider });
    res.json({ data: c });
  } catch (e) { next(e); }
});

// "Test connection" — in production this performs a real server-side handshake with the provider.
// Here it is simulated and NEVER calls external networks or exposes secrets.
router.post("/:provider/test", async (req, res, next) => {
  try {
    const { provider } = req.params;
    const c = await prisma.connector.findUnique({ where: { orgId_provider: { orgId: req.user.orgId, provider } } });
    if (!c) return res.status(404).json({ error: "Connector not found" });
    if (LOCKED.has(provider)) return res.json({ ok: false, locked: true, message: "Locked — official API access required. Use manual CSV import." });
    /* Production: validate stored OAuth token / credentials against the provider here (server-side). */
    const ok = !!(c.config && Object.values(c.config).some((v) => v));
    res.json({ ok, message: ok ? "Configuration looks valid (simulated check)." : "Add configuration to connect." });
  } catch (e) { next(e); }
});

// "Sync" — simulated. For Meta/AdvisorStream this would pull leads/engagement server-side and upsert records.
router.post("/:provider/sync", roleRequired("OWNER", "ADVISOR"), async (req, res, next) => {
  try {
    const { provider } = req.params;
    const c = await prisma.connector.findUnique({ where: { orgId_provider: { orgId: req.user.orgId, provider } } });
    if (!c) return res.status(404).json({ error: "Connector not found" });
    if (LOCKED.has(provider)) return res.status(409).json({ error: "Locked provider — manual CSV import only." });

    let imported = 0;
    if (provider === "meta_ads") {
      // Production: GET https://graph.facebook.com/v19.0/{form_id}/leads (server-side, token from secrets manager).
      const demo = [
        { name: "Meta Lead — Jordan Pike", email: "jordan@example.ca", source: "Meta / Lead Ads" },
        { name: "Meta Lead — Renee Boucher", email: "renee@example.ca", source: "Meta / Lead Ads" },
      ];
      for (const d of demo) {
        await prisma.intake.create({ data: { orgId: req.user.orgId, type: "meta", name: d.name, email: d.email, source: d.source, status: "NEW", advisorId: req.user.id } });
        imported++;
      }
    } else if (provider === "advisorstream") {
      // Production: GET AdvisorStream engagement API (opens/clicks) and create follow-up intakes/tasks.
      const demo = [{ name: "AdvisorStream — RESP article (Rahman)", source: "AdvisorStream" }];
      for (const d of demo) {
        await prisma.intake.create({ data: { orgId: req.user.orgId, type: "advisorstream", name: d.name, source: d.source, status: "NEW", advisorId: req.user.id } });
        imported++;
      }
    }
    const updated = await prisma.connector.update({
      where: { id: c.id },
      data: { status: "CONNECTED", lastSyncAt: new Date(), syncStatus: "ok", errorLog: null },
    });
    await writeAudit({ orgId: req.user.orgId, actorId: req.user.id, action: "Connector synced", entity: "Connector", entityId: c.id, detail: `${provider}: ${imported} record(s)` });
    res.json({ data: updated, imported, message: `Synced (simulated) — ${imported} record(s) imported to Intake Centre.` });
  } catch (e) { next(e); }
});

export default router;
