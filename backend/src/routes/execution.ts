import { Router } from "express";
import { executionController } from "../services/executionController";

export const executionRouter = Router();

executionRouter.post("/validate", (req, res) => {
  const plan = req.body?.plan || req.body;
  if (!plan?.steps) return res.status(400).json({ status: "error", error: "plan with steps is required" });
  res.json(executionController.validate(plan));
});

executionRouter.post("/", async (req, res, next) => {
  try {
    const body = req.body || {};
    const plan = body.plan || body;
    if (!plan?.steps) return res.status(400).json({ status: "error", error: "plan with steps is required" });

    const result = await executionController.executePlan(plan, {
      dryRun: Boolean(body.dry_run || body.dryRun),
      approvedTools: body.approved_tools || body.approvedTools || []
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});
