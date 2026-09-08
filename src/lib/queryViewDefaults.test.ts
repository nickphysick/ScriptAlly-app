import { describe, it, expect } from "vitest";
import { VIEW_DEFAULTS, defaultsOnViewChange } from "./queryViewDefaults";

const UNTOUCHED = { sort: false, group: false };

describe("§3 · per-view defaults, and the writer's choice beating them", () => {
  it("each view's stated defaults are the brief's", () => {
    expect(VIEW_DEFAULTS.grid).toEqual({ sort: "last_activity", group: "none" });
    expect(VIEW_DEFAULTS.list).toEqual({ sort: "date_newest", group: "none" });
    expect(VIEW_DEFAULTS.board).toEqual({ group: "status" });
    expect(VIEW_DEFAULTS.calendar).toEqual({ sort: "date_newest" });
  });

  /* ⚠️ AN ABSENT KEY IS NOT `none`, and this is the case that says so. Switching to the board must
     not clear a grouping the grid was using — the board simply holds no view on it. */
  it("a view says nothing about a control it has no opinion about", () => {
    expect(defaultsOnViewChange("board", UNTOUCHED)).toEqual({ group: "status" });
    expect("sort" in defaultsOnViewChange("board", UNTOUCHED)).toBe(false);
    expect(defaultsOnViewChange("calendar", UNTOUCHED)).toEqual({ sort: "date_newest" });
    expect("group" in defaultsOnViewChange("calendar", UNTOUCHED)).toBe(false);
  });

  it("branch A — untouched: the view's defaults apply", () => {
    expect(defaultsOnViewChange("list", UNTOUCHED)).toEqual({ sort: "date_newest", group: "none" });
    expect(defaultsOnViewChange("grid", UNTOUCHED)).toEqual({ sort: "last_activity", group: "none" });
  });

  it("branch B — touched: the writer's choice survives every switch", () => {
    expect(defaultsOnViewChange("list", { sort: true, group: false })).toEqual({ group: "none" });
    expect(defaultsOnViewChange("grid", { sort: true, group: true })).toEqual({});
    /* including the board's, which is otherwise the strongest default on the page */
    expect(defaultsOnViewChange("board", { sort: false, group: true })).toEqual({});
  });

  /* the composed claim: a writer who sets a sort, then walks every view, keeps it throughout */
  it("a chosen sort survives a walk through all four views", () => {
    const touched = { sort: true, group: false };
    for (const v of ["grid", "list", "board", "calendar"] as const)
      expect(defaultsOnViewChange(v, touched).sort, `${v} overrode a chosen sort`).toBeUndefined();
  });
});
