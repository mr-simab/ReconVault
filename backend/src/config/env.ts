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
  databaseUrl: process.env.DATABASE_URL || "",
  hibpApiKey: process.env.HIBP_API_KEY || "",
  virusTotalApiKey: process.env.VIRUSTOTAL_API_KEY || "",
  abuseIpDbApiKey: process.env.ABUSEIPDB_API_KEY || "",
  githubToken: process.env.GITHUB_TOKEN || "",
  shodanApiKey: process.env.SHODAN_API_KEY || "",
  builtWithApiKey: process.env.BUILTWITH_API_KEY || "",
  wappalyzerApiKey: process.env.WAPPALYZER_API_KEY || "",
  googleVisionApiKey: process.env.GOOGLE_VISION_API_KEY || "",
  ocrSpaceApiKey: process.env.OCR_SPACE_API_KEY || "",
  faceppApiKey: process.env.FACEPP_API_KEY || "",
  faceppApiSecret: process.env.FACEPP_API_SECRET || ""
};

export function validateEnv(): void {
  if (!env.databaseUrl) {
    // Keep process alive in degraded mode; DB-backed routes will return 503.
    // This prevents full startup crashes when only partial services are available.
    // eslint-disable-next-line no-console
    console.warn("DATABASE_URL is not set. Backend will run in degraded mode until database is configured.");
  }
}
