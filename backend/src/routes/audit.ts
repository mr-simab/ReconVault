import { Router } from "express";
import { auditService } from "../services/auditService";
import { requirePermission } from "../services/rbacService";

export const auditRouter = Router();

auditRouter.get("/", requirePermission("audit"), async (req, res, next) => {
  try {
    const data = await auditService.list(Number(req.query.limit || 100), Number(req.query.offset || 0));
    res.json({ data, total: data.length });
  } catch (error) {
    next(error);
  }
});

auditRouter.get("/:id", requirePermission("audit"), async (req, res, next) => {
  try {
    const record = await auditService.get(req.params.id);
    if (!record) return res.status(404).json({ status: "error", error: "Audit log not found" });
    res.json(record);
  } catch (error) {
    next(error);
  }
});
