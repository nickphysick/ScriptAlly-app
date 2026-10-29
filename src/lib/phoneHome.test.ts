/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v2, Part 2 — Home's hero reads the dashboard's own ledger; nothing here is a new count.
 */
import { describe, expect, it } from "vitest";
import { closedSplit, heroFor, sparkPath, HERO_SERIES } from "./phoneHome";
import { aggregateLedger, dailyLedger, sentAt } from "./oneScreen";
import { liveQueries } from "./dashBreakdown";
import type { Query } from "../types";

const NOW = new Date("2026-10-29T12:00:00Z");
const q = (id: string, status: string, dateSent: string | null, extra: Partial<Query> = {}): Query =>
  ({ id, agentId: "a", manuscriptId: "m", status, dateSent, ...extra } as unknown as Query);
const QS: Query[] = [
  q("1", "Queried", "2026-07-13"), q("2", "Queried", "2026-08-20"), q("3", "Full Sent", "2026-09-02"),
  q("4", "Rejected", "2026-09-10", { lastStatusChange: "2026-10-01" } as Partial<Query>), q("5", "Queried", "2026-10-20"), q("6", "Queried", null),
];

describe("Home's hero — the ledger's own series", () => {
  it("offers only the series the ledger keeps (Active and Sent)", () => {
    expect([...HERO_SERIES]).toEqual(["active", "sent"]);
  });
  it("Active's number is the live count; its line is the weekly closing stock", () => {
    const h = heroFor(QS, NOW, "active", "All");
    expect(h.value).toBe(liveQueries(QS).length);
    expect(h.values).toEqual(aggregateLedger(dailyLedger(QS, NOW), "weekly").map((w) => w.active));
  });
  it("Sent's number is every query with a send date; its line is the running total of sends, ending there", () => {
    const h = heroFor(QS, NOW, "sent", "All");
    expect(h.value).toBe(QS.filter((x) => sentAt(x) !== null).length);
    expect(h.values[h.values.length - 1]).toBe(h.value);
  });
  it("the ranges draw 5, 13 and every week, and the number does not move with the range", () => {
    const all = heroFor(QS, NOW, "active", "All");
    const m1 = heroFor(QS, NOW, "active", "1M");
    const m3 = heroFor(QS, NOW, "active", "3M");
    expect(m1.values.length).toBe(Math.min(5, all.values.length));
    expect(m3.values.length).toBe(Math.min(13, all.values.length));
    expect(new Set([all.value, m1.value, m3.value]).size).toBe(1);
    expect(m1.change).toBe(m1.values[m1.values.length - 1] - m1.values[0]);
    expect(m1.phrase).toBe("in the last month");
    expect(m3.phrase).toBe("in the last 3 months");
    expect(all.phrase).toBe("since 13 Jul");
  });
  it("the closed split counts passes and no-replies by status, never a withdrawal as a pass", () => {
    expect(closedSplit(["Rejected", "No Response", "Withdrawn", "Rejected"])).toEqual({ passed: 2, noReply: 1 });
  });
  it("the line is the ref's smoothed path, and survives one point or none", () => {
    expect(sparkPath([1, 2, 3], 320, 74).d.startsWith("M0 ")).toBe(true);
    expect(sparkPath([4], 320, 74).d).not.toBe("");
    expect(sparkPath([], 320, 74).d).toBe("");
  });
});
