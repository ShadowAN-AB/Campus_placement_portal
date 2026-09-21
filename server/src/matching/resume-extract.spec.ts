import { describe, expect, it } from "vitest";
import { parseResumeExtract } from "./resume-extract";

describe("parseResumeExtract", () => {
  it("accepts a well-formed object", () => {
    const extracted = parseResumeExtract(
      JSON.stringify({
        skills: ["React", "Node"],
        education: [{ degree: "B.Tech", school: "NIT" }],
        projects: [{ name: "Portal", skills: ["ts"] }],
        certifications: ["AWS"],
        yearsOfExperience: 2,
      }),
    );
    expect(extracted.skills).toEqual(["react", "node"]);
    expect(extracted.yearsOfExperience).toBe(2);
  });

  it("strips markdown fences", () => {
    const extracted = parseResumeExtract("```json\n{\"skills\":[\"java\"],\"yearsOfExperience\":1}\n```");
    expect(extracted.skills).toEqual(["java"]);
  });

  it("rejects arrays and non-objects", () => {
    expect(() => parseResumeExtract("[]")).toThrow(/object/);
    expect(() => parseResumeExtract("\"nope\"")).toThrow(/object/);
  });

  it("rejects skills that are not an array", () => {
    expect(() => parseResumeExtract(JSON.stringify({ skills: "react" }))).toThrow(/skills/);
  });
});
