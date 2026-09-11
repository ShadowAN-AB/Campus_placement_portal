import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "../src/context/AuthContext";

function Probe() {
  const { ready } = useAuth();
  return <div>{ready ? "ready" : "loading"}</div>;
}

describe("AuthProvider", () => {
  it("reaches a ready state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ message: "no" }),
      }),
    );
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    expect(await screen.findByText("ready")).toBeInTheDocument();
  });
});
