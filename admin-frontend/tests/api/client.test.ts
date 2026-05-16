import { describe, it, expect, vi, beforeEach } from "vitest";
import { api } from "@/lib/api/client";

describe("API client - namespaceId param", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should use namespaceId (camelCase) in query params, not namespace_id", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    });
    global.fetch = mockFetch;

    await api.get("/agents", { namespaceId: 1 });

    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain("namespaceId=1");
    expect(url).not.toContain("namespace_id");
  });

  it("should include X-Namespace-Id header", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    });
    global.fetch = mockFetch;

    await api.get("/agents", { namespaceId: 2 });

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers["X-Namespace-Id"]).toBe("2");
  });

  it("should use PATCH method for rename", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });
    global.fetch = mockFetch;

    await api.patch("/conversations/test-uuid", { name: "新名字" });

    const method = mockFetch.mock.calls[0][1].method;
    expect(method).toBe("PATCH");
  });
});
