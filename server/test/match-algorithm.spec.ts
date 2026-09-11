import { describe, expect, it } from "vitest";
import { calculateEnhancedMatchScore, calculateMatchScore } from "../src/matching/match-algorithm";

describe("calculateMatchScore", () => {
  it("weights skills 70 / experience 20 / salary 10", () => {
    const result = calculateMatchScore({
      studentSkills: ["node", "typescript"],
      requiredSkills: ["node", "typescript"],
      studentMonths: 24,
      requiredMonths: 12,
      expectedSalary: 100,
      minSalary: 80,
      maxSalary: 120,
    });
    expect(result.score).toBe(100);
    expect(result.matchedSkills).toEqual(["node", "typescript"]);
  });

  it("handles empty skills and missing salary as neutral", () => {
    const result = calculateMatchScore({
      studentSkills: [],
      requiredSkills: [],
      studentMonths: 0,
      requiredMonths: 0,
    });
    expect(result.score).toBe(54);
  });
});

describe("calculateEnhancedMatchScore", () => {
  it("returns five factors", () => {
    const result = calculateEnhancedMatchScore({
      studentSkills: ["react"],
      requiredSkills: ["react", "css"],
      studentMonths: 12,
      requiredMonths: 12,
      education: [{ degree: "B.Tech" }],
      projects: [{}, {}, {}],
    });
    expect(result.factors).toBeTruthy();
    expect(result.factors?.skills).toBe(50);
    expect(result.factors?.education).toBe(75);
    expect(result.factors?.projects).toBe(100);
  });
});
