import axios from "axios";
import { env } from "../config/env";
import { logger } from "../config/logger";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type LlmProviderName = "openai" | "anthropic" | "gemini" | "openrouter" | "ollama";

type CompletionResult = {
  provider: string;
  model: string;
  content: string;
};

function normalizeProvider(value: string): LlmProviderName | "" {
  const normalized = String(value || "").trim().toLowerCase();
  if (["openai", "anthropic", "gemini", "openrouter", "ollama"].includes(normalized)) {
    return normalized as LlmProviderName;
  }
  return "";
}

function extractJsonObject(text: string): unknown | null {
  const raw = String(text || "").trim();
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (_error) {
    const first = raw.indexOf("{");
    const last = raw.lastIndexOf("}");
    if (first >= 0 && last > first) {
      try {
        return JSON.parse(raw.slice(first, last + 1));
      } catch (innerError) {
        logger.warn(`LLM JSON extraction failed: ${(innerError as Error).message}`);
      }
    }
  }

  return null;
}

export class LlmProviderService {
  getStatus() {
    const provider = normalizeProvider(env.llmProvider);
    const status = {
      provider: provider || "disabled",
      configured: false,
      model: this.resolveModel(provider)
    };

    if (!provider) return status;
    if (provider === "openai") status.configured = Boolean(env.openaiApiKey);
    if (provider === "anthropic") status.configured = Boolean(env.anthropicApiKey);
    if (provider === "gemini") status.configured = Boolean(env.geminiApiKey);
    if (provider === "openrouter") status.configured = Boolean(env.openrouterApiKey);
    if (provider === "ollama") status.configured = Boolean(env.ollamaBaseUrl && status.model);
    return status;
  }

  async completeJson(messages: ChatMessage[]): Promise<{ parsed: any | null; raw?: CompletionResult; error?: string }> {
    const status = this.getStatus();
    if (!status.configured) {
      return { parsed: null, error: `LLM provider is not configured: ${status.provider}` };
    }

    try {
      const raw = await this.complete(messages, status.provider as LlmProviderName, status.model);
      const parsed = extractJsonObject(raw.content);
      if (!parsed) return { parsed: null, raw, error: "Provider did not return parseable JSON" };
      return { parsed, raw };
    } catch (error: any) {
      logger.warn(`LLM provider request failed: ${error.message}`);
      return { parsed: null, error: error.message };
    }
  }

  private resolveModel(provider: LlmProviderName | ""): string {
    if (env.llmModel) return env.llmModel;
    if (provider === "openai") return "gpt-4.1-mini";
    if (provider === "anthropic") return "claude-3-5-sonnet-latest";
    if (provider === "gemini") return "gemini-1.5-flash";
    if (provider === "openrouter") return "openai/gpt-4.1-mini";
    if (provider === "ollama") return "llama3.1";
    return "";
  }

  private async complete(messages: ChatMessage[], provider: LlmProviderName, model: string): Promise<CompletionResult> {
    if (provider === "openai") return this.completeOpenAi(messages, model);
    if (provider === "anthropic") return this.completeAnthropic(messages, model);
    if (provider === "gemini") return this.completeGemini(messages, model);
    if (provider === "openrouter") return this.completeOpenRouter(messages, model);
    return this.completeOllama(messages, model);
  }

  private async completeOpenAi(messages: ChatMessage[], model: string): Promise<CompletionResult> {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model,
        messages,
        temperature: 0.2,
        response_format: { type: "json_object" }
      },
      {
        timeout: env.llmRequestTimeoutMs,
        headers: {
          Authorization: `Bearer ${env.openaiApiKey}`,
          "Content-Type": "application/json"
        }
      }
    );
    return { provider: "openai", model, content: response.data?.choices?.[0]?.message?.content || "" };
  }

  private async completeAnthropic(messages: ChatMessage[], model: string): Promise<CompletionResult> {
    const system = messages.find((message) => message.role === "system")?.content || "";
    const bodyMessages = messages
      .filter((message) => message.role !== "system")
      .map((message) => ({ role: message.role === "assistant" ? "assistant" : "user", content: message.content }));

    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model,
        max_tokens: 3000,
        temperature: 0.2,
        system,
        messages: bodyMessages
      },
      {
        timeout: env.llmRequestTimeoutMs,
        headers: {
          "x-api-key": env.anthropicApiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json"
        }
      }
    );
    const content = (response.data?.content || []).map((part: any) => part.text || "").join("\n");
    return { provider: "anthropic", model, content };
  }

  private async completeGemini(messages: ChatMessage[], model: string): Promise<CompletionResult> {
    const contents = messages
      .filter((message) => message.role !== "system")
      .map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }]
      }));
    const systemInstruction = messages.find((message) => message.role === "system")?.content;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(env.geminiApiKey)}`,
      {
        contents,
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json"
        }
      },
      { timeout: env.llmRequestTimeoutMs }
    );
    const content = response.data?.candidates?.[0]?.content?.parts?.map((part: any) => part.text || "").join("\n") || "";
    return { provider: "gemini", model, content };
  }

  private async completeOpenRouter(messages: ChatMessage[], model: string): Promise<CompletionResult> {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model,
        messages,
        temperature: 0.2,
        response_format: { type: "json_object" }
      },
      {
        timeout: env.llmRequestTimeoutMs,
        headers: {
          Authorization: `Bearer ${env.openrouterApiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://reconvault.local",
          "X-Title": "ReconVault"
        }
      }
    );
    return { provider: "openrouter", model, content: response.data?.choices?.[0]?.message?.content || "" };
  }

  private async completeOllama(messages: ChatMessage[], model: string): Promise<CompletionResult> {
    const response = await axios.post(
      `${env.ollamaBaseUrl.replace(/\/$/, "")}/api/chat`,
      {
        model,
        messages,
        stream: false,
        format: "json",
        options: { temperature: 0.2 }
      },
      { timeout: env.llmRequestTimeoutMs }
    );
    return { provider: "ollama", model, content: response.data?.message?.content || "" };
  }
}

export const llmProviderService = new LlmProviderService();
