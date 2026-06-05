import crypto from "node:crypto";
import { logger } from "../config/logger";
import { collectorsRegistry, defaultCollectors } from "../collectors";
import { CollectionTaskState } from "../models/types";
import { detectTargetType } from "../utils/target";
import { dataStore } from "./dataStore";
import { websocketHub } from "./websocketHub";

const taskStore = new Map<string, CollectionTaskState>();
const cancelledTasks = new Set<string>();

type StartCollectionInput = {
  target: string;
  targetId?: string | number;
  collectors?: string[];
  includeDarkWeb?: boolean;
  includeMedia?: boolean;
};

export class CollectionService {
  async startCollection(input: StartCollectionInput): Promise<CollectionTaskState> {
    const taskId = crypto.randomUUID();
    const collectorNames = this.resolveCollectors(input.collectors, input.includeDarkWeb, input.includeMedia);
    const targetRecord = await this.resolveTarget(input.target, input.targetId);

    const task: CollectionTaskState = {
      taskId,
      targetId: targetRecord.id,
      target: input.target,
      status: "RUNNING",
      progress: 0,
      entitiesCollected: 0,
      relationshipsCollected: 0,
      collectorsCompleted: [],
      collectorsFailed: [],
      errors: [],
      startTime: new Date().toISOString(),
      collectorsRequested: collectorNames
    };

    taskStore.set(taskId, task);

    await dataStore.collection.create({
      data: {
        taskId,
        targetId: task.targetId,
        status: task.status,
        progress: 0,
        entitiesCollected: 0,
        relationshipsCollected: 0,
        collectorsCompleted: [],
        collectorsFailed: [],
        errors: [],
        startTime: task.startTime,
        metadata: { target: input.target, collectorsRequested: collectorNames }
      }
    });

    this.runTask(taskId).catch((error: any) => {
      logger.error(`collection task failed unexpectedly: ${error.message}`);
    });

    return task;
  }

  async getTask(taskId: string): Promise<CollectionTaskState | null> {
    const memoryTask = taskStore.get(taskId);
    if (memoryTask) return memoryTask;

    const storedTask = await dataStore.collection.findUnique({ where: { taskId } });
    return storedTask ? this.toTaskState(storedTask) : null;
  }

  async getAllTasks(): Promise<CollectionTaskState[]> {
    const storedTasks = await dataStore.collection.findMany({ orderBy: { startTime: "desc" }, take: 100 });
    const tasks = new Map<string, CollectionTaskState>();
    for (const task of storedTasks) tasks.set(task.taskId, this.toTaskState(task));
    for (const task of taskStore.values()) tasks.set(task.taskId, task);
    return Array.from(tasks.values()).sort((a, b) => b.startTime.localeCompare(a.startTime));
  }

  async cancelTask(taskId: string): Promise<boolean> {
    const task = taskStore.get(taskId);
    if (!task || task.status !== "RUNNING") return false;
    cancelledTasks.add(taskId);
    task.status = "CANCELLED";
    task.endTime = new Date().toISOString();
    await this.persistTask(task);
    websocketHub.broadcast("collection_failed", { taskId, status: "CANCELLED" });
    return true;
  }

  async getTaskResults(taskId: string) {
    const task = await this.getTask(taskId);
    if (!task) return null;

    const entities = await dataStore.entity.findMany({ where: { targetId: task.targetId }, orderBy: { createdAt: "desc" }, take: 500 });
    const relationships = await dataStore.relationship.findMany({ orderBy: { createdAt: "desc" }, take: 500 });
    return { task, entities, relationships };
  }

  private async runTask(taskId: string): Promise<void> {
    const task = taskStore.get(taskId);
    if (!task) return;
    const requested = task.collectorsRequested;

    for (let i = 0; i < requested.length; i++) {
      const collectorName = requested[i];
      if (cancelledTasks.has(taskId)) break;

      const collector = collectorsRegistry[collectorName];
      if (!collector) {
        task.collectorsFailed.push(collectorName);
        task.errors.push(`Unknown collector: ${collectorName}`);
        continue;
      }

      try {
        const result = await collector.collect(task.target);
        const createdEntities = await Promise.all(
          result.findings.map((f) =>
            dataStore.entity.create({
              data: {
                type: f.type,
                value: f.value,
                riskLevel: f.riskLevel || "INFO",
                metadata: f.metadata || {},
                source: f.source,
                targetId: task.targetId
              }
            })
          )
        );
        task.entitiesCollected += createdEntities.length;

        const createdRelationships = await Promise.all(
          result.relationships.map((r) =>
            dataStore.relationship.create({
              data: {
                source: r.source,
                target: r.target,
                relationshipType: r.relationshipType,
                metadata: r.metadata || {}
              }
            })
          )
        );
        task.relationshipsCollected += createdRelationships.length;
        task.collectorsCompleted.push(collectorName);
      } catch (error: any) {
        task.collectorsFailed.push(collectorName);
        task.errors.push(`${collectorName}: ${error.message}`);
      }

      task.progress = Math.min(100, Math.round(((i + 1) / requested.length) * 100));
      await this.persistTask(task);
      websocketHub.broadcast("collection_progress", {
        taskId: task.taskId,
        progress: task.progress,
        collectorsCompleted: task.collectorsCompleted,
        collectorsFailed: task.collectorsFailed
      });
    }

    if (task.status !== "CANCELLED") {
      task.status = task.collectorsFailed.length > 0 && task.collectorsCompleted.length === 0 ? "FAILED" : "COMPLETED";
      task.endTime = new Date().toISOString();
      await this.persistTask(task);
      websocketHub.broadcast(task.status === "COMPLETED" ? "collection_completed" : "collection_failed", task);
    }
    cancelledTasks.delete(taskId);
  }

  private async persistTask(task: CollectionTaskState): Promise<void> {
    await dataStore.collection.update({
      where: { taskId: task.taskId },
      data: {
        status: task.status,
        progress: task.progress,
        entitiesCollected: task.entitiesCollected,
        relationshipsCollected: task.relationshipsCollected,
        collectorsCompleted: task.collectorsCompleted,
        collectorsFailed: task.collectorsFailed,
        errors: task.errors,
        endTime: task.endTime ? new Date(task.endTime) : null
      }
    });
  }

  private resolveCollectors(input?: string[], includeDarkWeb?: boolean, includeMedia?: boolean): string[] {
    const selected = input && input.length > 0 ? input : [...defaultCollectors];
    if (includeDarkWeb && !selected.includes("darkweb")) selected.push("darkweb");
    if (includeMedia && !selected.includes("media")) selected.push("media");
    return selected.filter((name) => collectorsRegistry[name]);
  }

  private async resolveTarget(target: string, targetId?: string | number) {
    if (targetId) {
      const existing = await dataStore.target.findUnique({ where: { id: targetId } });
      if (existing) return existing;
    }
    const type = detectTargetType(target);
    const existingByName = await dataStore.target.findUnique({ where: { name: target } });
    if (existingByName) return existingByName;
    return dataStore.target.create({ data: { name: target, type, priority: "medium", status: "active" } });
  }

  private toTaskState(record: any): CollectionTaskState {
    return {
      taskId: record.taskId,
      targetId: record.targetId,
      target: record.metadata?.target || record.target || "",
      status: record.status,
      progress: Number(record.progress || 0),
      entitiesCollected: Number(record.entitiesCollected || 0),
      relationshipsCollected: Number(record.relationshipsCollected || 0),
      collectorsCompleted: Array.isArray(record.collectorsCompleted) ? record.collectorsCompleted : [],
      collectorsFailed: Array.isArray(record.collectorsFailed) ? record.collectorsFailed : [],
      errors: Array.isArray(record.errors) ? record.errors : [],
      startTime: typeof record.startTime === "string" ? record.startTime : new Date(record.startTime).toISOString(),
      endTime: record.endTime ? (typeof record.endTime === "string" ? record.endTime : new Date(record.endTime).toISOString()) : undefined,
      collectorsRequested: Array.isArray(record.metadata?.collectorsRequested) ? record.metadata.collectorsRequested : []
    };
  }
}

export const collectionService = new CollectionService();
