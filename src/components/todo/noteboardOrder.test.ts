/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Noteboard — the writer's own order (paper run, Phase 3).
 *
 * ⚠️ THE ORDER LIVES ON THE USER, NOT THE NOTE. `UserTask` has no `order` field — recorded absent
 * in the first recon and still absent — and adding one means the closed `userTasks` rules
 * allowlist, which this run may not deploy. A field written but not deployed would leave every
 * drag DENIED on dev: a dead feature shipped live. `todoPrefs.noteboard.order` is allowlisted
 * today (proven against the deployed ruleset before use), so reorder persists now, with nothing
 * owed.
 *
 * ⚠️ AND THE LIST IS A PREFERENCE, NOT A SOURCE. It names ids; the notes are still the notes. An
 * id that no longer exists is ignored, and a note the list has never heard of still appears —
 * `createdAt` remains the answer for anything unplaced, so a stale list can never hide a note.
 */
import { describe, it, expect } from "vitest";
import { UserTask } from "../../types";
import { orderNotes, reorderIds } from "../../lib/noteboard";

const note = (id: string, day: string): UserTask => ({
  id, userId: "u1", text: id, done: false,
  createdAt: `2026-08-${day}T09:00:00Z`, updatedAt: "",
});
/* four notes, four days — newest-first by default is d, c, b, a */
const board = () => [note("a", "11"), note("b", "12"), note("c", "13"), note("d", "14")];
const seq = (ts: UserTask[]) => ts.map((t) => t.id).join(" ");

describe("⚠️ an absent or partial order never loses a note", () => {
  it("no list at all is createdAt descending — the shipped behaviour, unchanged", () => {
    expect(seq(orderNotes(board(), []))).toBe("d c b a");
  });

  it("a PARTIAL list places what it names and lets the rest fall back", () => {
    /* the list knows about two of four; the other two keep their date order, behind */
    expect(seq(orderNotes(board(), ["a", "c"]))).toBe("a c d b");
  });

  it("⚠️ a STALE id is ignored, and an unknown note still appears — a list cannot hide anything", () => {
    expect(seq(orderNotes(board(), ["zzz-deleted", "b"]))).toBe("b d c a");
    /* the population is preserved whatever the list says — the property that matters */
    for (const list of [[], ["a"], ["zzz"], ["d", "c", "b", "a"], ["a", "a", "b"]]) {
      expect(orderNotes(board(), list)).toHaveLength(4);
      expect(new Set(orderNotes(board(), list).map((t) => t.id)).size).toBe(4);
    }
  });
});

describe("⚠️ the move: from the middle, both directions", () => {
  it("dragging the third onto the first puts it AT the first, others closing up", () => {
    /* ends pass off-by-ones, so the fixture moves through the middle in both directions */
    expect(reorderIds(["d", "c", "b", "a"], "b", "d")).toEqual(["b", "d", "c", "a"]);
    expect(reorderIds(["d", "c", "b", "a"], "d", "b")).toEqual(["c", "b", "d", "a"]);
  });

  it("a no-op move and an unknown id both leave the list exactly as it was", () => {
    const start = ["d", "c", "b", "a"];
    expect(reorderIds(start, "c", "c")).toEqual(start);
    expect(reorderIds(start, "zzz", "c")).toEqual(start);
    expect(reorderIds(start, "c", "zzz")).toEqual(start);
  });

  it("⚠️ the result is TOTAL — every id in, every id out, exactly once", () => {
    const start = ["d", "c", "b", "a"];
    for (const from of start) for (const to of start) {
      const out = reorderIds(start, from, to);
      expect([...out].sort(), `${from}→${to}`).toEqual([...start].sort());
    }
  });

  it("the whole board round-trips: reorder, then order by it", () => {
    const next = reorderIds(["d", "c", "b", "a"], "b", "d");
    expect(seq(orderNotes(board(), next))).toBe("b d c a");
  });
});
