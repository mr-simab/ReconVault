import { dataStore } from "./dataStore";

type AuditInput = {
  action: string;
  actor?: string;
  targetType: string;
  targetId?: string | number | null;
  metadata?: Record<string, unknown>;
};

export class AuditService {
  async record(input: AuditInput) {
    return dataStore.auditLog.create({
      data: {
        action: input.action,
        actor: input.actor || "system",
        targetType: input.targetType,
        targetId: input.targetId === undefined ? null : input.targetId,
        metadata: input.metadata || {},
        createdAt: new Date().toISOString()
      }
    });
  }

  async list(limit = 100, offset = 0) {
    return dataStore.auditLog.findMany({ take: limit, skip: offset, orderBy: { createdAt: "desc" } });
  }

  async get(id: string | number) {
    return dataStore.auditLog.findUnique({ where: { id } });
  }
}

export const auditService = new AuditService();
