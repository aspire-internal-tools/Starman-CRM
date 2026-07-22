import { PrismaClient } from "@prisma/client";

// Single Prisma instance reused across the process.
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "production" ? ["error"] : ["warn", "error"],
});

export async function writeAudit({ orgId, actorId, action, entity, entityId, detail }) {
  try {
    await prisma.auditLog.create({
      data: { orgId, actorId: actorId || null, action, entity: entity || null, entityId: entityId || null, detail: detail || null },
    });
  } catch {
    /* audit must never break the request path */
  }
}

// Validates a client-supplied advisorId belongs to the caller's org before it's
// stored as a foreign key. Falls back to `fallbackId` when none is supplied.
// Throws a 400-shaped error (caught by the centralized handler) on cross-org IDs.
export async function resolveAdvisorId(orgId, advisorId, fallbackId) {
  if (!advisorId) return fallbackId;
  const user = await prisma.user.findFirst({ where: { id: advisorId, orgId } });
  if (!user) {
    const err = new Error("advisorId does not belong to this organization");
    err.status = 400;
    throw err;
  }
  return advisorId;
}
