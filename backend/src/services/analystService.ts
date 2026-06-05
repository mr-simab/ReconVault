import { dataStore } from "./dataStore";
import { investigationService } from "./investigationService";
import { llmProviderService } from "./llmProviderService";
import { riskService } from "./riskService";
import { timelineService } from "./timelineService";

type AnalysisInput = {
  investigationId?: string;
  target?: string;
  objective?: string;
};

function levelFromScore(score: number): string {
  if (score >= 75) return "CRITICAL";
  if (score >= 50) return "HIGH";
  if (score >= 25) return "MEDIUM";
  return "LOW";
}

export class AnalystService {
  async analyze(input: AnalysisInput) {
    const investigation = input.investigationId ? await investigationService.getInvestigation(input.investigationId) : null;
    const target = input.target || investigation?.target || "";
    const evidence = investigation?.investigationId ? await investigationService.listEvidence(investigation.investigationId, 50) : [];
    const executions = investigation?.investigationId
      ? await dataStore.toolExecution.findMany({ where: { investigationId: investigation.investigationId }, take: 100, orderBy: { startedAt: "desc" } })
      : [];
    const risk = investigation?.targetId ? await riskService.assessTarget(investigation.targetId) : null;

    const providerResult = await llmProviderService.completeJson([
      {
        role: "system",
        content: [
          "You are the ReconVault AI analyst.",
          "Return JSON only.",
          "Explain what collected evidence means for OSINT/reconnaissance and risk analysis.",
          "Do not invent findings. Use only the provided summaries.",
          "Do not recommend exploitation or unauthorized activity."
        ].join(" ")
      },
      {
        role: "user",
        content: JSON.stringify({
          expected_schema: {
            summary: "short executive summary",
            risk_level: "LOW|MEDIUM|HIGH|CRITICAL",
            key_findings: ["evidence-backed finding"],
            relationships: ["important relationship"],
            evidence_refs: ["evidence id or tool"],
            next_actions: ["safe next action"],
            stop_condition_met: false
          },
          target,
          objective: input.objective || investigation?.goal || investigation?.userRequest,
          risk,
          evidence: evidence.map((item) => ({
            id: item.id,
            tool: item.tool,
            type: item.type,
            source: item.source,
            summary: item.summary,
            capturedAt: item.capturedAt
          })),
          executions: executions.map((item) => ({
            stepId: item.stepId,
            tool: item.tool,
            status: item.status,
            outputSummary: item.outputSummary,
            error: item.error
          }))
        })
      }
    ]);

    const report = providerResult.parsed || this.createFallbackReport(target, evidence, executions, risk);
    const normalizedReport = {
      target,
      investigationId: investigation?.investigationId || input.investigationId || null,
      analystMode: providerResult.parsed ? "llm_provider" : "deterministic_fallback",
      providerError: providerResult.error || null,
      generatedAt: new Date().toISOString(),
      ...report
    };

    if (investigation?.investigationId) {
      const evidenceRecord = await investigationService.saveEvidence({
        investigationId: investigation.investigationId,
        type: "analysis_report",
        source: "ReconVault Analyst",
        summary: {
          riskLevel: normalizedReport.risk_level,
          keyFindingCount: Array.isArray(normalizedReport.key_findings) ? normalizedReport.key_findings.length : 0,
          nextActionCount: Array.isArray(normalizedReport.next_actions) ? normalizedReport.next_actions.length : 0
        },
        raw: normalizedReport
      });
      await investigationService.appendMemory(investigation.investigationId, "riskDecisions", {
        reportEvidenceId: evidenceRecord.id,
        riskLevel: normalizedReport.risk_level,
        summary: normalizedReport.summary
      });
      await timelineService.record({
        investigationId: investigation.investigationId,
        eventType: "ANALYST_REPORT_GENERATED",
        title: "Analyst report generated",
        description: normalizedReport.summary,
        metadata: { riskLevel: normalizedReport.risk_level, evidenceId: evidenceRecord.id }
      });
    }

    return normalizedReport;
  }

  private createFallbackReport(target: string, evidence: any[], executions: any[], risk: any) {
    const completed = executions.filter((item) => item.status === "completed");
    const unavailable = executions.filter((item) => item.status === "unavailable" || item.status === "skipped");
    const score = Number(risk?.score || 0);
    const riskLevel = risk?.level || levelFromScore(score);
    const keyFindings = evidence
      .filter((item) => item.type !== "analysis_report")
      .slice(0, 8)
      .map((item) => {
        const summary = item.summary || {};
        const count = summary.findings ?? summary.entitiesCreated ?? summary.relationshipsCreated ?? summary.status ?? "recorded";
        return `${item.tool || item.type} produced ${count} evidence signal(s).`;
      });

    return {
      summary: completed.length > 0
        ? `${target || "The target"} has ${completed.length} completed workflow step(s), ${evidence.length} evidence record(s), and current rule-based risk is ${riskLevel}.`
        : `${target || "The target"} has limited collected evidence so far; continue with built-in collectors before drawing conclusions.`,
      risk_level: riskLevel,
      key_findings: keyFindings.length ? keyFindings : ["No substantive evidence has been collected yet."],
      relationships: ["Review the graph for generated domain, email, subdomain, and ownership relationships."],
      evidence_refs: evidence.slice(0, 10).map((item) => `${item.id}:${item.tool || item.type}`),
      next_actions: [
        unavailable.length > 0 ? "Configure missing API keys or MCP servers for skipped/unavailable tools." : "Review evidence details and graph relationships.",
        "Run correlation and risk assessment after additional collection.",
        "Use approval-gated MCP tools only after confirming authorization and scope."
      ],
      stop_condition_met: completed.length > 0 && unavailable.length === 0 && score < 25
    };
  }
}

export const analystService = new AnalystService();
