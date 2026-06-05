import http from "node:http";
import cors from "cors";
import express from "express";
import { env, validateEnv } from "./config/env";
import { logger } from "./config/logger";
import { aiRouter } from "./routes/ai";
import { auditRouter } from "./routes/audit";
import { casesRouter } from "./routes/cases";
import { collectionRouter } from "./routes/collection";
import { complianceRouter } from "./routes/compliance";
import { entitiesRouter } from "./routes/entities";
import { evidenceRouter } from "./routes/evidence";
import { executionRouter } from "./routes/execution";
import { graphRouter } from "./routes/graph";
import { healthRouter } from "./routes/health";
import { investigationsRouter } from "./routes/investigations";
import { iocsRouter } from "./routes/iocs";
import { mcpRouter } from "./routes/mcp";
import { queueRouter } from "./routes/queue";
import { rbacRouter } from "./routes/rbac";
import { reportsRouter } from "./routes/reports";
import { riskRouter } from "./routes/risk";
import { targetsRouter } from "./routes/targets";
import { timelineRouter } from "./routes/timeline";
import { toolsRouter } from "./routes/tools";
import { workflowsRouter } from "./routes/workflows";
import { dataStore } from "./services/dataStore";
import { websocketHub } from "./services/websocketHub";

validateEnv();

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.use(healthRouter);
app.use("/api/v1", healthRouter);
app.use("/api/v1/targets", targetsRouter);
app.use("/api/v1/entities", entitiesRouter);
app.use("/api/v1/collection", collectionRouter);
app.use("/api/v1/compliance", complianceRouter);
app.use("/api/v1/graph", graphRouter);
app.use("/api/v1/risk", riskRouter);
app.use("/api/v1/tools", toolsRouter);
app.use("/api/v1/mcp", mcpRouter);
app.use("/api/v1/ai", aiRouter);
app.use("/api/v1/investigations", investigationsRouter);
app.use("/api/v1/execute", executionRouter);
app.use("/api/v1/evidence", evidenceRouter);
app.use("/api/v1/workflows", workflowsRouter);
app.use("/api/v1/cases", casesRouter);
app.use("/api/v1/timeline", timelineRouter);
app.use("/api/v1/iocs", iocsRouter);
app.use("/api/v1/reports", reportsRouter);
app.use("/api/v1/audit", auditRouter);
app.use("/api/v1/queue", queueRouter);
app.use("/api/v1/rbac", rbacRouter);

app.get("/api/v1/collection/recent", (_req, res) => {
  res.redirect(307, "/api/v1/collection/history");
});

function isDatabaseUnavailable(error: any): boolean {
  const msg = String(error?.message || "");
  return msg.includes("Firebase Realtime Database is not configured")
    || msg.includes("Credential")
    || msg.includes("database")
    || msg.includes("Database unavailable");
}

function sendDegradedReadFallback(req: express.Request, res: express.Response, detail: string): boolean {
  if (req.method !== "GET") return false;

  const path = req.path.replace(/\/+$/, "") || "/";
  const metadata = {
    degraded: true,
    reason: "Database unavailable",
    detail
  };

  if (path === "/api/v1/graph") {
    res.json({ nodes: [], edges: [], metadata });
    return true;
  }

  if (path === "/api/v1/graph/nodes") {
    res.json({ nodes: [], metadata });
    return true;
  }

  if (path === "/api/v1/graph/edges") {
    res.json({ edges: [], metadata });
    return true;
  }

  if (path === "/api/v1/graph/stats") {
    res.json({ nodeCount: 0, edgeCount: 0, backend: "firebase_rtdb", metadata });
    return true;
  }

  if (path === "/api/v1/collection/tasks" || path === "/api/v1/collection/history") {
    res.json({ tasks: [], total: 0, metadata });
    return true;
  }

  if (path === "/api/v1/risk/scores") {
    res.json({ data: [], total: 0, metadata });
    return true;
  }

  const listDataPaths = new Set([
    "/api/v1/cases",
    "/api/v1/timeline",
    "/api/v1/iocs",
    "/api/v1/audit",
    "/api/v1/queue",
    "/api/v1/investigations",
    "/api/v1/evidence"
  ]);

  if (listDataPaths.has(path)
    || path.startsWith("/api/v1/timeline/investigation/")
    || path.startsWith("/api/v1/timeline/case/")) {
    res.json({ data: [], total: 0, metadata });
    return true;
  }

  return false;
}

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const msg = String(err?.message || "");
  if (isDatabaseUnavailable(err)) {
    if (sendDegradedReadFallback(_req, res, msg)) return;
    logger.error(err?.stack || err?.message || "Unknown database error");
    return res.status(503).json({ status: "error", error: "Database unavailable", detail: msg });
  }
  logger.error(err?.stack || err?.message || "Unknown error");
  res.status(500).json({ status: "error", error: err?.message || "Internal server error" });
});

const server = http.createServer(app);
websocketHub.attach(server);

server.listen(env.port, env.host, async () => {
  try {
    await dataStore.connect();
    logger.info(`Node backend listening on http://${env.host}:${env.port}`);
  } catch (error: any) {
    logger.error(`Firebase connection failed at startup: ${error.message}`);
  }
});

process.on("SIGINT", async () => {
  await dataStore.disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await dataStore.disconnect();
  process.exit(0);
});
