/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * todoActions — THE SINGLE PATH for completion, snooze and dock entry (tasks-consolidation,
 * extraction commit).
 *
 * ⚠️ WHAT THIS SUITE IS FOR. The three decisions lived as closures inside `ToDoPage.tsx`, a
 * 2,247-line component that the consolidation is about to replace. A choke point inside the file
 * being rewritten is a coincidence, not a guarantee — so these tests do two jobs:
 *   1. pin the decisions themselves, away from any component; and
 *   2. assert the PAGE routes through them rather than re-deciding inline.
 * The second half is the one that survives the rebuild, because it fails the moment a new page
 * grows its own copy of a rule that already exists here.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  clampSnooze, snoozeCeilingDays, snoozeWhenLabel, snoozeVia, cardLane,
  completionVia, isTickable, dockQueue, snoozeDateLabel, stopTitle,
  SNOOZE_MAX_DAYS, OFFER_SNOOZE_MAX_DAYS, SNOOZE_STOPS,
} from "./todoActions";
import { BoardCard } from "./todoBoard";

const page = readFileSync(join(__dirname, "..", "components", "todo", "ToDoPage.tsx"), "utf8");

const card = (over: Partial<BoardCard> = {}): BoardCard => ({
  key: "k", stream: "do", title: "t", who: "", subtitle: "", due: "", warn: false, snoozes: 0,
  hk: false, initials: "•", record: "", committed: false, done: false, ...over,
});

describe("⚠️ THE SNOOZE CEILING — one clamp, and every path reaches it", () => {
  it("an offer cannot be put off past tomorrow", () => {
    /* Someone is waiting on an answer; a week's silence is not a decision. This shipped wrong
       once — the cap lived in one menu's tier list, so every other path walked past it and an
       offer surfaced reading "BACK 7 AUG". */
    const offer = card({ taskType: "offer_received" });
    expect(snoozeCeilingDays(offer)).toBe(OFFER_SNOOZE_MAX_DAYS);
    expect(clampSnooze(offer, 7, "next week")).toEqual({ days: 1, when: "tomorrow", clamped: true });
    expect(clampSnooze(offer, 365, "in a year").days).toBe(1);
  });

  it("⚠️ A CLAMPED SNOOZE IS RE-LABELLED — the toast must not keep saying what it did not write", () => {
    expect(clampSnooze(card({ taskType: "offer_received" }), 7, "next week").when).toBe("tomorrow");
  });

  it("a deadline never snoozes past the deadline itself", () => {
    /* Snoozing an expiring exclusive past its expiry is the app helping you miss it. */
    const c = card({ taskType: "exclusive_expiring" });
    /* ⚠️ 10 days is NOT a stop, so it is named as itself. The first draft rounded a between-stops
       clamp UP to the next tier — a clamp that wrote 4 days and announced 7. (This case used 4
       days until the scale widened to twelve stops and 4 became one of them; the property under
       test is "a value between stops is stated, never rounded", so it needed a value that is
       still between stops.) */
    expect(clampSnooze(c, 30, "in a month", 10)).toEqual({ days: 10, when: "in 10 days", clamped: true });
    // an exact stop keeps the stop's own words
    expect(clampSnooze(c, 30, "in a month", 7).when).toBe("next week");
    // a deadline already past clamps to nothing at all — the caller reads 0 as "cannot snooze"
    expect(snoozeCeilingDays(c, 0)).toBe(0);
    expect(snoozeCeilingDays(c, -3)).toBe(0);
  });

  it("everything else gets a year, and a request within the ceiling passes through untouched", () => {
    const c = card({ taskType: "data_quality_poor" });
    expect(snoozeCeilingDays(c)).toBe(SNOOZE_MAX_DAYS);
    expect(clampSnooze(c, 7, "next week")).toEqual({ days: 7, when: "next week", clamped: false });
    expect(clampSnooze(c, 9999, "never").days).toBe(SNOOZE_MAX_DAYS);
  });

  it("the stop labels read as English at every tier", () => {
    expect(snoozeWhenLabel(1)).toBe("tomorrow");
    expect(snoozeWhenLabel(3)).toBe("in three days");
    expect(snoozeWhenLabel(7)).toBe("next week");
    expect(snoozeWhenLabel(14)).toBe("in two weeks");
    expect(snoozeWhenLabel(30)).toBe("in a month");
    expect(snoozeWhenLabel(90)).toBe("in three months");
    expect(snoozeWhenLabel(10)).toBe("in 10 days"); // between stops — stated, never rounded
    expect(snoozeWhenLabel(0)).toBe("not at all");
  });

  /**
   * ⚠️ TWELVE STOPS (Fix 4 revision; ref todo-weight-slider-v1.html). Fine where a day is a real
   * difference, coarse where nobody is choosing between the 61st and the 62nd.
   */
  it("the scale is 1–6 days, then 1–3 weeks, then 1–3 months — twelve, ascending, no repeats", () => {
    expect(SNOOZE_STOPS.map((s) => s.days)).toEqual([1, 2, 3, 4, 5, 6, 7, 14, 21, 30, 60, 90]);
    /* every stop carries BOTH registers, or one surface names it and another cannot */
    for (const s of SNOOZE_STOPS) {
      expect(s.label.length, `${s.days} has no prose`).toBeGreaterThan(0);
      expect(s.tick.length, `${s.days} has no tick`).toBeGreaterThan(0);
    }
  });

  it("⚠️ THE PRINTED AXIS IS FOUR MARKS, AND EACH SITS ON A REAL STOP", () => {
    /* Twelve labels under one track collide into a smear. The marks live ON the table so they
       cannot drift off the stops they name — and `Shift`+arrow travels these same four, so the
       axis the reader sees is the axis the keyboard uses. */
    const axis = SNOOZE_STOPS.filter((s) => s.axis);
    expect(axis.map((s) => s.axis)).toEqual(["1D", "1W", "1M", "3M"]);
    expect(axis.map((s) => s.days)).toEqual([1, 7, 30, 90]);
    /* the last stop is a mark, so Shift+→ always has somewhere to land */
    expect(SNOOZE_STOPS[SNOOZE_STOPS.length - 1].axis).toBe("3M");
  });

  it("`stopTitle` lowers the tick for the dial's Playfair line — one fact, two registers", () => {
    expect(stopTitle("TOMORROW")).toBe("Tomorrow");
    expect(stopTitle("3 WEEKS")).toBe("3 weeks");
    expect(stopTitle("1 MONTH")).toBe("1 month");
  });

  /**
   * ⚠️ THE RECEIPT AND THE BUTTON STATE A DATE, NOT A TIER — and the bug this replaces was live.
   * The page flashed `days === 1 ? "tomorrow" : "next week"`, a BINARY label over what was already
   * a five-stop scale: snoozing something for a month announced "Snoozed until next week". At
   * twelve stops it would have been wrong nine times out of twelve.
   */
  it("`snoozeDateLabel`: a weekday at one day, a date beyond it", () => {
    const mon = new Date(2026, 7, 10); // Monday 10 August 2026
    expect(snoozeDateLabel(1, mon)).toBe("Tuesday");
    expect(snoozeDateLabel(7, mon)).toBe("17 August");
    expect(snoozeDateLabel(21, mon)).toBe("31 August");
    expect(snoozeDateLabel(90, mon)).toBe("8 November");
  });

  it("…and the page's receipts all go through it — no binary tier label survives", () => {
    expect(page).toContain("flash(`Snoozed until ${snoozeDateLabel(days)}`,");
    expect(page).not.toContain('days === 1 ? "tomorrow" : "next week"');
    expect(page).not.toContain("flash(`Snoozed until next week`,");
  });

  it("⚠️ THE PAGE CALLS THE CLAMP — it no longer carries the rule itself", () => {
    expect(page).toContain("({ days, when } = clampSnooze(c, days, when))");
    // the old inline cap is GONE — a second copy is a second answer
    expect(page).not.toContain('c.taskType === "offer_received" && days > 1');
  });
});

describe("⚠️ WHICH WRITE PATH A SNOOZE TAKES — decided once", () => {
  it("a writer's own item goes through its task flag; an engine item through dismissTask", () => {
    expect(snoozeVia(card({ userTaskId: "u1" }))).toBe("user-task-flag");
    expect(snoozeVia(card({ taskType: "data_quality_poor", relatedRecordId: "a1" }))).toBe("dismiss-task");
  });

  it("a card with neither cannot be snoozed, and says so rather than writing a half key", () => {
    expect(snoozeVia(card())).toBe("none");
    expect(snoozeVia(card({ taskType: "data_quality_poor" }))).toBe("none"); // no record id
  });

  it("the lane is the card's own stream, defaulted rather than assumed", () => {
    expect(cardLane(card({ stream: "nt" }))).toBe("nt");
    expect(cardLane(card({ stream: "hk" }))).toBe("hk");
    expect(cardLane(card({ stream: "do" }))).toBe("do");
  });

  it("the page routes both branches through it", () => {
    expect(page).toContain('snoozeVia(c) === "user-task-flag"');
    expect(page).toContain('snoozeVia(c) !== "dismiss-task"');
    expect(page).toContain("cardLane(c)");
  });
});

describe("⚠️ WHICH WRITE PATH A COMPLETION TAKES — one map, not an if-ladder in a component", () => {
  it("each kind resolves to exactly one path", () => {
    expect(completionVia(card({ userTaskId: "u1" }))).toBe("user-task");
    expect(completionVia(card({ taskType: "no_response_close", relatedRecordId: "q1" }))).toBe("close-query");
    expect(completionVia(card({ taskType: "nudge_overdue", relatedRecordId: "q1" }))).toBe("log-nudge");
    expect(completionVia(card({ taskType: "full_requested", relatedRecordId: "q1" }))).toBe("mark-sent");
  });

  it("⚠️ A CARD WITH NOTHING TO COMPLETE RESOLVES TO `none` — and the row can ask BEFORE it draws", () => {
    /* A tick that does nothing is worse than no tick: it invites a press and then ignores it.
       The if-ladder answered this only by running to its end, which a row cannot do. */
    expect(completionVia(card())).toBe("none");
    expect(isTickable(card())).toBe(false);
    expect(isTickable(card({ userTaskId: "u1" }))).toBe(true);
    expect(isTickable(card({ taskType: "no_response_close", relatedRecordId: "q1" }))).toBe(true);
  });

  it("the writer's own item wins over any task type it also carries", () => {
    expect(completionVia(card({ userTaskId: "u1", taskType: "no_response_close" }))).toBe("user-task");
  });

  it("the page routes through the map and keeps no per-kind branch of its own", () => {
    expect(page).toContain("const via = completionVia(c)");
    expect(page).toContain('if (via === "none") return');
    expect(page).toContain('via === "close-query"');
    expect(page).toContain('via === "log-nudge"');
    // the old kind tests inside quickDone are gone
    const fn = page.slice(page.indexOf("async function quickDone"));
    expect(page.indexOf("async function quickDone")).toBeGreaterThan(-1); // the anchor
    const body = fn.slice(0, fn.indexOf("\n  }"));
    expect(body).not.toContain('c.taskType === "no_response_close"');
    expect(body).not.toContain('c.taskType === "nudge_overdue"');
  });
});

describe("⚠️ DOCK ENTRY IS ONE FILTER, and it was already a seam", () => {
  it("notes and finished cards never enter the queue", () => {
    const q = dockQueue([
      card({ key: "a" }),
      card({ key: "b", nature: "note" }),
      card({ key: "c", done: true }),
    ]);
    expect(q.map((c) => c.key)).toEqual(["a"]);
  });

  it("⚠️ NOT DUPLICATED HERE — todoActions re-exports lib/todoDock's filter, it does not restate it", () => {
    const src = readFileSync(join(__dirname, "todoActions.ts"), "utf8");
    expect(src).toContain('export { dockQueue } from "./todoDock"');
    expect(src).not.toContain("function dockQueue");
  });

  it("the page's dock entrance goes through it", () => {
    /* ⚠️ RE-ANCHORED (rail + workspace P5). `openDock` took the queue as an argument and filtered
       it on the way in; the queue is DERIVED now, so the filter moved to the one place the list
       is built. Same filter, same single seam — it is simply upstream of the entrance rather than
       inside it. */
    /* ⚠️ RE-ANCHORED AGAIN (frame2 Phase 2). The queue's SOURCE moved — `dockAllCards()` read
       `board` where the rail reads `boardCols`, and the two produced different totals, so the pane
       said "of 14" beside a list of 11. It walks the list's own array now. The claim this case
       makes is unchanged and is about the SEAM, not the source: one derived queue, filtered
       upstream, with no filter inside the entrance. */
    expect(page).toContain("const allDockable = dockQueue(railGroups().flatMap((g) => g.cards));");
    expect(page).not.toContain("function openDock(queue:");
  });
});
