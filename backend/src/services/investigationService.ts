import crypto from "node:crypto";
import { InvestigationPlan, ToolExecutionResult } from "../models/types";
import { detectTargetType } from "../utils/target";
import { auditService } from "./auditService";
import { dataStore } from "./dataStore";
import { iocService } from "./iocService";
import { timelineService } from "./timelineService";

type CreateInvestigationInput = {
  target: string;
  userRequest: string;
  goal?: string;
  createdBy?: string;
};

export class InvestigationService {
  async createInvestigation(input: CreateInvestigationInput) {
    const target = String(input.target || "").trim();
    if (!target) throw new Error("target is required");
    const targetRecord = await this.resolveTarget(target);
    const investigationId = crypto.randomUUID();
    const now = new Date().toISOString();

    const investigation = await dataStore.investigation.create({
      data: {
        investigationId,
        targetId: targetRecord.id,
        target,
        targetType: targetRecord.type,
        userRequest: input.userRequest || `Investigate ${target}`,
        goal: input.goal || "Perform reconnaissance and OSINT correlation",
        status: "PLANNING",
        createdBy: input.createdBy || "system",
        memory: {
          objectives: [input.goal || input.userRequest || `Investigate ${target}`],
          plannerHistory: [],
          importantFindings: [],
          riskDecisions: [],
          notes: []
        },
        startedAt: now,
        completedAt: null
      }
    });
    await auditService.record({
      action: "investigation.created",
      actor: input.createdBy || "system",
      targetType: "investigation",
      targetId: investigation.investigationId,
      metadata: { target, targetType: targetRecord.type }
    });
    await timelineService.record({
      investigationId: investigation.investigationId,
      eventType: "INVESTIGATION_CREATED",
      title: "Investigation created",
      description: investigation.userRequest,
      metadata: { target, targetType: targetRecord.type }
    });
    return investigation;
  }

  async listInvestigations(limit = 50, offset = 0) {
    return dataStore.investigation.findMany({ take: limit, skip: offset, orderBy: { updatedAt: "desc" } });
  }

  async getInvestigation(id: string | number) {
    const value = String(id);
    if (/^\d+$/.test(value)) {
      const byId = await dataStore.investigation.findUnique({ where: { id: value } });
      if (byId) return byId;
    }
    const rows = await dataStore.investigation.findMany({ where: { investigationId: value }, take: 1 });
    return rows[0] || null;
  }

  async updateStatus(id: string | number, status: string) {
    const investigation = await this.getInvestigation(id);
    if (!investigation) throw new Error(`Investigation not found: ${id}`);
    return dataStore.investigation.update({
      where: { id: investigation.id },
      data: {
        status,
        completedAt: ["COMPLETED", "FAILED", "CANCELLED"].includes(status) ? new Date().toISOString() : investigation.completedAt || null
      }
    });
  }

  async appendMemory(id: string | number, key: string, value: unknown) {
    const investigation = await this.getInvestigation(id);
    if (!investigation) throw new Error(`Investigation not found: ${id}`);
    const memory = investigation.memory || {};
    const current = Array.isArray(memory[key]) ? memory[key] : [];
    return dataStore.investigation.update({
      where: { id: investigation.id },
      data: {
        memory: {
          ...memory,
          [key]: [
            {
              value,
              timestamp: new Date().toISOString()
            },
            ...current
          ].slice(0, 100)
        }
      }
    });
  }

  async savePlan(plan: InvestigationPlan) {
    const existing = await dataStore.investigationPlan.findMany({ where: { planId: plan.planId }, take: 1 });
    const payload = {
      planId: plan.planId,
      investigationId: plan.investigationId || null,
      target: plan.target,
      targetType: plan.targetType,
      userRequest: plan.userRequest,
      reasoning: plan.reasoning,
      plannerMode: plan.plannerMode,
      provider: plan.provider || null,
      model: plan.model || null,
      steps: plan.steps,
      warnings: plan.warnings,
      createdAt: plan.createdAt
    };

    const record = existing[0]
      ? await dataStore.investigationPlan.update({ where: { id: existing[0].id }, data: payload })
      : await dataStore.investigationPlan.create({ data: payload });
    await auditService.record({
      action: "plan.created",
      targetType: "investigation_plan",
      targetId: plan.planId,
      metadata: { investigationId: plan.investigationId, steps: plan.steps.length }
    });
    await timelineService.record({
      investigationId: plan.investigationId,
      eventType: "PLAN_GENERATED",
      title: "Plan generated",
      description: `${plan.steps.length} step(s) generated`,
      metadata: { planId: plan.planId, plannerMode: plan.plannerMode }
    });
    return record;
  }

  async listPlans(investigationId: string) {
    return dataStore.investigationPlan.findMany({ where: { investigationId }, orderBy: { createdAt: "desc" }, take: 50 });
  }

  async saveExecutionRecord(investigationId: string | undefined, planId: string, result: ToolExecutionResult) {
    const record = await dataStore.toolExecution.create({
      data: {
        investigationId: investigationId || null,
        planId,
        stepId: result.stepId,
        tool: result.tool,
        status: result.status,
        startedAt: result.startedAt,
        completedAt: result.completedAt,
        outputSummary: result.outputSummary,
        evidenceId: result.evidenceId || null,
        error: result.error || null
      }
    });
    await timelineService.record({
      investigationId,
      eventType: "EXECUTION_RECORDED",
      title: `${result.tool} ${result.status}`,
      description: result.error || result.status,
      metadata: { planId, stepId: result.stepId, evidenceId: result.evidenceId }
    });
    return record;
  }

  async saveEvidence(input: {
    investigationId?: string;
    planId?: string;
    stepId?: string;
    tool?: string;
    type: string;
    source: string;
    summary: Record<string, unknown>;
    raw: unknown;
  }) {
    const evidence = await dataStore.evidence.create({
      data: {
        investigationId: input.investigationId || null,
        planId: input.planId || null,
        stepId: input.stepId || null,
        tool: input.tool || null,
        type: input.type,
        source: input.source,
        summary: input.summary,
        raw: input.raw,
        capturedAt: new Date().toISOString()
      }
    });
    await auditService.record({
      action: "evidence.created",
      targetType: "evidence",
      targetId: evidence.id,
      metadata: { investigationId: evidence.investigationId, type: evidence.type, tool: evidence.tool }
    });
    await timelineService.record({
      investigationId: evidence.investigationId,
      eventType: "EVIDENCE_ADDED",
      title: "Evidence added",
      description: evidence.tool || evidence.type,
      metadata: { evidenceId: evidence.id, type: evidence.type, source: evidence.source }
    });
    await iocService.extractFromEvidence(evidence);
    return evidence;
  }

  async listEvidence(investigationId: string, limit = 100) {
    return dataStore.evidence.findMany({ where: { investigationId }, take: limit, orderBy: { capturedAt: "desc" } });
  }

  private async resolveTarget(target: string) {
    const existingByName = await dataStore.target.findUnique({ where: { name: target } });
    if (existingByName) return existingByName;
    return dataStore.target.create({
      data: {
        name: target,
        type: detectTargetType(target),
        priority: "medium",
        status: "active",
        description: "Created by investigation workflow"
      }
    });
  }
}

export const investigationService = new InvestigationService();
