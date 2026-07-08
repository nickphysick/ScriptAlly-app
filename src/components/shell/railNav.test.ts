/**
 * Locks for the rail's grouped index + capture contracts (design refs:
 * sidenav-grouped-v5.html structure · sidenav-three-themes-v2.html colour).
 * Repo convention: pure node tests — the Rail renders from these tables, so the resolution
 * and invocation contracts are pinned here without DOM rendering.
 */

import { describe, it, expect, vi } from "vitest";
import { RAIL_GROUPS, RAIL_CAPTURES, railActiveKey, invokeCapture } from "./railNav";

describe("railActiveKey — route-aware active state", () => {
  it("lights each entry on its own pathname", () => {
    expect(railActiveKey("/dashboard")).toBe("dashboard");
    expect(railActiveKey("/queries")).toBe("queries-hub");
    expect(railActiveKey("/todo")).toBe("todo");
    expect(railActiveKey("/agents")).toBe("agents-db");
    expect(railActiveKey("/agents/discover")).toBe("agents-discover");
    expect(railActiveKey("/manuscripts")).toBe("manuscripts");
    expect(railActiveKey("/manuscripts/comps")).toBe("comps");
    expect(railActiveKey("/manuscripts/packages")).toBe("packages");
  });

  it("keeps Queries Hub lit under ?q= deep-selection (params are not pathname)", () => {
    // The router hands the rail location.pathname — /queries?q=abc has pathname /queries.
    expect(railActiveKey("/queries")).toBe("queries-hub");
  });

  it("sub-routes light their own entry, never the parent's", () => {
    expect(railActiveKey("/agents/discover")).not.toBe("agents-db");
    expect(railActiveKey("/manuscripts/comps")).not.toBe("manuscripts");
    expect(railActiveKey("/manuscripts/packages")).not.toBe("manuscripts");
  });

  it("tolerates trailing slashes", () => {
    expect(railActiveKey("/queries/")).toBe("queries-hub");
    expect(railActiveKey("/agents/discover/")).toBe("agents-discover");
  });

  it("lights nothing on focus/marketing/unknown routes", () => {
    for (const p of ["/", "/pricing", "/account", "/plans", "/help", "/import", "/nope"]) {
      expect(railActiveKey(p)).toBeNull();
    }
  });
});

describe("RAIL_GROUPS — the grouped index shape", () => {
  it("renders Dashboard bare, then QUERYING · AGENTS · MANUSCRIPTS eyebrows", () => {
    expect(RAIL_GROUPS.map((g) => g.eyebrow)).toEqual([null, "Querying", "Agents", "Manuscripts"]);
    expect(RAIL_GROUPS.map((g) => g.items.map((i) => i.label))).toEqual([
      ["Dashboard"],
      ["Queries Hub", "To-do"],
      ["Agents database", "Discover new agents"],
      ["Your manuscripts", "Comparable titles", "Submission packages"],
    ]);
  });

  it("omits Rejection analytics entirely (in the refs, not built — no dead links)", () => {
    const labels = RAIL_GROUPS.flatMap((g) => g.items.map((i) => i.label.toLowerCase()));
    expect(labels.some((l) => l.includes("rejection"))).toBe(false);
  });

  it("navigates through the existing bridge contract (tab + sub match pathFor's vocabulary)", () => {
    const byKey = Object.fromEntries(RAIL_GROUPS.flatMap((g) => g.items.map((i) => [i.key, i])));
    expect([byKey["queries-hub"].tab, byKey["queries-hub"].sub]).toEqual(["queries", undefined]);
    expect([byKey["todo"].tab, byKey["todo"].sub]).toEqual(["todo", undefined]);
    expect([byKey["agents-discover"].tab, byKey["agents-discover"].sub]).toEqual(["agents", "Discover new agents"]);
    expect([byKey["comps"].tab, byKey["comps"].sub]).toEqual(["manuscripts", "Comparable titles"]);
    expect([byKey["packages"].tab, byKey["packages"].sub]).toEqual(["manuscripts", "Submission packages"]);
  });
});

describe("capture actions — reuse the existing flows, spy-verified", () => {
  it("Record a response invokes the app-level interception", () => {
    const nav = vi.fn();
    invokeCapture("record", nav);
    expect(nav).toHaveBeenCalledWith("queries", "Record a response");
  });

  it("+ Query opens the existing Log-a-query overlay interception", () => {
    const nav = vi.fn();
    invokeCapture("query", nav);
    expect(nav).toHaveBeenCalledWith("queries", "Log a query");
  });

  it("+ Agent opens the existing Add-an-agent overlay interception", () => {
    const nav = vi.fn();
    invokeCapture("agent", nav);
    expect(nav).toHaveBeenCalledWith("agents", "Add an agent");
  });

  it("labels match the refs", () => {
    expect(RAIL_CAPTURES.record.label).toBe("+ Record a response");
    expect(RAIL_CAPTURES.query.label).toBe("+ Query");
    expect(RAIL_CAPTURES.agent.label).toBe("+ Agent");
  });
});
