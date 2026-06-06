import { Router } from "express";
import { reconIntelligenceService } from "../services/reconIntelligenceService";

export const reconRouter = Router();

reconRouter.get("/matrix", (_req, res) => {
  res.json(reconIntelligenceService.getMatrix());
});

reconRouter.post("/profile", (req, res) => {
  const body = req.body || {};
  if (!body.target) {
    return res.status(400).json({ status: "error", error: "target is required" });
  }
  return res.json(reconIntelligenceService.analyzeTarget({
    target: body.target,
    objective: body.objective || body.user_request || body.userRequest,
    depth: body.depth || body.max_iterations || body.maxIterations
  }));
});

reconRouter.post("/optimize", (req, res) => {
  const body = req.body || {};
  const toolName = body.tool_name || body.toolName || body.tool;
  if (!body.target || !toolName) {
    return res.status(400).json({ status: "error", error: "target and tool_name are required" });
  }
  return res.json(reconIntelligenceService.optimizeTool({
    toolName,
    target: body.target,
    objective: body.objective || body.user_request || body.userRequest,
    depth: body.depth || body.max_iterations || body.maxIterations
  }));
});

reconRouter.post("/workflow", (req, res) => {
  const body = req.body || {};
  if (!body.target) {
    return res.status(400).json({ status: "error", error: "target is required" });
  }
  return res.json(reconIntelligenceService.createWorkflow({
    target: body.target,
    objective: body.objective || body.user_request || body.userRequest,
    depth: body.depth || body.max_iterations || body.maxIterations,
    allowedCategories: body.allowed_categories || body.allowedCategories
  }));
});
