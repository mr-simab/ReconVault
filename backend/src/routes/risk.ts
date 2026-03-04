import { Router } from "express";
import { prisma } from "../config/prisma";
import { riskService } from "../services/riskService";

export const riskRouter = Router();

riskRouter.get("/assess/:targetId", async (req, res, next) => {
  try {
    const targetId = Number(req.params.targetId);
    const result = await riskService.assessTarget(targetId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

riskRouter.get("/scores", async (_req, res, next) => {
  try {
    const targets = await prisma.target.findMany({ take: 200 });
    const results = await Promise.all(targets.map((target) => riskService.assessTarget(target.id)));
    res.json({ data: results });
  } catch (error) {
    next(error);
  }
});

riskRouter.get("/entities/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const entity = await prisma.entity.findUnique({ where: { id } });
    if (!entity) return res.status(404).json({ status: "error", error: "Entity not found" });
    const weightMap: Record<string, number> = { CRITICAL: 90, HIGH: 70, MEDIUM: 50, LOW: 25, INFO: 10 };
    const score = weightMap[entity.riskLevel] || 10;
    res.json({
      entity_id: entity.id,
      risk_score: score,
      risk_level: entity.riskLevel,
      factors: [{ name: entity.type, weight: 1, value: score }]
    });
  } catch (error) {
    next(error);
  }
});
