/**
 * Locks for the CAPSULE shell navigation model (ref design-refs/scriptally-capsule-shell.html):
 * Dashboard is a FLAT link; three accordion sections; Import is off the nav (baked) but keeps
 * a breadcrumb; Packages files under Querying (product grammar, not URL shape).
 */
import { describe, it, expect } from "vitest";
import {
  SHELL_DASHBOARD,
  SHELL_RAIL,
  SHELL_SECTIONS,
  SHELL_SETUP,
  SHELL_SETUP_PATHS,
  railClickPlan,
  shellCrumbForPath,
  shellPageForPath,
  shellSectionKeyForPath,
} from "./shellV2Nav";

describe("shellV2Nav — the accordion model", () => {
  it("Dashboard is flat (no children) and the three sections carry the baked pages", () => {
    expect(SHELL_DASHBOARD.path).toBe("/dashboard");
    expect(SHELL_SECTIONS.map((s) => s.key)).toEqual(["querying", "agents", "shelf"]);
    expect(SHELL_SECTIONS.map((s) => s.label)).toEqual(["Querying", "Agents", "Shelf"]);
  });

  it("files To-do and Packages under Querying (product grammar, not URL tree)", () => {
    const querying = SHELL_SECTIONS.find((s) => s.key === "querying")!;
    expect(querying.pages.map((p) => p.path)).toEqual(["/queries", "/todo", "/manuscripts/packages"]);
  });

  it("Agents = Agent list + Discover; Shelf = Manuscripts + Comparable titles (Import is OFF the nav — baked)", () => {
    const agents = SHELL_SECTIONS.find((s) => s.key === "agents")!;
    expect(agents.pages.map((p) => p.label)).toEqual(["Agent list", "Discover"]);
    const shelf = SHELL_SECTIONS.find((s) => s.key === "shelf")!;
    expect(shelf.pages.map((p) => p.path)).toEqual(["/manuscripts", "/manuscripts/comps"]);
    expect(shelf.pages.some((p) => p.path === "/import")).toBe(false);
  });

  it("the rail = Dashboard + the three sections; Setup routes to /account", () => {
    expect(SHELL_RAIL.map((r) => r.key)).toEqual(["dashboard", "querying", "agents", "shelf"]);
    expect(SHELL_RAIL.map((r) => r.path)).toEqual(["/dashboard", "/queries", "/agents", "/manuscripts"]);
    expect(SHELL_SETUP.path).toBe("/account");
  });
});

describe("shellV2Nav — path matching", () => {
  it("matches exactly (packages beats the manuscripts prefix); dashboard maps flat", () => {
    expect(shellPageForPath("/manuscripts/packages")?.section?.key).toBe("querying");
    expect(shellPageForPath("/manuscripts")?.section?.key).toBe("shelf");
    expect(shellPageForPath("/dashboard")?.section).toBeNull();
  });

  it("lights the owning rib per route (Import lights Shelf via its crumb extra)", () => {
    expect(shellSectionKeyForPath("/dashboard")).toBe("dashboard");
    expect(shellSectionKeyForPath("/todo")).toBe("querying");
    expect(shellSectionKeyForPath("/agents/discover")).toBe("agents");
    expect(shellSectionKeyForPath("/manuscripts/comps")).toBe("shelf");
    expect(shellSectionKeyForPath("/import")).toBe("shelf");
    expect(shellSectionKeyForPath("/account")).toBeNull();
    expect(shellSectionKeyForPath("/")).toBeNull();
  });

  it("builds the crumb — Section / Page; the flat Dashboard is its own name; off-nav routes keep crumbs", () => {
    expect(shellCrumbForPath("/todo")).toEqual({ section: "Querying", page: "To-do" });
    expect(shellCrumbForPath("/agents")).toEqual({ section: "Agents", page: "Agent list" });
    expect(shellCrumbForPath("/dashboard")).toEqual({ section: "Dashboard", page: "Dashboard" });
    expect(shellCrumbForPath("/import")).toEqual({ section: "Shelf", page: "Import" });
    // the re-homed focus family (fixes P5): Setup crumbs, no accordion entries
    expect(shellCrumbForPath("/account")).toEqual({ section: "Setup", page: "Account" });
    expect(shellCrumbForPath("/plans")).toEqual({ section: "Setup", page: "Plans" });
    expect(shellCrumbForPath("/help")).toEqual({ section: "Setup", page: "Help centre" });
    expect(shellCrumbForPath("/nope")).toBeNull();
  });

  it("the Setup family lights the Setup rib, not a section rib (fixes P5)", () => {
    expect([...SHELL_SETUP_PATHS].sort()).toEqual(["/account", "/help", "/plans"]);
    for (const p of SHELL_SETUP_PATHS) expect(shellSectionKeyForPath(p)).toBeNull();
  });
});

describe("railClickPlan — the rail selects a section; the OPEN section's icon toggles (amended table)", () => {
  it("collapsed: section icons expand and open their section — never navigate", () => {
    for (const key of ["querying", "agents", "shelf"] as const) {
      expect(railClickPlan(key, "/dashboard", true, null)).toEqual({ kind: "browse", section: key });
    }
  });

  it("expanded: the ALREADY-OPEN section's icon collapses; a different section switches, never navigates", () => {
    expect(railClickPlan("querying", "/queries", false, "querying")).toEqual({ kind: "collapse" });
    expect(railClickPlan("agents", "/queries", false, "agents")).toEqual({ kind: "collapse" });
    expect(railClickPlan("querying", "/queries", false, "agents")).toEqual({ kind: "browse", section: "querying" });
    expect(railClickPlan("shelf", "/queries", false, "agents")).toEqual({ kind: "browse", section: "shelf" });
  });

  it("THE WORKED EXAMPLE: on To-do, Agents open, click Querying → switch to Querying, stay expanded — collapse keys off the OPEN section, never the page's section", () => {
    expect(railClickPlan("querying", "/todo", false, "agents")).toEqual({ kind: "browse", section: "querying" });
  });

  it("Dashboard: elsewhere navigates; already there → collapsed expands (no section open); expanded + none open collapses; expanded + a section open switches to the no-section view (the implicit cell)", () => {
    expect(railClickPlan("dashboard", "/queries", true, null)).toEqual({ kind: "navigate", path: "/dashboard" });
    expect(railClickPlan("dashboard", "/queries", false, "querying")).toEqual({ kind: "navigate", path: "/dashboard" });
    expect(railClickPlan("dashboard", "/dashboard", true, null)).toEqual({ kind: "browse", section: null });
    expect(railClickPlan("dashboard", "/dashboard", false, null)).toEqual({ kind: "collapse" });
    expect(railClickPlan("dashboard", "/dashboard", false, "agents")).toEqual({ kind: "browse", section: null });
  });

  it("Setup (standing flag: single-destination as configured) mirrors Dashboard's symmetry", () => {
    expect(railClickPlan("setup", "/queries", true, null)).toEqual({ kind: "navigate", path: "/account" });
    expect(railClickPlan("setup", "/account", true, null)).toEqual({ kind: "browse", section: null });
    expect(railClickPlan("setup", "/account", false, null)).toEqual({ kind: "collapse" });
    expect(railClickPlan("setup", "/account", false, "shelf")).toEqual({ kind: "browse", section: null });
  });

  it("every cell does something — no no-op remains, and no collapsed click collapses", () => {
    for (const key of ["dashboard", "querying", "agents", "shelf", "setup"] as const) {
      for (const at of ["/dashboard", "/queries", "/account"]) {
        for (const open of [null, "querying", "agents"] as const) {
          const plan = railClickPlan(key, at, true, open);
          expect(plan.kind === "navigate" || plan.kind === "browse").toBe(true); // collapsed never collapses
          expect((railClickPlan(key, at, false, open) as { kind: string }).kind).not.toBe("noop");
        }
      }
    }
  });
});
