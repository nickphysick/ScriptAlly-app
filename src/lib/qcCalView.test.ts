/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * §10 lock 8 — the expanded view's controls: what the filter keeps, what the sort orders, what a
 * group heading says, and what ↺ goes back to.
 *
 * ⚠️ EVERY ORDER CLAIM IS ASSERTED AS A SEQUENCE OF NAMES, never as a count or a membership. A
 * lock that checks which rows survive is satisfied by any order at all, which is precisely the
 * mutation §10 lock 9 asks for: drop the sort inside `groupRows` and a membership check stays
 * green while the reader's list is in whatever order the account happened to hand over.
 */
import { describe, it, expect } from "vitest";
import { Agent, Query, QueryStatus } from "../types";
import { buildQcRows, type QcRow } from "./qcSummary";
import { ATTENTION_LABEL, UPCOMING_DAYS } from "./qcBirdsEye";
import {
  CAL_DEFAULT, GROUP_BY_OPTIONS, SORT_BY_OPTIONS, anyDiffers, attentionCounts, filterDiffers,
  groupRows, sortDiffers, sortRows, toggleAttention, type CalView,
} from "./qcCalView";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 8, 23, 12);
const iso = (d: number) => new Date(NOW + d * DAY).toISOString();

/**
 * ⚠️ THE FIXTURE IS BUILT WITH ITS DATES DELIBERATELY OUT OF EVERY ORDER THE LOCKS ASSERT — the
 * input is alphabetical by agent, which is none of the three sorts. A fixture that arrives in the
 * order a lock expects makes that lock vacuous, and this pass has already shipped one of those.
 */
let n = 0;
const agents: Agent[] = [];
function mk(name: string, over: Partial<Query>): Query {
  const id = `a${++n}`;
  agents.push({ id, userId: "u", name, agency: `${name} Ltd`, responseTimeWeeks: 8 } as Agent);
  return {
    id: `q${n}`, userId: "u", manuscriptId: "m1", agentId: id, packageId: "", personalisationNotes: "",
    sendMethod: "Email" as never, status: QueryStatus.QUERIED, dateSent: iso(-60), ...over,
  };
}
/* Alphabetical by agent; each carries its own send date, stage date and expected date. */
const QUERIES: Query[] = [
  /* Overdue (agent's turn, date gone) — sent LONGEST ago, stage oldest */
  mk("Alder", { dateSent: iso(-120), responseDeadline: iso(-9) }),
  /* Upcoming (with you) — no date at all, so it must sort LAST under every sort */
  mk("Brand", { dateSent: iso(-30), status: QueryStatus.FULL_REQUESTED, fullRequestedDate: iso(-4) }),
  /* Upcoming (agent, inside the fortnight) */
  mk("Crale", { dateSent: iso(-50), responseDeadline: iso(UPCOMING_DAYS - 3) }),
  /* Watch and wait (agent, beyond the fortnight) */
  mk("Dunne", { dateSent: iso(-10), responseDeadline: iso(40) }),
  /* Overdue, but more recently sent than Alder and further past its date than Crale */
  mk("Ewart", { dateSent: iso(-95), responseDeadline: iso(-2) }),
  /* Closed — the view never draws it */
  mk("Frost", { dateSent: iso(-80), status: QueryStatus.REJECTED }),
];
const ROWS: QcRow[] = buildQcRows(QUERIES, agents, [], NOW);
const names = (gs: { rows: { row: QcRow }[] }[]) => gs.flatMap((g) => g.rows.map((r) => r.row.agentName));
const view = (over: Partial<CalView> = {}): CalView => ({ ...CAL_DEFAULT, ...over });

describe("the fixture itself", () => {
  it("⚠️ arrives alphabetically, which is none of the three sorts — so no order claim can pass by luck", () => {
    expect(ROWS.map((r) => r.agentName)).toEqual(["Alder", "Brand", "Crale", "Dunne", "Ewart", "Frost"]);
    /* and the dates really are distinct in each of the three keys the sorts read */
    const live = ROWS.filter((r) => r.agentName !== "Frost");
    for (const key of ["sentMs", "stageStartMs"] as const) {
      const vals = live.map((r) => r[key]).filter((v): v is number => v != null);
      expect(new Set(vals).size, key).toBe(vals.length);
    }
    /* exactly one live row has no expected date — the undated case every sort must put last */
    expect(live.filter((r) => r.expectedMs == null).map((r) => r.agentName)).toEqual(["Brand"]);
  });
});

describe("§8.3 · the default, and what differs from it", () => {
  it("the page-load default is Everything, no attention filter, grouped by Attention, due ascending", () => {
    expect(CAL_DEFAULT).toEqual({ court: "all", attention: [], groupBy: "attention", sortBy: "due", asc: true });
    expect(anyDiffers(CAL_DEFAULT)).toBe(false);
    expect(filterDiffers(CAL_DEFAULT)).toBe(false);
    expect(sortDiffers(CAL_DEFAULT)).toBe(false);
  });
  it("the four groupings and the three sorts, with their words", () => {
    expect(GROUP_BY_OPTIONS.map((o) => o.key)).toEqual(["attention", "status", "package", "none"]);
    expect(GROUP_BY_OPTIONS.map((o) => o.label)).toEqual(["Attention", "Status", "Submission package", "Nothing"]);
    expect(SORT_BY_OPTIONS.map((o) => o.key)).toEqual(["queried", "changed", "due"]);
    expect(SORT_BY_OPTIONS.map((o) => o.label)).toEqual(["Date queried", "Status changed", "Next action due"]);
  });
  it("⚠️ each button lights for its OWN settings, and ↺ for either", () => {
    for (const v of [view({ court: "you" }), view({ attention: ["overdue"] })]) {
      expect(filterDiffers(v)).toBe(true); expect(sortDiffers(v)).toBe(false); expect(anyDiffers(v)).toBe(true);
    }
    for (const v of [view({ groupBy: "none" }), view({ sortBy: "queried" }), view({ asc: false })]) {
      expect(sortDiffers(v)).toBe(true); expect(filterDiffers(v)).toBe(false); expect(anyDiffers(v)).toBe(true);
    }
  });
  it("the attention set is a SET — order does not make it differ, and a toggle releases", () => {
    expect(filterDiffers(view({ attention: ["watch", "overdue"] }))).toBe(true);
    const v = toggleAttention(toggleAttention(view(), "overdue"), "watch");
    expect(v.attention).toEqual(["overdue", "watch"]);
    expect(toggleAttention(v, "overdue").attention).toEqual(["watch"]);
    expect(anyDiffers(toggleAttention(toggleAttention(v, "overdue"), "watch"))).toBe(false);
  });
});

describe("§8.2 · the cards' counts", () => {
  it("count the whole live pipeline, and are untouched by the court", () => {
    const c = attentionCounts(ROWS, NOW);
    expect(c).toEqual({ overdue: 2, upcoming: 2, watch: 1 });
    /* the point of the rule: narrowing the view does not move the numbers */
    expect(attentionCounts(ROWS, NOW)).toEqual(c);
    expect(c.overdue + c.upcoming + c.watch).toBe(ROWS.filter((r) => r.agentName !== "Frost").length);
  });
});

describe("§8.3 · whose court HIDES here", () => {
  it("with you keeps only the with-you rows; with the agent only the agent's", () => {
    expect(names(groupRows(ROWS, view({ court: "you" }), NOW))).toEqual(["Brand"]);
    expect(names(groupRows(ROWS, view({ court: "agent" }), NOW)).sort())
      .toEqual(["Alder", "Crale", "Dunne", "Ewart"]);
  });
  it("and a closed query is never drawn, at any setting", () => {
    for (const court of ["all", "you", "agent"] as const) {
      expect(names(groupRows(ROWS, view({ court }), NOW))).not.toContain("Frost");
    }
  });
});

describe("§8.3 · the three sorts, as sequences", () => {
  it("Next action due, ascending — soonest first, the undated LAST", () => {
    expect(names(groupRows(ROWS, view({ groupBy: "none" }), NOW)))
      .toEqual(["Alder", "Ewart", "Crale", "Dunne", "Brand"]);
  });
  it("⚠️ …and descending puts the undated LAST AGAIN — the one asymmetry", () => {
    expect(names(groupRows(ROWS, view({ groupBy: "none", asc: false }), NOW)))
      .toEqual(["Dunne", "Crale", "Ewart", "Alder", "Brand"]);
  });
  it("Date queried — the first send", () => {
    expect(names(groupRows(ROWS, view({ groupBy: "none", sortBy: "queried" }), NOW)))
      .toEqual(["Alder", "Ewart", "Crale", "Brand", "Dunne"]);
    expect(names(groupRows(ROWS, view({ groupBy: "none", sortBy: "queried", asc: false }), NOW)))
      .toEqual(["Dunne", "Brand", "Crale", "Ewart", "Alder"]);
  });
  it("Status changed — the day it reached the stage it stands at, which is a DIFFERENT order", () => {
    const changed = names(groupRows(ROWS, view({ groupBy: "none", sortBy: "changed" }), NOW));
    const queried = names(groupRows(ROWS, view({ groupBy: "none", sortBy: "queried" }), NOW));
    expect(changed).toEqual(["Alder", "Ewart", "Crale", "Dunne", "Brand"]);
    expect(changed).not.toEqual(queried);
  });
  it("⚠️ 'last' belongs to the KEY BEING SORTED, not to the row — Brand has no due date and is still placed by its own stage date", () => {
    /* Brand is the row every due-sort must put last; under Status changed it is last because its
       stage really is the most recent, and under Date queried it is fourth. A row is only ever
       forced to the end for the key it is missing. */
    expect(ROWS.find((r) => r.agentName === "Brand")!.expectedMs).toBeNull();
    expect(names(groupRows(ROWS, view({ groupBy: "none", sortBy: "queried" }), NOW)).indexOf("Brand")).toBe(3);
    expect(names(groupRows(ROWS, view({ groupBy: "none", sortBy: "changed", asc: false }), NOW))[0]).toBe("Brand");
  });
  it("sortRows is the one implementation, and it is stable on a tie", () => {
    const live = groupRows(ROWS, view({ groupBy: "none" }), NOW)[0].rows;
    expect(sortRows(live, "due", true).map((r) => r.row.agentName))
      .toEqual(["Alder", "Ewart", "Crale", "Dunne", "Brand"]);
  });
});

describe("§8.3 · the groups", () => {
  it("Attention — the three in order, headings by name, empty groups dropped", () => {
    const gs = groupRows(ROWS, view(), NOW);
    expect(gs.map((g) => g.label)).toEqual(["Overdue", "Upcoming", "Watch and wait"]);
    expect(gs.map((g) => g.count)).toEqual([2, 2, 1]);
    expect(gs.map((g) => ATTENTION_LABEL[g.key as never])).toEqual(["Overdue", "Upcoming", "Watch and wait"]);
    /* one court, one group left, and it STILL carries its heading */
    const you = groupRows(ROWS, view({ court: "you" }), NOW);
    expect(you.map((g) => g.label)).toEqual(["Upcoming"]);
  });
  it("⚠️ the sort runs WITHIN each group — Overdue is Alder then Ewart, and flips together", () => {
    expect(names(groupRows(ROWS, view(), NOW))).toEqual(["Alder", "Ewart", "Crale", "Brand", "Dunne"]);
    expect(names(groupRows(ROWS, view({ asc: false }), NOW))).toEqual(["Ewart", "Alder", "Crale", "Brand", "Dunne"]);
  });
  it("Status — pipeline order, not alphabetical and not by count", () => {
    const gs = groupRows(ROWS, view({ groupBy: "status" }), NOW);
    expect(gs.map((g) => g.label)).toEqual(["Queried", "Full requested"]);
    expect(gs.map((g) => g.count)).toEqual([4, 1]);
  });
  it("Nothing — one group, no heading", () => {
    const gs = groupRows(ROWS, view({ groupBy: "none" }), NOW);
    expect(gs).toHaveLength(1);
    expect(gs[0].label).toBe("");
  });
  it("Submission package — A to Z, with No package LAST however it would sort", () => {
    const withPkg = QUERIES.map((q, i) => ({ ...q, packageId: i === 0 ? "p2" : i === 2 ? "p1" : "" }));
    const rows = buildQcRows(withPkg, agents, [], NOW);
    const nameOf = (id: string) => (id === "p1" ? "Aardvark set" : id === "p2" ? "Zebra set" : null);
    const gs = groupRows(rows, view({ groupBy: "package" }), NOW, nameOf);
    expect(gs.map((g) => g.label)).toEqual(["Aardvark set", "Zebra set", "No package"]);
    expect(gs.map((g) => g.count)).toEqual([1, 1, 3]);
    /* an id nothing resolves is No package, not a group called after the id */
    const orphan = groupRows(rows, view({ groupBy: "package" }), NOW, () => null);
    expect(orphan.map((g) => g.label)).toEqual(["No package"]);
  });
});

describe("§8.3 · the attention filter", () => {
  it("shows only the groups picked, and the counts do not move", () => {
    expect(names(groupRows(ROWS, view({ attention: ["overdue"] }), NOW))).toEqual(["Alder", "Ewart"]);
    expect(names(groupRows(ROWS, view({ attention: ["overdue", "watch"] }), NOW))).toEqual(["Alder", "Ewart", "Dunne"]);
    expect(attentionCounts(ROWS, NOW).upcoming).toBe(2);
  });
  it("an empty set means everything — never nothing", () => {
    expect(names(groupRows(ROWS, view({ attention: [] }), NOW))).toHaveLength(5);
  });
  it("and it composes with the court rather than replacing it", () => {
    expect(names(groupRows(ROWS, view({ court: "agent", attention: ["upcoming"] }), NOW))).toEqual(["Crale"]);
  });
});
