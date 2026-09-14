import { describe, expect, it } from "vitest";
import { resolveService } from "./services";

describe("resolveService", () => {
  it("sends auth to identity", () => {
    expect(resolveService("/v1/auth/login")).toBe("identity");
  });

  it("keeps admin analytics off the catalog service", () => {
    expect(resolveService("/v1/admin/analytics")).toBe("analytics");
    expect(resolveService("/v1/admin/approvals")).toBe("catalog");
    expect(resolveService("/v1/admin/jobs/1/approve")).toBe("catalog");
  });

  it("isolates matching from jobs", () => {
    expect(resolveService("/v1/resumes")).toBe("matching");
    expect(resolveService("/v1/fit/jobs")).toBe("matching");
    expect(resolveService("/v1/jobs")).toBe("catalog");
  });

  it("returns null for unknown paths", () => {
    expect(resolveService("/nope")).toBeNull();
  });
});
