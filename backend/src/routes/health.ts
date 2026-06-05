import { Router } from "express";
import { dataStore } from "../services/dataStore";

export const healthRouter = Router();

healthRouter.get("/health", async (_req, res) => {
  res.json({ status: "healthy", service: "reconvault-backend", timestamp: new Date().toISOString() });
});

healthRouter.get("/healthz", async (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

healthRouter.get("/readyz", async (_req, res) => {
  try {
    await dataStore.ping();
    res.json({ status: "ready", db: "firebase-connected", timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: "not_ready", db: "firebase-disconnected", timestamp: new Date().toISOString() });
  }
});

healthRouter.get("/health/detailed", async (_req, res) => {
  try {
    await dataStore.ping();
    res.json({
      status: "healthy",
      services: { database: "firebase-connected", websocket: "enabled", cache: "in-memory-task-status" },
      timestamp: new Date().toISOString()
    });
  } catch {
    res.status(503).json({
      status: "degraded",
      services: { database: "firebase-disconnected", websocket: "enabled", cache: "in-memory-task-status" },
      timestamp: new Date().toISOString()
    });
  }
});

healthRouter.get("/health/database", async (_req, res) => {
  try {
    await dataStore.ping();
    res.json({ status: "connected", provider: "firebase-realtime-database" });
  } catch {
    res.status(503).json({ status: "disconnected", provider: "firebase-realtime-database" });
  }
});

healthRouter.get("/health/neo4j", (_req, res) => {
  res.json({ status: "removed", detail: "Neo4j removed in Node.js migration" });
});

healthRouter.get("/health/redis", (_req, res) => {
  res.json({ status: "removed", detail: "Redis removed in Node.js migration; using in-memory cache" });
});
