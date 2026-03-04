import { Router } from "express";
import { prisma } from "../config/prisma";

export const entitiesRouter = Router();

entitiesRouter.get("/", async (req, res, next) => {
  try {
    const limit = Number(req.query.limit || 100);
    const offset = Number(req.query.offset || 0);
    const type = req.query.type ? String(req.query.type) : undefined;
    const targetId = req.query.target_id ? Number(req.query.target_id) : undefined;
    const where: any = {};
    if (type) where.type = type;
    if (targetId) where.targetId = targetId;
    const [data, total] = await Promise.all([
      prisma.entity.findMany({ where, skip: offset, take: limit, orderBy: { createdAt: "desc" } }),
      prisma.entity.count({ where })
    ]);
    res.json({ data, total, limit, offset });
  } catch (error) {
    next(error);
  }
});

entitiesRouter.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const entity = await prisma.entity.findUnique({ where: { id } });
    if (!entity) return res.status(404).json({ status: "error", error: "Entity not found" });
    res.json(entity);
  } catch (error) {
    next(error);
  }
});

entitiesRouter.post("/", async (req, res, next) => {
  try {
    const entity = await prisma.entity.create({
      data: {
        type: req.body.type,
        value: req.body.value,
        riskLevel: req.body.riskLevel || "INFO",
        metadata: req.body.metadata || {},
        source: req.body.source || "MANUAL",
        targetId: Number(req.body.targetId)
      }
    });
    res.status(201).json(entity);
  } catch (error) {
    next(error);
  }
});

entitiesRouter.put("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const entity = await prisma.entity.update({
      where: { id },
      data: {
        type: req.body.type,
        value: req.body.value,
        riskLevel: req.body.riskLevel,
        metadata: req.body.metadata,
        source: req.body.source
      }
    });
    res.json(entity);
  } catch (error) {
    next(error);
  }
});

entitiesRouter.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await prisma.entity.delete({ where: { id } });
    res.json({ status: "success", message: "Entity deleted" });
  } catch (error) {
    next(error);
  }
});
