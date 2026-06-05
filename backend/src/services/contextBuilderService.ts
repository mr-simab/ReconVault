import { detectTargetType } from "../utils/target";
import { dataStore } from "./dataStore";
import { investigationService } from "./investigationService";
import { toolRegistry } from "./toolRegistry";

type PlanningContextInput = {
  investigationId?: string;
  target?: string;
  userRequest?: string;
  currentFindings?: unknown[];
  investigationState?: Record<string, unknown>;
};

export class ContextBuilderService {
  async buildPlanningContext(input: PlanningContextInput) {
    const warnings: string[] = [];
    let investigation: any = null;

    if (input.investigationId) {
      try {
        investigation = await investigationService.getInvestigation(input.investigationId);
        if (!investigation) warnings.push(`Investigation not found: ${input.investigationId}`);
      } catch (error: any) {
        warnings.push(`Investigation lookup unavailable: ${error.message}`);
      }
    }

    const target = String(input.target || investigation?.target || "").trim();
    const targetType = investigation?.targetType || detectTargetType(target);
    const toolContext = toolRegistry.getToolContext();

    let relevantEntities: any[] = [];
    let recentEvidence: any[] = [];
    let planHistory: any[] = [];

    try {
      if (investigation?.targetId) {
        relevantEntities = await dataStore.entity.findMany({
          where: { targetId: String(investigation.targetId) },
          take: 50,
          orderBy: { createdAt: "desc" }
        });
      }
    } catch (error: any) {
      warnings.push(`Entity context unavailable: ${error.message}`);
    }

    try {
      if (investigation?.investigationId) {
        recentEvidence = await investigationService.listEvidence(investigation.investigationId, 25);
        planHistory = await investigationService.listPlans(investigation.investigationId);
      }
    } catch (error: any) {
      warnings.push(`Evidence or plan history unavailable: ${error.message}`);
    }

    return {
      target,
      target_type: targetType,
      user_request: input.userRequest || investigation?.userRequest || `Investigate ${target}`,
      available_collectors: toolContext.collectors,
      mcp_tools: toolContext.mcp_tools,
      api_integrations: toolContext.api_integrations,
      browser_capabilities: toolContext.browser_capabilities,
      internal_tools: toolContext.internal_tools,
      current_findings: input.currentFindings || relevantEntities.map((entity) => ({
        id: entity.id,
        type: entity.type,
        value: entity.value,
        riskLevel: entity.riskLevel,
        source: entity.source
      })),
      recent_evidence: recentEvidence.map((evidence) => ({
        id: evidence.id,
        tool: evidence.tool,
        type: evidence.type,
        source: evidence.source,
        summary: evidence.summary,
        capturedAt: evidence.capturedAt
      })),
      investigation_state: input.investigationState || investigation?.memory || {},
      investigation_history: planHistory.slice(0, 10).map((plan) => ({
        planId: plan.planId,
        createdAt: plan.createdAt,
        plannerMode: plan.plannerMode,
        steps: Array.isArray(plan.steps) ? plan.steps.map((step: any) => ({ tool: step.tool, purpose: step.purpose })) : []
      })),
      warnings
    };
  }
}

export const contextBuilderService = new ContextBuilderService();
