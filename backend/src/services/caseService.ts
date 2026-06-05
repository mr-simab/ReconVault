import { auditService } from "./auditService";
import { dataStore } from "./dataStore";
import { timelineService } from "./timelineService";

type CaseInput = {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  tags?: string[];
  createdBy?: string;
  investigationIds?: string[];
};

export class CaseService {
  async list(limit = 100, offset = 0) {
    return dataStore.case.findMany({ take: limit, skip: offset, orderBy: { updatedAt: "desc" } });
  }

  async create(input: CaseInput) {
    const record = await dataStore.case.create({
      data: {
        title: input.title,
        description: input.description || "",
        status: input.status || "OPEN",
        priority: input.priority || "medium",
        tags: Array.isArray(input.tags) ? input.tags : [],
        createdBy: input.createdBy || "system",
        investigationIds: Array.isArray(input.investigationIds) ? input.investigationIds : [],
        timelineIds: []
      }
    });

    await auditService.record({ action: "case.created", targetType: "case", targetId: record.id, metadata: { title: record.title } });
    const timeline = await timelineService.record({
      caseId: record.id,
      eventType: "CASE_CREATED",
      title: "Case created",
      description: record.title,
      metadata: { priority: record.priority, status: record.status }
    });
    await dataStore.case.update({ where: { id: record.id }, data: { timelineIds: [timeline.id] } });
    return { ...record, timelineIds: [timeline.id] };
  }

  async get(id: string | number) {
    return dataStore.case.findUnique({ where: { id } });
  }

  async update(id: string | number, input: Partial<CaseInput>) {
    const existing = await this.get(id);
    if (!existing) return null;
    const updated = await dataStore.case.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description,
        status: input.status,
        priority: input.priority,
        tags: input.tags,
        investigationIds: input.investigationIds
      }
    });
    await auditService.record({ action: "case.updated", targetType: "case", targetId: id, metadata: input as Record<string, unknown> });
    await timelineService.record({
      caseId: id,
      eventType: "CASE_UPDATED",
      title: "Case updated",
      description: updated.title,
      metadata: { status: updated.status, priority: updated.priority }
    });
    return updated;
  }

  async delete(id: string | number) {
    await auditService.record({ action: "case.deleted", targetType: "case", targetId: id });
    return dataStore.case.delete({ where: { id } });
  }

  async addInvestigation(id: string | number, investigationId: string) {
    const existing = await this.get(id);
    if (!existing) throw new Error(`Case not found: ${id}`);
    const investigationIds = Array.from(new Set([...(existing.investigationIds || []), investigationId]));
    const updated = await dataStore.case.update({ where: { id }, data: { investigationIds } });
    await auditService.record({
      action: "case.investigation_linked",
      targetType: "case",
      targetId: id,
      metadata: { investigationId }
    });
    await timelineService.record({
      caseId: id,
      investigationId,
      eventType: "INVESTIGATION_LINKED",
      title: "Investigation linked to case",
      description: investigationId,
      metadata: { investigationId }
    });
    return updated;
  }
}

export const caseService = new CaseService();
