/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v55 (design-refs/todo-list-v55/todo-tray-head-v2.html) — the tray head's words and the two derivations it
 * draws: the filter line (D4) and the collapsed strip's counts (D5). Pure: no React, no IO.
 *
 * ⚠️ THE STRIP'S COUNTS ARE THE CATEGORY GROUPS' OWN, read off `wsSections(all, "category")` — the derivation the
 *    tray's group headers and the page header's legend already read, so the three cannot disagree. They count every
 *    task (a filter narrows the list, never the strip), as the "To do" count does.
 */
import { wsSections, type WsFilters, type WsGrouping, type WsTask, type WsWhen } from "./todoWs";

/** the "Group by" hints, verbatim from the mock */
export const TRAY_GROUP_HINT: Record<WsGrouping, string> = {
  category: "Agents waiting · Nudges · Gone quiet · Housekeeping",
  urgency: "Needs you now · Housekeeping",
  when: "Overdue · This week · Coming up · No date",
  agent: "What you owe each person",
  none: "One flat list",
};

/** a when chip's word, verbatim from the mock (the brief names "No date") */
export const TRAY_WHEN_WORD: Record<WsWhen, string> = { Overdue: "Overdue", "Due this week": "Due this week", "Coming up": "Coming up", "No date": "No date" };

/** the filters on, in the menu's order, as the line names them; empty when none is on (grouping is never a filter) */
export function filterWords(f: WsFilters): string[] {
  return [...f.types, ...[...f.whens].map((w) => TRAY_WHEN_WORD[w])];
}

/** "Showing {x} of {y}: {filters}", or null when no filter is on */
export function filterLine(f: WsFilters, shown: number, total: number): string | null {
  const w = filterWords(f);
  return w.length ? `Showing ${shown} of ${total}: ${w.join(", ")}` : null;
}

/** the four groups the collapsed strip counts, with their names (the tooltip) */
export const STRIP_GROUPS: readonly { id: "wait" | "nudge" | "quiet" | "house"; name: string }[] = [
  { id: "wait", name: "Agents are waiting" },
  { id: "nudge", name: "Nudges" },
  { id: "quiet", name: "Gone quiet" },
  { id: "house", name: "Housekeeping" },
];

export function stripCounts(all: readonly WsTask[]): { id: string; name: string; n: number }[] {
  const secs = wsSections(all, "category");
  return STRIP_GROUPS.map((g) => ({ ...g, n: secs.find((s) => s.id === g.id)?.tasks.length ?? 0 }));
}
