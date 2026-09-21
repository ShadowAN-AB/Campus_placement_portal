import { regexFallback } from "../../matching/resume-parser";
import { LlmProvider } from "./llm.types";

export class RegexProvider implements LlmProvider {
  name = "regex";

  async generateJSON(input: { system: string; prompt: string; temperature?: number; maxTokens?: number }) {
    return JSON.stringify(regexFallback(input.prompt));
  }

  async generateText(input: { system: string; prompt: string; temperature?: number; maxTokens?: number }) {
    const extracted = regexFallback(input.prompt);
    const skills = extracted.skills.length ? extracted.skills.join(", ") : "none detected";
    const education = extracted.education.map((row) => row.degree).filter(Boolean).join(", ") || "not listed";
    return `Regex demo mode (no Ollama). Skills: ${skills}. Education: ${education}. Years of experience: ${extracted.yearsOfExperience}.`;
  }

  async health() {
    return { healthy: true, provider: this.name, model: "regex-fallback" };
  }
}
