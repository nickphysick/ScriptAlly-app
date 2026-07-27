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

  it("builds the crumb — Section / Page; the flat Dashboard is its own name; Import keeps a crumb off-nav", () => {
    expect(shellCrumbForPath("/todo")).toEqual({ section: "Querying", page: "To-do" });
    expect(shellCrumbForPath("/agents")).toEqual({ section: "Agents", page: "Agent list" });
    expect(shellCrumbForPath("/dashboard")).toEqual({ section: "Dashboard", page: "Dashboard" });
    expect(shellCrumbForPath("/import")).toEqual({ section: "Shelf", page: "Import" });
    expect(shellCrumbForPath("/plans")).toBeNull();
  });
});
