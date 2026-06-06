import { ToolCapability, ToolCategory } from "../models/types";
import { toolRegistry } from "./toolRegistry";

type ReconTargetType = "DOMAIN" | "URL" | "IP" | "EMAIL" | "USERNAME" | "PHONE" | "HASH" | "UNKNOWN";
type ReconObjective =
  | "balanced"
  | "passive_osint"
  | "attack_surface"
  | "web_mapping"
  | "network_enumeration"
  | "identity_intelligence"
  | "cloud_posture"
  | "risk_triage";
type ReconDepth = "surface" | "standard" | "deep";
type ReconIntensity = "passive" | "low" | "moderate" | "high";

type TargetProfile = {
  target: string;
  normalizedTarget: string;
  targetType: ReconTargetType;
  confidence: number;
  hints: Record<string, string>;
  objective: ReconObjective;
  depth: ReconDepth;
  estimatedIntensity: ReconIntensity;
  reasoning: string[];
};

type ToolRecommendation = {
  name: string;
  displayName: string;
  category: ToolCategory;
  source: string;
  executionMode: string;
  score: number;
  requiresApproval: boolean;
  parallelSafe: boolean;
  intensity: ReconIntensity;
  expectedOutputs: string[];
  tags: string[];
  endpointPath?: string;
  reasons: string[];
  fallbackTools: string[];
};

type WorkflowPhase = {
  id: string;
  name: string;
  purpose: string;
  intensity: ReconIntensity;
  approvalRequired: boolean;
  parallelSafe: boolean;
  tools: ToolRecommendation[];
  gates: string[];
};

const objectiveProfiles: Record<ReconObjective, {
  label: string;
  preferredCategories: ToolCategory[];
  includeTags: string[];
  avoidTags: string[];
  approvalPenalty: number;
}> = {
  balanced: {
    label: "Balanced reconnaissance",
    preferredCategories: ["collector", "api", "mcp", "internal", "browser"],
    includeTags: ["default", "collector", "intelligence", "recon", "web", "dns", "risk"],
    avoidTags: [],
    approvalPenalty: 4
  },
  passive_osint: {
    label: "Passive OSINT",
    preferredCategories: ["collector", "api", "internal"],
    includeTags: ["default", "collector", "osint", "intelligence", "registration", "reputation", "dns", "social", "email"],
    avoidTags: ["high_intensity", "ports"],
    approvalPenalty: 18
  },
  attack_surface: {
    label: "Attack surface mapping",
    preferredCategories: ["collector", "api", "mcp", "browser", "internal"],
    includeTags: ["recon", "subdomain", "web", "crawler", "archive", "dns", "technology", "attack_surface"],
    avoidTags: ["high_intensity"],
    approvalPenalty: 7
  },
  web_mapping: {
    label: "Web asset mapping",
    preferredCategories: ["collector", "mcp", "browser", "api", "internal"],
    includeTags: ["web", "crawler", "archive", "technology", "waf", "finding", "recon"],
    avoidTags: ["high_intensity", "ports"],
    approvalPenalty: 6
  },
  network_enumeration: {
    label: "Network enumeration",
    preferredCategories: ["api", "mcp", "collector", "internal"],
    includeTags: ["network", "ports", "dns", "intelligence", "reputation"],
    avoidTags: [],
    approvalPenalty: 2
  },
  identity_intelligence: {
    label: "Identity intelligence",
    preferredCategories: ["collector", "api", "mcp", "internal"],
    includeTags: ["identity", "social", "email", "osint", "breach", "people", "intelligence"],
    avoidTags: ["high_intensity", "ports"],
    approvalPenalty: 10
  },
  cloud_posture: {
    label: "Cloud and container posture",
    preferredCategories: ["mcp", "api", "internal", "collector"],
    includeTags: ["cloud", "container", "iac", "kubernetes", "policy", "finding", "intelligence"],
    avoidTags: ["exploit", "payload"],
    approvalPenalty: 4
  },
  risk_triage: {
    label: "Risk triage",
    preferredCategories: ["api", "collector", "internal", "mcp"],
    includeTags: ["risk", "reputation", "finding", "intelligence", "default"],
    avoidTags: ["high_intensity"],
    approvalPenalty: 8
  }
};

const objectiveAliases: Array<[ReconObjective, string[]]> = [
  ["identity_intelligence", ["identity", "email", "username", "social", "breach", "person", "profile"]],
  ["network_enumeration", ["network", "port", "service", "nmap", "naabu", "masscan", "cidr"]],
  ["cloud_posture", ["cloud", "aws", "azure", "gcp", "container", "docker", "kubernetes", "k8s", "iac", "terraform"]],
  ["web_mapping", ["web", "url", "http", "waf", "crawler", "endpoint", "nuclei", "website"]],
  ["attack_surface", ["attack surface", "subdomain", "asset", "infrastructure", "enumeration", "reconnaissance"]],
  ["risk_triage", ["risk", "triage", "reputation", "threat", "finding", "exposure"]],
  ["passive_osint", ["passive", "osint", "public", "open source", "non intrusive"]]
];

function normalizeObjective(input?: string): ReconObjective {
  const value = String(input || "").toLowerCase();
  for (const [objective, needles] of objectiveAliases) {
    if (needles.some((needle) => value.includes(needle))) return objective;
  }
  return "balanced";
}

function normalizeDepth(input?: string | number): ReconDepth {
  const value = String(input || "").toLowerCase();
  if (value === "deep" || Number(input) > 2) return "deep";
  if (value === "surface" || value === "passive" || Number(input) <= 1) return "surface";
  return "standard";
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function hostnameFromUrl(value: string): string | undefined {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return undefined;
  }
}

function inferTarget(rawTarget: string, objective: ReconObjective, depth: ReconDepth): TargetProfile {
  const target = String(rawTarget || "").trim();
  const lower = target.toLowerCase();
  const reasoning: string[] = [];
  const hints: Record<string, string> = {};
  let targetType: ReconTargetType = "UNKNOWN";
  let normalizedTarget = lower;
  let confidence = 0.35;

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const ipv4Pattern = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
  const ipv6Pattern = /^([0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}$/i;
  const hashPattern = /^([a-f0-9]{32}|[a-f0-9]{40}|[a-f0-9]{64})$/i;
  const phoneDigits = target.replace(/[^\d]/g, "");
  const domainPattern = /^(?!-)([a-z0-9-]{1,63}\.)+[a-z]{2,63}$/i;
  const usernamePattern = /^[a-z0-9_.-]{2,64}$/i;

  if (!target) {
    reasoning.push("No target provided.");
  } else if (emailPattern.test(target)) {
    targetType = "EMAIL";
    normalizedTarget = lower;
    hints.email = normalizedTarget;
    hints.domain = normalizedTarget.split("@")[1];
    confidence = 0.96;
    reasoning.push("Input matches an email identity.");
  } else if (target.startsWith("http://") || target.startsWith("https://")) {
    targetType = "URL";
    normalizedTarget = target;
    hints.url = target;
    const host = hostnameFromUrl(target);
    if (host) hints.domain = host;
    confidence = host ? 0.94 : 0.78;
    reasoning.push("Input contains a URL scheme.");
  } else if (ipv4Pattern.test(target) || ipv6Pattern.test(target)) {
    targetType = "IP";
    normalizedTarget = target;
    hints.ip = target;
    confidence = 0.95;
    reasoning.push("Input matches an IP address.");
  } else if (hashPattern.test(target)) {
    targetType = "HASH";
    normalizedTarget = lower;
    hints.hash = normalizedTarget;
    confidence = 0.92;
    reasoning.push("Input matches a common file/hash indicator length.");
  } else if (phoneDigits.length >= 8 && /^[+\d\s().-]+$/.test(target)) {
    targetType = "PHONE";
    normalizedTarget = phoneDigits;
    hints.phone = phoneDigits;
    confidence = 0.8;
    reasoning.push("Input resembles a phone number.");
  } else if (domainPattern.test(target)) {
    targetType = "DOMAIN";
    normalizedTarget = lower;
    hints.domain = normalizedTarget;
    hints.url = `https://${normalizedTarget}`;
    confidence = 0.9;
    reasoning.push("Input matches a domain name.");
  } else if (usernamePattern.test(target)) {
    targetType = "USERNAME";
    normalizedTarget = target;
    hints.username = target;
    confidence = 0.7;
    reasoning.push("Input is treated as a username-style identity.");
  } else {
    reasoning.push("Target type is uncertain; only broadly compatible tools are recommended.");
  }

  return {
    target,
    normalizedTarget,
    targetType,
    confidence,
    hints,
    objective,
    depth,
    estimatedIntensity: estimateProfileIntensity(objective, depth),
    reasoning
  };
}

function estimateProfileIntensity(objective: ReconObjective, depth: ReconDepth): ReconIntensity {
  if (depth === "deep" || objective === "network_enumeration") return "moderate";
  if (objective === "cloud_posture") return "moderate";
  if (objective === "passive_osint" || depth === "surface") return "passive";
  if (objective === "attack_surface" || objective === "web_mapping") return "low";
  return "low";
}

function toolIntensity(tool: ToolCapability): ReconIntensity {
  if (tool.tags.includes("high_intensity")) return "high";
  if (tool.category === "mcp" && tool.requiresApproval) return "moderate";
  if (tool.category === "collector" || tool.category === "api" || tool.category === "internal") return "passive";
  return "low";
}

function compatibleTargetTypes(profile: TargetProfile): Set<string> {
  const types = new Set<string>([profile.targetType]);
  if (profile.targetType === "DOMAIN") types.add("URL");
  if (profile.targetType === "URL") types.add("DOMAIN");
  return types;
}

function toolMatchesTarget(tool: ToolCapability, profile: TargetProfile): { match: boolean; exact: boolean; reason?: string } {
  if (profile.targetType === "UNKNOWN") {
    const broad = tool.acceptsTargetTypes.some((type) => ["DOMAIN", "URL", "IP", "EMAIL", "USERNAME", "UNKNOWN"].includes(type));
    return { match: broad, exact: false, reason: broad ? "broad target compatibility" : undefined };
  }

  if (tool.acceptsTargetTypes.includes(profile.targetType)) {
    return { match: true, exact: true, reason: `${profile.targetType.toLowerCase()} accepted directly` };
  }

  const compatible = compatibleTargetTypes(profile);
  const transformed = tool.acceptsTargetTypes.find((type) => compatible.has(type));
  return {
    match: Boolean(transformed),
    exact: false,
    reason: transformed ? `${profile.targetType.toLowerCase()} can be transformed to ${transformed.toLowerCase()}` : undefined
  };
}

function sharedTagCount(tool: ToolCapability, tags: string[]): number {
  const toolTags = new Set(tool.tags);
  return tags.filter((tag) => toolTags.has(tag)).length;
}

function scoreTool(tool: ToolCapability, profile: TargetProfile): ToolRecommendation | undefined {
  if (!tool.enabled) return undefined;

  const targetMatch = toolMatchesTarget(tool, profile);
  if (!targetMatch.match) return undefined;

  const objective = objectiveProfiles[profile.objective];
  const reasons: string[] = [];
  let score = targetMatch.exact ? 36 : 24;
  if (targetMatch.reason) reasons.push(targetMatch.reason);

  const categoryIndex = objective.preferredCategories.indexOf(tool.category);
  if (categoryIndex >= 0) {
    score += 18 - categoryIndex * 3;
    reasons.push(`${tool.category} tool fits ${objective.label.toLowerCase()}`);
  }

  const includedTags = sharedTagCount(tool, objective.includeTags);
  if (includedTags > 0) {
    score += includedTags * 7;
    reasons.push(`${includedTags} objective tag match${includedTags === 1 ? "" : "es"}`);
  }

  const avoidedTags = sharedTagCount(tool, objective.avoidTags);
  if (avoidedTags > 0) {
    score -= avoidedTags * 16;
    reasons.push("lowered because it is noisy for this objective");
  }

  if (tool.requiresApproval) {
    score -= objective.approvalPenalty;
    reasons.push("requires explicit operator approval");
  }

  if (tool.parallelSafe) score += 4;
  if (tool.tags.includes("default")) score += 4;
  if (profile.depth === "deep" && tool.category === "mcp") score += 8;
  if (profile.depth === "surface" && tool.requiresApproval) score -= 8;
  if (tool.tags.includes("high_intensity") && profile.depth !== "deep") score -= 20;

  const recommendation: ToolRecommendation = {
    name: tool.name,
    displayName: tool.displayName,
    category: tool.category,
    source: tool.source,
    executionMode: tool.executionMode,
    score: clampScore(score),
    requiresApproval: tool.requiresApproval,
    parallelSafe: tool.parallelSafe,
    intensity: toolIntensity(tool),
    expectedOutputs: tool.outputs,
    tags: tool.tags,
    endpointPath: tool.endpointPath,
    reasons,
    fallbackTools: []
  };

  return recommendation.score > 0 ? recommendation : undefined;
}

function buildFallbacks(recommendations: ToolRecommendation[]): ToolRecommendation[] {
  return recommendations.map((tool) => {
    const toolTags = new Set(tool.tags);
    const fallbacks = recommendations
      .filter((candidate) => candidate.name !== tool.name)
      .filter((candidate) => candidate.category === tool.category || candidate.tags.some((tag) => toolTags.has(tag)))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((candidate) => candidate.name);
    return { ...tool, fallbackTools: fallbacks };
  });
}

function targetInputForTool(tool: ToolCapability, profile: TargetProfile): Record<string, string> {
  const hints = profile.hints;
  for (const input of tool.inputs) {
    if (input === "domain" && hints.domain) return { domain: hints.domain };
    if (input === "url" && hints.url) return { url: hints.url };
    if (input === "url" && hints.domain) return { url: `https://${hints.domain}` };
    if (input === "ip" && hints.ip) return { ip: hints.ip };
    if (input === "email" && hints.email) return { email: hints.email };
    if (input === "username" && hints.username) return { username: hints.username };
    if (input === "phone" && hints.phone) return { phone: hints.phone };
    if (input === "hash" && hints.hash) return { hash: hints.hash };
  }
  return { target: profile.normalizedTarget };
}

function toolParameterDefaults(tool: ToolCapability, profile: TargetProfile, depth: ReconDepth): Record<string, unknown> {
  const defaults: Record<string, unknown> = {
    executionPolicy: "planner_metadata_only",
    scope: "operator_authorized_target_only",
    timeoutSeconds: tool.timeoutSeconds || 60,
    parallelSafe: tool.parallelSafe,
    rateLimitPolicy: "respect_global_limits"
  };

  const crawlDepth = depth === "deep" ? 2 : 1;
  const toolSpecific: Record<string, Record<string, unknown>> = {
    amass: { mode: "passive_first", bruteForce: false },
    subfinder: { mode: "passive", sources: "configured" },
    httpx: { probeTechnology: true, followRedirects: false, screenshot: false },
    katana: { crawlDepth, respectRobots: true, headless: false },
    waymore: { archiveSources: "configured", includeKnownUrls: true },
    gau: { archiveSources: "configured", includeSubdomains: profile.targetType === "DOMAIN" },
    nmap: { scanProfile: "safe_service_detection", portProfile: depth === "deep" ? "common_extended" : "top_common" },
    naabu: { scanProfile: "rate_limited_port_discovery", portProfile: depth === "deep" ? "common_extended" : "top_common" },
    dnsx: { recordTypes: ["A", "AAAA", "CNAME", "MX", "TXT"], resolveOnly: true },
    masscan: { scanProfile: "disabled_until_explicit_scope", requireCidrBoundary: true },
    nuclei: { destructiveTemplates: false, severity: depth === "deep" ? ["info", "low", "medium", "high"] : ["info", "low", "medium"] },
    whatweb: { aggression: "safe", followRedirects: false },
    wafw00f: { mode: "fingerprint_only" },
    nikto: { mode: "baseline_checks", mutationTests: false },
    sherlock: { mode: "public_profile_presence" },
    holehe: { mode: "account_presence_only" },
    theharvester: { sources: "configured", passiveOnly: true },
    phoneinfoga: { mode: "public_phone_intelligence" },
    exiftool: { mode: "metadata_extract_only" },
    dnsrecon: { mode: "standard_dns_enum", zoneTransfer: false, bruteForce: false },
    fierce: { mode: "standard_dns_recon", wideScan: false },
    dnsenum: { mode: "standard_dns_enum", bruteForce: false },
    waybackurls: { archiveSources: "wayback", includeKnownUrls: true },
    hakrawler: { crawlDepth, includeJavascript: true, wayback: false },
    assetfinder: { mode: "passive", includeSubsOnly: true },
    rustscan: { scanProfile: "rate_limited_fast_discovery", portProfile: depth === "deep" ? "top_extended" : "top_common" },
    autorecon: { scanProfile: "bounded_authorized_scope", portProfile: depth === "deep" ? "top_1000" : "top_100" },
    enum4linux_ng: { mode: "anonymous_safe_enum", credentialUse: false },
    sslscan: { mode: "tls_posture", showCertificate: true },
    gobuster: { mode: "dir", wordlistProfile: "common", extensions: [] },
    ffuf: { mode: "directory", wordlistProfile: "common", matchCodes: [200, 204, 301, 302, 307, 401, 403] },
    feroxbuster: { depth: crawlDepth, wordlistProfile: "common", autoTune: true },
    dirsearch: { wordlistProfile: "common", recursive: depth === "deep" },
    arjun: { method: "GET", stable: true },
    paramspider: { archiveSources: "web_archives", excludeStatic: true },
    wpscan: { enumerate: ["plugins", "themes"], randomUserAgent: true, passwordAttack: false },
    dalfox: { mode: "reflection_analysis", blindCallback: false, mining: false },
    jaeles: { severity: depth === "deep" ? ["info", "low", "medium"] : ["info", "low"] },
    zap_baseline: { mode: "baseline", activeScan: false },
    spiderfoot: { mode: "osint_modules_only", maxScanMinutes: depth === "deep" ? 20 : 10 },
    recon_ng: { mode: "workspace_modules_only", marketplaceInstall: false },
    social_analyzer: { mode: "public_profile_presence" },
    shodan_cli: { mode: "host_or_domain_lookup" },
    censys_cli: { mode: "host_or_certificate_lookup" },
    trivy: { scanType: "filesystem_or_image", severity: ["UNKNOWN", "LOW", "MEDIUM", "HIGH", "CRITICAL"], ignoreUnfixed: false },
    checkov: { framework: "auto", quiet: true },
    terrascan: { scanType: "all", policyType: "all" },
    prowler: { provider: "aws", mode: "audit", mutatingActions: false },
    kube_bench: { mode: "cis_benchmark", mutatingActions: false },
    kube_hunter: { mode: "remote_or_cluster_passive", activeHunters: false },
    browser_render: { captureScreenshot: false, executeCustomScripts: false },
    browser_screenshot: { captureMode: "viewport", executeCustomScripts: false },
    correlate_findings: { mode: "merge_entities_and_relationships" },
    risk_assessment: { mode: "rule_based_triage" }
  };

  return { ...defaults, ...(toolSpecific[tool.name] || {}) };
}

function phaseTools(recommendations: ToolRecommendation[], predicate: (tool: ToolRecommendation) => boolean, limit: number): ToolRecommendation[] {
  return recommendations.filter(predicate).slice(0, limit);
}

function createPhase(id: string, name: string, purpose: string, tools: ToolRecommendation[], gates: string[] = []): WorkflowPhase {
  const approvalRequired = tools.some((tool) => tool.requiresApproval);
  const intensity: ReconIntensity = tools.some((tool) => tool.intensity === "high")
    ? "high"
    : tools.some((tool) => tool.intensity === "moderate")
      ? "moderate"
      : tools.some((tool) => tool.intensity === "low")
        ? "low"
        : "passive";
  return {
    id,
    name,
    purpose,
    intensity,
    approvalRequired,
    parallelSafe: tools.every((tool) => tool.parallelSafe),
    tools,
    gates
  };
}

export class ReconIntelligenceService {
  getMatrix() {
    const tools = toolRegistry.list({ enabled: true });
    const byCategory = tools.reduce<Record<string, number>>((acc, tool) => {
      acc[tool.category] = (acc[tool.category] || 0) + 1;
      return acc;
    }, {});

    return {
      sourcePattern: "Advanced recon orchestration adapted into ReconVault as planner-only intelligence.",
      safetyPolicy: {
        rawCommandExecution: false,
        exploitAutomation: false,
        activeEnumerationRequiresApproval: true,
        defaultExecutionMode: "dry_run_or_planner_metadata"
      },
      targetTypes: ["DOMAIN", "URL", "IP", "EMAIL", "USERNAME", "PHONE", "HASH"],
      objectives: Object.fromEntries(Object.entries(objectiveProfiles).map(([key, value]) => [
        key,
        {
          label: value.label,
          preferredCategories: value.preferredCategories,
          includeTags: value.includeTags,
          avoidTags: value.avoidTags
        }
      ])),
      toolInventory: {
        total: tools.length,
        byCategory,
        approvalRequired: tools.filter((tool) => tool.requiresApproval).length,
        passiveByDefault: tools.filter((tool) => !tool.requiresApproval).length
      }
    };
  }

  analyzeTarget(input: { target: string; objective?: string; depth?: string | number }) {
    const objective = normalizeObjective(input.objective);
    const depth = normalizeDepth(input.depth);
    const profile = inferTarget(input.target, objective, depth);
    const recommendations = buildFallbacks(
      toolRegistry
        .list({ enabled: true })
        .map((tool) => scoreTool(tool, profile))
        .filter((tool): tool is ToolRecommendation => Boolean(tool))
        .sort((a, b) => b.score - a.score)
    );

    return {
      profile,
      recommendations: recommendations.slice(0, 16),
      approvalRequiredTools: recommendations.filter((tool) => tool.requiresApproval).map((tool) => tool.name),
      passiveFirstTools: recommendations.filter((tool) => !tool.requiresApproval).slice(0, 8).map((tool) => tool.name),
      activeEnumerationTools: recommendations.filter((tool) => tool.requiresApproval).slice(0, 8).map((tool) => tool.name),
      notes: [
        "Recommendations are generated from ReconVault's registered collectors, APIs, MCP tools, browser tools, and internal analyzers.",
        "Planner output does not execute shell commands or external tools.",
        "MCP and high-intensity tools remain approval-gated."
      ]
    };
  }

  optimizeTool(input: { toolName: string; target: string; objective?: string; depth?: string | number }) {
    const validation = toolRegistry.validateStepTool(input.toolName);
    const objective = normalizeObjective(input.objective);
    const depth = normalizeDepth(input.depth);
    const profile = inferTarget(input.target, objective, depth);

    if (!validation.valid || !validation.tool) {
      return {
        valid: false,
        error: validation.error || "Tool is unavailable",
        profile,
        alternatives: this.analyzeTarget({ target: input.target, objective: input.objective, depth: input.depth }).recommendations.slice(0, 6)
      };
    }

    const targetMatch = toolMatchesTarget(validation.tool, profile);
    const recommendation = scoreTool(validation.tool, profile);
    return {
      valid: true,
      compatible: targetMatch.match,
      profile,
      tool: validation.tool,
      recommendation,
      suggestedInput: targetInputForTool(validation.tool, profile),
      suggestedParameters: toolParameterDefaults(validation.tool, profile, depth),
      requiresApproval: validation.tool.requiresApproval,
      warnings: [
        ...(targetMatch.match ? [] : [`${validation.tool.displayName} does not directly accept ${profile.targetType}.`]),
        ...(validation.tool.requiresApproval ? ["Operator approval is required before execution."] : []),
        ...(validation.tool.tags.includes("high_intensity") ? ["High-intensity tool: require explicit target scope and rate policy."] : []),
        "ReconVault does not pass raw shell arguments from the UI."
      ]
    };
  }

  createWorkflow(input: {
    target: string;
    objective?: string;
    depth?: string | number;
    allowedCategories?: ToolCategory[];
  }) {
    const analysis = this.analyzeTarget(input);
    const allowedCategories = new Set<ToolCategory>(input.allowedCategories || ["collector", "api", "mcp", "browser", "internal"]);
    const recommendations = analysis.recommendations.filter((tool) => allowedCategories.has(tool.category));

    const passive = phaseTools(
      recommendations,
      (tool) => !tool.requiresApproval && (tool.category === "collector" || tool.category === "api"),
      6
    );
    const expansion = phaseTools(
      recommendations,
      (tool) => tool.tags.some((tag) => ["recon", "subdomain", "archive", "dns", "web", "crawler", "technology"].includes(tag))
        && tool.name !== "masscan",
      7
    );
    const identity = phaseTools(
      recommendations,
      (tool) => tool.tags.some((tag) => ["identity", "social", "email", "people", "breach", "osint"].includes(tag)),
      5
    );
    const network = phaseTools(
      recommendations,
      (tool) => tool.tags.some((tag) => ["network", "ports"].includes(tag)),
      analysis.profile.depth === "deep" ? 5 : 3
    );
    const cloud = phaseTools(
      recommendations,
      (tool) => tool.tags.some((tag) => ["cloud", "container", "iac", "kubernetes", "policy"].includes(tag)),
      analysis.profile.depth === "deep" ? 6 : 4
    );
    const internal = phaseTools(recommendations, (tool) => tool.category === "internal", 3);

    const phases = [
      createPhase(
        "profile",
        "Target profile",
        "Classify the target, infer safe input forms, and choose the collection lane.",
        [],
        ["confirm authorization", "confirm target boundary"]
      ),
      createPhase(
        "passive",
        "Passive collection",
        "Collect low-friction public intelligence, reputation, DNS, identity, and registration signals.",
        passive,
        ["respect source rate limits"]
      ),
      createPhase(
        "surface",
        "Surface expansion",
        "Expand domains, URLs, web assets, technologies, and archived endpoints through approved tooling.",
        expansion,
        ["operator approval for MCP tools", "robots and rate policy enforced"]
      ),
      createPhase(
        "identity",
        "Identity correlation",
        "Correlate emails, usernames, public profiles, people signals, and breach exposure where applicable.",
        identity,
        ["PII minimization", "evidence retention policy"]
      ),
      createPhase(
        "network",
        "Network enumeration",
        "Run approval-gated service discovery only when the target scope permits active enumeration.",
        network,
        ["explicit active-scan approval", "bounded ports and rate limits"]
      ),
      createPhase(
        "cloud",
        "Cloud and container posture",
        "Audit authorized cloud, container, Kubernetes, and IaC surfaces through configured local tooling.",
        cloud,
        ["explicit account or repository scope", "read-only audit credentials", "no mutating actions"]
      ),
      createPhase(
        "correlate",
        "Correlation and risk",
        "Merge findings into the graph, score risk, and preserve evidence for analyst review.",
        internal,
        ["deduplicate entities", "write evidence before reporting"]
      )
    ].filter((phase) => phase.id === "profile" || phase.tools.length > 0);

    return {
      workflow: {
        target: analysis.profile.target,
        objective: analysis.profile.objective,
        depth: analysis.profile.depth,
        phases,
        executionPolicy: {
          plannerOnly: true,
          rawCommandExecution: false,
          dryRunDefault: true,
          activeEnumerationRequiresApproval: true,
          approvedToolsExpected: phases.flatMap((phase) => phase.tools).filter((tool) => tool.requiresApproval).map((tool) => tool.name)
        }
      },
      profile: analysis.profile,
      recommendations: analysis.recommendations,
      warnings: [
        "Workflow is a safe orchestration blueprint; use the existing workflow endpoint for dry-run or approved execution.",
        "High-intensity tools are excluded unless they are registered, compatible, and explicitly approved."
      ]
    };
  }
}

export const reconIntelligenceService = new ReconIntelligenceService();
