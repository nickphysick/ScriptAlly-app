/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE CLAIMS ARE PROPERTIES OVER A WINDOW, NOT A TABLE OF DATES. A task bar's whole job is to be
 * in the same scale as a query bar, so what is asserted is the RELATIONSHIP between the window, the
 * dates and the figures returned — which survives a change of window and a change of today.
 */
import { describe, it, expect } from "vitest";
import { taskBar, taskHolder, type TaskWin } from "./taskBars";

/** a 30-day window opening on 1 September */
const days: string[] = [];
for (let i = 1; i <= 30; i++) days.push(`2026-09-${String(i).padStart(2, "0")}`);
const win: TaskWin = { days, today: "2026-09-15" };

describe("a task as a bar", () => {
  it("runs from the day it was written to the day it is due", () => {
    const b = taskBar({ createdYmd: "2026-09-05", dueYmd: "2026-09-20" }, win)!;
    expect(b, "no bar for a dated task").not.toBeNull();
    expect(b.from).toBe(4);            // 5 Sept is the 5th day, index 4
    expect(b.to).toBe(19);             // 20 Sept
    expect(b.overdue).toBe(false);
    expect(b.openLeft).toBe(false);
    expect(b.openRight).toBe(false);
  });

  it("⚠️ an overdue task runs OPEN TO TODAY, never back to its due date", () => {
    const b = taskBar({ createdYmd: "2026-09-01", dueYmd: "2026-09-10" }, win)!;
    /* its span is how long it has been outstanding, and that is still growing; ending it on the
       10th would say it stopped being the writer's problem then */
    expect(b.to, "an overdue task stopped at its due date").toBe(14);   // today, 15 Sept
    expect(b.overdue).toBe(true);
    expect(b.openRight, "an overdue task is not open-ended").toBe(true);
  });

  it("⚠️ a rolled task keeps its original span as a ghost, and the live bar starts at the roll", () => {
    const b = taskBar({ createdYmd: "2026-09-02", dueYmd: "2026-09-25",
                        originalDueYmd: "2026-09-12" }, win)!;
    expect(b.ghost, "a rolled task drew no ghost").not.toBeNull();
    expect(b.ghost!.from).toBe(1);     // written on the 2nd
    expect(b.ghost!.to).toBe(11);      // originally due the 12th
    expect(b.rolledAt).toBe(11);
    /* ⚠️ THE LIVE BAR STARTS AT THE ROLL, not at the creation date — otherwise the ghost and the
       bar overlap and the board draws the same fortnight twice. */
    expect(b.from).toBe(11);
    expect(b.to).toBe(24);
  });

  it("⚠️ a date brought FORWARD is not a roll and leaves no ghost", () => {
    /* an original date later than the current one means the task was pulled in; a ghost would draw
       a span the task never occupied */
    const b = taskBar({ createdYmd: "2026-09-02", dueYmd: "2026-09-10",
                        originalDueYmd: "2026-09-25" }, win)!;
    expect(b.ghost).toBeNull();
    expect(b.rolledAt).toBeNull();
  });

  it("⚠️ a task with no due date is a NOTE and has no bar", () => {
    expect(taskBar({ createdYmd: "2026-09-05", dueYmd: null }, win)).toBeNull();
  });

  it("⚠️ a span wholly outside the window draws nothing, rather than a mark on the edge", () => {
    expect(taskBar({ createdYmd: "2026-07-01", dueYmd: "2026-07-10" },
                   { days, today: "2026-07-20" }), "a past task drew a bar").toBeNull();
    expect(taskBar({ createdYmd: "2026-11-01", dueYmd: "2026-11-10" }, win),
      "a future task drew a bar").toBeNull();
  });

  it("a span that starts before the window is open on the left and still drawn", () => {
    const b = taskBar({ createdYmd: "2026-08-20", dueYmd: "2026-09-10" },
                      { days, today: "2026-09-05" })!;
    expect(b.openLeft).toBe(true);
    expect(b.from, "the true start is kept, not clamped").toBeLessThan(0);
    expect(b.to).toBe(9);
  });

  it("the holder is the board's own vocabulary", () => {
    expect(taskHolder(true)).toBe("Overdue");
    expect(taskHolder(false)).toBe("With you");
  });
});
