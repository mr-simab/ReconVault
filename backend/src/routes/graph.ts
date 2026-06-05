import { Router } from "express";
import { knowledgeGraphService } from "../services/knowledgeGraphService";

export const graphRouter = Router();

graphRouter.get("/nodes", async (req, res, next) => {
  try {
    const nodes = await knowledgeGraphService.getNodes({
      type: req.query.type ? String(req.query.type) : undefined,
      targetId: req.query.target_id ? String(req.query.target_id) : req.query.targetId ? String(req.query.targetId) : undefined,
      limit: Number(req.query.limit || 1000)
    });
    res.json({ nodes });
  } catch (error) {
    next(error);
  }
});

graphRouter.get("/edges", async (req, res, next) => {
  try {
    const edges = await knowledgeGraphService.getEdges(Number(req.query.limit || 5000));
    res.json({ edges });
  } catch (error) {
    next(error);
  }
});

graphRouter.post("/query", async (req, res, next) => {
  try {
    const { type, value } = req.body || {};
    const result = await knowledgeGraphService.query(String(type || ""), String(value || ""));
    res.json(result);
  } catch (error: any) {
    if (error.message === "Unsupported query type") {
      return res.status(400).json({ status: "error", error: error.message });
    }
    return next(error);
  }
});

graphRouter.get("/", async (req, res, next) => {
  try {
    const graph = await knowledgeGraphService.getGraph({
      targetId: req.query.target_id ? String(req.query.target_id) : req.query.targetId ? String(req.query.targetId) : undefined,
      limit: Number(req.query.limit || 1500)
    });
    res.json(graph);
  } catch (error) {
    next(error);
  }
});

graphRouter.get("/stats", async (_req, res, next) => {
  try {
    res.json(await knowledgeGraphService.getStats());
  } catch (error) {
    next(error);
  }
});
