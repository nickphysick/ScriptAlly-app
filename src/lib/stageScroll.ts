/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Stage scroll helpers. Since the AppShell migration the page scroll container is the shell's
 * stage element (#app-stage-scroll), not the window — the old `document.body` overflow locks used
 * by full-screen overlays no longer stop the page moving underneath. Overlays lock BOTH the body
 * (harmless belt-and-braces; still meaningful on mobile edge cases) and the stage.
 *
 * `lockStageScroll` returns a release function. Release always restores overflow to the empty
 * string (the stage never carries an inline overflow of its own), so a lock can never be wedged
 * by a stale captured value — releasing twice, or releasing after a route change, is safe.
 */

export const STAGE_SCROLL_ID = "app-stage-scroll";

export const getStageScrollEl = (): HTMLElement | null => document.getElementById(STAGE_SCROLL_ID);

export const lockStageScroll = (): (() => void) => {
  const stage = getStageScrollEl();
  if (stage) stage.style.overflow = "hidden";
  return () => {
    const el = getStageScrollEl();
    if (el) el.style.overflow = "";
  };
};
