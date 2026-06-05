import { Router } from "express";
import { analystService } from "../services/analystService";
import { dataStore } from "../services/dataStore";
import { executionController } from "../services/executionController";
import { investigationService } from "../services/investigationService";
import { planningService } from "../services/planningService";

export const investigationsRouter = Router();

investigationsRouter.get("/", async (req, res, next) => {
  try {
    const limit = Number(req.query.limit || 50);
    const offset = Number(req.query.offset || 0);
    const investigations = await investigationService.listInvestigations(limit, offset);
    res.json({ data: investigations, total: investigations.length, limit, offset });
  } catch (error) {
    next(error);
  }
});

investigationsRouter.post("/", async (req, res, next) => {
  try {
    const body = req.body || {};
    const target = body.target || body.name;
    if (!target) return res.status(400).json({ status: "error", error: "target is required" });

    const investigation = await investigationService.createInvestigation({
      target,
      userRequest: body.user_request || body.userRequest || `Investigate ${target}`,
      goal: body.goal,
      createdBy: body.created_by || body.createdBy
    });
    res.status(201).json(investigation);
  } catch (error) {
    next(error);
  }
});

investigationsRouter.get("/:id/plans", async (req, res, next) => {
  try {
    const investigation = await investigationService.getInvestigation(req.params.id);
    if (!investigation) return res.status(404).json({ status: "error", error: "Investigation not found" });
    const plans = await investigationService.listPlans(investigation.investigationId);
    res.json({ data: plans, total: plans.length });
  } catch (error) {
    next(error);
  }
});

investigationsRouter.post("/:id/plan", async (req, res, next) => {
  try {
    const investigation = await investigationService.getInvestigation(req.params.id);
    if (!investigation) return res.status(404).json({ status: "error", error: "Investigation not found" });

    const plan = await planningService.createPlan({
      investigationId: investigation.investigationId,
      target: investigation.target,
      userRequest: req.body?.user_request || req.body?.userRequest || investigation.userRequest,
      currentFindings: req.body?.current_findings || req.body?.currentFindings,
      investigationState: req.body?.investigation_state || req.body?.investigationState
    });
    await investigationService.savePlan(plan);
    await investigationService.appendMemory(investigation.investigationId, "plannerHistory", {
      planId: plan.planId,
      steps: plan.steps.map((step) => ({ id: step.id, tool: step.tool, purpose: step.purpose }))
    });

    res.status(201).json({ plan, persisted: true });
  } catch (error) {
    next(error);
  }
});

investigationsRouter.post("/:id/execute", async (req, res, next) => {
  try {
    const investigation = await investigationService.getInvestigation(req.params.id);
    if (!investigation) return res.status(404).json({ status: "error", error: "Investigation not found" });

    const body = req.body || {};
    let plan = body.plan;

    if (!plan) {
      const planId = body.plan_id || body.planId;
      const plans = await investigationService.listPlans(investigation.investigationId);
      plan = planId ? plans.find((candidate) => candidate.planId === planId) : plans[0];
    }

    if (!plan) {
      plan = await planningService.createPlan({
        investigationId: investigation.investigationId,
        target: investigation.target,
        userRequest: body.user_request || body.userRequest || investigation.userRequest
      });
      await investigationService.savePlan(plan);
    }

    plan.investigationId = investigation.investigationId;
    plan.target = plan.target || investigation.target;
    plan.targetType = plan.targetType || investigation.targetType;

    const result = await executionController.executePlan(plan, {
      dryRun: Boolean(body.dry_run || body.dryRun),
      approvedTools: body.approved_tools || body.approvedTools || []
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

investigationsRouter.post("/:id/analyze", async (req, res, next) => {
  try {
    const investigation = await investigationService.getInvestigation(req.params.id);
    if (!investigation) return res.status(404).json({ status: "error", error: "Investigation not found" });
    const report = await analystService.analyze({
      investigationId: investigation.investigationId,
      target: investigation.target,
      objective: req.body?.objective || investigation.goal || investigation.userRequest
    });
    res.json({ report });
  } catch (error) {
    next(error);
  }
});

investigationsRouter.get("/:id/evidence", async (req, res, next) => {
  try {
    const investigation = await investigationService.getInvestigation(req.params.id);
    if (!investigation) return res.status(404).json({ status: "error", error: "Investigation not found" });
    const evidence = await investigationService.listEvidence(investigation.investigationId, Number(req.query.limit || 100));
    res.json({ data: evidence, total: evidence.length });
  } catch (error) {
    next(error);
  }
});

investigationsRouter.get("/:id/executions", async (req, res, next) => {
  try {
    const investigation = await investigationService.getInvestigation(req.params.id);
    if (!investigation) return res.status(404).json({ status: "error", error: "Investigation not found" });
    const executions = await dataStore.toolExecution.findMany({
      where: { investigationId: investigation.investigationId },
      take: Number(req.query.limit || 100),
      orderBy: { startedAt: "desc" }
    });
    res.json({ data: executions, total: executions.length });
  } catch (error) {
    next(error);
  }
});

investigationsRouter.post("/:id/memory", async (req, res, next) => {
  try {
    const investigation = await investigationService.getInvestigation(req.params.id);
    if (!investigation) return res.status(404).json({ status: "error", error: "Investigation not found" });
    const key = req.body?.key || "notes";
    const value = req.body?.value ?? req.body?.note;
    if (value === undefined) return res.status(400).json({ status: "error", error: "value is required" });
    const updated = await investigationService.appendMemory(investigation.investigationId, key, value);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

investigationsRouter.get("/:id", async (req, res, next) => {
  try {
    const investigation = await investigationService.getInvestigation(req.params.id);
    if (!investigation) return res.status(404).json({ status: "error", error: "Investigation not found" });
    res.json(investigation);
  } catch (error) {
    next(error);
  }
});
