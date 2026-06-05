import { Router } from "express";
import { reportExportService } from "../services/reportExportService";
import { requirePermission } from "../services/rbacService";

export const reportsRouter = Router();

reportsRouter.get("/investigation/:id", requirePermission("read"), async (req, res, next) => {
  try {
    const report = await reportExportService.buildInvestigationReport(req.params.id);
    if (!report) return res.status(404).json({ status: "error", error: "Investigation not found" });
    res.json(report);
  } catch (error) {
    next(error);
  }
});

reportsRouter.get("/investigation/:id/export", requirePermission("export"), async (req, res, next) => {
  try {
    const exported = await reportExportService.exportInvestigation(req.params.id, String(req.query.format || "json"));
    if (!exported) return res.status(404).json({ status: "error", error: "Investigation not found" });
    res.type(exported.contentType).send(exported.body);
  } catch (error) {
    next(error);
  }
});
