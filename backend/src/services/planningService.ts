import crypto from "node:crypto";
import { InvestigationPlan, PlanStep, ToolCapability } from "../models/types";
import { detectTargetType } from "../utils/target";
import { contextBuilderService } from "./contextBuilderService";
import { llmProviderService } from "./llmProviderService";
import { toolRegistry } from "./toolRegistry";

type PlanInput = {
  investigationId?: string;
  target?: string;
  userRequest: string;
  currentFindings?: unknown[];
  investigationState?: Record<string, unknown>;
};

function asArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
}

function requestMentions(request: string, terms: string[]): boolean {
  const text = request.toLowerCase();
  return terms.some((term) => text.includes(term));
}

export class PlanningService {
  async createPlan(input: PlanInput): Promise<InvestigationPlan> {
    const context = await contextBuilderService.buildPlanningContext({
      investigationId: input.investigationId,
      target: input.target,
      userRequest: input.userRequest,
      currentFindings: input.currentFindings,
      investigationState: input.investigationState
    });

    const warnings = [...(context.warnings || [])];
    const providerResult = await llmProviderService.completeJson(this.buildMessages(context));
    if (providerResult.parsed) {
      const normalized = this.normalizeProviderPlan(providerResult.parsed, {
        investigationId: input.investigationId,
        target: context.target,
        targetType: context.target_type,
        userRequest: context.user_request,
        provider: providerResult.raw?.provider,
        model: providerResult.raw?.model,
        warnings
      });
      if (normalized.steps.length > 0) return normalized;
      warnings.push("Provider plan had no valid registry-backed steps; deterministic fallback was used.");
    } else if (providerResult.error) {
      warnings.push(providerResult.error);
    }

    return this.createFallbackPlan({
      investigationId: input.investigationId,
      target: context.target,
      targetType: context.target_type,
      userRequest: context.user_request,
      warnings
    });
  }

  validatePlan(plan: InvestigationPlan) {
    const errors: string[] = [];
    const warnings: string[] = [];
    const seen = new Set<string>();

    for (const step of plan.steps || []) {
      if (!step.id) errors.push("Every step must include an id.");
      if (seen.has(step.id)) errors.push(`Duplicate step id: ${step.id}`);
      seen.add(step.id);

      const validation = toolRegistry.validateStepTool(step.tool);
      if (!validation.valid) errors.push(validation.error || `Invalid tool: ${step.tool}`);

      for (const dep of step.dependsOn || []) {
        if (!seen.has(dep) && !(plan.steps || []).some((candidate) => candidate.id === dep)) {
          warnings.push(`Step ${step.id} depends on unknown step ${dep}.`);
        }
      }

      if ((step as any).command) {
        errors.push(`Step ${step.id} includes a raw command field. Plans may only reference registry tools.`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  private buildMessages(context: any) {
    const compactTools = {
      collectors: context.available_collectors.map(this.compactTool),
      mcp_tools: context.mcp_tools.map(this.compactTool),
      api_integrations: context.api_integrations.map(this.compactTool),
      browser_capabilities: context.browser_capabilities.map(this.compactTool),
      internal_tools: context.internal_tools.map(this.compactTool)
    };

    return [
      {
        role: "system" as const,
        content: [
          "You are the ReconVault investigation planner.",
          "Return JSON only.",
          "You may only select tools from the provided registry metadata.",
          "Never generate raw shell commands, command-line flags, scripts, filesystem writes, or infrastructure actions.",
          "Prefer built-in ReconVault collectors before MCP tools unless the request needs deeper external reconnaissance.",
          "Use dependency chaining when one tool output is needed by another.",
          "Keep humans in control: mark intrusive or high-intensity tools with a clear purpose, but still only return tool names."
        ].join(" ")
      },
      {
        role: "user" as const,
        content: JSON.stringify({
          expected_schema: {
            reasoning: "short explanation",
            steps: [
              {
                tool: "registry tool name only",
                purpose: "why this step is needed",
                inputs: { target: context.target },
                dependsOn: ["previous_step_id_or_empty"],
                parallelGroup: "optional group name"
              }
            ]
          },
          target: context.target,
          target_type: context.target_type,
          user_request: context.user_request,
          tool_registry: compactTools,
          current_findings: context.current_findings,
          recent_evidence: context.recent_evidence,
          investigation_state: context.investigation_state,
          investigation_history: context.investigation_history
        })
      }
    ];
  }

  private compactTool(tool: ToolCapability) {
    return {
      name: tool.name,
      category: tool.category,
      source: tool.source,
      inputs: tool.inputs,
      outputs: tool.outputs,
      acceptsTargetTypes: tool.acceptsTargetTypes,
      requiresApproval: tool.requiresApproval,
      parallelSafe: tool.parallelSafe
    };
  }

  private normalizeProviderPlan(parsed: any, base: {
    investigationId?: string;
    target: string;
    targetType: string;
    userRequest: string;
    provider?: string;
    model?: string;
    warnings: string[];
  }): InvestigationPlan {
    const warnings = [...base.warnings];
    const steps: PlanStep[] = [];
    const providerSteps = Array.isArray(parsed?.steps) ? parsed.steps : [];

    for (let i = 0; i < providerSteps.length; i++) {
      const rawStep = providerSteps[i] || {};
      const toolName = String(rawStep.tool || rawStep.name || "").trim();
      if (!toolName || rawStep.command) {
        warnings.push(`Provider step ${i + 1} was skipped because it did not use a registry tool name only.`);
        continue;
      }

      const validation = toolRegistry.validateStepTool(toolName);
      if (!validation.valid || !validation.tool) {
        warnings.push(`Provider step ${i + 1} skipped: ${validation.error || "invalid tool"}`);
        continue;
      }

      steps.push(this.buildStep(validation.tool, i + 1, rawStep.purpose || rawStep.reason || `Run ${toolName}`, {
        inputs: rawStep.inputs && typeof rawStep.inputs === "object" ? rawStep.inputs : { target: base.target },
        dependsOn: asArray(rawStep.dependsOn || rawStep.depends_on),
        parallelGroup: rawStep.parallelGroup || rawStep.parallel_group
      }));
    }

    return {
      planId: crypto.randomUUID(),
      investigationId: base.investigationId,
      target: base.target,
      targetType: base.targetType || detectTargetType(base.target),
      userRequest: base.userRequest,
      reasoning: String(parsed?.reasoning || "Provider generated a registry-backed investigation plan."),
      plannerMode: "llm_provider",
      provider: base.provider,
      model: base.model,
      steps,
      warnings,
      createdAt: new Date().toISOString()
    };
  }

  private createFallbackPlan(base: {
    investigationId?: string;
    target: string;
    targetType: string;
    userRequest: string;
    warnings: string[];
  }): InvestigationPlan {
    const steps: PlanStep[] = [];
    const targetType = base.targetType || detectTargetType(base.target);
    const collectorNames = this.selectCollectors(targetType, base.userRequest);

    for (const name of collectorNames) {
      const tool = toolRegistry.get(name);
      if (tool) {
        steps.push(this.buildStep(tool, steps.length + 1, `Collect ${tool.displayName.toLowerCase()} signals for ${base.target}.`, {
          inputs: { target: base.target },
          dependsOn: [],
          parallelGroup: "built_in_collectors"
        }));
      }
    }

    const externalTools = this.selectExternalTools(targetType, base.userRequest);
    const collectorDeps = steps.map((step) => step.id);
    for (const name of externalTools) {
      const tool = toolRegistry.get(name);
      if (tool) {
        steps.push(this.buildStep(tool, steps.length + 1, `Use ${tool.displayName} when MCP approval and server configuration are available.`, {
          inputs: { target: base.target },
          dependsOn: collectorDeps,
          parallelGroup: "mcp_enrichment"
        }));
      }
    }

    const correlate = toolRegistry.get("correlate_findings");
    if (correlate) {
      steps.push(this.buildStep(correlate, steps.length + 1, "Normalize entities and create intelligence relationships.", {
        inputs: { target: base.target, investigationId: base.investigationId },
        dependsOn: steps.map((step) => step.id)
      }));
    }

    const risk = toolRegistry.get("risk_assessment");
    if (risk) {
      const lastStep = steps[steps.length - 1]?.id;
      steps.push(this.buildStep(risk, steps.length + 1, "Apply rule-based risk scoring to the investigation findings.", {
        inputs: { target: base.target, investigationId: base.investigationId },
        dependsOn: lastStep ? [lastStep] : []
      }));
    }

    return {
      planId: crypto.randomUUID(),
      investigationId: base.investigationId,
      target: base.target,
      targetType,
      userRequest: base.userRequest,
      reasoning: "Deterministic planner selected built-in collectors first, then optional MCP/API enrichment where the request implies deeper reconnaissance.",
      plannerMode: "deterministic_fallback",
      steps,
      warnings: base.warnings,
      createdAt: new Date().toISOString()
    };
  }

  private selectCollectors(targetType: string, request: string): string[] {
    const selected = new Set<string>();
    const type = targetType.toUpperCase();

    if (type === "DOMAIN" || type === "URL") ["domain", "web", "ip", "email", "social", "geo"].forEach((name) => selected.add(name));
    else if (type === "EMAIL") ["email", "domain", "social"].forEach((name) => selected.add(name));
    else if (type === "IP") ["ip", "geo", "domain"].forEach((name) => selected.add(name));
    else ["social", "email", "domain"].forEach((name) => selected.add(name));

    if (requestMentions(request, ["media", "image", "photo", "exif", "screenshot"])) selected.add("media");
    if (requestMentions(request, ["darkweb", "dark web", "leak", "breach", "credential"])) selected.add("darkweb");

    return Array.from(selected).filter((name) => Boolean(toolRegistry.get(name)));
  }

  private selectExternalTools(targetType: string, request: string): string[] {
    const selected = new Set<string>();
    const type = targetType.toUpperCase();
    const asksForDeepRecon = requestMentions(request, ["mcp", "external", "deep", "attack surface", "subdomain", "enumerate", "workflow", "autonomous"]);
    const asksForWeb = requestMentions(request, ["web", "http", "website", "technology", "nuclei", "crawl"]);
    const asksForNetwork = requestMentions(request, ["port", "service", "network", "nmap", "scan"]);
    const asksForIdentity = requestMentions(request, ["person", "username", "email", "social", "account"]);
    const asksForDns = requestMentions(request, ["dns", "subdomain", "zone", "domain"]);
    const asksForArchive = requestMentions(request, ["archive", "wayback", "historical", "url"]);
    const asksForContent = requestMentions(request, ["directory", "content", "endpoint", "parameter", "fuzz", "wordlist"]);
    const asksForCloud = requestMentions(request, ["cloud", "aws", "azure", "gcp", "container", "docker", "kubernetes", "k8s", "iac", "terraform"]);

    if ((type === "DOMAIN" || type === "URL") && asksForDeepRecon) ["subfinder", "httpx", "amass", "assetfinder"].forEach((name) => selected.add(name));
    if ((type === "DOMAIN" || type === "URL") && asksForDns) ["dnsx", "dnsrecon", "fierce", "dnsenum"].forEach((name) => selected.add(name));
    if ((type === "DOMAIN" || type === "URL") && asksForArchive) ["gau", "waymore", "waybackurls", "hakrawler"].forEach((name) => selected.add(name));
    if ((type === "DOMAIN" || type === "URL") && asksForWeb) ["whatweb", "wafw00f", "nuclei", "nikto", "sslscan"].forEach((name) => selected.add(name));
    if ((type === "DOMAIN" || type === "URL") && asksForContent) ["katana", "gobuster", "ffuf", "feroxbuster", "dirsearch", "arjun", "paramspider"].forEach((name) => selected.add(name));
    if ((type === "DOMAIN" || type === "IP") && asksForNetwork) ["dnsx", "nmap", "naabu", "sslscan", "rustscan"].forEach((name) => selected.add(name));
    if ((type === "EMAIL" || type === "USERNAME" || asksForIdentity) && asksForDeepRecon) ["theharvester", "sherlock", "holehe", "social_analyzer", "spiderfoot"].forEach((name) => selected.add(name));
    if (asksForCloud) ["trivy", "checkov", "terrascan", "prowler", "kube_bench", "kube_hunter"].forEach((name) => selected.add(name));
    if (requestMentions(request, ["wordpress", "wp", "cms"])) selected.add("wpscan");
    if (requestMentions(request, ["xss", "reflection"])) selected.add("dalfox");
    if (requestMentions(request, ["zap", "baseline"])) selected.add("zap_baseline");

    return Array.from(selected).filter((name) => Boolean(toolRegistry.get(name)));
  }

  private buildStep(tool: ToolCapability, index: number, purpose: string, options: {
    inputs?: Record<string, unknown>;
    dependsOn?: string[];
    parallelGroup?: string;
  }): PlanStep {
    return {
      id: `step-${index}`,
      tool: tool.name,
      purpose,
      inputs: options.inputs || {},
      expectedOutputs: tool.outputs,
      dependsOn: options.dependsOn || [],
      parallelGroup: options.parallelGroup,
      status: "pending"
    };
  }
}

export const planningService = new PlanningService();
