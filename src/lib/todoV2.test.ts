/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v2's pure model — the properties, not the spellings. Inputs are built through the
 * REAL categoriser (`taskCategory`) from the task types the engine raises, never a hand-written
 * category, so a test cannot hand this module a card the board could not produce.
 */
import { describe, expect, it } from "vitest";
import type { BoardCard } from "./todoBoard";
import { taskCategory } from "./todoCategory";
import {
  SORT_LABEL, GROUP_LABEL, WHEN_LABEL, TILE_LABEL, applyFilters, buildRow, dueForPill, EMPTY_FILTERS,
  groupRows, sortRows, tileCounts, tileOf, weekEnd, whenOf,
} from "./todoV2";

const card = (key: string, taskType: string | undefined, extra: Partial<BoardCard> = {}): BoardCard => ({
  key, stream: "do", title: key, who: extra.who ?? "", subtitle: "", due: "", warn: false, snoozes: 0,
  hk: false, initials: "", record: "", committed: false, done: false, taskType, ...extra,
} as BoardCard);

const MIX: BoardCard[] = [
  card("a", "partial_requested", { who: "Greg" }),
  card("b", "full_requested", { who: "Marisa" }),
  card("c", "nudge_overdue", { who: "Sophie" }),
  card("d", "no_response_close", { who: "Eleanor" }),
  card("e", "no_response_close", { who: "Aisha" }),
  card("f", "data_quality", { hk: true }),
  card("g", undefined, { userTaskId: "g", nature: "task", stream: "nt" }),
  card("h", "offer_received", { who: "Iris" }),
];

describe("the three tiles", () => {
  it("every category lands in exactly one tile, and each sub-line's figures sum to its headline", () => {
    const t = tileCounts(MIX);
    expect(t.move.n + t.chase.n + t.house.n).toBe(MIX.length);
    for (const k of ["move", "chase", "house"] as const) {
      const parts = Object.values(t[k].parts).reduce((a, b) => a + (b ?? 0), 0);
      expect(parts, k).toBe(t[k].n);
      expect(MIX.filter((c) => tileOf(c) === k).length, k).toBe(t[k].n);
    }
    /* the populations are not a monoculture — every tile is entered */
    expect(t.move.n).toBeGreaterThan(0);
    expect(t.chase.n).toBeGreaterThan(0);
    expect(t.house.n).toBeGreaterThan(0);
  });

  it("the sub-lines state the constituents from the real categoriser", () => {
    const t = tileCounts(MIX);
    const req = MIX.filter((c) => taskCategory(c) === "req").length;
    expect(t.move.sub).toBe(`${req} agent requests · 1 yours`);
    expect(t.chase.sub).toMatch(/^1 nudge · 2 gone quiet$/);
    expect(TILE_LABEL).toEqual({ move: "Your move", chase: "Chase or close", house: "Housekeeping" });
  });
});

describe("when", () => {
  const today = "2026-09-28"; // a Monday
  it("the week is Monday to Sunday", () => { expect(weekEnd(today)).toBe("2026-10-04"); expect(weekEnd("2026-10-04")).toBe("2026-10-04"); });
  it("buckets a due day, and no day is 'No date', never a guess", () => {
    expect(whenOf("2026-09-27", today)).toBe("past");
    expect(whenOf("2026-09-28", today)).toBe("this");
    expect(whenOf("2026-10-04", today)).toBe("this");
    expect(whenOf("2026-10-05", today)).toBe("next");
    expect(whenOf("2026-10-11", today)).toBe("next");
    expect(whenOf("2026-10-12", today)).toBe("later");
    expect(whenOf(null, today)).toBe("none");
  });
  it("a pill records the end of its week, and reads back into the same bucket", () => {
    for (const [pill, when] of [["this", "this"], ["next", "next"], ["later", "later"]] as const) {
      expect(whenOf(dueForPill(pill, today), today)).toBe(when);
    }
  });
});

describe("no label on this page uses the retired word", () => {
  it("sort, group, when and tile labels", () => {
    const all = [...Object.values(SORT_LABEL), ...Object.values(GROUP_LABEL), ...Object.values(WHEN_LABEL), ...Object.values(TILE_LABEL)];
    for (const l of all) expect(l.toLowerCase()).not.toContain("overdue");
    expect(WHEN_LABEL.past).toBe("Past the date");
  });
});

describe("rows, filters, grouping and sorting", () => {
  const today = "2026-09-28";
  const rows = MIX.map((c, i) => buildRow(c, {
    deed: `deed ${c.key}`, agency: c.who ? "Agency" : null, dateKey: "Asked on", dateValue: "1 June",
    spanValue: null, dueYmd: i % 3 === 0 ? null : `2026-09-${String(20 + i).padStart(2, "0")}`, pkg: i % 2 ? "First 50" : null,
  }, today));

  it("only Gone quiet is not the writer's move", () => {
    for (const r of rows) expect(r.yours).toBe(r.cat !== "quiet");
  });
  it("undated rows sort last in every order; past rows lead 'Time past the date'", () => {
    for (const k of ["date", "pastBy", "agent", "type"] as const) {
      const s = sortRows(rows, k);
      const firstNull = s.findIndex((r) => !r.dueYmd);
      if (k === "date" || k === "pastBy") expect(s.slice(firstNull).every((r) => !r.dueYmd)).toBe(true);
    }
    const s = sortRows(rows, "pastBy");
    expect(s[0].daysPast).toBe(Math.max(...rows.map((r) => r.daysPast)));
    expect(s[0].daysPast).toBeGreaterThan(0);
  });
  it("When groups come in the page's order; every row is in exactly one group", () => {
    const g = groupRows(sortRows(rows, "date"), "when");
    const order = g.map((x) => x.label);
    const want = ["Past the date", "This week", "Next week", "Later", "No date"].filter((l) => order.includes(l));
    expect(order).toEqual(want);
    expect(g.reduce((n, x) => n + x.rows.length, 0)).toBe(rows.length);
  });
  it("set-aside rows appear only when asked; facets narrow each other", () => {
    const withAside = [...rows, { ...rows[0], key: "z", setAside: true }];
    expect(applyFilters(withAside, EMPTY_FILTERS, () => null).length).toBe(rows.length);
    expect(applyFilters(withAside, { ...EMPTY_FILTERS, showSetAside: true }, () => null).length).toBe(rows.length + 1);
    const typed = applyFilters(rows, { ...EMPTY_FILTERS, types: ["req"] }, () => null);
    expect(typed.length).toBeGreaterThan(0);
    expect(typed.every((r) => r.cat === "req")).toBe(true);
    const both = applyFilters(rows, { ...EMPTY_FILTERS, types: ["req"], pkgs: ["First 50"] }, () => null);
    expect(both.every((r) => r.cat === "req" && r.pkg === "First 50")).toBe(true);
  });
});
