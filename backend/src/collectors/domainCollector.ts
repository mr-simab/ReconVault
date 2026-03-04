import axios from "axios";
import { promises as dns } from "node:dns";
import whois from "whois-json";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { CollectorResult } from "../models/types";
import { BaseCollector } from "./baseCollector";

export class DomainCollector extends BaseCollector {
  constructor() {
    super("domain");
  }

  async collect(target: string): Promise<CollectorResult> {
    const findings = [];
    const relationships = [];

    const whoisData = await this.lookupWhois(target);
    findings.push({
      type: "DOMAIN",
      value: target,
      riskLevel: "INFO",
      metadata: { whois: whoisData },
      source: `domain:whois:${whoisData.source}`
    });

    const dnsData = await this.lookupDns(target);
    findings.push({
      type: "DOMAIN_DNS",
      value: target,
      riskLevel: "LOW",
      metadata: dnsData,
      source: `domain:dns:${dnsData.source}`
    });

    const sslData = await this.lookupSsl(target);
    findings.push({
      type: "SSL",
      value: target,
      riskLevel: "LOW",
      metadata: sslData,
      source: `domain:ssl:${sslData.source}`
    });

    const waybackData = await this.lookupWayback(target);
    findings.push({
      type: "DOMAIN_HISTORY",
      value: target,
      riskLevel: "INFO",
      metadata: waybackData,
      source: `domain:wayback:${waybackData.source}`
    });

    const reputationData = await this.lookupReputation(target);
    findings.push({
      type: "DOMAIN_REPUTATION",
      value: target,
      riskLevel: reputationData.data.malicious ? "HIGH" : "LOW",
      metadata: reputationData,
      source: `domain:reputation:${reputationData.source}`
    });

    if (Array.isArray(dnsData.data?.aRecords)) {
      for (const ip of dnsData.data.aRecords) {
        relationships.push({
          source: target,
          target: String(ip),
          relationshipType: "RESOLVES_TO",
          metadata: { source: "dns_lookup" }
        });
      }
    }

    return {
      collector: this.name,
      findings,
      relationships,
      details: { whois: whoisData, dns: dnsData, ssl: sslData, wayback: waybackData, reputation: reputationData }
    };
  }

  private async lookupWhois(target: string) {
    try {
      const data = await whois(target);
      return this.realResult("whois-json", data);
    } catch (error: any) {
      logger.warn(`domain/whois failed for ${target}: ${error.message}`);
      return this.mockResult("whois-json", { domain: target, registrar: "unknown" }, "WHOIS lookup failed");
    }
  }

  private async lookupDns(target: string) {
    try {
      const [aRecords, mxRecords, txtRecords, nsRecords] = await Promise.all([
        dns.resolve4(target).catch(() => []),
        dns.resolveMx(target).catch(() => []),
        dns.resolveTxt(target).catch(() => []),
        dns.resolveNs(target).catch(() => [])
      ]);

      return this.realResult("node:dns", { aRecords, mxRecords, txtRecords, nsRecords });
    } catch (error: any) {
      logger.warn(`domain/dns failed for ${target}: ${error.message}`);
      return this.mockResult("node:dns", { aRecords: [], mxRecords: [], txtRecords: [], nsRecords: [] }, "DNS lookup failed");
    }
  }

  private async lookupSsl(target: string) {
    try {
      const { data } = await axios.get("https://api.ssllabs.com/api/v3/analyze", {
        params: { host: target, fromCache: "on", all: "done" },
        timeout: 10000
      });
      return this.realResult("ssllabs", data);
    } catch (error: any) {
      logger.warn(`domain/ssl failed for ${target}: ${error.message}`);
      return this.mockResult("ssllabs", { status: "UNKNOWN", host: target }, "SSL Labs API failed");
    }
  }

  private async lookupWayback(target: string) {
    try {
      const { data } = await axios.get("https://web.archive.org/cdx/search/cdx", {
        params: { url: target, output: "json", fl: "timestamp,original,statuscode", limit: 20 },
        timeout: 10000
      });
      return this.realResult("wayback-cdx", data);
    } catch (error: any) {
      logger.warn(`domain/wayback failed for ${target}: ${error.message}`);
      return this.mockResult("wayback-cdx", [], "Wayback API failed");
    }
  }

  private async lookupReputation(target: string) {
    const malicious = { malicious: false, engines: [] as string[] };

    if (env.virusTotalApiKey) {
      try {
        const { data } = await axios.get(`https://www.virustotal.com/api/v3/domains/${target}`, {
          headers: { "x-apikey": env.virusTotalApiKey },
          timeout: 10000
        });
        const stats = data?.data?.attributes?.last_analysis_stats || {};
        const maliciousCount = Number(stats.malicious || 0);
        malicious.malicious = maliciousCount > 0;
        malicious.engines.push("virustotal");
      } catch (error: any) {
        logger.warn(`domain/virustotal failed for ${target}: ${error.message}`);
      }
    } else {
      logger.warn("VIRUSTOTAL_API_KEY is missing; skipping VirusTotal domain reputation");
    }

    try {
      const { data } = await axios.get(`https://urlhaus-api.abuse.ch/v1/host/${target}/`, { timeout: 10000 });
      if (data?.query_status === "ok" && Array.isArray(data?.urls) && data.urls.length > 0) {
        malicious.malicious = true;
        malicious.engines.push("urlhaus");
      }
    } catch (error: any) {
      logger.warn(`domain/urlhaus failed for ${target}: ${error.message}`);
    }

    const source = malicious.engines.length ? "real" : "mock";
    if (source === "real") return this.realResult("virustotal+urlhaus", malicious);
    return this.mockResult("virustotal+urlhaus", malicious, "No reputation APIs returned data");
  }
}
