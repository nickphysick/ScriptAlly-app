/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v5.1 §E — THE DESK'S JOURNEY SLOT. The desk is a third host of the query-action journeys, beside the
 * drawer and the query's side panel: it opens a journey with `panel.slot = DESK_SLOT`, and the drawer portals the
 * same shell, steps and writes into this node instead of the panel's.
 *
 * ⚠️ ONE NODE, CREATED ONCE AND MOVED — NEVER RE-RENDERED. A portal whose CONTAINER changes is a new portal: React
 *    unmounts the journey and mounts it again, and a parked journey's answers go with it. The desk card is keyed by
 *    its task (it rises when the task changes), so a slot rendered inside it would be a different element every time
 *    the writer looked at another row. Instead this one node lives for the page's lifetime and is MOVED: into the
 *    working card while a journey is open, into a hidden holder otherwise (connected either way, which the drawer
 *    requires when it looks the slot up).
 */
export const DESK_SLOT = "[data-td5-slot]";

let node: HTMLDivElement | null = null;

/** the slot node — the same element for the page's lifetime */
export function deskSlotNode(): HTMLDivElement {
  if (!node) {
    node = document.createElement("div");
    node.className = "td5-jslot";
    node.setAttribute("data-td5-slot", "");
  }
  return node;
}

/** put the node where it belongs now: the working card's host when there is one, else the holder */
export function placeDeskSlot(host: HTMLElement | null, holder: HTMLElement | null): void {
  const n = deskSlotNode();
  const want = host && host.isConnected ? host : holder;
  if (want && n.parentElement !== want) want.appendChild(n);
}
