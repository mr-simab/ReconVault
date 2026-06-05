import { analystService } from "./analystService";
import { dataStore } from "./dataStore";
import { investigationService } from "./investigationService";
import { riskService } from "./riskService";
import { timelineService } from "./timelineService";
import { auditService } from "./auditService";

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function asList(items: unknown[] = []): string {
  return items.map((item) => `- ${String(item)}`).join("\n");
}

export class ReportExportService {
  async buildInvestigationReport(id: string) {
    const investigation = await investigationService.getInvestigation(id);
    if (!investigation) return null;

    const [evidence, timeline, executions, plans] = await Promise.all([
      investigationService.listEvidence(investigation.investigationId, 200),
      timelineService.listByInvestigation(investigation.investigationId),
      dataStore.toolExecution.findMany({ where: { investigationId: investigation.investigationId }, take: 200, orderBy: { startedAt: "desc" } }),
      investigationService.listPlans(investigation.investigationId)
    ]);
    const risk = investigation.targetId ? await riskService.assessTarget(investigation.targetId) : null;
    const latestAnalysisEvidence = evidence.find((item) => item.type === "analysis_report");
    const analystConclusion = latestAnalysisEvidence?.raw || await analystService.analyze({ investigationId: investigation.investigationId });

    return {
      generatedAt: new Date().toISOString(),
      investigation,
      executiveSummary: analystConclusion?.summary || "No analyst conclusion is available yet.",
      targetInformation: {
        target: investigation.target,
        targetType: investigation.targetType,
        goal: investigation.goal,
        status: investigation.status
      },
      evidence,
      timeline,
      findings: executions.map((execution) => ({
        tool: execution.tool,
        status: execution.status,
        summary: execution.outputSummary,
        evidenceId: execution.evidenceId
      })),
      riskAssessment: risk,
      recommendations: analystConclusion?.next_actions || [],
      analystConclusion,
      plans
    };
  }

  async exportInvestigation(id: string, format: string) {
    const report = await this.buildInvestigationReport(id);
    if (!report) return null;
    const normalized = String(format || "json").toLowerCase();
    await auditService.record({
      action: "report.exported",
      targetType: "investigation",
      targetId: report.investigation.investigationId,
      metadata: { format: normalized }
    });

    if (normalized === "markdown") return { contentType: "text/markdown", body: this.toMarkdown(report) };
    if (normalized === "html" || normalized === "pdf-html" || normalized === "pdf_ready_html") {
      return { contentType: "text/html", body: this.toHtml(report) };
    }
    return { contentType: "application/json", body: JSON.stringify(report, null, 2) };
  }

  private toMarkdown(report: any): string {
    return [
      `# ReconVault Investigation Report`,
      ``,
      `Generated: ${report.generatedAt}`,
      ``,
      `## Executive Summary`,
      report.executiveSummary,
      ``,
      `## Target Information`,
      `- Target: ${report.targetInformation.target}`,
      `- Type: ${report.targetInformation.targetType}`,
      `- Status: ${report.targetInformation.status}`,
      `- Goal: ${report.targetInformation.goal}`,
      ``,
      `## Risk Assessment`,
      report.riskAssessment ? `Score: ${report.riskAssessment.score}\nLevel: ${report.riskAssessment.level}` : "No risk assessment available.",
      ``,
      `## Findings`,
      asList(report.findings.map((finding: any) => `${finding.tool} (${finding.status}): ${JSON.stringify(finding.summary)}`)),
      ``,
      `## Evidence`,
      asList(report.evidence.map((item: any) => `${item.id} ${item.tool || item.type}: ${JSON.stringify(item.summary)}`)),
      ``,
      `## Timeline`,
      asList(report.timeline.map((item: any) => `${item.createdAt} ${item.eventType}: ${item.title}`)),
      ``,
      `## Recommendations`,
      asList(report.recommendations),
      ``,
      `## Analyst Conclusion`,
      JSON.stringify(report.analystConclusion, null, 2)
    ].join("\n");
  }

  private toHtml(report: any): string {
    const section = (title: string, body: string) => `<section><h2>${escapeHtml(title)}</h2>${body}</section>`;
    return [
      "<!doctype html>",
      "<html><head><meta charset=\"utf-8\"><title>ReconVault Investigation Report</title>",
      "<style>body{font-family:Arial,sans-serif;line-height:1.5;margin:40px;color:#132;}h1,h2{color:#064;}section{margin:24px 0;}pre{background:#f5f7f7;padding:12px;overflow:auto;}li{margin:6px 0;}</style>",
      "</head><body>",
      "<h1>ReconVault Investigation Report</h1>",
      `<p><strong>Generated:</strong> ${escapeHtml(report.generatedAt)}</p>`,
      section("Executive Summary", `<p>${escapeHtml(report.executiveSummary)}</p>`),
      section("Target Information", `<pre>${escapeHtml(JSON.stringify(report.targetInformation, null, 2))}</pre>`),
      section("Risk Assessment", `<pre>${escapeHtml(JSON.stringify(report.riskAssessment, null, 2))}</pre>`),
      section("Findings", `<pre>${escapeHtml(JSON.stringify(report.findings, null, 2))}</pre>`),
      section("Evidence", `<pre>${escapeHtml(JSON.stringify(report.evidence, null, 2))}</pre>`),
      section("Timeline", `<pre>${escapeHtml(JSON.stringify(report.timeline, null, 2))}</pre>`),
      section("Recommendations", `<ul>${(report.recommendations || []).map((item: string) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`),
      section("Analyst Conclusion", `<pre>${escapeHtml(JSON.stringify(report.analystConclusion, null, 2))}</pre>`),
      "</body></html>"
    ].join("");
  }
}

export const reportExportService = new ReportExportService();
