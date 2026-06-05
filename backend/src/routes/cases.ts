import { Router } from "express";
import { caseService } from "../services/caseService";
import { requirePermission } from "../services/rbacService";

export const casesRouter = Router();

casesRouter.get("/", requirePermission("read"), async (req, res, next) => {
  try {
    const data = await caseService.list(Number(req.query.limit || 100), Number(req.query.offset || 0));
    res.json({ data, total: data.length });
  } catch (error) {
    next(error);
  }
});

casesRouter.post("/", requirePermission("manage_cases"), async (req, res, next) => {
  try {
    const body = req.body || {};
    if (!body.title) return res.status(400).json({ status: "error", error: "title is required" });
    const record = await caseService.create(body);
    res.status(201).json(record);
  } catch (error) {
    next(error);
  }
});

casesRouter.get("/:id", requirePermission("read"), async (req, res, next) => {
  try {
    const record = await caseService.get(req.params.id);
    if (!record) return res.status(404).json({ status: "error", error: "Case not found" });
    res.json(record);
  } catch (error) {
    next(error);
  }
});

casesRouter.put("/:id", requirePermission("manage_cases"), async (req, res, next) => {
  try {
    const record = await caseService.update(req.params.id, req.body || {});
    if (!record) return res.status(404).json({ status: "error", error: "Case not found" });
    res.json(record);
  } catch (error) {
    next(error);
  }
});

casesRouter.delete("/:id", requirePermission("manage_cases"), async (req, res, next) => {
  try {
    await caseService.delete(req.params.id);
    res.json({ status: "success" });
  } catch (error) {
    next(error);
  }
});

casesRouter.post("/:id/investigations", requirePermission("manage_cases"), async (req, res, next) => {
  try {
    const investigationId = req.body?.investigation_id || req.body?.investigationId;
    if (!investigationId) return res.status(400).json({ status: "error", error: "investigationId is required" });
    const record = await caseService.addInvestigation(req.params.id, String(investigationId));
    res.json(record);
  } catch (error) {
    next(error);
  }
});
