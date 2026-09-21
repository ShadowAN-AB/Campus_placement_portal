import { Injectable } from "@nestjs/common";
import { env } from "../config/env";
import { AnthropicProvider } from "./anthropic.provider";
import { LlmProvider } from "./llm.types";
import { OllamaProvider } from "./ollama.provider";
import { RegexProvider } from "./regex.provider";

@Injectable()
export class LlmService {
  private readonly provider: LlmProvider =
    env.llmProvider === "anthropic"
      ? new AnthropicProvider()
      : env.llmProvider === "regex"
        ? new RegexProvider()
        : new OllamaProvider();

  generateJSON(input: { system: string; prompt: string; temperature?: number; maxTokens?: number }) {
    return this.provider.generateJSON(input);
  }

  generateText(input: { system: string; prompt: string; temperature?: number; maxTokens?: number }) {
    return this.provider.generateText(input);
  }

  health() {
    return this.provider.health();
  }
}
