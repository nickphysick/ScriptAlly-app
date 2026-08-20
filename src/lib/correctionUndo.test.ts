/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 4 — a correction's undo retires when the record moves under it.
 */
import { describe, it, expect } from "vitest";
import { undoStillValid, undoMessage, undoMoveMessage, type PendingUndo } from "./correctionUndo";

const pending = (ids: string[]): PendingUndo =>
  ({ queryId: "q1", idsAfter: ids, restore: async () => {}, message: "x" });

describe("Phase 4 · when 'put it back' stops being truthful", () => {
  it("survives while nothing else has been written", () => {
    expect(undoStillValid(pending(["a", "b"]), ["a", "b"])).toBe(true);
  });

  /** ⚠️ ANYTHING APPENDED retires it — a response recorded against the corrected record. */
  it("retires when something is appended", () => {
    expect(undoStillValid(pending(["a", "b"]), ["a", "b", "c"]),
      "undo survived a write built on the corrected record").toBe(false);
  });

  /** ⚠️ AND ANYTHING ELSE REMOVED — a second correction is just as much a newer write. */
  it("retires when something else is removed", () => {
    expect(undoStillValid(pending(["a", "b"]), ["a"])).toBe(false);
  });

  /**
   * ⚠️ ORDER IS NOT A WRITE. A re-fetch can hand the ids back in a different sequence with nothing
   * having happened; treating that as a change would retire every undo on the next snapshot — the
   * failure would look like "undo never works" and have nothing to do with corrections.
   */
  it("a reordered snapshot is not a newer write", () => {
    expect(undoStillValid(pending(["a", "b", "c"]), ["c", "a", "b"]),
      "a harmless re-fetch retired the undo").toBe(true);
  });

  /**
   * ⚠️ THE CORRECTION'S OWN WRITES ARE THE BASELINE. `idsAfter` is taken once the operation has
   * landed, so a removal does not retire its own undo — the bug that would leave undo working only
   * for corrections that changed nothing.
   */
  it("the operation does not retire itself", () => {
    const afterRemoval = ["a", "c"];
    expect(undoStillValid(pending(afterRemoval), afterRemoval)).toBe(true);
  });
});

describe("Phase 4 · one toast per operation, naming event and query", () => {
  it("names the event and the agent", () => {
    expect(undoMessage("Partial requested", "Priya Raman")).toBe("Partial requested removed · Priya Raman");
  });

  /** ⚠️ REMOVE-BOTH MOVES TWO DOCUMENTS AND STILL RAISES ONE RECEIPT. */
  it("counts entries rather than raising a toast each", () => {
    expect(undoMessage("Partial requested", "Priya Raman", 2)).toBe("2 entries removed · Priya Raman");
  });

  it("a move names both ends, because it restores both", () => {
    expect(undoMoveMessage("Partial sent", "Priya Raman", "Sam Okoro"))
      .toBe("Partial sent moved · Priya Raman → Sam Okoro");
  });
});
