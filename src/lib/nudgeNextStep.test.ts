/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for §6 — the silence's figure, the scheduled reminder, and the next-step offer.
 */
import { describe, it, expect } from "vitest";
import { pastWindowLine, scheduledReminder, nextStepOffer, NUDGE_PENDING_DAYS } from "./nudgeState";

const DAY = 86400000;
const NOW = Date.UTC(2026, 7, 18);

describe("§6a · the silence gets a figure", () => {
  it("it measures from the stated close, scaled", () => {
    expect(pastWindowLine(NOW - 730 * DAY, NOW, true)).toEqual({ figure: "2 years", tail: "past the window they stated" });
    expect(pastWindowLine(NOW - 40 * DAY, NOW, true)?.figure).toBe("6 weeks");
  });

  /* ⚠️ NOTHING WITHOUT A STATED WINDOW. The house 8/12/12-week assumption is the app's own
     arithmetic; a figure counted from it would be attributed to the agency. */
  it("no window, no figure", () => {
    expect(pastWindowLine(NOW - 730 * DAY, NOW, false), "it measured against the house assumption").toBeNull();
    expect(pastWindowLine(null, NOW, true)).toBeNull();
  });

  it("a window still open has nothing to be past", () => {
    expect(pastWindowLine(NOW + 10 * DAY, NOW, true)).toBeNull();
    expect(pastWindowLine(NOW, NOW, true)).toBeNull();
  });

  /* ⚠️ THE FACT STAYS ON THE AGENCY'S SIDE OF THE LINE — a stated window is an intention, not a
     contract, and this page retired "overdue" for exactly that reason. */
  it("the phrasing appraises nobody", () => {
    const line = pastWindowLine(NOW - 100 * DAY, NOW, true)!;
    expect(line.tail).toBe("past the window they stated");
    expect(line.tail).not.toMatch(/overdue|late|should|failed|ignored/i);
  });
});

describe("§6b · which task is a scheduled reminder", () => {
  const t = (over: Partial<{ id: string; text: string; done: boolean; queryId: string; dueDate: string }>) =>
    ({ id: "t", text: "Nudge", done: false, queryId: "q1", dueDate: "2026-09-01", ...over });
  const TODAY = "2026-08-18";

  it("undone, this query's, and dated ahead — all three", () => {
    expect(scheduledReminder([t({})], "q1", TODAY)?.dueDate).toBe("2026-09-01");
    expect(scheduledReminder([t({ done: true })], "q1", TODAY), "a completed reminder still drew").toBeNull();
    expect(scheduledReminder([t({ queryId: "q2" })], "q1", TODAY), "another query's reminder drew").toBeNull();
    /* ⚠️ TODAY IS NOT A FUTURE — it is on the writer's list now, which is a different statement. */
    expect(scheduledReminder([t({ dueDate: TODAY })], "q1", TODAY), "a task due today drew as a future").toBeNull();
    expect(scheduledReminder([t({ dueDate: "2026-01-01" })], "q1", TODAY)).toBeNull();
    expect(scheduledReminder([t({ dueDate: undefined })], "q1", TODAY), "an undated task drew as a reminder").toBeNull();
  });

  it("the nearest one, so two reminders do not draw two rungs", () => {
    const got = scheduledReminder([t({ id: "far", dueDate: "2026-12-01" }), t({ id: "near", dueDate: "2026-09-01" })], "q1", TODAY);
    expect(got?.id).toBe("near");
  });

  it("no tasks at all is no reminder, not a crash", () => {
    expect(scheduledReminder(undefined, "q1", TODAY)).toBeNull();
    expect(scheduledReminder([], "q1", TODAY)).toBeNull();
  });
});

describe("§6c · the offer appears only when nothing is pending", () => {
  const base = { times: [] as number[], reminder: null, now: NOW, dismissed: false };

  it("nothing pending, so it offers the next step", () => {
    const o = nextStepOffer(base);
    expect(o.show).toBe(true);
    expect(o.facts).toBe("No nudge has been sent and no reminder is set.");
  });

  /* ⚠️ ANYTHING PENDING SILENCES IT. An offer to nudge, beside a nudge sent last week, would be the
     app failing to notice what the writer just did. */
  it("a scheduled reminder or a recent nudge silences it", () => {
    expect(nextStepOffer({ ...base, reminder: { id: "t", text: "x", done: false, queryId: "q1", dueDate: "2026-09-01" } }).show).toBe(false);
    expect(nextStepOffer({ ...base, times: [NOW - 3 * DAY] }).show, "it offered a nudge days after one was sent").toBe(false);
    /* past the pending window it speaks again, and states when the last one went */
    const old = nextStepOffer({ ...base, times: [NOW - (NUDGE_PENDING_DAYS + 30) * DAY] });
    expect(old.show).toBe(true);
    expect(old.facts).toBe("Your last nudge was 8 weeks ago and no reminder is set.");
  });

  /**
   * ⚠️ THE DISMISSAL MECHANISM GENERALISED WITHOUT A SECOND FLAG, and the reason is structural
   * rather than lucky: every one of this offer's three actions makes its own trigger false, so it
   * self-dismisses by construction. The closure offer's flag is still honoured, because a writer
   * who has said "keep tracking" has answered the card's offer as such.
   */
  it("it honours the closure offer's flag and needs none of its own", () => {
    expect(nextStepOffer({ ...base, dismissed: true }).show).toBe(false);
    /* the self-dismissal, stated as the three cases rather than as a comment */
    expect(nextStepOffer({ ...base, times: [NOW - 1 * DAY] }).show, "nudging did not silence it").toBe(false);
    expect(nextStepOffer({ ...base, reminder: { id: "t", text: "x", done: false, queryId: "q1", dueDate: "2026-09-01" } }).show, "setting a reminder did not silence it").toBe(false);
  });

  it("the pending window is one stated figure", () => {
    expect(NUDGE_PENDING_DAYS).toBe(28);
    expect(nextStepOffer({ ...base, times: [NOW - (NUDGE_PENDING_DAYS - 1) * DAY] }).show).toBe(false);
    expect(nextStepOffer({ ...base, times: [NOW - (NUDGE_PENDING_DAYS + 1) * DAY] }).show).toBe(true);
  });

  /* ⚠️ FACTS FIRST, NO ADVICE — the same rule the closure offer is held to. */
  it("no wording advises", () => {
    for (const times of [[], [NOW - 200 * DAY]]) {
      const o = nextStepOffer({ ...base, times });
      expect(o.facts, `"${o.facts}" advises`).not.toMatch(/should|time to|recommend|try|why not|consider/i);
    }
  });
});
