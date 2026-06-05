import { dataStore } from "./dataStore";
import { investigationService } from "./investigationService";

type RelationshipCandidate = {
  source: string;
  target: string;
  relationshipType: string;
  metadata: Record<string, unknown>;
};

function normalizeDomain(value: string): string {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  try {
    const parsed = new URL(raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`);
    return parsed.hostname.replace(/^www\./, "");
  } catch (_error) {
    return raw.replace(/^www\./, "");
  }
}

function emailDomain(value: string): string {
  const parts = String(value || "").toLowerCase().split("@");
  return parts.length === 2 ? parts[1] : "";
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

function collectStrings(value: unknown, limit = 100): string[] {
  const results: string[] = [];
  const visit = (item: unknown) => {
    if (results.length >= limit) return;
    if (typeof item === "string" || typeof item === "number") {
      results.push(String(item));
      return;
    }
    if (Array.isArray(item)) {
      for (const nested of item) visit(nested);
      return;
    }
    if (item && typeof item === "object") {
      for (const nested of Object.values(item as Record<string, unknown>)) visit(nested);
    }
  };
  visit(value);
  return results;
}

function isIp(value: string): boolean {
  return /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/.test(value);
}

function isDomain(value: string): boolean {
  return /^(?!-)(?:[a-zA-Z0-9-]{1,63}\.)+[A-Za-z]{2,}$/.test(value);
}

function addCandidate(candidates: RelationshipCandidate[], candidate: RelationshipCandidate) {
  if (!candidate.source || !candidate.target || candidate.source === candidate.target) return;
  candidates.push(candidate);
}

export class CorrelationService {
  async correlateInvestigation(investigationId?: string, target?: string) {
    const investigation = investigationId ? await investigationService.getInvestigation(investigationId) : null;
    const targetId = investigation?.targetId;
    const targetDomain = normalizeDomain(target || investigation?.target || "");

    const entities = targetId
      ? await dataStore.entity.findMany({ where: { targetId: String(targetId) }, take: 1500, orderBy: { createdAt: "desc" } })
      : await dataStore.entity.findMany({ take: 1500, orderBy: { createdAt: "desc" } });
    const iocs = investigation?.investigationId
      ? await dataStore.ioc.findMany({ take: 1000, orderBy: { lastSeen: "desc" } })
      : [];

    const allValues = new Set(entities.map((entity) => String(entity.value || "").toLowerCase()));
    const domains = new Set<string>();
    const ips = new Set<string>();
    const asns = new Set<string>();
    const organizations = new Set<string>();
    const technologies = new Set<string>();
    const candidates: RelationshipCandidate[] = [];

    for (const entity of entities) {
      const value = String(entity.value || "");
      const type = String(entity.type || "").toUpperCase();
      const metadata = entity.metadata || {};
      const strings = collectStrings(metadata);

      if (type.includes("DOMAIN") || isDomain(normalizeDomain(value))) domains.add(normalizeDomain(value));
      if (type.includes("IP") || isIp(value)) ips.add(value);
      if (type.includes("ASN")) asns.add(value.toUpperCase());
      if (type.includes("ORG") || type.includes("WHOIS")) {
        for (const org of [...asArray((metadata as any).org), ...asArray((metadata as any).organization), ...asArray((metadata as any).registrar)]) {
          if (org) organizations.add(String(org));
        }
      }
      if (type.includes("TECH")) {
        for (const tech of strings.filter((item) => item.length > 1 && item.length < 80).slice(0, 20)) technologies.add(tech);
      }

      for (const item of strings) {
        const text = String(item);
        if (isIp(text)) ips.add(text);
        if (/^AS\d+$/i.test(text)) asns.add(text.toUpperCase());
      }
    }

    for (const entity of entities) {
      const value = String(entity.value || "");
      const type = String(entity.type || "").toUpperCase();
      const metadata = entity.metadata || {};
      const host = normalizeDomain(value);
      const strings = collectStrings(metadata);

      if (type.includes("EMAIL")) {
        const domain = emailDomain(value);
        if (domain) addCandidate(candidates, {
          source: value,
          target: allValues.has(domain) ? domain : targetDomain || domain,
          relationshipType: "uses",
          metadata: { generatedBy: "correlation_engine", reason: "email_domain_match" }
        });
      }

      if (type.includes("SUBDOMAIN") || type.includes("WEB") || type.includes("URL") || type.includes("WEBSITE")) {
        if (host && targetDomain && host.endsWith(targetDomain) && host !== targetDomain) {
          addCandidate(candidates, {
            source: host,
            target: targetDomain,
            relationshipType: "belongs_to",
            metadata: { generatedBy: "correlation_engine", reason: "subdomain_parent_domain" }
          });
        }

        for (const tech of technologies) {
          addCandidate(candidates, {
            source: host || value,
            target: tech,
            relationshipType: "uses_technology",
            metadata: { generatedBy: "correlation_engine", reason: "website_technology_context" }
          });
        }
      }

      if (type.includes("DOMAIN")) {
        const domain = host || value;
        for (const ip of strings.filter(isIp).slice(0, 20)) {
          addCandidate(candidates, {
            source: domain,
            target: ip,
            relationshipType: "resolves_to",
            metadata: { generatedBy: "correlation_engine", reason: "domain_ip_metadata" }
          });
        }
        for (const asn of strings.filter((item) => /^AS\d+$/i.test(item)).slice(0, 10)) {
          addCandidate(candidates, {
            source: domain,
            target: asn.toUpperCase(),
            relationshipType: "belongs_to_asn",
            metadata: { generatedBy: "correlation_engine", reason: "domain_asn_metadata" }
          });
        }
        for (const org of organizations) {
          addCandidate(candidates, {
            source: domain,
            target: org,
            relationshipType: "owned_by",
            metadata: { generatedBy: "correlation_engine", reason: "domain_organization_context" }
          });
        }
      }

      if (type.includes("IP")) {
        for (const asn of strings.filter((item) => /^AS\d+$/i.test(item)).slice(0, 10)) {
          addCandidate(candidates, {
            source: value,
            target: asn.toUpperCase(),
            relationshipType: "belongs_to_asn",
            metadata: { generatedBy: "correlation_engine", reason: "ip_asn_metadata" }
          });
        }
        for (const org of organizations) {
          addCandidate(candidates, {
            source: value,
            target: org,
            relationshipType: "owned_by",
            metadata: { generatedBy: "correlation_engine", reason: "ip_organization_context" }
          });
        }
      }
    }

    for (const ioc of iocs) {
      const relatedEvidence = asArray(ioc.evidenceIds).map(String);
      const relatedInvestigations = asArray(ioc.investigationIds).map(String);
      if (investigation?.investigationId && !relatedInvestigations.includes(investigation.investigationId)) continue;
      for (const other of iocs) {
        if (ioc.id === other.id) continue;
        const overlapsEvidence = relatedEvidence.some((id) => asArray(other.evidenceIds).map(String).includes(id));
        if (!overlapsEvidence) continue;
        addCandidate(candidates, {
          source: ioc.value,
          target: other.value,
          relationshipType: "related_to",
          metadata: { generatedBy: "correlation_engine", reason: "ioc_shared_evidence", evidenceIds: relatedEvidence }
        });
      }
    }

    let created = 0;
    for (const candidate of candidates) {
      const existing = await dataStore.relationship.findMany({
        where: {
          source: candidate.source,
          target: candidate.target,
          relationshipType: candidate.relationshipType
        },
        take: 1
      });
      if (existing.length > 0) continue;
      await dataStore.relationship.create({ data: candidate });
      created += 1;
    }

    return {
      entitiesReviewed: entities.length,
      iocsReviewed: iocs.length,
      candidateRelationships: candidates.length,
      relationshipsCreated: created
    };
  }
}

export const correlationService = new CorrelationService();
