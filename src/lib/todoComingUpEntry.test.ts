/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Controls: entry v1 · close-out 2 — the To-do list's "coming up" dates (lib/todoTray `comingUp`) read through the agent's
 * latest reply entry, by the same one check as the tasks and the cards (lib/agentReply `entryDatesFor`). Each case
 * asserts that comingUp's date for the query IS the one check's date, so the two cannot drift.
 *
 * Proved red first against todoTray.ts as it was (it read `nudgeDate` and `expectedFor(q, a)` directly): the planned
 * nudge and the reply date stayed on their old days.
 */
import { describe, expect, it } from "vitest";
import { comingUp, type TrayDb } from "./todoTray";
import { buildAgentReplyWrites, entryDatesFor } from "./agentReply";
import { expectedFor } from "./qcSummary";
import { Activity, Agent, Query, QueryStatus } from "../types";

const DAY = 86_400_000;
const NOW = new Date(2026, 10, 24, 12).getTime();
const ymd = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const noon = (s: string) => new Date(`${s}T12:00:00`).getTime();
const agent = (id: string, name: string) => ({ id, name, agency: "Agency", responseTimeWeeks: 8 }) as unknown as Agent;
const query = (id: string, agentId: string, extra: Record<string, unknown> = {}) => ({
  id, userId: "u", agentId, manuscriptId: "m1", status: QueryStatus.QUERIED, sendMethod: "Email",
  dateSent: new Date(NOW - 20 * DAY).toISOString(), ...extra,
}) as unknown as Query;
const entry = (q: Query, a: Agent, daysAgo: number, dateYmd: string): Activity =>
  ({ ...(buildAgentReplyWrites(q, a, { kind: "holding", on: new Date(NOW - daysAgo * DAY).toISOString(), date: dateYmd }).activity as Activity), id: `e-${q.id}`, userId: "u" });

const AG = [agent("a1", "Jules Hart"), agent("a2", "Rafe Moss"), agent("a3", "Ada Penn")];
const NEW = ymd(NOW + 40 * DAY);
/* planned: a nudge set for 5 days from now, before an entry that says 40 */
const planned = query("planned", "a1", { nudgeDate: ymd(NOW + 5 * DAY) });
/* dated: no reminder; the entry gives the reply date */
const dated = query("dated", "a2");
/* after: a reminder set AFTER the entry, so it stays */
const after = query("after", "a3", { nudgeDate: ymd(NOW + 6 * DAY), nudgeSetAt: new Date(NOW - DAY).toISOString() });
const ACTS = [entry(planned, AG[0], 1, NEW), entry(dated, AG[1], 1, NEW), entry(after, AG[2], 2, NEW)];
const db = { queries: [planned, dated, after], agents: AG, activities: ACTS, userTasks: [], taskFlags: [], packages: [], manuscripts: [] } as unknown as TrayDb;
const up = comingUp(db, NOW, 10);
const of = (id: string) => up.filter((u) => u.queryId === id);

describe("coming up reads through the entry", () => {
  it("a planned nudge set before the entry lands on the entry's new date — the one check's date", () => {
    const want = entryDatesFor(planned, ACTS).reminderMs;
    expect(want).toBe(noon(NEW));
    expect(of("planned").map((u) => [u.kind, u.ymd])).toEqual([["nudge", NEW]]);
  });
  it("the reply date is the entry's — the one check's date (expectedFor with the reply)", () => {
    const e = expectedFor(dated, AG[1], entryDatesFor(dated, ACTS).reply);
    expect(e.kind).toBe("reply");
    expect(of("dated").map((u) => [u.kind, u.ymd])).toEqual([["reply", ymd(e.ms!)]]);
    expect(ymd(e.ms!)).toBe(NEW);
  });
  it("a reminder set after the entry stays where the writer put it", () => {
    expect(of("after").map((u) => [u.kind, u.ymd])).toEqual([["nudge", ymd(NOW + 6 * DAY)]]);
  });
});
