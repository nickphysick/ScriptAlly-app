/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ WHERE `/manuscripts` LANDS ════════════════════════════════════════════════════════════════
 *
 * ⚠️ A PICKER WITH ONE OPTION IS WHAT MAKES A LANDING LOOK UNFINISHED, whatever it looks like. At
 * exactly one manuscript there is no choice to offer, so the page opens the book.
 *
 * ⚠️ AND IT IS A ONE-SHOT, WHICH IS THE WHOLE DIFFICULTY. `← All manuscripts` navigates to
 * `/manuscripts` with no param — and a redirect that fires whenever the param is absent would send
 * the reader straight back to the book they just left, in the same frame. The control would look
 * inert while working perfectly, which is a fault this repo has already paid for once on Query
 * Centre: the link navigated, an effect saw the param go, and restored the selection before
 * anything painted.
 *
 * So the decision is a pure function of (count, param, alreadyLanded), and `alreadyLanded` is the
 * caller's one-shot latch. Pure, so the round trip can be asserted without a browser.
 */

export interface LandingInput {
  /** How many manuscripts the writer has. */
  count: number;
  /** The `?m=` value, or null when absent. */
  param: string | null;
  /** True once this mount has auto-landed — set by the caller when it acts on `land`. */
  alreadyLanded: boolean;
}

/**
 * `null` means render whatever the param says (the shelf, or the named book). A string means
 * navigate to that manuscript.
 */
export const landingTarget = (
  input: LandingInput,
  onlyId: () => string | null,
): string | null => {
  /* A param is an explicit request and always wins — including one naming a book that no longer
     exists, which resolves to the shelf downstream rather than being second-guessed here. */
  if (input.param) return null;
  /* ⚠️ EXACTLY ONE. At zero there is nothing to open; at two or more there is a choice to offer,
     and choosing for the writer is worse than showing them the list. */
  if (input.count !== 1) return null;
  /* ⚠️ THE LATCH. Without it `← All manuscripts` is unusable at one manuscript. */
  if (input.alreadyLanded) return null;
  return onlyId();
};
