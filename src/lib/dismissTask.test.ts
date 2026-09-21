/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DISMISSING A TASK WRITES NO ACTIVITY.
 *
 * ⚠️ WHAT THIS IS GUARDING, BECAUSE THE DEFECT LOOKED LIKE A FEATURE. `db.dismissTask` used to
 * special-case `nudge_overdue` and write a `NUDGE_SENT` activity — "Nudge sent to {agent} at
 * {agency}", with a fabricated "They've had your query for N days" — before it touched the flag.
 * Dismissing or snoozing a nudge SUGGESTION therefore recorded that the writer had chased the
 * agent, which they had not; and because it landed in the global feed alone, with no twin in
 * `queries/{id}/activity` and no `lastNudgeSentDate`, the feed, the board's recent strip, the
 * calendar and the row facts all showed a nudge that everything reading the query denied.
 *
 * ⚠️ AND THE LOCK THAT EXISTED DID NOT CATCH IT — which is the more useful half. `respondDesk`'s
 * "snooze writes no activity" sliced the CALLER (`commitQuickSnooze`) and swept it for activity
 * primitives. Every one of them was absent, so it was green for the whole life of the bug: the
 * caller wrote no activity, and the writer it delegated to wrote one. A property of the part,
 * measured where the claim was about the whole. So these cases are stated over the CALLEE, and
 * `respondDesk`'s now follows the call rather than stopping at the call site.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { sliceBetween } from "../test/sliceBetween";
import { stripComments } from "../test/pageSmoke";

const db = readFileSync(new URL("./db.tsx", import.meta.url), "utf8");

/**
 * ⚠️ COMMENTS OFF BEFORE ANYTHING IS ASSERTED. Every word this lock forbids is spelled out in the
 * obituary sitting above the function — that is the house pattern for a retirement, and a raw-text
 * sweep would go red on the explanation and teach the next reader to delete it.
 */
const body = () => stripComments(sliceBetween(db, "const dismissTask = async", "  // Log a nudge —", "dismissTask"));

/** Everything in this file that puts a document anywhere. If it is not here, it is not a write. */
const WRITE_PRIMITIVES = ["setDoc", "addDoc", "updateDoc", "deleteDoc", "writeBatch", "runTransaction"];

describe("dismissTask — the flag, and nothing else", () => {
  /**
   * The claim, stated as the claim: nothing about an activity is reachable from this function.
   * Not "one fewer write" — a count is satisfied by the wrong write surviving.
   */
  it("writes no activity, of any kind, by any route", () => {
    const b = body();
    for (const w of ["ActivityType", "activityType", "NUDGE_SENT", '"activities"', "Activity"])
      expect(b, `dismissTask names ${w} again — a dismissal is not an event`).not.toContain(w);
    for (const w of ["logNudge", "recordQueryResponse", "recordMaterialsSent", "addActivity"])
      expect(b, `dismissTask reached ${w}`).not.toContain(w);
  });

  /**
   * ⚠️ THE STRONGER FORM, because "no activity" alone would pass on a function that had grown some
   * OTHER stray write. The only thing it may put anywhere is the flag, through the one writer.
   */
  it("its only write is upsertTaskFlag — no document leaves this function by any other hand", () => {
    const b = body();
    for (const w of WRITE_PRIMITIVES)
      expect(b, `dismissTask writes directly with ${w} instead of going through upsertTaskFlag`).not.toContain(w);
    expect(b).toContain("upsertTaskFlag(key,");
  });

  /**
   * ⚠️ THE INVERSE IS A MEMBER OF THE TYPE, NOT A CONVENTION. Before `"lift"` the undos passed
   * `("fixed snooze", 0)`; `0` is falsy, so `snoozedUntil` resolved to `undefined`, which
   * `upsertTaskFlag` reads as KEEP — the snooze stayed put and the count went up. Both halves are
   * asserted, because clearing the date while leaving the bump is still not a restoration.
   */
  it("lift clears the suppression and unwinds the bump", () => {
    const b = body();
    expect(b).toContain('dismissType === "lift"');
    expect(b).toMatch(/snoozedUntil:\s*null,\s*unbumpSnooze:\s*true/);
  });

  /** A snooze of no days is not a snooze; it must not resolve to "keep whatever was there". */
  it("a non-positive day count lifts rather than silently keeping the old date", () => {
    expect(body()).toContain('dismissType === "fixed snooze" && !(snoozeDays && snoozeDays > 0)');
  });

  /** One source for the indefinite mute — db.tsx restated the literal beside the import of it. */
  it("permanent reads MUTED_UNTIL rather than restating the date", () => {
    const b = body();
    expect(b).toContain("MUTED_UNTIL");
    expect(b, "the mute date is spelled out again").not.toContain("3000-01-01");
  });
});

describe("the nearest-neighbour call shape is gone from the app", () => {
  /**
   * ⚠️ SWEPT OVER `src/`, NOT OVER THE TWO CALL SITES THAT HAD IT. The fault is a shape — an undo
   * expressed as a zero-length snooze because the vocabulary had no word for "put it back" — and
   * it is reintroduced by whoever writes the next Undo, not by whoever reads this file.
   */
  it("no caller expresses an undo as a zero-day snooze", () => {
    const files = ["../components/Queries.tsx", "../components/Dashboard.tsx", "../components/TasksPopover.tsx",
      "../components/TasksDropdown.tsx", "../components/todo/ToDoPage.tsx", "../components/todo/FocusFlow.tsx"];
    for (const f of files) {
      const src = stripComments(readFileSync(new URL(f, import.meta.url), "utf8"));
      expect(src, `${f} undoes a dismissal with a zero-day snooze`).not.toMatch(/"fixed snooze",\s*0\s*\)/);
    }
  });

  /** Queries' two undos are the ones that had it, and they are the inverse now. */
  it("both of Queries' nudge undos call the inverse", () => {
    const q = stripComments(readFileSync(new URL("../components/Queries.tsx", import.meta.url), "utf8"));
    expect((q.match(/dismissTask\("nudge_overdue", q\.id, "lift"\)/g) ?? []).length).toBe(2);
  });
});
