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
import { boardColumns, dropPlan, offerGuard, boardEligible, TODO_COLUMNS } from "./todoColumns";

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
    const cols = boardColumns({ board, flags: [], today: TODAY, nowMs: NOW });
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
  const cols = boardColumns({ board, flags: [], today: TODAY, nowMs: NOW });

  it("TODAY column == the Today page's committed set — the same derivation, rendered twice", () => {
    const page = todaySplit(board, TODAY).committed;
    expect(cols.today.map((c) => c.key).sort()).toEqual(page.map((c) => c.key).sort());
  });

  it("DONE column == today's log — the same cleared union", () => {
    const page = todaySplit(board, TODAY).done;
    expect(cols.done.map((c) => c.key).sort()).toEqual(page.map((c) => c.key).sort());
  });

  it("SNOOZED column == the snoozed set, and an expired flag returns the card to To do", () => {
    const flags = [{ queryId: "later", snoozedUntil: "2026-09-30T00:00:00Z" } as TaskFlag];
    const asleep = boardColumns({ board, flags, today: TODAY, nowMs: NOW });
    expect(asleep.snoozed.map((c) => c.userTaskId)).toEqual(["later"]);
    expect(asleep.todo.some((c) => c.userTaskId === "later")).toBe(false);

    const expired = [{ queryId: "later", snoozedUntil: "2026-08-01T00:00:00Z" } as TaskFlag];
    const awake = boardColumns({ board, flags: expired, today: TODAY, nowMs: NOW });
    expect(awake.snoozed).toHaveLength(0);
    expect(awake.todo.some((c) => c.userTaskId === "later")).toBe(true);
  });

  it("a snooze BEATS a commit — the more recent decision wins, and the card is in one column only", () => {
    const flags = [{ queryId: "committed", snoozedUntil: "2026-09-30T00:00:00Z" } as TaskFlag];
    const cols2 = boardColumns({ board, flags, today: TODAY, nowMs: NOW });
    expect(cols2.snoozed.map((c) => c.userTaskId)).toEqual(["committed"]);
    expect(cols2.today.some((c) => c.userTaskId === "committed")).toBe(false);
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
