// Dashboard — Command Centre KPIs and a small actionable priority list, all
// aggregated server-side and org-scoped. One round trip powers the home screen.
import { Router } from "express";
import { prisma } from "../db.js";
import { authRequired } from "../auth.js";

const router = Router();
router.use(authRequired);

router.get("/", async (req, res, next) => {
  try {
    const orgId = req.user.orgId;
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 864e5);

    const [
      clientCount, aumAgg, kycOverdue, kycDueSoon,
      reviewsOverdue, reviewsDueSoon, openTasks, overdueTasks,
      openLeads, leadAumAgg, docsOutstanding, unread, recentAudit, topReviews,
    ] = await Promise.all([
      prisma.client.count({ where: { orgId } }),
      prisma.client.aggregate({ where: { orgId }, _sum: { aum: true } }),
      prisma.client.count({ where: { orgId, kycStatus: "OVERDUE" } }),
      prisma.client.count({ where: { orgId, kycStatus: "DUE_SOON" } }),
      prisma.client.count({ where: { orgId, nextReview: { lt: now } } }),
      prisma.client.count({ where: { orgId, nextReview: { gte: now, lte: in30 } } }),
      prisma.task.count({ where: { orgId, status: { not: "DONE" } } }),
      prisma.task.count({ where: { orgId, status: { not: "DONE" }, dueDate: { lt: now } } }),
      prisma.lead.count({ where: { orgId, status: { notIn: ["WON", "LOST"] } } }),
      prisma.lead.aggregate({ where: { orgId, status: { notIn: ["WON", "LOST"] } }, _sum: { estimatedAum: true } }),
      prisma.document.count({ where: { orgId, status: { in: ["Requested", "Sent", "Viewed"] } } }),
      prisma.notification.count({ where: { orgId, read: false } }),
      prisma.auditLog.findMany({ where: { orgId }, orderBy: { createdAt: "desc" }, take: 10 }),
      prisma.client.findMany({ where: { orgId, OR: [{ kycStatus: "OVERDUE" }, { nextReview: { lt: now } }] }, orderBy: { nextReview: "asc" }, take: 8, select: { id: true, name: true, kycStatus: true, nextReview: true, aum: true } }),
    ]);

    // A compact, ranked "today's priorities" list the Command Centre can render.
    const priorities = topReviews.map((c) => {
      const kycFlag = c.kycStatus === "OVERDUE";
      const reviewFlag = c.nextReview && c.nextReview < now;
      const reason = kycFlag ? "KYC overdue" : reviewFlag ? "Annual review overdue" : "Attention needed";
      return {
        clientId: c.id, client: c.name, reason,
        why: kycFlag ? "KYC record is past its refresh date (CIRO suitability requirement)." : "Scheduled review date has passed.",
        aum: Number(c.aum || 0),
        severity: kycFlag ? "high" : "med",
      };
    });

    res.json({
      data: {
        kpis: {
          clients: clientCount,
          aum: Number(aumAgg._sum.aum || 0),
          kycOverdue, kycDueSoon,
          reviewsOverdue, reviewsDueSoon,
          openTasks, overdueTasks,
          openLeads, pipelineAum: Number(leadAumAgg._sum.estimatedAum || 0),
          docsOutstanding, unreadNotifications: unread,
        },
        priorities,
        recentAudit,
      },
    });
  } catch (e) { next(e); }
});

export default router;
