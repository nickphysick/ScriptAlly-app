/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the board's four columns (workspace pack, Phase 4) — with the invariants of audit
 * item 10 asserted as EQUALITIES against the sources they mirror, not as separate expectations.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { QueryStatus, UserTask, Manuscript, TaskFlag, Activity, ActivityType } from "../types";
import { assembleBoard, todaySplit, BoardCard, BoardInput } from "./todoBoard";
import { todoCounts } from "./todoCount";
import {
  boardColumns, dropPlan, offerGuard, boardEligible, TODO_COLUMNS, snoozedCards, sweepCardFor,
  columnWeight, cardWeight, isSweepCard,
} from "./todoColumns";

const TODAY = "2026-08-06";
const NOW = Date.parse("2026-08-06T14:00:00Z");

const ms = (id: string, title: string): Manuscript => ({ id, title } as unknown as Manuscript);
const utask = (id: string, over: Partial<UserTask> = {}): UserTask =>
  ({ id, userId: "u", text: "Redraft opening", done: false, createdAt: "2026-08-01T00:00:00Z", updatedAt: "2026-08-01T00:00:00Z", ...over } as UserTask);
const base = (over: Partial<BoardInput> = {}): BoardInput => ({
  tasks: [], userTasks: [], queries: [], agents: [], manuscripts: [ms("m1", "Lost Clockworks")],
  taskFlags: [], activities: [], today: TODAY, now: NOW, ...over,
} as BoardInput);
const card = (over: Partial<BoardCard>): BoardCard => ({
  key: "k", stream: "do", title: "t", who: "", subtitle: "", due: "", warn: false, snoozes: 0,
  hk: false, initials: "•", record: "", committed: false, done: false, ...over,
});

describe("the four columns are states the app already owns", () => {
  it("is exactly To do · Today · Snoozed · Done — 'Doing' is dead", () => {
    expect(TODO_COLUMNS.map((c) => c.id)).toEqual(["todo", "today", "snoozed", "done"]);
    expect(TODO_COLUMNS.some((c) => (c.id as string) === "doing")).toBe(false);
  });

  it("every column names the EXISTING verb a drop performs", () => {
    expect(TODO_COLUMNS.map((c) => c.dropVerb)).toEqual(["return", "commit", "snooze", "complete"]);
  });
});

describe("NOTES NEVER RENDER ON THE BOARD (audit item 2)", () => {
  it("a note is filtered out before any column sees it", () => {
    const note = card({ key: "n", nature: "note" });
    const task = card({ key: "t", nature: "task" });
    expect(boardEligible([note, task]).map((c) => c.key)).toEqual(["t"]);
  });

  it("…and so appears in NONE of the four columns", () => {
    const board = assembleBoard(base({ userTasks: [utask("n1")] })); // dateless → a note
    const cols = boardColumns({ board, flags: [], today: TODAY, nowMs: NOW, queries: [], agents: [], sweeps: [] });
    for (const id of ["todo", "today", "snoozed", "done"] as const) {
      expect(cols[id], `a note reached ${id}`).toHaveLength(0);
    }
  });
});

describe("⚠️ THE INVARIANTS (audit item 10) — column == source, as an equality", () => {
  const board = assembleBoard(base({
    userTasks: [
      utask("committed", { dueDate: "2026-09-01", committedDate: TODAY }),
      utask("later", { dueDate: "2026-09-02" }),
      utask("donetoday", { dueDate: "2026-08-05", done: true, completedAt: "2026-08-06T09:00:00Z" }),
    ],
  }));
  const cols = boardColumns({ board, flags: [], today: TODAY, nowMs: NOW, queries: [], agents: [], sweeps: [] });

  it("TODAY column == the Today page's committed set — the same derivation, rendered twice", () => {
    const page = todaySplit(board, TODAY).committed;
    expect(cols.today.map((c) => c.key).sort()).toEqual(page.map((c) => c.key).sort());
  });

  it("DONE column == today's log — the same cleared union", () => {
    const page = todaySplit(board, TODAY).done;
    expect(cols.done.map((c) => c.key).sort()).toEqual(page.map((c) => c.key).sort());
  });

  /* ⚠️ THE TRIPWIRE FOR THE FALSE PASS. The previous version of this case built a flag with NO
     taskType — `{queryId, snoozedUntil}` — which matched my column's loose `queryId ?? agentId`
     lookup but NOT `flagMatchesTask`, the check the real suppression path uses. So the fixture's
     card survived into the lanes and my column found it there, and the test went green while the
     live page showed Snoozed 1 in the list and 0 on the board.
     It was asserting the derivation against a fixture built to satisfy that derivation.
     These use REAL flag shapes, and assert the column against the COUNT's own source. */
  it("SNOOZED column is built from the FLAGS — the lanes cannot supply it", () => {
    const flags = [
      { id: "f1", userId: "u", taskType: "nudge_overdue", queryId: "q1", snoozeCount: 1, snoozedUntil: "2026-09-30T00:00:00Z" },
    ] as TaskFlag[];
    const cols = boardColumns({
      board: assembleBoard(base()), flags, today: TODAY, nowMs: NOW,
      queries: [{ id: "q1", agentId: "a1" }], agents: [{ id: "a1", name: "Marcus Reed", agency: "Reed Lit" }],
      sweeps: [],
    });
    // The lanes are EMPTY — the engine already dropped it — and the column still finds it.
    expect(cols.snoozed).toHaveLength(1);
    expect(cols.snoozed[0].title).toContain("Marcus Reed");
  });

  it("⚠️ COLUMN == COUNT: the Snoozed column's length equals the figure the LISTS row shows", () => {
    const flags = [
      { id: "f1", userId: "u", taskType: "nudge_overdue", queryId: "q1", snoozeCount: 1, snoozedUntil: "2026-09-30T00:00:00Z" },
      { id: "f2", userId: "u", taskType: "data_quality_poor", agentId: "a2", snoozeCount: 1, snoozedUntil: "2026-09-30T00:00:00Z" },
      { id: "f3", userId: "u", taskType: "nudge_overdue", queryId: "q3", snoozeCount: 0, snoozedUntil: "2026-08-01T00:00:00Z" }, // expired
    ] as TaskFlag[];
    const args = {
      board: assembleBoard(base()), flags, today: TODAY, nowMs: NOW,
      queries: [], agents: [], sweeps: [],
    };
    // The count's own source (useTodoCounts uses isFlagSuppressing over the same flags).
    const countsSays = flags.filter((f) => !!f.snoozedUntil && Date.parse(f.snoozedUntil) > NOW).length;
    expect(boardColumns(args).snoozed).toHaveLength(countsSays);
    expect(countsSays).toBe(2); // and the expired one is in neither
  });

  it("an EXPIRED flag puts nothing in Snoozed — it is awake, not asleep", () => {
    const expired = [
      { id: "f", userId: "u", taskType: "nudge_overdue", queryId: "q1", snoozeCount: 0, snoozedUntil: "2026-08-01T00:00:00Z" },
    ] as TaskFlag[];
    expect(snoozedCards({ flags: expired, queries: [], agents: [], nowMs: NOW })).toHaveLength(0);
  });

  /* ⚠️ THE TRIPWIRE FOR THE PARTITION. The badge counted 42 and the columns drew 27: housekeeping
     is COUNTED by members and RENDERED by rule group, so fifteen members had no card and nothing
     unfolded them. A sweep card now ACCOUNTS FOR its members, and this asserts the reconciliation
     rather than the card count. */
  it("⚠️ THE PARTITION SUMS: To do + Today + Snoozed == the actionable badge", () => {
    const b = assembleBoard(base({
      userTasks: [utask("t1", { dueDate: "2026-09-01" }), utask("t2", { dueDate: "2026-09-02" })],
    }));
    const sweeps = [sweepCardFor("dq_mswl", "Wish lists", 15, [])];
    const cols = boardColumns({ board: b, flags: [], today: TODAY, nowMs: NOW, queries: [], agents: [], sweeps });
    const badge = todoCounts(b, 15, 0).actionable; // 15 gaps is the housekeeping term
    expect(columnWeight(cols.todo) + columnWeight(cols.today) + columnWeight(cols.snoozed)).toBe(badge);
  });

  it("a sweep card weighs its members, an ordinary card weighs one", () => {
    const { card: sweep } = sweepCardFor("dq_mswl", "Wish lists", 15, []);
    expect(isSweepCard(sweep)).toBe(true);
    expect(cardWeight(sweep)).toBe(15);
    expect(cardWeight(card({}))).toBe(1);
    expect(sweep.due).toBe("15 TO FIX"); // the card states what it stands for
  });

  it("a member inside a sweep is NOT also loose on the board — that would double-count it", () => {
    const b = assembleBoard(base({ userTasks: [utask("t1", { dueDate: "2026-09-01" })] }));
    const loose = b.nt[0] ?? b.do[0];
    const sweeps = [sweepCardFor("dq_mswl", "Wish lists", 1, [loose.key])];
    const cols = boardColumns({ board: b, flags: [], today: TODAY, nowMs: NOW, queries: [], agents: [], sweeps });
    expect(cols.todo.filter((c) => c.key === loose.key)).toHaveLength(0);
  });

  it("no card appears in two columns — the board is a partition, not four filters", () => {
    const all = [...cols.todo, ...cols.today, ...cols.snoozed, ...cols.done].map((c) => c.key);
    expect(new Set(all).size).toBe(all.length);
  });

  it("the TODAY column's size is the counting law's Today component, not a second tally", () => {
    // The board and the badge read the same assembly; this asserts they cannot disagree.
    const counts = todoCounts(board, 0, 0);
    expect(counts.actionable).toBe(board.do.length + 0 + board.nt.filter((c) => c.nature === "task").length);
    expect(cols.today.length).toBe(todaySplit(board, TODAY).committed.length);
  });
});

describe("drags are the EXISTING verbs, and snooze is popover-gated", () => {
  const c = card({ key: "x" });

  it("→ Today commits; out of Today un-commits — one verb, reversed", () => {
    expect(dropPlan(c, "todo", "today")).toEqual({ kind: "commit" });
    expect(dropPlan(c, "today", "todo")).toEqual({ kind: "uncommit" });
  });

  it("⚠️ → Snoozed OPENS THE POPOVER — the card moves only once a date is chosen", () => {
    expect(dropPlan(c, "todo", "snoozed")).toEqual({ kind: "snooze-popover" });
    // …and never a silent snooze, which would be the app deciding when you want to see it again
    expect(dropPlan(c, "todo", "snoozed")).not.toEqual({ kind: "snooze" });
  });

  it("out of Snoozed returns it now; → Done completes; out of Done un-ticks", () => {
    expect(dropPlan(c, "snoozed", "todo")).toEqual({ kind: "unsnooze" });
    expect(dropPlan(c, "todo", "done")).toEqual({ kind: "complete" });
    expect(dropPlan(c, "done", "todo")).toEqual({ kind: "uncomplete" });
  });

  it("a drop on its own column does nothing", () => {
    expect(dropPlan(c, "today", "today")).toEqual({ kind: "none" });
  });
});

describe("an offer cannot be put away", () => {
  const offer = card({ key: "o", taskType: "offer_received" });

  it("cannot be dropped on Snoozed, and the refusal says why", () => {
    const plan = dropPlan(offer, "todo", "snoozed");
    expect(plan.kind).toBe("none");
    expect((plan as { why?: string }).why).toContain("reply-by");
  });

  it("can still be committed and completed — the guard is narrow, not a freeze", () => {
    expect(dropPlan(offer, "todo", "today")).toEqual({ kind: "commit" });
    expect(dropPlan(offer, "todo", "done")).toEqual({ kind: "complete" });
    expect(offerGuard(offer, "today").allowed).toBe(true);
  });
});

describe("NO STORED PLACEMENT — the schema gains nothing", () => {
  it("no board-position field exists anywhere in the types", () => {
    const types = readFileSync(join(process.cwd(), "src", "types.ts"), "utf8");
    for (const banned of ["boardColumn", "boardPosition", "columnId", "boardOrder", "laneOrder"]) {
      expect(types, `${banned} would be a second system`).not.toContain(banned);
    }
  });

  it("the column module writes nothing — it is pure derivation", () => {
    const src = readFileSync(join(process.cwd(), "src", "lib", "todoColumns.ts"), "utf8");
    for (const write of ["updateDoc", "setDoc", "addDoc", "deleteDoc", "firebase"]) {
      expect(src, `todoColumns must not write (${write})`).not.toContain(write);
    }
  });
});
