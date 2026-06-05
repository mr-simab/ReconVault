import { env } from "../config/env";
import { collectorsRegistry } from "../collectors";
import { InvestigationPlan, PlanStep, ToolCapability, ToolExecutionResult } from "../models/types";
import { detectTargetType } from "../utils/target";
import { apiIntegrationService } from "./apiIntegrationService";
import { auditService } from "./auditService";
import { correlationService } from "./correlationService";
import { dataStore } from "./dataStore";
import { investigationService } from "./investigationService";
import { mcpGateway } from "./mcpGateway";
import { planningService } from "./planningService";
import { riskService } from "./riskService";
import { timelineService } from "./timelineService";
import { toolRegistry } from "./toolRegistry";

type ExecuteOptions = {
  dryRun?: boolean;
  approvedTools?: string[];
};

type ExecutionSummary = {
  planId: string;
  investigationId?: string;
  status: "validated" | "completed" | "failed";
  validation: { valid: boolean; errors: string[]; warnings: string[] };
  results: ToolExecutionResult[];
};

export class ExecutionController {
  validate(plan: InvestigationPlan) {
    return planningService.validatePlan(plan);
  }

  async executePlan(plan: InvestigationPlan, options: ExecuteOptions = {}): Promise<ExecutionSummary> {
    const validation = this.validate(plan);
    if (options.dryRun || !validation.valid) {
      return {
        planId: plan.planId,
        investigationId: plan.investigationId,
        status: "validated",
        validation,
        results: []
      };
    }

    const approvedTools = new Set((options.approvedTools || []).map((tool) => tool.toLowerCase()));
    const targetRecord = await this.resolveTarget(plan);
    if (plan.investigationId) await investigationService.updateStatus(plan.investigationId, "RUNNING");
    await auditService.record({
      action: "execution.started",
      targetType: "plan",
      targetId: plan.planId,
      metadata: { investigationId: plan.investigationId, steps: plan.steps.length }
    });
    await timelineService.record({
      investigationId: plan.investigationId,
      eventType: "EXECUTION_STARTED",
      title: "Execution started",
      description: `${plan.steps.length} planned step(s)`,
      metadata: { planId: plan.planId }
    });

    const pending = new Map<string, PlanStep>();
    for (const step of plan.steps) pending.set(step.id, step);
    const completed = new Set<string>();
    const terminal = new Set<string>();
    const results: ToolExecutionResult[] = [];

    while (pending.size > 0) {
      const runnable = Array.from(pending.values()).filter((step) =>
        (step.dependsOn || []).every((dep) => terminal.has(dep))
      );

      if (runnable.length === 0) {
        for (const step of pending.values()) {
          const failed = this.createResult(step, "failed", { reason: "Dependency cycle or missing dependency prevented execution." });
          results.push(failed);
          await investigationService.saveExecutionRecord(plan.investigationId, plan.planId, failed);
          terminal.add(step.id);
        }
        pending.clear();
        break;
      }

      const nonParallel = runnable.find((step) => {
        const tool = toolRegistry.get(step.tool);
        return !tool?.parallelSafe;
      });
      const batch = nonParallel ? [nonParallel] : runnable.slice(0, Math.max(1, env.executionMaxParallelSteps));

      const batchResults = await Promise.all(batch.map((step) =>
        this.executeStep(step, plan, targetRecord, approvedTools)
      ));

      for (const result of batchResults) {
        results.push(result);
        pending.delete(result.stepId);
        terminal.add(result.stepId);
        if (result.status === "completed") completed.add(result.stepId);
        await investigationService.saveExecutionRecord(plan.investigationId, plan.planId, result);
      }
    }

    const failed = results.some((result) => result.status === "failed");
    if (plan.investigationId) await investigationService.updateStatus(plan.investigationId, failed ? "FAILED" : "COMPLETED");
    await auditService.record({
      action: failed ? "execution.failed" : "execution.completed",
      targetType: "plan",
      targetId: plan.planId,
      metadata: { investigationId: plan.investigationId, results: results.length }
    });
    await timelineService.record({
      investigationId: plan.investigationId,
      eventType: failed ? "EXECUTION_FAILED" : "EXECUTION_COMPLETED",
      title: failed ? "Execution failed" : "Execution completed",
      description: `${results.length} execution result(s) recorded`,
      metadata: { planId: plan.planId, results: results.map((result) => ({ tool: result.tool, status: result.status })) }
    });

    return {
      planId: plan.planId,
      investigationId: plan.investigationId,
      status: failed ? "failed" : "completed",
      validation,
      results
    };
  }

  private async executeStep(
    step: PlanStep,
    plan: InvestigationPlan,
    targetRecord: any,
    approvedTools: Set<string>
  ): Promise<ToolExecutionResult> {
    const startedAt = new Date().toISOString();
    const validation = toolRegistry.validateStepTool(step.tool);
    if (!validation.valid || !validation.tool) {
      return this.createResult(step, "failed", { reason: validation.error || "Invalid tool" }, startedAt);
    }

    const tool = validation.tool;
    if (tool.requiresApproval && !approvedTools.has(tool.name.toLowerCase())) {
      return this.createResult(step, "skipped", {
        reason: "Tool requires human approval before execution.",
        tool: tool.name,
        source: tool.source
      }, startedAt);
    }

    try {
      if (tool.executionMode === "collector") return this.executeCollectorStep(step, plan, targetRecord, tool, startedAt);
      if (tool.executionMode === "mcp_gateway" || tool.executionMode === "browser_automation") {
        return this.executeMcpStep(step, plan, tool, startedAt);
      }
      if (tool.executionMode === "api_integration") return this.executeApiIntegrationStep(step, plan, targetRecord, tool, startedAt);
      if (tool.executionMode === "internal") return this.executeInternalStep(step, plan, targetRecord, startedAt);
      return this.createResult(step, "unavailable", { reason: `Unsupported execution mode: ${tool.executionMode}` }, startedAt);
    } catch (error: any) {
      return this.createResult(step, "failed", { reason: error.message }, startedAt, error.message);
    }
  }

  private async executeCollectorStep(
    step: PlanStep,
    plan: InvestigationPlan,
    targetRecord: any,
    tool: ToolCapability,
    startedAt: string
  ): Promise<ToolExecutionResult> {
    const collector = collectorsRegistry[tool.name];
    if (!collector) return this.createResult(step, "failed", { reason: `Collector not found: ${tool.name}` }, startedAt);

    const target = String(step.inputs?.target || plan.target);
    const result = await collector.collect(target);

    const createdEntities = await Promise.all(
      result.findings.map((finding) =>
        dataStore.entity.create({
          data: {
            type: finding.type,
            value: finding.value,
            riskLevel: finding.riskLevel || "INFO",
            metadata: finding.metadata || {},
            source: finding.source,
            targetId: targetRecord.id
          }
        })
      )
    );

    const createdRelationships = await Promise.all(
      result.relationships.map((relationship) =>
        dataStore.relationship.create({
          data: {
            source: relationship.source,
            target: relationship.target,
            relationshipType: relationship.relationshipType,
            metadata: relationship.metadata || {}
          }
        })
      )
    );

    const evidence = await investigationService.saveEvidence({
      investigationId: plan.investigationId,
      planId: plan.planId,
      stepId: step.id,
      tool: tool.name,
      type: "collector_result",
      source: tool.source,
      summary: {
        findings: result.findings.length,
        relationships: result.relationships.length,
        entitiesCreated: createdEntities.length,
        relationshipsCreated: createdRelationships.length
      },
      raw: result
    });

    return this.createResult(step, "completed", {
      findings: result.findings.length,
      relationships: result.relationships.length,
      entitiesCreated: createdEntities.length,
      relationshipsCreated: createdRelationships.length
    }, startedAt, undefined, evidence.id);
  }

  private async executeMcpStep(
    step: PlanStep,
    plan: InvestigationPlan,
    tool: ToolCapability,
    startedAt: string
  ): Promise<ToolExecutionResult> {
    const output = await mcpGateway.executeTool(tool, {
      target: step.inputs?.target || plan.target,
      ...step.inputs
    });

    const evidence = await investigationService.saveEvidence({
      investigationId: plan.investigationId,
      planId: plan.planId,
      stepId: step.id,
      tool: tool.name,
      type: "mcp_result",
      source: tool.source,
      summary: {
        status: output.status,
        reason: (output as any).reason || null
      },
      raw: output
    });

    if (output.status === "unavailable") {
      return this.createResult(step, "unavailable", {
        reason: (output as any).reason,
        source: tool.source
      }, startedAt, undefined, evidence.id);
    }

    return this.createResult(step, "completed", {
      source: tool.source,
      status: output.status
    }, startedAt, undefined, evidence.id);
  }

  private async executeApiIntegrationStep(
    step: PlanStep,
    plan: InvestigationPlan,
    targetRecord: any,
    tool: ToolCapability,
    startedAt: string
  ): Promise<ToolExecutionResult> {
    const output = await apiIntegrationService.execute(tool, {
      target: step.inputs?.target || plan.target,
      ...step.inputs
    }, plan.target);

    const createdEntities = await Promise.all(
      output.findings.map((finding) =>
        dataStore.entity.create({
          data: {
            type: finding.type,
            value: finding.value,
            riskLevel: finding.riskLevel || "INFO",
            metadata: finding.metadata || {},
            source: finding.source,
            targetId: targetRecord.id
          }
        })
      )
    );

    const createdRelationships = await Promise.all(
      output.relationships.map((relationship) =>
        dataStore.relationship.create({
          data: {
            source: relationship.source,
            target: relationship.target,
            relationshipType: relationship.relationshipType,
            metadata: relationship.metadata || {}
          }
        })
      )
    );

    const evidence = await investigationService.saveEvidence({
      investigationId: plan.investigationId,
      planId: plan.planId,
      stepId: step.id,
      tool: tool.name,
      type: "api_integration_result",
      source: tool.source,
      summary: {
        status: output.status,
        reason: output.reason || null,
        findings: output.findings.length,
        relationships: output.relationships.length,
        entitiesCreated: createdEntities.length,
        relationshipsCreated: createdRelationships.length
      },
      raw: output
    });

    return this.createResult(step, output.status === "failed" ? "failed" : output.status, {
      status: output.status,
      reason: output.reason || null,
      findings: output.findings.length,
      relationships: output.relationships.length,
      entitiesCreated: createdEntities.length,
      relationshipsCreated: createdRelationships.length
    }, startedAt, output.status === "failed" ? output.reason : undefined, evidence.id);
  }

  private async executeInternalStep(
    step: PlanStep,
    plan: InvestigationPlan,
    targetRecord: any,
    startedAt: string
  ): Promise<ToolExecutionResult> {
    if (step.tool === "correlate_findings") {
      const summary = await correlationService.correlateInvestigation(plan.investigationId, plan.target);
      const evidence = await investigationService.saveEvidence({
        investigationId: plan.investigationId,
        planId: plan.planId,
        stepId: step.id,
        tool: step.tool,
        type: "correlation_summary",
        source: "ReconVault Backend",
        summary,
        raw: summary
      });
      return this.createResult(step, "completed", summary, startedAt, undefined, evidence.id);
    }

    if (step.tool === "risk_assessment") {
      const summary = await riskService.assessTarget(targetRecord.id);
      const evidence = await investigationService.saveEvidence({
        investigationId: plan.investigationId,
        planId: plan.planId,
        stepId: step.id,
        tool: step.tool,
        type: "risk_summary",
        source: "ReconVault Backend",
        summary,
        raw: summary
      });
      return this.createResult(step, "completed", summary, startedAt, undefined, evidence.id);
    }

    return this.createResult(step, "unavailable", { reason: `Unknown internal tool: ${step.tool}` }, startedAt);
  }

  private createResult(
    step: PlanStep,
    status: ToolExecutionResult["status"],
    outputSummary: Record<string, unknown>,
    startedAt = new Date().toISOString(),
    error?: string,
    evidenceId?: string | number
  ): ToolExecutionResult {
    return {
      stepId: step.id,
      tool: step.tool,
      status,
      startedAt,
      completedAt: new Date().toISOString(),
      outputSummary,
      evidenceId,
      error
    };
  }

  private async resolveTarget(plan: InvestigationPlan) {
    if (plan.investigationId) {
      const investigation = await investigationService.getInvestigation(plan.investigationId);
      if (investigation?.targetId) {
        const target = await dataStore.target.findUnique({ where: { id: investigation.targetId } });
        if (target) return target;
      }
    }

    const existing = await dataStore.target.findUnique({ where: { name: plan.target } });
    if (existing) return existing;

    return dataStore.target.create({
      data: {
        name: plan.target,
        type: plan.targetType || detectTargetType(plan.target),
        priority: "medium",
        status: "active",
        description: "Created by v2 execution controller"
      }
    });
  }
}

export const executionController = new ExecutionController();
