/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE COUNTS ARE ASSERTED AS A PARTITION, NOT AS NUMBERS. `expect(counts.you).toBe(3)` passes
 * the day someone changes both the filter and the fixture in the same wrong direction. "The four
 * courts sum to All, over any set" cannot be satisfied that way.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { QueryStatus } from "../types";
import {
  QUICK_FILTERS, inQuick, quickCounts,
  GRID_GROUPS, groupLabelFor, compareGroupLabels,
  GRID_SORTS, compareRows,
  emptyGridFilters, gridFilterCount, gridFiltersAreEmpty, matchesGridFilters,
  turnFor, type GridRow, type Turn, type QuickKey,
} from "./queryCentreGrid";

const ALL_TURNS: Turn[] = ["sand", "you", "agent", "offer", "closed"];

const row = (over: Partial<GridRow> = {}): GridRow => ({
  id: "r", status: QueryStatus.QUERIED, turn: "sand", agency: "Stillwater", name: "Vane-Coe",
  lastMs: 100, sentMs: 100, expectedMs: 200, ...over,
});

describe("quick filters — the four courts partition the set", () => {
  it("⚠️ they sum to All over EVERY turn mixture, not over one fixture", () => {
    const mixtures: Turn[][] = [
      ALL_TURNS,
      [...ALL_TURNS, ...ALL_TURNS],
      ["sand", "sand", "sand"],
      ["closed"],
      [],
      ["you", "offer", "you", "agent", "sand"],
    ];
    expect(mixtures.length).toBeGreaterThan(3);
    for (const m of mixtures) {
      const c = quickCounts(m);
      const parts = c.you + c.agent + c.offer + c.closed;
      expect(parts, `courts do not partition ${JSON.stringify(m)}`).toBe(c.all);
      expect(c.all).toBe(m.length);
    }
  });

  it("⚠️ 'With the agent' covers Queried too — one pill means 'everything I am waiting on'", () => {
    expect(inQuick("sand", "agent")).toBe(true);
    expect(inQuick("agent", "agent")).toBe(true);
    expect(inQuick("sand", "you")).toBe(false);
    /* And no OTHER pill claims sand, or the partition above would be a coincidence. */
    const claiming = QUICK_FILTERS.filter((f) => f.key !== "all" && inQuick("sand", f.key));
    expect(claiming.map((f) => f.key)).toEqual(["agent"]);
  });

  it("every turn is claimed by exactly one court", () => {
    for (const t of ALL_TURNS) {
      const hits = QUICK_FILTERS.filter((f) => f.key !== "all" && inQuick(t, f.key));
      expect(hits, `${t} is claimed by ${hits.length} courts`).toHaveLength(1);
    }
  });

  it("⚠️ and every QueryStatus reaches a court — asserted over the ENUM", () => {
    const all = Object.values(QueryStatus);
    expect(all.length).toBeGreaterThan(3);
    for (const s of all) {
      const t = turnFor(s);
      const hits = QUICK_FILTERS.filter((f) => f.key !== "all" && inQuick(t, f.key));
      expect(hits, `${s} reaches no quick filter`).toHaveLength(1);
    }
  });
});

describe("grouping", () => {
  it("⚠️ an undated query gets its own heading, never today's month", () => {
    expect(groupLabelFor(row({ sentMs: null }), "month")).toBe("No date recorded");
    expect(groupLabelFor(row({ sentMs: Date.UTC(2026, 7, 12) }), "month")).toBe("Aug 2026");
  });

  it("whose-court headings run in working order, not alphabetically", () => {
    const labels = ["Closed", "With you", "With the agent", "Offer", "No response"];
    const sorted = [...labels].sort((a, b) => compareGroupLabels(a, b, "turn"));
    expect(sorted).toEqual(["With you", "Offer", "With the agent", "No response", "Closed"]);
    /* Alphabetical would lead with Closed — the one group nobody opens the page to read. */
    expect(sorted[0]).not.toBe("Closed");
  });

  it("⚠️ status headings run in PIPELINE order, taken from the enum", () => {
    const labels = [QueryStatus.FULL_SENT, QueryStatus.QUERIED, QueryStatus.PARTIAL_REQUESTED] as string[];
    const sorted = [...labels].sort((a, b) => compareGroupLabels(a, b, "status"));
    expect(sorted).toEqual([QueryStatus.QUERIED, QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_SENT]);
    /* Alphabetically "Full Sent" would come first, which is the fault this guards. */
    expect(sorted[0]).not.toBe(QueryStatus.FULL_SENT);
  });

  it("months run newest first and the undated heading sinks", () => {
    const labels = ["No date recorded", "Jan 2026", "Aug 2026", "Dec 2025"];
    expect([...labels].sort((a, b) => compareGroupLabels(a, b, "month")))
      .toEqual(["Aug 2026", "Jan 2026", "Dec 2025", "No date recorded"]);
  });

  it("every declared group key produces a label (or is None)", () => {
    for (const { key } of GRID_GROUPS) {
      const label = groupLabelFor(row(), key);
      if (key === "none") expect(label).toBe("");
      else expect(label, `${key} produced no heading`).not.toBe("");
    }
  });
});

describe("⚠️ absence sorts LAST in every order — one rule, not five", () => {
  it("holds for every date-bearing sort", () => {
    for (const key of ["activity", "sent", "expect"] as const) {
      const rows = [
        row({ id: "none", lastMs: null, sentMs: null, expectedMs: null }),
        row({ id: "a", lastMs: 300, sentMs: 300, expectedMs: 300 }),
        row({ id: "b", lastMs: 100, sentMs: 100, expectedMs: 100 }),
      ];
      const out = [...rows].sort((x, y) => compareRows(x, y, key)).map((r) => r.id);
      expect(out[out.length - 1], `${key} did not sink the undated row`).toBe("none");
      /* A missing date must not read as the oldest thing you own. */
      expect(out[0]).not.toBe("none");
    }
  });

  it("dates run newest-first, except 'reply expected', which runs soonest-first", () => {
    const rows = [row({ id: "old", lastMs: 100, expectedMs: 100 }), row({ id: "new", lastMs: 300, expectedMs: 300 })];
    expect([...rows].sort((a, b) => compareRows(a, b, "activity")).map((r) => r.id)).toEqual(["new", "old"]);
    /* The soonest reply is the one you are waiting on — it belongs at the top, not the bottom. */
    expect([...rows].sort((a, b) => compareRows(a, b, "expect")).map((r) => r.id)).toEqual(["old", "new"]);
  });

  it("every declared sort is total and stable on ties", () => {
    for (const { key } of GRID_SORTS) {
      const rows = [row({ id: "z", name: "Zed" }), row({ id: "a", name: "Ada" })];
      const out = [...rows].sort((x, y) => compareRows(x, y, key));
      expect(out, `${key} lost a row`).toHaveLength(2);
      /* Ties break on name, so no sort ever leaves two cards in an arbitrary order. */
      expect(out.map((r) => r.name)).toEqual(["Ada", "Zed"]);
    }
  });
});

describe("the narrowing filters", () => {
  const r = { ...row(), via: "Email", slots: new Set(["queryLetter", "synopsis"]) };

  it("ticks WITHIN a facet are alternatives; facets narrow each other", () => {
    expect(matchesGridFilters(r, { ...emptyGridFilters(), status: new Set([QueryStatus.QUERIED, QueryStatus.OFFER]) })).toBe(true);
    expect(matchesGridFilters(r, { ...emptyGridFilters(), status: new Set([QueryStatus.OFFER]) })).toBe(false);
    /* Two facets that each match alone must both hold together. */
    expect(matchesGridFilters(r, { ...emptyGridFilters(), status: new Set([QueryStatus.QUERIED]), via: new Set(["Post"]) })).toBe(false);
  });

  it("⚠️ 'Included' means ALL of them — it is a description of the parcel, not a shortlist", () => {
    expect(matchesGridFilters(r, { ...emptyGridFilters(), included: new Set(["queryLetter", "synopsis"]) })).toBe(true);
    expect(matchesGridFilters(r, { ...emptyGridFilters(), included: new Set(["queryLetter", "sample"]) })).toBe(false);
  });

  it("an empty set matches everything", () => {
    expect(matchesGridFilters(r, emptyGridFilters())).toBe(true);
    expect(gridFiltersAreEmpty(emptyGridFilters())).toBe(true);
    expect(gridFilterCount(emptyGridFilters())).toBe(0);
  });

  it("⚠️ Clear all is BUILT, so a facet added later cannot escape it", () => {
    const empty = emptyGridFilters() as unknown as Record<string, Set<string>>;
    const keys = Object.keys(empty);
    expect(keys.length).toBeGreaterThan(3);
    /* Every facet is a real, empty Set — a hand-written literal that missed one would fail here. */
    for (const k of keys) {
      expect(empty[k], `${k} is not a Set`).toBeInstanceOf(Set);
      expect(empty[k].size, `${k} is not cleared`).toBe(0);
    }
    /* And the count sums every facet, so a new one is counted the day it exists. */
    const filled = emptyGridFilters() as unknown as Record<string, Set<string>>;
    for (const k of keys) filled[k].add("x");
    expect(gridFilterCount(filled as never)).toBe(keys.length);
  });
});

describe("the declared vocabularies are complete", () => {
  it("every quick key is declared once", () => {
    const keys = QUICK_FILTERS.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain<QuickKey>("all");
  });
  it("None is the first group and the default reading", () => {
    expect(GRID_GROUPS[0].key).toBe("none");
  });
  it("Last activity is the first sort — the page opens on what moved most recently", () => {
    expect(GRID_SORTS[0].key).toBe("activity");
  });
});

/**
 * ⚠️ THE BROWSING GRID'S CONTROLS EXIST AND REACH THE STATE THEY NAME. A `gridGroup` with no
 * control that can set it is dead state — the grid would read a value nothing could change, and
 * the feature would look built from the source and be absent from the page. Asserted against
 * `Queries.tsx` because that is where the wiring lives.
 */
describe("⚠️ every declared control is mounted and wired", () => {
  const page = readFileSync(resolve(__dirname, "../components/Queries.tsx"), "utf8");
  const decls = page.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  it("the quick pills render from the declared set and drive the page's own filter state", () => {
    expect(decls).toContain("QUICK_FILTERS.map");
    expect(decls).toContain("setQuickKey(f.key)");
    /* ⚠️ ONE STATE. `setQuickKey` maps onto `turnFilter`; a `useState` of its own here would be a
       second control over one narrowing. */
    expect(decls).toContain("setTurnFilter(");
    expect(decls).not.toMatch(/useState<QuickKey>/);
  });

  it("Group has a control that can actually set it — not dead state", () => {
    expect(decls).toContain("setGridGroup(");
    expect(decls).toContain("renderGroupPopover");
    expect(decls).toContain("groupPopOpen && renderGroupPopover()");
    /* Every option in the declared table is offered, not a hand-picked subset. */
    expect(decls).toContain("GRID_GROUPS.map");
  });

  it("⚠️ the counts read the SCOPED set, never the filtered view", () => {
    expect(decls).toContain("quickCounts(");
    /* Counting `gridRows` or `sortedList` would print 0 beside every court not currently chosen. */
    expect(decls).not.toContain("quickCounts(gridRows");
    expect(decls).not.toContain("quickCounts(sortedList");
    expect(decls).toContain("mastheadScopedQueries.map");
  });

  it("⚠️ and the removable chip names every court — a ternary covered two and lied about the rest", () => {
    expect(decls).toContain("TURN_CHIP_LABEL[turnFilter]");
    for (const court of ["move", "wait", "offer", "closed"]) {
      expect(decls, `${court} has no chip label`).toMatch(new RegExp(`\\b${court}:\\s*"`));
    }
  });
});
