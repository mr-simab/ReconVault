import { Router } from "express";
import { dataStore } from "../services/dataStore";

export const complianceRouter = Router();

type ComplianceViolation = {
  id: string | number;
  severity: string;
  violation_type: string;
  message: string;
  source: string;
  collection_id?: string | number | null;
  resolved: boolean;
  created_at: string;
  resolved_at?: string | null;
  metadata?: Record<string, any>;
};

function emptyComplianceStatus() {
  return {
    status: "green",
    compliance_score: 100,
    total_violations: 0,
    unresolved_violations: 0,
    critical_violations: 0,
    last_violation: null,
    violations: [],
    metadata: {
      backend: "firebase_rtdb",
      degraded: !dataStore.configured
    }
  };
}

function toViolation(record: any): ComplianceViolation | null {
  const metadata = record?.metadata || {};
  const raw = metadata.violation || metadata.complianceViolation || record;
  const type = raw.violation_type || raw.violationType || record.action;

  if (!String(type || "").toLowerCase().includes("violation")) return null;

  return {
    id: record.id,
    severity: raw.severity || "low",
    violation_type: type || "policy_violation",
    message: raw.message || record.description || "Compliance policy event recorded.",
    source: raw.source || record.targetType || "system",
    collection_id: raw.collection_id || raw.collectionId || record.targetId || null,
    resolved: Boolean(raw.resolved),
    created_at: record.createdAt || raw.created_at || new Date().toISOString(),
    resolved_at: raw.resolved_at || raw.resolvedAt || null,
    metadata
  };
}

async function listViolations(filters: { resolved?: string; severity?: string } = {}) {
  if (!dataStore.configured) return [];

  try {
    const logs = await dataStore.auditLog.findMany({ take: 200, orderBy: { createdAt: "desc" } });
    return logs
      .map(toViolation)
      .filter(Boolean)
      .filter((item: any) => filters.resolved === undefined || String(item.resolved) === String(filters.resolved))
      .filter((item: any) => !filters.severity || String(item.severity).toLowerCase() === String(filters.severity).toLowerCase());
  } catch {
    return [];
  }
}

complianceRouter.get("/status", async (_req, res) => {
  const violations = await listViolations({ resolved: "false" });
  if (violations.length === 0) return res.json(emptyComplianceStatus());

  const critical = violations.filter((item: any) => String(item.severity).toLowerCase() === "critical").length;
  const high = violations.filter((item: any) => String(item.severity).toLowerCase() === "high").length;
  const penalty = critical * 20 + high * 10 + Math.max(0, violations.length - critical - high) * 3;
  const score = Math.max(0, 100 - penalty);

  res.json({
    status: critical > 0 ? "red" : high > 0 ? "yellow" : "green",
    compliance_score: score,
    total_violations: violations.length,
    unresolved_violations: violations.filter((item: any) => !item.resolved).length,
    critical_violations: critical,
    last_violation: violations[0]?.created_at || null,
    violations,
    metadata: {
      backend: "firebase_rtdb",
      degraded: false
    }
  });
});

complianceRouter.get("/violations", async (req, res) => {
  const violations = await listViolations({
    resolved: req.query.resolved === undefined ? undefined : String(req.query.resolved),
    severity: req.query.severity ? String(req.query.severity) : undefined
  });
  res.json({ violations, total: violations.length });
});

complianceRouter.delete("/violations/:id", async (req, res) => {
  if (dataStore.configured) {
    try {
      const existing = await dataStore.auditLog.findUnique({ where: { id: req.params.id } });
      if (existing) {
        const metadata = {
          ...(existing.metadata || {}),
          violation: {
            ...((existing.metadata || {}).violation || {}),
            resolved: true,
            resolved_at: new Date().toISOString(),
            resolution_notes: req.body?.notes || "Resolved by operator"
          }
        };
        await dataStore.auditLog.update({ where: { id: req.params.id }, data: { metadata } });
      }
    } catch {
      // Keep resolution idempotent in degraded or partially configured environments.
    }
  }

  res.json({ status: "resolved", id: req.params.id });
});

complianceRouter.get("/logs", async (_req, res) => {
  if (!dataStore.configured) return res.json({ logs: [], total: 0, metadata: { degraded: true } });

  try {
    const logs = await dataStore.auditLog.findMany({ take: 100, orderBy: { createdAt: "desc" } });
    res.json({ logs, total: logs.length, metadata: { degraded: false } });
  } catch {
    res.json({ logs: [], total: 0, metadata: { degraded: true } });
  }
});

complianceRouter.get("/rate-limits", (_req, res) => {
  res.json({
    status: "available",
    policy: "collector-level throttling",
    limits: [],
    metadata: { degraded: !dataStore.configured }
  });
});
