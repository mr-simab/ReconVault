import { Router } from "express";
import { queueService } from "../services/queueService";
import { requirePermission } from "../services/rbacService";

export const queueRouter = Router();

queueRouter.get("/", requirePermission("read"), async (req, res, next) => {
  try {
    const data = await queueService.list(Number(req.query.limit || 100), req.query.status ? String(req.query.status) : undefined);
    res.json({ data, total: data.length });
  } catch (error) {
    next(error);
  }
});

queueRouter.post("/", requirePermission("investigate"), async (req, res, next) => {
  try {
    const job = await queueService.enqueue(req.body?.type || "manual", req.body?.payload || {});
    res.status(201).json(job);
  } catch (error) {
    next(error);
  }
});

queueRouter.post("/dequeue", requirePermission("investigate"), async (req, res, next) => {
  try {
    const job = await queueService.dequeue(req.body?.type);
    if (!job) return res.status(404).json({ status: "error", error: "No pending job" });
    res.json(job);
  } catch (error) {
    next(error);
  }
});

queueRouter.get("/:id", requirePermission("read"), async (req, res, next) => {
  try {
    const job = await queueService.getStatus(req.params.id);
    if (!job) return res.status(404).json({ status: "error", error: "Queue job not found" });
    res.json(job);
  } catch (error) {
    next(error);
  }
});
