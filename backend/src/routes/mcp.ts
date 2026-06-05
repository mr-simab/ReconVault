import { Router } from "express";
import { mcpGateway } from "../services/mcpGateway";
import { toolRegistry } from "../services/toolRegistry";

export const mcpRouter = Router();

mcpRouter.get("/servers", (_req, res) => {
  res.json({ servers: mcpGateway.listServers() });
});

mcpRouter.get("/capabilities", (_req, res) => {
  res.json({
    servers: mcpGateway.listServers(),
    tools: toolRegistry.list().filter((tool) => tool.executionMode === "mcp_gateway" || tool.executionMode === "browser_automation")
  });
});
