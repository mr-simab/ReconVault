import { Router } from "express";
import { prisma } from "../config/prisma";

export const graphRouter = Router();

graphRouter.get("/nodes", async (req, res, next) => {
  try {
    const type = req.query.type ? String(req.query.type) : undefined;
    const limit = Number(req.query.limit || 1000);
    const where = type ? { type } : {};
    const nodes = await prisma.entity.findMany({ where, take: limit, orderBy: { createdAt: "desc" } });
    res.json({
      nodes: nodes.map((n) => ({
        id: `entity-${n.id}`,
        label: n.value,
        type: n.type,
        riskLevel: n.riskLevel,
        properties: n.metadata
      }))
    });
  } catch (error) {
    next(error);
  }
});

graphRouter.get("/edges", async (_req, res, next) => {
  try {
    const edges = await prisma.relationship.findMany({ orderBy: { createdAt: "desc" }, take: 5000 });
    res.json({
      edges: edges.map((e) => ({
        id: `rel-${e.id}`,
        source: e.source,
        target: e.target,
        type: e.relationshipType,
        properties: e.metadata || {}
      }))
    });
  } catch (error) {
    next(error);
  }
});

graphRouter.post("/query", async (req, res, next) => {
  try {
    const { type, value } = req.body || {};
    if (type === "entity_value") {
      const nodes = await prisma.entity.findMany({ where: { value: { contains: String(value || ""), mode: "insensitive" } }, take: 100 });
      return res.json({ nodes });
    }
    if (type === "relationship_type") {
      const edges = await prisma.relationship.findMany({ where: { relationshipType: String(value || "") }, take: 100 });
      return res.json({ edges });
    }
    res.status(400).json({ status: "error", error: "Unsupported query type" });
  } catch (error) {
    next(error);
  }
});

graphRouter.get("/", async (_req, res, next) => {
  try {
    const [entities, relationships] = await Promise.all([
      prisma.entity.findMany({ take: 1500, orderBy: { createdAt: "desc" } }),
      prisma.relationship.findMany({ take: 5000, orderBy: { createdAt: "desc" } })
    ]);
    res.json({
      nodes: entities.map((n) => ({ id: `entity-${n.id}`, label: n.value, type: n.type, properties: n.metadata, riskLevel: n.riskLevel })),
      edges: relationships.map((e) => ({ id: `rel-${e.id}`, source: e.source, target: e.target, type: e.relationshipType, properties: e.metadata || {} }))
    });
  } catch (error) {
    next(error);
  }
});

graphRouter.get("/stats", async (_req, res, next) => {
  try {
    const [nodeCount, edgeCount] = await Promise.all([prisma.entity.count(), prisma.relationship.count()]);
    res.json({ nodeCount, edgeCount });
  } catch (error) {
    next(error);
  }
});
