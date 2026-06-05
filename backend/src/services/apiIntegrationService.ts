import axios from "axios";
import { env } from "../config/env";
import { CollectorFinding, CollectorRelationship, ToolCapability } from "../models/types";
import { detectTargetType } from "../utils/target";

const whoisJson = require("whois-json");

type ApiIntegrationOutput = {
  status: "completed" | "unavailable" | "failed";
  tool: string;
  source: string;
  reason?: string;
  output: unknown;
  findings: CollectorFinding[];
  relationships: CollectorRelationship[];
};

function asTarget(input: Record<string, unknown>, fallback: string): string {
  return String(input.target || input.domain || input.ip || input.email || input.url || fallback || "").trim();
}

function finding(type: string, value: string, source: string, metadata: unknown, riskLevel = "INFO"): CollectorFinding {
  return { type, value, source, metadata, riskLevel };
}

function unavailable(tool: ToolCapability, reason: string): ApiIntegrationOutput {
  return {
    status: "unavailable",
    tool: tool.name,
    source: tool.source,
    reason,
    output: null,
    findings: [
      finding("api_source_status", `${tool.name}:unavailable`, "unavailable", {
        api: tool.name,
        reason
      })
    ],
    relationships: []
  };
}

function completed(tool: ToolCapability, output: unknown, findings: CollectorFinding[] = [], relationships: CollectorRelationship[] = []): ApiIntegrationOutput {
  return {
    status: "completed",
    tool: tool.name,
    source: tool.source,
    output,
    findings,
    relationships
  };
}

export class ApiIntegrationService {
  async execute(tool: ToolCapability, input: Record<string, unknown>, fallbackTarget: string): Promise<ApiIntegrationOutput> {
    const target = asTarget(input, fallbackTarget);
    const targetType = detectTargetType(target);

    if (tool.name === "whois") return this.executeWhois(tool, target, targetType);
    if (tool.name === "hibp") return this.executeHibp(tool, target, targetType);
    if (tool.name === "virustotal") return this.executeVirusTotal(tool, target, targetType);
    if (tool.name === "shodan") return this.executeShodan(tool, target, targetType);
    if (tool.name === "abuseipdb") return this.executeAbuseIpDb(tool, target, targetType);
    if (tool.name === "securitytrails") return this.executeSecurityTrails(tool, target, targetType);

    return unavailable(tool, `No executor exists for API integration ${tool.name}.`);
  }

  private async executeWhois(tool: ToolCapability, target: string, targetType: string): Promise<ApiIntegrationOutput> {
    if (targetType !== "DOMAIN") return unavailable(tool, "WHOIS enrichment requires a domain target.");

    const output = await whoisJson(target);
    const org = output?.org || output?.registrantOrganization || output?.registrar || output?.organization;
    const findings = [
      finding("whois_record", target, "real", {
        registrar: output?.registrar,
        creationDate: output?.creationDate,
        updatedDate: output?.updatedDate,
        expirationDate: output?.expirationDate,
        nameServers: output?.nameServers
      }),
      ...(org ? [finding("organization", String(org), "real", { provider: "whois" })] : [])
    ];

    return completed(tool, output, findings, org ? [{
      source: target,
      target: String(org),
      relationshipType: "owned_by",
      metadata: { generatedBy: "api_integration", provider: "whois" }
    }] : []);
  }

  private async executeHibp(tool: ToolCapability, target: string, targetType: string): Promise<ApiIntegrationOutput> {
    if (targetType !== "EMAIL") return unavailable(tool, "HIBP enrichment requires an email target.");
    if (!env.hibpApiKey) return unavailable(tool, "HIBP_API_KEY is not configured.");

    const response = await axios.get(`https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(target)}`, {
      params: { truncateResponse: "false" },
      timeout: 30000,
      headers: {
        "hibp-api-key": env.hibpApiKey,
        "User-Agent": "ReconVault"
      },
      validateStatus: (status) => status === 200 || status === 404
    });

    const breaches = response.status === 404 ? [] : response.data || [];
    const riskLevel = breaches.length >= 5 ? "HIGH" : breaches.length > 0 ? "MEDIUM" : "INFO";
    return completed(tool, { breaches, count: breaches.length }, [
      finding("breach_signal", target, "real", {
        breachCount: breaches.length,
        breaches: breaches.slice(0, 20).map((breach: any) => ({
          name: breach.Name,
          domain: breach.Domain,
          breachDate: breach.BreachDate,
          dataClasses: breach.DataClasses
        }))
      }, riskLevel)
    ]);
  }

  private async executeVirusTotal(tool: ToolCapability, target: string, targetType: string): Promise<ApiIntegrationOutput> {
    if (!env.virusTotalApiKey) return unavailable(tool, "VIRUSTOTAL_API_KEY is not configured.");

    const endpoint = targetType === "IP"
      ? `https://www.virustotal.com/api/v3/ip_addresses/${encodeURIComponent(target)}`
      : targetType === "URL"
        ? `https://www.virustotal.com/api/v3/urls/${Buffer.from(target).toString("base64url")}`
        : `https://www.virustotal.com/api/v3/domains/${encodeURIComponent(target)}`;

    const response = await axios.get(endpoint, {
      timeout: 30000,
      headers: { "x-apikey": env.virusTotalApiKey }
    });

    const stats = response.data?.data?.attributes?.last_analysis_stats || {};
    const malicious = Number(stats.malicious || 0);
    const suspicious = Number(stats.suspicious || 0);
    const riskLevel = malicious > 0 ? "HIGH" : suspicious > 0 ? "MEDIUM" : "INFO";
    return completed(tool, response.data, [
      finding("reputation_signal", target, "real", {
        provider: "virustotal",
        malicious,
        suspicious,
        harmless: stats.harmless || 0,
        undetected: stats.undetected || 0
      }, riskLevel)
    ]);
  }

  private async executeShodan(tool: ToolCapability, target: string, targetType: string): Promise<ApiIntegrationOutput> {
    if (!env.shodanApiKey) return unavailable(tool, "SHODAN_API_KEY is not configured.");

    const isIp = targetType === "IP";
    const response = await axios.get(
      isIp
        ? `https://api.shodan.io/shodan/host/${encodeURIComponent(target)}`
        : "https://api.shodan.io/shodan/host/search",
      {
        timeout: 30000,
        params: isIp ? { key: env.shodanApiKey } : { key: env.shodanApiKey, query: `hostname:${target}` }
      }
    );

    const services = isIp ? response.data?.data || [] : response.data?.matches || [];
    return completed(tool, response.data, [
      finding("exposure_signal", target, "real", {
        provider: "shodan",
        serviceCount: services.length,
        ports: Array.from(new Set(services.map((item: any) => item.port).filter(Boolean))).slice(0, 50)
      }, services.length > 10 ? "MEDIUM" : "INFO")
    ]);
  }

  private async executeAbuseIpDb(tool: ToolCapability, target: string, targetType: string): Promise<ApiIntegrationOutput> {
    if (targetType !== "IP") return unavailable(tool, "AbuseIPDB enrichment requires an IP target.");
    if (!env.abuseIpDbApiKey) return unavailable(tool, "ABUSEIPDB_API_KEY is not configured.");

    const response = await axios.get("https://api.abuseipdb.com/api/v2/check", {
      timeout: 30000,
      params: { ipAddress: target, maxAgeInDays: 90 },
      headers: { Key: env.abuseIpDbApiKey, "Accept": "application/json" }
    });

    const score = Number(response.data?.data?.abuseConfidenceScore || 0);
    const riskLevel = score >= 75 ? "HIGH" : score >= 25 ? "MEDIUM" : "INFO";
    return completed(tool, response.data, [
      finding("abuse_signal", target, "real", {
        provider: "abuseipdb",
        abuseConfidenceScore: score,
        countryCode: response.data?.data?.countryCode,
        usageType: response.data?.data?.usageType,
        totalReports: response.data?.data?.totalReports
      }, riskLevel)
    ]);
  }

  private async executeSecurityTrails(tool: ToolCapability, target: string, targetType: string): Promise<ApiIntegrationOutput> {
    if (targetType !== "DOMAIN" && targetType !== "IP") return unavailable(tool, "SecurityTrails enrichment requires a domain or IP target.");
    if (!env.securityTrailsApiKey) return unavailable(tool, "SECURITYTRAILS_API_KEY is not configured.");

    const endpoint = targetType === "IP"
      ? `https://api.securitytrails.com/v1/history/${encodeURIComponent(target)}/dns/a`
      : `https://api.securitytrails.com/v1/domain/${encodeURIComponent(target)}`;

    const response = await axios.get(endpoint, {
      timeout: 30000,
      headers: { APIKEY: env.securityTrailsApiKey }
    });

    const subdomains = Array.isArray(response.data?.subdomains) ? response.data.subdomains : [];
    const findings = [
      finding("asset_signal", target, "real", {
        provider: "securitytrails",
        subdomainCount: subdomains.length,
        apexDomain: response.data?.hostname || target
      }),
      ...subdomains.slice(0, 50).map((subdomain: string) =>
        finding("subdomain", `${subdomain}.${target}`, "real", { provider: "securitytrails" })
      )
    ];

    const relationships = subdomains.slice(0, 50).map((subdomain: string) => ({
      source: `${subdomain}.${target}`,
      target,
      relationshipType: "belongs_to",
      metadata: { generatedBy: "api_integration", provider: "securitytrails" }
    }));

    return completed(tool, response.data, findings, relationships);
  }
}

export const apiIntegrationService = new ApiIntegrationService();
