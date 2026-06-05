import { dataStore } from "./dataStore";

type TimelineInput = {
  caseId?: string | number | null;
  investigationId?: string | null;
  eventType: string;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
};

export class TimelineService {
  async record(input: TimelineInput) {
    return dataStore.timeline.create({
      data: {
        caseId: input.caseId === undefined ? null : input.caseId,
        investigationId: input.investigationId || null,
        eventType: input.eventType,
        title: input.title,
        description: input.description || "",
        metadata: input.metadata || {},
        createdAt: new Date().toISOString()
      }
    });
  }

  async list(limit = 100, offset = 0) {
    return dataStore.timeline.findMany({ take: limit, skip: offset, orderBy: { createdAt: "desc" } });
  }

  async listByInvestigation(investigationId: string) {
    return dataStore.timeline.findMany({ where: { investigationId }, take: 200, orderBy: { createdAt: "desc" } });
  }

  async listByCase(caseId: string | number) {
    return dataStore.timeline.findMany({ where: { caseId: String(caseId) }, take: 200, orderBy: { createdAt: "desc" } });
  }
}

export const timelineService = new TimelineService();
