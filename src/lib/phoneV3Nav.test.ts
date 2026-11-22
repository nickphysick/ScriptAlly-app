import { describe, it, expect } from "vitest";
import { MATERIALS_PATH, QUERIES_ALL_PATH, V3_TABS, v3BackFor, v3IsRoot, v3RootTitle, v3TabFor } from "./phoneV3Nav";
import { WORKSPACE_PATHS } from "../marketing/routeTiers";
import { WORKSPACE_SHELL_PATHS } from "./shellForRoute";

/* Phone app v5 (12 Nov): the dock is Today · To do · + · Materials · Profile. v3/v4's Queries and Agents tabs are tabs
   inside Today; their full lists are pushed from it. Everything v4 kept under You is Profile. */
describe("phone v5: every address sits in one of the four dock tabs", () => {
  it("the dock reads Today, To do, Materials, Profile (the + sits between To do and Materials)", () => {
    expect(V3_TABS.map((t) => t.label)).toEqual(["Today", "To do", "Materials", "Profile"]);
    expect(V3_TABS.map((t) => t.path)).toEqual(["/dashboard", "/todo", MATERIALS_PATH, "/you"]);
  });
  it("addresses keep working: each lands on its tab, as a root or pushed", () => {
    const cases: [string, string, boolean][] = [
      /* the four roots */
      ["/dashboard", "today", true], ["/todo", "todo", true], ["/materials", "materials", true], ["/you", "profile", true],
      /* pushed from Today: the full list of queries, the agent pages (and the two addresses that land on Today's tabs) */
      [QUERIES_ALL_PATH, "today", false], ["/queries", "today", false], ["/agents", "today", false], ["/agents/discover", "today", false],
      /* pushed from Materials: the packages page and the pages it opens; the old letters, versions and comps addresses */
      ["/queries/packages", "materials", false], ["/materials/letters", "materials", false],
      ["/manuscripts/comps", "materials", false], ["/manuscripts/versions", "materials", false],
      /* pushed from Profile: everything v4 kept under You */
      ["/queries/responses", "profile", false], ["/queries/analytics", "profile", false], ["/manuscripts", "profile", false],
      ["/todo/corkboard", "profile", false], ["/account", "profile", false], ["/account/profile", "profile", false], ["/goals", "profile", false],
      ["/help", "profile", false], ["/help/getting-started", "profile", false], ["/plans", "profile", false], ["/your-notes", "profile", false],
      ["/import", "profile", false],
    ];
    for (const [p, tab, root] of cases) {
      expect(v3TabFor(p), p).toBe(tab);
      expect(v3IsRoot(p), p).toBe(root);
    }
    expect(v3IsRoot("/todo/")).toBe(true);
  });
  it("a back arrow with no history returns to the right root (Today on the tab that pushed it)", () => {
    expect(v3BackFor(QUERIES_ALL_PATH)).toBe("/dashboard?tab=queries");
    expect(v3BackFor("/agents/discover")).toBe("/dashboard?tab=agents");
    expect(v3BackFor("/queries/packages")).toBe("/materials?tab=packages");
    expect(v3BackFor("/queries/responses")).toBe("/you");
    expect(v3BackFor("/todo/corkboard")).toBe("/you");
    expect(v3BackFor("/manuscripts")).toBe("/you");
    expect(v3BackFor("/account/plan")).toBe("/you");
  });
  it("a root is named for its tab; a pushed page is not renamed here", () => {
    expect(v3RootTitle("/dashboard")).toBe("Today");
    expect(v3RootTitle("/todo")).toBe("To do");
    expect(v3RootTitle("/materials")).toBe("Materials");
    expect(v3RootTitle("/you")).toBe("Profile");
    expect(v3RootTitle("/agents/discover")).toBeNull();
    expect(v3RootTitle("/queries/analytics")).toBeNull();
    expect(v3RootTitle(QUERIES_ALL_PATH)).toBeNull();
  });
  /* found by measurement: /you was missing here, so the unknown-path guard sent the You tab to the dashboard */
  it("every tab's address, and the full list's, is a workspace path in the workspace shell", () => {
    for (const p of [...V3_TABS.map((t) => t.path), QUERIES_ALL_PATH]) {
      expect(WORKSPACE_PATHS.has(p), p).toBe(true);
      expect(WORKSPACE_SHELL_PATHS.has(p), p).toBe(true);
    }
  });
});
