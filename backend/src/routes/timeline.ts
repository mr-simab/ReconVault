import { Router } from "express";
import { timelineService } from "../services/timelineService";
import { requirePermission } from "../services/rbacService";

export const timelineRouter = Router();

timelineRouter.get("/", requirePermission("read"), async (req, res, next) => {
  try {
    const data = await timelineService.list(Number(req.query.limit || 100), Number(req.query.offset || 0));
    res.json({ data, total: data.length });
  } catch (error) {
    next(error);
  }
});

timelineRouter.get("/investigation/:id", requirePermission("read"), async (req, res, next) => {
  try {
    const data = await timelineService.listByInvestigation(req.params.id);
    res.json({ data, total: data.length });
  } catch (error) {
    next(error);
  }
});

timelineRouter.get("/case/:id", requirePermission("read"), async (req, res, next) => {
  try {
    const data = await timelineService.listByCase(req.params.id);
    res.json({ data, total: data.length });
  } catch (error) {
    next(error);
  }
});
