/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Controls: entry v1 · follow-up 1 — THE TO-DO LIST READS THROUGH THE ENTRY, through the same one check as the cards
 * (lib/agentReply `entryDatesFor`). Proved red first on the measured case: a query queried 236 days ago, gone quiet,
 * whose agent has just written "still on my pile" with a new reply date 52 days out read "Nudge Jules · 180 days past
 * expected" on the To-do page (reports/controls-entry-v1, the first measure). The browser half is
 * tests/e2e/controlsEntry.measure.ts P5.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { buildAgentReplyWrites, entryDatesFor } from "./agentReply";
import { replyTask, replyTaskFor } from "./taskPrecedence";
import { dueFor } from "./taskCardFacts";
import { trayFigure, type WsTask } from "./todoWs";
import type { BoardCard } from "./todoBoard";
import { Activity, Agent, Query, QueryStatus } from "../types";

const DAY = 86_400_000;
const NOW = new Date(2026, 10, 24, 12).getTime();
const ago = (d: number) => new Date(NOW - d * DAY).toISOString();
const ymd = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const agent = { id: "a1", userId: "u", name: "Jules Okafor", agency: "Okafor Literary", responseTimeWeeks: 8, noResponseMeansNo: false } as Agent;
const quietQ = { id: "q", userId: "u", agentId: "a1", manuscriptId: "m1", packageId: "", personalisationNotes: "", sendMethod: "Email",
  status: QueryStatus.QUERIED, dateSent: ago(236) } as unknown as Query;
const frQ = { ...quietQ, id: "fr", status: QueryStatus.FULL_REQUESTED, fullRequestedDate: ago(3), lastStatusChange: ago(3) } as unknown as Query;
const entry = (q: Query, kind: "chaser" | "holding" | "note", date: string | null): Activity =>
  ({ ...(buildAgentReplyWrites(q, agent, { kind, on: new Date(NOW - 60_000).toISOString(), date }).activity as Activity), id: `e-${q.id}`, userId: "u" });
const db = (q: Query, acts: Activity[]) => ({ queries: [q], agents: [agent], manuscripts: [], userTasks: [], activities: acts });
const card = (q: Query, taskType: string): BoardCard => ({ key: `task-${taskType}-${q.id}`, taskType, relatedRecordId: q.id, agentId: "a1", reason: "nudge-first" } as unknown as BoardCard);
const decide = (q: Query, acts: Activity[], now = NOW) => {
  const en = entryDatesFor(q, acts);
  return replyTask({ status: q.status, dateSent: q.dateSent, responseTimeWeeks: 8, noResponseMeansNo: false, now,
    replyDateMs: en.replyDateMs, writerNudgeDate: en.reminderMs != null ? new Date(en.reminderMs).toISOString() : undefined });
};

describe("the measured case: a holding reply with a new date 52 days out", () => {
  const date = ymd(NOW + 52 * DAY);
  it("before the entry it is a task (the population is real)", () => {
    expect(decide(quietQ, [])).not.toBe("none");
  });
  it("after it, no nudge and no close before that date", () => {
    expect(decide(quietQ, [entry(quietQ, "holding", date)]), "still past expected before the agent's own date").toBe("none");
  });
  it("on that date the nudge is due — a nudge, never a close (the silence ended)", () => {
    expect(decide(quietQ, [entry(quietQ, "holding", date)], NOW + 52 * DAY + DAY / 4)).toBe("nudge");
  });
  it("the nudge task's day is that date", () => {
    const d = dueFor(card(quietQ, "nudge_overdue"), db(quietQ, [entry(quietQ, "holding", date)]), []);
    expect([d.ymd, d.source]).toEqual([date, "reply"]);
  });
  it("an undated note moves no date: the task is what it was", () => {
    expect(decide(quietQ, [entry(quietQ, "note", null)])).toBe(decide(quietQ, []));
  });
  it("the Query Centre's own adapter agrees (replyTaskFor, as the living header calls it)", () => {
    const en = entryDatesFor(quietQ, [entry(quietQ, "holding", date)]);
    expect(replyTaskFor(quietQ, agent, NOW, undefined, en)).toBe("none");
  });
});

describe("the send task shows its Send by", () => {
  it("a chaser's date is the send task's day, and the row says how long is left", () => {
    const date = ymd(NOW + 10 * DAY);
    const d = dueFor(card(frQ, "full_requested"), db(frQ, [entry(frQ, "chaser", date)]), []);
    expect([d.ymd, d.source]).toEqual([date, "send-by"]);
    const t = { kind: "send", dueDays: 10, dueSource: "send-by", query: frQ, item: { waitMs: NOW - 3 * DAY } } as unknown as WsTask;
    expect(trayFigure(t, NOW)).toMatchObject({ n: "10", words: "days left", late: false });
  });
  it("without one, it counts how long it has waited (unchanged)", () => {
    const d = dueFor(card(frQ, "full_requested"), db(frQ, []), []);
    expect(d.source).toBe("ask");
  });
});

describe("one check", () => {
  it("the task generator reads the same read-through (db.tsx)", () => {
    const src = readFileSync("src/lib/db.tsx", "utf8");
    expect(src).toContain("const entry = entryDatesFor(q, null, latestReplies.get(q.id) ?? null);");
    expect(src).toContain("replyDateMs: entry.replyDateMs,");
  });
});
