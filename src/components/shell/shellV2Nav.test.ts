/**
 * Locks for the CAPSULE shell navigation model (ref design-refs/scriptally-capsule-shell.html):
 * Dashboard is a FLAT link; FOUR accordion sections; Import is off the nav (baked) but keeps
 * a breadcrumb; Packages files under Querying (product grammar, not URL shape).
 *
 * ⚠️ AMENDED by the workspace pack P1: To-do LEFT Querying and became a section of its own with
 * four pages, taking a fifth rail rib with it. The rib is load-bearing — the rail's active state
 * derives from the route's section, so a section without one would light nothing.
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
  it("Dashboard is flat (no children) and the FOUR sections carry the baked pages", () => {
    expect(SHELL_DASHBOARD.path).toBe("/dashboard");
    expect(SHELL_SECTIONS.map((s) => s.key)).toEqual(["querying", "todo", "agents", "shelf"]);
    // sidebar-IA fix (6 Aug): the section reads "Tasks"; its KEY stays "todo" (an identifier)
    expect(SHELL_SECTIONS.map((s) => s.label)).toEqual(["Querying", "Tasks", "Agents", "Shelf"]);
  });

  it("files Packages under Querying (product grammar, not URL tree) — and To-do is no longer there", () => {
    const querying = SHELL_SECTIONS.find((s) => s.key === "querying")!;
    expect(querying.pages.map((p) => p.path)).toEqual(["/queries", "/manuscripts/packages"]);
  });

  it("To-do is a WORKSPACE of four pages, and the list is the default at /todo itself", () => {
    const todo = SHELL_SECTIONS.find((s) => s.key === "todo")!;
    expect(todo.pages.map((p) => p.label)).toEqual(["To-do list", "Today", "Calendar", "Noteboard"]);
    expect(todo.pages.map((p) => p.path)).toEqual(["/todo", "/todo/today", "/todo/calendar", "/todo/noteboard"]);
    // The default page keeps the BARE path, so every existing link and the rail's
    // section-select land on it with no redirect.
    expect(todo.pages[0].path).toBe("/todo");
  });

  it("Agents = Agent list + Discover; Shelf = Manuscripts + Comparable titles (Import is OFF the nav — baked)", () => {
    const agents = SHELL_SECTIONS.find((s) => s.key === "agents")!;
    expect(agents.pages.map((p) => p.label)).toEqual(["Agent list", "Discover"]);
    const shelf = SHELL_SECTIONS.find((s) => s.key === "shelf")!;
    expect(shelf.pages.map((p) => p.path)).toEqual(["/manuscripts", "/manuscripts/comps"]);
    expect(shelf.pages.some((p) => p.path === "/import")).toBe(false);
  });

  it("the rail = Dashboard + the four sections, IN THE ACCORDION'S ORDER; Setup routes to /account", () => {
    expect(SHELL_RAIL.map((r) => r.key)).toEqual(["dashboard", "querying", "todo", "agents", "shelf"]);
    expect(SHELL_RAIL.map((r) => r.path)).toEqual(["/dashboard", "/queries", "/todo", "/agents", "/manuscripts"]);
    expect(SHELL_SETUP.path).toBe("/account");
  });

  it("EVERY section has a rib — the invariant behind the fifth one, not a coincidence", () => {
    for (const section of SHELL_SECTIONS) {
      expect(SHELL_RAIL.some((r) => r.key === section.key), `no rib for ${section.key}`).toBe(true);
    }
    // …and the rib order follows the accordion, so a rib and its section are never apart.
    expect(SHELL_RAIL.slice(1).map((r) => r.key)).toEqual(SHELL_SECTIONS.map((s) => s.key));
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
    expect(shellSectionKeyForPath("/todo")).toBe("todo");
    expect(shellSectionKeyForPath("/todo/today")).toBe("todo");
    expect(shellSectionKeyForPath("/todo/calendar")).toBe("todo");
    expect(shellSectionKeyForPath("/todo/noteboard")).toBe("todo");
    expect(shellSectionKeyForPath("/agents/discover")).toBe("agents");
    expect(shellSectionKeyForPath("/manuscripts/comps")).toBe("shelf");
    expect(shellSectionKeyForPath("/import")).toBe("shelf");
    expect(shellSectionKeyForPath("/account")).toBeNull();
    expect(shellSectionKeyForPath("/")).toBeNull();
  });

  it("builds the crumb — Section / Page; the flat Dashboard is its own name; off-nav routes keep crumbs", () => {
    expect(shellCrumbForPath("/todo")).toEqual({ section: "Tasks", page: "To-do list" });
    expect(shellCrumbForPath("/todo/today")).toEqual({ section: "Tasks", page: "Today" });
    expect(shellCrumbForPath("/todo/noteboard")).toEqual({ section: "Tasks", page: "Noteboard" });
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
