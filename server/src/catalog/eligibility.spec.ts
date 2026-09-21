import { describe, expect, it } from "vitest";
import { jobEligibility } from "./eligibility";

describe("jobEligibility", () => {
  it("allows any student when a job has no campus constraints", () => {
    expect(jobEligibility({}, {})).toEqual({ eligible: true, reasons: [] });
  });

  it("requires matching department, CGPA, and graduation year", () => {
    const job = { departments: ["CSE", "IT"], minCgpa: 7, graduationYear: 2027 };
    expect(jobEligibility(job, { department: "cse", cgpa: 8.1, graduationYear: 2027 }).eligible).toBe(true);
    expect(jobEligibility(job, { department: "ece", cgpa: 9, graduationYear: 2027 }).reasons).toContain("Open to cse, it");
    expect(jobEligibility(job, { department: "cse", cgpa: 6.2, graduationYear: 2027 }).reasons).toContain("Minimum CGPA 7");
    expect(jobEligibility(job, { department: "cse", cgpa: 8, graduationYear: 2026 }).reasons).toContain("Graduation year 2027");
  });
});
