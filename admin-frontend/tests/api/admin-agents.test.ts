import { describe, it, expect, vi, beforeEach } from "vitest";
import * as adminAgentsApi from "@/lib/api/admin-agents";

describe("Admin Agents API", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    } as any);
  });

  it("listAgents with namespaceId calls correct URL", async () => {
    await adminAgentsApi.listAgents(1);
    const url = (global.fetch as any).mock.calls[0][0];
    expect(url).toContain("/admin/agents?namespaceId=1");
  });

  it("bindResource sends correct body", async () => {
    await adminAgentsApi.bindResource(1, "MODEL", 5);
    const [url, options] = (global.fetch as any).mock.calls[0];
    expect(url).toContain("/admin/agents/1/resources");
    expect(JSON.parse(options.body)).toEqual({
      resource_type: "MODEL",
      resource_id: 5,
    });
  });

  it("unbindResource uses correct URL with type param", async () => {
    await adminAgentsApi.unbindResource(1, 5, "MODEL");
    const url = (global.fetch as any).mock.calls[0][0];
    expect(url).toContain("/admin/agents/1/resources/5?type=MODEL");
  });
});
