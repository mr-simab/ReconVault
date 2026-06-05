import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

const envCandidates = [
  path.resolve(process.cwd(), "backend/.env")
];

if (path.basename(process.cwd()).toLowerCase() === "backend") {
  envCandidates.unshift(path.resolve(process.cwd(), ".env"));
}

envCandidates.push(
  path.resolve(__dirname, "../../.env")
);

const envPath = envCandidates.find((p) => fs.existsSync(p));
if (envPath) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 8000),
  host: process.env.HOST || "0.0.0.0",
  firebaseDatabaseUrl: process.env.FIREBASE_DATABASE_URL || "",
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || "",
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL || "",
  firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY || "",
  firebaseServiceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "",
  hibpApiKey: process.env.HIBP_API_KEY || "",
  virusTotalApiKey: process.env.VIRUSTOTAL_API_KEY || "",
  abuseIpDbApiKey: process.env.ABUSEIPDB_API_KEY || "",
  githubToken: process.env.GITHUB_TOKEN || "",
  shodanApiKey: process.env.SHODAN_API_KEY || "",
  securityTrailsApiKey: process.env.SECURITYTRAILS_API_KEY || "",
  builtWithApiKey: process.env.BUILTWITH_API_KEY || "",
  wappalyzerApiKey: process.env.WAPPALYZER_API_KEY || "",
  googleVisionApiKey: process.env.GOOGLE_VISION_API_KEY || "",
  ocrSpaceApiKey: process.env.OCR_SPACE_API_KEY || "",
  faceppApiKey: process.env.FACEPP_API_KEY || "",
  faceppApiSecret: process.env.FACEPP_API_SECRET || "",
  llmProvider: process.env.LLM_PROVIDER || "",
  llmModel: process.env.LLM_MODEL || "",
  llmRequestTimeoutMs: Number(process.env.LLM_REQUEST_TIMEOUT_MS || 45000),
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  openrouterApiKey: process.env.OPENROUTER_API_KEY || "",
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
  mcpGatewayServersJson: process.env.MCP_GATEWAY_SERVERS_JSON || "",
  executionMaxParallelSteps: Number(process.env.EXECUTION_MAX_PARALLEL_STEPS || 4)
};

export function validateEnv(): void {
  if (!env.firebaseDatabaseUrl) {
    // Keep process alive in degraded mode. Read-only list routes can return
    // empty degraded payloads while persisted writes still require Firebase.
    // This prevents full startup crashes when only partial services are available.
    // eslint-disable-next-line no-console
    console.warn("FIREBASE_DATABASE_URL is not set. Backend will run in degraded mode until Firebase is configured.");
  }
}
