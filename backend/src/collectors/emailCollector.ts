import axios from "axios";
import { promises as dns } from "node:dns";
import validator from "validator";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { CollectorResult } from "../models/types";
import { BaseCollector } from "./baseCollector";

export class EmailCollector extends BaseCollector {
  constructor() {
    super("email");
  }

  async collect(target: string): Promise<CollectorResult> {
    const findings = [];
    const relationships = [];
    const [local, domain] = target.split("@");

    const validation = this.validateEmail(target);
    findings.push({
      type: "EMAIL",
      value: target,
      riskLevel: validation.data.valid ? "LOW" : "HIGH",
      metadata: validation,
      source: `email:validation:${validation.source}`
    });

    const mx = await this.lookupMx(domain || "");
    findings.push({
      type: "EMAIL_MX",
      value: domain || target,
      riskLevel: "INFO",
      metadata: mx,
      source: `email:mx:${mx.source}`
    });

    const breaches = await this.lookupBreaches(target);
    findings.push({
      type: "EMAIL_BREACH",
      value: target,
      riskLevel: breaches.data.count > 0 ? "CRITICAL" : "LOW",
      metadata: breaches,
      source: `email:hibp:${breaches.source}`
    });

    const associated = await this.lookupAssociatedAccounts(local || "");
    findings.push({
      type: "ACCOUNT_PRESENCE",
      value: local || target,
      riskLevel: associated.data.matches.length > 0 ? "MEDIUM" : "INFO",
      metadata: associated,
      source: `email:accounts:${associated.source}`
    });

    if (domain) {
      relationships.push({
        source: target,
        target: domain,
        relationshipType: "BELONGS_TO_DOMAIN",
        metadata: { source: "email_domain_extraction" }
      });
    }

    return {
      collector: this.name,
      findings,
      relationships,
      details: { validation, mx, breaches, associated }
    };
  }

  private validateEmail(email: string) {
    const valid = validator.isEmail(email);
    return this.realResult("validator", { valid, normalized: validator.normalizeEmail(email) });
  }

  private async lookupMx(domain: string) {
    if (!domain) return this.mockResult("node:dns", { records: [] }, "No domain in email");
    try {
      const records = await dns.resolveMx(domain);
      return this.realResult("node:dns", { records });
    } catch (error: any) {
      logger.warn(`email/mx failed for ${domain}: ${error.message}`);
      return this.mockResult("node:dns", { records: [] }, "MX lookup failed");
    }
  }

  private async lookupBreaches(email: string) {
    if (!env.hibpApiKey) {
      logger.warn("HIBP_API_KEY is missing; breach checks may be limited");
      return this.mockResult("haveibeenpwned", { count: 0, breaches: [] }, "HIBP key missing");
    }
    try {
      const { data } = await axios.get(`https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}`, {
        params: { truncateResponse: false },
        headers: { "hibp-api-key": env.hibpApiKey, "user-agent": "ReconVault/1.0" },
        timeout: 10000
      });
      return this.realResult("haveibeenpwned", { count: Array.isArray(data) ? data.length : 0, breaches: data || [] });
    } catch (error: any) {
      if (error.response?.status === 404) return this.realResult("haveibeenpwned", { count: 0, breaches: [] });
      logger.warn(`email/hibp failed for ${email}: ${error.message}`);
      return this.mockResult("haveibeenpwned", { count: 0, breaches: [] }, "HIBP API failed");
    }
  }

  private async lookupAssociatedAccounts(username: string) {
    if (!username) return this.mockResult("public-apis", { matches: [] }, "No username part in email");
    const matches: Record<string, string>[] = [];
    let anyReal = false;

    try {
      await axios.get(`https://api.github.com/users/${username}`, {
        headers: env.githubToken ? { Authorization: `Bearer ${env.githubToken}` } : undefined,
        timeout: 8000
      });
      matches.push({ platform: "github", username, url: `https://github.com/${username}` });
      anyReal = true;
    } catch {
      // not found/limited
    }

    try {
      await axios.get(`https://www.reddit.com/user/${username}/about.json`, { timeout: 8000 });
      matches.push({ platform: "reddit", username, url: `https://www.reddit.com/user/${username}` });
      anyReal = true;
    } catch {
      // not found/limited
    }

    if (anyReal) return this.realResult("github+reddit", { matches });
    return this.mockResult("github+reddit", { matches: [] }, "Associated account lookups returned no data");
  }
}
