/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Calendar's pure layer (tasks-pages pack, Phase 3): placement per source, the derived
 * roll-forward, completed-from-the-log, the grids, the fold — plus the page's wiring locks
 * (filters applied before placement, the shared pip map, the click targets).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Query, Agent, UserTask, TaskFlag, Activity, ActivityType, QueryStatus } from "../types";
import { BoardCard } from "./todoBoard";
import {
  monthGridDays, weekDays, monthLabel, weekLabel, shiftMonth, shiftWeek, sameMonth,
  cardActionYmd, calendarDays, CAL_CELL_CAP, calFoldCap, toYmd,
  recordDays, recordSpecFor, RECORD_TYPES, RECORD_STATUS, BY_STATUS,
} from "./todoCalendar";
import { HOLDING_REPLY_TYPE } from "./holdingReply";
import { CAL_PIP, CAL_LEGEND } from "./todoFamily";

const here = __dirname;
const pageSrc = readFileSync(join(here, "..", "components", "todo", "TodoCalendarPage.tsx"), "utf8");

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
  cols: { todo: [], today: [], snoozed: [], done: [] },
  flags: [] as TaskFlag[], queries: [] as Query[], agents: [] as Agent[],
  userTasks: [] as UserTask[], activities: [] as Activity[], today: TODAY, nowMs: NOW,
};
const AUG = monthGridDays("2026-08-07");

/* ── the grids ─────────────────────────────────────────────────────────────────────────────── */

describe("the month grid — Monday-start full weeks, never a torn row", () => {
  it("August 2026 runs Mon 27 Jul → Sun 6 Sep: 42 cells", () => {
    expect(AUG[0]).toBe("2026-07-27");
    expect(AUG[AUG.length - 1]).toBe("2026-09-06");
    expect(AUG).toHaveLength(42);
    expect(AUG.length % 7).toBe(0);
  });

  it("the week runs Monday to Sunday around any anchor", () => {
    const w = weekDays("2026-08-07"); // a Friday
    expect(w[0]).toBe("2026-08-03");
    expect(w[6]).toBe("2026-08-09");
    expect(w).toHaveLength(7);
  });

  it("labels + shifts", () => {
    expect(monthLabel("2026-08-07")).toBe("August 2026");
    expect(weekLabel("2026-08-07")).toBe("3–9 August 2026");
    expect(shiftMonth("2026-08-07", 1)).toBe("2026-09-01");
    expect(shiftMonth("2026-08-07", -1)).toBe("2026-07-01");
    expect(shiftWeek("2026-08-07", 1)).toBe("2026-08-14");
    expect(sameMonth("2026-08-01", "2026-08-31")).toBe(true);
    expect(sameMonth("2026-08-31", "2026-09-01")).toBe(false);
  });
});

/* ── placement per source ──────────────────────────────────────────────────────────────────── */

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

describe("the fold, the map, the wiring", () => {
  it("busy days fold past the cap", () => {
    expect(CAL_CELL_CAP).toBe(3);
    /* ⚠️ AMENDED 7 Aug 2026 (tasks-viewport P3): the cap is DERIVED from the row height the grid
       resolved to, not read flat off the constant. A flat 3 asked a 44px row on a short laptop to
       hold three 19px pips, and the third was sheared in half — a clipped pip is worse than an
       honest fold, because the fold says "there are more" while a half-pip says the app is
       broken. CAL_CELL_CAP survives as the CEILING, which is what this test really pinned. */
    expect(pageSrc).toContain("items.slice(0, cellCap)");
    expect(pageSrc).toContain("calFoldCap(rowPx)");
    expect(pageSrc).toContain("+{overflow} MORE");
  });

  it("⚠️ the pips and the legend read the ONE map in todoFamily — never a page-local palette", () => {
    expect(pageSrc).toContain('from "../../lib/todoFamily"');
    expect(pageSrc).toContain("CAL_PIP[it.family]");
    expect(pageSrc).toContain("CAL_LEGEND.map");
    expect(pageSrc).not.toMatch(/cal-pip[^}]*#f8e2d9/); // no hex beside the pip render
    // tasks-audit P4: the butter "dated notes" family is retired — LIVE families only, exactly
    expect(Object.keys(CAL_PIP).sort()).toEqual(["agent", "done", "snoozed", "task"]);
    expect(CAL_LEGEND.map((l) => l.label)).toEqual([
      "AGENT DEADLINES", "YOUR TASKS", "SNOOZED RETURNS", "COMPLETED",
    ]);
  });

  it("today wears the ink ring; day counts sit in the cell corner", () => {
    expect(pageSrc).toContain('ymd === today ? " today"');
    expect(pageSrc).toContain("cal-c2");
  });

  it("⚠️ FILTERS narrow the live cards BEFORE placement — the same applyFacet the board uses", () => {
    // P5 composed tags in: facet ∧ tags, one narrow helper over the same applyFacet
    expect(pageSrc).toContain("applyFacet(cards, facet).filter((c) => matchesTags(c.tags, tagSel))");
    expect(pageSrc).toContain("todo: narrow(assembled.cols.todo)");
    expect(pageSrc).toContain("snoozed: narrow(assembled.cols.snoozed)");
    // completed items ride only the unfiltered view — finished work is not waiting
    expect(pageSrc).toContain('facet === "all" ? userTasks : []');
  });

  it("clicks: a pip opens the item sheet (FocusFlow), a day opens its list", () => {
    expect(pageSrc).toContain("setFlowCard(item.card)");
    expect(pageSrc).toContain("<FocusFlow");
    expect(pageSrc).toContain("setOpenDay(ymd)");
    expect(pageSrc).toContain("cal-daypanel");
  });

  it("the roll-forward marker's copy is the ref's", () => {
    expect(pageSrc).toContain("ROLLED FORWARD ↗");
  });

  it("toYmd is local, not UTC — a late-evening task must not land on tomorrow", () => {
    expect(toYmd(new Date(2026, 7, 7, 23, 30))).toBe("2026-08-07");
  });
});

/* ── the derived fold (tasks-viewport P3) ──────────────────────────────────────────────────── */

describe("⚠️ the fold threshold derives from the cell, never from a flat constant", () => {
  it("a tall row shows the ceiling; a short one folds sooner", () => {
    // 26px chrome + 3 × 19px pips = 83px of room for the full three
    expect(calFoldCap(120)).toBe(CAL_CELL_CAP);
    expect(calFoldCap(84)).toBe(3);
    expect(calFoldCap(64)).toBe(2);   // 38px of room — two fit
    expect(calFoldCap(46)).toBe(1);   // 20px — one
  });

  it("⚠️ AT LEAST ONE PIP ALWAYS SHOWS — a cell that folds everything says only '+3 MORE'", () => {
    /* which tells you the day is busy but not what it holds — the fold is meant to abbreviate a
       list, not replace it. */
    expect(calFoldCap(30)).toBe(1);
    expect(calFoldCap(1)).toBe(1);
  });

  it("it never exceeds the ceiling, however tall the row", () => {
    expect(calFoldCap(2000)).toBe(CAL_CELL_CAP);
  });

  it("an unmeasured grid reads as the old flat cap — nothing renders emptier while it settles", () => {
    expect(calFoldCap(0)).toBe(CAL_CELL_CAP);
    expect(calFoldCap(-5)).toBe(CAL_CELL_CAP);
  });
});

/* ══ THE RECORD LAYER (record-layer pack, Phase 2) ══════════════════════════════════════════ */

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

describe("the record buckets by day, beside the live work", () => {
  it("buckets on the activity's own date, in the order the events happened", () => {
    const got = rec([
      act({ id: "b", date: "2026-08-12T15:00:00Z", resultingStatus: QueryStatus.FULL_REQUESTED }),
      act({ id: "a", date: "2026-08-12T09:00:00Z", activityType: ActivityType.QUERY_SENT }),
      act({ id: "c", date: "2026-08-14T09:00:00Z", activityType: ActivityType.NUDGE_SENT }),
    ]);
    expect(got.get("2026-08-12")?.map((r) => r.label)).toEqual(["Query sent", "Full requested"]);
    expect(got.get("2026-08-14")?.map((r) => r.label)).toEqual(["Nudge sent"]);
    expect(got.get("2026-08-13")).toBeUndefined();
  });

  it("carries the agent's display name, the query and the activity — the row's routing", () => {
    const r = rec([act({ activityType: ActivityType.QUERY_SENT })]).get("2026-08-12")![0];
    expect(r).toMatchObject({
      key: "rec-act1", ymd: "2026-08-12", queryId: "q1", activityId: "act1", agent: "Marcus Reed",
    });
  });

  it("⚠️ an orphaned activity is excluded — OPEN QUERY would have nowhere to go", () => {
    expect(recordDays([act({ queryId: "gone" })], RQ, [AGENT], AUG).size).toBe(0);
    // the query survives without its agent: the row still routes, and simply names nobody
    const noAgent = recordDays([act({ activityType: ActivityType.QUERY_SENT })], RQ, [], AUG);
    expect(noAgent.get("2026-08-12")?.[0].agent).toBe("");
  });

  it("a day holding live cards ALSO holds its record — the two layers are independent", () => {
    const day = "2026-08-12";
    const live = calendarDays({
      ...EMPTY,
      cols: { todo: [card({ key: "t1", userTaskId: "t1", nature: "task", dueYmd: day })], today: [], snoozed: [], done: [] },
      queries: RQ,
    }, AUG);
    const record = rec([act({ date: `${day}T09:00:00Z`, activityType: ActivityType.QUERY_SENT })]);
    expect(live.get(day)?.items.map((i) => i.family)).toEqual(["task"]);
    expect(record.get(day)?.map((r) => r.label)).toEqual(["Query sent"]);
  });

  it("an empty range yields an empty map, and days outside it are never bucketed", () => {
    expect(rec([act({ activityType: ActivityType.QUERY_SENT })], []).size).toBe(0);
    // 12 Aug is real, but a September grid does not contain it
    expect(rec([act({ activityType: ActivityType.QUERY_SENT })], monthGridDays("2026-10-05")).size).toBe(0);
    expect(rec([]).size).toBe(0);
  });
});
