/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comps v28 §E · focus goes back to the control that opened a drawer, pop-up or picker.
 *
 * ⚠️ THE OPENER MAY HAVE BEEN RE-RENDERED: a card, or a "Log in a letter" link inside one, is a new element once the
 *    page repaints after a save. Every opener carries `data-cx-key` (its identity: "card:<comp key>", "pick:<comp key>",
 *    "add", "how-link", …), and when the element itself has left the document the one on screen with the same key
 *    takes focus instead.
 * ⚠️ AND A LINK INSIDE A CARD CAN LEAVE FOR GOOD: "Log in a letter" on a shelf comp is gone once a letter names it
 *    (the comp is then a draft). Its identity is the card's, so the card takes focus (`pick:K` / `edit:K` → `card:K`).
 */
export function openerOf(): HTMLElement | null {
  const a = document.activeElement as HTMLElement | null;
  return a && a !== document.body ? a : null;
}

const onScreen = (key: string): HTMLElement | null =>
  [...document.querySelectorAll<HTMLElement>(`[data-cx-key="${CSS.escape(key)}"]`)].find((e) => e.getBoundingClientRect().height > 0) ?? null;

export function refocus(el: HTMLElement | null): void {
  if (!el) return;
  let target: HTMLElement | null = el;
  if (!el.isConnected) {
    const key = el.getAttribute("data-cx-key");
    const card = key?.match(/^(?:pick|edit|land):(.+)$/)?.[1];
    target = key ? onScreen(key) ?? (card ? onScreen(`card:${card}`) : null) : null;
  }
  target?.focus({ preventScroll: true });
}
