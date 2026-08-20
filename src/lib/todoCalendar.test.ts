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
  monthGridDays, monthLabel, shiftMonth, sameMonth,
  cardActionYmd, calendarDays, CAL_CELL_CAP, calFoldCap, toYmd,
  recordDays, recordSpecFor, RECORD_TYPES, RECORD_STATUS, BY_STATUS,
  cellSlots,
  calFoldCapFolded, CAL_MORE_H,
  CAL_PIP_H,
  exchangeLine,
  REC_TONE, REC_LEGEND,
} from "./todoCalendar";
import { HOLDING_REPLY_TYPE } from "./holdingReply";
import { CAL_PIP, CAL_LEGEND } from "./todoFamily";
import { TODO_FACETS } from "./todoBoardSort";

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
  cols: { todo: [], today: [], snoozed: [], dismissed: [], done: [] },
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


  it("labels + shifts", () => {
    expect(monthLabel("2026-08-07")).toBe("August 2026");
    expect(shiftMonth("2026-08-07", 1)).toBe("2026-09-01");
    expect(shiftMonth("2026-08-07", -1)).toBe("2026-07-01");
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
       broken. CAL_CELL_CAP survives as the CEILING, which is what this test really pinned.

       ⚠️ RETARGETED 20 Aug 2026 (record-layer P3): the slicing moved out of the JSX into the pure
       `cellSlots`, because the cell now seats two layers and the ordering between them is a rule
       worth testing rather than a line worth quoting. The CLAIM is unchanged — the cap still binds
       the live items — but it is now asserted by CALLING the arithmetic instead of matching the
       expression that used to express it. */
    /* ⚠️ AMENDED 20 Aug (fixes pack, Phase 1): the counter now takes a slot, so four items in a
       cap of three draw TWO pips and the counter — not three pips crushed against it. */
    expect(cellSlots(["a", "b", "c", "d"], [], CAL_CELL_CAP).shownItems).toEqual(["a", "b"]);
    expect(cellSlots(["a", "b", "c", "d"], [], CAL_CELL_CAP).overflow).toBe(2);
    expect(cellSlots(["a", "b", "c"], [], CAL_CELL_CAP).shownItems).toEqual(["a", "b", "c"]);
    expect(pageSrc).toContain("cellSlots(items, recs, cellCap, cellCapFolded)");
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

  /* ⚠️ RETARGETED 20 Aug 2026 (record-layer P5): a day is now SELECTED, not opened. The modal it
     asserted (`setOpenDay` / `.cal-daypanel`) is retired — the in-focus panel is permanent chrome
     beside the month, so there is no dialogue to open and no scrim to dismiss. The CLAIM that
     mattered is unchanged and still asserted: a pip opens the item sheet, and clicking a day sends
     it to the day surface. Its retirement is locked positively in the Phase 5 block below, so this
     is a retarget rather than a deletion. */
  it("clicks: a pip opens the item sheet (FocusFlow), a day is selected into the panel", () => {
    expect(pageSrc).toContain("setFlowCard(item.card)");
    expect(pageSrc).toContain("<FocusFlow");
    expect(pageSrc).toContain("onClick={() => selectDay(ymd)}");
    expect(pageSrc).toContain('className="cal-focus"');
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
  /* ⚠️ RENUMBERED 20 Aug 2026 (fixes pack, Phase 1) — the CLAIM is untouched, the constant moved.
     `CAL_PIP_H` was the ref's 19 and is now the browser-measured 25, so every boundary shifts by
     the same six pixels. The old numbers described a pip six pixels shorter than the one that
     ships, which is precisely how a cap promised room that did not exist. */
  it("a tall row shows the ceiling; a short one folds sooner", () => {
    /* ⚠️ RENUMBERED AGAIN 20 Aug (fixes pack, Phase 3): the numeral moved into a fixed 20px box,
       so `CAL_CELL_CHROME` went 26 -> 33. The claim is still the claim; the row simply has seven
       fewer pixels to give away. */
    // 33px chrome + 3 × 25px pips = 108px of row for the full three
    expect(calFoldCap(120)).toBe(CAL_CELL_CAP); // room 87 — three fit
    expect(calFoldCap(108)).toBe(3);            // room 75 — exactly three
    expect(calFoldCap(95)).toBe(2);             // room 62 — two
    expect(calFoldCap(70)).toBe(1);             // room 37 — one
    expect(calFoldCap(46)).toBe(1);             // room 13 — the floor holds at one
  });

  it("⚠️ TWO CAPS — the counter is 12px, not a whole pip, and that is worth a row", () => {
    // measured on the deployed page: reserving a full pip slot for the counter turned a two-pip
    // cell into a one-pip cell at a 900px viewport. Beside the counter, two still fit.
    expect(CAL_MORE_H).toBe(12);
    expect(calFoldCapFolded(104)).toBe(calFoldCap(104)); // the shipping size — same number
    expect(calFoldCapFolded(120)).toBe(3);
    // and it never claims more than the unfolded cap, nor less than one
    for (const px of [0, 20, 46, 60, 80, 104, 120, 300]) {
      expect(calFoldCapFolded(px)).toBeLessThanOrEqual(Math.max(calFoldCap(px), 1));
      expect(calFoldCapFolded(px)).toBeGreaterThanOrEqual(1);
    }
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
      cols: { todo: [card({ key: "t1", userTaskId: "t1", nature: "task", dueYmd: day })], today: [], snoozed: [], dismissed: [], done: [] },
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

/* ══ THE RECORD IN THE GRID (record-layer pack, Phase 3) ════════════════════════════════════
 *
 * ⚠️ NEGATIVE ASSERTIONS STRIP COMMENTS FIRST. This codebase documents every retirement by
 * quoting what it retired, so a lock forbidding a token finds it in the prose explaining why it
 * is gone. Positive assertions read the raw source; `decls` is for `not.` only.
 */
const decls = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const calCss = readFileSync(join(here, "..", "components", "todo", "todoCalendar.css"), "utf8");

describe("⚠️ the record is recessive, and it folds with everything else", () => {
  it("live work fills the cell FIRST; the record takes what is left", () => {
    // two live, one record, cap 3 → everything fits, live first, no counter needed
    expect(cellSlots(["a", "b"], ["r"], 3)).toEqual({ shownItems: ["a", "b"], shownRecs: ["r"], overflow: 0 });
    /* three live, two record, cap 3 → over the cap, so one slot goes to the counter and the live
       work takes the other two (fixes pack, Phase 1 — it used to take all three) */
    expect(cellSlots(["a", "b", "c"], ["r", "s"], 3)).toEqual({ shownItems: ["a", "b"], shownRecs: [], overflow: 3 });
  });

  it("⚠️ a busy day never pushes today's work under the fold to make room for history", () => {
    // the failure this ordering prevents: were the record to take slots first, a day with four
    // past events and one live task would fold the ONE thing the writer still has to do.
    const { shownItems, shownRecs } = cellSlots(["live"], ["r1", "r2", "r3", "r4"], 3);
    expect(shownItems).toEqual(["live"]);
    expect(shownRecs).toEqual(["r1"]); // the third slot is the counter's (fixes pack, Phase 1)
  });

  it("⚠️ the fold counts BOTH layers — a record pip is a pip", () => {
    expect(cellSlots([], ["r", "s", "t", "u"], 3).overflow).toBe(2);
    expect(cellSlots(["a", "b"], ["r", "s"], 3).overflow).toBe(2);
    // and with a folded cap of 3 (the counter fitting beside three), only one folds
    expect(cellSlots([], ["r", "s", "t", "u"], 3, 3).overflow).toBe(1);
    // the record alone, well within the cap, folds nothing
    expect(cellSlots([], ["r"], 3)).toEqual({ shownItems: [], shownRecs: ["r"], overflow: 0 });
    // an empty day, and the degenerate cap, both stay honest
    expect(cellSlots([], [], 3)).toEqual({ shownItems: [], shownRecs: [], overflow: 0 });
    expect(cellSlots(["a"], ["r"], 0)).toEqual({ shownItems: [], shownRecs: [], overflow: 2 });
    // calFoldCap is consumed unchanged — this pack does not touch the measured fold
    expect(pageSrc).toContain("calFoldCap(rowPx)");
    expect(pageSrc).toContain("cellSlots(items, recs, cellCap, cellCapFolded)");
    expect(calFoldCap(0)).toBe(CAL_CELL_CAP);
  });

  it("⚠️ record pips keep .cal-pip's BOX — the fold counts in CAL_PIP_H, so height must not drift", () => {
    expect(pageSrc).toContain('className="cal-pip cal-rec"');
    const rec = calCss.slice(calCss.indexOf(".cal-pip.cal-rec {"));
    expect(calCss.indexOf(".cal-pip.cal-rec {"), "the record pip rule is missing").toBeGreaterThan(-1);
    const block = rec.slice(0, rec.indexOf("}"));
    // paint only — no height, padding-block, margin or font-size may be restated here
    for (const prop of ["height", "padding:", "padding-top", "padding-bottom", "margin", "font-size", "line-height"]) {
      expect(block, `.cal-pip.cal-rec must not restate ${prop}`).not.toContain(prop);
    }
  });

  it("⚠️ the card pips are NOT restyled — CAL_PIP still paints them, untouched", () => {
    expect(pageSrc).toContain("CAL_PIP[it.family]");
    // the record's tones never reach a card pip
    expect(decls(pageSrc)).not.toMatch(/CAL_PIP\[[^\]]+\][^\n]*REC_TONE/);
  });
});

describe("⚠️ the record's tones are calendar-local, and the legend still renders FROM a record", () => {
  it("the two dots are the ref's, and they are the only two", () => {
    expect(REC_TONE.out.dot).toBe("#b9a48f");
    expect(REC_TONE.in.dot).toBe("#8a9e88");
    expect(Object.keys(REC_TONE).sort()).toEqual(["in", "out"]);
    // the ink does not vary by item, so it lives in the stylesheet, and is asserted there
    expect(calCss).toContain("#7d6b5d");
  });

  it("⚠️ CAL_PIP IS NOT WIDENED — the record is a layer, not a fifth family", () => {
    // Two locks outside this session's territory assert the four, and the shapes differ anyway:
    // a CAL_PIP entry is {bg,tx,bd} and the record has no fill and no border.
    expect(Object.keys(CAL_PIP).sort()).toEqual(["agent", "done", "snoozed", "task"]);
    expect(CAL_LEGEND.map((l) => l.family)).toEqual(Object.keys(CAL_PIP));
  });

  it("the legend reads both records and writes no tone of its own", () => {
    expect(pageSrc).toContain("CAL_LEGEND.map");
    expect(pageSrc).toContain("REC_LEGEND.map");
    expect(REC_LEGEND.map((l) => l.dir)).toEqual(["out", "in"]);
    // no record hex is written in the page — the tones come from the record
    expect(decls(pageSrc)).not.toContain("#b9a48f");
    expect(decls(pageSrc)).not.toContain("#8a9e88");
  });

  it("⚠️ the record is NOT narrowed by the facet — there is no urgent history", () => {
    // FILTERS narrow live WORK; a facet reaching the record would answer a question about the
    // past with a rule written for the present. Only THE RECORD governs it.
    expect(pageSrc).toContain("recordDays(activities, queries, agents, visible)");
    expect(decls(pageSrc)).not.toMatch(/applyFacet\([^)]*rec/i);
  });
});

/* ══ THE RECORD'S CONTROL (record-layer pack, Phase 4) ══════════════════════════════════════ */

describe("⚠️ one switch for the record, and it is NOT a facet", () => {
  it("TODO_FACETS is untouched — still the four the board and the sidebar badge read", () => {
    // The shared vocabulary. A fifth entry here would reach two surfaces that have no history.
    expect(TODO_FACETS.map((f) => f.id)).toEqual(["all", "urgent", "housekeeping", "yours"]);
    expect(TODO_FACETS.map((f) => f.label)).toEqual(["Everything", "Urgent", "Housekeeping", "Your tasks"]);
  });

  it("the record's toggle is the page's own state, separated by a rule", () => {
    expect(pageSrc).toContain("useState(true)");
    expect(pageSrc).toContain('aria-pressed={showRecord}');
    expect(pageSrc).toContain('className="cal-sep"');
    // it governs the pips, the legend and the day list together — one boolean, read in one place
    expect(pageSrc).toContain("showRecord ? recByDay.get(ymd) ?? [] : []");
  });

  it("⚠️ the record's state is SESSION-ONLY — never persisted", () => {
    // a preference stored for a view toggle is a preference nobody asked to keep, and the To-do
    // prefs document belongs to another surface entirely
    const d = decls(pageSrc);
    expect(d).not.toMatch(/localStorage[^\n]*[Rr]ecord/);
    expect(d).not.toMatch(/todoPrefs[^\n]*[Rr]ecord/);
    expect(d).not.toMatch(/showRecord[^\n]*localStorage/);
  });

  it("⚠️ the facet never reaches the record, and the record never reaches the facet counts", () => {
    const d = decls(pageSrc);
    // facetCounts still reads the LIVE cards only — the record is not a countable facet
    expect(d).toContain("facetCounts(liveBoardCards(assembled.cols))");
    expect(d).not.toMatch(/facetCounts\([^)]*rec/i);
    expect(d).not.toMatch(/TODO_FACETS[^\n]*record/i);
  });
});

/* ══ THE IN-FOCUS DAY PANEL (record-layer pack, Phase 5) ════════════════════════════════════ */

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
    const got = recordDays(acts, RQ, [AGENT], monthGridDays("2026-08-12"));
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

describe("⚠️ the day panel replaces the modal, inside the chassis", () => {
  it("⚠️ THE MODAL IS GONE — page and stylesheet together, not left inert", () => {
    // verified against the diff, not just intended: these classes render nowhere and no rule
    // defines them. A bounded token, so a longer live class cannot satisfy the assertion.
    for (const c of ["cal-dayscrim", "cal-daypanel", "cal-dayhead", "cal-dayx", "cal-dayrow"]) {
      expect(decls(pageSrc), `${c} still renders`).not.toMatch(new RegExp(`["\\s\`]${c}["\\s\`]`));
      expect(decls(calCss), `${c} still has a rule`).not.toMatch(new RegExp(`\\.${c}[\\s{.:,]`));
    }
    expect(decls(pageSrc)).not.toContain('role="dialog"');
  });

  it("the panel is this page's own box inside .tpl-body — TasksPageLayout is not forked", () => {
    expect(pageSrc).toContain('className="cal-layout"');
    expect(pageSrc).toContain('className="cal-focus"');
    // still the shared chassis, and still no TplZone: the month compresses, it does not scroll
    expect(pageSrc).toContain("<TasksPageLayout");
    expect(decls(pageSrc)).not.toContain("<TplZone");
  });

  it("⚠️ NO viewport arithmetic — the stage is the scroll container, not the window", () => {
    expect(decls(calCss)).not.toMatch(/100vh/);
    expect(decls(calCss)).not.toMatch(/100dvh/);
  });

  it("sections read live work first and the record last, grouped by voice", () => {
    const order = ["Yours", "Coming back", "Done", "On the record"];
    let at = -1;
    for (const s of order) {
      const i = pageSrc.indexOf(`section("${s}"`);
      expect(i, `${s} section is missing`).toBeGreaterThan(-1);
      expect(i, `${s} is out of order`).toBeGreaterThan(at);
      at = i;
    }
  });

  it("⚠️ live rows open the SAME FocusFlow the pips open — one action surface", () => {
    expect(pageSrc).toContain("onOpenCard={openSheet}");
    expect(pageSrc).toContain("<FocusFlow");
    // and the record never manufactures a card to get into that flow
    expect(decls(pageSrc)).not.toMatch(/kind:\s*"card"[^\n]*rec/i);
  });

  it("⚠️ EDIT THIS ENTRY routes — no calendar-local editor, no second correction surface", () => {
    expect(pageSrc).toContain("EDIT THIS ENTRY");
    expect(pageSrc).toContain("OPEN QUERY");
    expect(pageSrc).toContain("/queries?q=");
    const d = decls(pageSrc);
    expect(d).not.toContain("editActivity");
    expect(d).not.toContain("deleteActivity");
    expect(d).not.toContain("TimelineComposer");
  });

  it("⚠️ NO COMPOSER — one composer, on the To-do list, reached by the existing announcement", () => {
    expect(pageSrc).toContain("TODO_OPEN_COMPOSER");
    const d = decls(pageSrc);
    expect(d).not.toContain("addUserTask");
    expect(d).not.toContain("createUserTask");
    expect(d).not.toContain("<textarea");
  });

  it("an empty day says so without apologising or prompting", () => {
    expect(pageSrc).toContain("A clear day.");
    expect(pageSrc).toContain("Nothing scheduled · nothing waiting");
    const d = decls(pageSrc);
    expect(d).not.toMatch(/sorry|why not|get started|add your first|make the most/i);
  });

  it("⚠️ changing day clears any expanded row, and 'overdue' appears nowhere", () => {
    expect(pageSrc).toContain("const selectDay = (ymd: string) => { setSelDay(ymd); setOpenRec(null); };");
    expect(decls(pageSrc).toLowerCase()).not.toContain("overdue");
    expect(decls(calCss).toLowerCase()).not.toContain("overdue");
  });

  it("the keyboard moves the selection and keeps the month in step, inert while typing", () => {
    expect(pageSrc).toContain('e.key === "ArrowLeft"');
    expect(pageSrc).toContain("if (!visible.includes(next)) setAnchor(next);");
    expect(pageSrc).toContain('tag === "INPUT" || tag === "TEXTAREA"');
    expect(pageSrc).toMatch(/e\.key === "t" \|\| e\.key === "T"/);
    expect(calCss).toContain("prefers-reduced-motion");
    expect(calCss).toContain(":focus-visible");
  });
});

/* ══ THE WEEK VIEW IS RETIRED (record-layer pack, Phase 6) ══════════════════════════════════ */

describe("⚠️ the week view is gone, and so are the helpers that served it", () => {
  it("the page has no view switcher and no week branch", () => {
    const d = decls(pageSrc);
    expect(d).not.toMatch(/["\s`]cal-viewwrap["\s`]/);
    expect(d).not.toMatch(/["\s`]cal-viewmenu["\s`]/);
    expect(d).not.toContain("setView");
    expect(d).not.toContain('"month" | "week"');
    expect(d).not.toContain("weekDays");
    expect(d).not.toContain("shiftWeek");
    // the month is now the only grid, and it says so without a ternary
    expect(pageSrc).toContain("const visible = monthGridDays(anchor);");
  });

  it("⚠️ the module no longer EXPORTS them — traced to zero callers before removal", () => {
    const lib = readFileSync(join(here, "todoCalendar.ts"), "utf8");
    const src = decls(lib);
    for (const fn of ["weekDays", "weekLabel", "shiftWeek"]) {
      expect(src, `${fn} is still defined`).not.toContain(`export function ${fn}`);
    }
    // and the survivors are untouched
    expect(monthGridDays("2026-08-07")).toHaveLength(42);
    expect(monthLabel("2026-08-07")).toBe("August 2026");
    expect(shiftMonth("2026-08-07", 1)).toBe("2026-09-01");
    expect(sameMonth("2026-08-31", "2026-09-01")).toBe(false);
  });

  it("⚠️ there was never a List view — nothing to delete, and nothing invented to delete", () => {
    expect(decls(pageSrc)).not.toMatch(/["\s`]cal-list["\s`]/);
    expect(decls(pageSrc)).not.toContain('"list"');
  });
});

/* ══ THE `cal-` COLLISION GUARD (fixes pack, Phase 1) ═══════════════════════════════════════ */

describe("⚠️ no property may bleed from todo.css's cal- classes into this page", () => {
  /** Every `prop: value` declared on a bare selector in a stylesheet, comments stripped. */
  const propsOf = (css: string, sel: string): Record<string, string> => {
    const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
    const out: Record<string, string> = {};
    const re = new RegExp(`(^|})\\s*${sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`, "gm");
    for (const m of clean.matchAll(re)) {
      for (const d of m[2].split(";")) {
        const i = d.indexOf(":");
        if (i > 0) out[d.slice(0, i).trim()] = d.slice(i + 1).trim();
      }
    }
    return out;
  };

  const todoCss = readFileSync(join(here, "..", "components", "todo", "todo.css"), "utf8");
  const chromeCss = readFileSync(join(here, "..", "components", "todo", "taskChrome.css"), "utf8");

  /* the three names this page shares with the RecordingCalendar, plus the shared tool-row control */
  const COLLIDING = [".cal-d", ".cal-dow", ".cal-grid", ".cal-nav"];

  it("⚠️ THE COLLISION IS REAL — this is not a hypothetical guard", () => {
    // if todo.css ever stops declaring these, the guard below becomes vacuous, so assert the premise
    expect(Object.keys(propsOf(todoCss, ".cal-d")).length, "todo.css no longer styles .cal-d").toBeGreaterThan(0);
    expect(propsOf(todoCss, ".cal-d")["aspect-ratio"], "the fatal property is gone — retire this guard").toBe("1");
  });

  it("every property todo.css sets is DECLARED OR RESET by a later sheet, for all four", () => {
    /* ⚠️ THE FAILURE THIS CATCHES IS SILENT. A property todo.css sets and this page never mentions
       cannot be beaten by specificity, load order or care — it simply applies. `aspect-ratio: 1`
       reached a 96px cell that way and cost a whole review cycle. */
    const unresolved: string[] = [];
    for (const sel of COLLIDING) {
      const theirs = propsOf(todoCss, sel);
      /* mine, both bare and under the `.calm` scope; plus the shared chrome for .cal-nav */
      const ours = {
        ...propsOf(chromeCss, sel),
        ...propsOf(calCss, sel),
        ...propsOf(calCss, `.cal-layout ${sel}`),
        ...(sel === ".cal-nav" ? propsOf(calCss, ".tpl-tools .calm-nav") : {}),
      };
      for (const prop of Object.keys(theirs)) {
        if (!(prop in ours)) unresolved.push(`${sel} { ${prop}: ${theirs[prop]} }`);
      }
    }
    expect(unresolved, `these bleed from todo.css into the Calendar:\n  ${unresolved.join("\n  ")}`).toEqual([]);
  });

  it("⚠️ the scopes are EXISTING ancestors — the shared page root is not touched", () => {
    // tasksViewport.test.tsx's law: all four Tasks pages wear the same column. A first attempt
    // added a class to `.t-f12.spine-root` and went red against it; that lock is right.
    expect(pageSrc).toContain('className="t-f12 spine-root"');
    expect(pageSrc).not.toContain("spine-root calm");
    expect(calCss).toContain(".cal-layout .cal-d");
    expect(calCss).toContain(".cal-layout .cal-dow");
    expect(calCss).toContain(".tpl-tools .calm-nav");
    // the fatal one, named explicitly
    expect(calCss).toMatch(/\.cal-layout \.cal-d\s*\{[^}]*aspect-ratio:\s*auto/);
  });

  it("⚠️ .cal-nav is NOT redefined here — it is shared chrome, only un-bled", () => {
    // the Noteboard and the To-do list wear the same control; this page fixes the width bleed for
    // itself and reports the same bleed on their pages rather than reaching into taskChrome.css
    const scoped = propsOf(calCss, ".tpl-tools .calm-nav");
    expect(Object.keys(scoped).sort()).toEqual(["justify-content", "width"]);
    expect(scoped.width).toBe("auto");
    // ⚠️ the sibling suite forbids the substring ".cal-nav {" in this sheet, and it is right to:
    // the control is shared chrome. Asserted here too so the reason travels with the rule.
    expect(calCss).not.toContain(".cal-nav {");
    expect(propsOf(calCss, ".cal-nav")).toEqual({});
  });
});

describe("⚠️ the counter takes a slot (fixes pack, Phase 1)", () => {
  it("everything fits when the total is within the cap — no counter, no shrink", () => {
    expect(cellSlots(["a", "b", "c"], [], 3)).toEqual({ shownItems: ["a", "b", "c"], shownRecs: [], overflow: 0 });
    expect(cellSlots(["a", "b"], ["r"], 3)).toEqual({ shownItems: ["a", "b"], shownRecs: ["r"], overflow: 0 });
  });

  it("⚠️ THE BOUNDARY: one more than the cap gives cap-1 pips AND the counter its own line", () => {
    // the bug this replaces drew 3 pips + a counter into room for 3, and the flex column absorbed
    // it by squashing every pip to 8px — measured on dev, both widths
    // with no folded cap given, the default is the ref's cap-1
    const r = cellSlots(["a", "b", "c", "d"], [], 3);
    expect(r.shownItems).toEqual(["a", "b"]);
    expect(r.overflow).toBe(2);
    // and when the measurement says the counter fits BESIDE three, three show
    const wide = cellSlots(["a", "b", "c", "d"], [], 3, 3);
    expect(wide.shownItems).toEqual(["a", "b", "c"]);
    expect(wide.overflow).toBe(1);
    expect(r.shownItems.length + (r.overflow > 0 ? 1 : 0)).toBeLessThanOrEqual(3);
  });

  it("the shown count plus the counter's line never exceeds the cap, at any size", () => {
    for (let n = 0; n < 12; n++) {
      for (const cap of [1, 2, 3, 4]) {
        const items = Array.from({ length: n }, (_, i) => `i${i}`);
        const r = cellSlots(items, [], cap);
        const lines = r.shownItems.length + r.shownRecs.length + (r.overflow > 0 ? 1 : 0);
        expect(lines, `n=${n} cap=${cap} => ${JSON.stringify(r)}`).toBeLessThanOrEqual(cap);
        // the folded cap can never make a cell show MORE pips than the unfolded one allows
        const rf = cellSlots(items, [], cap, cap);
        expect(rf.shownItems.length + rf.shownRecs.length).toBeLessThanOrEqual(cap);
        expect(rf.shownItems.length + rf.shownRecs.length + rf.overflow).toBe(n);
        // and nothing is ever lost or invented
        expect(r.shownItems.length + r.shownRecs.length + r.overflow).toBe(n);
      }
    }
  });

  it("live work still fills first when the counter takes its slot", () => {
    const r = cellSlots(["live"], ["r1", "r2", "r3"], 3);
    expect(r.shownItems).toEqual(["live"]);
    expect(r.shownRecs).toEqual(["r1"]);
    expect(r.overflow).toBe(2);
  });

  it("CAL_PIP_H is the MEASURED pip height, not the ref's estimate", () => {
    // browser-measured: 12.75 line + 6 padding + 2 border + 4 margin = 24.75, rounded up
    expect(CAL_PIP_H).toBe(25);
  });
});

/* ══ THE MONTH CHASSIS (fixes pack, Phase 2) ════════════════════════════════════════════════ */

describe("⚠️ the month is ONE panel, ruled — not forty-two floating cards", () => {
  /* ⚠️ ANCHORED TO THE LINE START, because `indexOf(".cal-dow {")` also matches
     `.cal-layout .cal-dow {` — the Phase 1 reset, which sits earlier in the file. First-match
     slicing on a selector that is a SUFFIX of another selector reads the wrong block and asserts
     about rules nobody wrote. It cost a red here before it could cost a false green. */
  const rule = (sel: string) => {
    const m = new RegExp(`^${sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`, "m").exec(calCss);
    expect(m, `${sel} has no rule of its own at a line start`).not.toBeNull();
    return m![1];
  };

  it("the grid is the parchment panel, and it clips its own corners", () => {
    const g = rule(".cal-grid");
    expect(g).toContain("background: #fdfaf5");
    expect(g).toContain("border: 1px solid #ece0d2");
    expect(g).toContain("border-radius: 14px");
    expect(g).toContain("overflow: hidden"); // without it the radius cannot clip the corner cells
    expect(g).toContain("gap: 0");
  });

  it("⚠️ cells are RULED, not boxed — no gap, no radius, no fill of their own", () => {
    const c = rule(".cal-cell");
    expect(c).toContain("background: transparent");
    expect(c).toContain("border-radius: 0");
    expect(c).toContain("border-right: 1px solid");
    expect(c).toContain("border-bottom: 1px solid");
    // the old floating-card treatment is gone, not merely overridden further down
    expect(c).not.toMatch(/background:\s*#fff\b/);
    expect(c).not.toMatch(/border-radius:\s*9px/);
  });

  it("the edge cells drop their rule so the panel's border is not doubled", () => {
    expect(calCss).toContain(".cal-cell:nth-child(7n) { border-right: 0; }");
    expect(calCss).toContain(".cal-cell:nth-last-child(-n + 7) { border-bottom: 0; }");
  });

  it("⚠️ the weekday row is a SAGE BAND, in the ref's gradient and ink", () => {
    const d = rule(".cal-dow");
    expect(d).toContain("linear-gradient(135deg, #d7ddd5, #d5dbd3)");
    expect(d).toContain("color: #5a6e58");
    expect(d).not.toContain("#b3a394"); // the old floating-label ink
  });

  it("weekends warm faintly; adjacent months dim; both by ground, not opacity", () => {
    expect(calCss).toContain(".cal-cell:nth-child(7n + 6)");
    expect(calCss).toContain(".cal-cell:nth-child(7n + 7)");
    expect(calCss).toContain("background: #fbf7f0");
    expect(rule(".cal-cell.off")).toContain("background: #f8f4ed");
    // ⚠️ opacity is retired: it dimmed the pips too, and a real pip on an adjacent-month day is
    // still a real pip. The GROUND changes; what sits on it does not.
    expect(rule(".cal-cell.off")).not.toContain("opacity");
  });

  it("⚠️ THE PAST IS A MUTED NUMERAL AND NOTHING ELSE — no wash", () => {
    // a wash across three weeks of a month reads as three weeks of alarm; that tint belongs to the
    // urgency band, which is the To-do list's alone
    expect(calCss).toContain(".cal-cell.past .cal-dn { color: #c3b3a4; }");
    expect(calCss).not.toMatch(/\.cal-cell\.past\s*\{[^}]*background/);
    // and nothing on this page reaches for the urgency band's pink
    const decl = decls(calCss);
    expect(decl).not.toMatch(/\.cal-cell[^{]*\{[^}]*#f8e2d9/);
  });
});

/* ══ THE COMMAND BAR (fixes pack, Phase 4) ══════════════════════════════════════════════════ */

describe("⚠️ the record's chip reads as one control", () => {
  const rule = (sel: string) => {
    const m = new RegExp(`^${sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`, "m").exec(calCss);
    expect(m, `${sel} has no rule of its own at a line start`).not.toBeNull();
    return m![1];
  };

  it("one line always, with the swatch inside the chip", () => {
    const b = rule(".cal-recbtn");
    expect(b).toContain("white-space: nowrap");
    expect(b).toContain("display: inline-flex"); // the swatch is a child, not a sibling
    expect(pageSrc).toContain('<span className="cal-recsw"');
    /* ⚠️ THE ANCHOR IS THE EXACT className, NOT THE PREFIX. `indexOf("cal-recbtn")` finds
       `cal-recbtn2` — the day panel's action button — which sits earlier in the file, and the slice
       then describes the wrong control entirely. Same family as the `.cal-dow` / `.cal-layout
       .cal-dow` slip in Phase 2: a token that is a prefix of a live class is never a safe anchor. */
    const anchor = 'className="cal-nav calm-nav cal-recbtn"';
    const i = pageSrc.indexOf(anchor);
    expect(i, "the record chip's exact className is missing").toBeGreaterThan(-1);
    const seg = pageSrc.slice(i, i + 420);
    expect(seg).toContain("cal-recsw");
    expect(rule(".cal-recsw")).toContain("width: 7px");
  });

  it("⚠️ the separator is a RULE — 1px × 18px, centred, not a full-height column edge", () => {
    const s = rule(".cal-sep");
    expect(s).toContain("width: 1px");
    expect(s).toContain("height: 18px");
    expect(s).toContain("align-self: center");
    expect(s).not.toContain("align-self: stretch");
    // breathing room on both sides, between the facet control and the record's chip
    expect(s).toMatch(/margin:\s*0\s+9px/);
  });

  it("off is visibly off — the whole chip, not the label alone", () => {
    expect(calCss).toContain('.cal-recbtn[aria-pressed="false"] { opacity: 0.42; }');
    // and the state is on the element the assistive tree reads, not only in the paint
    expect(pageSrc).toContain("aria-pressed={showRecord}");
  });

  it("⚠️ prev/next carry a real glyph — the buttons were empty at 26px wide", () => {
    // the cause was the .cal-nav width bleed (Phase 1); the glyph was always there
    expect(pageSrc).toContain("<ChevronLeft size={14}");
    expect(pageSrc).toContain("<ChevronRight size={14}");
    expect(pageSrc).toContain('aria-label="Previous"');
    expect(pageSrc).toContain('aria-label="Next"');
    // and they wear the un-bleed modifier
    expect(pageSrc).toMatch(/className="cal-nav calm-nav"[^>]*aria-label="Previous"/);
  });
});

/* ══ THE PANEL HEAD + LEGEND (fixes pack, Phase 5) ══════════════════════════════════════════ */

describe("⚠️ the count line, and the legend's one record layer", () => {
  it("⚠️ 9px, THE REF'S SIZE — it shipped at 6.5px and the review read it as missing", () => {
    const m = /^\.cal-fpcount\s*\{([^}]*)\}/m.exec(calCss);
    expect(m, ".cal-fpcount has no rule").not.toBeNull();
    expect(m![1]).toContain("font-size: 9px");
    expect(m![1]).toContain("letter-spacing: 0.13em");
    expect(m![1]).toContain("text-transform: uppercase");
    expect(m![1]).not.toContain("6.5px");
  });

  it("the line names the total and the record's share, and singulars agree", () => {
    expect(pageSrc).toContain('`${total} ITEM${total === 1 ? "" : "S"}`');
    expect(pageSrc).toContain('recs.length ? `${recs.length} ON THE RECORD` : ""');
  });

  it("⚠️ AN EMPTY DAY STATES NO TALLY — '0 ITEMS' is a count nobody asked for", () => {
    expect(pageSrc).toContain('const countLine = total === 0 ? "" : [');
    expect(pageSrc).toContain("{countLine && <div className=\"cal-fpcount\">{countLine}</div>}");
  });

  it("⚠️ the deviation from the ref is deliberate: a history-only day still gets a line", () => {
    // the ref reads `items.length ? … : ''`, counting only the LIVE items — so a day holding
    // nothing but record entries renders an "On the record" section under a blank head.
    expect(pageSrc).toContain("const total = items.length + recs.length;");
    expect(decls(pageSrc)).not.toMatch(/countLine\s*=\s*items\.length\s*===?\s*0/);
  });

  it("⚠️ the legend reads FOUR families and ONE record layer, not six peers", () => {
    // the record's dots keep the layer's treatment; a rule separates the two groups
    expect(pageSrc).toContain('<i className="cal-legsep" />');
    expect(pageSrc).toContain('<i className="cal-legdot"');
    expect(CAL_LEGEND).toHaveLength(4);
    expect(REC_LEGEND).toHaveLength(2);
    const sep = /^\.cal-legend i\.cal-legsep\s*\{([^}]*)\}/m.exec(calCss);
    expect(sep, "the legend separator has no rule").not.toBeNull();
    expect(sep![1]).toContain("width: 1px");
    // still rendered FROM the records — no label or tone written into the page
    expect(pageSrc).toContain("REC_LEGEND.map");
    expect(pageSrc).toContain("CAL_LEGEND.map");
    expect(decls(pageSrc)).not.toContain("YOU SENT");
    expect(decls(pageSrc)).not.toContain("THEY REPLIED");
  });
});
