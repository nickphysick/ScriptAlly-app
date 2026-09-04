/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FLIP — First, Last, Invert, Play. Cards that get displaced by an insertion or a removal travel
 * to their new positions instead of teleporting.
 *
 * ⚠️ SETTLE BEFORE YOU MEASURE. This is the rule the whole helper exists to enforce, and it is not
 * theoretical — it is what broke the first version of the design mockup. Our entrance animations
 * use `fill-mode: both`, and a FINISHED animation with a fill mode still contributes to the
 * cascade at a higher precedence than an inline `transform`. A card that has run its entrance will
 * therefore accept the inline transform in the DOM and render as if it were never set: the bump
 * silently does nothing, with no error to find. `.sa-settled { animation: none !important }` clears
 * it, and every element is given that class BEFORE its first rect is read.
 *
 * JavaScript here MEASURES ONLY. The motion itself is a CSS transition, so this stays inside the
 * no-JS-timers rule — there is no rAF loop tweening positions, just one frame of setup.
 */

import { BUMP_EASING, BUMP_MS } from "./agentMotion";

/** Elements keyed by something stable across the re-render — the agent id, in practice. */
export type FlipRects = Map<string, DOMRect>;

/**
 * ⚠️ THE SELECTOR WAS A PARAMETER AND THE KEY WAS NOT, so a second surface could pick its own
 * elements and then read `undefined` for every one of them — `measureFlip` would return an empty
 * map, `playFlip` would take its `before.size === 0` early return, and the whole thing would do
 * NOTHING with no error to find. The two belong together: whoever chooses the elements chooses
 * what identifies them.
 *
 * `dataKey` is the camelCase dataset property, so `"qccId"` reads `data-qcc-id`. The default keeps
 * every existing caller byte-identical.
 */
export interface FlipOpts {
  selector?: string;
  dataKey?: string;
}

const DEFAULT_SELECTOR = "[data-agent-card]";
const DEFAULT_KEY = "agentCard";

/** Read every tracked element's position. Settling happens here, before the first measurement. */
export function measureFlip(
  container: HTMLElement | null,
  selectorOrOpts: string | FlipOpts = DEFAULT_SELECTOR,
): FlipRects {
  const { selector = DEFAULT_SELECTOR, dataKey = DEFAULT_KEY } =
    typeof selectorOrOpts === "string" ? { selector: selectorOrOpts } : selectorOrOpts;
  const rects: FlipRects = new Map();
  if (!container) return rects;
  const els = Array.from(container.querySelectorAll<HTMLElement>(selector));
  // SETTLE FIRST — see the note above. Done for every element before any rect is read, because
  // adding a class can itself change layout, and a half-settled measurement is worse than none.
  for (const el of els) el.classList.add("sa-settled");
  for (const el of els) {
    const key = el.dataset[dataKey];
    if (key) rects.set(key, el.getBoundingClientRect());
  }
  return rects;
}

/**
 * Invert and play: for each element that has MOVED, jump it back to where it was (with transitions
 * off), then release it on the next frame so the browser animates it to its real position.
 *
 * Only elements that actually moved are touched — see the note in the report about sixteen cards.
 * An element that stayed put gets no transform, no transition, and no compositor layer.
 */
export function playFlip(
  container: HTMLElement | null,
  before: FlipRects,
  opts: { durationMs?: number; easing?: string } & FlipOpts = {},
): number {
  if (!container || before.size === 0) return 0;
  const duration = opts.durationMs ?? BUMP_MS;
  /* ⚠️ THE CURVE IS THE CALLER'S, AND THE DEFAULT IS UNCHANGED. The grid's ref draws a different
     ease from the agent list's; changing the shared constant to suit one surface would have
     retimed the other silently. */
  const easing = opts.easing ?? BUMP_EASING;
  const dataKey = opts.dataKey ?? DEFAULT_KEY;
  const els = Array.from(container.querySelectorAll<HTMLElement>(opts.selector ?? DEFAULT_SELECTOR));
  const moved: { el: HTMLElement; dx: number; dy: number }[] = [];

  // Read ALL the new positions before writing any styles — interleaving reads and writes here
  // would force a layout per card (the classic thrash), which is what makes a big grid drop frames.
  for (const el of els) {
    const key = el.dataset[dataKey];
    const b = key ? before.get(key) : undefined;
    if (!b) continue;
    const a = el.getBoundingClientRect();
    const dx = b.left - a.left;
    const dy = b.top - a.top;
    if (dx || dy) moved.push({ el, dx, dy });
  }

  for (const { el, dx, dy } of moved) {
    el.style.transition = "none";
    el.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  requestAnimationFrame(() => {
    for (const { el } of moved) {
      el.style.transition = `transform ${duration}ms ${easing}`;
      el.style.transform = "";
    }
  });

  return moved.length;
}

/** Clear the settled class and any leftover inline motion styles once the bump has finished. */
export function clearFlip(container: HTMLElement | null, selector = DEFAULT_SELECTOR): void {
  if (!container) return;
  for (const el of Array.from(container.querySelectorAll<HTMLElement>(selector))) {
    el.classList.remove("sa-settled");
    el.style.transition = "";
    el.style.transform = "";
  }
}
