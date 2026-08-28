/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE SHELF DECK — which tile is forward, which peek, and which are not there ═══════════════
 *
 * Ref: `design-refs/manuscripts-shelf-carousel-v2.html` (generated from the brief's prose — see the
 * note at the top of that file).
 *
 * ⚠️ THE ADD GHOST IS A MEMBER OF THE DECK, NOT CHROME BESIDE IT. That is what makes the empty
 * shelf and the add affordance ONE OBJECT rather than two things that must agree: at zero
 * manuscripts the deck holds exactly the ghost, so it is the focus by arithmetic rather than by a
 * special case. There is no "if empty" branch anywhere in this file.
 *
 * ⚠️ AND `focusable` IS A FIRST-CLASS FIELD BECAUSE `opacity: 0` STILL TAKES TAB FOCUS. A hidden
 * tile that is merely transparent is reachable by keyboard and reads its whole card to a screen
 * reader from somewhere off-screen. The renderer must apply this to `tabIndex` and `aria-hidden`;
 * putting it here means it can be asserted without a DOM.
 */

export type SlotRole = "focus" | "peek-left" | "peek-right" | "hidden";

export interface DeckSlot {
  /** Index into the deck: 0..count-1, where the LAST member is always the add ghost. */
  index: number;
  role: SlotRole;
  /** ⚠️ Exactly the focus tile. Everything else is out of the tab order. */
  focusable: boolean;
  /** True when this is the ghost — the last member. */
  isGhost: boolean;
  /**
   * ⚠️ THE GHOST'S LABEL HIDES WHILE IT PEEKS AND RETURNS WHEN IT COMES FORWARD. A dashed card
   * showing "＋ Add a manuscript" from behind another card reads as a second call to action
   * competing with the one in front of it.
   */
  showGhostLabel: boolean;
}

/**
 * The deck for `manuscriptCount` manuscripts, focused on `index`.
 *
 * ⚠️ NO WRAP-AROUND. The ends are ends — the same ruling the book pager carries, for the same
 * reason: wrapping makes the two ends indistinguishable from the middle, so a reader cannot tell
 * from the control whether they have reached the end of their own shelf.
 */
export const deckSlots = (manuscriptCount: number, index: number): DeckSlot[] => {
  const count = Math.max(1, manuscriptCount + 1); // + the ghost; never empty
  const focus = Math.min(Math.max(index, 0), count - 1);
  return Array.from({ length: count }, (_, i) => {
    const role: SlotRole =
      i === focus ? "focus"
        : i === focus - 1 ? "peek-left"
          : i === focus + 1 ? "peek-right"
            : "hidden";
    const isGhost = i === count - 1;
    return {
      index: i,
      role,
      focusable: role === "focus",
      isGhost,
      showGhostLabel: isGhost && role === "focus",
    };
  });
};

/** Clamped, because the ends are ends. Returns the same index at either end rather than wrapping. */
export const stepDeck = (index: number, delta: -1 | 1, manuscriptCount: number): number => {
  const count = Math.max(1, manuscriptCount + 1);
  return Math.min(Math.max(index + delta, 0), count - 1);
};

/**
 * ⚠️ THE CHEVRONS AND DOTS APPEAR AT TWO OR MORE — and "two" counts the GHOST, so one manuscript
 * plus its ghost is two and gets them. At zero the deck is the ghost alone: paging controls for a
 * deck of one advertise a shelf that is not there.
 */
export const deckHasPaging = (manuscriptCount: number): boolean => manuscriptCount >= 1;

/** `1 / 3` for the readout. Ghost included, because it is a member you can page to. */
export const deckPosition = (index: number, manuscriptCount: number): string =>
  `${Math.min(index, manuscriptCount) + 1} / ${manuscriptCount + 1}`;
