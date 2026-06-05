import { Router } from "express";
import { analystService } from "../services/analystService";
import { investigationService } from "../services/investigationService";
import { llmProviderService } from "../services/llmProviderService";
import { planningService } from "../services/planningService";

export const aiRouter = Router();

aiRouter.get("/providers", (_req, res) => {
  res.json(llmProviderService.getStatus());
});

aiRouter.post("/plan", async (req, res, next) => {
  try {
    const body = req.body || {};
    const investigationId = body.investigation_id || body.investigationId;
    const userRequest = body.user_request || body.userRequest || body.goal || "";
    const target = body.target || body.name;

    if (!userRequest && !target) {
      return res.status(400).json({ status: "error", error: "user_request or target is required" });
    }

    const plan = await planningService.createPlan({
      investigationId,
      target,
      userRequest: userRequest || `Investigate ${target}`,
      currentFindings: body.current_findings || body.currentFindings,
      investigationState: body.investigation_state || body.investigationState
    });

    let persisted = false;
    if (investigationId) {
      try {
        await investigationService.savePlan(plan);
        await investigationService.appendMemory(investigationId, "plannerHistory", {
          planId: plan.planId,
          steps: plan.steps.map((step) => ({ id: step.id, tool: step.tool, purpose: step.purpose }))
        });
        persisted = true;
      } catch (error: any) {
        plan.warnings.push(`Plan was generated but not persisted: ${error.message}`);
      }
    }

    return res.json({ plan, persisted });
  } catch (error) {
    next(error);
  }
});

aiRouter.post("/analyze", async (req, res, next) => {
  try {
    const body = req.body || {};
    const report = await analystService.analyze({
      investigationId: body.investigation_id || body.investigationId,
      target: body.target,
      objective: body.objective || body.user_request || body.userRequest
    });
    res.json({ report });
  } catch (error) {
    next(error);
  }
});
