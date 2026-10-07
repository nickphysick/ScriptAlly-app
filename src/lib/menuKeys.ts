/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The shell menus' keyboard (ink shell v1, follow-up 2 §2): the arrow keys, Home and End move through
 * the rows that can be chosen; a row marked `aria-disabled="true"` (Add a manuscript, SOON) is never
 * a stop. Escape is the caller's, because each menu returns focus to its own control.
 */
export function menuRows(menu: HTMLElement | null): HTMLElement[] {
  if (!menu) return [];
  return [...menu.querySelectorAll<HTMLElement>('[role="menuitem"], [role="menuitemradio"]')]
    .filter((el) => el.getAttribute("aria-disabled") !== "true");
}

/** Move focus for an arrow/Home/End key; returns true when the key was a movement key. */
export function moveInMenu(e: { key: string; preventDefault: () => void }, menu: HTMLElement | null): boolean {
  const rows = menuRows(menu);
  if (!rows.length) return false;
  const i = rows.indexOf(document.activeElement as HTMLElement);
  let next: number;
  switch (e.key) {
    case "ArrowDown": next = i < 0 ? 0 : (i + 1) % rows.length; break;
    case "ArrowUp": next = i < 0 ? rows.length - 1 : (i - 1 + rows.length) % rows.length; break;
    case "Home": next = 0; break;
    case "End": next = rows.length - 1; break;
    default: return false;
  }
  e.preventDefault();
  rows[next].focus();
  return true;
}
