import { prisma } from "../config/prisma";

const riskWeights: Record<string, number> = {
  CRITICAL: 90,
  HIGH: 70,
  MEDIUM: 50,
  LOW: 25,
  INFO: 10
};

export class RiskService {
  async assessTarget(targetId: number) {
    const entities = await prisma.entity.findMany({ where: { targetId } });
    if (!entities.length) {
      return { targetId, score: 0, level: "INFO", factors: [] };
    }

    const total = entities.reduce((acc, e) => acc + (riskWeights[e.riskLevel] || 10), 0);
    const score = Math.min(100, Math.round(total / entities.length));
    const level = score >= 80 ? "CRITICAL" : score >= 60 ? "HIGH" : score >= 40 ? "MEDIUM" : score >= 20 ? "LOW" : "INFO";

    const factorMap = new Map<string, number>();
    for (const entity of entities) {
      factorMap.set(entity.type, (factorMap.get(entity.type) || 0) + 1);
    }

    const factors = Array.from(factorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    return { targetId, score, level, factors, entityCount: entities.length };
  }
}

export const riskService = new RiskService();
