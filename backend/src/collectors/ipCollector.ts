import axios from "axios";
import { promises as dns } from "node:dns";
import whois from "whois-json";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { CollectorResult } from "../models/types";
import { BaseCollector } from "./baseCollector";

export class IpCollector extends BaseCollector {
  constructor() {
    super("ip");
  }

  async collect(target: string): Promise<CollectorResult> {
    const findings = [];

    const geolocation = await this.lookupGeo(target);
    findings.push({
      type: "IP_GEO",
      value: target,
      riskLevel: "INFO",
      metadata: geolocation,
      source: `ip:geo:${geolocation.source}`
    });

    const reverseDns = await this.lookupReverseDns(target);
    findings.push({
      type: "IP_RDNS",
      value: target,
      riskLevel: "LOW",
      metadata: reverseDns,
      source: `ip:rdns:${reverseDns.source}`
    });

    const reputation = await this.lookupReputation(target);
    findings.push({
      type: "IP_REPUTATION",
      value: target,
      riskLevel: reputation.data.abuseConfidence > 60 ? "HIGH" : "LOW",
      metadata: reputation,
      source: `ip:reputation:${reputation.source}`
    });

    const whoisData = await this.lookupWhois(target);
    findings.push({
      type: "IP_WHOIS",
      value: target,
      riskLevel: "INFO",
      metadata: whoisData,
      source: `ip:whois:${whoisData.source}`
    });

    const vpnProxy = await this.lookupVpnProxy(target);
    findings.push({
      type: "IP_VPN_PROXY",
      value: target,
      riskLevel: vpnProxy.data.proxy ? "MEDIUM" : "LOW",
      metadata: vpnProxy,
      source: `ip:vpn:${vpnProxy.source}`
    });

    const ports = await this.lookupShodan(target);
    findings.push({
      type: "IP_PORTS",
      value: target,
      riskLevel: Array.isArray(ports.data.ports) && ports.data.ports.length > 0 ? "MEDIUM" : "LOW",
      metadata: ports,
      source: `ip:ports:${ports.source}`
    });

    return { collector: this.name, findings, relationships: [], details: { geolocation, reverseDns, reputation, whoisData, vpnProxy, ports } };
  }

  private async lookupGeo(ip: string) {
    try {
      const { data } = await axios.get(`http://ip-api.com/json/${ip}`, { timeout: 10000 });
      if (data?.status === "success") return this.realResult("ip-api.com", data);
      throw new Error("ip-api returned non-success");
    } catch (error: any) {
      logger.warn(`ip/geolocation failed for ${ip}: ${error.message}`);
      return this.mockResult("ip-api.com", { query: ip, country: "Unknown", status: "fail" }, "Geolocation API failed");
    }
  }

  private async lookupReverseDns(ip: string) {
    try {
      const hostnames = await dns.reverse(ip);
      return this.realResult("node:dns", { hostnames });
    } catch (error: any) {
      logger.warn(`ip/reverse-dns failed for ${ip}: ${error.message}`);
      return this.mockResult("node:dns", { hostnames: [] }, "Reverse DNS failed");
    }
  }

  private async lookupReputation(ip: string) {
    let abuseConfidence = 0;
    let engines: string[] = [];

    if (env.abuseIpDbApiKey) {
      try {
        const { data } = await axios.get("https://api.abuseipdb.com/api/v2/check", {
          params: { ipAddress: ip, maxAgeInDays: 90, verbose: true },
          headers: { Key: env.abuseIpDbApiKey, Accept: "application/json" },
          timeout: 10000
        });
        abuseConfidence = Math.max(abuseConfidence, Number(data?.data?.abuseConfidenceScore || 0));
        engines.push("abuseipdb");
      } catch (error: any) {
        logger.warn(`ip/abuseipdb failed for ${ip}: ${error.message}`);
      }
    } else {
      logger.warn("ABUSEIPDB_API_KEY is missing; skipping AbuseIPDB check");
    }

    if (env.virusTotalApiKey) {
      try {
        const { data } = await axios.get(`https://www.virustotal.com/api/v3/ip_addresses/${ip}`, {
          headers: { "x-apikey": env.virusTotalApiKey },
          timeout: 10000
        });
        const stats = data?.data?.attributes?.last_analysis_stats || {};
        const maliciousCount = Number(stats.malicious || 0);
        abuseConfidence = Math.max(abuseConfidence, maliciousCount * 10);
        engines.push("virustotal");
      } catch (error: any) {
        logger.warn(`ip/virustotal failed for ${ip}: ${error.message}`);
      }
    }

    if (engines.length) return this.realResult("abuseipdb+virustotal", { abuseConfidence, engines });
    return this.mockResult("abuseipdb+virustotal", { abuseConfidence, engines }, "No reputation data available");
  }

  private async lookupWhois(ip: string) {
    try {
      const data = await whois(ip);
      return this.realResult("whois-json", data);
    } catch (error: any) {
      logger.warn(`ip/whois failed for ${ip}: ${error.message}`);
      return this.mockResult("whois-json", { ip, org: "unknown" }, "WHOIS failed");
    }
  }

  private async lookupVpnProxy(ip: string) {
    try {
      const { data } = await axios.get(`https://ipapi.co/${ip}/json/`, { timeout: 10000 });
      const proxy = Boolean(data?.proxy || data?.security?.is_proxy || data?.security?.is_vpn);
      return this.realResult("ipapi.co", { proxy, raw: data });
    } catch (error: any) {
      logger.warn(`ip/vpn-proxy failed for ${ip}: ${error.message}`);
      return this.mockResult("ipapi.co", { proxy: false }, "VPN/proxy detection failed");
    }
  }

  private async lookupShodan(ip: string) {
    if (!env.shodanApiKey) {
      logger.warn("SHODAN_API_KEY is missing; skipping online port scan lookup");
      return this.mockResult("shodan", { ports: [] }, "Shodan key missing");
    }
    try {
      const { data } = await axios.get(`https://api.shodan.io/shodan/host/${ip}`, {
        params: { key: env.shodanApiKey },
        timeout: 10000
      });
      return this.realResult("shodan", { ports: data?.ports || [], tags: data?.tags || [] });
    } catch (error: any) {
      logger.warn(`ip/shodan failed for ${ip}: ${error.message}`);
      return this.mockResult("shodan", { ports: [] }, "Shodan API failed");
    }
  }
}
