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
import { applyFacet } from "../../lib/todoBoardSort";
import { BoardCard } from "../../lib/todoBoard";

const here = __dirname;

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

/* ⚠️ EVERYTHING BELOW THIS LINE WENT WITH TODAY (tasks-consolidation P1, 9 Aug) — three
   describes: the bench header's card-unit count, the per-reason why-lines, and the filter
   reaching both regions. All three asserted against `TodoTodayPage.tsx` and `lib/todoToday`,
   which are retired: the bench was Today's suggestion rail, and the ranked order of the ONE list
   is the plan now.

   ⚠️ WHAT THEY PROTECTED IS NOT LOST, AND IS THE CONSOLIDATION'S OWN ARGUMENT. The rules were:
   a suggestion states its OWN reason rather than a generic one; its header counts the same CARDS
   the board counts, never the raw member lanes; and a filter narrows every region alike. The
   consolidated page inherits all three as properties of the single ranked list — which is
   precisely why one list replaces two pages. Rebuild them there.

   The snoozed-band grammar above is untouched: it never depended on Today. */
