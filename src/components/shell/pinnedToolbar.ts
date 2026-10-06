/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The pinned-toolbar hairline (ink shell v1, Phase 5; ref design-refs/shell/ink-shell-scroll-v1.html,
 * "clean edge"). The page clips cleanly at the sheet's paper edge with no scroll fade; a toolbar that
 * stays put while the page scrolls under it gains a 1px hairline once content has gone beneath it.
 *
 * ⚠️ ONE SHARED UTILITY, AND A PAGE'S WHOLE PART IN IT IS ONE ATTRIBUTE. A toolbar opts in with
 * `data-pin-hairline`; the shell's existing capture-phase scroll reading (WorkspaceShell) calls this,
 * and the hairline itself is one rule in inkShell.css. No page restyles anything, and no page carries a
 * scroll listener of its own for it.
 *
 * ⚠️ DERIVED FROM THE VALUE ON EVERY READ — never an observer, whose missed event is permanent.
 */
export const PIN_ATTR = "data-pin-hairline";
export const PIN_UNDER = "data-under";
/** Content has to have travelled this far under the toolbar before the line shows (INK15). */
export const PIN_AFTER_PX = 3;

export function markPinnedToolbars(wrap: HTMLElement, scroller: HTMLElement): void {
  const under = scroller.scrollTop >= PIN_AFTER_PX;
  /* the toolbar belongs to this scroller's page — inside it (sticky) or beside it in the page's own grid */
  const scope = (scroller.closest(".wpg") as HTMLElement | null) ?? scroller;
  if (!wrap.contains(scope)) return;
  scope.querySelectorAll<HTMLElement>(`[${PIN_ATTR}]`).forEach((el) => {
    if (el.hasAttribute(PIN_UNDER) !== under) el.toggleAttribute(PIN_UNDER, under);
  });
}
