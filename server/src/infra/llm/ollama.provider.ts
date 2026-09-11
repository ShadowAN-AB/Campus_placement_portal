import { LlmProvider } from "./llm.types";
import { env } from "../config/env";

export class OllamaProvider implements LlmProvider {
  name = "ollama";

  async generateJSON(input: { system: string; prompt: string; temperature?: number; maxTokens?: number }) {
    return this.chat(input, true);
  }

  async generateText(input: { system: string; prompt: string; temperature?: number; maxTokens?: number }) {
    return this.chat(input, false);
  }

  async health() {
    try {
      const res = await fetch(`${env.ollamaBaseUrl}/api/tags`);
      return { healthy: res.ok, provider: this.name, model: env.ollamaModel };
    } catch {
      return { healthy: false, provider: this.name, model: env.ollamaModel };
    }
  }

  private async chat(
    input: { system: string; prompt: string; temperature?: number; maxTokens?: number },
    json: boolean,
  ) {
    const res = await fetch(`${env.ollamaBaseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: env.ollamaModel,
        stream: false,
        format: json ? "json" : undefined,
        options: { temperature: input.temperature ?? 0.1, num_predict: input.maxTokens ?? 2048 },
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.prompt },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Ollama ${res.status}`);
    const data = (await res.json()) as { message?: { content?: string } };
    return data.message?.content ?? "";
  }
}
