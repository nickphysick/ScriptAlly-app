/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE DUE DATE'S LAWS — list round, Phase 1.
 *
 * ⚠️ EVERY INPUT COMES FROM THE THING THAT REALLY PRODUCES IT, wherever that thing is pure. The cards
 * are built by `assembleBoard` — the board's own assembly — from engine-shaped tasks; the check-in
 * after a nudge is whatever `buildNudgeWrites` writes onto the query; the hold is the instant
 * `snoozeTaskFlag` writes; and the question "would the engine raise a nudge or a close here at all"
 * is answered by `replyTaskFor`, the same function the engine calls. A test that hands `taskDue` a
 * card no board can produce is testing a function nobody runs.
 */
import { describe, it, expect, afterEach } from "vitest";
import { taskDue, dueOwner, ymdOf, daysBetweenYmd, overdueDays, type DueSource, type DueOwner } from "./taskDue";
import { dueFor, type TaskData } from "./taskCardFacts";
import { assembleBoard, type BoardCard } from "./todoBoard";
import { TASK_TYPES, type TaskType } from "./todoActions";
import { buildNudgeWrites } from "./logNudge";
import { flagKeyForTask, taskFlagId, MUTED_UNTIL, localYmdOf } from "./taskFlags";
import { replyTaskFor } from "./taskPrecedence";
import { CATEGORIES } from "./todoCategory";
import { QueryStatus, type Agent, type Manuscript, type Query, type Task, type TaskFlag, type UserTask } from "../types";

/* a fixed clock, read on the LOCAL day like every other reader of dates in this app */
const NOW = new Date(2026, 8, 11, 10, 0, 0).getTime();          // 11 Sep 2026, 10:00 local
const TODAY = localYmdOf(NOW);
const DAY = 86400000;

const ms1: Manuscript = { id: "m1", title: "The Glass Orchard" } as Manuscript;
const agent = (id: string, over: Partial<Agent> = {}): Agent =>
  ({ id, name: `Agent ${id}`, agency: `Agency ${id}`, responseTimeWeeks: 6, ...over }) as Agent;
const query = (id: string, agentId: string, over: Partial<Query>): Query =>
  ({ id, userId: "u", manuscriptId: "m1", agentId, packageId: "", personalisationNotes: "", ...over }) as Query;
const task = (id: string, taskType: TaskType, relatedRecordId: string, reason?: Task["reason"]): Task => ({
  id, priority: "urgent", title: id, description: "", manuscriptTitle: "The Glass Orchard", context: "",
  relatedRecordId, taskType, actionLabel: "", actionPath: "", ...(reason ? { reason } : {}),
});

/** the board's own assembly — every card below is one a writer could actually see */
function board(tasks: Task[], queries: Query[], agents: Agent[], extra: { userTasks?: UserTask[]; flags?: TaskFlag[] } = {}) {
  const b = assembleBoard({
    tasks, queries, agents, manuscripts: [ms1], userTasks: extra.userTasks ?? [], taskFlags: extra.flags ?? [],
    activities: [], today: TODAY, now: NOW,
  });
  const cards = [...b.do, ...b.hk, ...b.nt];
  const db: TaskData = { queries, agents, manuscripts: [ms1], userTasks: extra.userTasks ?? [], activities: [] };
  return {
    cards,
    card: (key: string): BoardCard => {
      const c = cards.find((x) => x.key === key);
      if (!c) throw new Error(`the board produced no card "${key}" — the fixture is not one the app can show`);
      return c;
    },
    due: (key: string, flags: TaskFlag[] = extra.flags ?? []) => dueFor(cards.find((x) => x.key === key)!, db, flags),
  };
}

/** the flag exactly as `snoozeTaskFlag` writes it: the key's id and an ISO instant `days` from now */
const holdFlag = (taskType: string, relatedRecordId: string, days: number): TaskFlag => {
  const key = flagKeyForTask(taskType, relatedRecordId);
  return {
    id: taskFlagId(key), userId: "u", taskType, snoozeCount: 1,
    ...(key.queryId ? { queryId: key.queryId } : {}), ...(key.agentId ? { agentId: key.agentId } : {}),
    snoozedUntil: new Date(NOW + days * DAY).toISOString(),
  };
};

/* ── the table over the journey union ─────────────────────────────────────────────────────────── */

/**
 * ⚠️ ONE ROW PER TASK TYPE, AND THE TABLE IS A `Record<TaskType, …>` — a type added to `TASK_TYPES`
 * fails to compile here until somebody states where its due date comes from. `with` is the source
 * when the record holds the date; `without` is what the SAME card says when it does not. A type
 * whose `with` is `null` never has a natural date, and says so.
 */
const TABLE: Record<TaskType, { onBoard: boolean; with: DueSource | null; owner: DueOwner; ownerUndated: DueOwner }> = {
  offer_received:            { onBoard: true,  with: "arrived", owner: "owed",   ownerUndated: "owed" },
  partial_requested:         { onBoard: true,  with: "ask",     owner: "owed",   ownerUndated: "owed" },
  full_requested:            { onBoard: true,  with: "ask",     owner: "owed",   ownerUndated: "owed" },
  revise_resubmit:           { onBoard: true,  with: "ask",     owner: "owed",   ownerUndated: "owed" },
  nudge_overdue:             { onBoard: true,  with: "window",  owner: "theirs", ownerUndated: "none" },
  no_response_close:         { onBoard: true,  with: "window",  owner: "theirs", ownerUndated: "none" },
  data_quality_poor:         { onBoard: true,  with: null,      owner: "none",   ownerUndated: "none" },
  materials_unrecorded:      { onBoard: true,  with: null,      owner: "none",   ownerUndated: "none" },
  materials_unrecorded_bulk: { onBoard: true,  with: null,      owner: "none",   ownerUndated: "none" },
  querying_unstarted:        { onBoard: false, with: null,      owner: "none",   ownerUndated: "none" },
  dream_agent_unqueried:     { onBoard: false, with: null,      owner: "none",   ownerUndated: "none" },
  weekly_review:             { onBoard: false, with: null,      owner: "none",   ownerUndated: "none" },
};

/** for each type: a query that HOLDS its natural date, and one that does not */
function recordsFor(t: TaskType): { dated: Partial<Query>; undated: Partial<Query> } {
  switch (t) {
    case "offer_received": return { dated: { status: QueryStatus.OFFER, lastStatusChange: "2026-08-20T09:00:00Z" }, undated: { status: QueryStatus.OFFER } };
    case "partial_requested": return { dated: { status: QueryStatus.PARTIAL_REQUESTED, partialRequestedDate: "2026-04-02T10:00:00Z" }, undated: { status: QueryStatus.PARTIAL_REQUESTED } };
    case "full_requested": return { dated: { status: QueryStatus.FULL_REQUESTED, fullRequestedDate: "2026-06-28T10:00:00Z" }, undated: { status: QueryStatus.FULL_REQUESTED } };
    case "revise_resubmit": return { dated: { status: QueryStatus.REVISE_RESUBMIT, lastStatusChange: "2026-07-10T10:00:00Z" }, undated: { status: QueryStatus.REVISE_RESUBMIT } };
    case "nudge_overdue":
    case "no_response_close":
      /* the window belongs to the AGENT; the undated half is a query with no send date */
      return { dated: { status: QueryStatus.QUERIED, dateSent: "2026-06-17T10:00:00Z" }, undated: { status: QueryStatus.QUERIED } };
    default:
      return { dated: { status: QueryStatus.QUERIED, dateSent: "2026-06-17T10:00:00Z" }, undated: { status: QueryStatus.QUERIED } };
  }
}

describe("every task type derives a due date or a deliberate null", () => {
  it("the table covers the whole union — nothing is left to a default", () => {
    expect(Object.keys(TABLE).sort()).toEqual([...TASK_TYPES].sort());
  });

  for (const t of TASK_TYPES) {
    it(`${t}: ${TABLE[t].with ?? "no natural date"} when the record holds it · null when it does not`, () => {
      const row = TABLE[t];
      const { dated, undated } = recordsFor(t);
      const agentRecord = ["data_quality_poor", "dream_agent_unqueried"].includes(t);
      const rid = (id: string) => (agentRecord ? `ag-${id}` : `q-${id}`);
      const agents = [agent("ag-d"), agent("ag-u")];
      const queries = [query("q-d", "ag-d", dated), query("q-u", "ag-u", undated)];
      const tasks = [task("t-d", t, rid("d")), task("t-u", t, rid("u"))];
      const b = board(tasks, queries, agents);

      if (!row.onBoard) {
        /* ⚠️ THE BOARD NEVER PRODUCES THESE — so the only honest claim is about the card the
           derivation would be handed if it ever did: no date, nobody's clock. */
        expect(b.cards.some((c) => c.taskType === t), `${t} unexpectedly reached the board`).toBe(false);
        const handBuilt = { key: "h", stream: "hk", title: "", who: "", subtitle: "", due: "", warn: false,
          snoozes: 0, hk: true, initials: "", record: "", committed: false, done: false, taskType: t } as BoardCard;
        expect(taskDue({ card: handBuilt })).toEqual({ ymd: null, owner: "none", source: "none" });
        return;
      }

      const d = b.due("t-d");
      const u = b.due("t-u");
      if (row.with) {
        expect(d.source).toBe(row.with);
        expect(d.ymd).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(d.owner).toBe(row.owner);
      } else {
        expect(d).toEqual({ ymd: null, owner: "none", source: "none" });
      }
      expect(u.ymd, `${t}: an undated record must not borrow a date`).toBeNull();
      expect(u.source).toBe("none");
      expect(u.owner).toBe(row.ownerUndated);
    });
  }

  it("the natural dates are the days the records name — the ask, the arrival, the window", () => {
    const agents = [agent("a1"), agent("a2"), agent("a3", { responseTimeWeeks: 6 })];
    const queries = [
      query("qp", "a1", { status: QueryStatus.PARTIAL_REQUESTED, partialRequestedDate: "2026-04-02T10:00:00Z" }),
      query("qo", "a2", { status: QueryStatus.OFFER, lastStatusChange: "2026-08-20T09:00:00Z" }),
      /* sent 17 June to an agency with a six-week window — it closed on 29 July */
      query("qn", "a3", { status: QueryStatus.QUERIED, dateSent: "2026-06-17T10:00:00Z" }),
    ];
    const b = board([task("tp", "partial_requested", "qp"), task("to", "offer_received", "qo"),
      task("tn", "nudge_overdue", "qn", "nudge-first")], queries, agents);
    expect(b.due("tp")).toEqual({ ymd: "2026-04-02", owner: "owed", source: "ask" });
    expect(b.due("to")).toEqual({ ymd: "2026-08-20", owner: "owed", source: "arrived" });
    expect(b.due("tn")).toEqual({ ymd: "2026-07-29", owner: "theirs", source: "window" });
  });

  /**
   * ⚠️ TWO DERIVATIONS AGAINST EACH OTHER, NEVER AGAINST A LIST TYPED HERE. Whenever the engine's own
   * `replyTaskFor` would raise a nudge or a close, the due date must exist — because both read the
   * one deadline. A nudge row with no due date would be the list failing to say when a clock it is
   * acting on started.
   */
  it("whenever the engine would raise a nudge or a close, the due date exists", () => {
    const sends = ["2024-04-09", "2025-11-01", "2026-02-14", "2026-06-17", "2026-07-20"];
    const windows = [2, 6, 12];
    let raised = 0;
    for (const s of sends) for (const w of windows) for (const nrmn of [false, true]) for (const nudged of [false, true]) {
      const id = `q-${s}-${w}-${nrmn}-${nudged}`;
      const ag = agent(`a-${id}`, { responseTimeWeeks: w, noResponseMeansNo: nrmn });
      const base = query(id, ag.id, { status: QueryStatus.QUERIED, dateSent: `${s}T10:00:00Z` });
      const q = nudged
        ? { ...base, ...buildNudgeWrites(base, ag, { checkBackDate: "2026-09-01" }, new Date(Date.parse(`${s}T10:00:00Z`) + 50 * DAY)).queryUpdates }
        : base;
      const decision = replyTaskFor(q, ag, NOW);
      if (decision === "none") continue;
      raised += 1;
      const t = decision === "close"
        ? task(`t-${id}`, "no_response_close", id, "no-reply")
        : task(`t-${id}`, "nudge_overdue", id, q.lastNudgeSentDate ? "nudge-again" : "nudge-first");
      const f = board([t], [q], [ag]).due(`t-${id}`);
      expect(f.ymd, `${id} → ${decision} with no due date`).not.toBeNull();
      expect(f.owner).toBe("theirs");
    }
    /* ⚠️ THE POPULATION, ASSERTED — a sweep in which the engine raised nothing proves nothing */
    expect(raised).toBeGreaterThan(20);
  });
});

/* ── the writer's own dates win ───────────────────────────────────────────────────────────────── */

describe("the date they set wins", () => {
  it("a 'hold me to it' date overrides the ask date", () => {
    const q = query("qp", "a1", { status: QueryStatus.PARTIAL_REQUESTED, partialRequestedDate: "2026-04-02T10:00:00Z" });
    const b = board([task("tp", "partial_requested", "qp")], [q], [agent("a1")]);
    expect(b.due("tp").source, "precondition: without a hold it is the ask").toBe("ask");

    /* returned three days ago (back on the list) and still ahead (asleep in the Snoozed group) */
    for (const days of [-3, 5]) {
      const f = b.due("tp", [holdFlag("partial_requested", "qp", days)]);
      expect(f).toEqual({ ymd: localYmdOf(NOW + days * DAY), owner: "owed", source: "hold" });
    }
  });

  it("a hold on a nudge overrides the window, and stays the agent's clock", () => {
    const q = query("qn", "a3", { status: QueryStatus.QUERIED, dateSent: "2026-06-17T10:00:00Z" });
    const b = board([task("tn", "nudge_overdue", "qn", "nudge-first")], [q], [agent("a3")]);
    const f = b.due("tn", [holdFlag("nudge_overdue", "qn", -7)]);
    expect(f).toEqual({ ymd: localYmdOf(NOW - 7 * DAY), owner: "theirs", source: "hold" });
  });

  it("a mute is not a date, and a dismissal is the later word", () => {
    const q = query("qp", "a1", { status: QueryStatus.PARTIAL_REQUESTED, partialRequestedDate: "2026-04-02T10:00:00Z" });
    const b = board([task("tp", "partial_requested", "qp")], [q], [agent("a1")]);
    const muted = { ...holdFlag("partial_requested", "qp", 1), snoozedUntil: MUTED_UNTIL };
    const dismissed = { ...holdFlag("partial_requested", "qp", 4), skippedAt: new Date(NOW).toISOString() };
    expect(b.due("tp", [muted]).source).toBe("ask");
    expect(b.due("tp", [dismissed]).source).toBe("ask");
  });

  it("the reminder the writer set on a request beats the ask; an offer has none to set", () => {
    const qp = query("qp", "a1", { status: QueryStatus.PARTIAL_REQUESTED, partialRequestedDate: "2026-04-02T10:00:00Z",
      sendReminderDate: "2026-09-20T09:00:00Z" });
    const qo = query("qo", "a2", { status: QueryStatus.OFFER, lastStatusChange: "2026-08-20T09:00:00Z",
      sendReminderDate: "2026-09-20T09:00:00Z" });
    const b = board([task("tp", "partial_requested", "qp"), task("to", "offer_received", "qo")], [qp, qo], [agent("a1"), agent("a2")]);
    expect(b.due("tp")).toEqual({ ymd: "2026-09-20", owner: "owed", source: "reminder" });
    expect(b.due("to").source).toBe("arrived");
  });

  it("the check-in after a nudge is its due date — exactly the day `buildNudgeWrites` booked", () => {
    const ag = agent("a3");
    const sent = query("qn", "a3", { status: QueryStatus.QUERIED, dateSent: "2026-06-17T10:00:00Z" });
    const writes = buildNudgeWrites(sent, ag, { checkBackDate: "2026-09-09" }, new Date(2026, 7, 12, 11));
    const q = { ...sent, ...writes.queryUpdates };
    const b = board([task("tn", "nudge_overdue", "qn", "nudge-again")], [q], [ag]);
    expect(b.due("tn")).toEqual({ ymd: ymdOf(writes.queryUpdates.nudgeDate), owner: "theirs", source: "check-in" });

    /* "Don't ask again" books no check-in — so the window stands in, never a made-up day */
    const quiet = { ...sent, ...buildNudgeWrites(sent, ag, {}, new Date(2026, 7, 12, 11)).queryUpdates };
    const b2 = board([task("tn2", "nudge_overdue", "qn", "nudge-again")], [quiet], [ag]);
    expect(b2.due("tn2").source).toBe("window");
  });

  it("a dated note's date is its due date; an undated one has none", () => {
    const tasks: UserTask[] = [
      { id: "ut1", userId: "u", text: "Update comp titles list", done: false, createdAt: "2026-09-01T09:00:00Z", updatedAt: "2026-09-01T09:00:00Z", dueDate: "2026-09-14" },
      { id: "ut2", userId: "u", text: "Nudge Marcus Reed", done: false, createdAt: "2026-09-08T09:00:00Z", updatedAt: "2026-09-08T09:00:00Z" },
    ];
    const b = board([], [], [], { userTasks: tasks });
    expect(b.due("ut1")).toEqual({ ymd: "2026-09-14", owner: "owed", source: "note" });
    expect(b.due("ut2")).toEqual({ ymd: null, owner: "none", source: "none" });
  });
});

/* ── owner is kind, never magnitude ───────────────────────────────────────────────────────────── */

describe("owner follows the task's kind", () => {
  it("a request is owed with or without a date; everything else needs a date to be anybody's", () => {
    const expected: Record<string, [DueOwner, DueOwner]> = {
      req: ["owed", "owed"], nudge: ["theirs", "none"], quiet: ["theirs", "none"],
      house: ["owed", "none"], yours: ["owed", "none"],
    };
    for (const cat of CATEGORIES) {
      expect([dueOwner(cat, "2026-09-01"), dueOwner(cat, null)], cat).toEqual(expected[cat]);
    }
  });

  it("the same distance from today gives the same owner it would at any other distance", () => {
    for (const ymd of ["2024-05-21", "2026-09-10", "2026-09-11", "2026-12-25"]) {
      expect(dueOwner("req", ymd)).toBe("owed");
      expect(dueOwner("quiet", ymd)).toBe("theirs");
    }
  });
});

/* ── the day arithmetic ───────────────────────────────────────────────────────────────────────── */

describe("real days, on the local calendar", () => {
  const TZ = process.env.TZ;
  afterEach(() => { process.env.TZ = TZ; });

  it("a YYYY-MM-DD names its own day — never UTC midnight, which is the day before in the Americas", () => {
    process.env.TZ = "America/New_York";
    /* precondition: in this zone the naive parse genuinely lands on the 13th */
    expect(localYmdOf(Date.parse("2026-09-14")), "precondition: the TZ change took").toBe("2026-09-13");
    expect(ymdOf("2026-09-14")).toBe("2026-09-14");
  });

  it("counts whole calendar days straight through a clock change", () => {
    expect(daysBetweenYmd("2026-03-28", "2026-03-30")).toBe(2);   // UK clocks go forward on the 29th
    expect(daysBetweenYmd("2026-10-24", "2026-10-26")).toBe(2);   // and back on the 25th
    expect(daysBetweenYmd("2025-12-31", "2026-01-01")).toBe(1);
  });

  it("overdue is positive, today is zero, ahead is negative", () => {
    expect(overdueDays(localYmdOf(NOW - DAY), TODAY)).toBe(1);
    expect(overdueDays(TODAY, TODAY)).toBe(0);
    expect(overdueDays(localYmdOf(NOW + 4 * DAY), TODAY)).toBe(-4);
  });

  it("reads a Firestore Timestamp, an instant, a day and nothing", () => {
    expect(ymdOf({ toDate: () => new Date(2026, 8, 20, 9) })).toBe("2026-09-20");
    expect(ymdOf(new Date(2026, 8, 20, 23, 59).getTime())).toBe("2026-09-20");
    expect(ymdOf("2026-09-20")).toBe("2026-09-20");
    for (const v of [undefined, null, "", "not a date", {}]) expect(ymdOf(v)).toBeNull();
  });
});
