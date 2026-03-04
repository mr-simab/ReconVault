import http from "node:http";
import cors from "cors";
import express from "express";
import { env, validateEnv } from "./config/env";
import { logger } from "./config/logger";
import { prisma } from "./config/prisma";
import { collectionRouter } from "./routes/collection";
import { entitiesRouter } from "./routes/entities";
import { graphRouter } from "./routes/graph";
import { healthRouter } from "./routes/health";
import { riskRouter } from "./routes/risk";
import { targetsRouter } from "./routes/targets";
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
app.use("/api/v1/graph", graphRouter);
app.use("/api/v1/risk", riskRouter);

app.get("/api/v1/collection/recent", (_req, res) => {
  res.redirect(307, "/api/v1/collection/history");
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error(err?.stack || err?.message || "Unknown error");
  const msg = String(err?.message || "");
  if (msg.includes("Can't reach database server") || err?.name === "PrismaClientInitializationError") {
    return res.status(503).json({ status: "error", error: "Database unavailable", detail: msg });
  }
  res.status(500).json({ status: "error", error: err?.message || "Internal server error" });
});

const server = http.createServer(app);
websocketHub.attach(server);

server.listen(env.port, env.host, async () => {
  try {
    await prisma.$connect();
    logger.info(`Node backend listening on http://${env.host}:${env.port}`);
  } catch (error: any) {
    logger.error(`Database connection failed at startup: ${error.message}`);
  }
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
