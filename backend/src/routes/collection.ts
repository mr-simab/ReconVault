import { Router } from "express";
import { collectionService } from "../services/collectionService";

export const collectionRouter = Router();

async function sendTaskResults(taskId: string, res: any) {
  const result = await collectionService.getTaskResults(taskId);
  if (!result) return res.status(404).json({ status: "error", error: "Task not found" });
  if (result.task.status !== "COMPLETED" && result.task.status !== "FAILED") {
    return res.status(400).json({ status: "error", error: `Task not completed. Status=${result.task.status}` });
  }
  return res.json({
    task_id: result.task.taskId,
    status: result.task.status,
    entities_created: result.task.entitiesCollected,
    relationships_created: result.task.relationshipsCollected,
    entities: result.entities,
    relationships: result.relationships
  });
}

async function cancelTask(taskId: string, res: any) {
  const success = await collectionService.cancelTask(taskId);
  if (!success) return res.status(400).json({ status: "error", error: "Task is not running or not found" });
  return res.json({ task_id: taskId, status: "CANCELLED", message: "Task cancelled successfully" });
}

collectionRouter.post("/start", async (req, res, next) => {
  try {
    const body = req.body || {};
    const target = body.target || body.name;
    if (!target) return res.status(400).json({ status: "error", error: "target is required" });

    const task = await collectionService.startCollection({
      target: String(target),
      targetId: body.target_id ? Number(body.target_id) : body.targetId ? Number(body.targetId) : undefined,
      collectors: body.collectors || body.collection_types || body.types,
      includeDarkWeb: Boolean(body.include_dark_web ?? body.includeDarkWeb),
      includeMedia: Boolean(body.include_media ?? body.includeMedia)
    });
    res.status(202).json({ task_id: task.taskId, target: task.target, status: task.status, estimated_time: 60 });
  } catch (error) {
    next(error);
  }
});

collectionRouter.get("/tasks/:taskId", (req, res) => {
  const task = collectionService.getTask(req.params.taskId);
  if (!task) return res.status(404).json({ status: "error", error: "Task not found" });
  res.json({
    task_id: task.taskId,
    target: task.target,
    status: task.status,
    progress_percent: task.progress,
    collectors_completed: task.collectorsCompleted,
    collectors_failed: task.collectorsFailed,
    entities_collected: task.entitiesCollected,
    relationships_collected: task.relationshipsCollected,
    errors: task.errors,
    start_time: task.startTime,
    end_time: task.endTime
  });
});

collectionRouter.get("/results/:taskId", async (req, res, next) => {
  try {
    await sendTaskResults(req.params.taskId, res);
  } catch (error) {
    next(error);
  }
});

collectionRouter.get("/tasks/:taskId/results", async (req, res, next) => {
  try {
    await sendTaskResults(req.params.taskId, res);
  } catch (error) {
    next(error);
  }
});

collectionRouter.post("/cancel/:taskId", async (req, res, next) => {
  try {
    await cancelTask(req.params.taskId, res);
  } catch (error) {
    next(error);
  }
});

collectionRouter.post("/tasks/:taskId/cancel", async (req, res, next) => {
  try {
    await cancelTask(req.params.taskId, res);
  } catch (error) {
    next(error);
  }
});

collectionRouter.get("/history", (_req, res) => {
  const tasks = collectionService.getAllTasks();
  res.json({ tasks, total: tasks.length });
});

collectionRouter.get("/tasks", (_req, res) => {
  const tasks = collectionService.getAllTasks();
  res.json({ tasks, total: tasks.length });
});

collectionRouter.get("/sources", (_req, res) => {
  res.json({
    sources: {
      domain: { name: "Domain Collector", capabilities: ["whois_lookup", "dns_enumeration", "ssl_tls", "wayback", "reputation"] },
      email: { name: "Email Collector", capabilities: ["validation", "hibp_breaches", "mx_lookup", "account_presence"] },
      ip: { name: "IP Collector", capabilities: ["geolocation", "reverse_dns", "reputation", "whois", "vpn_proxy", "shodan"] },
      web: { name: "Web Collector", capabilities: ["scraping", "dynamic_scraping", "subdomains", "technology_detection"] },
      social: { name: "Social Collector", capabilities: ["github", "reddit", "twitter_status"] },
      geo: { name: "Geo Collector", capabilities: ["geocoding", "reverse_geocoding", "nearby_businesses"] },
      media: { name: "Media Collector", capabilities: ["exif", "ocr", "face_detection"] },
      darkweb: { name: "Darkweb Collector", capabilities: ["tor_lookup"], requires_tor: true }
    }
  });
});
