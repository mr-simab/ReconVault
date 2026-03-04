import net from "node:net";

const domainRegex = /^(?!-)(?:[a-zA-Z0-9-]{1,63}\.)+[A-Za-z]{2,}$/;

export function detectTargetType(value: string): string {
  if (!value) return "UNKNOWN";
  if (value.includes("@")) return "EMAIL";
  if (net.isIP(value)) return "IP";
  if (value.startsWith("http://") || value.startsWith("https://")) return "URL";
  if (domainRegex.test(value)) return "DOMAIN";
  return "USERNAME";
}

export function ensureUrl(input: string): string {
  if (input.startsWith("http://") || input.startsWith("https://")) return input;
  return `https://${input}`;
}
