/**
 * Locks for the ONE COLUMN's pure core.
 *
 * ⚠️ THE FOUR SELECTOR STATES ARE THE WHOLE RISK of the quiet rail: the floating selector is the
 * ONLY active marker, so if it is wrong in any state there is nothing else telling you where you
 * are. Three of the four are geometry and are locked here. The fourth — FIRST PAINT — is a
 * silence, which jsdom cannot see: its mechanism is asserted structurally in shellColumn.test's
 * companion (`shellColumnMute`), and the behaviour itself is a browser check.
 */
import { describe, it, expect } from "vitest";
import {
  COLUMN_SECTIONS, ColumnMetrics, columnHitForPath, iconBoxX, sectionClickPlan, selectorBox,
} from "./shellColumn";

/** The shipped tokens — gutter 20, icon 38, kid 34, pad-r 18, col-max 246. */
const M: ColumnMetrics = { gutter: 20, icon: 38, kid: 34, padR: 18, colMax: 246 };

describe("⚠️ THE ALIGNMENT CONTRACT — the icon does not move between states", () => {
  it("the icon box's x reads the gutter and nothing else", () => {
    expect(iconBoxX(M)).toBe(M.gutter);
  });

  it("the SELECTOR's x is identical collapsed and expanded on a parent row", () => {
    const expanded = selectorBox({ kind: "parent", offsetTop: 100 }, false, M);
    const collapsed = selectorBox({ kind: "parent", offsetTop: 100 }, true, M);
    // This is the pass condition for the whole contract: expansion changes the WIDTH, never the x.
    expect(collapsed.x).toBe(expanded.x);
    expect(collapsed.y).toBe(expanded.y);
    expect(collapsed.height).toBe(expanded.height);
    expect(collapsed.width).not.toBe(expanded.width);
  });

  it("iconBoxX takes no collapsed argument — needing one would mean the contract had broken", () => {
    expect(iconBoxX).toHaveLength(1);
  });
});

describe("the four selector states", () => {
  it("1 · PARENT, EXPANDED — full width less the right padding, icon-tall, radius 11", () => {
    expect(selectorBox({ kind: "parent", offsetTop: 100 }, false, M)).toEqual({
      x: 20, y: 102, width: 246 - 20 - 18, height: 38, radius: 11,
    });
  });

  it("2 · CHILD, EXPANDED — re-indented past the icon, shorter, radius 9", () => {
    const box = selectorBox({ kind: "child", offsetTop: 200 }, false, M);
    expect(box).toEqual({ x: 20 + 38 + 1, y: 202, width: 246 - 59 - 18, height: 34 - 4, radius: 9 });
    // it starts AFTER the icon box, which is what "re-indents for children" means
    expect(box.x).toBeGreaterThan(M.gutter + M.icon);
  });

  it("3 · PARENT, COLLAPSED — the icon box alone; a full-width marker would mark empty space", () => {
    expect(selectorBox({ kind: "parent", offsetTop: 60 }, true, M)).toEqual({
      x: 20, y: 62, width: 38, height: 38, radius: 11,
    });
  });

  it("4 · a CHILD while COLLAPSED falls back to the parent box — never floats over nothing", () => {
    // Children are hidden when the column is collapsed. Honouring a child target there would
    // put the only active marker on a row that is not on screen.
    const child = selectorBox({ kind: "child", offsetTop: 60 }, true, M);
    expect(child).toEqual(selectorBox({ kind: "parent", offsetTop: 60 }, true, M));
  });

  it("every state is driven by the tokens — change a token, every box moves with it", () => {
    const wide: ColumnMetrics = { ...M, gutter: 30 };
    expect(selectorBox({ kind: "parent", offsetTop: 0 }, false, wide).x).toBe(30);
    expect(selectorBox({ kind: "child", offsetTop: 0 }, false, wide).x).toBe(30 + 38 + 1);
  });
});

describe("the navigation model", () => {
  it("sections are Queries · Agents · Materials, in that order", () => {
    expect(COLUMN_SECTIONS.map((s) => s.label)).toEqual(["Queries", "Agents", "Materials"]);
  });

  it("⚠️ every child has a REAL route — no dead links, ever", () => {
    // Baked 4 also names Archive, Query letters, Synopses and Opening samples. None is a route
    // yet, and Nick's corrected map drops them until they are built; a nav item that goes
    // nowhere teaches the wrong shape of the app.
    const paths = COLUMN_SECTIONS.flatMap((s) => s.pages.map((p) => p.path));
    for (const p of paths) expect(p.startsWith("/")).toBe(true);
    for (const absent of ["Archive", "Query letters", "Synopses", "Opening samples"]) {
      expect(COLUMN_SECTIONS.flatMap((s) => s.pages.map((p) => p.label))).not.toContain(absent);
    }
  });

  it("Import sits under Queries — data entry against your own records", () => {
    const queries = COLUMN_SECTIONS.find((s) => s.key === "queries")!;
    expect(queries.pages.map((p) => p.path)).toContain("/import");
  });

  it("NO COUNTS anywhere in the model — counts live on the pages", () => {
    const json = JSON.stringify(COLUMN_SECTIONS);
    expect(json).not.toContain("count");
  });

  it("there is no Dashboard item — the masthead wordmark is the route home", () => {
    const labels = COLUMN_SECTIONS.flatMap((s) => s.pages.map((p) => p.label));
    expect(labels).not.toContain("Dashboard");
  });

  it("resolves a pathname to its section and page", () => {
    expect(columnHitForPath("/manuscripts/comps")?.page.label).toBe("Comparable titles");
    expect(columnHitForPath("/manuscripts/comps")?.section.key).toBe("materials");
    expect(columnHitForPath("/dashboard")).toBeNull(); // the dashboard is a top-nav page
    expect(columnHitForPath("/nope")).toBeNull();
  });
});

describe("clicking a section — one move, and no flyouts", () => {
  it("COLLAPSED: expands the column and opens that section in one move", () => {
    expect(sectionClickPlan("agents", true, null)).toEqual({ kind: "expand-and-open", section: "agents" });
    // even when another section was the open one
    expect(sectionClickPlan("agents", true, "queries")).toEqual({ kind: "expand-and-open", section: "agents" });
  });

  it("EXPANDED: the open section folds away; any other switches", () => {
    expect(sectionClickPlan("queries", false, "queries")).toEqual({ kind: "close" });
    expect(sectionClickPlan("agents", false, "queries")).toEqual({ kind: "open", section: "agents" });
    expect(sectionClickPlan("agents", false, null)).toEqual({ kind: "open", section: "agents" });
  });
});
