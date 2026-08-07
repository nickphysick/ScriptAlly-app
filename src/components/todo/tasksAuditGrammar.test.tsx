/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Band and count grammar (tasks-audit pack, Phase 2): the kind survives snoozing, the bench
 * header speaks cards from the one derivation, and why-lines derive per reason — two rows with
 * different reasons may never read the same.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Query, Agent, UserTask, TaskFlag, Task, QueryStatus } from "../../types";
import { snoozedCards, assembleBoardColumns } from "../../lib/todoColumns";
import { benchWhy, benchHeading, suggestedBench } from "../../lib/todoToday";
import { BoardCard } from "../../lib/todoBoard";

const here = __dirname;
const todayPage = readFileSync(join(here, "TodoTodayPage.tsx"), "utf8");

const NOW = Date.parse("2026-08-07T12:00:00");
const TODAY = "2026-08-07";
const q = (over: Partial<Query> = {}): Query => ({
  id: "q1", userId: "u", manuscriptId: "m1", agentId: "a1", packageId: "",
  status: QueryStatus.FULL_REQUESTED, dateSent: "2026-07-01T09:00:00Z",
  personalisationNotes: "", sendMethod: "Email", ...over,
} as Query);
const ag = (): Agent => ({ id: "a1", name: "Marcus Reed", agency: "Reed Literary" } as unknown as Agent);
const card = (over: Partial<BoardCard>): BoardCard => ({
  key: "k", stream: "do", title: "t", who: "", subtitle: "", due: "", warn: false, snoozes: 0,
  hk: false, initials: "•", record: "", committed: false, done: false, ...over,
});

/* ── 1. the band grammar per state ─────────────────────────────────────────────────────────── */

describe("⚠️ the snoozed band: '{KIND} · 🕐 | BACK {date}' — the kind survives snoozing", () => {
  const sleepFlag = (taskType: string, id = "f1"): TaskFlag =>
    ({ id, userId: "u", taskType, queryId: taskType === "user_task" ? "t1" : "q1", snoozeCount: 1, snoozedUntil: "2026-08-09T09:00:00Z" });

  it("an agent-waiting card sleeps as AGENT WAITING · 🕐, never bare SNOOZED", () => {
    const [c] = snoozedCards({ flags: [sleepFlag("full_requested")], queries: [q()], agents: [ag()], nowMs: NOW });
    expect(c.kind).toBe("AGENT WAITING · 🕐");
    expect(c.due).toBe("BACK 9 AUG");
  });

  it("a stale card sleeps as STALE · 🕐; a user task as YOUR TASK · 🕐", () => {
    const [stale] = snoozedCards({ flags: [sleepFlag("no_response_close")], queries: [q()], agents: [ag()], nowMs: NOW });
    expect(stale.kind).toBe("STALE · 🕐");
    const [ut] = snoozedCards({
      flags: [sleepFlag("user_task")], queries: [], agents: [],
      userTasks: [{ id: "t1", userId: "u", text: "Redraft", done: false, createdAt: "", updatedAt: "" } as UserTask],
      nowMs: NOW,
    });
    expect(ut.kind).toBe("YOUR TASK · 🕐");
  });

  it("bare 'SNOOZED' never renders as a kind — the grammar is state-through-the-clock, not a label swap", () => {
    for (const t of ["full_requested", "no_response_close", "nudge_overdue"]) {
      const [c] = snoozedCards({ flags: [sleepFlag(t)], queries: [q()], agents: [ag()], nowMs: NOW });
      expect(c.kind, t).not.toBe("SNOOZED");
      expect(c.kind, t).toContain("· 🕐");
    }
  });
});

/* ── 2. the bench header counts CARDS ──────────────────────────────────────────────────────── */

describe("⚠️ the bench header derives from the card-unit derivation, like every other figure", () => {
  it("the page passes the To do column's own card count — never the raw member lanes", () => {
    expect(todayPage).toContain("benchHeading(assembled.cols.todo.length)");
    expect(todayPage).not.toContain("benchHeading(board.do.length + board.hk.length");
  });

  it("equality with the board's derivation, over a sweep-heavy fixture", () => {
    // five dq members collapse to ONE sweep card — the member sum would say 5 where cards say 1
    const dq = (i: number): Task => ({
      id: `task-dq-${i}`, userId: "u", taskType: "data_quality_poor", relatedRecordId: `a${i}`,
      title: "details to add", context: "", priority: 1,
    } as unknown as Task);
    const agents = [1, 2, 3, 4, 5].map((i) => ({ id: `a${i}`, name: `Agent ${i}`, agency: "" } as unknown as Agent));
    const assembled = assembleBoardColumns({
      tasks: [dq(1), dq(2), dq(3), dq(4), dq(5)], userTasks: [], queries: [], agents,
      manuscripts: [], taskFlags: [], activities: [], today: TODAY, now: NOW,
    });
    const memberSum = assembled.board.do.length + assembled.board.hk.length; // the OLD feed
    expect(assembled.cols.todo.length).toBeLessThan(memberSum);              // the sweep collapsed
    expect(benchHeading(assembled.cols.todo.length)).toBe(`THE MOST PRESSING OF THE ${assembled.cols.todo.length} REMAINING`);
  });
});

/* ── 3. why-lines derive per reason ────────────────────────────────────────────────────────── */

describe("⚠️ bench why-lines: a REASON each, never generic — differing reasons never read the same", () => {
  it("the three named forms (CSS uppercases the register)", () => {
    expect(benchWhy(card({ taskType: "offer_received" }))).toBe("an offer is on the table");
    expect(benchWhy(card({ taskType: "nudge_overdue", due: "84 DAYS · NO REPLY" }))).toBe("oldest unanswered request · 84 days");
    expect(benchWhy(card({ taskType: "no_response_close" }))).toBe("about a minute");
  });

  it("⚠️ two rows with DIFFERENT reasons never render identical why-lines", () => {
    const reasons = [
      card({ key: "a", taskType: "offer_received" }),
      card({ key: "b", taskType: "nudge_overdue", due: "84 DAYS · NO REPLY" }),
      card({ key: "c", taskType: "no_response_close", stream: "hk" }),
      card({ key: "d", taskType: "full_requested" }),
      card({ key: "e", taskType: "revise_resubmit" }),
      card({ key: "f", taskType: "data_quality_poor", stream: "hk", hk: true }),
      card({ key: "g", userTaskId: "t1", nature: "task", dueState: "overdue" }),
      card({ key: "h", userTaskId: "t2", nature: "task", dueState: "today" }),
    ];
    const whys = reasons.map(benchWhy);
    expect(new Set(whys).size).toBe(whys.length);
  });

  it("…and the bench carries them through — the why is the derivation's, not the renderer's", () => {
    const bench = suggestedBench({
      candidates: [
        card({ key: "a", taskType: "offer_received", relatedRecordId: "q1" }),
        card({ key: "b", taskType: "no_response_close", relatedRecordId: "q2", stream: "hk" }),
      ],
      flags: [], onToday: new Set(), nowMs: NOW,
    });
    expect(bench.map((b) => b.why)).toEqual(["an offer is on the table", "about a minute"]);
  });
});
