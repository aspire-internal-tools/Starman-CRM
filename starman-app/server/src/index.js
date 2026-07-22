import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./env.js";
import authRoutes from "./routes/auth.js";
import leadRoutes from "./routes/leads.js";
import intakeRoutes from "./routes/intakes.js";
import notificationRoutes from "./routes/notifications.js";
import connectorRoutes from "./routes/connectors.js";
import apiKeyRoutes from "./routes/apikeys.js";
import v1Routes from "./routes/v1.js";
import aiRoutes from "./routes/ai.js";
import clientRoutes from "./routes/clients.js";
import taskRoutes from "./routes/tasks.js";
import householdRoutes from "./routes/households.js";
import documentRoutes from "./routes/documents.js";
import dashboardRoutes from "./routes/dashboard.js";
import insuranceRoutes from "./routes/insurance.js";
import { prisma } from "./db.js";
import { createRequestContext, healthPayload, readyPayload } from "./runtime.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.set("trust proxy", env.trustProxy);
app.use(createRequestContext());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: env.webOrigin === "*" ? true : env.webOrigin.split(","), credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => res.json(healthPayload()));
app.get("/api/ready", async (_req, res) => {
  const result = await readyPayload(() => prisma.$queryRaw`SELECT 1`);
  res.status(result.status).json(result.body);
});

app.use("/api/auth", authRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/intakes", intakeRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/connectors", connectorRoutes);
app.use("/api/apikeys", apiKeyRoutes);
app.use("/api/v1", v1Routes); // public integration API (x-api-key)
app.use("/api/ai", aiRoutes); // grounded AI Support (CRM data + knowledge docs)
app.use("/api/clients", clientRoutes); // authed core CRM record
app.use("/api/tasks", taskRoutes);
app.use("/api/households", householdRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/dashboard", dashboardRoutes); // Command Centre KPIs (one round trip)
app.use("/api/insurance", insuranceRoutes);

// Serve the web client (built or static) from ../../web
const webDir = path.resolve(__dirname, "../../web");
app.use(express.static(webDir));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(webDir, "index.html"));
});

// Centralized error handler — zod validation -> 400, everything else -> 500.
app.use((err, req, res, _next) => {
  if (err?.name === "ZodError") {
    return res.status(400).json({ error: "Validation failed", issues: err.issues?.map((i) => ({ path: i.path.join("."), message: i.message })) });
  }
  if (err?.status) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(JSON.stringify({
    event: "request.error",
    correlationId: req.correlationId,
    errorType: err?.name || "Error",
    status: 500,
  }));
  res.status(500).json({ error: env.isProd ? "Internal server error" : String(err?.message || err) });
});

app.listen(env.port, () => {
  console.log(`Starman API listening on http://localhost:${env.port} (${env.isProd ? "production" : "development"})`);
});
