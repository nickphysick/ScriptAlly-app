/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * `todoCalendar` — the data layer, after the month grid was replaced by the week timeline
 * (calendar timeline pack, Phase 3).
 *
 * ⚠️ WHAT THIS FILE COVERS IS EXACTLY WHAT SURVIVED, and the retirements are stated at the foot
 * rather than deleted in silence. Every lock here asserts a DERIVATION — placement, roll-forward,
 * the record's whitelist, direction, the exchange sequence, the dedupe, the pill grammar, the
 * ghosts, the gap and the drag rule. Not one of them was about a day cell, which is why not one of
 * them had to change when the cells went.
 *
 * ⚠️ THE LAYOUT LOCKS ARE NOT REPLACED IN KIND. Roughly forty assertions in the retired half read
 * this page's SOURCE and its stylesheet to prove things about a rendered month — cell borders,
 * fold caps, sticky offsets, panel collapse. A source lock proves a rule was written, never that
 * it reached an element, so the timeline's layout claims are measured on a rendered page
 * (`tests/e2e/calRowWords55.measure.ts`) instead. That is the standing rule in CLAUDE.md and this is the
 * pack that had to act on it wholesale.
 */
import { describe, it, expect } from "vitest";
import { Query, Agent, UserTask, TaskFlag, Activity, ActivityType, QueryStatus } from "../types";
import { BoardCard } from "./todoBoard";
import type { CalendarItem, RecordItem } from "./todoCalendar";
import {
  calendarDays, cardActionYmd, CalendarInput,
  recordDays, recordSpecFor, RECORD_TYPES, RECORD_STATUS, BY_STATUS, exchangeLine,
  REC_TONE, REC_LEGEND, dedupeAgainstRecord,
  PILL_BY_TASK, PILL_SNOOZED, pillLabel, ghostsFor, daysSince, carriedLine, shortCalDate,
  draggableTask, EXPECTED_PILL, expectedLine, toYmd,
} from "./todoCalendar";
import { windowDays } from "./todoTimeline";
import { HOLDING_REPLY_TYPE } from "./holdingReply";
import { TASK_TYPES } from "./todoActions";
import { boardStreamForTaskType } from "./todoBoard";

const NOW = Date.parse("2026-08-07T12:00:00Z");
const TODAY = "2026-08-07";

const card = (over: Partial<BoardCard>): BoardCard => ({
  key: "k", stream: "do", title: "t", who: "", subtitle: "", due: "", warn: false, snoozes: 0,
  hk: false, initials: "•", record: "", committed: false, done: false, ...over,
});
const q = (over: Partial<Query>): Query => ({
  id: "q1", userId: "u", manuscriptId: "m1", agentId: "a1", packageId: "",
  status: QueryStatus.FULL_REQUESTED, dateSent: "2026-07-01T09:00:00Z",
  personalisationNotes: "", sendMethod: "Email", ...over,
} as Query);

const EMPTY = {
  cols: { todo: [], today: [], snoozed: [], dismissed: [], done: [] },
  flags: [] as TaskFlag[], queries: [] as Query[], agents: [] as Agent[],
  userTasks: [] as UserTask[], activities: [] as Activity[], today: TODAY, nowMs: NOW,
};
/**
 * ⚠️ A PLAIN LIST OF VISIBLE DAYS, NOT A MONTH GRID. `calendarDays`, `recordDays` and the placement
 * rules never cared what SHAPED the list — that was the month view's business, and it is retired.
 * A generous window keeps every fixture's dates in view.
 */
const AUG = windowDays("2026-07-27", 42);

/* ── the record's fixtures ─────────────────────────────────────────────────────────────────── */
const AGENT = { id: "a1", name: "Marcus Reed", agency: "Reed Literary" } as unknown as Agent;
const act = (over: Partial<Activity>): Activity => ({
  id: "act1", userId: "u", queryId: "q1", manuscriptId: "m1",
  activityType: ActivityType.STATUS_CHANGED, description: "", date: "2026-08-12T09:00:00Z",
  details: "", ...over,
} as Activity);
/** The one query every record fixture hangs off, so a row always has something to route to. */
const RQ = [q({ id: "q1", agentId: "a1" })];
const rec = (activities: Activity[], range: readonly string[] = AUG) =>
  recordDays(activities, RQ, [AGENT], range);

describe("⚠️ every item appears on its ACTION date", () => {
  it("a user task lands on its due date; an undated user card is not a calendar citizen", () => {
    expect(cardActionYmd(card({ userTaskId: "t1", nature: "task", dueYmd: "2026-08-12" }), [])).toBe("2026-08-12");
    expect(cardActionYmd(card({ userTaskId: "t1", nature: "task" }), [])).toBeNull();
  });

  it("an agent task lands on the day it LANDED — lastStatusChange, falling back to dateSent", () => {
    const withStamp = q({ lastStatusChange: "2026-08-10T09:00:00Z" } as Partial<Query>);
    expect(cardActionYmd(card({ taskType: "full_requested", relatedRecordId: "q1" }), [withStamp])).toBe("2026-08-10");
    expect(cardActionYmd(card({ taskType: "full_requested", relatedRecordId: "q1" }), [q({})])).toBe("2026-07-01");
  });

  it("⚠️ housekeeping has NO action date — a standing pile is not an appointment", () => {
    expect(cardActionYmd(card({ stream: "hk", taskType: "no_response_close", relatedRecordId: "q1" }), [q({})])).toBeNull();
    expect(cardActionYmd(card({ stream: "hk", hk: true, taskType: "data_quality_poor" }), [])).toBeNull();
  });

  it("a snoozed item lands on its return date", () => {
    const flag: TaskFlag = { id: "f1", userId: "u", taskType: "full_requested", queryId: "q1", snoozeCount: 1, snoozedUntil: "2026-08-08T09:00:00Z" };
    const snoozedCard = card({ key: "snz-f1", stream: "hk", hk: true, kind: "SNOOZED", title: "Send your full to Marcus Reed" });
    const days = calendarDays({ ...EMPTY, flags: [flag], queries: [q({})], cols: { ...EMPTY.cols, snoozed: [snoozedCard] } }, AUG);
    expect(days.get("2026-08-08")!.items.map((i) => i.family)).toEqual(["snoozed"]);
    expect(days.get("2026-08-08")!.items[0].label).toBe("Send your full to Marcus Reed");
  });
});

/* ── roll-forward — derived from the clock, never written ──────────────────────────────────── */

describe("⚠️ roll-forward: undone work moves to today; the origin keeps ONE marker", () => {
  const overdue = card({ key: "late", userTaskId: "t1", nature: "task", dueYmd: "2026-08-04", title: "Chase the reference" });
  const overdue2 = card({ key: "late2", userTaskId: "t2", nature: "task", dueYmd: "2026-08-04", title: "Second one" });
  const days = calendarDays({ ...EMPTY, cols: { ...EMPTY.cols, todo: [overdue, overdue2] } }, AUG);

  it("the items render on TODAY", () => {
    expect(days.get(TODAY)!.items.map((i) => i.label)).toEqual(["Chase the reference", "Second one"]);
  });

  it("the day they left holds the marker count — not the items", () => {
    expect(days.get("2026-08-04")!.rolled).toBe(2);
    expect(days.get("2026-08-04")!.items).toHaveLength(0);
  });

  it("⚠️ completed items NEVER roll — they stay on the day they were finished, struck", () => {
    const done = calendarDays({
      ...EMPTY,
      userTasks: [{ id: "t9", userId: "u", text: "Old win", done: true, completedAt: "2026-08-03T16:44:00", createdAt: "", updatedAt: "" } as UserTask],
    }, AUG);
    expect(done.get("2026-08-03")!.items[0]).toMatchObject({ family: "done", struck: true, label: "Old win" });
    expect(done.get(TODAY)?.items ?? []).toHaveLength(0);
    expect(done.get("2026-08-03")!.rolled).toBe(0);
  });
});

/* ── completed from the log ────────────────────────────────────────────────────────────────── */

describe("completed items derive from the activity log — the Done column's own union", () => {
  it("a clearing activity lands struck on its day, in the log's vocabulary", () => {
    const act = {
      id: "a1", userId: "u", queryId: "q1", activityType: ActivityType.STATUS_CHANGED,
      date: "2026-08-05T10:00:00Z", description: "x", resultingStatus: QueryStatus.NO_RESPONSE,
    } as Activity;
    const ag = { id: "a1", name: "Marcus Reed", agency: "Reed Literary" } as unknown as Agent;
    const days = calendarDays({ ...EMPTY, activities: [act], queries: [q({})], agents: [ag] }, AUG);
    const item = days.get("2026-08-05")!.items[0];
    expect(item.family).toBe("done");
    expect(item.struck).toBe(true);
    expect(item.card).toBeUndefined(); // finished work opens no sheet
  });
});

/* ── the fold + the shared map + the page wiring ───────────────────────────────────────────── */
describe("⚠️ the record's whitelist is stated once, and exclusion is the safe default", () => {
  it("the conversation is on the record — sends, requests, replies, nudges, offers, closures", () => {
    const cases: Array<[Partial<Activity>, string, "out" | "in"]> = [
      [{ activityType: ActivityType.QUERY_SENT }, "Query sent", "out"],
      [{ activityType: ActivityType.NUDGE_SENT }, "Nudge sent", "out"],
      [{ activityType: HOLDING_REPLY_TYPE as unknown as ActivityType }, "Holding reply", "in"],
      [{ resultingStatus: QueryStatus.PARTIAL_REQUESTED }, "Partial requested", "in"],
      [{ resultingStatus: QueryStatus.FULL_REQUESTED }, "Full requested", "in"],
      [{ resultingStatus: QueryStatus.REVISE_RESUBMIT }, "Revise & resubmit", "in"],
      [{ resultingStatus: QueryStatus.OFFER }, "Offer received", "in"],
      [{ activityType: ActivityType.MATERIALS_SENT, resultingStatus: QueryStatus.PARTIAL_SENT }, "Partial sent", "out"],
      [{ activityType: ActivityType.MATERIALS_SENT, resultingStatus: QueryStatus.FULL_SENT }, "Full sent", "out"],
    ];
    for (const [over, label, dir] of cases) {
      const got = rec([act(over)]).get("2026-08-12") ?? [];
      expect(got.map((r) => r.label), `${JSON.stringify(over)}`).toEqual([label]);
      expect(got[0].dir, label).toBe(dir);
    }
  });

  it("⚠️ reference-data upkeep is NOT the record — it is what the writer did to their files", () => {
    for (const t of [
      ActivityType.AGENT_ADDED, ActivityType.AGENT_UPDATED, ActivityType.AGENT_DELETED,
      ActivityType.MANUSCRIPT_ADDED, ActivityType.MANUSCRIPT_UPDATED, ActivityType.MANUSCRIPT_DELETED,
    ]) {
      expect(rec([act({ activityType: t })]).size, t).toBe(0);
    }
  });

  it("⚠️ a generic type with no resultingStatus is EXCLUDED, never guessed at", () => {
    // STATUS_CHANGED carries no meaning of its own; a pre-migration row without a status
    // cannot be classified, and a missing row is recoverable where a wrong one is not.
    expect(rec([act({ activityType: ActivityType.STATUS_CHANGED })]).size).toBe(0);
    expect(recordSpecFor(ActivityType.STATUS_CHANGED)).toBeNull();
    // an activityType the tables have never heard of is excluded rather than defaulting in
    expect(recordSpecFor("Something Invented Later")).toBeNull();
  });

  it("⚠️ THE TABLES ARE EXHAUSTIVE — a new member of either enum must be classified, not defaulted", () => {
    // The Record<> types make this a compile error too; asserted at runtime so the guard survives
    // a future `as` cast that would silence tsc.
    for (const t of Object.values(ActivityType)) {
      expect(Object.prototype.hasOwnProperty.call(RECORD_TYPES, t), `RECORD_TYPES is missing ${t}`).toBe(true);
    }
    expect(Object.prototype.hasOwnProperty.call(RECORD_TYPES, HOLDING_REPLY_TYPE)).toBe(true);
    for (const s of Object.values(QueryStatus)) {
      expect(Object.prototype.hasOwnProperty.call(RECORD_STATUS, s), `RECORD_STATUS is missing ${s}`).toBe(true);
    }
  });
});

describe("⚠️ direction is AUTHORSHIP, and deliberately not statusDirection", () => {
  it("an offer reads INCOMING — the agent sent it, whatever the pipeline direction says", () => {
    // statusDirection(OFFER) is "out" (an offer moves the writer's side forward). Here the
    // question is who wrote it, and painting an agent's offer as the writer's is the untruth
    // this layer exists to avoid.
    expect(RECORD_STATUS[QueryStatus.OFFER]).toEqual({ label: "Offer received", dir: "in" });
  });

  it("⚠️ the three closures share one word and split on authorship", () => {
    // statusDirection collapses all three into "closed", which a two-valued dir cannot hold.
    expect(RECORD_STATUS[QueryStatus.REJECTED]).toEqual({ label: "Closed", dir: "in" });
    expect(RECORD_STATUS[QueryStatus.WITHDRAWN]).toEqual({ label: "Closed", dir: "out" });
    expect(RECORD_STATUS[QueryStatus.NO_RESPONSE]).toEqual({ label: "Closed", dir: "out" });
  });

  it("⚠️ an offer DECLINED keeps its own label — it stamps WITHDRAWN and must not read 'Closed'", () => {
    // The most consequential decision in the record, filed under the generic word, is exactly
    // what refining OFFER_DECLINED by its resultingStatus would produce.
    const got = rec([act({ activityType: ActivityType.OFFER_DECLINED, resultingStatus: QueryStatus.WITHDRAWN })]);
    expect(got.get("2026-08-12")?.[0].label).toBe("Offer declined");
    expect(got.get("2026-08-12")?.[0].dir).toBe("out");
  });

  it("⚠️ no verdict words, no adjectives about quality or speed", () => {
    const labels = [...Object.values(RECORD_TYPES), ...Object.values(RECORD_STATUS)]
      .filter((r): r is { label: string; dir: "out" | "in" } => !!r && r !== BY_STATUS)
      .map((r) => r.label);
    expect(labels.length).toBeGreaterThan(0);
    for (const l of labels) {
      expect(l, l).not.toMatch(/quick|slow|fast|good|bad|great|poor|finally|only|already|still/i);
      // "overdue" does not exist in this product
      expect(l.toLowerCase(), l).not.toContain("overdue");
    }
  });
});
describe("⚠️ the exchange line reports and does not judge", () => {
  const r = (over: Partial<{ exchange: number; gapDays: number; turned: boolean; dir: "out" | "in" }>) =>
    exchangeLine({ exchange: 1, turned: false, dir: "out", ...over } as never);

  it("the first exchange states its position and nothing else", () => {
    expect(r({ exchange: 1 })).toBe("Exchange 1");
  });

  it("a reply names who moved — and 'they' for an agent, never a gendered pronoun", () => {
    expect(r({ exchange: 2, gapDays: 1, turned: true, dir: "out" })).toBe("Exchange 2 · you replied in 1 day");
    expect(r({ exchange: 3, gapDays: 12, turned: true, dir: "in" })).toBe("Exchange 3 · they replied in 12 days");
  });

  it("⚠️ two moves in the same direction are NOT a reply — elapsed time only", () => {
    // a second send is not a reply to the first, and saying so would invent an exchange
    expect(r({ exchange: 2, gapDays: 4, turned: false, dir: "out" })).toBe("Exchange 2 · 4 days later");
  });

  it("singulars agree, and no verdict word appears in any form", () => {
    expect(r({ exchange: 2, gapDays: 1, turned: false })).toContain("1 day later");
    expect(r({ exchange: 2, gapDays: 2, turned: false })).toContain("2 days later");
    for (const line of [
      r({ exchange: 1 }),
      r({ exchange: 2, gapDays: 1, turned: true, dir: "out" }),
      r({ exchange: 2, gapDays: 40, turned: true, dir: "in" }),
      r({ exchange: 2, gapDays: 3, turned: false }),
    ]) {
      expect(line).not.toMatch(/quick|slow|fast|prompt|good|bad|only|already|still|finally|overdue/i);
    }
  });
});

describe("⚠️ the exchange count sequences over the QUERY, not over the visible days", () => {
  const seq = (dates: string[], types: Partial<Activity>[]) =>
    dates.map((d, i) => act({ id: `e${i}`, date: d, ...types[i] }));

  it("exchange 3 stays exchange 3 when the reader is looking at a later month", () => {
    // three events: two in July, one in August. The August grid shows only the third — and it is
    // still the third thing that passed between them, not the first.
    const acts = seq(
      ["2026-07-02T09:00:00Z", "2026-07-20T09:00:00Z", "2026-08-12T09:00:00Z"],
      [
        { activityType: ActivityType.QUERY_SENT },
        { resultingStatus: QueryStatus.FULL_REQUESTED },
        { activityType: ActivityType.MATERIALS_SENT, resultingStatus: QueryStatus.FULL_SENT },
      ],
    );
    // a September grid contains none of July, so only the 12 Aug row is placed
    const got = recordDays(acts, RQ, [AGENT], AUG);
    const row = got.get("2026-08-12")![0];
    expect(row.label).toBe("Full sent");
    expect(row.exchange).toBe(3);
    expect(row.gapDays).toBe(23);
    expect(row.turned).toBe(true); // a request came in, materials went out
    expect(exchangeLine(row)).toBe("Exchange 3 · you replied in 23 days");
  });

  it("the first exchange carries no gap, and two sends running do not read as a reply", () => {
    const acts = seq(
      ["2026-08-03T09:00:00Z", "2026-08-06T09:00:00Z"],
      [{ activityType: ActivityType.QUERY_SENT }, { activityType: ActivityType.NUDGE_SENT }],
    );
    const got = recordDays(acts, RQ, [AGENT], AUG);
    expect(got.get("2026-08-03")![0]).toMatchObject({ exchange: 1, turned: false });
    expect(got.get("2026-08-03")![0].gapDays).toBeUndefined();
    expect(got.get("2026-08-06")![0]).toMatchObject({ exchange: 2, gapDays: 3, turned: false });
  });
});
describe("⚠️ one fact, one pip — the record supersedes the done card that restates it", () => {
  const done = (id: string, over: Partial<CalendarItem> = {}): CalendarItem =>
    ({ key: `cal-done-act-${id}`, ymd: "2026-08-12", label: "Query sent to Harriet Vane",
       family: "done", struck: true, activityId: id, ...over });
  const recOf = (id: string): RecordItem =>
    ({ key: `rec-${id}`, ymd: "2026-08-12", label: "Query sent", dir: "out", queryId: "q1",
       activityId: id, agent: "Harriet Vane", agency: "Vane & Co", manuscriptId: "m1",
       note: "", detail: "", exchange: 1, turned: false });

  it("a send's done card is superseded by its record entry", () => {
    const out = dedupeAgainstRecord([done("a1")], [recOf("a1")]);
    expect(out).toEqual([]);
  });

  it("⚠️ A USER TASK IS NEVER DEDUPED — it has no activity, so nothing can supersede it", () => {
    // "Book the library room" carries no activityId at all
    const task: CalendarItem = { key: "cal-done-task-t1", ymd: "2026-08-12",
      label: "Book the library room", family: "done", struck: true };
    expect(dedupeAgainstRecord([task], [recOf("a1")])).toEqual([task]);
  });

  it("⚠️ THE RECORD HIDDEN RESTORES EVERY DONE CARD — a day never loses its only evidence", () => {
    // the caller passes what is ON SCREEN, so a hidden layer passes [] and supersedes nothing.
    // No `if (showRecord)` exists anywhere, which is what stops the two states drifting.
    const items = [done("a1"), done("a2")];
    expect(dedupeAgainstRecord(items, [])).toEqual(items);
  });

  it("⚠️ AN ACTIVITY THE RECORD EXCLUDED KEEPS ITS DONE CARD — the safe direction", () => {
    // an orphan, or a STATUS_CHANGED with no resultingStatus: no record entry exists to supersede
    // it. Matching on TASK TYPE would have hidden these; matching on the id cannot.
    const out = dedupeAgainstRecord([done("a1"), done("a2")], [recOf("a2")]);
    expect(out.map((i) => i.activityId)).toEqual(["a1"]);
  });

  it("an activity with no id is never deduped — the key's fallback would make a parse lossy", () => {
    const noId = done("x", { activityId: undefined, key: "cal-done-act-q1-2026-08-12" });
    expect(dedupeAgainstRecord([noId], [recOf("x")])).toEqual([noId]);
  });

  it("⚠️ ONLY THE done FAMILY IS A CANDIDATE — nothing still waiting is ever hidden", () => {
    const live: CalendarItem = { key: "cal-k", ymd: "2026-08-12", label: "Send your full",
      family: "agent", activityId: "a1" };
    expect(dedupeAgainstRecord([live], [recOf("a1")])).toEqual([live]);
  });

  it("⚠️ THE REAL SHAPE, END TO END: calendarDays + recordDays over ONE activity", () => {
    /* the fault as it shipped — the same Activity drawn twice. Derived from the two producers
       rather than hand-built, so a change to either side fails here. */
    const a = act({ id: "dup1", date: "2026-08-12T09:00:00Z", activityType: ActivityType.QUERY_SENT });
    const live = calendarDays({ ...EMPTY, activities: [a], queries: RQ, agents: [AGENT] }, AUG);
    const recs = recordDays([a], RQ, [AGENT], AUG);
    const before = live.get("2026-08-12")!.items;
    const rec = recs.get("2026-08-12")!;
    expect(before, "the done item is missing — the fixture no longer reproduces the fault").toHaveLength(1);
    expect(rec).toHaveLength(1);
    expect(before[0].activityId).toBe(rec[0].activityId);
    expect(dedupeAgainstRecord(before, rec)).toEqual([]);
    // and with the layer hidden the done card is the day's evidence again
    expect(dedupeAgainstRecord(before, [])).toHaveLength(1);
  });
});
describe("daysSince / carriedLine — the gap, stated and never judged", () => {
  it("counts whole days, and across a month boundary", () => {
    expect(daysSince("2026-08-19", "2026-08-19")).toBe(0);
    expect(daysSince("2026-08-07", "2026-08-19")).toBe(12);
    /* ⚠️ ACROSS THE BOUNDARY: 28 Jul → 3 Aug is six days, not a month's worth of arithmetic */
    expect(daysSince("2026-07-28", "2026-08-03")).toBe(6);
    expect(daysSince("2026-12-28", "2027-01-04")).toBe(7);
    /* ⚠️ AND ACROSS A DST SHIFT — the UK clocks go back on 25 Oct 2026. Anchored at midnight this
       reads 13 rather than 14, because the extra hour floors the division. */
    expect(daysSince("2026-10-20", "2026-11-03")).toBe(14);
  });

  it("states the turn, the origin and the gap — and nothing else", () => {
    expect(carriedLine("2026-08-07", "2026-08-19")).toBe("Your turn · Since 7 Aug · 12 days waiting");
    expect(carriedLine("2026-08-18", "2026-08-19")).toBe("Your turn · Since 18 Aug · 1 day waiting");
  });

  /* ⚠️ ZERO OMITS ITSELF. "0 days waiting" states a duration that has not happened. */
  it("an item that fell due today states no duration at all", () => {
    expect(carriedLine("2026-08-19", "2026-08-19")).toBe("Your turn · Since 19 Aug");
  });

  /* ⚠️ THE COPY LAW, ASSERTED: no "overdue", no verdict, no quality or speed adjective. */
  it("it reports and does not judge", () => {
    const samples = [
      carriedLine("2026-08-07", "2026-08-19"),
      carriedLine("2026-05-01", "2026-08-19"),
      carriedLine("2026-08-19", "2026-08-19"),
    ];
    for (const line of samples) {
      expect(line).not.toMatch(/overdue|late|slow|still|already|only|just|urgent|should|behind/i);
    }
  });
});

/* ══ THE ACTION OVERLAY (finishing pack, Phase 6) ═══════════════════════════════════════════ */
/* ══ THE PILL GRAMMAR ═══════════════════════════════════════════════════════════════════════ */

describe("⚠️ two words on the grid — and summarisation happens NOWHERE else", () => {
  it("gives every task kind that CAN reach the board a pill, and no kind that cannot", () => {
    /* ⚠️ DERIVED BY CALLING `cardActionYmd`, never a hand-written list on both sides. A kind
       reaches the calendar iff it has an action date; housekeeping has none. */
    const calendars = TASK_TYPES.filter((t) => {
      const c = card({ stream: boardStreamForTaskType(t), taskType: t, relatedRecordId: "q1" });
      return cardActionYmd(c, [q({ id: "q1", lastStatusChange: "2026-08-07T09:00:00Z" })]) !== null;
    });
    expect(calendars.length).toBeGreaterThan(0);
    expect([...calendars].sort()).toEqual(Object.keys(PILL_BY_TASK).sort());
  });

  it("⚠️ A WRITER'S OWN TASK IS NEVER SUMMARISED — it is their sentence, returned whole", () => {
    const it1: CalendarItem = {
      key: "k", ymd: TODAY, label: "Book the library room for the reading", family: "task",
      card: card({ userTaskId: "t1" }),
    };
    expect(pillLabel(it1)).toBe("Book the library room for the reading");
  });

  it("a completed item keeps its own words too — the log's, not the app's to abbreviate", () => {
    const done: CalendarItem = { key: "k", ymd: TODAY, label: "Rejected by Marcus Reed", family: "done", struck: true };
    expect(pillLabel(done)).toBe("Rejected by Marcus Reed");
  });

  it("a return is a return whatever came back", () => {
    const snz: CalendarItem = { key: "k", ymd: TODAY, label: "anything at all", family: "snoozed" };
    expect(pillLabel(snz)).toBe(PILL_SNOOZED);
  });

  it("⚠️ THE RECORD SIDE IS ALREADY THIS GRAMMAR — returned untouched, never re-derived", () => {
    const r: RecordItem = {
      key: "rec-1", ymd: TODAY, label: "Partial requested", dir: "in", queryId: "q1",
      activityId: "a", agent: "Marcus Reed", agency: "Reed Literary", manuscriptId: "m1",
      note: "", detail: "", exchange: 2, turned: true,
    };
    expect(pillLabel(r)).toBe("Partial requested");
    /* ⚠️ THE EQUALITY IS ASSERTED OVER BOTH TABLES rather than assumed of one sample. A second
       vocabulary restating these labels is how two readings of one grammar come to disagree — so
       the claim is that `pillLabel` returns the record's OWN label, for every label there is.
       ⚠️ AND IT IS NOT A WORD COUNT. "Revise & resubmit" is three words, and an assertion that
       counted them would have been a rule this pack invented about data it does not control. */
    const labels = [
      ...Object.values(RECORD_STATUS).filter(Boolean).map((x) => x!.label),
      ...Object.values(RECORD_TYPES).filter((x) => x && x !== BY_STATUS).map((x) => (x as { label: string }).label),
    ];
    expect(labels.length).toBeGreaterThan(5);
    for (const label of labels) expect(pillLabel({ ...r, label })).toBe(label);
  });

  it("an unknown kind degrades to the truth rather than to an invented summary", () => {
    const odd: CalendarItem = {
      key: "k", ymd: TODAY, label: "Something the table has never heard of", family: "agent",
      card: card({ taskType: "not_a_real_kind" }),
    };
    expect(pillLabel(odd)).toBe("Something the table has never heard of");
  });

  it("⚠️ `Decide on offer`, and it does not presume the answer", () => {
    expect(PILL_BY_TASK.offer_received).toBe("Decide on offer");
    expect(Object.values(PILL_BY_TASK).join(" ")).not.toMatch(/accept|reject|decline/i);
  });

  it("⚠️ `Send resubmission`, NOT `Send pages` — `pages` collides with the opening sample", () => {
    expect(PILL_BY_TASK.revise_resubmit).toBe("Send resubmission");
    expect(Object.values(PILL_BY_TASK).join(" ")).not.toMatch(/\bpages\b/i);
  });
});

/* ══ GHOSTS ════════════════════════════════════════════════════════════════════════════════ */

describe("ghostsFor — the origin mark for a carried item", () => {
  const carried: CalendarItem = {
    key: "cal-c1", ymd: TODAY, label: "Send the full", family: "agent",
    card: card({ key: "c1" }), rolledFrom: "2026-08-03",
  };
  const native: CalendarItem = { key: "cal-c2", ymd: TODAY, label: "Nudge due", family: "agent", card: card({ key: "c2" }) };

  it("marks the origin day of every carried item, and nothing else", () => {
    expect(ghostsFor("2026-08-03", [carried, native])).toEqual([
      { key: "ghost-cal-c1", ymd: "2026-08-03", of: carried },
    ]);
    expect(ghostsFor("2026-08-04", [carried, native])).toEqual([]);
  });

  it("⚠️ IT READS TODAY'S ITEMS, because that is where carried work renders", () => {
    /* passing the origin day's own items finds nothing, forever — the shape that looks like a
       feature nobody switched on */
    expect(ghostsFor("2026-08-03", [])).toEqual([]);
  });

  it("⚠️ A GHOST IS NEVER DEDUPED AGAINST THE RECORD — nothing happened on its origin day", () => {
    /* the dedupe exists because a completed card and a record entry can be two readings of ONE
       activity; a carried task is not an activity, so feeding ghosts through it would let a record
       entry delete the mark for work that is still outstanding */
    const rec: RecordItem = {
      key: "rec-x", ymd: "2026-08-03", label: "Query sent", dir: "out", queryId: "q1",
      activityId: "act-x", agent: "", agency: "", manuscriptId: "", note: "", detail: "",
      exchange: 1, turned: false,
    };
    const ghosts = ghostsFor("2026-08-03", [carried]);
    expect(ghosts).toHaveLength(1);
    /* dedupe takes CalendarItems, and a ghost is not one — it is a derived mark with no activity */
    expect(dedupeAgainstRecord([carried], [rec])).toEqual([carried]);
  });
});

/* ══ DRAGGING ══════════════════════════════════════════════════════════════════════════════ */

describe("draggableTask — only writer-owned pills drag; you cannot drag a fact", () => {
  const mk = (over: Partial<CalendarItem>): CalendarItem =>
    ({ key: "k", ymd: TODAY, label: "l", family: "task", card: card({ userTaskId: "t1" }), ...over });

  it("a writer's own live task drags — its date is INPUT, the one thing a hand may move", () => {
    expect(draggableTask(mk({}))).toBe(true);
  });

  it("a completed task does not — it is the log's, not the writer's to move", () => {
    expect(draggableTask(mk({ struck: true }))).toBe(false);
  });

  it("nothing agent-shaped drags — a send, a nudge and a request are all derived", () => {
    expect(draggableTask(mk({ family: "agent", card: card({ taskType: "full_requested" }) }))).toBe(false);
  });

  it("a snoozed return does not — its date is a flag's, not a field the writer owns", () => {
    expect(draggableTask(mk({ family: "snoozed" }))).toBe(false);
  });

  it("⚠️ AND NEITHER DOES A TASK-FAMILY ITEM WITH NO `userTaskId` — the write has no key", () => {
    expect(draggableTask(mk({ card: card({}) }))).toBe(false);
    expect(draggableTask(mk({ card: undefined }))).toBe(false);
  });
});

/* ══ THE EXPECTED WINDOW'S COPY ════════════════════════════════════════════════════════════ */

describe("expectedLine — the source stated as fact, and never a gendered pronoun", () => {
  it("names the agency's window and the send it counts from", () => {
    expect(expectedLine({
      key: "e", ymd: TODAY, queryId: "q1", agent: "P. Kaur", source: "agent",
      weeks: 6, fromYmd: "2026-07-01",
    })).toBe("Their stated 6 weeks · from 1 Jul");
  });

  it("agrees its singular, and stands without the send when there is none", () => {
    expect(expectedLine({ key: "e", ymd: TODAY, queryId: "q1", agent: "", source: "agent", weeks: 1 }))
      .toBe("Their stated 1 week");
  });

  it("⚠️ `Their`, NEVER `Her` OR `His` — the app does not store an agent's pronouns", () => {
    const all = [
      expectedLine({ key: "e", ymd: TODAY, queryId: "q1", agent: "", source: "agent", weeks: 2, fromYmd: TODAY }),
      expectedLine({ key: "e", ymd: TODAY, queryId: "q1", agent: "", source: "agent" }),
      expectedLine({ key: "e", ymd: TODAY, queryId: "q1", agent: "", source: "writer", setYmd: TODAY }),
      expectedLine({ key: "e", ymd: TODAY, queryId: "q1", agent: "", source: "writer" }),
    ].join(" | ");
    expect(all).not.toMatch(/\b(her|his|hers|she|he)\b/i);
  });

  it("⚠️ AN UNSTAMPED WRITER'S DATE OMITS THE CLAUSE rather than inventing a moment", () => {
    expect(expectedLine({ key: "e", ymd: TODAY, queryId: "q1", agent: "", source: "writer" })).toBe("Your date");
    expect(expectedLine({ key: "e", ymd: TODAY, queryId: "q1", agent: "", source: "writer", setYmd: "2026-08-01" }))
      .toBe("Your date · set 1 Aug");
  });

  it("the pill names no agent — a band is a span, not a label for a person", () => {
    expect(EXPECTED_PILL).toBe("Reply window");
  });
});

/* ══ RETIREMENTS ═══════════════════════════════════════════════════════════════════════════ */

describe("⚠️ the month grid's exports are RETIRED, and their laws are stated here or gone", () => {
  /**
   * ⚠️ THIS BLOCK IS A RECORD, NOT A LOCK. Each line names a law the retired half asserted and
   * says what happened to it, because "the test was updated" is how a real regression gets
   * absorbed. The subjects listed here genuinely no longer exist.
   *
   *  · "a month never draws a torn row"            — no month. `windowDays` pads nothing.
   *  · "a cell shows at least two occupants"       — no cell. A row grows to hold what it holds.
   *  · "the counter takes a slot"                  — no counter, and nothing to count.
   *  · "the fold divides by a MEASURED pill"       — no fold.
   *  · "the peek is the answer to +N MORE"         — no +N MORE.
   *  · "Upcoming only starts at today's week"      — the window starts at today by construction.
   *  · "the day panel groups by voice"             — the panel becomes the workspace (Phase 4).
   *  · "the collapse is session-local, open by default" — nothing to collapse.
   *  · "the month name is the door"                — the pager moves weeks; there is no month name.
   *  · "the cells are RULED, not boxed"            — measured now, not read out of a stylesheet.
   *
   * ⚠️ ONE OF THEM IS NOT MERELY WITHOUT A SUBJECT — IT IS CONTRADICTED. `"the week view is gone,
   * and so are the helpers that served it"` asserted that this page had no week. It has one. The
   * helpers it named (`weekDays`/`weekLabel`/`shiftWeek`) are still gone and are not coming back:
   * they served a week of seven CELLS showing what the month already showed, which is a different
   * thing from a week of relationships and spans. The name collided; the subject never matched.
   */
  it("states the retirement, so a reader of this file is not left to infer it", async () => {
    const mod = await import("./todoCalendar") as Record<string, unknown>;
    for (const gone of [
      "monthGridDays", "monthLabel", "shiftMonth", "sameMonth",
      "CAL_CELL_CAP", "CAL_CELL_FLOOR", "CAL_PIP_H", "CAL_CELL_CHROME", "CAL_MORE_H",
      "FOLD_FALLBACK", "foldFor", "calFoldCap", "calFoldCapFolded", "foldMetricsFrom",
      "cellSlots", "peekBox", "PEEK_DELAY_MS", "PEEK_SCALE", "PEEK_OPACITY", "PEEK_PAD", "PEEK_LIFT",
      "upcomingGridDays", "CAL_KINDS", "CAL_KIND_ORDER", "allKinds", "itemKind", "recordKind",
      "itemInKinds", "recordInKinds", "expectedInKinds", "expectedDays",
    ]) {
      expect(mod[gone], `${gone} should be retired`).toBeUndefined();
    }
  });

  it("⚠️ and the derivations that survived are all still exported — the other direction", () => {
    /* a retirement lock that only asserts absence passes on a file somebody emptied */
    expect(typeof calendarDays).toBe("function");
    expect(typeof recordDays).toBe("function");
    expect(typeof dedupeAgainstRecord).toBe("function");
    expect(typeof pillLabel).toBe("function");
    expect(typeof ghostsFor).toBe("function");
    expect(typeof draggableTask).toBe("function");
    expect(typeof expectedLine).toBe("function");
    expect(typeof toYmd).toBe("function");
    expect(REC_TONE.out.dot).toBeTruthy();
    expect(REC_LEGEND).toHaveLength(2);
  });
});
