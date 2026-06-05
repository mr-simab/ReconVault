import { Router } from "express";
import { workflowService } from "../services/workflowService";

export const workflowsRouter = Router();

workflowsRouter.post("/investigation", async (req, res, next) => {
  try {
    const body = req.body || {};
    const target = body.target || body.name;
    const userRequest = body.user_request || body.userRequest || body.goal || "";
    if (!target) return res.status(400).json({ status: "error", error: "target is required" });

    const result = await workflowService.runInvestigation({
      target: String(target),
      userRequest: userRequest || `Investigate ${target}`,
      goal: body.goal,
      maxIterations: body.max_iterations || body.maxIterations,
      approvedTools: body.approved_tools || body.approvedTools || [],
      dryRun: Boolean(body.dry_run || body.dryRun),
      queue: Boolean(body.queue)
    });

    res.status(202).json(result);
  } catch (error) {
    next(error);
  }
});
