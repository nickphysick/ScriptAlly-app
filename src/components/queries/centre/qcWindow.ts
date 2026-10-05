/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The shell window's box, read once, and the expanded Birds-eye card placed against it.
 *
 * ⚠️ LIFTED OUT OF `QcRail` WHEN THE RAIL RETIRED (v126 §4). The expanded card was the rail's last
 * reader of this geometry; the rail is gone and the card is not (Phase 6 replaces it with the
 * drawer), so the two functions it needs moved here unchanged. The width below which the card is
 * refused is the rail's old stacking width, kept as a stated number: it no longer derives from a
 * rail that does not exist.
 */

/** The card's inset from the viewport's top and bottom — the rail's own, stated once. */
export const EXPANDED_INSET_Y = 16;
/** The window width below which there is no card to grow (the retired rail's stacking width). */
export const EXPANDED_MIN_WINDOW = 920;

/** What the window's own rect gives us. Read once, by whoever is placing something against it. */
export interface WinRect { top: number; left: number; right: number; height: number; width: number }

/**
 * §7 · The expanded card's box: the rail's own, grown leftwards to the window's far edge.
 *
 * ⚠️ IT KEEPS THE RAIL'S TOP, BOTTOM AND RIGHT — that is what makes the growth read as the SAME
 * card rather than a new one appearing in its place. Only `left` is new, and it is the window's own
 * left plus the same 22px gutter the right pays, so the card is inset equally on both sides.
 *
 * ⚠️ AND THE REF'S `calc(100vw − 224px − 44px)` IS ITS OWN FRAME AGAIN. In a drawn page the viewport
 * IS the window and the nav's 224px is a constant; here the sidebar collapses and the window's box
 * already knows the answer. A width derived from `100vw` would be 224px too wide the moment the
 * sidebar shut, and the card would run off the left of the screen.
 */
export interface ExpandedBox { top: number; height: number; left: number; width: number }
export function expandedBox(win: WinRect, group: { left: number; right: number }, viewportH: number): ExpandedBox | null {
  if (!(win.width > 0)) return null;
  if (win.width < EXPANDED_MIN_WINDOW) return null;
  /**
   * ⚠️ §4.1 · THE HEIGHT IS THE VIEWPORT'S, AND THIS IS THE ONE PLACE IT IS. Everywhere else in
   * this app a height taken from the viewport is the fault the house law is written against — but
   * the expanded card is an OVERLAY on a dimmed page and sits OVER the shell's bar, so the window
   * capsule is not its frame. Nothing is above it to be guessed at, which is the whole reason the
   * law exists; the exception is stated here rather than left to be rediscovered.
   */
  const height = viewportH - EXPANDED_INSET_Y * 2;
  const width = group.right - group.left;
  if (!(height > 0) || !(width > 0)) return null;
  /**
   * ⚠️ IT SPANS THE GROUP, NOT THE WINDOW (v65.2 §2). The card grows out of the rail, and the rail
   * is the group's second column — so growing to the window's edges would take it somewhere the
   * page it belongs to does not reach, and on a wide screen that is hundreds of pixels of desk on
   * each side.
   */
  /* ⚠️ NO `right`: the card is placed by left + width, and a third number about the same edge is a
     third thing that can disagree — and computing it would need `window`, which a pure function
     that a unit test calls does not have. */
  return { top: EXPANDED_INSET_Y, height, left: group.left, width };
}

/**
 * Read the shell's window capsule. `null` when it has not been laid out — never a zero rect.
 *
 * ⚠️ IT FALLS BACK TO THE DOCUMENT, AND THAT IS FOR THE PORTAL. The expanded card renders into
 * `document.body`, so walking UP from it never reaches the shell at all: `closest` found nothing,
 * the box came back null, and the card drew itself at the viewport's top-left corner — measured,
 * top 0 against the rail's 137.8. The window is a singleton in this shell, so asking the document
 * for it is not a guess; what would be a guess is assuming the caller is inside it.
 */
export function readWindow(el: Element | null): WinRect | null {
  const win = (el?.closest(".ws-window") ?? document.querySelector(".ws-window")) as HTMLElement | null;
  if (!win) return null;
  const r = win.getBoundingClientRect();
  return r.height > 0 && r.width > 0 ? { top: r.top, left: r.left, right: r.right, height: r.height, width: r.width } : null;
}
