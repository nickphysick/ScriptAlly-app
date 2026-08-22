/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Calendar's pure layer (tasks-pages pack, Phase 3): placement per source, the derived
 * roll-forward, completed-from-the-log, the grids, the fold — plus the page's wiring locks
 * (filters applied before placement, the shared pip map, the click targets).
 */
import { describe, it, expect } from "vitest";
import { sliceBetween } from "../test/sliceBetween";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Query, Agent, UserTask, TaskFlag, Activity, ActivityType, QueryStatus } from "../types";
import { BoardCard } from "./todoBoard";
import type { CalendarItem, RecordItem } from "./todoCalendar";
import {
  monthGridDays, monthLabel, shiftMonth, sameMonth,
  peekBox, PEEK_SCALE, PEEK_PAD, PEEK_LIFT, PEEK_DELAY_MS, PEEK_OPACITY,
  upcomingGridDays,
  ghostsFor, daysSince, carriedLine, itemKind, recordKind, CAL_KINDS, CAL_KIND_ORDER, allKinds,
  itemInKinds, recordInKinds,
  draggableTask,
  expectedDays, expectedInKinds, expectedLine, EXPECTED_PILL, ExpectedItem,
  cardActionYmd, calendarDays, CAL_CELL_CAP, calFoldCap, toYmd,
  recordDays, recordSpecFor, RECORD_TYPES, RECORD_STATUS, BY_STATUS,
  cellSlots,
  dedupeAgainstRecord,
  pillLabel, PILL_BY_TASK, PILL_SNOOZED,
  calFoldCapFolded, CAL_MORE_H, CAL_CELL_FLOOR, CAL_PIP_H, CAL_CELL_CHROME,
  foldFor, foldMetricsFrom, FOLD_FALLBACK, type FoldMetrics,
  exchangeLine,
  REC_TONE, REC_LEGEND,
} from "./todoCalendar";
import { HOLDING_REPLY_TYPE } from "./holdingReply";
import { TASK_TYPES } from "./todoActions";
import { boardStreamForTaskType } from "./todoBoard";
import { CAL_PIP, CAL_LEGEND } from "./todoFamily";
import { TODO_FACETS } from "./todoBoardSort";

const here = __dirname;
const pageSrc = readFileSync(join(here, "..", "components", "todo", "TodoCalendarPage.tsx"), "utf8");

const CAL_CELL_CHROME_FOR_TEST = CAL_CELL_CHROME;

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
    /* ⚠️ RETARGETED (finishing pack, Phase 5): items and GHOSTS now travel through the fold as one
       tagged occupant list, because a ghost is the same box and must pay for its slot. The claim is
       unchanged — one call, both live layers and the record, never three expressions at the render
       site. */
    expect(pageSrc).toContain("cellSlots(occupants, recs, cellCap, cellCapFolded)");
    /* ⚠️ AMENDED (reclaim pack, Phase 2): the fold now takes MEASURED metrics, so the call
       carries them. The law is unchanged — the page still derives its cap from the measured row. */
    expect(pageSrc).toContain("calFoldCap(rowPx, metrics)");
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

  /* ⚠️ RETARGETED (finishing pack, Phase 4). The facet is superseded by event KINDS — see
     `CAL_KINDS` — so `applyFacet` no longer narrows here and the two feeds are no longer withheld.
     What this lock exists to protect is the SHAPE, and the shape survives: tags still narrow the
     live cards BEFORE placement, through one `narrow` helper applied to every live column, so a
     filter cannot reach one column and miss another. */
  it("⚠️ TAGS narrow the live cards BEFORE placement — one helper, every live column", () => {
    expect(pageSrc).toContain("cards.filter((c) => matchesTags(c.tags, tagSel))");
    expect(pageSrc).toContain("todo: narrow(assembled.cols.todo)");
    expect(pageSrc).toContain("snoozed: narrow(assembled.cols.snoozed)");
    /* ⚠️ THE TWO FEEDS ARE NO LONGER GATED. Under the facet they were withheld unless "Everything"
       was chosen, because neither a writer's task nor a completed item HAS a facet — so any
       narrower facet had to drop them wholesale. The kind vocabulary names both, so they can be
       filtered honestly instead of withheld. */
    const d = decls(pageSrc);
    expect(d).not.toContain('facet === "all" ? userTasks : []');
    expect(d).not.toContain("applyFacet");
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
    /* ⚠️ RENUMBERED AGAIN 21 Aug (pill pack, Phase 5) — third time, same reason each time: the
       CLAIM never moves, the measured pill does. 19 -> 25 when the `cal-` collision was fixed,
       25 -> 27 when the label became a pill. 33px chrome + 3 × 27px = 114px of row for three. */
    expect(calFoldCap(140)).toBe(CAL_CELL_CAP); // room 105 — three fit easily
    expect(calFoldCap(110)).toBe(3);            // room 75 — exactly three
    expect(calFoldCap(95)).toBe(2);             // room 60 — two, the third does not fit
    /* ⚠️ AMENDED 21 Aug (dedupe pack, Phase 3, Nick's ruling): the floor is TWO, not one, so a
       short row no longer falls to a single pip. The arithmetic below the floor is unchanged —
       what changed is where it stops. See `CAL_CELL_FLOOR`. */
    expect(calFoldCap(70)).toBe(CAL_CELL_FLOOR);  // room 37 — one fits, the floor says two
    expect(calFoldCap(46)).toBe(CAL_CELL_FLOOR);  // room 13 — likewise
  });

  it("⚠️ TWO CAPS — the counter is 12px, not a whole pip, and that is worth a row", () => {
    // measured on the deployed page: reserving a full pip slot for the counter turned a two-pip
    // cell into a one-pip cell at a 900px viewport. Beside the counter, two still fit.
    expect(CAL_MORE_H).toBe(11);
    expect(calFoldCapFolded(104)).toBe(calFoldCap(104)); // the shipping size — same number
    /* ⚠️ AND AT 120 THEY DIVERGE, which is the whole point of asking twice: three pips fit alone
       (room 87) but only two fit beside the counter (75). A single cap has to assume the worst. */
    expect(calFoldCap(120)).toBe(3);
    expect(calFoldCapFolded(120)).toBe(2);
    expect(calFoldCapFolded(130)).toBe(3);      // room 95 — three fit even beside the counter
    // and it never claims more than the unfolded cap, nor less than one
    for (const px of [0, 20, 46, 60, 80, 104, 120, 300]) {
      expect(calFoldCapFolded(px)).toBeLessThanOrEqual(Math.max(calFoldCap(px), 1));
      expect(calFoldCapFolded(px)).toBeGreaterThanOrEqual(1);
    }
  });

  it("⚠️ THE DENSITY FLOOR IS TWO — one pip plus the counter's line, at any supported width", () => {
    /* The rule was "at least ONE pip", and one pip plus a counter is a day that says "1 item and
       eleven you cannot see" — a list of counters rather than a calendar. Measured on dev before
       this change, 1000px wide gave rowPx 66 and a cap of exactly that. Nick's ruling raised it.
       ⚠️ THE CONSTANT CANNOT CREATE THE SPACE — `.cal-grid`'s min-height at the collapsed width
       was raised to 600px in the same change, and the acceptance run is what reconciles them: if
       they ever disagree the cell OVERFLOWS (pips are `flex: none`), loudly, at every width. */
    expect(CAL_CELL_FLOOR).toBe(2);
    expect(calFoldCap(30)).toBe(CAL_CELL_FLOOR);
    expect(calFoldCap(1)).toBe(CAL_CELL_FLOOR);
    expect(calFoldCapFolded(30)).toBe(CAL_CELL_FLOOR);
    // and the floor never exceeds the ceiling
    expect(CAL_CELL_FLOOR).toBeLessThanOrEqual(CAL_CELL_CAP);
  });

  it("the collapsed width's grid floor is derived from the density floor, not chosen", () => {
    /* 2 pips + the counter = 2 × 25 + 12 = 62px of room; + 33 chrome = rowPx 95; × 6 rows + 13
       for the weekday band = 583. 600 carries the margin. */
    expect(calCss).toContain("min-height: 620px");
    const need = 6 * (CAL_CELL_CHROME_FOR_TEST + CAL_CELL_FLOOR * CAL_PIP_H + CAL_MORE_H) + 13;
    expect(620).toBeGreaterThanOrEqual(need);
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
    /* ⚠️ AMENDED (reclaim pack, Phase 2): the fold now takes MEASURED metrics, so the call
       carries them. The law is unchanged — the page still derives its cap from the measured row. */
    expect(pageSrc).toContain("calFoldCap(rowPx, metrics)");
    /* ⚠️ RETARGETED (finishing pack, Phase 5): items and GHOSTS now travel through the fold as one
       tagged occupant list, because a ghost is the same box and must pay for its slot. The claim is
       unchanged — one call, both live layers and the record, never three expressions at the render
       site. */
    expect(pageSrc).toContain("cellSlots(occupants, recs, cellCap, cellCapFolded)");
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

  /* ⚠️ THE TOGGLE IS RETIRED AND THE VIEW SEGMENT INHERITS ITS CLAIMS (finishing pack, Phase 3).
     Every property this asserted is still required of the successor — page-owned state, separated
     from the facet control by the rule, and governing the record through ONE read. Only the shape
     of the control changed, so the lock is retargeted rather than dropped. */
  it("the view segment is the page's own state, separated by a rule", () => {
    expect(pageSrc).toContain('useState<CalMode>("both")');
    expect(pageSrc).toContain("aria-pressed={mode === id}");
    expect(pageSrc).toContain('className="cal-sep"');
    // it governs the pips, the legend and the day list together — one value, read in one place
    expect(pageSrc).toContain('mode === "both" ? recByDay.get(ymd) ?? [] : []');
  });

  it("⚠️ the record's state is SESSION-ONLY — never persisted", () => {
    // a preference stored for a view toggle is a preference nobody asked to keep, and the To-do
    // prefs document belongs to another surface entirely
    const d = decls(pageSrc);
    expect(d).not.toMatch(/localStorage[^\n]*[Rr]ecord/);
    expect(d).not.toMatch(/todoPrefs[^\n]*[Rr]ecord/);
    expect(d).not.toMatch(/setMode[^\n]*localStorage/);
    expect(d).not.toMatch(/localStorage[^\n]*mode/i);
  });

  /* ⚠️ RETARGETED (finishing pack, Phase 4), and the claim INVERTS with its reason.
     The old law was that the facet must never reach the record: a facet names live WORK, and
     reaching the past with a rule written for the present would answer a question it was not asked
     — "urgent" means nothing applied to a query sent three weeks ago. That is precisely why the
     calendar now has an event vocabulary of its own. A KIND *is* a fact about the past, so it may
     narrow the record, and must: a control offering "Nudges" that left nudge entries on screen
     would be lying. What survives untouched is the separation of the two vocabularies. */
  it("⚠️ the KIND vocabulary narrows both layers; TODO_FACETS reaches neither", () => {
    const d = decls(pageSrc);
    /* one kind predicate per layer, at the point of reading — never a second derivation */
    expect(d).toContain("recordInKinds(r, kinds)");
    expect(d).toContain("itemInKinds(it, kinds)");
    /* the board's vocabulary is not consulted by this page at all any more */
    expect(d).not.toContain("TODO_FACETS");
    expect(d).not.toContain("facetCounts");
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
    /* ⚠️ RETARGETED (foot-panel pack, Phase 2): the layout takes the collapse class by template
       literal now. The claim is unchanged — the two-column split exists and is this element. */
    expect(pageSrc).toContain('className={`cal-layout${panelOpen ? "" : " cal-nopanel"}`}');
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

  /* ⚠️ RETARGETED (proposals pack, Phase 1b), and the LAW is unchanged: no calendar-local editor,
     no second correction surface. What changed is the door — `EDIT THIS ENTRY` and `OPEN QUERY`
     are retired with the heavy detail (they were two buttons routing to the same place, one of
     them wearing a verb it could not perform, since `TimelineComposer` has no importer anywhere).
     The single `Open in Query Centre ›` link is the whole action surface now. */
  it("⚠️ the row ROUTES — no calendar-local editor, no second correction surface", () => {
    expect(pageSrc).toContain("Open in Query Centre ›");
    expect(pageSrc).toContain("/queries?q=");
    const d = decls(pageSrc);
    expect(d).not.toContain("EDIT THIS ENTRY");
    expect(d).not.toContain("editActivity");
    expect(d).not.toContain("deleteActivity");
    expect(d).not.toContain("TimelineComposer");
  });

  /* ⚠️ THE EXPANDED ROW IS AT MOST: the header, ONE context line, ONE link (proposals pack, Phase
     1b — asserted as the pack asks). The panel is a reading surface, not a duplicate of the
     reading pane; the old grid, deed sentence, logged-on line and second button are all fenced
     out at source, over stripped text so the explaining comments cannot re-trip them. */
  it("the expanded record row is headlines plus a link, and nothing else", () => {
    const i = pageSrc.indexOf('<div className="cal-recdet">');
    expect(i, "the detail container is missing — the slice would prove nothing").toBeGreaterThan(-1);
    const det = pageSrc.slice(i, pageSrc.indexOf("</div>\n                  )}", i));
    const d = decls(det);
    expect(d).toContain('className="cal-recctx"');
    expect(d).toContain('className="cal-reclink"');
    expect(d).not.toContain("cal-recgrid");
    expect(d).not.toContain("<dt>");
    expect(d).not.toContain("exchangeLine");
    expect(d).not.toContain("r.note");
    expect(d).not.toContain("toLocaleDateString");
    /* one link, not two */
    expect((d.match(/onOpenQuery/g) ?? []).length).toBe(1);
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
    /* ⚠️ AMENDED 21 Aug (pill pack, Phase 3): `selectDay` now clears a THIRD thing — the pill's
       scroll request — so pinning its whole body went red on a change that strengthened it. The
       law is unchanged and is what is asserted: changing day clears the expansion. */
    expect(pageSrc).toMatch(/const selectDay = \(ymd: string\) => \{[^}]*setSelDay\(ymd\)[^}]*setOpenRec\(null\)[^}]*\}/);
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
    /* ⚠️ RETARGETED (finishing pack, Phase 3). The WEEK view stays retired — that is what this
       lock is for, and every assertion above it is untouched. What changed is that a second
       MODE now chooses the range, so the producer line is a ternary again. The claim the lock
       must keep making is that neither arm is the week view: both are month-anchored. */
    expect(pageSrc).toContain('mode === "upcoming" ? upcomingGridDays(anchor, today) : monthGridDays(anchor)');
    expect(pageSrc).not.toContain("weekDays(");
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
    /* browser-measured after the pill grammar, at 1000/1440/1920 (all three identical):
       15px line + 6 padding + 2 border + 2 margin = 25. The pill is TALLER than the old bar
       (15px line, not 12.75) and its margin is tighter (2, not 4) — see `.cal-pip`'s note for why
       the margin had to give: the grid lost 32px of height this week. */
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

  /* ⚠️ RETARGETED (proposals pack, Phase 1a): THE WEEKEND TINT IS REMOVED, on Nick's ruling. It
     came from a mockup and stated something untrue about the data — a querying writer works
     weekends and an agency's window does not pause for them. The two dimmings that SURVIVE are
     true statements about the DATE: `.off` (another month) and `.lead` (`Upcoming only`'s
     pre-today days). The opacity half of the old law is unchanged. */
  it("weekends are NOT greyed; adjacent months dim by ground, not opacity", () => {
    const d = decls(calCss);
    expect(d).not.toContain(":nth-child(7n + 6)");
    expect(d).not.toContain("#fbf7f0");
    expect(rule(".cal-cell.off")).toContain("background: #f8f4ed");
    expect(rule(".cal-cell.lead")).toContain("background: #f8f4ed");
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

  /* ⚠️ THE CHIP IS RETIRED; THE SEGMENT IS ASSERTED IN ITS PLACE (finishing pack, Phase 3). Its
     one-line rule carries over — a two-state control that wraps is two controls to the eye — and
     the swatch went with the chip, because a segment naming its two states needs no colour key. */
  it("the segment is one line, two buttons, and the chosen one is visibly chosen", () => {
    expect(rule(".cal-segb")).toContain("white-space: nowrap");
    expect(rule(".cal-seg")).toContain("display: flex");
    /* ⚠️ THE ANCHOR IS THE EXACT className, NOT A PREFIX. `.cal-seg` is a prefix of `.cal-segb`,
       which is exactly the trap the retired version of this lock recorded (`cal-recbtn` finding
       `cal-recbtn2`). The `rule()` helper anchors at a line start and takes the whole selector. */
    expect(pageSrc).toContain('className="cal-segb"');
    expect(pageSrc).toContain('data-on={mode === id}');
    expect(rule('.cal-segb[data-on="true"]')).toContain("background: #f8e7e2");
    /* the retired chip and its swatch are gone from BOTH artefacts */
    expect(decls(pageSrc)).not.toMatch(/["\s`]cal-recsw["\s`]/);
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

  /* ⚠️ THE CLAIM SURVIVES ITS CONTROL, and it is the half worth keeping. The retired chip said
     "off" by fading; a two-state segment says it by which half is filled — but EITHER WAY the
     state must reach the assistive tree and not live only in the paint. That is what is asserted
     here now; the opacity rule went with the chip it described. */
  it("the chosen mode is in the assistive tree, not only in the paint", () => {
    expect(pageSrc).toContain("aria-pressed={mode === id}");
    /* and the group itself is named, so the two buttons are not read as loose siblings */
    expect(pageSrc).toContain('role="group" aria-label="What the month shows"');
    /* ⚠️ THE RETIRED CHIP'S FADE RULE IS GONE — ASSERTED OVER STRIPPED CSS, NOT RAW. The
       stylesheet now carries a COMMENT naming `.cal-recbtn` to explain the retirement and to warn
       that `.cal-recbtn2` is a live prefix collision. A raw `not.toContain` over prose that names
       the very token it forbids is this repo's most-recorded false-red — it passes here only
       because the comment happens not to quote the full selector, which is luck, not a guard. */
    expect(decls(calCss)).not.toContain(".cal-recbtn[");
    expect(decls(calCss)).not.toMatch(/["\s`.]cal-recsw["\s`{,:]/);
    /* ⚠️ RETARGETED (proposals pack, Phase 1b): `.cal-recbtn2` is RETIRED with the two buttons it
       dressed, so the prefix collision this line guarded is history — asserted gone over stripped
       CSS, since the sheet's retirement comment names the class. */
    expect(decls(calCss)).not.toMatch(/["\s`.]cal-recbtn2["\s`{,:]/);
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
    /* ⚠️ RETARGETED (proposals pack, Phase 3): expected dates joined the day's contents, so the
       count line — and the chip, same rule — counts all three layers. Ghosts stay out of both:
       a ghost is a signpost for a thing that lives on TODAY. */
    expect(pageSrc).toContain("const total = items.length + recs.length + exps.length;");
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

/* ══ THE DEDUPE, AND THE NAMED PIP (dedupe pack, Phases 1–2) ════════════════════════════════ */

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

describe("⚠️ the record pip names the agent, as the card pips beside it do", () => {
  it("the grid pip reads 'Label · Name', and falls back to the label alone", () => {
    /* ⚠️ RETARGETED, NOT RELAXED (finishing pack, Phase 2). The record pip moved into the shared
       `RecPip` so the peek could render the SAME pill rather than a second copy of it, and the
       tooltip picked up a guard — the peek's pills carry no title, being a tooltip inside a
       tooltip. The claim is unchanged and still exact: where a title IS rendered, it is
       `Label · Name` with the label alone as the fallback. */
    expect(pageSrc).toContain("r.agent ? `${r.label} · ${r.agent}` : r.label");
  });

  it("the panel row keeps its own format — the name is already in its title", () => {
    expect(pageSrc).toContain('<span className="cal-recwho"> · {r.agent}</span>');
  });

  it("truncation is the card pips' — one line, ellipsis, never a wrap", () => {
    const m = /^\.cal-pip\s*\{([^}]*)\}/m.exec(calCss);
    expect(m, ".cal-pip has no rule").not.toBeNull();
    expect(m![1]).toContain("white-space: nowrap");
    expect(m![1]).toContain("text-overflow: ellipsis");
  });
});

/* ══ THE PILL GRAMMAR (pill pack, Phase 2) ══════════════════════════════════════════════════ */

describe("⚠️ two words on the grid — and summarisation happens NOWHERE else", () => {
  const ci = (over: Partial<CalendarItem>): CalendarItem =>
    ({ key: "k", ymd: "2026-08-12", label: "L", family: "agent", ...over });
  const withTask = (taskType: string, label: string) =>
    ci({ family: "agent", label, card: card({ taskType, relatedRecordId: "q1" }) });

  it("query tasks take the two-word vocabulary", () => {
    expect(pillLabel(withTask("partial_requested", "Send your partial to Marcus Reed"))).toBe("Send partial");
    expect(pillLabel(withTask("full_requested", "Send your full to Ana Duarte"))).toBe("Send full");
    expect(pillLabel(withTask("nudge_overdue", "Nudge Tom Ellery"))).toBe("Nudge due");
  });

  it("⚠️ R&R MATERIALS ARE A 'resubmission' — the app's own noun, never 'pages'", () => {
    // queryAmbient types it (`"partial" | "full" | "resubmission"`), nudgeState says "send your
    // resubmission first", the Queries command bar reads "Record your resubmission".
    // "pages" would collide with the opening sample, whose label was deliberately retired FROM
    // "Sample pages" because that name asserts a unit the data does not carry.
    expect(pillLabel(withTask("revise_resubmit", "Resubmit your R&R to Iris Kwan"))).toBe("Send resubmission");
    for (const v of Object.values(PILL_BY_TASK)) expect(v!.toLowerCase()).not.toContain("pages");
  });

  it("a snoozed return says so, whatever came back", () => {
    expect(pillLabel(ci({ family: "snoozed", label: "Send your full to Ana Duarte" }))).toBe(PILL_SNOOZED);
    expect(PILL_SNOOZED).toBe("Task returns");
  });

  it("⚠️ A WRITER'S OWN TASK IS NEVER SUMMARISED — their sentence, returned whole", () => {
    const t = ci({ family: "task", label: "Book the library room for Thursday" });
    expect(pillLabel(t)).toBe("Book the library room for Thursday");
    // and completed work keeps its own words too
    expect(pillLabel(ci({ family: "done", label: "Closed David Marsh — no response", struck: true })))
      .toBe("Closed David Marsh — no response");
  });

  it("⚠️ THE CELL TRUNCATES, NOT THIS FUNCTION — so the tooltip and panel keep every word", () => {
    const long = "A very long task the writer wrote themselves and would like to read in full";
    expect(pillLabel(ci({ family: "task", label: long })), "pillLabel sliced a string").toBe(long);
    const m = /^\.cal-pip\s*\{([^}]*)\}/m.exec(calCss);
    expect(m).not.toBeNull();
    expect(m![1]).toContain("text-overflow: ellipsis");
    expect(m![1]).toContain("white-space: nowrap");
  });

  it("⚠️ THE RECORD SIDE IS ALREADY THIS GRAMMAR — asserted, not assumed", () => {
    // RECORD_TYPES/RECORD_STATUS were written two packs ago as two-word labels. A second table
    // restating them is how two readings of one vocabulary drift; so pillLabel returns them
    // untouched, and this checks the premise that lets it.
    const rec = (label: string): RecordItem =>
      ({ key: "r", ymd: "2026-08-12", label, dir: "out", queryId: "q1", activityId: "a1",
         agent: "Marcus Reed", agency: "Reed Literary", manuscriptId: "m1", note: "", detail: "",
         exchange: 1, turned: false });
    expect(pillLabel(rec("Query sent"))).toBe("Query sent");
    for (const spec of Object.values(RECORD_STATUS)) {
      if (!spec) continue;
      expect(spec.label.split(/\s+/).length, `"${spec.label}" is not a short label`).toBeLessThanOrEqual(3);
    }
  });

  it("⚠️ NO AGENT NAME ON ANY PILL — the grid is a density map", () => {
    const rec: RecordItem =
      { key: "r", ymd: "2026-08-12", label: "Holding reply", dir: "in", queryId: "q1",
        activityId: "a1", agent: "Sam Okoro", agency: "Okoro Bell", manuscriptId: "m1",
        note: "", detail: "", exchange: 1, turned: false };
    expect(pillLabel(rec)).toBe("Holding reply");
    expect(pillLabel(rec)).not.toContain("Sam Okoro");
    // the page renders pillLabel, and keeps the full form in the tooltip
    expect(pageSrc).toContain("{pillLabel(r)}");
    expect(pageSrc).toContain("title={onPick ? (r.agent ? `${r.label} · ${r.agent}` : r.label) : undefined}");
  });

  it("⚠️ EVERY KIND THAT CAN CALENDAR IS EITHER IN THE TABLE OR DELIBERATELY OUT", () => {
    /* Derived on BOTH sides, not hand-listed: the stream comes from `boardStreamForTaskType` —
       the board's own derivation — and the action date from `cardActionYmd`. Neither list is
       written twice.
       ⚠️ A FIRST VERSION FORCED `stream: "do"` ON EVERY TYPE and "found" that housekeeping
       calendars. It does not: the stream is DERIVED from the kind, so a hk type on the do stream
       is an input the system cannot produce — and a test that hands a function an impossible
       argument is testing a function nobody runs. */
    const q = [{ id: "q1", agentId: "a1", dateSent: "2026-08-01T09:00:00Z" } as Query];
    const canCalendar = TASK_TYPES.filter((t) => {
      const stream = boardStreamForTaskType(t);
      if (!stream) return false;
      return cardActionYmd(card({ taskType: t, stream, relatedRecordId: "q1" }), q) !== null;
    });
    expect(canCalendar.length, "no task type can reach the calendar — the probe is wrong").toBeGreaterThan(0);
    const covered = canCalendar.filter((t) => t in PILL_BY_TASK);
    const uncovered = canCalendar.filter((t) => !(t in PILL_BY_TASK));
    /* ⚠️ THE GAP IS CLOSED (finishing pack). `offer_received` was the ONE reported hole — the
       originating pack's table had no card row for an offer, and inventing product copy overnight
       was not that session's call. Nick ruled `Decide on offer`: what the card is, not what the
       answer should be. So the table is now COMPLETE, and this assertion says so rather than
       enumerating an exception. If a new task type reaches the calendar without a pill, this goes
       red naming it — which is the whole point of deriving both sides. */
    expect(uncovered, "an uncovered kind appeared — decide its pill or confirm the fallback")
      .toEqual([]);
    expect(covered.sort()).toEqual(
      ["full_requested", "nudge_overdue", "offer_received", "partial_requested", "revise_resubmit"]);
    /* ⚠️ AND IT IS `Decide on offer`, NOT "Accept offer" — the app does not presume the answer. */
    expect(pillLabel(withTask("offer_received", "Noah Bright has made an offer")))
      .toBe("Decide on offer");
    /* the fallback still exists for anything genuinely unknown, and still tells the truth */
    expect(pillLabel(withTask("nonexistent_kind" as never, "Some other thing")))
      .toBe("Some other thing");
  });

  it("⚠️ NOTHING UPSTREAM WAS SHORTENED — the derivation still emits full labels", () => {
    const full = calendarDays({
      ...EMPTY,
      cols: { ...EMPTY.cols, todo: [card({ key: "c1", taskType: "full_requested", stream: "do", relatedRecordId: "q1", title: "Send your full to Ana Duarte" })] },
      queries: [q({ id: "q1", lastStatusChange: "2026-08-12T09:00:00Z" } as Partial<Query>)],
    }, AUG);
    const item = full.get("2026-08-12")!.items[0];
    expect(item.label, "calendarDays emitted a shortened label").toBe("Send your full to Ana Duarte");
    expect(pillLabel(item)).toBe("Send full");
  });
});

/* ══ CLICK-THROUGH + ROLLED-FORWARD (pill pack, Phases 3–4) ═════════════════════════════════ */

describe("⚠️ a pill points at its row — and actioning is untouched", () => {
  it("a card pill selects its day and asks for its row; a record pill also opens it", () => {
    /* ⚠️ RETARGETED (foot-panel pack, Phase 2): the helper also reopens a collapsed panel — the
       writer has asked to READ something. The original claim (day + target set together, one
       render) is unchanged. */
    expect(pageSrc).toContain("const focusCard = (ymd: string, key: string) => { setSelDay(ymd); setOpenRec(null); setFocusKey(key); reopenForReading(); };");
    expect(pageSrc).toContain("const focusRecord = (ymd: string, key: string) => { setSelDay(ymd); setOpenRec(key); setFocusKey(key); reopenForReading(); };");
    /* ⚠️ RETARGETED (finishing pack, Phase 5): the cell's stack is a tagged union now, so the item
       arm names `o.it`. Same claim — a card pill selects its day and asks for its row. */
    expect(pageSrc).toContain("focusCard(ymd, o.it.key)");
    expect(pageSrc).toContain("focusRecord(ymd, r.key)");
  });

  it("⚠️ CELL WHITESPACE AND THE COUNTER STILL SELECT THE DAY ONLY", () => {
    expect(pageSrc).toContain("onClick={() => selectDay(ymd)}");
    // the counter is not a button and carries no handler of its own
    expect(pageSrc).toContain('<div className="cal-more2">+{overflow} MORE</div>');
    expect(pageSrc).not.toMatch(/cal-more2[^>]*onClick/);
  });

  it("⚠️ SELECTING A DIFFERENT DAY STILL CLEARS THE EXPANSION — and now the focus request too", () => {
    /* ⚠️ RETARGETED (foot-panel pack, Phase 2) — same reopen rider, same original claim. */
    expect(pageSrc).toContain("const selectDay = (ymd: string) => { setSelDay(ymd); setOpenRec(null); setFocusKey(null); reopenForReading(); };");
  });

  it("⚠️ ACTIONING IS UNCHANGED — the row still opens FocusFlow with the same card", () => {
    // the pill routes TO the row, never past it; the row's handler is the one it always was
    expect(pageSrc).toContain("onClick={() => onOpenCard(it)}");
    expect(pageSrc).toContain("onOpenCard={openSheet}");
    expect(pageSrc).toContain("const openSheet = (item: CalendarItem) => {");
    // and the writer's own checkbox task still completes from the panel, unchanged
    expect(pageSrc).toContain("<FocusFlow");
  });

  it("the scroll request is cleared once honoured, so a re-render cannot scroll again", () => {
    expect(pageSrc).toContain("onFocused();");
    expect(pageSrc).toContain("onFocused={() => setFocusKey(null)}");
    expect(pageSrc).toContain('data-rowkey={it.key}');
    expect(pageSrc).toContain('data-rowkey={r.key}');
  });
});

describe("⚠️ rolled-forward: the marker goes, the provenance travels with the item", () => {
  const overdue = card({ key: "late", userTaskId: "t1", nature: "task", dueYmd: "2026-08-04", title: "Chase the reference" });
  const days = calendarDays({ ...EMPTY, cols: { ...EMPTY.cols, todo: [overdue] } }, AUG);

  it("⚠️ THE DATA LAW IS UNCHANGED — the count is still produced, it is simply not drawn", () => {
    /* The two pre-existing assertions in this file keep their laws exactly:
       · "the day they left holds the marker count — not the items" — still true, `rolled` is
         still incremented and the origin day still holds no items;
       · "completed items NEVER roll" — still true, `rolled` stays 0 on a done day.
       Only the RENDER went. Removing the count as well would have been a second change wearing
       the first one's clothes. */
    expect(days.get("2026-08-04")!.rolled).toBe(1);
    expect(days.get("2026-08-04")!.items).toHaveLength(0);
  });

  it("the item carries the day it came from, and it is the day it left", () => {
    const onToday = days.get(TODAY)!.items.find((i) => i.key === "cal-late")!;
    expect(onToday.rolledFrom).toBe("2026-08-04");
    expect(onToday.ymd).toBe(TODAY);
  });

  it("⚠️ AN ITEM ON ITS OWN DAY CARRIES NO PROVENANCE — absence means it never moved", () => {
    const onTime = calendarDays({
      ...EMPTY,
      cols: { ...EMPTY.cols, todo: [card({ key: "ok", userTaskId: "t2", nature: "task", dueYmd: TODAY, title: "Today's" })] },
    }, AUG);
    expect(onTime.get(TODAY)!.items[0].rolledFrom).toBeUndefined();
  });

  it("⚠️ THE MARKER IS OFF THE GRID, and its class cannot come back by accident", () => {
    const src = decls(pageSrc);            // comments stripped — the removal is EXPLAINED in one
    expect(src).not.toContain("ROLLED FORWARD");
    expect(src).not.toMatch(/["\s`]cal-rolled["\s`]/);
    expect(decls(calCss)).not.toMatch(/^\.cal-rolled\s*\{/m);
  });

  it("the provenance line renders on the panel row, from the item's own field", () => {
    /* ⚠️ RETARGETED (finishing pack, Phase 5). The line now states the GAP as well as the origin —
       "Originally due 7 Aug" left the reader to do the arithmetic, and the gap is the whole point
       of a carried item. Still on the panel row, still muted, still derived from `rolledFrom`, and
       still the ONLY place provenance renders as prose. */
    expect(pageSrc).toContain('{it.rolledFrom && <span className="cal-fporig">{carriedLine(it.rolledFrom, today)}</span>}');
    // reusing the existing formatter rather than adding a third date format
    expect(pageSrc).toContain('import { shortDate } from "../../lib/recordingCalendar";');
  });
});

/* ══ THE FLOW'S FEEDBACK (calendar-toast pack) ══════════════════════════════════════════════ */

describe("⚠️ a completion made from the calendar is not silent", () => {
  const todoSrc = readFileSync(join(here, "..", "components", "todo", "ToDoPage.tsx"), "utf8");

  it("⚠️ NEITHER HANDLER IS A NO-OP — that cost the Undo, not just the confirmation", () => {
    /* FocusFlow's write is shared and was always correct; the receipt was missing, and this app
       offers UNDO ON THE TOAST. So the same completion could be reversed from /todo and not from
       the calendar. */
    expect(pageSrc).toContain("onToast={flash}");
    expect(pageSrc).toContain("onNavigate={onNavigate}");
    const i = pageSrc.indexOf("<FocusFlow");
    expect(i, "the calendar no longer mounts FocusFlow").toBeGreaterThan(-1);
    const mount = pageSrc.slice(i, pageSrc.indexOf("/>", i));
    expect(mount).not.toMatch(/onToast=\{\(\)\s*=>\s*\{\s*\}\}/);
    expect(mount).not.toMatch(/onNavigate=\{\(\)\s*=>\s*\{\s*\}\}/);
  });

  it("⚠️ IT IS ToDoPage'S WIRING, NOT A SECOND ONE — asserted against ToDoPage itself", () => {
    /* Two derivations against each other rather than against a literal: if ToDoPage ever stops
       passing its flash, this says so instead of quietly describing a page nobody matches. */
    expect(todoSrc).toContain("onToast={flash}");
    expect(todoSrc).toContain("useTodoToast()");
    expect(pageSrc).toContain("useTodoToast()");
    // one hook instance on this page, feeding both the tag writes and the flow
    expect((pageSrc.match(/useTodoToast\(\)/g) ?? []).length).toBe(1);
  });

  it("the page already hosts the toast, so nothing new was mounted for it", () => {
    expect(pageSrc).toContain('className="tdb-toast"');
    expect(pageSrc).toContain("toast.action");
    // and no calendar-local toast copy was authored — the shared hook produces it
    expect(decls(pageSrc)).not.toMatch(/flash\(\s*["'`]/);
  });

  it("⚠️ THE PROP IS THE SAME SIGNATURE ToDoPage AND FocusFlow USE", () => {
    /* It was narrower — no `opts` — which typechecks, because a function taking fewer arguments
       satisfies one taking more. That is what made it dangerous: a flow routing to an agent would
       have had its agentId dropped here with nothing failing. */
    const sig = "onNavigate: (tab: string, subPageName?: string, opts?: { agentId?: string; manuscriptId?: string }) => void;";
    expect(pageSrc).toContain(sig);
    expect(todoSrc).toContain(sig);
  });
});

/* ══ THE FOLD MEASURES WHAT IT NEEDS (reclaim pack, Phase 2) ════════════════════════════════ */

describe("⚠️ the fold divides by a MEASURED pill, not a declared one", () => {
  /* the shipping geometry, measured at 1440 on the corrected chassis */
  const REAL: FoldMetrics = { pipH: 25, moreH: 11, chrome: 24 };

  it("⚠️ THE CONSTANTS WENT STALE SILENTLY, WHICH IS WHY THIS EXISTS", () => {
    /* CAL_CELL_CHROME described the numeral row plus the cell's padding. Both moved by 8.75px in
       this pack and the whole suite stayed green, because nothing tied the number to the CSS. */
    expect(FOLD_FALLBACK.chrome).toBe(CAL_CELL_CHROME);
    /* ⚠️ COMPARED AT THE CAP END, NOT THE FLOOR END. A first version compared at rowPx 89.5, where
       CAL_CELL_FLOOR forces 2 whatever the pill costs — so it asserted that two identical floors
       differ, and went red for the right reason. A tall row is where the metrics actually decide. */
    expect(calFoldCap(120, REAL)).toBe(3);
    expect(calFoldCap(120, { ...REAL, pipH: 40 })).toBe(2);
  });

  it("metrics are read off a rendered cell, and absent ones yield null rather than a guess", () => {
    expect(foldMetricsFrom({ clientHeight: 89, paddingY: 8, headH: 16 },
      { height: 23, marginTop: 2 }, 11)).toEqual({ pipH: 25, moreH: 11, chrome: 24 });
    /* ⚠️ AN EMPTY MONTH HAS NO PILL TO MEASURE. Inventing one would be the assumption this
       replaces, so it returns null and the caller keeps the last known good numbers. */
    expect(foldMetricsFrom({ clientHeight: 89, paddingY: 8, headH: 16 }, null, 11)).toBeNull();
    expect(foldMetricsFrom({ clientHeight: 89, paddingY: 8, headH: 16 }, { height: 0, marginTop: 2 }, 11)).toBeNull();
    // a missing counter falls back rather than collapsing the reserve to zero
    expect(foldMetricsFrom({ clientHeight: 89, paddingY: 8, headH: 16 },
      { height: 23, marginTop: 2 }, null)!.moreH).toBe(FOLD_FALLBACK.moreH);
  });

  it("the shipping row affords the floor, with the cushion Phase 1 bought", () => {
    // rowPx 89.5, chrome 24 -> room 65.5; two pills + counter = 61
    expect(foldFor(89.5, REAL, true)).toEqual({ cap: 2, fits: 2, shortfall: 0 });
    expect(calFoldCap(89.5, REAL)).toBe(2);
    expect(calFoldCapFolded(89.5, REAL)).toBe(2);
  });

  it("⚠️ WHEN THE FLOOR IS UNSATISFIABLE THE FOLD SAYS SO — it does not silently overflow", () => {
    /* the pre-fix geometry: chrome 35, room 54.5, one pill fits beside the counter. The OLD code
       returned 2 here and the cells overflowed to announce it; now `fits` is honest, `cap` still
       carries the ruling, and `shortfall` states the gap in pixels. */
    const tight = foldFor(89.5, { pipH: 25, moreH: 11, chrome: 35 }, true);
    expect(tight.fits, "the honest fit is 1 at that geometry").toBe(1);
    expect(tight.cap, "the ruling is still what gets drawn").toBe(CAL_CELL_FLOOR);
    expect(tight.shortfall, "the gap is stated, in pixels").toBeCloseTo(6.5, 1);
    // and the page surfaces it rather than swallowing it
    expect(pageSrc).toContain('"data-fold-short"');
    expect(pageSrc).toContain("const fold = foldFor(rowPx, metrics, true);");
  });

  it("a satisfiable floor reports no shortfall, at every width Phase 1 measured", () => {
    for (const rowPx of [99.33, 89.5]) {
      expect(foldFor(rowPx, REAL, true).shortfall, `rowPx ${rowPx}`).toBe(0);
      expect(foldFor(rowPx, REAL, true).cap).toBeGreaterThanOrEqual(CAL_CELL_FLOOR);
    }
  });

  it("no measurement yet still renders the ceiling, not an empty month", () => {
    expect(foldFor(0, REAL, false)).toEqual({ cap: CAL_CELL_CAP, fits: CAL_CELL_CAP, shortfall: 0 });
    expect(calFoldCap(0, REAL)).toBe(CAL_CELL_CAP);
  });
});

/* ══ THE HOVER PEEK'S GEOMETRY (finishing pack, Phase 2) ═════════════════════════════════════ */
describe("peekBox — where the peek goes, and what stops it leaving the grid", () => {
  /* a 7-column grid of 100px cells, 600 wide, 400 tall, at the origin */
  const GRID = { left: 0, top: 0, right: 700, bottom: 400 };
  const cell = (left: number, top: number) => ({ left, top, width: 100 });

  it("a middle cell grows CENTRED on itself", () => {
    const b = peekBox(cell(300, 100), GRID, 0);
    expect(b.width).toBe(160);                       // 100 × 1.6
    expect(b.left).toBe(300 - 30);                   // (160 − 100) / 2 either side
    expect(b.left + b.width / 2).toBe(300 + 50);     // the cell's own centre line
  });

  it("a FIRST-column cell grows inward, never off the left of the grid", () => {
    const b = peekBox(cell(0, 100), GRID, 0);
    expect(b.left).toBe(GRID.left + PEEK_PAD);
    expect(b.left).toBeGreaterThanOrEqual(GRID.left);
  });

  it("a LAST-column cell grows inward, never off the right of the grid", () => {
    const b = peekBox(cell(600, 100), GRID, 0);
    expect(b.left + b.width).toBeLessThanOrEqual(GRID.right);
    expect(b.left).toBe(GRID.right - 160 - PEEK_PAD);
  });

  it("it starts a little ABOVE the cell it grew from", () => {
    expect(peekBox(cell(300, 100), GRID, 0).top).toBe(100 - PEEK_LIFT);
  });

  it("a cell in the LAST ROW is pushed up so a tall peek still ends inside the grid", () => {
    /* eight items' worth of pill, on a day two rows from the foot */
    const b = peekBox(cell(300, 330), GRID, 200);
    expect(b.top + 200).toBeLessThanOrEqual(GRID.bottom);
    expect(b.top).toBe(GRID.bottom - 200 - PEEK_PAD);
  });

  it("the FIRST row is clamped down rather than hung above the grid", () => {
    const b = peekBox(cell(300, 0), GRID, 60);
    expect(b.top).toBe(GRID.top + PEEK_PAD);
  });

  /* ⚠️ THE ORDER OF THE TWO CLAMPS IS THE BUG THIS CATCHES. `Math.min` must run before
     `Math.max`, or a peek wider than its grid is clamped to a NEGATIVE left and drawn off the
     page — the one case where getting it backwards is invisible at every ordinary width. */
  it("a peek WIDER than the grid pins to the left edge, never to a negative one", () => {
    const narrow = { left: 40, top: 0, right: 140, bottom: 400 };   // 100px of grid
    const b = peekBox(cell(40, 100), narrow, 0);
    expect(b.width).toBe(160);
    expect(b.left).toBe(narrow.left + PEEK_PAD);
    expect(b.left).toBeGreaterThan(0);
  });

  it("the three tunable constants are named, and the scale is the one the box uses", () => {
    expect(PEEK_DELAY_MS).toBe(450);
    expect(PEEK_SCALE).toBe(1.6);
    expect(PEEK_OPACITY).toBe(0.97);
    /* derived from the constant rather than restated, so retuning PEEK_SCALE cannot desync them */
    expect(peekBox(cell(300, 100), GRID, 0).width).toBe(Math.round(100 * PEEK_SCALE));
  });
});

/* ══ VIEW MODES (finishing pack, Phase 3) ═══════════════════════════════════════════════════ */
describe("upcomingGridDays — the grid starts at today's week, in whole weeks", () => {
  /* August 2026: the 1st is a Saturday, so the grid runs 27 Jul → 6 Sep, six rows of seven */
  const AUG_FULL = monthGridDays("2026-08-12");

  it("keeps whole weeks — the lead-in days before today survive, dimmed by the page", () => {
    const got = upcomingGridDays("2026-08-12", "2026-08-12");
    expect(got.length % 7).toBe(0);
    /* today is a Wednesday; Mon 10 and Tue 11 are still in the row */
    expect(got[0]).toBe("2026-08-10");
    expect(got).toContain("2026-08-11");
    expect(got).toContain("2026-08-12");
  });

  it("drops only weeks that are ENTIRELY behind today", () => {
    const got = upcomingGridDays("2026-08-12", "2026-08-12");
    /* the 27 Jul–2 Aug and 3–9 Aug rows are wholly past and gone */
    expect(got).not.toContain("2026-07-27");
    expect(got).not.toContain("2026-08-09");
    /* and it runs to the end of the month's own grid, unchanged */
    expect(got[got.length - 1]).toBe(AUG_FULL[AUG_FULL.length - 1]);
  });

  it("a day that IS today keeps its week — the boundary is inclusive", () => {
    /* Sunday 9 Aug is a week's last day; on that day the week must survive */
    const got = upcomingGridDays("2026-08-12", "2026-08-09");
    expect(got).toContain("2026-08-03");
    expect(got).toContain("2026-08-09");
  });

  it("a FUTURE month is untouched — all of it is upcoming", () => {
    const sep = monthGridDays("2026-09-15");
    expect(upcomingGridDays("2026-09-15", "2026-08-12")).toEqual(sep);
  });

  /* ⚠️ THE HONEST ANSWER FOR A PAST MONTH IS NOTHING, and the page states it rather than
     clamping to "the last week anyway" — which would put a week of finished days under a
     heading promising upcoming work. */
  it("a PAST month yields nothing at all", () => {
    expect(upcomingGridDays("2026-07-15", "2026-08-12")).toEqual([]);
  });

  it("is always a subset of the anchor's own month grid — which is what keeps monthLabel true", () => {
    const got = upcomingGridDays("2026-08-12", "2026-08-12");
    for (const d of got) expect(AUG_FULL).toContain(d);
  });
});

/**
 * ⚠️ THE DEDUPE AND THE MODE TOUCH THE SAME CARDS AND MUST COMPOSE, NOT FIGHT — the pack asks for
 * both rules tested together, and this is why: with the record hidden the dedupe hands every
 * superseded done card straight BACK (correctly — nothing is left to supersede them), so a mode
 * that only hid the record would show MORE finished work than the mode it replaced, not less.
 */
describe("the mode and the dedupe compose", () => {
  const REC: RecordItem[] = [];
  const done = (key: string): CalendarItem =>
    ({ key, ymd: "2026-08-12", label: "Query sent", family: "done", struck: true, activityId: "a1" });
  /* ⚠️ `agent`, NOT AN INVENTED FAMILY. `CalFamily` is exactly "agent" | "task" | "snoozed" |
     "done", and a literal outside that set is an input the derivation cannot produce — the shape
     this repo has already been bitten by (a bucket a card could never carry, asserted for the life
     of a feature that had never rendered). `tsc` caught it here; it would not have if the field
     were typed loosely. */
  const live = (key: string): CalendarItem =>
    ({ key, ymd: "2026-08-12", label: "Send your full", family: "agent", card: {} as never });

  it("record OFF: the dedupe returns the done card — that is the rule it has always had", () => {
    expect(dedupeAgainstRecord([done("d1"), live("l1")], REC).map((i) => i.key))
      .toEqual(["d1", "l1"]);
  });

  it("and the MODE is what removes it, by family — never by the strikethrough", () => {
    const deduped = dedupeAgainstRecord([done("d1"), live("l1")], REC);
    const upcoming = deduped.filter((it) => it.family !== "done");
    expect(upcoming.map((i) => i.key)).toEqual(["l1"]);
  });

  /* the page's own composition, asserted at source so the two rules cannot be reordered apart */
  it("the page applies them in that order, and reads the family", () => {
    expect(pageSrc).toContain("dedupeAgainstRecord(dayData(ymd).items, recordFor(ymd))");
    expect(pageSrc).toContain('mode === "upcoming" ? deduped.filter((it) => it.family !== "done") : deduped');
    /* and the record is hidden through the SAME one function the retired toggle used */
    expect(pageSrc).toContain('mode === "both" ? recByDay.get(ymd) ?? [] : []');
  });

  it("⚠️ the retired toggle is GONE from the page, not merely unrendered", () => {
    const d = decls(pageSrc);
    expect(d).not.toContain("showRecord");
    expect(d).not.toContain("setShowRecord");
    expect(d).not.toMatch(/["\s`]cal-recbtn["\s`]/);
  });

  /* ⚠️ THE ROW COUNT IS COUNTED, NOT ASSUMED — a hard six against a five-row grid divides the
     height by one row too many and the fold caps tighter than it needs to, silently. */
  it("the fold's row count is measured from the grid, never the constant 6", () => {
    expect(pageSrc).toContain('el.querySelectorAll(".cal-cell").length / 7');
    expect(decls(pageSrc)).not.toContain("const rows = 6");
  });
});

/* ══ CARRIED-TASK ORIGIN GHOSTS (finishing pack, Phase 5) ═══════════════════════════════════ */
describe("ghostsFor — the origin mark for a carried item", () => {
  const TODAY_YMD = "2026-08-19";
  const carried = (key: string, from: string): CalendarItem =>
    ({ key, ymd: TODAY_YMD, label: "Send your full to Ana Duarte", family: "agent",
       card: { taskType: "full_requested" } as never, rolledFrom: from });
  const onTime = (key: string): CalendarItem =>
    ({ key, ymd: TODAY_YMD, label: "Send your partial", family: "agent",
       card: { taskType: "partial_requested" } as never });

  it("the ghost sits on the ORIGIN day while the live pill stays on today", () => {
    const todays = [carried("c1", "2026-08-07")];
    const ghosts = ghostsFor("2026-08-07", todays);
    expect(ghosts).toHaveLength(1);
    expect(ghosts[0].ymd).toBe("2026-08-07");
    /* it points AT the live item — the same object, so the two can never describe different work */
    expect(ghosts[0].of).toBe(todays[0]);
    /* and no ghost anywhere else */
    expect(ghostsFor("2026-08-08", todays)).toEqual([]);
  });

  it("the ghost's words ARE the live pill's words — one summarisation, not two", () => {
    const todays = [carried("c1", "2026-08-07")];
    expect(pillLabel(ghostsFor("2026-08-07", todays)[0].of)).toBe(pillLabel(todays[0]));
    expect(pillLabel(todays[0])).toBe("Send full");
  });

  /* ⚠️ COMPLETING IT MUST CLEAR BOTH IN ONE DERIVATION — there is no second store to sweep. */
  it("when the item leaves the feed the ghost vanishes in the same derivation", () => {
    expect(ghostsFor("2026-08-07", [])).toEqual([]);
  });

  it("an item that never rolled has no ghost anywhere", () => {
    const todays = [onTime("c2")];
    for (const d of monthGridDays(TODAY_YMD)) expect(ghostsFor(d, todays)).toEqual([]);
  });

  /* ⚠️ NO ORIGIN, NO GHOST — the live pill stands alone rather than a mark being invented for it. */
  it("a carried item with no recoverable origin renders live-only", () => {
    const noOrigin: CalendarItem =
      { key: "c3", ymd: TODAY_YMD, label: "Something", family: "agent", card: {} as never };
    for (const d of monthGridDays(TODAY_YMD)) expect(ghostsFor(d, [noOrigin])).toEqual([]);
  });

  /* ⚠️ THE KIND FILTER TAKES THE MARK AND THE PILL TOGETHER. The page derives ghosts from the
     ALREADY-FILTERED `itemsFor(today)`, so a switched-off kind cannot leave an orphaned ghost
     pointing at a pill that is not on screen. Asserted through the real predicate, not a literal. */
  it("a filtered-out kind renders NEITHER the pill nor its ghost", () => {
    const todays = [carried("c1", "2026-08-07")];
    const kind = itemKind(todays[0]);
    expect(kind, "the fixture's kind is unclaimed — the assertion would prove nothing").not.toBeNull();
    const without = allKinds().filter((k) => k !== kind);
    const survivingToday = todays.filter((it) => itemInKinds(it, without));
    expect(survivingToday).toEqual([]);
    expect(ghostsFor("2026-08-07", survivingToday)).toEqual([]);
  });

  /* ⚠️ AND A GHOST IS NEVER DEDUPED AGAINST THE RECORD — the two touch the same cells, which is
     exactly why this is asserted rather than assumed. A carried task is not an activity; nothing
     happened on its origin day. Deduping would let a record entry there delete the mark for work
     still outstanding. */
  it("a record entry on the origin day does NOT remove the ghost", () => {
    const todays = [carried("c1", "2026-08-07")];
    const rec: RecordItem = { key: "r1", ymd: "2026-08-07", label: "Query sent", dir: "out",
      queryId: "q1", activityId: "a1", agent: "Ana Duarte", agency: "Duarte", manuscriptId: "m1",
      note: "", detail: "", exchange: 1, turned: false };
    /* the page never passes ghosts through the dedupe; this states the consequence of that */
    expect(ghostsFor("2026-08-07", todays)).toHaveLength(1);
    expect(dedupeAgainstRecord(todays, [rec]).length).toBe(todays.length);
  });

  it("the page derives ghosts from TODAY's items and keeps them out of the dedupe", () => {
    expect(pageSrc).toContain("ghostsFor(ymd, itemsFor(today))");
    /* the dedupe's only argument is the day's own items — never a ghost list */
    expect(pageSrc).toContain("dedupeAgainstRecord(dayData(ymd).items, recordFor(ymd))");
    expect(decls(pageSrc)).not.toMatch(/dedupeAgainstRecord\([^)]*ghost/i);
  });

  /* ⚠️ A GHOST PAYS FOR ITS SLOT. It is the same box as any pill, so a fold that ignored it would
     draw one pill too many into room for the cap — the silent shrink this file already records. */
  it("ghosts travel through cellSlots as ordinary occupants", () => {
    expect(pageSrc).toContain("const occupants: Occupant[] = [");
    expect(pageSrc).toContain("cellSlots(occupants, recs, cellCap, cellCapFolded)");
  });

  it("ghosts never appear in the day panel — the age line carries the fact there", () => {
    const d = decls(pageSrc);
    /* the panel renders liveRow/record rows only; no ghost component is mounted inside it */
    const panelStart = d.indexOf("const liveRow = (it: CalendarItem");
    expect(panelStart, "liveRow is missing — the slice would prove nothing").toBeGreaterThan(-1);
    const panelEnd = d.indexOf("export const TodoCalendarPage");
    expect(panelEnd, "the page component is missing — the slice would run to EOF").toBeGreaterThan(panelStart);
    expect(d.slice(panelStart, panelEnd)).not.toContain("GhostPip");
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
describe("the calendar's action surface — scoped presentation, untouched behaviour", () => {
  it("it is still FocusFlow, with the page's REAL toast and navigation", () => {
    expect(pageSrc).toContain("<FocusFlow");
    /* the two that were `() => {}` and made completions silent — and therefore un-undoable */
    expect(pageSrc).toContain("onNavigate={onNavigate}");
    expect(pageSrc).toContain("onToast={flash}");
    const d = decls(pageSrc);
    expect(d).not.toContain("onToast={() => {}}");
    expect(d).not.toContain("onNavigate={() => {}}");
  });

  /* ⚠️ THE PRESENTATION IS SCOPED FROM THIS PAGE'S OWN SHEET, because FocusFlow is read-only
     territory. The wrapper carries a class and nothing else — everything inside it is fixed. */
  it("the mount is wrapped so the width can be scoped without touching FocusFlow", () => {
    expect(pageSrc).toContain('<div className="cal-flow">');
    expect(calCss).toContain(".cal-flow .tdb-ffstage .tdb-ffsheet");
  });

  /* ⚠️ 0-3-0, DELIBERATELY. `.tdb-ffwrap .tdb-ffsheet` in todo.css is 0-2-0, so a two-class rule
     here would TIE and be decided by bundler order — the page-versus-component cascade trap this
     repo records. Asserted structurally: every `.cal-flow` sheet rule carries three classes. */
  it("the scoping rule outranks the component's own without !important", () => {
    const rules = calCss.split("\n").filter((l) => l.trim().startsWith(".cal-flow") && l.includes("{"));
    expect(rules.length, "no .cal-flow rules found — the assertion would prove nothing").toBeGreaterThan(0);
    for (const r of rules) {
      const sel = r.slice(0, r.indexOf("{"));
      expect((sel.match(/\./g) ?? []).length, `too weak to outrank todo.css: ${sel.trim()}`)
        .toBeGreaterThanOrEqual(3);
      expect(r, `!important should not be needed: ${sel.trim()}`).not.toContain("!important");
    }
  });

  /* ⚠️ CLOSING DOES NOT CLEAR THE DAY. `onClose` nulls the card and nothing else, so the panel
     stays on the day the writer was reading and re-derives from the feed the write just changed. */
  it("closing keeps the day selected", () => {
    expect(pageSrc).toContain("onClose={() => setFlowCard(null)}");
    expect(decls(pageSrc)).not.toMatch(/onClose=\{[^}]*setSelDay/);
  });
});

/* ══ THE COLLAPSIBLE DAY PANEL (foot-panel pack, Phase 2) ═══════════════════════════════════ */
describe("the collapsible day panel — one chevron, scoped click-away, reopen on read", () => {
  it("session-local state, defaulting open, never persisted", () => {
    expect(pageSrc).toContain("const [panelOpen, setPanelOpen] = useState(true)");
    const d = decls(pageSrc);
    expect(d).not.toMatch(/localStorage[^\n]*panel/i);
    expect(d).not.toMatch(/panelOpen[^\n]*localStorage/);
  });

  it("ONE chevron mount — remounting per state would drop keyboard focus on toggle", () => {
    const d = decls(pageSrc);
    const mounts = d.match(/className="cal-paneltab"/g) ?? [];
    expect(mounts).toHaveLength(1);
    expect(pageSrc).toContain("aria-expanded={panelOpen}");
    expect(pageSrc).toContain('aria-label={panelOpen ? "Hide the day panel" : "Show the day panel"}');
  });

  /* ⚠️ THE PANEL WIDTH IS ONE TOKEN, TWO READERS — the template and the chevron's open position.
     Restated, they drift the day someone widens the panel. */
  it("the chevron's open position reads the SAME token as the grid template", () => {
    expect(calCss).toContain("--cal-panel-w: 370px");
    expect(calCss).toContain("grid-template-columns: minmax(0, 1fr) var(--cal-panel-w)");
    expect(calCss).toContain("right: calc(var(--cal-panel-w) - 13px)");
    /* and nothing else restates the panel's width as a literal */
    const d = decls(calCss);
    expect((d.match(/370px/g) ?? []).length, "370px restated outside the token").toBe(1);
  });

  it("hidden, never unrendered — CalDayPanel stays mounted in both states", () => {
    /* the class hides it in CSS; the JSX mounts it unconditionally */
    expect(calCss).toContain(".cal-nopanel .cal-focus { display: none; }");
    const d = decls(pageSrc);
    expect(d).not.toMatch(/panelOpen\s*&&\s*<CalDayPanel/);
  });

  /* ⚠️ THE COLLAPSE LIVES INSIDE min-width: 1080px — that IS "the state is ignored below 1080".
     A bare .cal-nopanel rule would hide the panel from the narrow single-column world, where it
     is the only reading surface on the page. */
  it("the collapse rules are fenced to ≥1080, and the chevron hides below it", () => {
    const wide = sliceBetween(calCss, "@media (min-width: 1080px)", ".cal-paneltab {");
    expect(wide).toContain(".cal-nopanel { grid-template-columns: minmax(0, 1fr); }");
    expect(wide).toContain(".cal-nopanel .cal-focus { display: none; }");
    const narrow = sliceBetween(calCss, "@media (max-width: 1079px)", "/* ══ THE HOVER PEEK");
    expect(narrow).toContain(".cal-paneltab { display: none; }");
  });

  /* ⚠️ REOPEN RIDES THE THREE SELECTION HELPERS, not the cell's onClick — so a pip, a ghost and
     whitespace all reopen by the same rule, and a future fourth caller inherits it. */
  it("selecting a day while collapsed reopens, through every selection path", () => {
    expect(pageSrc).toContain("const reopenForReading = () => setPanelOpen((o) => (o ? o : true));");
    for (const helper of ["const selectDay", "const focusCard", "const focusRecord"]) {
      const i = pageSrc.indexOf(helper);
      expect(i, `${helper} is missing — the slice would prove nothing`).toBeGreaterThan(-1);
      /* ⚠️ THE SLICE IS THE LINE, NOT "to the first semicolon" — these are one-line arrow bodies
         whose first `;` is an interior statement, so a semicolon slice stops before the rider and
         reports it missing on a correct file. The line end cannot. */
      expect(pageSrc.slice(i, pageSrc.indexOf("\n", i))).toContain("reopenForReading()");
    }
  });

  /* ⚠️ THE CLICK-AWAY IS SCOPED TO THE PAGE ROOT, NEVER `document` — portalled surfaces and the
     shell's chrome must not collapse the panel, and that falls out of the scoping rather than out
     of an exception list that would go stale. */
  it("the click-away hangs on the page's own root, with the pack's four exclusions", () => {
    expect(pageSrc).toContain("root.addEventListener(\"pointerdown\", onDown)");
    expect(pageSrc).toContain('t.closest(".cal-grid, .cal-focus, .cal-paneltab, .tpl-tools")');
    const d = decls(pageSrc);
    expect(d).not.toMatch(/document\.addEventListener\("pointerdown"/);
    expect(d).not.toMatch(/window\.addEventListener\("pointerdown"/);
  });
});

/* ══ DRAG YOUR OWN TASKS (proposals pack, Phase 2) ══════════════════════════════════════════ */
describe("draggableTask — only writer-owned pills drag; you cannot drag a fact", () => {
  const task = (over: Partial<CalendarItem> = {}): CalendarItem =>
    ({ key: "t1", ymd: "2026-08-12", label: "Buy stamps", family: "task",
       card: { userTaskId: "ut1" } as never, ...over });

  it("a writer's own dated task drags", () => {
    expect(draggableTask(task())).toBe(true);
  });

  it("every DERIVED pill refuses — send, snoozed return, done, and a card with no task id", () => {
    /* an agent-family card (send/nudge/decide) is derived from the query's state */
    expect(draggableTask(task({ family: "agent", card: { taskType: "full_requested" } as never }))).toBe(false);
    /* a snoozed return is flag-derived — family "snoozed" even though it has a card */
    expect(draggableTask(task({ family: "snoozed" }))).toBe(false);
    /* a completed item belongs to the log */
    expect(draggableTask(task({ family: "done", struck: true, card: undefined }))).toBe(false);
    /* and no write key means no drag, whatever the family claims */
    expect(draggableTask(task({ card: {} as never }))).toBe(false);
  });

  /* ⚠️ THE PAGE'S WIRING, at source: the drag prop is GATED on the predicate, the payload is the
     write's own key, and the drop writes dueDate ALONE through the existing writer. */
  it("the cell gates drag on the predicate and the drop writes dueDate alone", () => {
    expect(pageSrc).toContain("drag={draggableTask(o.it) ? {");
    expect(pageSrc).toContain("updateUserTask(dragTask.id, { dueDate: ymd })");
    /* nothing else rides the write — no status, no completedAt, no committedDate */
    const d = decls(pageSrc);
    expect(d).not.toMatch(/updateUserTask\([^)]*\{[^}]*(status|completedAt|committedDate)/);
  });

  /* ⚠️ THE ORIGIN DAY IS A NO-OP BY CONSTRUCTION — dragover only permits a DIFFERENT day, so the
     browser never allows the drop and no write can fire. Stronger than a check inside the write. */
  it("dropping on the origin day cannot write", () => {
    expect(pageSrc).toContain("dragTask && ymd !== dragTask.from ? (e) => { e.preventDefault();");
    expect(pageSrc).toContain('if (!dragTask || ymd === dragTask.from) { endDrag(); return; }');
  });

  /* ⚠️ THE PEEK'S COPIES DO NOT DRAG: the drag prop is opt-in per mount and the peek passes none —
     asserted by the peek's render lines carrying no drag prop. */
  it("the peek's pills carry no drag", () => {
    const i = pageSrc.indexOf('{itemsFor(peek.ymd).map((it) => <ItemPip key={it.key} it={it} />)}');
    expect(i, "the peek's item render moved — the assertion would prove nothing").toBeGreaterThan(-1);
  });

  /* ⚠️ THE /todo ROW FOLLOWS IN THE SAME DERIVATION — asserted at the derivation, not the pixels:
     the calendar places a task by the SAME `dueYmd` the board's card carries, so one write moves
     both surfaces. And a moved task LOSES ITS GHOST, because the ghost is derived from
     `rolledFrom`, which exists only while the action date is behind today. */
  it("a moved task re-derives: new day holds it, old day is empty, the ghost is gone", () => {
    const base = {
      cols: { todo: [], today: [], snoozed: [], dismissed: [], done: [] },
      flags: [], queries: [], agents: [], userTasks: [], activities: [],
      today: "2026-08-19", nowMs: Date.parse("2026-08-19T12:00:00"),
    };
    const AUG = monthGridDays("2026-08-19");
    const cardAt = (due: string) =>
      ({ key: "c-ut1", title: "Buy stamps", userTaskId: "ut1", dueYmd: due, stream: "do" } as never);

    /* before the drag: due 7 Aug, behind today → rolled onto today, ghost on the 7th */
    const before = calendarDays({ ...base, cols: { ...base.cols, todo: [cardAt("2026-08-07")] } } as never, AUG);
    const carried = before.get("2026-08-19")!.items[0];
    expect(carried.rolledFrom).toBe("2026-08-07");
    expect(ghostsFor("2026-08-07", [carried])).toHaveLength(1);

    /* after the drop on the 25th: the SAME derivation, the store's dueYmd changed — that is all */
    const after = calendarDays({ ...base, cols: { ...base.cols, todo: [cardAt("2026-08-25")] } } as never, AUG);
    expect(after.get("2026-08-25")!.items.map((i) => i.label)).toEqual(["Buy stamps"]);
    expect(after.get("2026-08-07")?.items ?? []).toEqual([]);
    expect(after.get("2026-08-19")?.items ?? []).toEqual([]);
    const moved = after.get("2026-08-25")!.items[0];
    expect(moved.rolledFrom).toBeUndefined();
    for (const d of AUG) expect(ghostsFor(d, [moved])).toEqual([]);
  });
});

/* ══ EXPECTED DATES (proposals pack, Phase 3) ═══════════════════════════════════════════════ */
describe("expectedDays — the reply window, resolved and never read raw", () => {
  const AUG = monthGridDays("2026-08-19");
  const TODAY_X = "2026-08-19";
  const agent = (over: Partial<Agent> = {}): Agent =>
    ({ id: "ag1", name: "Dara Okafor", agency: "Okafor Reps", responseTimeWeeks: 12, ...over } as Agent);
  const waiting = (over: Partial<Query> = {}): Query =>
    ({ id: "q1", agentId: "ag1", status: QueryStatus.QUERIED,
       dateSent: "2026-06-03T09:00:00Z", ...over } as Query);

  it("agent source: the stated weeks from the latest send, on its resolved day", () => {
    /* 3 Jun + 12 weeks = 26 Aug */
    const m = expectedDays([waiting()], [agent()], AUG, TODAY_X);
    const items = [...m.values()].flat();
    expect(items).toHaveLength(1);
    expect(items[0].ymd).toBe("2026-08-26");
    expect(items[0].source).toBe("agent");
    expect(items[0].weeks).toBe(12);
    expect(items[0].fromYmd).toBe("2026-06-03");
    expect(expectedLine(items[0])).toBe("Their stated 12 weeks · from 3 Jun");
  });

  it("writer source: their own date, with the set-moment when it was stamped", () => {
    const q = waiting({
      responseDeadline: undefined,
      writerExpectedDate: "2026-08-28T00:00:00Z",
      writerExpectedSetAt: "2026-08-12T10:00:00Z",
    } as never);
    const m = expectedDays([q], [agent({ responseTimeWeeks: undefined })], AUG, TODAY_X);
    const items = [...m.values()].flat();
    expect(items).toHaveLength(1);
    expect(items[0].source).toBe("writer");
    expect(items[0].ymd).toBe("2026-08-28");
    expect(expectedLine(items[0])).toBe("Your date · set 12 Aug");
  });

  /* ⚠️ AN UNSTAMPED LEGACY DATE OMITS THE CLAUSE — never invents a moment. */
  it("a legacy writer date with no set-stamp reads 'Your date' alone", () => {
    expect(expectedLine({ key: "e", ymd: "2026-08-28", queryId: "q", agent: "", source: "writer" }))
      .toBe("Your date");
  });

  /* ⚠️ NOBODY STATED ANYTHING → NOTHING. The resolver refuses the house fallback for exactly this
     reason; a pill here would assert a window nobody gave. */
  it("null source renders nothing — no stated weeks, no writer date", () => {
    const m = expectedDays([waiting()], [agent({ responseTimeWeeks: undefined })], AUG, TODAY_X);
    expect([...m.values()].flat()).toEqual([]);
  });

  it("a query CLOSED before its window renders nothing — waiting queries only", () => {
    for (const status of [QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE]) {
      const m = expectedDays([waiting({ status })], [agent()], AUG, TODAY_X);
      expect([...m.values()].flat(), status).toEqual([]);
    }
    /* and a writer's-turn query is not waiting on a reply either */
    const m = expectedDays([waiting({ status: QueryStatus.FULL_REQUESTED })], [agent()], AUG, TODAY_X);
    expect([...m.values()].flat()).toEqual([]);
  });

  /* ⚠️ A PASSED DATE SIMPLY STOPS RENDERING — no expiry pill, no expiry copy (its ruling is
     flagged, not invented overnight), and dashed-on-a-past-day would break the house grammar. */
  it("a window already behind today renders nothing", () => {
    /* 1 May + 12 weeks = 24 Jul — inside the grid's lead-in? No: AUG starts 27 Jul, so use a
       date that lands ON a visible past day to prove the today-gate, not the visibility gate */
    const q = waiting({ dateSent: "2026-05-14T09:00:00Z" });   /* + 12wk = 6 Aug, visible, past */
    const m = expectedDays([q], [agent()], AUG, TODAY_X);
    expect([...m.values()].flat()).toEqual([]);
  });

  it("day bucketing: the anchor is the LATEST send across the three stages", () => {
    const q = waiting({ status: QueryStatus.FULL_SENT, dateSent: "2026-03-01T09:00:00Z",
      fullSentDate: "2026-06-10T09:00:00Z" } as Partial<Query>);
    const m = expectedDays([q], [agent()], AUG, TODAY_X);
    const items = [...m.values()].flat();
    /* 10 Jun + 12 weeks = 2 Sep — in August's trailing week */
    expect(items).toHaveLength(1);
    expect(items[0].ymd).toBe("2026-09-02");
    expect(items[0].fromYmd).toBe("2026-06-10");
  });

  it("expected dates file under Agent responses — never a seventh kind", () => {
    expect(CAL_KIND_ORDER).toHaveLength(6);
    expect(CAL_KINDS.responses.expected).toBe(true);
    expect(expectedInKinds(allKinds())).toBe(true);
    expect(expectedInKinds(allKinds().filter((k) => k !== "responses"))).toBe(false);
    /* derived from the const, never a literal — switching the flag moves the reader with it */
    expect(expectedInKinds(["responses"])).toBe(true);
  });

  /* ⚠️ NEVER DEDUPED AGAINST THE RECORD — separate derivation, separate reader, asserted at
     source since the dedupe and this layer touch the same cells. */
  it("the page keeps the expected layer out of the dedupe", () => {
    expect(pageSrc).toContain("dedupeAgainstRecord(dayData(ymd).items, recordFor(ymd))");
    expect(decls(pageSrc)).not.toMatch(/dedupeAgainstRecord\([^)]*exp/i);
    /* and it pays for cell slots like any pill */
    expect(pageSrc).toContain('...exps.map((x) => ({ t: "exp", x } as const))');
  });

  /* ⚠️ THE PRONOUN LAW OUTRANKS THE PACK'S EXAMPLE COPY — "Her stated 12 weeks" was the pack's
     line; the app never stores an agent's pronouns and they/them is the standing rule. */
  it("no gendered pronoun can reach the source line", () => {
    const lib = readFileSync(join(here, "todoCalendar.ts"), "utf8");
    const i = lib.indexOf("export function expectedLine");
    expect(i).toBeGreaterThan(-1);
    expect(decls(lib.slice(i, i + 700))).not.toMatch(/\b(his|her|hers|he|she)\b/i);
  });
});
