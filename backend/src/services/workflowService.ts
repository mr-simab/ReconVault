import { analystService } from "./analystService";
import { auditService } from "./auditService";
import { executionController } from "./executionController";
import { investigationService } from "./investigationService";
import { planningService } from "./planningService";
import { queueService } from "./queueService";
import { timelineService } from "./timelineService";

type RunWorkflowInput = {
  target: string;
  userRequest: string;
  goal?: string;
  maxIterations?: number;
  approvedTools?: string[];
  dryRun?: boolean;
  queue?: boolean;
};

export class WorkflowService {
  async runInvestigation(input: RunWorkflowInput) {
    const maxIterations = Math.max(1, Math.min(Number(input.maxIterations || 1), 5));
    const investigation = await investigationService.createInvestigation({
      target: input.target,
      userRequest: input.userRequest,
      goal: input.goal
    });
    const queueJob = input.queue ? await queueService.enqueue("workflow.investigation", {
      investigationId: investigation.investigationId,
      target: input.target,
      maxIterations
    }) : null;
    await auditService.record({
      action: "workflow.started",
      targetType: "investigation",
      targetId: investigation.investigationId,
      metadata: { maxIterations, dryRun: Boolean(input.dryRun), queueJobId: queueJob?.id || null }
    });

    const completedTools = new Set<string>();
    const iterations: any[] = [];

    for (let index = 0; index < maxIterations; index++) {
      const plan = await planningService.createPlan({
        investigationId: investigation.investigationId,
        target: investigation.target,
        userRequest: input.userRequest,
        investigationState: {
          iteration: index + 1,
          completedTools: Array.from(completedTools)
        }
      });

      plan.steps = plan.steps.filter((step) => {
        if (["correlate_findings", "risk_assessment"].includes(step.tool)) return true;
        return !completedTools.has(step.tool);
      });

      await investigationService.savePlan(plan);
      await investigationService.appendMemory(investigation.investigationId, "plannerHistory", {
        iteration: index + 1,
        planId: plan.planId,
        steps: plan.steps.map((step) => ({ id: step.id, tool: step.tool, purpose: step.purpose }))
      });

      if (plan.steps.length === 0) {
        iterations.push({
          iteration: index + 1,
          plan,
          execution: null,
          analysis: {
            summary: "No new executable steps were generated after removing duplicate tools.",
            stop_condition_met: true
          }
        });
        break;
      }

      const execution = await executionController.executePlan(plan, {
        dryRun: input.dryRun,
        approvedTools: input.approvedTools || []
      });

      for (const result of execution.results) {
        if (result.status === "completed") completedTools.add(result.tool);
      }

      const analysis = await analystService.analyze({
        investigationId: investigation.investigationId,
        target: investigation.target,
        objective: input.goal || input.userRequest
      });

      iterations.push({
        iteration: index + 1,
        plan,
        execution,
        analysis
      });

      if (input.dryRun || analysis.stop_condition_met) break;
    }

    const finalInvestigation = await investigationService.getInvestigation(investigation.investigationId);
    const result = {
      investigation: finalInvestigation || investigation,
      iterations,
      completedTools: Array.from(completedTools)
    };
    if (queueJob) await queueService.complete(queueJob.id, { iterations: iterations.length, completedTools: Array.from(completedTools) });
    await auditService.record({
      action: "workflow.completed",
      targetType: "investigation",
      targetId: investigation.investigationId,
      metadata: { iterations: iterations.length, completedTools: Array.from(completedTools) }
    });
    await timelineService.record({
      investigationId: investigation.investigationId,
      eventType: "WORKFLOW_COMPLETED",
      title: "Workflow completed",
      description: `${iterations.length} iteration(s) completed`,
      metadata: { completedTools: Array.from(completedTools), queueJobId: queueJob?.id || null }
    });
    return result;
  }
}

export const workflowService = new WorkflowService();
