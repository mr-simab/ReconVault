export type DataSourceLabel = "real" | "unavailable";

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
  targetId: string | number;
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

export type ToolCategory = "collector" | "mcp" | "api" | "browser" | "internal";
export type ToolExecutionMode = "collector" | "mcp_gateway" | "api_integration" | "browser_automation" | "internal";

export interface ToolCapability {
  name: string;
  displayName: string;
  description: string;
  category: ToolCategory;
  source: string;
  executionMode: ToolExecutionMode;
  inputs: string[];
  outputs: string[];
  acceptsTargetTypes: string[];
  enabled: boolean;
  requiresApproval: boolean;
  parallelSafe: boolean;
  tags: string[];
  timeoutSeconds?: number;
  endpointPath?: string;
}

export interface PlanStep {
  id: string;
  tool: string;
  purpose: string;
  inputs: Record<string, unknown>;
  expectedOutputs: string[];
  dependsOn: string[];
  parallelGroup?: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
}

export interface InvestigationPlan {
  planId: string;
  investigationId?: string;
  target: string;
  targetType: string;
  userRequest: string;
  reasoning: string;
  plannerMode: "llm_provider" | "deterministic_fallback";
  provider?: string;
  model?: string;
  steps: PlanStep[];
  warnings: string[];
  createdAt: string;
}

export interface ToolExecutionResult {
  stepId: string;
  tool: string;
  status: "completed" | "failed" | "skipped" | "unavailable";
  startedAt: string;
  completedAt: string;
  outputSummary: Record<string, unknown>;
  evidenceId?: string | number;
  error?: string;
}
