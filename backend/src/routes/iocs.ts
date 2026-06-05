import { Router } from "express";
import { iocService } from "../services/iocService";
import { requirePermission } from "../services/rbacService";

export const iocsRouter = Router();

iocsRouter.get("/", requirePermission("read"), async (req, res, next) => {
  try {
    const data = await iocService.list(Number(req.query.limit || 100), Number(req.query.offset || 0), req.query.type ? String(req.query.type) : undefined);
    res.json({ data, total: data.length });
  } catch (error) {
    next(error);
  }
});

iocsRouter.post("/", requirePermission("investigate"), async (req, res, next) => {
  try {
    if (!req.body?.type || !req.body?.value) return res.status(400).json({ status: "error", error: "type and value are required" });
    const record = await iocService.create(req.body);
    res.status(201).json(record);
  } catch (error) {
    next(error);
  }
});

iocsRouter.get("/:id", requirePermission("read"), async (req, res, next) => {
  try {
    const record = await iocService.get(req.params.id);
    if (!record) return res.status(404).json({ status: "error", error: "IOC not found" });
    res.json(record);
  } catch (error) {
    next(error);
  }
});

iocsRouter.post("/search", requirePermission("read"), async (req, res, next) => {
  try {
    const data = await iocService.search(req.body?.query || "", { type: req.body?.type, tag: req.body?.tag });
    res.json({ data, total: data.length });
  } catch (error) {
    next(error);
  }
});

iocsRouter.post("/merge", requirePermission("investigate"), async (req, res, next) => {
  try {
    const sourceId = req.body?.sourceId || req.body?.source_id;
    const targetId = req.body?.targetId || req.body?.target_id;
    if (!sourceId || !targetId) return res.status(400).json({ status: "error", error: "sourceId and targetId are required" });
    res.json(await iocService.merge(sourceId, targetId));
  } catch (error) {
    next(error);
  }
});

iocsRouter.post("/:id/evidence", requirePermission("investigate"), async (req, res, next) => {
  try {
    const evidenceId = req.body?.evidenceId || req.body?.evidence_id;
    if (!evidenceId) return res.status(400).json({ status: "error", error: "evidenceId is required" });
    res.json(await iocService.linkEvidence(req.params.id, evidenceId));
  } catch (error) {
    next(error);
  }
});

iocsRouter.post("/:id/investigations", requirePermission("investigate"), async (req, res, next) => {
  try {
    const investigationId = req.body?.investigationId || req.body?.investigation_id;
    if (!investigationId) return res.status(400).json({ status: "error", error: "investigationId is required" });
    res.json(await iocService.linkInvestigation(req.params.id, investigationId));
  } catch (error) {
    next(error);
  }
});
