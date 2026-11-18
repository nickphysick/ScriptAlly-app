/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query card v160 (design-refs/query-card-v160/) — THE CARD'S MOTION WHEN A SAVE OR AN UNDO LANDS. Motion only: no
 * wording, layout, colour or behaviour changes. Every value is a literal or read off the page at the moment it runs, so
 * everything here is the Web Animations API (CLAUDE.md: no var() inside @keyframes, no color-mix()).
 *
 *   bump        the slide-in card's frame: `scale` 1 → 1.022 (35%) → 1 over 500ms, once. `scale` composes with the
 *               frame's `rotate` (its lean) and `translate` (its slide-in); `transform` is never set on the frame.
 *               A second bump ends the running one at once: they never stack.
 *
 * ⚠️ REDUCED MOTION: none of this runs (`reduced()`); every state changes at once, as before v160.
 */
export const reduced = (): boolean => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export const BUMP = { ms: 500, peak: 1.022, at: 0.35, ease: "cubic-bezier(0.2, 0.8, 0.2, 1)" } as const;
const bumps = new WeakMap<Element, Animation>();
/** Phase 1 — the bump, on the card's frame (the panel), never stacking */
export function bump(frame: HTMLElement | null): void {
  if (!frame || reduced()) return;
  bumps.get(frame)?.cancel();
  const a = frame.animate([
    { scale: "1", easing: BUMP.ease },
    { scale: String(BUMP.peak), offset: BUMP.at, easing: BUMP.ease },
    { scale: "1" },
  ], { duration: BUMP.ms });
  a.id = "qc160-bump";
  bumps.set(frame, a);
  const clear = () => { if (bumps.get(frame) === a) bumps.delete(frame); };
  a.finished.then(clear, clear);
}
