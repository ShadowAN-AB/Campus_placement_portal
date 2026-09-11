import { describe, expect, it } from "vitest";
import { interviewWindowsOverlap } from "../src/interviews/conflict";

describe("interviewWindowsOverlap", () => {
  const start = new Date("2026-09-12T10:00:00.000Z");

  it("flags a booking 10 minutes later (inside ±30 min buffer)", () => {
    expect(
      interviewWindowsOverlap(start, 30, new Date("2026-09-12T10:10:00.000Z"), 30),
    ).toBe(true);
  });

  it("allows a booking well outside the buffer", () => {
    expect(
      interviewWindowsOverlap(start, 30, new Date("2026-09-12T12:00:00.000Z"), 30),
    ).toBe(false);
  });
});
