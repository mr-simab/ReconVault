export type DataSourceLabel = "real" | "mock";

export interface CollectorFinding {
  type: string;
  value: string;
  riskLevel?: string;
  metadata: unknown;
  source: string;
}

export interface CollectorRelationship {
  source: string;
  target: string;
  relationshipType: string;
  metadata?: unknown;
}

export interface CollectorResult {
  collector: string;
  findings: CollectorFinding[];
  relationships: CollectorRelationship[];
  details: unknown;
}

export interface ApiResult<T = unknown> {
  data: T;
  source: DataSourceLabel;
  api: string;
  reason?: string;
}

export interface CollectionTaskState {
  taskId: string;
  targetId: number;
  target: string;
  status: "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  progress: number;
  entitiesCollected: number;
  relationshipsCollected: number;
  collectorsCompleted: string[];
  collectorsFailed: string[];
  errors: string[];
  startTime: string;
  endTime?: string;
  collectorsRequested: string[];
}
