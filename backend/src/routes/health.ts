import { Router } from "express";
import { prisma } from "../config/prisma";

export const healthRouter = Router();

healthRouter.get("/health", async (_req, res) => {
  res.json({ status: "healthy", service: "reconvault-backend", timestamp: new Date().toISOString() });
});

healthRouter.get("/healthz", async (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

healthRouter.get("/readyz", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ready", db: "connected", timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: "not_ready", db: "disconnected", timestamp: new Date().toISOString() });
  }
});

healthRouter.get("/health/detailed", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "healthy",
      services: { database: "connected", websocket: "enabled", cache: "in-memory" },
      timestamp: new Date().toISOString()
    });
  } catch {
    res.status(503).json({
      status: "degraded",
      services: { database: "disconnected", websocket: "enabled", cache: "in-memory" },
      timestamp: new Date().toISOString()
    });
  }
});

healthRouter.get("/health/database", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "connected" });
  } catch {
    res.status(503).json({ status: "disconnected" });
  }
});

healthRouter.get("/health/neo4j", (_req, res) => {
  res.json({ status: "removed", detail: "Neo4j removed in Node.js migration" });
});

healthRouter.get("/health/redis", (_req, res) => {
  res.json({ status: "removed", detail: "Redis removed in Node.js migration; using in-memory cache" });
});
