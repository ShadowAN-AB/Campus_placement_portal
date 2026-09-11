import { LlmProvider } from "./llm.types";
import { env } from "../config/env";

export class AnthropicProvider implements LlmProvider {
  name = "anthropic";

  async generateJSON(input: { system: string; prompt: string; temperature?: number; maxTokens?: number }) {
    return this.complete(input);
  }

  async generateText(input: { system: string; prompt: string; temperature?: number; maxTokens?: number }) {
    return this.complete(input);
  }

  async health() {
    return {
      healthy: Boolean(env.anthropicApiKey),
      provider: this.name,
      model: env.anthropicModel,
    };
  }

  private async complete(input: { system: string; prompt: string; temperature?: number; maxTokens?: number }) {
    if (!env.anthropicApiKey) throw new Error("ANTHROPIC_API_KEY missing");
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: env.anthropicModel,
        max_tokens: input.maxTokens ?? 2048,
        temperature: input.temperature ?? 0.1,
        system: input.system,
        messages: [{ role: "user", content: input.prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}`);
    const data = (await res.json()) as { content?: { text?: string }[] };
    return data.content?.[0]?.text ?? "";
  }
}
