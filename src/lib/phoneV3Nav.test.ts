import { describe, it, expect } from "vitest";
import { V3_TABS, v3IsRoot, v3RootTitle, v3TabFor } from "./phoneV3Nav";

describe("phone v3: every address sits in one of the four tabs", () => {
  it("the bar reads Today, Queries, Agents, You (the + sits between Queries and Agents)", () => {
    expect(V3_TABS.map((t) => t.label)).toEqual(["Today", "Queries", "Agents", "You"]);
  });
  it("addresses keep working: each lands on its tab", () => {
    const cases: [string, string, boolean][] = [
      ["/dashboard", "today", true], ["/todo", "today", true], ["/todo/corkboard", "today", false],
      ["/queries", "queries", true], ["/agents", "agents", true], ["/agents/discover", "agents", true], ["/you", "you", true],
      ["/queries/analytics", "you", false], ["/queries/responses", "you", false], ["/queries/packages", "you", false],
      ["/manuscripts", "you", false], ["/goals", "you", false], ["/account", "you", false], ["/help", "you", false], ["/import", "you", false],
    ];
    for (const [p, tab, root] of cases) {
      expect(v3TabFor(p), p).toBe(tab);
      expect(v3IsRoot(p), p).toBe(root);
    }
  });
  it("a root is named for its tab; a pushed page is not renamed here", () => {
    expect(v3RootTitle("/dashboard")).toBe("Today");
    expect(v3RootTitle("/agents/discover")).toBe("Agents");
    expect(v3RootTitle("/queries/analytics")).toBeNull();
  });
});
