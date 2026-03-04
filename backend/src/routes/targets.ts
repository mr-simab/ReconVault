import { Router } from "express";
import { prisma } from "../config/prisma";

export const targetsRouter = Router();

targetsRouter.get("/", async (req, res, next) => {
  try {
    const limit = Number(req.query.limit || 100);
    const offset = Number(req.query.offset || 0);
    const type = req.query.type ? String(req.query.type) : undefined;
    const where = type ? { type } : {};
    const [data, total] = await Promise.all([
      prisma.target.findMany({ where, skip: offset, take: limit, orderBy: { updatedAt: "desc" } }),
      prisma.target.count({ where })
    ]);
    res.json({ data, total, limit, offset });
  } catch (error) {
    next(error);
  }
});

targetsRouter.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const target = await prisma.target.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ status: "error", error: "Target not found" });
    res.json(target);
  } catch (error) {
    next(error);
  }
});

targetsRouter.post("/", async (req, res, next) => {
  try {
    const target = await prisma.target.create({
      data: {
        name: req.body.name,
        type: req.body.type || "UNKNOWN",
        priority: req.body.priority || "medium",
        status: req.body.status || "active",
        description: req.body.description || null
      }
    });
    res.status(201).json(target);
  } catch (error) {
    next(error);
  }
});

targetsRouter.put("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const target = await prisma.target.update({
      where: { id },
      data: {
        name: req.body.name,
        type: req.body.type,
        priority: req.body.priority,
        status: req.body.status,
        description: req.body.description
      }
    });
    res.json(target);
  } catch (error) {
    next(error);
  }
});

targetsRouter.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await prisma.target.delete({ where: { id } });
    res.json({ status: "success", message: "Target deleted" });
  } catch (error) {
    next(error);
  }
});
