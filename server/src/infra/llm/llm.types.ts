export type LlmProvider = {
  name: string;
  generateJSON(input: { system: string; prompt: string; temperature?: number; maxTokens?: number }): Promise<string>;
  generateText(input: { system: string; prompt: string; temperature?: number; maxTokens?: number }): Promise<string>;
  health(): Promise<{ healthy: boolean; provider: string; model: string }>;
};
