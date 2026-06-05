import axios from "axios";
import { env } from "../config/env";
import { ToolCapability } from "../models/types";
import { toolRegistry } from "./toolRegistry";

type McpServerConfig = {
  baseUrl: string;
  endpointTemplate?: string;
  headers?: Record<string, string>;
};

type McpServerMap = Record<string, McpServerConfig>;

function parseServerConfig(): McpServerMap {
  if (!env.mcpGatewayServersJson) return {};
  try {
    const parsed = JSON.parse(env.mcpGatewayServersJson);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch (_error) {
    return {};
  }
}

function sourceSlug(source: string): string {
  return String(source || "")
    .toLowerCase()
    .replace(/\s*mcp\s*/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildEndpoint(tool: ToolCapability, config: McpServerConfig): string {
  if (config.endpointTemplate) {
    return config.endpointTemplate
      .replace("{tool}", encodeURIComponent(tool.name))
      .replace("{source}", encodeURIComponent(sourceSlug(tool.source)));
  }
  if (tool.endpointPath) return tool.endpointPath.replace("{tool}", encodeURIComponent(tool.name));
  return `/mcp/tools/${sourceSlug(tool.source)}/${encodeURIComponent(tool.name)}`;
}

export class McpGateway {
  listServers() {
    const configuredServers = parseServerConfig();
    const grouped = new Map<string, ToolCapability[]>();

    for (const tool of toolRegistry.list().filter((capability) => capability.executionMode === "mcp_gateway" || capability.executionMode === "browser_automation")) {
      const tools = grouped.get(tool.source) || [];
      tools.push(tool);
      grouped.set(tool.source, tools);
    }

    return Array.from(grouped.entries()).map(([source, tools]) => ({
      name: source,
      configured: Boolean(configuredServers[source]?.baseUrl),
      baseUrl: configuredServers[source]?.baseUrl || null,
      tools: tools.map((tool) => ({
        name: tool.name,
        displayName: tool.displayName,
        inputs: tool.inputs,
        outputs: tool.outputs,
        requiresApproval: tool.requiresApproval
      }))
    }));
  }

  async executeTool(tool: ToolCapability, input: Record<string, unknown>) {
    const servers = parseServerConfig();
    const server = servers[tool.source];
    if (!server?.baseUrl) {
      return {
        status: "unavailable",
        tool: tool.name,
        source: tool.source,
        reason: `No MCP server configured for ${tool.source}`,
        output: null
      };
    }

    const endpoint = buildEndpoint(tool, server);
    const url = `${server.baseUrl.replace(/\/$/, "")}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
    const response = await axios.post(
      url,
      {
        tool: tool.name,
        input,
        metadata: {
          source: tool.source,
          requestedBy: "reconvault-execution-controller"
        }
      },
      {
        timeout: (tool.timeoutSeconds || 120) * 1000,
        headers: {
          "Content-Type": "application/json",
          ...(server.headers || {})
        }
      }
    );

    return {
      status: "completed",
      tool: tool.name,
      source: tool.source,
      output: response.data
    };
  }
}

export const mcpGateway = new McpGateway();
