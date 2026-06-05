import { Router } from "express";
import { rbacService } from "../services/rbacService";

export const rbacRouter = Router();

rbacRouter.get("/roles", (_req, res) => {
  res.json({ data: rbacService.getDefaultRoles() });
});
