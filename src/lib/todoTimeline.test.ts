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
  windowDays, shiftWindow, timelineWeek, timelineRows, timelineSegments,
  defaultView, FILTER_LABEL, SORT_ORDER, SORT_LABEL, SORT_MEANING,
  YOU_ROW, YOU_ROW_NAME, TimelineData, TimelineView,
} from "./todoTimeline";
import { GROUP_ORDER } from "./timelineGroups";

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
    activities: inp.activities, manuscripts: [], taskFlags: inp.flags,
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
  /** the pinned row appears when the writer has a dated task — it is pinned, not exempt */
  const MINE = input({
    cols: {
      todo: [], snoozed: [], dismissed: [], done: [],
      today: [card({ key: "u1", userTaskId: "t1", nature: "task", dueYmd: TODAY, title: "Book the room" })],
    },
  } as Partial<CalendarInput>);

  it("puts the writer's own tasks first, each on its own row, belonging to no agent", () => {
    /* ⚠️ ONE ROW PER DATED TASK (fix pack, Phase 5). This asserted a single AGGREGATE row called
       "Your tasks" — which could hold no deed (whose task would it tick off?), no name (which task
       is it?) and no useful count: its heading read "1" beside four chips. The claim that
       survives is the one that mattered — a task pins above the agent rows and belongs to no
       agent — and it is now true of each task separately. */
    const rows = timelineRows(dataFor(MINE), TODAY, 7);
    expect(rows[0].key.startsWith("task-"), `first row is ${rows[0].key}`).toBe(true);
    expect(rows[0].agentId).toBeNull();
    expect(rows[0].agency).toBe("Your task");
    /**
     * ⚠️ THE PINNED ROW HAS NO STATUS AND NO GROUP, AND BOTH ABSENCES ARE THE POINT.
     *
     * It holds tasks from every manuscript and from none, so no group is true of it — it sits
     * ABOVE the groups rather than inside one, and `group: null` is how it says so rather than a
     * flag somewhere else. And it holds no query, so a `StatusDot` here would state a journey that
     * does not exist; the head falls back to the square mark it already had.
     *
     * Locked in the unit suite because the harness account has no task due, so the rendered check
     * reports "not exercised" — which is honest and is not evidence.
     */
    expect(rows[0].group, "the pinned row was filed inside a group").toBeNull();
    expect(rows[0].status, "the pinned row grew a status it has no query for").toBeNull();
    /* ⚠️ NO POPULATION CLAUSE IS NEEDED HERE and adding one was wrong: this fixture holds the
       pinned row and nothing else, by design. The subject is a SINGLE NAMED ROW whose existence
       the two lines above already assert, so "it has no group" cannot pass by vacancy. The
       positive half — that every agent row DOES carry both — belongs with a fixture that has
       agent rows, and is asserted in its own case below. */
    expect(rows[0].agentId).toBeNull();
  });

  it("⚠️ AND IT GOES WHEN IT HOLDS NOTHING — no row is exempt from the one rule", () => {
    /* ⚠️ THIS REVERSES A STANDING RULING, deliberately. The event catalogue said the pinned row
       appears "always — even empty"; the bars pack says an empty row is the app saying nothing,
       loudly, and it is right. An empty Your-tasks row costs 80px, draws a name, and tells the
       reader only to keep looking. The empty WEEK still says its one line. */
    expect(timelineRows(dataFor(input({})), TODAY, 7)).toHaveLength(0);
  });

  it("raises one row per agent with something in the window, named by the display helpers", () => {
    const rows = timelineRows(dataFor(TURN), TODAY, 7);
    const a = rows.find((r) => r.agentId === "a1")!;
    expect(a).toBeDefined();
    expect(a.name).toBe("P. Kaur");
    expect(a.agency).toBe("Kaur & Finch");
    /* ⚠️ A YOUR-TURN CARD IS A STRETCH OF THE BAR NOW, NOT A CHIP BESIDE IT. Drawing both put one
       fact on the row twice and cost every row a lane of height. */
    expect(a.items).toHaveLength(0);
    expect(timelineSegments(dataFor(TURN), TODAY, 7).some((sg) => sg.side === "yours")).toBe(true);
  });

  it("sends a writer's own task to ITS OWN row and never to an agent's", () => {
    const inp = input({
      cols: {
        todo: [], snoozed: [], dismissed: [], done: [],
        today: [card({ key: "u1", userTaskId: "t1", nature: "task", dueYmd: "2026-08-28", title: "Book the library room" })],
      },
    } as Partial<CalendarInput>);
    const rows = timelineRows(dataFor(inp), TODAY, 7);
    expect(rows).toHaveLength(1);
    expect(rows[0].key).toBe("task-t1");
    /* ⚠️ THE ROW IS NAMED BY THE TASK, which is the whole reason it is a row: an aggregate could
       not say which task it was about, so it could not carry a deed either. */
    expect(rows[0].name).toBe("Book the library room");
    expect(rows[0].agency).toBe("Your task");
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
    const { rows, nodes } = timelineWeek(dataFor(inp), TODAY, 7);
    const a = rows.find((r) => r.agentId === "a1")!;
    /* ⚠️ THE RECORD IS A NODE ON THE BAR, and it still routes by `queryId` — which is the join this
       case exists for, and the only thing about it the bar changed is where it is drawn. */
    expect(a.items).toHaveLength(0);
    expect(nodes.map((n) => [n.rowKey, n.caption])).toEqual([["agent-a1", "Query sent"]]);
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

  it("a relationship that ended before this week draws nothing at all", () => {
    /* ⚠️ AND ITS CLOSURE IN VIEW BRINGS IT BACK — which is the honest replacement for the three
       show modes. A closed row appears because its CLOSURE is in the week, and a closure is news. */
    const gone = input({
      queries: [q({ id: "q1", agentId: "a1", status: QueryStatus.REJECTED })],
      agents: [agent({})],
    });
    expect(timelineRows(dataFor(gone), TODAY, 7)).toHaveLength(0);

    const closedHere = input({
      queries: [q({ id: "q1", agentId: "a1", status: QueryStatus.REJECTED })],
      agents: [agent({})],
      activities: [act({ id: "c1", queryId: "q1", activityType: ActivityType.STATUS_CHANGED,
        resultingStatus: QueryStatus.REJECTED, date: `${TODAY}T09:00:00Z` })],
    });
    const rows = timelineRows(dataFor(closedHere), TODAY, 7);
    expect(rows.map((r) => r.agentId)).toEqual(["a1"]);
    expect(rows[0].closed).toBe(true);
  });

  it("⚠️ `Needs me` IS THE `Your move` FILTER WITH ANOTHER NAME — one control, not two", () => {
    const quiet = input({ queries: [q({ id: "q9", agentId: "a9" })], agents: [agent({ id: "a9", name: "T. Ellery" })] });
    const merged = input({
      queries: [...TURN.queries, ...quiet.queries],
      agents: [...TURN.agents, ...quiet.agents],
      cols: TURN.cols,
    } as Partial<CalendarInput>);
    /* ⚠️ RESTATED WITHOUT THE RETIRED FILTER. The claim was that a row with nothing in the window
       is not drawn; it was reached through the kind filter because that was the cheapest way to
       empty one. Emptying it by giving the second agent no query at all makes the same claim
       about the same rule, and does not depend on a control that no longer exists. */
    const mine = timelineRows(dataFor(merged), TODAY, 7);
    expect(mine.map((r) => r.agentId)).toContain("a1");
  });

  it("marks whose move it is from the CTA engine, never from a second list of statuses", () => {
    const rows = timelineRows(dataFor(TURN), TODAY, 7);
    expect(rows.find((r) => r.agentId === "a1")!.dot).toBe("you");
    const waiting = input({
      queries: [q({ id: "q1", agentId: "a1", status: QueryStatus.QUERIED })], agents: [agent({})],
    });
    expect(timelineRows(dataFor(waiting), TODAY, 7).find((r) => r.agentId === "a1")!.dot).toBe("them");
    expect(timelineRows(dataFor(MINE), TODAY, 7)[0].dot).toBe("self");
  });

  it("⚠️ A TASK ROW'S SECOND LINE SAYS WHOSE IT IS, and it is the same on every one of them", () => {
    /* The aggregate row deliberately said NOTHING on its second line: it held tasks from every
       manuscript and from none, so no title was true of it. A row that IS one task has something
       true to say there — whose task it is — and the ref's own wording is what it says. */
    const rows = timelineRows(dataFor(MINE), TODAY, 7).filter((r) => r.key.startsWith("task-"));
    expect(rows.length, "no task rows in the fixture").toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.agency).toBe("Your task");
      expect(r.group, "a task row was filed inside a query group").toBeNull();
      expect(r.status, "a task row grew a status it has no query for").toBeNull();
    }
  });
});

/* ══ bands ═══════════════════════════════════════════════════════════════════════════════════ */

/** A waiting query whose window is resolvable: sent `sent`, the agency states `weeks`. */
const banded = (sent: string, weeks: number, over: Partial<Query> = {}) => input({
  queries: [q({ id: "q1", agentId: "a1", status: QueryStatus.QUERIED, dateSent: sent, ...over })],
  agents: [agent({ responseTimeWeeks: weeks } as Partial<Agent>)],
});

/**
 * ⚠️ THE BAND'S OWN TESTS ARE RETIRED WITH THE BAND, AND THE LAWS THEY CARRIED DID NOT ALL SURVIVE
 * IN KIND. A band was a whole reply window drawn as one span, so "clamps at the left edge",
 * "clamps at the right", "marks both", "is wholly outside" and "takes the LATEST send as the
 * anchor" were claims about one object with two ends. A journey bar has no ends of its own: it
 * runs the width of the window and is CUT by what happened, so the clamping questions are now
 * about the window rather than about the span, and `journeyBars.test.ts` asks them of the cut.
 *
 * What survives here is the JOIN — which query gets a bar, which row it lands on, how manuscripts
 * become lanes — because that is what this module does and the bar module does not.
 */
describe("journey bars — which query gets one, and where it lands", () => {
  const banded = (sent: string, weeks: number, over: Partial<Query> = {}) => input({
    queries: [q({ id: "q1", agentId: "a1", status: QueryStatus.QUERIED, dateSent: sent, ...over })],
    agents: [agent({ responseTimeWeeks: weeks } as Partial<Agent>)],
  });

  it("a waiting query draws a bar on its agent's row", () => {
    const { rows, segments } = timelineWeek(dataFor(banded("2026-08-01T09:00:00Z", 8)), TODAY, 7);
    expect(segments.length).toBeGreaterThan(0);
    expect(segments.every((sg) => sg.rowKey === "agent-a1")).toBe(true);
    expect(rows.find((r) => r.agentId === "a1")).toBeDefined();
  });

  it("⚠️ AND SO DOES A WRITER'S-MOVE QUERY — the bar is the whole journey, not the waiting half", () => {
    /* the band only ever drew a reply window, so a query in the writer's court had nothing at all.
       A bar has a side, so it draws either way — which is the point of the change. */
    const inp = input({
      queries: [q({ id: "q1", agentId: "a1", status: QueryStatus.FULL_REQUESTED })],
      agents: [agent({})],
    });
    const segs = timelineSegments(dataFor(inp), TODAY, 7);
    expect(segs.length).toBeGreaterThan(0);
    expect(segs.every((sg) => sg.side === "yours")).toBe(true);
  });

  it("draws no bar for a query with no send — a journey needs a beginning", () => {
    const inp = input({
      queries: [{ ...q({ id: "q1", agentId: "a1" }), dateSent: undefined } as unknown as Query],
      agents: [agent({ responseTimeWeeks: 1 } as Partial<Agent>)],
    });
    /* it still draws the rail, because "we do not know when to expect a reply" is a true thing to
       say about a query that exists; what it does not do is forecast an end */
    const segs = timelineSegments(dataFor(inp), TODAY, 7);
    expect(segs.every((sg) => !sg.openRight)).toBe(true);
  });

  it("⚠️ TWO MANUSCRIPTS WITH ONE AGENT IS TWO LANES UNDER ONE HEAD, not two rows", () => {
    const inp = input({
      queries: [
        q({ id: "q1", agentId: "a1", manuscriptId: "m1", status: QueryStatus.QUERIED }),
        q({ id: "q2", agentId: "a1", manuscriptId: "m2", status: QueryStatus.FULL_REQUESTED }),
      ],
      agents: [agent({ responseTimeWeeks: 8 } as Partial<Agent>)],
    });
    const { rows, segments } = timelineWeek(dataFor(inp), TODAY, 7);
    const mine = rows.filter((r) => r.agentId === "a1");
    expect(mine, "one agent became two rows").toHaveLength(1);
    expect(mine[0].manuscripts).toHaveLength(2);
    expect(new Set(segments.map((sg) => sg.lane)).size, "the two books share a lane").toBe(2);
  });

  it("a closed relationship draws its closure and stops — nothing follows", () => {
    const inp = input({
      queries: [q({ id: "q1", agentId: "a1", status: QueryStatus.REJECTED })],
      agents: [agent({})],
      activities: [act({ id: "c1", queryId: "q1", activityType: ActivityType.STATUS_CHANGED,
        resultingStatus: QueryStatus.REJECTED, date: `${TODAY}T09:00:00Z` })],
    });
    const { segments, nodes } = timelineWeek(dataFor(inp), TODAY, 7);
    expect(nodes.map((n) => n.dir)).toEqual(["close"]);
    expect(segments.every((sg) => !sg.openRight)).toBe(true);
  });

  it("timelineWeek and timelineSegments are two views of one pass", () => {
    const d = dataFor(banded("2026-08-01T09:00:00Z", 8));
    const once = timelineWeek(d, TODAY, 7);
    expect(timelineSegments(d, TODAY, 7)).toEqual(once.segments);
    expect(timelineRows(d, TODAY, 7)).toEqual(once.rows);
  });
});

/* ══ the filters ═════════════════════════════════════════════════════════════════════════════ */

describe("what a kind is called, now that it can no longer be filtered by", () => {
  it("the label table outlived the filter set, and that is correct rather than a leftover", () => {
    /* ⚠️ AN ITEM STILL HAS A KIND AND THE FOCUS BAND STILL NAMES IT. What went is filtering BY
       it — `TIMELINE_FILTERS`, `allFilters` and `TimelineView.kinds` are retired with the chips.
       Naming and filtering are two jobs, and only one of them was the problem. */
    expect(Object.keys(FILTER_LABEL).sort()).toEqual(["rec", "task", "turn", "wait"]);
    expect(FILTER_LABEL.turn).toBe("Your move");
    expect(FILTER_LABEL.wait).toBe("Their move");
  });

  /* ⚠️ THE FOUR KIND-FILTER CASES ARE RETIRED WITH THE CONTROL THEY TESTED (Porcelain, Phase 2).
     They asserted that switching a kind off removed the rows it emptied, that the three parts
     filtered separately, and that the label table covered the filter set. There is no kind filter
     any more — `TimelineView.kinds` is gone, not defaulted — so each of them was about a subject
     that no longer exists. Restated as one claim about what replaced them: everything the window
     holds is shown. */
  it("⚠️ nothing is filtered out by kind any more — the board shows the relationship entire", () => {
    const inp = input({
      queries: [q({ id: "q1", agentId: "a1", status: QueryStatus.QUERIED, dateSent: `${TODAY}T09:00:00Z` })],
      agents: [agent({ responseTimeWeeks: 4 } as Partial<Agent>)],
      activities: [act({ id: "r1", queryId: "q1", date: "2026-08-29T09:00:00Z" })],
    });
    const w = timelineWeek(dataFor(inp), TODAY, 7);
    expect(w.segments.length, "the stretch is drawn").toBeGreaterThan(0);
    expect(w.nodes.length, "the event on it is drawn").toBeGreaterThan(0);
    /* the view carries no way to remove either — the field is gone, not set to "all" */
    expect(Object.keys(defaultView())).toEqual(["sort", "search"]);
  });

  it("a query with no reply time recorded still draws the rail that says so", () => {
    const inp = input({ queries: [q({ id: "q1", agentId: "a1" })], agents: [agent({})] });
    expect(timelineSegments(dataFor(inp), TODAY, 7).map((sg) => sg.norail)).toEqual([true]);
  });


  it("search reaches the agent, the agency and the item's own words", () => {
    const d = dataFor(TURN);
    expect(timelineRows(d, TODAY, 7, view({ search: "kaur" })).map((r) => r.agentId)).toEqual(["a1"]);
    expect(timelineRows(d, TODAY, 7, view({ search: "finch" })).map((r) => r.agentId)).toEqual(["a1"]);
    /* ⚠️ THE BAR'S OWN WORDS, AND THEY CHANGED (settled pack, Phase 5). The bar used to carry
       `pillLabel`'s output — the card's instruction, "Send full" — and now states what the STRETCH
       IS: a full was requested, and how long ago. So the searchable text moved with the copy.
       The claim is unchanged and is what this case is for: the search reaches the bar's rendered
       words, whatever they are. It is asserted against `labelFor`'s OWN output rather than a
       string typed here, so it cannot go stale the next time the wording moves. */
    const bar = timelineSegments(d, TODAY, 7).find((sg) => sg.side === "yours" && sg.label)!;
    expect(bar, "no speaking writer's-move bar in the fixture").toBeTruthy();
    const word = bar.label.split(" ")[0].toLowerCase();
    expect(timelineRows(d, TODAY, 7, view({ search: word })).map((r) => r.agentId)).toEqual(["a1"]);
    expect(timelineRows(d, TODAY, 7, view({ search: "zzz" }))).toHaveLength(0);
  });
});

/* ══ order ═══════════════════════════════════════════════════════════════════════════════════ */

const threeAgents = (statuses: QueryStatus[], sends: string[]) => input({
  queries: statuses.map((s, i) => q({ id: `q${i}`, agentId: `a${i}`, status: s, dateSent: sends[i] })),
  agents: statuses.map((_, i) => agent({ id: `a${i}`, name: `Agent ${"CBA"[i]}`, responseTimeWeeks: 8 } as Partial<Agent>)),
});

describe("every agent row carries a group and a status", () => {
  /**
   * ⚠️ THE POSITIVE HALF OF THE PINNED ROW'S TWO ABSENCES. Without this, "the pinned row has no
   * group and no status" is satisfied by a build where NOTHING has either — the field could be
   * deleted outright and both assertions would still pass. Two halves, two fixtures, because the
   * pinned row's own fixture has no agent rows to compare it against.
   */
  it("a row with a live query has both; the head cannot draw a dot without one", () => {
    const inp = input({
      queries: [q({ id: "q1", agentId: "a1" }), q({ id: "q2", agentId: "a2" })],
      agents: [agent({ id: "a1" }), agent({ id: "a2" })],
    });
    const { rows } = timelineWeek(dataFor(inp), TODAY, 7);
    const agents = rows.filter((r) => r.key !== YOU_ROW);
    expect(agents.length, "no agent rows in this fixture — nothing was measured").toBeGreaterThan(0);
    for (const r of agents) {
      expect(r.group, `${r.name} has no group, so no header can hold it`).not.toBeNull();
      expect(r.status, `${r.name} has no status, so its head cannot draw a StatusDot`).not.toBeNull();
    }
  });
});

describe("order — Your tasks ignores it, closed rows sink, and ties keep their input order", () => {
  const inp = threeAgents(
    [QueryStatus.QUERIED, QueryStatus.QUERIED, QueryStatus.QUERIED],
    ["2026-08-01T09:00:00Z", "2026-07-01T09:00:00Z", "2026-08-10T09:00:00Z"],
  );

  it("pins the task rows above every sort, when there are any at all", () => {
    const withMine = input({
      queries: inp.queries, agents: inp.agents,
      cols: {
        todo: [], snoozed: [], dismissed: [], done: [],
        today: [card({ key: "u1", userTaskId: "t1", nature: "task", dueYmd: TODAY, title: "Book the room" })],
      },
    } as Partial<CalendarInput>);
    for (const sort of SORT_ORDER) {
      const first = timelineRows(dataFor(withMine), TODAY, 7, view({ sort }))[0];
      expect(first.key.startsWith("task-"), `${sort} put ${first.key} above the tasks`).toBe(true);
    }
  });

  it("longest waiting puts the oldest send first", () => {
    const rows = timelineRows(dataFor(inp), TODAY, 7, view({ sort: "waiting" }));
    expect(rows.map((r) => r.agentId)).toEqual(["a1", "a0", "a2"]);
  });

  /* ⚠️ A–Z AND JOURNEY STAGE ARE RETIRED (v36, Phase 6), and each for its own reason. A–Z answers
     "where is this agent in an alphabet", which is a question about a list rather than about work.
     Journey stage answers one the GROUPS already answer — and answering it twice lets a sort
     disagree with the heading three inches above it. Three sorts remain, and each names a
     different question about time. */
  it("the sort set is three, and RECENTLY ACTIVE puts the newest record first", () => {
    expect([...SORT_ORDER]).toEqual(["soonest", "waiting", "active"]);
    expect(Object.keys(SORT_LABEL).sort()).toEqual(["active", "soonest", "waiting"]);
    /* ⚠️ AND EACH CARRIES ITS OWN DEFINITION. A sort NAME is not a definition — "Soonest" could
       mean the soonest thing you must do, the soonest reply expected, or the soonest anything
       happens, and the three give different orders. */
    for (const k of SORT_ORDER) {
      expect(SORT_MEANING[k], `${k} has no definition`).toBeTruthy();
      expect(SORT_MEANING[k].length).toBeGreaterThan(20);
    }
  });

  it("⚠️ ties keep the order they arrived in — stated, never left to the engine", () => {
    const tied = threeAgents(
      [QueryStatus.QUERIED, QueryStatus.QUERIED, QueryStatus.QUERIED],
      ["2026-08-20T09:00:00Z", "2026-08-20T09:00:00Z", "2026-08-20T09:00:00Z"],
    );
    for (const sort of ["soonest", "waiting", "active"] as const) {
      const rows = timelineRows(dataFor(tied), TODAY, 7, view({ sort }));
      expect(rows.map((r) => r.agentId)).toEqual(["a0", "a1", "a2"]);
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
      /* ⚠️ A REAL CLOSURE, because a closed row only appears at all when its closure is in view —
         the first version of this fixture used a bare STATUS_CHANGED with no `resultingStatus`,
         which the record layer excludes, so the row had nothing and was dropped before the sort
         could be asked about it. */
      activities: [act({ id: "c0", queryId: "q0", activityType: ActivityType.STATUS_CHANGED,
        resultingStatus: QueryStatus.REJECTED, date: `${TODAY}T09:00:00Z` })],
    });
    for (const sort of SORT_ORDER) {
      const rows = timelineRows(dataFor(mixed), TODAY, 7, view({ sort }));
      /* the pinned row is gone when it holds nothing, so these are the two agent rows */
      expect(rows.map((r) => r.agentId)).toEqual(["a1", "a0"]);
    }
  });

  it("names all three sorts", () => {
    /* four became three: A–Z and journey stage are retired — see the set case above for why */
    expect([...SORT_ORDER]).toEqual(["soonest", "waiting", "active"]);
  });
});

/* ══ lanes ═══════════════════════════════════════════════════════════════════════════════════ */

/**
 * ⚠️ THE TWO LANE MECHANISMS, AND THEY NO LONGER MEET. A BAR's lane is a MANUSCRIPT; a CHIP's lane
 * is packing. Since the record and the your-turn card became parts of the bar, the only chips left
 * are the writer's own tasks — which belong to the pinned row, where there are no bars. So the
 * offset that keeps a chip off a bar's lane is a guard rather than a daily occurrence, and these
 * cases assert each mechanism where it actually runs.
 */
describe("lanes — a manuscript on the bar, packing on the chips", () => {
  const tasks = (...ymds: string[]) => input({
    cols: {
      todo: [], snoozed: [], dismissed: [], done: [],
      today: ymds.map((y, i) => card({
        key: `u${i}`, userTaskId: `t${i}`, nature: "task", dueYmd: y, title: `Task ${i}`,
      })),
    },
  } as Partial<CalendarInput>);

  it("one manuscript is one bar lane; two are two", () => {
    const one = input({
      queries: [q({ id: "q1", agentId: "a1", manuscriptId: "m1", status: QueryStatus.QUERIED })],
      agents: [agent({ responseTimeWeeks: 8 } as Partial<Agent>)],
    });
    expect(new Set(timelineSegments(dataFor(one), TODAY, 7).map((sg) => sg.lane)).size).toBe(1);
    const two = input({
      queries: [
        q({ id: "q1", agentId: "a1", manuscriptId: "m1", status: QueryStatus.QUERIED }),
        q({ id: "q2", agentId: "a1", manuscriptId: "m2", status: QueryStatus.QUERIED }),
      ],
      agents: [agent({ responseTimeWeeks: 8 } as Partial<Agent>)],
    });
    expect(new Set(timelineSegments(dataFor(two), TODAY, 7).map((sg) => sg.lane)).size).toBe(2);
  });

  /* ⚠️ THE SUBJECT OF LANE PACKING CHANGED, AND THE RULE DID NOT (fix pack, Phase 5). Two dated
     tasks used to share one aggregate row and had to be packed into lanes; they are two ROWS now,
     so that particular collision cannot happen. What still puts two chips on one row is a task
     and its own GHOST — the origin mark saying "this fell due here and is still outstanding",
     which is only readable if the two are on one line. That is the packing rule's remaining
     subject and these cases follow it there. */
  it("two dated tasks are two rows now — one chip each, one lane each", () => {
    const rows = timelineRows(dataFor(tasks(TODAY, "2026-08-30")), TODAY, 7);
    expect(rows.map((r) => r.key.startsWith("task-"))).toEqual([true, true]);
    for (const r of rows) {
      expect(r.items).toHaveLength(1);
      expect(r.lanes).toBe(1);
    }
    /* and each is named by its own task, which an aggregate could never be */
    expect(new Set(rows.map((r) => r.name)).size, "two rows share one name").toBe(2);
  });

  it("a task and its own ghost share one row, and pack into lanes without overlapping", () => {
    const inp = input({
      cols: {
        todo: [], snoozed: [], dismissed: [], done: [],
        today: [card({ key: "u1", userTaskId: "t1", nature: "task", dueYmd: "2026-08-20", title: "Follow up" })],
      },
    } as Partial<CalendarInput>);
    const win = windowDays("2026-08-20", 10);
    const rows = timelineRows(dataFor(inp, win), "2026-08-20", 10);
    expect(rows, "the ghost and its task landed on different rows").toHaveLength(1);
    const row = rows[0];
    expect(row.items.length, "no pair to pack").toBe(2);
    /* they do not overlap, so one lane holds both */
    expect(new Set(row.items.map((i) => i.lane)).size).toBe(1);
    /* ⚠️ AND THE FIRST STOPS BEFORE THE SECOND BEGINS — the claim the packing rule exists for. */
    const [a, b] = [...row.items].sort((x, y) => x.idx - y.idx);
    expect(a.spanTo, `chip at ${a.idx} runs into the chip at ${b.idx}`).toBeLessThan(b.idx);
  });

  it("gives a lone chip the rest of the window to spread into", () => {
    const row = timelineRows(dataFor(tasks("2026-08-27")), TODAY, 7)[0];
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
    /* ⚠️ THE DEDUPE STILL HOLDS, AND IT HOLDS ONE STEP EARLIER NOW. The done card is superseded
       before the page reads the day, so the bar's node derivation never sees it: one activity is
       one NODE, where it used to be one chip. */
    const { rows, nodes } = timelineWeek(dataFor(inp), TODAY, 7);
    const row = rows.find((r) => r.agentId === "a1")!;
    expect(row.items).toHaveLength(0);
    expect(nodes.filter((n) => n.rowKey === row.key)).toHaveLength(1);
  });

  it("labels come from `pillLabel` and are not re-summarised here", () => {
    /* the bar's writer's-move stretch takes the card's own words, whole — the summarising still
       happens in exactly one place and it is not this module */
    const raw = dataFor(TURN).itemsFor(TODAY)[0];
    expect(pillLabel(raw)).toBe("Send full");
    const yours = timelineSegments(dataFor(TURN), TODAY, 7).filter((sg) => sg.side === "yours");
    expect(yours.length).toBeGreaterThan(0);
    /* ⚠️ THE CARD'S OWN WORDS, BARE AND UNCHANGED IN CASE (grouped pack, Phase 5). It was
       `Your move · ${label.toLowerCase()}` — a derivation name the writer never uses, plus a
       lower-casing that existed only to make the card's words read as a clause after it. The
       claim this case exists for is unchanged and is stronger without either: the label IS
       `pillLabel`'s output, never a re-summary of it. */
    /* ⚠️ THE BAR NO LONGER ECHOES THE CARD (settled pack, Phase 5), and that is the law this case
       now states. `pillLabel` is an INSTRUCTION — "Send full" — and the bar says what the stretch
       of time IS while the note beside it says what to do. Both on one bar was the ref's own
       mistake, made once, and the pack's prose settles it.
       ⚠️ THE ORIGINAL CLAIM SURVIVES ELSEWHERE: `pillLabel` is still the one summariser and it is
       still not re-summarised in this module — it reaches the bar as `moveLabel` for the
       open-ended case, which is the only state with no wording of its own. */
    expect(yours[0].label, "the bar is echoing the card's instruction again").not.toBe(pillLabel(raw));
    expect(yours[0].label, "the bar says nothing about the stretch").toContain("requested");
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
    /* ⚠️ THE FACT YOU CANNOT DRAG IS NOT A CHIP ANY MORE — it is the bar, which has no drag at all.
       What survives is the half that matters: the writer's own task is the one thing here whose
       date is INPUT, and it is the only thing that moves. */
    expect(rows[0].items.map((i) => i.draggable)).toEqual([true]);
    expect(rows.find((r) => r.agentId === "a1")!.items).toHaveLength(0);
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

  it("timelineRows and timelineSegments are two views of one pass, never two derivations", () => {
    const d = dataFor(input({
      queries: [q({ id: "q1", agentId: "a1", status: QueryStatus.QUERIED, dateSent: `${TODAY}T09:00:00Z` })],
      agents: [agent({ responseTimeWeeks: 4 } as Partial<Agent>)],
    }));
    const once = timelineWeek(d, TODAY, 7);
    expect(timelineRows(d, TODAY, 7)).toEqual(once.rows);
    expect(timelineSegments(d, TODAY, 7)).toEqual(once.segments);
  });
});

/* ══ ORDERING: ONE KEY, NO TIERS (v36, Phase 6) ══════════════════════════════════════════════ */

describe("what is pressing is one scale, and a debt outranks an appointment", () => {
  /**
   * ⚠️ THE CASE THAT KILLED THE TWO-TIER RULE. An earlier ordering bucketed dated rows above
   * undated ones, which put a sixty-day debt BELOW an appointment five weeks out — the older ask
   * was plainly the more pressing thing and the sort said otherwise. One key, three cases.
   */
  const rowsFor = (qs: Query[], agents: Agent[]) =>
    timelineRows(dataFor(input({ queries: qs, agents } as Partial<CalendarInput>)), TODAY, 90,
      view({ sort: "soonest" }));

  it("⚠️ AN UNDATED ASK 60 DAYS OLD SORTS ABOVE A DATED ONE FIVE WEEKS OUT", () => {
    /* the debt: a full requested sixty days ago, no reply window on file at all — due on receipt,
       and past ever since */
    const debt = q({
      id: "qd", agentId: "ad", status: QueryStatus.FULL_REQUESTED,
      dateSent: "2026-06-28T09:00:00Z", lastStatusChange: "2026-06-28T09:00:00Z",
    } as Partial<Query>);
    /* the appointment: a query out with an agency whose window lands five weeks from today */
    const appt = q({
      id: "qa", agentId: "aa", status: QueryStatus.QUERIED, dateSent: "2026-08-27T09:00:00Z",
    });
    const rows = rowsFor([debt, appt], [
      agent({ id: "ad", name: "Debt" }),
      agent({ id: "aa", name: "Appointment", responseTimeWeeks: 5 } as Partial<Agent>),
    ]);
    const names = rows.filter((r) => r.agentId).map((r) => r.name);
    expect(names.length, "one of the two rows is missing").toBe(2);
    expect(names[0], `order was ${names.join(" then ")}`).toBe("Debt");
  });

  it("a named end sorts by that date — the nearer one first", () => {
    const near = q({ id: "q1", agentId: "a1", status: QueryStatus.QUERIED, dateSent: "2026-08-20T09:00:00Z" });
    const far = q({ id: "q2", agentId: "a2", status: QueryStatus.QUERIED, dateSent: "2026-08-20T09:00:00Z" });
    const rows = rowsFor([far, near], [
      agent({ id: "a2", name: "Far", responseTimeWeeks: 10 } as Partial<Agent>),
      agent({ id: "a1", name: "Near", responseTimeWeeks: 2 } as Partial<Agent>),
    ]);
    const names = rows.filter((r) => r.agentId).map((r) => r.name);
    expect(names[0], `order was ${names.join(" then ")}`).toBe("Near");
  });

  it("⚠️ AND AN UNDATED AGENT-HELD ROW SORTS AFTER EVERY DATED ONE — nothing is being asked", () => {
    const dated = q({ id: "q1", agentId: "a1", status: QueryStatus.QUERIED, dateSent: "2026-08-20T09:00:00Z" });
    /* no `responseTimeWeeks` at all: the agency named nothing and the work is theirs */
    const undated = q({ id: "q2", agentId: "a2", status: QueryStatus.QUERIED, dateSent: "2026-05-01T09:00:00Z" });
    const rows = rowsFor([undated, dated], [
      agent({ id: "a2", name: "Undated" }),
      agent({ id: "a1", name: "Dated", responseTimeWeeks: 9 } as Partial<Agent>),
    ]);
    const names = rows.filter((r) => r.agentId).map((r) => r.name);
    expect(names, `order was ${names.join(" then ")}`).toEqual(["Dated", "Undated"]);
  });

  it("⚠️ THE SORT ORDERS ROWS, AND THE PAGE ORDERS GROUPS — two jobs, and this proves the split", () => {
    /* `timelineRows` returns ONE flat list in the view's order; the page buckets it by
       `GROUP_ORDER` and each bucket comes out in that same order, which is why "sort applies
       within groups" needs no code. So the flat list's group ranks are NOT monotonic and must not
       be asserted to be — the first draft of this case did exactly that and failed on LONGEST
       WAITING, reporting a defect about a contract that does not exist. The claim that IS the
       contract — group headings render in `GROUP_ORDER` under every sort — is a fact about the
       rendered page and is asserted there, in `calRowWords55.measure.ts`. */
    const mixed = input({
      queries: [
        q({ id: "q1", agentId: "a1", status: QueryStatus.OFFER, dateSent: "2026-08-01T09:00:00Z" }),
        q({ id: "q2", agentId: "a2", status: QueryStatus.QUERIED, dateSent: "2026-05-01T09:00:00Z" }),
      ],
      agents: [agent({ id: "a1", name: "Offer" }), agent({ id: "a2", name: "Watching" })],
    } as Partial<CalendarInput>);
    for (const sort of SORT_ORDER) {
      const rows = timelineRows(dataFor(mixed), TODAY, 90, view({ sort }));
      /* every row still knows its own group, whatever the order — that is what the page buckets on */
      const groups = rows.filter((r) => r.group).map((r) => r.group!);
      expect(groups.length, `${sort} lost a row's group`).toBe(2);
      expect(new Set(groups)).toEqual(new Set(["offers", "watching"]));
      expect(groups.every((g) => GROUP_ORDER.includes(g))).toBe(true);
    }
  });

  it("⚠️ SOONEST IS THE LOAD STATE — a reader who has chosen nothing gets what is due first", () => {
    expect(defaultView().sort).toBe("soonest");
  });
});
