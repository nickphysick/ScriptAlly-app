/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do on the phone v1 (design-refs/todo-phone-v1/todo-phone-v1.html) — the small pure parts the phone's list and task
 * screen read. Everything else is the desktop workspace's own (lib/todoWs, components/todo/ws/useWsCore).
 */
import { wsSections, type WsSection, type WsTask } from "./todoWs";

/** the list's groups: the desktop's own, in `WS_GROUPS` order, empty ones left out */
export function phoneSections(all: readonly WsTask[]): WsSection[] {
  return wsSections(all, "category").filter((s) => s.tasks.length > 0);
}

/** every task in list order: what "{i} of {n}" counts and what the up/down arrows walk */
export function phoneOrder(all: readonly WsTask[]): WsTask[] {
  return phoneSections(all).flatMap((s) => s.tasks);
}

/** "late" in the band: a dated task past its date, Gone quiet excluded (the desktop header's own count) */
export function lateCount(seq: readonly WsTask[]): number {
  return seq.filter((t) => t.kind !== "quiet" && t.dueDays != null && t.dueDays < 0).length;
}

/** the word a slot on the band's card shows until its question is answered */
const SLOT_WORD: Record<string, string> = {
  mats: "What went", ver: "Version", date: "When", ans: "Answer", withdraw: "The others", act: "What next",
  by: "By when", sent: "Sent", until: "Until", what: "What came", why: "Why", wish: "Wishlist", wk: "Reply time",
};
export function slotWord(key: string, title: string): string {
  return SLOT_WORD[key] ?? title.replace(/[?.]$/, "").split(/\s+/).slice(0, 2).join(" ");
}

/** an answered slot: the answer's first part, and "+n" for the rest ("Query letter +2") */
export function slotAnswer(summary: string): string {
  /* only a list is shortened ("A, B and C"); a date ("Today, Saturday 7 November") reads whole */
  if (!/\s+and\s+/.test(summary)) return summary;
  const parts = summary.split(/,\s*|\s+and\s+/).filter(Boolean);
  if (parts.length <= 1) return summary;
  return `${parts[0]} +${parts.length - 1}`;
}

/** collapsed groups, remembered per device */
export const SHUT_KEY = "sa.todoPhoneShut";
export function readShut(): Set<string> {
  try { const v = JSON.parse(localStorage.getItem(SHUT_KEY) ?? "[]"); return new Set(Array.isArray(v) ? v.filter((x) => typeof x === "string") : []); } catch { return new Set(); }
}
export function writeShut(s: ReadonlySet<string>): void {
  try { localStorage.setItem(SHUT_KEY, JSON.stringify([...s])); } catch { /* private mode */ }
}
