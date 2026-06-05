import { Router } from "express";
import { ToolCategory } from "../models/types";
import { toolRegistry } from "../services/toolRegistry";

export const toolsRouter = Router();

toolsRouter.get("/", (req, res) => {
  const category = req.query.category ? String(req.query.category) as ToolCategory : undefined;
  const enabled = req.query.enabled === undefined ? undefined : String(req.query.enabled) === "true";
  res.json({
    tools: toolRegistry.list({ category, enabled }),
    total: toolRegistry.list({ category, enabled }).length
  });
});

toolsRouter.get("/context", (_req, res) => {
  res.json(toolRegistry.getToolContext());
});

toolsRouter.get("/:name", (req, res) => {
  const tool = toolRegistry.get(req.params.name);
  if (!tool) return res.status(404).json({ status: "error", error: "Tool not found" });
  return res.json(tool);
});
