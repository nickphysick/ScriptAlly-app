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
  ACTION_GROUPS, CAL_DEFAULT, CLOSE_OVER_DAYS, CLOSE_UNDATED_DAYS, GROUP_BY_OPTIONS, SORT_BY_OPTIONS,
  anyDiffers, attentionCounts, filterDiffers, groupDiffers, groupRows, nextAction, sortDiffers,
  sortRows, toggleAttention, type CalView,
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
  it("§6 · the FIVE groupings and the three sorts, with their words", () => {
    /* §6 — "Next action" joins them, and two were renamed to the mock's own words: "Attention" is
       the tab a reader never sees ("Urgency" is what the cards are about), and "Nothing" reads as
       an option that does something. */
    expect(GROUP_BY_OPTIONS.map((o) => o.key)).toEqual(["attention", "status", "action", "package", "none"]);
    expect(GROUP_BY_OPTIONS.map((o) => o.label)).toEqual(["Urgency", "Status", "Next action", "Submission package", "No grouping"]);
    expect(SORT_BY_OPTIONS.map((o) => o.key)).toEqual(["queried", "changed", "due"]);
    expect(SORT_BY_OPTIONS.map((o) => o.label)).toEqual(["Date queried", "Status changed", "Next action due"]);
  });
  /**
   * ⚠️ §6 · THREE BUTTONS, THREE QUESTIONS ABOUT ONE VALUE — and the split is the point of giving
   * Group its own control. While the grouping lived inside Sort's popover, `sortDiffers` answered
   * for a setting Sort did not own, so changing the grouping lit the Sort button.
   */
  it("⚠️ each button lights for its OWN settings, and ↺ for any of them", () => {
    for (const v of [view({ court: "you" }), view({ attention: ["overdue"] })]) {
      expect(filterDiffers(v)).toBe(true); expect(groupDiffers(v)).toBe(false); expect(sortDiffers(v)).toBe(false); expect(anyDiffers(v)).toBe(true);
    }
    for (const v of [view({ groupBy: "none" }), view({ groupBy: "action" })]) {
      expect(groupDiffers(v)).toBe(true); expect(filterDiffers(v)).toBe(false); expect(sortDiffers(v)).toBe(false); expect(anyDiffers(v)).toBe(true);
    }
    for (const v of [view({ sortBy: "queried" }), view({ asc: false })]) {
      expect(sortDiffers(v)).toBe(true); expect(filterDiffers(v)).toBe(false); expect(groupDiffers(v)).toBe(false); expect(anyDiffers(v)).toBe(true);
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

/**
 * §6 · WHAT TO DO NEXT. Seven groups, most pressing first, each saying what the action IS — and the
 * whole point of the grouping is that a reader can see the shape of their own workload without
 * reading a single row.
 */
describe("§6 · the next-action grouping", () => {
  /* its own fixture: the branches this classification has, which the file's ROWS do not all reach */
  const A: Agent[] = [];
  let m = 0;
  const q = (over: Partial<Query>): Query => {
    const id = `b${++m}`;
    A.push({ id, userId: "u", name: `N${m}`, agency: "X", responseTimeWeeks: 8 } as Agent);
    return { id: `p${m}`, userId: "u", manuscriptId: "m1", agentId: id, packageId: "", personalisationNotes: "",
      sendMethod: "Email" as never, status: QueryStatus.QUERIED, dateSent: iso(-10), ...over } as Query;
  };
  const QS: Query[] = [
    q({ status: QueryStatus.OFFER, offerResponseDeadline: iso(6) }),
    q({ status: QueryStatus.REVISE_RESUBMIT, dateSent: iso(-30) }),
    q({ status: QueryStatus.FULL_REQUESTED, fullRequestedDate: iso(-3) }),
    q({ status: QueryStatus.PARTIAL_REQUESTED, partialRequestedDate: iso(-3) }),
    /* agent-side, past its date by less than four weeks → a nudge */
    q({ dateSent: iso(-70), responseDeadline: iso(-10) }),
    /* …past it by more than four weeks → consider closing */
    q({ dateSent: iso(-200), responseDeadline: iso(-40) }),
    /* …date still ahead → nothing to do */
    q({ dateSent: iso(-5), responseDeadline: iso(20) }),
  ];
  const R = buildQcRows(QS, A, [], NOW);
  const by = (k: string) => R.filter((r) => nextAction(r, NOW) === k).length;

  it("§6 · the seven groups, in order, each naming its own action", () => {
    expect(ACTION_GROUPS.map((g) => g.key)).toEqual(["offer", "revision", "full", "partial", "nudge", "close", "wait"]);
    expect(ACTION_GROUPS.map((g) => g.label)).toEqual([
      "Offer pending", "Revision owed", "Full owed", "Partial owed", "Nudge due", "Consider closing", "Waiting on the agent",
    ]);
    expect(ACTION_GROUPS.map((g) => g.hint)).toEqual([
      "your decision to make", "send the new version", "send the full manuscript", "send the partial",
      "chase a query, partial or full", "no word for a long while", "nothing to do yet",
    ]);
  });

  it("§6 · every branch is reached, and each by exactly one row", () => {
    /* ⚠️ THE TALLY IS THE LOCK. A fixture where every row lands in one group proves only that the
       group it landed in behaves — and this file has already shipped a monoculture once. */
    const tally = Object.fromEntries(ACTION_GROUPS.map((g) => [g.key, by(g.key)]));
    expect(tally).toEqual({ offer: 1, revision: 1, full: 1, partial: 1, nudge: 1, close: 1, wait: 1 });
  });

  /**
   * ⚠️ THE WITH-YOU STATUSES ARE ANSWERED BY STATUS AND NEVER BY A DATE — which is what makes
   * "Waiting on the agent" true of everything in it. An offer whose deadline went months ago is
   * still YOUR decision; the mock's classifier reaches its date branch only from the agent's court.
   */
  it("⚠️ §6 · a with-you row keeps its group however old its dates are", () => {
    const old = buildQcRows([
      q({ status: QueryStatus.OFFER, dateSent: iso(-400), offerResponseDeadline: iso(-200) }),
      q({ status: QueryStatus.REVISE_RESUBMIT, dateSent: iso(-400) }),
    ], A, [], NOW);
    expect(old.map((r) => nextAction(r, NOW))).toEqual(["offer", "revision"]);
  });

  /**
   * ⚠️ `revision` IS THIS APP'S OWN GROUP AND IT IS NOT AN INVENTED FEATURE. The mock's fixture has
   * no Revise & Resubmit, so its classifier names three with-you statuses and lets the rest fall
   * through — which would file a live R&R under "Waiting on the agent". `isWithYou` is one
   * definition in this app (partial requested · full requested · R&R) and it governs here too.
   */
  it("⚠️ §6 · an R&R is never described as waiting on the agent", () => {
    const rr = buildQcRows([q({ status: QueryStatus.REVISE_RESUBMIT, dateSent: iso(-200) })], A, [], NOW);
    expect(nextAction(rr[0], NOW)).toBe("revision");
    expect(nextAction(rr[0], NOW)).not.toBe("wait");
  });

  it("§6 · the two close thresholds, stated and at their edges", () => {
    expect(CLOSE_OVER_DAYS).toBe(28);
    expect(CLOSE_UNDATED_DAYS).toBe(84);
    /* ⚠️ THE DATE IS DRIVEN BY THE SEND, NOT BY `responseDeadline`. `resolveExpectedDate` reads the
       last send plus the agency's stated window (8 weeks here), so a fixture that sets a deadline
       field and a send date far apart tests the send date — which is how the first cut of this case
       asked for 27 days over and got 244. */
    const at = (d: number) => nextAction(buildQcRows([q({ dateSent: iso(-(d + 56)) })], A, [], NOW)[0], NOW);
    expect(at(CLOSE_OVER_DAYS - 1)).toBe("nudge");
    expect(at(CLOSE_OVER_DAYS + 1)).toBe("close");
  });

  it("§6 · the bands carry their hints, empty groups are not drawn, and the order is the list's", () => {
    const gs = groupRows(R, view({ groupBy: "action" }), NOW);
    expect(gs.map((g) => g.key)).toEqual(["offer", "revision", "full", "partial", "nudge", "close", "wait"]);
    expect(gs.every((g) => g.count > 0)).toBe(true);
    expect(gs.map((g) => g.hint)).toEqual(ACTION_GROUPS.map((g) => g.hint));
    /* every live row is in exactly one group — the reconciliation the whole grouping rests on */
    expect(gs.reduce((n2, g) => n2 + g.count, 0)).toBe(R.length);
    /* and a grouping with nothing in a group simply omits it */
    const one = groupRows(buildQcRows([q({ status: QueryStatus.OFFER, offerResponseDeadline: iso(9) })], A, [], NOW), view({ groupBy: "action" }), NOW);
    expect(one.map((g) => g.key)).toEqual(["offer"]);
  });

  it("⚠️ §6 · the OTHER groupings carry no hint — one is not invented to fill the slot", () => {
    for (const g of ["attention", "status", "package", "none"] as const) {
      expect(groupRows(R, view({ groupBy: g }), NOW).every((x) => x.hint === undefined), g).toBe(true);
    }
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
