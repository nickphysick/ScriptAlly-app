/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The return boundary (tasks-audit pack, Phase 1).
 *
 * ⚠️ THE ADMISSION THIS SUITE CARRIES: the partition tests PASSED while the page double-rendered,
 * because no fixture ever sat ON the boundary. Every snoozed fixture was safely in the future and
 * every returned one safely in the past — the seam between them (snoozedUntil = today) was the
 * one day nobody wrote down, and it was the day the audit walked. The boundary fixtures below —
 * yesterday, TODAY, tomorrow — are the missing rows, and the today row is the one that fails on
 * the old code.
 *
 * THE LAW: day-level, one choke (taskFlags.flagSleeps / flagReturnedToday, the same local clock
 * the calendar uses). Sleeping = the Snoozed column only. Returned = the lanes only, chipped on
 * the return day. An OFFER's flag is its "I need time" quiet reminder and never a put-away —
 * it may not enter the Snoozed column at all (the offerGuard's own standing law).
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sliceBetween } from "../../test/sliceBetween";
import { TaskFlag, UserTask, Task } from "../../types";
import { flagSleeps, flagReturnedToday, isFlagSuppressing } from "../../lib/taskFlags";
import { assembleBoardColumns, snoozedCards, liveBoardCards } from "../../lib/todoColumns";
import { facetCounts } from "../../lib/todoBoardSort";
import { calendarDays, monthGridDays } from "../../lib/todoCalendar";
import { TodoBoard } from "./TodoBoard";

const here = __dirname;
const db = readFileSync(join(here, "..", "..", "lib", "db.tsx"), "utf8");
const flagsLib = readFileSync(join(here, "..", "..", "lib", "taskFlags.ts"), "utf8");

const NOW = Date.parse("2026-08-07T12:00:00");
const TODAY = "2026-08-07";
const flag = (until: string, over: Partial<TaskFlag> = {}): TaskFlag =>
  ({ id: "f1", userId: "u", taskType: "user_task", queryId: "t1", snoozeCount: 1, snoozedUntil: until, ...over });
const task = (over: Partial<UserTask> = {}): UserTask =>
  ({ id: "t1", userId: "u", text: "Chase the reference", done: false, dueDate: "2026-08-07", createdAt: "", updatedAt: "", ...over });

const EMPTY = { tasks: [] as Task[], userTasks: [] as UserTask[], queries: [], agents: [], manuscripts: [], activities: [], taskFlags: [] as TaskFlag[], today: TODAY, now: NOW };

/** The full pure path a page walks: the engine's user-card suppression + the columns. */
const build = (flags: TaskFlag[], userTasks: UserTask[]) =>
  assembleBoardColumns({ ...EMPTY, taskFlags: flags, userTasks });

/* ── the choke, at the boundary ────────────────────────────────────────────────────────────── */

describe("⚠️ the choke: day-level, one clock — yesterday / TODAY / tomorrow", () => {
  it("tomorrow sleeps; today and yesterday are returned — whatever the HOUR says", () => {
    expect(flagSleeps(flag("2026-08-08T00:00:00"), NOW)).toBe(true);   // tomorrow
    expect(flagSleeps(flag("2026-08-07T09:00:00"), NOW)).toBe(false);  // this morning — returned
    expect(flagSleeps(flag("2026-08-07T23:00:00"), NOW)).toBe(false);  // TONIGHT — returned ALL day
    expect(flagSleeps(flag("2026-08-06T09:00:00"), NOW)).toBe(false);  // yesterday
  });

  it("returnedToday is the return DAY only — never yesterday's return, never tomorrow's", () => {
    expect(flagReturnedToday(flag("2026-08-07T23:00:00"), NOW)).toBe(true);
    expect(flagReturnedToday(flag("2026-08-06T09:00:00"), NOW)).toBe(false);
    expect(flagReturnedToday(flag("2026-08-08T09:00:00"), NOW)).toBe(false);
  });

  it("⚠️ every consumer reads THIS boundary: the engine's suppression delegates; no instant compare survives", () => {
    /* ⚠️ THE CLAIM IS THE DELEGATION, NOT THE BODY (pane round, Phase 7). This quoted the whole
       function verbatim, so it went red the day a SECOND state was added beside the first — a true
       change failing a case that was written about a different question. What it exists to stop is
       an INSTANT COMPARE creeping back in, so that is what it asserts: the boundary function is
       called, and no local date arithmetic sits beside it. */
    const body = sliceBetween(flagsLib, "export function isFlagSuppressing", "\n}");
    expect(body).toContain("flagSleeps(flag, now)");
    expect(body, "an instant compare came back").not.toMatch(/Date\.parse|getTime\(\)|[<>]=?\s*now/);
    expect(isFlagSuppressing(flag("2026-08-07T23:00:00"), NOW)).toBe(false); // returned → not suppressed
    /* ⚠️ AND THE SECOND STATE HAS NO CLOCK AT ALL — a dismissal suppresses whatever `now` says,
       which is exactly the promise its dialog makes. Both directions, so the clause cannot be
       satisfied by a function that ignores the field. */
    expect(isFlagSuppressing({ ...flag("2026-08-06T09:00:00"), skippedAt: "2026-08-01T00:00:00.000Z" }, NOW)).toBe(true);
    expect(isFlagSuppressing({ ...flag("2026-08-06T09:00:00"), skippedAt: "" }, NOW)).toBe(false);
    // the engine keeps its OFFER exemption (quiet mode) — the column-side law is what changed
    expect(db).toContain('isFlagSuppressing(flag, nowMs) && t.taskType !== "offer_received"');
  });
});

/* ── the missing fixture: single placement across board, counts, calendar ──────────────────── */

describe("⚠️ THE BOUNDARY FIXTURE — snoozed-until-TODAY renders ONCE, in the lanes, chipped", () => {
  const returned = build([flag("2026-08-07T09:00:00")], [task()]);
  const sleeping = build([flag("2026-08-08T09:00:00")], [task()]);

  it("until-today: in the lanes once (surfaced → Today), NEVER in the Snoozed column", () => {
    const lanes = [...returned.cols.todo, ...returned.cols.today];
    expect(lanes.filter((c) => c.userTaskId === "t1")).toHaveLength(1);
    expect(returned.cols.snoozed).toHaveLength(0);
    expect(lanes.find((c) => c.userTaskId === "t1")!.returnedToday).toBe(true);
  });

  it("until-tomorrow: in the Snoozed column once, NEVER in the lanes, no chip", () => {
    expect(sleeping.cols.snoozed).toHaveLength(1);
    expect([...sleeping.cols.todo, ...sleeping.cols.today].some((c) => c.userTaskId === "t1")).toBe(false);
    expect(sleeping.cols.snoozed[0].returnedToday).toBeUndefined();
  });

  it("⚠️ the COUNTS see it exactly once either side of the boundary", () => {
    expect(facetCounts(liveBoardCards(returned.cols)).all).toBe(1);
    expect(facetCounts(liveBoardCards(sleeping.cols)).all).toBe(1);
  });

  it("⚠️ the DOM renders the title once, with the chip, on the return day only", () => {
    const html = renderToStaticMarkup(
      <TodoBoard columns={returned.cols} onPlan={() => {}} onOpen={() => {}} onVerb={() => {}} />,
    );
    // the TITLE NODE (aria-labels echo the title on the card and its seat — count the element)
    expect(html.match(/>Chase the reference</g)?.length).toBe(1);
    expect(html).toContain("🕐 SNOOZED · BACK TODAY");
    const sleepingHtml = renderToStaticMarkup(
      <TodoBoard columns={sleeping.cols} onPlan={() => {}} onOpen={() => {}} onVerb={() => {}} />,
    );
    expect(sleepingHtml.match(/>Chase the reference</g)?.length).toBe(1); // the Snoozed card
    expect(sleepingHtml).not.toContain("BACK TODAY");
  });

  it("⚠️ the CALENDAR shows one pip today — parchment (the returned family), never a second", () => {
    const AUG = monthGridDays(TODAY);
    const days = calendarDays({
      cols: returned.cols, flags: [flag("2026-08-07T09:00:00")], queries: [], agents: [],
      userTasks: [], activities: [], today: TODAY, nowMs: NOW,
    }, AUG);
    const todayItems = days.get(TODAY)!.items;
    expect(todayItems).toHaveLength(1);
    expect(todayItems[0].family).toBe("snoozed"); // parchment — "this came back", not "this just landed"
    // and the sleeping side: one snz pip on ITS day, nothing today
    const sleepDays = calendarDays({
      cols: sleeping.cols, flags: [flag("2026-08-08T09:00:00")], queries: [], agents: [],
      userTasks: [], activities: [], today: TODAY, nowMs: NOW,
    }, AUG);
    expect(sleepDays.get("2026-08-08")!.items).toHaveLength(1);
    expect((sleepDays.get(TODAY)?.items ?? [])).toHaveLength(0);
  });
});

/* ── the offer: its flag is a quiet reminder, never a put-away ─────────────────────────────── */

describe("⚠️ an offer's snooze flag NEVER enters the Snoozed column (the audit's double render)", () => {
  it("a sleeping offer flag yields no Snoozed card — the engine keeps the card on the board, quieter", () => {
    const offerFlag = flag("2026-08-08T09:00:00", { taskType: "offer_received", queryId: "q1" });
    expect(snoozedCards({ flags: [offerFlag], queries: [], agents: [], nowMs: NOW })).toHaveLength(0);
    // …while a non-offer flag of the same shape DOES sleep there
    const staleFlag = flag("2026-08-08T09:00:00", { taskType: "no_response_close", queryId: "q1" });
    expect(snoozedCards({ flags: [staleFlag], queries: [], agents: [], nowMs: NOW })).toHaveLength(1);
  });

  it("the calendar refuses the offer flag's return pip for the same reason", () => {
    const calSrc = readFileSync(join(here, "..", "..", "lib", "todoCalendar.ts"), "utf8");
    expect(calSrc).toContain('f.taskType === "offer_received") continue');
  });
});
