import crypto from "node:crypto";
import { dataStore } from "./dataStore";

type QueueStatus = "pending" | "running" | "completed" | "failed";

export class QueueService {
  async enqueue(type: string, payload: Record<string, unknown> = {}) {
    return dataStore.queueJob.create({
      data: {
        jobId: crypto.randomUUID(),
        type,
        status: "pending" as QueueStatus,
        payload,
        attempts: 0,
        result: null,
        error: null,
        enqueuedAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null
      }
    });
  }

  async dequeue(type?: string) {
    const where = type ? { status: "pending", type } : { status: "pending" };
    const jobs = await dataStore.queueJob.findMany({ where, take: 1, orderBy: { enqueuedAt: "asc" } });
    const job = jobs[0];
    if (!job) return null;
    return dataStore.queueJob.update({
      where: { id: job.id },
      data: {
        status: "running" as QueueStatus,
        attempts: Number(job.attempts || 0) + 1,
        startedAt: new Date().toISOString()
      }
    });
  }

  async complete(id: string | number, result: unknown) {
    return dataStore.queueJob.update({
      where: { id },
      data: {
        status: "completed" as QueueStatus,
        result,
        completedAt: new Date().toISOString()
      }
    });
  }

  async fail(id: string | number, error: string) {
    return dataStore.queueJob.update({
      where: { id },
      data: {
        status: "failed" as QueueStatus,
        error,
        completedAt: new Date().toISOString()
      }
    });
  }

  async getStatus(id: string | number) {
    return dataStore.queueJob.findUnique({ where: { id } });
  }

  async list(limit = 100, status?: string) {
    const where = status ? { status } : {};
    return dataStore.queueJob.findMany({ where, take: limit, orderBy: { enqueuedAt: "desc" } });
  }
}

export const queueService = new QueueService();
