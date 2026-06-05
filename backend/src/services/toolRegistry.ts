import { collectorsRegistry, defaultCollectors } from "../collectors";
import { ToolCapability, ToolCategory } from "../models/types";

type ToolFilter = {
  category?: ToolCategory;
  enabled?: boolean;
};

const collectorDetails: Record<string, Omit<ToolCapability, "name" | "displayName" | "description" | "category" | "source" | "executionMode" | "enabled">> = {
  domain: {
    inputs: ["domain", "url"],
    outputs: ["domain", "dns_record", "whois_record", "ssl_certificate", "reputation_signal"],
    acceptsTargetTypes: ["DOMAIN", "URL"],
    requiresApproval: false,
    parallelSafe: true,
    tags: ["built_in", "collector", "attack_surface", "default"],
    timeoutSeconds: 60
  },
  email: {
    inputs: ["email", "domain"],
    outputs: ["email", "breach_signal", "mx_record", "account_presence"],
    acceptsTargetTypes: ["EMAIL", "DOMAIN", "USERNAME"],
    requiresApproval: false,
    parallelSafe: true,
    tags: ["built_in", "collector", "identity", "default"],
    timeoutSeconds: 60
  },
  ip: {
    inputs: ["ip", "domain"],
    outputs: ["ip", "reverse_dns", "geo_location", "reputation_signal", "asn"],
    acceptsTargetTypes: ["IP", "DOMAIN", "URL"],
    requiresApproval: false,
    parallelSafe: true,
    tags: ["built_in", "collector", "network", "default"],
    timeoutSeconds: 60
  },
  web: {
    inputs: ["url", "domain"],
    outputs: ["website", "technology", "security_header", "subdomain"],
    acceptsTargetTypes: ["URL", "DOMAIN"],
    requiresApproval: false,
    parallelSafe: true,
    tags: ["built_in", "collector", "web", "default"],
    timeoutSeconds: 90
  },
  social: {
    inputs: ["username", "email", "domain"],
    outputs: ["social_account", "profile", "repository_signal"],
    acceptsTargetTypes: ["USERNAME", "EMAIL", "DOMAIN"],
    requiresApproval: false,
    parallelSafe: true,
    tags: ["built_in", "collector", "social", "default"],
    timeoutSeconds: 60
  },
  geo: {
    inputs: ["location", "ip", "domain"],
    outputs: ["location", "geocode", "nearby_business"],
    acceptsTargetTypes: ["IP", "DOMAIN", "USERNAME", "URL"],
    requiresApproval: false,
    parallelSafe: true,
    tags: ["built_in", "collector", "geo", "default"],
    timeoutSeconds: 60
  },
  media: {
    inputs: ["url", "file"],
    outputs: ["media_metadata", "exif_record", "ocr_text"],
    acceptsTargetTypes: ["URL"],
    requiresApproval: false,
    parallelSafe: false,
    tags: ["built_in", "collector", "media"],
    timeoutSeconds: 90
  },
  darkweb: {
    inputs: ["domain", "email", "username"],
    outputs: ["darkweb_signal", "leak_signal", "tor_reference"],
    acceptsTargetTypes: ["DOMAIN", "EMAIL", "USERNAME"],
    requiresApproval: true,
    parallelSafe: false,
    tags: ["built_in", "collector", "darkweb"],
    timeoutSeconds: 120
  }
};

const mcpCapabilities: ToolCapability[] = [
  {
    name: "amass",
    displayName: "Amass",
    description: "Domain and attack-surface discovery through Recon MCP.",
    category: "mcp",
    source: "Recon MCP",
    executionMode: "mcp_gateway",
    inputs: ["domain"],
    outputs: ["subdomain", "domain_relationship"],
    acceptsTargetTypes: ["DOMAIN"],
    enabled: true,
    requiresApproval: true,
    parallelSafe: true,
    tags: ["recon", "subdomain", "external_tool"],
    endpointPath: "/mcp/tools/recon/amass",
    timeoutSeconds: 180
  },
  {
    name: "subfinder",
    displayName: "Subfinder",
    description: "Passive subdomain discovery through Recon MCP.",
    category: "mcp",
    source: "Recon MCP",
    executionMode: "mcp_gateway",
    inputs: ["domain"],
    outputs: ["subdomain"],
    acceptsTargetTypes: ["DOMAIN"],
    enabled: true,
    requiresApproval: true,
    parallelSafe: true,
    tags: ["recon", "subdomain", "external_tool"],
    endpointPath: "/mcp/tools/recon/subfinder",
    timeoutSeconds: 120
  },
  {
    name: "httpx",
    displayName: "HTTPX",
    description: "Live web asset probing through Recon MCP.",
    category: "mcp",
    source: "Recon MCP",
    executionMode: "mcp_gateway",
    inputs: ["domain", "subdomain", "url"],
    outputs: ["live_asset", "http_service", "technology"],
    acceptsTargetTypes: ["DOMAIN", "URL"],
    enabled: true,
    requiresApproval: true,
    parallelSafe: true,
    tags: ["recon", "web", "external_tool"],
    endpointPath: "/mcp/tools/recon/httpx",
    timeoutSeconds: 120
  },
  {
    name: "katana",
    displayName: "Katana",
    description: "Crawler and URL discovery through Recon MCP.",
    category: "mcp",
    source: "Recon MCP",
    executionMode: "mcp_gateway",
    inputs: ["url", "domain"],
    outputs: ["url", "endpoint"],
    acceptsTargetTypes: ["DOMAIN", "URL"],
    enabled: true,
    requiresApproval: true,
    parallelSafe: true,
    tags: ["recon", "crawler", "external_tool"],
    endpointPath: "/mcp/tools/recon/katana",
    timeoutSeconds: 180
  },
  {
    name: "waymore",
    displayName: "Waymore",
    description: "Archive URL discovery through Recon MCP.",
    category: "mcp",
    source: "Recon MCP",
    executionMode: "mcp_gateway",
    inputs: ["domain", "url"],
    outputs: ["url", "archived_url"],
    acceptsTargetTypes: ["DOMAIN", "URL"],
    enabled: true,
    requiresApproval: true,
    parallelSafe: true,
    tags: ["recon", "archive", "external_tool"],
    endpointPath: "/mcp/tools/recon/waymore",
    timeoutSeconds: 180
  },
  {
    name: "gau",
    displayName: "GAU",
    description: "Historical URL collection through Recon MCP.",
    category: "mcp",
    source: "Recon MCP",
    executionMode: "mcp_gateway",
    inputs: ["domain"],
    outputs: ["url", "archived_url"],
    acceptsTargetTypes: ["DOMAIN"],
    enabled: true,
    requiresApproval: true,
    parallelSafe: true,
    tags: ["recon", "archive", "external_tool"],
    endpointPath: "/mcp/tools/recon/gau",
    timeoutSeconds: 120
  },
  {
    name: "nmap",
    displayName: "Nmap",
    description: "Network service discovery through Network MCP.",
    category: "mcp",
    source: "Network MCP",
    executionMode: "mcp_gateway",
    inputs: ["ip", "domain"],
    outputs: ["port", "service", "host"],
    acceptsTargetTypes: ["IP", "DOMAIN"],
    enabled: true,
    requiresApproval: true,
    parallelSafe: false,
    tags: ["network", "ports", "external_tool"],
    endpointPath: "/mcp/tools/network/nmap",
    timeoutSeconds: 240
  },
  {
    name: "naabu",
    displayName: "Naabu",
    description: "Fast port discovery through Network MCP.",
    category: "mcp",
    source: "Network MCP",
    executionMode: "mcp_gateway",
    inputs: ["ip", "domain"],
    outputs: ["port", "host"],
    acceptsTargetTypes: ["IP", "DOMAIN"],
    enabled: true,
    requiresApproval: true,
    parallelSafe: true,
    tags: ["network", "ports", "external_tool"],
    endpointPath: "/mcp/tools/network/naabu",
    timeoutSeconds: 180
  },
  {
    name: "dnsx",
    displayName: "DNSX",
    description: "DNS resolution and enrichment through Network MCP.",
    category: "mcp",
    source: "Network MCP",
    executionMode: "mcp_gateway",
    inputs: ["domain", "subdomain"],
    outputs: ["dns_record", "ip"],
    acceptsTargetTypes: ["DOMAIN"],
    enabled: true,
    requiresApproval: true,
    parallelSafe: true,
    tags: ["network", "dns", "external_tool"],
    endpointPath: "/mcp/tools/network/dnsx",
    timeoutSeconds: 120
  },
  {
    name: "masscan",
    displayName: "Masscan",
    description: "High-speed port discovery through Network MCP.",
    category: "mcp",
    source: "Network MCP",
    executionMode: "mcp_gateway",
    inputs: ["ip", "cidr"],
    outputs: ["port", "host"],
    acceptsTargetTypes: ["IP"],
    enabled: true,
    requiresApproval: true,
    parallelSafe: false,
    tags: ["network", "ports", "external_tool", "high_intensity"],
    endpointPath: "/mcp/tools/network/masscan",
    timeoutSeconds: 300
  },
  {
    name: "nuclei",
    displayName: "Nuclei",
    description: "Template-based web finding discovery through Web MCP.",
    category: "mcp",
    source: "Web MCP",
    executionMode: "mcp_gateway",
    inputs: ["url", "live_asset"],
    outputs: ["finding", "vulnerability_signal", "technology"],
    acceptsTargetTypes: ["URL", "DOMAIN"],
    enabled: true,
    requiresApproval: true,
    parallelSafe: true,
    tags: ["web", "finding", "external_tool"],
    endpointPath: "/mcp/tools/web/nuclei",
    timeoutSeconds: 240
  },
  {
    name: "whatweb",
    displayName: "WhatWeb",
    description: "Web technology fingerprinting through Web MCP.",
    category: "mcp",
    source: "Web MCP",
    executionMode: "mcp_gateway",
    inputs: ["url", "domain"],
    outputs: ["technology", "website"],
    acceptsTargetTypes: ["URL", "DOMAIN"],
    enabled: true,
    requiresApproval: true,
    parallelSafe: true,
    tags: ["web", "technology", "external_tool"],
    endpointPath: "/mcp/tools/web/whatweb",
    timeoutSeconds: 120
  },
  {
    name: "wafw00f",
    displayName: "Wafw00f",
    description: "WAF fingerprinting through Web MCP.",
    category: "mcp",
    source: "Web MCP",
    executionMode: "mcp_gateway",
    inputs: ["url", "domain"],
    outputs: ["waf_signal", "technology"],
    acceptsTargetTypes: ["URL", "DOMAIN"],
    enabled: true,
    requiresApproval: true,
    parallelSafe: true,
    tags: ["web", "waf", "external_tool"],
    endpointPath: "/mcp/tools/web/wafw00f",
    timeoutSeconds: 120
  },
  {
    name: "nikto",
    displayName: "Nikto",
    description: "Web server configuration checks through Web MCP.",
    category: "mcp",
    source: "Web MCP",
    executionMode: "mcp_gateway",
    inputs: ["url", "domain"],
    outputs: ["finding", "web_server_signal"],
    acceptsTargetTypes: ["URL", "DOMAIN"],
    enabled: true,
    requiresApproval: true,
    parallelSafe: false,
    tags: ["web", "finding", "external_tool"],
    endpointPath: "/mcp/tools/web/nikto",
    timeoutSeconds: 240
  },
  {
    name: "sherlock",
    displayName: "Sherlock",
    description: "Username presence discovery through OSINT MCP.",
    category: "mcp",
    source: "OSINT MCP",
    executionMode: "mcp_gateway",
    inputs: ["username"],
    outputs: ["social_account"],
    acceptsTargetTypes: ["USERNAME"],
    enabled: true,
    requiresApproval: true,
    parallelSafe: true,
    tags: ["osint", "social", "external_tool"],
    endpointPath: "/mcp/tools/osint/sherlock",
    timeoutSeconds: 180
  },
  {
    name: "holehe",
    displayName: "Holehe",
    description: "Email account presence checks through OSINT MCP.",
    category: "mcp",
    source: "OSINT MCP",
    executionMode: "mcp_gateway",
    inputs: ["email"],
    outputs: ["account_presence"],
    acceptsTargetTypes: ["EMAIL"],
    enabled: true,
    requiresApproval: true,
    parallelSafe: true,
    tags: ["osint", "email", "external_tool"],
    endpointPath: "/mcp/tools/osint/holehe",
    timeoutSeconds: 180
  },
  {
    name: "theharvester",
    displayName: "theHarvester",
    description: "Email, host, and people discovery through OSINT MCP.",
    category: "mcp",
    source: "OSINT MCP",
    executionMode: "mcp_gateway",
    inputs: ["domain"],
    outputs: ["email", "subdomain", "person"],
    acceptsTargetTypes: ["DOMAIN"],
    enabled: true,
    requiresApproval: true,
    parallelSafe: true,
    tags: ["osint", "email", "people", "external_tool"],
    endpointPath: "/mcp/tools/osint/theharvester",
    timeoutSeconds: 180
  },
  {
    name: "phoneinfoga",
    displayName: "PhoneInfoga",
    description: "Phone number intelligence through OSINT MCP.",
    category: "mcp",
    source: "OSINT MCP",
    executionMode: "mcp_gateway",
    inputs: ["phone"],
    outputs: ["phone_intelligence"],
    acceptsTargetTypes: ["PHONE"],
    enabled: true,
    requiresApproval: true,
    parallelSafe: true,
    tags: ["osint", "phone", "external_tool"],
    endpointPath: "/mcp/tools/osint/phoneinfoga",
    timeoutSeconds: 180
  },
  {
    name: "exiftool",
    displayName: "ExifTool",
    description: "Media metadata extraction through OSINT MCP.",
    category: "mcp",
    source: "OSINT MCP",
    executionMode: "mcp_gateway",
    inputs: ["file", "url"],
    outputs: ["media_metadata", "exif_record"],
    acceptsTargetTypes: ["URL"],
    enabled: true,
    requiresApproval: true,
    parallelSafe: true,
    tags: ["osint", "media", "external_tool"],
    endpointPath: "/mcp/tools/osint/exiftool",
    timeoutSeconds: 120
  }
];

const apiCapabilities: ToolCapability[] = [
  {
    name: "virustotal",
    displayName: "VirusTotal",
    description: "External reputation enrichment for domains, IPs, URLs, and hashes.",
    category: "api",
    source: "Intelligence MCP",
    executionMode: "api_integration",
    inputs: ["domain", "ip", "url", "hash"],
    outputs: ["reputation_signal", "malware_signal"],
    acceptsTargetTypes: ["DOMAIN", "IP", "URL", "HASH"],
    enabled: true,
    requiresApproval: false,
    parallelSafe: true,
    tags: ["intelligence", "reputation"]
  },
  {
    name: "shodan",
    displayName: "Shodan",
    description: "Internet exposure intelligence for IPs, domains, and services.",
    category: "api",
    source: "Intelligence MCP",
    executionMode: "api_integration",
    inputs: ["ip", "domain"],
    outputs: ["service", "banner", "exposure_signal"],
    acceptsTargetTypes: ["IP", "DOMAIN"],
    enabled: true,
    requiresApproval: false,
    parallelSafe: true,
    tags: ["intelligence", "network"]
  },
  {
    name: "abuseipdb",
    displayName: "AbuseIPDB",
    description: "IP abuse and reputation intelligence.",
    category: "api",
    source: "Intelligence MCP",
    executionMode: "api_integration",
    inputs: ["ip"],
    outputs: ["reputation_signal", "abuse_signal"],
    acceptsTargetTypes: ["IP"],
    enabled: true,
    requiresApproval: false,
    parallelSafe: true,
    tags: ["intelligence", "reputation"]
  },
  {
    name: "whois",
    displayName: "WHOIS",
    description: "Domain registration intelligence.",
    category: "api",
    source: "Intelligence MCP",
    executionMode: "api_integration",
    inputs: ["domain"],
    outputs: ["whois_record", "organization"],
    acceptsTargetTypes: ["DOMAIN"],
    enabled: true,
    requiresApproval: false,
    parallelSafe: true,
    tags: ["intelligence", "registration"]
  },
  {
    name: "securitytrails",
    displayName: "SecurityTrails",
    description: "DNS and asset intelligence enrichment.",
    category: "api",
    source: "Intelligence MCP",
    executionMode: "api_integration",
    inputs: ["domain", "ip"],
    outputs: ["dns_record", "subdomain", "asset_signal"],
    acceptsTargetTypes: ["DOMAIN", "IP"],
    enabled: true,
    requiresApproval: false,
    parallelSafe: true,
    tags: ["intelligence", "dns"]
  },
  {
    name: "hibp",
    displayName: "Have I Been Pwned",
    description: "Breach exposure checks for email identities.",
    category: "api",
    source: "Intelligence MCP",
    executionMode: "api_integration",
    inputs: ["email"],
    outputs: ["breach_signal", "exposed_credential_signal"],
    acceptsTargetTypes: ["EMAIL"],
    enabled: true,
    requiresApproval: false,
    parallelSafe: true,
    tags: ["intelligence", "identity", "breach"]
  }
];

const browserCapabilities: ToolCapability[] = [
  {
    name: "browser_render",
    displayName: "Browser Render",
    description: "Dynamic page rendering and DOM extraction through Browser MCP.",
    category: "browser",
    source: "Browser MCP",
    executionMode: "browser_automation",
    inputs: ["url", "domain"],
    outputs: ["dom_snapshot", "page_text", "screenshot_reference"],
    acceptsTargetTypes: ["URL", "DOMAIN"],
    enabled: true,
    requiresApproval: false,
    parallelSafe: true,
    tags: ["browser", "playwright", "evidence"],
    endpointPath: "/mcp/tools/browser/render",
    timeoutSeconds: 120
  },
  {
    name: "browser_screenshot",
    displayName: "Browser Screenshot",
    description: "Screenshot capture through Browser MCP.",
    category: "browser",
    source: "Browser MCP",
    executionMode: "browser_automation",
    inputs: ["url", "domain"],
    outputs: ["screenshot_reference", "evidence"],
    acceptsTargetTypes: ["URL", "DOMAIN"],
    enabled: true,
    requiresApproval: false,
    parallelSafe: true,
    tags: ["browser", "playwright", "evidence"],
    endpointPath: "/mcp/tools/browser/screenshot",
    timeoutSeconds: 120
  }
];

const internalCapabilities: ToolCapability[] = [
  {
    name: "correlate_findings",
    displayName: "Correlation Engine",
    description: "Generate normalized relationships between collected entities.",
    category: "internal",
    source: "ReconVault Backend",
    executionMode: "internal",
    inputs: ["investigation_id", "target"],
    outputs: ["relationship", "correlation_summary"],
    acceptsTargetTypes: ["DOMAIN", "URL", "IP", "EMAIL", "USERNAME"],
    enabled: true,
    requiresApproval: false,
    parallelSafe: false,
    tags: ["internal", "correlation"]
  },
  {
    name: "risk_assessment",
    displayName: "Risk Assessment",
    description: "Apply ReconVault rule-based risk scoring to the current investigation target.",
    category: "internal",
    source: "ReconVault Backend",
    executionMode: "internal",
    inputs: ["target_id", "investigation_id"],
    outputs: ["risk_score", "risk_level", "risk_factors"],
    acceptsTargetTypes: ["DOMAIN", "URL", "IP", "EMAIL", "USERNAME"],
    enabled: true,
    requiresApproval: false,
    parallelSafe: false,
    tags: ["internal", "risk"]
  }
];

export class ToolRegistry {
  private buildCollectorCapabilities(): ToolCapability[] {
    return Object.keys(collectorsRegistry).map((name) => {
      const details = collectorDetails[name] || {
        inputs: ["target"],
        outputs: ["finding"],
        acceptsTargetTypes: ["DOMAIN", "URL", "IP", "EMAIL", "USERNAME"],
        requiresApproval: false,
        parallelSafe: true,
        tags: ["built_in", "collector"],
        timeoutSeconds: 60
      };

      return {
        name,
        displayName: `${name.charAt(0).toUpperCase()}${name.slice(1)} Collector`,
        description: `Built-in ReconVault ${name} intelligence collector.`,
        category: "collector",
        source: "ReconVault Collector",
        executionMode: "collector",
        enabled: true,
        ...details,
        tags: defaultCollectors.includes(name) ? Array.from(new Set([...details.tags, "default"])) : details.tags
      };
    });
  }

  list(filter: ToolFilter = {}): ToolCapability[] {
    let tools = [
      ...this.buildCollectorCapabilities(),
      ...mcpCapabilities,
      ...apiCapabilities,
      ...browserCapabilities,
      ...internalCapabilities
    ];

    if (filter.category) tools = tools.filter((tool) => tool.category === filter.category);
    if (filter.enabled !== undefined) tools = tools.filter((tool) => tool.enabled === filter.enabled);
    return tools;
  }

  get(name: string): ToolCapability | undefined {
    const normalized = String(name || "").toLowerCase();
    return this.list().find((tool) => tool.name.toLowerCase() === normalized);
  }

  getToolContext() {
    const collectors = this.list({ category: "collector" });
    const mcpTools = this.list({ category: "mcp" });
    const apiIntegrations = this.list({ category: "api" });
    const browserCapabilities = this.list({ category: "browser" });
    const internalTools = this.list({ category: "internal" });

    return {
      collectors,
      mcp_tools: mcpTools,
      api_integrations: apiIntegrations,
      browser_capabilities: browserCapabilities,
      internal_tools: internalTools,
      all_tools: [...collectors, ...mcpTools, ...apiIntegrations, ...browserCapabilities, ...internalTools]
    };
  }

  validateStepTool(toolName: string): { valid: boolean; tool?: ToolCapability; error?: string } {
    const tool = this.get(toolName);
    if (!tool) return { valid: false, error: `Unknown tool: ${toolName}` };
    if (!tool.enabled) return { valid: false, tool, error: `Tool is disabled: ${toolName}` };
    return { valid: true, tool };
  }
}

export const toolRegistry = new ToolRegistry();
