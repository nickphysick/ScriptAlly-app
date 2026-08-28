/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from "vitest";
import { deckSlots, stepDeck, deckHasPaging, deckPosition } from "./carouselDeck";

const roles = (n: number, i: number) => deckSlots(n, i).map((s) => s.role);

describe("the shelf deck", () => {
  /**
   * ⚠️ THE EMPTY SHELF AND THE ADD AFFORDANCE ARE ONE OBJECT, BY ARITHMETIC. At zero manuscripts
   * the deck holds exactly the ghost, so it is the focus without a special case — and it shows its
   * label, because it has come forward.
   */
  it("at zero manuscripts the ghost is the whole deck, forward, labelled", () => {
    const slots = deckSlots(0, 0);
    expect(slots).toHaveLength(1);
    expect(slots[0]).toMatchObject({ role: "focus", isGhost: true, showGhostLabel: true, focusable: true });
    expect(deckHasPaging(0), "paging controls for a deck of one").toBe(false);
  });

  /** One manuscript: it is forward, the ghost peeks from behind on the right, unlabelled. */
  it("at one manuscript the ghost peeks, and its label hides", () => {
    const slots = deckSlots(1, 0);
    expect(roles(1, 0)).toEqual(["focus", "peek-right"]);
    expect(slots[1]).toMatchObject({ isGhost: true, showGhostLabel: false });
    expect(deckHasPaging(1)).toBe(true);
  });

  /** ⚠️ THE LABEL RETURNS WHEN THE GHOST COMES FORWARD — the same slot, a different role. */
  it("the ghost's label returns when it is paged to", () => {
    expect(deckSlots(1, 1)[1]).toMatchObject({ role: "focus", showGhostLabel: true });
  });

  it("neighbours peek both sides in the middle of a deck", () => {
    expect(roles(3, 1)).toEqual(["peek-left", "focus", "peek-right", "hidden"]);
  });

  /**
   * ⚠️ THE ASSERTION THE A11Y RULE RESTS ON. `opacity: 0` still takes tab focus, so a hidden tile
   * that is merely transparent is reachable by keyboard and read aloud from off-screen. Exactly one
   * slot is focusable, in every deck and at every index.
   */
  it("exactly one slot is focusable, always", () => {
    for (let n = 0; n <= 6; n++) {
      for (let i = 0; i <= n; i++) {
        const f = deckSlots(n, i).filter((s) => s.focusable);
        expect(f, `deck ${n} at ${i}`).toHaveLength(1);
        expect(f[0].role).toBe("focus");
      }
    }
  });

  /** ⚠️ NO WRAP-AROUND: the ends are ends, the same ruling the book pager carries. */
  it("stepping clamps at both ends rather than wrapping", () => {
    expect(stepDeck(0, -1, 3)).toBe(0);
    expect(stepDeck(3, 1, 3)).toBe(3);   // 3 manuscripts + ghost = 4 members, last index 3
    expect(stepDeck(1, 1, 3)).toBe(2);
    expect(stepDeck(1, -1, 3)).toBe(0);
  });

  /** An out-of-range index resolves rather than producing a deck with no focus. */
  it("an index past the end still yields exactly one focus", () => {
    expect(deckSlots(2, 99).filter((s) => s.role === "focus")).toHaveLength(1);
    expect(deckSlots(2, -5).filter((s) => s.role === "focus")).toHaveLength(1);
  });

  it("reads its position with the ghost counted", () => {
    expect(deckPosition(0, 2)).toBe("1 / 3");
    expect(deckPosition(2, 2)).toBe("3 / 3");
  });
});
