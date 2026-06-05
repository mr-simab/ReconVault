import { Router } from "express";
import { dataStore } from "../services/dataStore";

export const evidenceRouter = Router();

evidenceRouter.get("/", async (req, res, next) => {
  try {
    const investigationId = req.query.investigation_id || req.query.investigationId;
    const where = investigationId ? { investigationId: String(investigationId) } : {};
    const evidence = await dataStore.evidence.findMany({
      where,
      take: Number(req.query.limit || 100),
      orderBy: { capturedAt: "desc" }
    });
    res.json({ data: evidence, total: evidence.length });
  } catch (error) {
    next(error);
  }
});

evidenceRouter.get("/:id", async (req, res, next) => {
  try {
    const evidence = await dataStore.evidence.findUnique({ where: { id: req.params.id } });
    if (!evidence) return res.status(404).json({ status: "error", error: "Evidence not found" });
    res.json(evidence);
  } catch (error) {
    next(error);
  }
});
