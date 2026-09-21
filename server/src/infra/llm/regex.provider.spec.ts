import { describe, expect, it } from "vitest";
import { RegexProvider } from "./regex.provider";

describe("RegexProvider", () => {
  const llm = new RegexProvider();

  it("extracts skills from resume text as JSON", async () => {
    const raw = await llm.generateJSON({
      system: "extract",
      prompt: "B.Tech graduate with 2 years of React and TypeScript on Node.",
    });
    const parsed = JSON.parse(raw) as { skills: string[]; yearsOfExperience: number };
    expect(parsed.skills).toEqual(expect.arrayContaining(["react", "typescript", "node"]));
    expect(parsed.yearsOfExperience).toBe(2);
  });

  it("reports healthy without a live model", async () => {
    await expect(llm.health()).resolves.toMatchObject({ healthy: true, provider: "regex" });
  });
});
