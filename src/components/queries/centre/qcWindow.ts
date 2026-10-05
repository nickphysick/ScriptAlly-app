/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The shell window's box, read once (lifted out of `QcRail` when the rail retired, v126 §4). The
 * Birds-eye tab places itself 24px inside it; `expandedBox` left with the expanded card (§6).
 */

/** What the window's own rect gives us. Read once, by whoever is placing something against it. */
export interface WinRect { top: number; left: number; right: number; height: number; width: number }

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
