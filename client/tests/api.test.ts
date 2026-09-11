import { describe, expect, it, vi, beforeEach } from "vitest";
import { api, setAccessToken } from "../src/utils/api";

describe("api client", () => {
  beforeEach(() => {
    setAccessToken("tok");
    vi.restoreAllMocks();
  });

  it("attaches a Bearer token", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);
    await api("/v1/auth/me");
    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer tok");
  });
});
