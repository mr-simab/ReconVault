import { dataStore } from "./dataStore";

type GraphQuery = {
  type?: string;
  limit?: number;
  targetId?: string | number;
};

function toNode(entity: any) {
  return {
    id: `entity-${entity.id}`,
    label: entity.value,
    value: entity.value,
    type: entity.type,
    riskLevel: entity.riskLevel,
    properties: entity.metadata,
    source: entity.source,
    targetId: entity.targetId,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt
  };
}

function buildValueIndex(entities: any[]) {
  const index = new Map<string, string>();
  for (const entity of entities) {
    index.set(String(entity.value).toLowerCase(), `entity-${entity.id}`);
  }
  return index;
}

function toEdge(relationship: any, valueIndex: Map<string, string>) {
  const source = valueIndex.get(String(relationship.source).toLowerCase()) || String(relationship.source);
  const target = valueIndex.get(String(relationship.target).toLowerCase()) || String(relationship.target);

  return {
    id: `rel-${relationship.id}`,
    source,
    target,
    sourceValue: relationship.source,
    targetValue: relationship.target,
    type: relationship.relationshipType,
    properties: relationship.metadata || {},
    createdAt: relationship.createdAt,
    updatedAt: relationship.updatedAt
  };
}

export class KnowledgeGraphService {
  async getNodes(query: GraphQuery = {}) {
    const where: any = {};
    if (query.type) where.type = query.type;
    if (query.targetId !== undefined) where.targetId = String(query.targetId);

    const entities = await dataStore.entity.findMany({
      where,
      take: Number(query.limit || 1000),
      orderBy: { createdAt: "desc" }
    });
    return entities.map(toNode);
  }

  async getEdges(limit = 5000) {
    const [entities, relationships] = await Promise.all([
      dataStore.entity.findMany({ take: 1500, orderBy: { createdAt: "desc" } }),
      dataStore.relationship.findMany({ take: limit, orderBy: { createdAt: "desc" } })
    ]);
    const valueIndex = buildValueIndex(entities);
    return relationships.map((relationship) => toEdge(relationship, valueIndex));
  }

  async getGraph(query: GraphQuery = {}) {
    const [entities, relationships] = await Promise.all([
      dataStore.entity.findMany({
        where: query.targetId !== undefined ? { targetId: String(query.targetId) } : {},
        take: Number(query.limit || 1500),
        orderBy: { createdAt: "desc" }
      }),
      dataStore.relationship.findMany({ take: 5000, orderBy: { createdAt: "desc" } })
    ]);
    const valueIndex = buildValueIndex(entities);
    const nodes = entities.map(toNode);
    const nodeIds = new Set(nodes.map((node) => node.id));
    const edges = relationships
      .map((relationship) => toEdge(relationship, valueIndex))
      .filter((edge) => nodeIds.has(String(edge.source)) && nodeIds.has(String(edge.target)));
    return { nodes, edges };
  }

  async query(type: string, value: string) {
    if (type === "entity_value") {
      const nodes = await dataStore.entity.findMany({
        where: { value: { contains: String(value || ""), mode: "insensitive" } },
        take: 100
      });
      return { nodes };
    }

    if (type === "relationship_type") {
      const edges = await dataStore.relationship.findMany({ where: { relationshipType: String(value || "") }, take: 100 });
      return { edges };
    }

    throw new Error("Unsupported query type");
  }

  async getStats() {
    const [nodeCount, edgeCount] = await Promise.all([dataStore.entity.count(), dataStore.relationship.count()]);
    return { nodeCount, edgeCount, backend: "firebase_rtdb", futureBackend: "neo4j_ready_abstraction" };
  }
}

export const knowledgeGraphService = new KnowledgeGraphService();
