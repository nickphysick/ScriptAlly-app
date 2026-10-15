/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TD5 I2 (unit) — the set-aside popover's rules: what a task may be snoozed to and whether it may be dismissed, from its
 * own facts. The rendered half (the chips disabled, the doors, no write past a cap) is tests/e2e/todoV51.measure.ts.
 */
import { describe, expect, it } from "vitest";
import { backFact, daysBetween, presets, setAsideRules } from "./todoSetAside";
import { snoozeCardWrites } from "../components/todo/snoozeWrites";
import { QueryStatus, type Query } from "../types";
import type { BoardCard } from "./todoBoard";

const card = (taskType: string): BoardCard => ({ key: taskType, stream: "do", title: "", who: "", subtitle: "", due: "", warn: false, snoozes: 0, hk: false, initials: "", record: "", committed: false, done: false, taskType, relatedRecordId: "q1" });
const q = (over: Partial<Query>) => ({ id: "q1", agentId: "a1", manuscriptId: "m1", status: QueryStatus.FULL_REQUESTED, ...over } as Query);
const TODAY = "2026-10-15";

describe("presets", () => {
  it("Tomorrow · Monday · In a week · In a month, each with its day", () => {
    const p = presets(TODAY); // a Thursday
    expect(p.map((x) => [x.k, x.days, x.ymd])).toEqual([["tom", 1, "2026-10-16"], ["mon", 4, "2026-10-19"], ["week", 7, "2026-10-22"], ["month", 31, "2026-11-15"]]);
    expect(presets("2026-10-19")[1].days).toBe(7); // on a Monday, Monday is a week
    expect(presets("2026-01-31")[3].ymd).toBe("2026-02-28"); // the month's last day where the date does not exist
  });
});

describe("TD5 I2 (unit) — the rules that stop something important being lost", () => {
  it("a send-by date already gone: no snooze at all", () => {
    const r = setAsideRules(card("full_requested"), q({ expectedSendDate: "2026-10-10T12:00:00.000Z" }), 0, TODAY);
    expect(r.ceiling).toBe(0);
    expect(r.deadline).toEqual({ ymd: "2026-10-10", what: "send-by date", passed: true });
    expect(r.noDismiss).toBe("material");
  });
  it("a send-by date ahead caps the snooze at it", () => {
    const r = setAsideRules(card("partial_requested"), q({ expectedSendDate: "2026-10-30T12:00:00.000Z" }), 0, TODAY);
    expect(r.ceiling).toBe(15);
    expect(presets(TODAY).filter((p) => p.days <= r.ceiling).map((p) => p.k)).toEqual(["tom", "mon", "week"]);
  });
  it("an offer waits a day at most and is never dismissed", () => {
    const r = setAsideRules(card("offer_received"), q({ status: QueryStatus.OFFER, offerResponseDeadline: "2026-10-23T12:00:00.000Z" }), 0, TODAY);
    expect(r.ceiling).toBe(1);
    expect(r.offer).toBe(true);
    expect(r.noDismiss).toBe("offer");
  });
  it("a nudge offers the plan; a task put off twice says so", () => {
    const r = setAsideRules(card("nudge_overdue"), q({ status: QueryStatus.FULL_SENT }), 2, TODAY);
    expect(r.nudge).toBe(true);
    expect(r.putOff).toBe(2);
    expect(r.noDismiss).toBeNull();
    expect(r.ceiling).toBeGreaterThan(300);
  });
  it("no write can sleep past the cap: the writer clamps with the deadline (clampSnooze sees every path)", () => {
    const writes: { until: string }[] = [];
    const db = { upsertTaskFlag: async () => undefined, dismissTask: async (_t: string, _r: string, _w: string, days?: number) => { writes.push({ until: String(days) }); } };
    snoozeCardWrites(db as never, card("full_requested"), 31, "in a month", daysBetween(TODAY, "2026-10-30"));
    expect(writes).toEqual([{ until: "15" }]);
    expect(snoozeCardWrites(db as never, card("full_requested"), 3, "in 3 days", 0)).toBeNull();
  });
});

describe("backFact", () => {
  const dm = () => "14 Oct";
  it("states the change that brought it back, as a fact", () => {
    expect(backFact({ eventKey: "nudge_sent", date: "" } as never, "Sophie", dm)).toBe("Back · You logged a nudge on 14 Oct.");
    expect(backFact({ resultingStatus: QueryStatus.FULL_REQUESTED, date: "" } as never, "Sophie", dm)).toBe("Back · Sophie replied on 14 Oct.");
  });
});
