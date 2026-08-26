/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ EVERY INPUT HERE IS BUILT BY THE FUNCTION THAT REALLY BUILDS IT. The day reads are composed
 * from `calendarDays`, `recordDays` and `dedupeAgainstRecord` exactly as the page composes them,
 * never hand-written `CalendarItem`s — a test that hands a function an argument its callers cannot
 * produce is testing a function nobody runs, which this repo has already paid for once.
 */
import { describe, it, expect } from "vitest";
import { Query, Agent, UserTask, TaskFlag, Activity, ActivityType, QueryStatus } from "../types";
import { BoardCard } from "./todoBoard";
import {
  calendarDays, recordDays, dedupeAgainstRecord, ghostsFor, pillLabel,
  CalendarInput, CalendarItem,
} from "./todoCalendar";
import {
  windowDays, shiftWindow, timelineWeek, timelineRows, timelineBands,
  defaultView, allFilters, TIMELINE_FILTERS, FILTER_LABEL, SHOW_ORDER, SORT_ORDER,
  YOU_ROW, YOU_ROW_NAME, TimelineData, TimelineView,
} from "./todoTimeline";

const TODAY = "2026-08-26";
const NOW = Date.parse("2026-08-26T12:00:00Z");
const WIN = windowDays(TODAY, 7); // 26 Aug .. 1 Sep

const card = (over: Partial<BoardCard>): BoardCard => ({
  key: "k", stream: "do", title: "t", who: "", subtitle: "", due: "", warn: false, snoozes: 0,
  hk: false, initials: "•", record: "", committed: false, done: false, ...over,
});
const q = (over: Partial<Query>): Query => ({
  id: "q1", userId: "u", manuscriptId: "m1", agentId: "a1", packageId: "",
  status: QueryStatus.QUERIED, dateSent: "2026-07-01T09:00:00Z",
  personalisationNotes: "", sendMethod: "Email", ...over,
} as Query);
const agent = (over: Partial<Agent>): Agent =>
  ({ id: "a1", name: "P. Kaur", agency: "Kaur & Finch", ...over } as unknown as Agent);
const act = (over: Partial<Activity>): Activity => ({
  id: "act1", userId: "u", queryId: "q1", manuscriptId: "m1",
  activityType: ActivityType.QUERY_SENT, description: "", date: `${TODAY}T09:00:00Z`,
  details: "", ...over,
} as Activity);

const input = (over: Partial<CalendarInput>): CalendarInput => ({
  cols: { todo: [], today: [], snoozed: [], dismissed: [], done: [] },
  flags: [] as TaskFlag[], queries: [], agents: [], userTasks: [] as UserTask[],
  activities: [], today: TODAY, nowMs: NOW, ...over,
} as CalendarInput);

/**
 * The page's own composition, verbatim: one reading of a day, deduped, then read by the rows.
 * Ghosts derive from TODAY's items, never the day's own — carried work renders on today.
 */
const dataFor = (inp: CalendarInput, win: readonly string[] = WIN): TimelineData => {
  const byDay = calendarDays(inp, [...win]);
  const recByDay = recordDays(inp.activities, inp.queries, inp.agents, win);
  const recordFor = (ymd: string) => recByDay.get(ymd) ?? [];
  const itemsFor = (ymd: string): CalendarItem[] =>
    dedupeAgainstRecord(byDay.get(ymd)?.items ?? [], recordFor(ymd));
  return {
    queries: inp.queries, agents: inp.agents, today: inp.today,
    itemsFor, recordFor,
    ghostsOn: (ymd) => (ymd === inp.today ? [] : ghostsFor(ymd, itemsFor(inp.today))),
  };
};
const view = (over: Partial<TimelineView> = {}): TimelineView => ({ ...defaultView(), ...over });

/* ══ the window ══════════════════════════════════════════════════════════════════════════════ */

describe("the window — seven days from where it is told, and nothing month-shaped", () => {
  it("runs forward from its start, in order, with no padding to whole weeks", () => {
    expect(WIN).toEqual([
      "2026-08-26", "2026-08-27", "2026-08-28", "2026-08-29", "2026-08-30", "2026-08-31", "2026-09-01",
    ]);
  });
  it("crosses a month boundary without a torn row, a lead-in or an off-month day", () => {
    expect(windowDays("2026-08-30", 7)).toEqual([
      "2026-08-30", "2026-08-31", "2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-05",
    ]);
  });
  it("pages by whole windows, both directions, and returns", () => {
    const fwd = shiftWindow(TODAY, 7, 1);
    expect(fwd).toBe("2026-09-02");
    expect(shiftWindow(fwd, 7, -1)).toBe(TODAY);
  });
  it("a zero-length window is empty rather than an error", () => {
    expect(windowDays(TODAY, 0)).toEqual([]);
  });
});

/* ══ rows ════════════════════════════════════════════════════════════════════════════════════ */

const TURN = input({
  queries: [q({ id: "q1", agentId: "a1", status: QueryStatus.FULL_REQUESTED, lastStatusChange: `${TODAY}T08:00:00Z` })],
  agents: [agent({})],
  cols: {
    todo: [], snoozed: [], dismissed: [], done: [],
    today: [card({ key: "c1", taskType: "full_requested", relatedRecordId: "q1", agentId: "a1", title: "Send the full" })],
  },
} as Partial<CalendarInput>);

describe("rows are relationships — one per agent, and Your tasks pinned above them all", () => {
  it("puts Your tasks first, always, and it belongs to no agent", () => {
    const rows = timelineRows(dataFor(input({})), TODAY, 7);
    expect(rows[0].key).toBe(YOU_ROW);
    expect(rows[0].name).toBe(YOU_ROW_NAME);
    expect(rows[0].agentId).toBeNull();
  });

  it("keeps Your tasks even when it holds nothing — it never disappears", () => {
    const rows = timelineRows(dataFor(input({})), TODAY, 7);
    expect(rows).toHaveLength(1);
    expect(rows[0].items).toHaveLength(0);
    /* an empty row still has a lane, or it would have no height to draw in */
    expect(rows[0].lanes).toBe(1);
  });

  it("raises one row per agent with something in the window, named by the display helpers", () => {
    const rows = timelineRows(dataFor(TURN), TODAY, 7);
    const a = rows.find((r) => r.agentId === "a1")!;
    expect(a).toBeDefined();
    expect(a.name).toBe("P. Kaur");
    expect(a.agency).toBe("Kaur & Finch");
    expect(a.items.map((i) => i.kind)).toEqual(["turn"]);
  });

  it("sends a writer's own task to the pinned row and never to an agent's", () => {
    const inp = input({
      cols: {
        todo: [], snoozed: [], dismissed: [], done: [],
        today: [card({ key: "u1", userTaskId: "t1", nature: "task", dueYmd: "2026-08-28", title: "Book the library room" })],
      },
    } as Partial<CalendarInput>);
    const rows = timelineRows(dataFor(inp), TODAY, 7);
    expect(rows).toHaveLength(1);
    expect(rows[0].key).toBe(YOU_ROW);
    expect(rows[0].items.map((i) => [i.kind, i.label, i.idx])).toEqual([["task", "Book the library room", 2]]);
  });

  it("⚠️ routes a record entry by its queryId — RecordItem carries no agentId at all", () => {
    const inp = input({
      queries: [q({ id: "q1", agentId: "a1" })],
      agents: [agent({})],
      activities: [act({ id: "r1", queryId: "q1", date: `${TODAY}T09:00:00Z` })],
    });
    const rec = dataFor(inp).recordFor(TODAY)[0];
    expect(rec).toBeDefined();
    expect((rec as unknown as { agentId?: string }).agentId).toBeUndefined();
    const rows = timelineRows(dataFor(inp), TODAY, 7);
    const a = rows.find((r) => r.agentId === "a1")!;
    expect(a.items.map((i) => [i.kind, i.label])).toEqual([["rec", "Query sent"]]);
  });

  it("⚠️ keeps a live query with nothing scheduled — a query you sent is never invisible", () => {
    /* no window resolvable (no agency weeks, no date of the writer's), no card, no record */
    const inp = input({ queries: [q({ id: "q1", agentId: "a1" })], agents: [agent({})] });
    const rows = timelineRows(dataFor(inp), TODAY, 7);
    const a = rows.find((r) => r.agentId === "a1")!;
    expect(a).toBeDefined();
    expect(a.items).toHaveLength(0);
    expect(a.closed).toBe(false);
  });

  it("drops a closed relationship from Active, and Everything brings it back", () => {
    const inp = input({
      queries: [q({ id: "q1", agentId: "a1", status: QueryStatus.REJECTED })],
      agents: [agent({})],
    });
    expect(timelineRows(dataFor(inp), TODAY, 7).map((r) => r.key)).toEqual([YOU_ROW]);
    const all = timelineRows(dataFor(inp), TODAY, 7, view({ show: "all" }));
    expect(all.map((r) => r.agentId)).toEqual([null, "a1"]);
    expect(all[1].closed).toBe(true);
  });

  it("Needs me keeps only rows holding work, and takes no pity on a quiet live row", () => {
    const quiet = input({ queries: [q({ id: "q9", agentId: "a9" })], agents: [agent({ id: "a9", name: "T. Ellery" })] });
    const merged = input({
      queries: [...TURN.queries, ...quiet.queries],
      agents: [...TURN.agents, ...quiet.agents],
      cols: TURN.cols,
    } as Partial<CalendarInput>);
    const needs = timelineRows(dataFor(merged), TODAY, 7, view({ show: "needs" }));
    expect(needs.map((r) => r.agentId)).toEqual([null, "a1"]);
  });

  it("marks whose move it is from the CTA engine, never from a second list of statuses", () => {
    const rows = timelineRows(dataFor(TURN), TODAY, 7);
    expect(rows.find((r) => r.agentId === "a1")!.dot).toBe("you");
    const waiting = input({
      queries: [q({ id: "q1", agentId: "a1", status: QueryStatus.QUERIED })], agents: [agent({})],
    });
    expect(timelineRows(dataFor(waiting), TODAY, 7).find((r) => r.agentId === "a1")!.dot).toBe("them");
    expect(timelineRows(dataFor(input({})), TODAY, 7)[0].dot).toBe("self");
  });

  it("the pinned row states no second line — it holds tasks from every manuscript and from none", () => {
    expect(timelineRows(dataFor(input({})), TODAY, 7)[0].agency).toBe("");
  });
});

/* ══ bands ═══════════════════════════════════════════════════════════════════════════════════ */

/** A waiting query whose window is resolvable: sent `sent`, the agency states `weeks`. */
const banded = (sent: string, weeks: number, over: Partial<Query> = {}) => input({
  queries: [q({ id: "q1", agentId: "a1", status: QueryStatus.QUERIED, dateSent: sent, ...over })],
  agents: [agent({ responseTimeWeeks: weeks } as Partial<Agent>)],
});

describe("bands — a span from the send to the resolved window, clamped and marked at both edges", () => {
  it("runs between the two, unclamped, when both ends are in the window", () => {
    /* sent on day 0 of the window, two weeks would land outside — so use a one-day window pair */
    const b = timelineBands(dataFor(banded(`${TODAY}T09:00:00Z`, 0.5)), TODAY, 7)[0];
    expect(b).toBeDefined();
    expect([b.fromIdx, b.toIdx]).toEqual([0, 3]);
    expect([b.openLeft, b.openRight]).toEqual([false, false]);
    expect(b.source).toBe("agent");
    expect(b.endYmd).toBe("2026-08-29");
  });

  it("clamps to the LEFT edge and marks it when the send precedes the window", () => {
    const b = timelineBands(dataFor(banded("2026-08-20T09:00:00Z", 1)), TODAY, 7)[0];
    expect(b.fromIdx).toBe(0);
    expect(b.openLeft).toBe(true);
    expect(b.toIdx).toBe(1); // 27 Aug
    expect(b.openRight).toBe(false);
  });

  it("clamps to the RIGHT edge and marks it when the window closes beyond it", () => {
    const b = timelineBands(dataFor(banded(`${TODAY}T09:00:00Z`, 6)), TODAY, 7)[0];
    expect([b.fromIdx, b.toIdx]).toEqual([0, 6]);
    expect([b.openLeft, b.openRight]).toEqual([false, true]);
  });

  it("marks BOTH when the span swallows the whole window", () => {
    const b = timelineBands(dataFor(banded("2026-07-01T09:00:00Z", 12)), TODAY, 7)[0];
    expect([b.fromIdx, b.toIdx]).toEqual([0, 6]);
    expect([b.openLeft, b.openRight]).toEqual([true, true]);
  });

  it("draws nothing for a span that is wholly outside the window", () => {
    expect(timelineBands(dataFor(banded("2026-06-01T09:00:00Z", 1)), TODAY, 7)).toHaveLength(0);
  });

  it("⚠️ a passed window is FADED, not gone, and gains no expiry copy", () => {
    /* sent 1 Aug, a one-week window — it closed on the 8th, a fortnight before today */
    const inp = banded("2026-08-01T09:00:00Z", 1);
    const early = timelineBands(dataFor(inp, windowDays("2026-08-05", 7)), "2026-08-05", 7)[0];
    expect(early.passed).toBe(true);
    expect([early.fromIdx, early.toIdx]).toEqual([0, 3]);
    expect(early.openLeft).toBe(true);
    /* no expiry pill, no expiry copy, no second label — the band is drawn faded and that is all */
    expect(early.label).toBe("Reply window");
  });

  it("takes the LATEST send as the anchor, so a partial restarts the clock", () => {
    const inp = banded("2026-07-01T09:00:00Z", 1, {
      status: QueryStatus.PARTIAL_SENT, partialSentDate: `${TODAY}T09:00:00Z`,
    });
    const b = timelineBands(dataFor(inp), TODAY, 7)[0];
    expect(b.fromIdx).toBe(0);
    expect(b.openLeft).toBe(false);
  });

  it("draws no band for a query that is not waiting — the writer's turn expects no reply", () => {
    const inp = banded(`${TODAY}T09:00:00Z`, 1, { status: QueryStatus.FULL_REQUESTED });
    expect(timelineBands(dataFor(inp), TODAY, 7)).toHaveLength(0);
  });

  it("draws no band without a send — a span needs a start, and only a send is an honest one", () => {
    const inp = input({
      queries: [{ ...q({ id: "q1", agentId: "a1" }), dateSent: undefined } as unknown as Query],
      agents: [agent({ responseTimeWeeks: 1 } as Partial<Agent>)],
    });
    expect(timelineBands(dataFor(inp), TODAY, 7)).toHaveLength(0);
  });

  it("draws no band when nothing resolves the window — no agency weeks, no date of yours", () => {
    const inp = input({ queries: [q({ id: "q1", agentId: "a1" })], agents: [agent({})] });
    expect(timelineBands(dataFor(inp), TODAY, 7)).toHaveLength(0);
  });

  it("⚠️ the band IS the reply window — it is never also a chip on its end day", () => {
    const inp = banded(`${TODAY}T09:00:00Z`, 0.5);
    const { rows, bands } = timelineWeek(dataFor(inp), TODAY, 7);
    expect(bands).toHaveLength(1);
    expect(rows.find((r) => r.agentId === "a1")!.items).toHaveLength(0);
  });
});

/* ══ the filters ═════════════════════════════════════════════════════════════════════════════ */

describe("the kind filters — five, and each is a thing to switch off", () => {
  it("names all five, and the reset restores them from the list rather than a literal", () => {
    expect(TIMELINE_FILTERS).toEqual(["turn", "wait", "rec", "task", "ghost"]);
    expect(allFilters()).toEqual([...TIMELINE_FILTERS]);
    expect(TIMELINE_FILTERS.every((k) => !!FILTER_LABEL[k])).toBe(true);
    expect(Object.keys(FILTER_LABEL).sort()).toEqual([...TIMELINE_FILTERS].sort());
  });

  it("⚠️ a filter that empties a row removes the row", () => {
    const rows = timelineRows(dataFor(TURN), TODAY, 7, view({ kinds: ["rec"] }));
    expect(rows.map((r) => r.key)).toEqual([YOU_ROW]);
  });

  it("⚠️ but it does not remove a row that had nothing to hide", () => {
    /* a live query, no card, no band — the filters were hiding nothing, so the row stays */
    const inp = input({ queries: [q({ id: "q1", agentId: "a1" })], agents: [agent({})] });
    const rows = timelineRows(dataFor(inp), TODAY, 7, view({ kinds: ["rec"] }));
    expect(rows.map((r) => r.agentId)).toEqual([null, "a1"]);
  });

  it("switching waiting off takes the band and leaves the row's other work", () => {
    const inp = input({
      queries: [q({ id: "q1", agentId: "a1", status: QueryStatus.QUERIED, dateSent: `${TODAY}T09:00:00Z` })],
      agents: [agent({ responseTimeWeeks: 0.5 } as Partial<Agent>)],
      activities: [act({ id: "r1", queryId: "q1" })],
    });
    expect(timelineBands(dataFor(inp), TODAY, 7)).toHaveLength(1);
    const off = timelineWeek(dataFor(inp), TODAY, 7, view({ kinds: ["rec"] }));
    expect(off.bands).toHaveLength(0);
    expect(off.rows.find((r) => r.agentId === "a1")!.items.map((i) => i.kind)).toEqual(["rec"]);
  });

  it("search reaches the agent, the agency and the item's own words", () => {
    const d = dataFor(TURN);
    expect(timelineRows(d, TODAY, 7, view({ search: "kaur" })).map((r) => r.agentId)).toEqual([null, "a1"]);
    expect(timelineRows(d, TODAY, 7, view({ search: "finch" })).map((r) => r.agentId)).toEqual([null, "a1"]);
    /* the card's own title, which `pillLabel` had abbreviated to "Send full" on the grid */
    expect(timelineRows(d, TODAY, 7, view({ search: "send the full" })).map((r) => r.agentId)).toEqual([null, "a1"]);
    expect(timelineRows(d, TODAY, 7, view({ search: "send full" })).map((r) => r.agentId)).toEqual([null, "a1"]);
    expect(timelineRows(d, TODAY, 7, view({ search: "zzz" })).map((r) => r.agentId)).toEqual([null]);
  });
});

/* ══ order ═══════════════════════════════════════════════════════════════════════════════════ */

const threeAgents = (statuses: QueryStatus[], sends: string[]) => input({
  queries: statuses.map((s, i) => q({ id: `q${i}`, agentId: `a${i}`, status: s, dateSent: sends[i] })),
  agents: statuses.map((_, i) => agent({ id: `a${i}`, name: `Agent ${"CBA"[i]}`, responseTimeWeeks: 8 } as Partial<Agent>)),
});

describe("order — Your tasks ignores it, closed rows sink, and ties keep their input order", () => {
  const inp = threeAgents(
    [QueryStatus.QUERIED, QueryStatus.QUERIED, QueryStatus.QUERIED],
    ["2026-08-01T09:00:00Z", "2026-07-01T09:00:00Z", "2026-08-10T09:00:00Z"],
  );

  it("pins Your tasks above every sort", () => {
    for (const sort of SORT_ORDER) {
      expect(timelineRows(dataFor(inp), TODAY, 7, view({ sort }))[0].key).toBe(YOU_ROW);
    }
  });

  it("longest waiting puts the oldest send first", () => {
    const rows = timelineRows(dataFor(inp), TODAY, 7, view({ sort: "waiting" }));
    expect(rows.slice(1).map((r) => r.agentId)).toEqual(["a1", "a0", "a2"]);
  });

  it("by name, A to Z, by the display name and not the id", () => {
    const rows = timelineRows(dataFor(inp), TODAY, 7, view({ sort: "name" }));
    expect(rows.slice(1).map((r) => r.name)).toEqual(["Agent A", "Agent B", "Agent C"]);
  });

  it("by journey stage, furthest along first, from the canonical order", () => {
    const staged = threeAgents(
      [QueryStatus.QUERIED, QueryStatus.FULL_SENT, QueryStatus.PARTIAL_SENT],
      ["2026-08-20T09:00:00Z", "2026-08-20T09:00:00Z", "2026-08-20T09:00:00Z"],
    );
    const rows = timelineRows(dataFor(staged), TODAY, 7, view({ sort: "stage" }));
    expect(rows.slice(1).map((r) => r.agentId)).toEqual(["a1", "a2", "a0"]);
  });

  it("⚠️ ties keep the order they arrived in — stated, never left to the engine", () => {
    const tied = threeAgents(
      [QueryStatus.QUERIED, QueryStatus.QUERIED, QueryStatus.QUERIED],
      ["2026-08-20T09:00:00Z", "2026-08-20T09:00:00Z", "2026-08-20T09:00:00Z"],
    );
    for (const sort of ["soonest", "waiting", "stage"] as const) {
      const rows = timelineRows(dataFor(tied), TODAY, 7, view({ sort }));
      expect(rows.slice(1).map((r) => r.agentId)).toEqual(["a0", "a1", "a2"]);
    }
  });

  it("⚠️ a closed row sinks below every live one, whatever the sort says", () => {
    const mixed = input({
      queries: [
        q({ id: "q0", agentId: "a0", status: QueryStatus.REJECTED, dateSent: "2026-01-01T09:00:00Z" }),
        q({ id: "q1", agentId: "a1", status: QueryStatus.QUERIED, dateSent: "2026-08-20T09:00:00Z" }),
      ],
      agents: [agent({ id: "a0", name: "A. Aardvark", responseTimeWeeks: 8 } as Partial<Agent>),
               agent({ id: "a1", name: "Z. Zebra", responseTimeWeeks: 8 } as Partial<Agent>)],
      activities: [act({ id: "r0", queryId: "q0" })],
    });
    for (const sort of SORT_ORDER) {
      const rows = timelineRows(dataFor(mixed), TODAY, 7, view({ show: "all", sort }));
      expect(rows.slice(1).map((r) => r.agentId)).toEqual(["a1", "a0"]);
    }
  });

  it("names all three show modes and all four sorts", () => {
    expect(SHOW_ORDER).toEqual(["active", "all", "needs"]);
    expect(SORT_ORDER).toEqual(["soonest", "waiting", "name", "stage"]);
  });
});

/* ══ lanes ═══════════════════════════════════════════════════════════════════════════════════ */

describe("lanes — the ref gives every chip in a row one top, and two of them would overlap", () => {
  it("puts a chip that falls inside a band on a lane of its own", () => {
    const inp = input({
      queries: [q({ id: "q1", agentId: "a1", status: QueryStatus.QUERIED, dateSent: `${TODAY}T09:00:00Z` })],
      agents: [agent({ responseTimeWeeks: 1 } as Partial<Agent>)],
      activities: [act({ id: "r1", queryId: "q1", date: "2026-08-28T09:00:00Z" })],
    });
    const { rows, bands } = timelineWeek(dataFor(inp), TODAY, 7);
    const row = rows.find((r) => r.agentId === "a1")!;
    expect(row.lanes).toBe(2);
    expect(bands[0].lane).toBe(0);
    expect(row.items[0].lane).toBe(1);
  });

  it("shares one lane between things that do not overlap", () => {
    const inp = input({
      queries: [q({ id: "q1", agentId: "a1" })],
      agents: [agent({})],
      activities: [
        act({ id: "r1", queryId: "q1", date: `${TODAY}T09:00:00Z` }),
        act({ id: "r2", queryId: "q1", date: "2026-08-30T09:00:00Z", activityType: ActivityType.NUDGE_SENT }),
      ],
    });
    const row = timelineRows(dataFor(inp), TODAY, 7).find((r) => r.agentId === "a1")!;
    expect(row.lanes).toBe(1);
    expect(row.items.map((i) => i.lane)).toEqual([0, 0]);
  });

  it("⚠️ a chip runs to the column before the next occupant of its lane, not to the row's end", () => {
    const inp = input({
      queries: [q({ id: "q1", agentId: "a1" })],
      agents: [agent({})],
      activities: [
        act({ id: "r1", queryId: "q1", date: `${TODAY}T09:00:00Z` }),
        act({ id: "r2", queryId: "q1", date: "2026-08-30T09:00:00Z", activityType: ActivityType.NUDGE_SENT }),
      ],
    });
    const row = timelineRows(dataFor(inp), TODAY, 7).find((r) => r.agentId === "a1")!;
    expect(row.items.map((i) => [i.idx, i.spanTo])).toEqual([[0, 3], [4, 6]]);
  });

  it("gives a lone chip the rest of the window to spread into", () => {
    const inp = input({
      queries: [q({ id: "q1", agentId: "a1" })], agents: [agent({})],
      activities: [act({ id: "r1", queryId: "q1", date: "2026-08-27T09:00:00Z" })],
    });
    const row = timelineRows(dataFor(inp), TODAY, 7).find((r) => r.agentId === "a1")!;
    expect([row.items[0].idx, row.items[0].spanTo]).toEqual([1, 6]);
  });
});

/* ══ the data layer, still holding ═══════════════════════════════════════════════════════════ */

describe("⚠️ the derivations underneath are untouched, and the rows prove it", () => {
  it("the dedupe still holds — one activity is one chip, not a record AND a done card", () => {
    const closing = act({
      id: "r1", queryId: "q1", activityType: ActivityType.STATUS_CHANGED,
      resultingStatus: QueryStatus.REJECTED, date: `${TODAY}T09:00:00Z`,
    });
    const inp = input({
      queries: [q({ id: "q1", agentId: "a1", status: QueryStatus.REJECTED })],
      agents: [agent({})], activities: [closing],
    });
    /* the same activity reaches BOTH layers: a done card off CLEARING_ACTIVITY_TYPES, and a
       record entry off the whitelist. Undeduped that is two chips for one fact. */
    const raw = calendarDays(inp, [...WIN]).get(TODAY)!.items;
    expect(raw.filter((i) => i.family === "done")).toHaveLength(1);
    expect(recordDays(inp.activities, inp.queries, inp.agents, WIN).get(TODAY)).toHaveLength(1);
    const row = timelineRows(dataFor(inp), TODAY, 7, view({ show: "all" })).find((r) => r.agentId === "a1")!;
    expect(row.items).toHaveLength(1);
    expect(row.items[0].kind).toBe("rec");
  });

  it("labels come from `pillLabel` and are not re-summarised here", () => {
    const row = timelineRows(dataFor(TURN), TODAY, 7).find((r) => r.agentId === "a1")!;
    const raw = dataFor(TURN).itemsFor(TODAY)[0];
    expect(row.items[0].label).toBe(pillLabel(raw));
    expect(row.items[0].label).toBe("Send full");
  });

  it("a writer's own task is draggable and a fact is not — `draggableTask`, unchanged", () => {
    const inp = input({
      queries: TURN.queries, agents: TURN.agents,
      cols: {
        todo: [], snoozed: [], dismissed: [], done: [],
        today: [
          ...TURN.cols.today,
          card({ key: "u1", userTaskId: "t1", nature: "task", dueYmd: TODAY, title: "Book the room" }),
        ],
      },
    } as Partial<CalendarInput>);
    const rows = timelineRows(dataFor(inp), TODAY, 7);
    expect(rows[0].items.map((i) => i.draggable)).toEqual([true]);
    expect(rows.find((r) => r.agentId === "a1")!.items.map((i) => i.draggable)).toEqual([false]);
  });

  it("carries a rolled-forward item onto today and leaves a ghost on its origin", () => {
    const inp = input({
      cols: {
        todo: [], snoozed: [], dismissed: [], done: [],
        today: [card({ key: "u1", userTaskId: "t1", nature: "task", dueYmd: "2026-08-20", title: "Follow up" })],
      },
    } as Partial<CalendarInput>);
    /* a window that contains both the origin and today */
    const win = windowDays("2026-08-20", 10);
    const rows = timelineRows(dataFor(inp, win), "2026-08-20", 10);
    const kinds = rows[0].items.map((i) => [i.kind, i.idx, i.rolledFrom]);
    expect(kinds).toContainEqual(["ghost", 0, "2026-08-20"]);
    expect(kinds).toContainEqual(["task", 6, "2026-08-20"]);
  });

  it("timelineRows and timelineBands are two views of one pass, never two derivations", () => {
    const d = dataFor(banded(`${TODAY}T09:00:00Z`, 0.5));
    const once = timelineWeek(d, TODAY, 7);
    expect(timelineRows(d, TODAY, 7)).toEqual(once.rows);
    expect(timelineBands(d, TODAY, 7)).toEqual(once.bands);
  });
});
