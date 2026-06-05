import crypto from "node:crypto";
import { auditService } from "./auditService";
import { dataStore } from "./dataStore";

type IocInput = {
  type: string;
  value: string;
  riskScore?: number;
  riskLevel?: string;
  confidence?: number;
  tags?: string[];
  sources?: string[];
  metadata?: Record<string, unknown>;
  evidenceIds?: Array<string | number>;
  investigationIds?: string[];
};

const iocPatterns: Array<{ type: string; regex: RegExp }> = [
  { type: "EMAIL", regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi },
  { type: "URL", regex: /\bhttps?:\/\/[^\s"'<>]+/gi },
  { type: "IP", regex: /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g },
  { type: "HASH", regex: /\b[a-fA-F0-9]{32}\b|\b[a-fA-F0-9]{40}\b|\b[a-fA-F0-9]{64}\b/g },
  { type: "DOMAIN", regex: /\b(?!https?:\/\/)(?:[a-zA-Z0-9-]{1,63}\.)+[A-Za-z]{2,}\b/g },
  { type: "ASN", regex: /\bAS\d{1,10}\b/gi }
];

function normalizeType(type: string): string {
  return String(type || "UNKNOWN").trim().toUpperCase();
}

function riskLevelFromScore(score: number): string {
  if (score >= 75) return "CRITICAL";
  if (score >= 50) return "HIGH";
  if (score >= 25) return "MEDIUM";
  return "LOW";
}

export class IocService {
  async list(limit = 100, offset = 0, type?: string) {
    const where = type ? { type: normalizeType(type) } : {};
    return dataStore.ioc.findMany({ where, take: limit, skip: offset, orderBy: { lastSeen: "desc" } });
  }

  async get(id: string | number) {
    return dataStore.ioc.findUnique({ where: { id } });
  }

  async create(input: IocInput) {
    const type = normalizeType(input.type);
    const value = String(input.value || "").trim();
    const existing = await this.findByTypeValue(type, value);
    if (existing) return this.update(existing.id, input);

    const now = new Date().toISOString();
    const score = Number(input.riskScore || 0);
    const record = await dataStore.ioc.create({
      data: {
        iocId: crypto.randomUUID(),
        type,
        value,
        riskScore: score,
        riskLevel: input.riskLevel || riskLevelFromScore(score),
        confidence: Number(input.confidence ?? 50),
        tags: Array.isArray(input.tags) ? input.tags : [],
        firstSeen: now,
        lastSeen: now,
        sources: Array.isArray(input.sources) ? input.sources : [],
        evidenceIds: Array.isArray(input.evidenceIds) ? input.evidenceIds : [],
        investigationIds: Array.isArray(input.investigationIds) ? input.investigationIds : [],
        metadata: input.metadata || {}
      }
    });
    await auditService.record({ action: "ioc.created", targetType: "ioc", targetId: record.id, metadata: { type, value } });
    return record;
  }

  async update(id: string | number, input: Partial<IocInput>) {
    const existing = await this.get(id);
    if (!existing) throw new Error(`IOC not found: ${id}`);
    const mergedSources = Array.from(new Set([...(existing.sources || []), ...(input.sources || [])]));
    const mergedTags = Array.from(new Set([...(existing.tags || []), ...(input.tags || [])]));
    const mergedEvidence = Array.from(new Set([...(existing.evidenceIds || []), ...(input.evidenceIds || [])]));
    const mergedInvestigations = Array.from(new Set([...(existing.investigationIds || []), ...(input.investigationIds || [])]));
    const score = input.riskScore === undefined ? Number(existing.riskScore || 0) : Number(input.riskScore || 0);

    return dataStore.ioc.update({
      where: { id },
      data: {
        type: input.type ? normalizeType(input.type) : existing.type,
        value: input.value || existing.value,
        riskScore: score,
        riskLevel: input.riskLevel || existing.riskLevel || riskLevelFromScore(score),
        confidence: input.confidence === undefined ? existing.confidence : input.confidence,
        tags: mergedTags,
        lastSeen: new Date().toISOString(),
        sources: mergedSources,
        evidenceIds: mergedEvidence,
        investigationIds: mergedInvestigations,
        metadata: { ...(existing.metadata || {}), ...(input.metadata || {}) }
      }
    });
  }

  async search(query: string, filters: { type?: string; tag?: string } = {}) {
    const needle = String(query || "").trim();
    const where: any = {};
    if (filters.type) where.type = normalizeType(filters.type);
    const rows = await dataStore.ioc.findMany({ where, take: 500, orderBy: { lastSeen: "desc" } });
    return rows.filter((ioc) => {
      const matchesQuery = !needle || String(ioc.value || "").toLowerCase().includes(needle.toLowerCase());
      const matchesTag = !filters.tag || (ioc.tags || []).includes(filters.tag);
      return matchesQuery && matchesTag;
    });
  }

  async merge(sourceId: string | number, targetId: string | number) {
    const source = await this.get(sourceId);
    const target = await this.get(targetId);
    if (!source || !target) throw new Error("Both sourceId and targetId must exist");

    const updated = await this.update(target.id, {
      riskScore: Math.max(Number(source.riskScore || 0), Number(target.riskScore || 0)),
      confidence: Math.max(Number(source.confidence || 0), Number(target.confidence || 0)),
      tags: source.tags || [],
      sources: source.sources || [],
      evidenceIds: source.evidenceIds || [],
      investigationIds: source.investigationIds || [],
      metadata: { mergedFrom: [...(target.metadata?.mergedFrom || []), source.id] }
    });
    await dataStore.ioc.delete({ where: { id: source.id } });
    await auditService.record({ action: "ioc.merged", targetType: "ioc", targetId: target.id, metadata: { sourceId, targetId } });
    return updated;
  }

  async linkEvidence(iocId: string | number, evidenceId: string | number) {
    const existing = await this.get(iocId);
    if (!existing) throw new Error(`IOC not found: ${iocId}`);
    return this.update(existing.id, { evidenceIds: [evidenceId] });
  }

  async linkInvestigation(iocId: string | number, investigationId: string) {
    const existing = await this.get(iocId);
    if (!existing) throw new Error(`IOC not found: ${iocId}`);
    return this.update(existing.id, { investigationIds: [investigationId] });
  }

  async extractFromEvidence(evidence: any) {
    const text = JSON.stringify({
      summary: evidence.summary,
      raw: evidence.raw,
      tool: evidence.tool,
      source: evidence.source
    });
    const seen = new Set<string>();
    const createdOrUpdated: any[] = [];

    for (const pattern of iocPatterns) {
      const matches = text.match(pattern.regex) || [];
      for (const raw of matches.slice(0, 100)) {
        const value = raw.replace(/[),.;\]}]+$/g, "");
        const key = `${pattern.type}:${value.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const ioc = await this.create({
          type: pattern.type,
          value,
          confidence: pattern.type === "DOMAIN" && value.includes("@") ? 20 : 60,
          tags: ["auto_extracted"],
          sources: [evidence.tool || evidence.source || "evidence"],
          evidenceIds: [evidence.id],
          investigationIds: evidence.investigationId ? [evidence.investigationId] : [],
          metadata: { extractedFromEvidence: evidence.id }
        });
        createdOrUpdated.push(ioc);
      }
    }

    return createdOrUpdated;
  }

  private async findByTypeValue(type: string, value: string) {
    const rows = await dataStore.ioc.findMany({ where: { type, value }, take: 1 });
    return rows[0] || null;
  }
}

export const iocService = new IocService();
