/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v18.3 §F — A PAGE'S "GETTING STARTED" CHECKLIST: the pure half. What is done, what comes next, where the
 * spotlight's hole and step card go, and the per-account state's read and write paths. The component that draws it is
 * `shell/guide/PageChecklist`; a page supplies its own items, targets and done flags (only the Contact list has one).
 *
 * ⚠️ DONE IS READ FROM APP STATE AND REAL SAVES, NEVER FROM WHICH BUTTON STARTED THE JOURNEY (§F.4). The guide's own rows
 *    only SHOW; nothing here or in the component ever marks an item done.
 * ⚠️ STATE IS PER ACCOUNT, in `todoPrefs.contacts.guide.*`, beside Housekeeping's intro flag, and is written BY LEAF
 *    (`updateUserPaths`), as every `todoPrefs` writer must be.
 */
import type { User } from "../types";
import type { UserPaths } from "./userPaths";

export interface ChecklistItem<K extends string = string> {
  key: K;
  title: string;
  line: string;
}

export type DoneMap<K extends string = string> = Partial<Record<K, boolean>>;

export function doneCount<K extends string>(items: readonly ChecklistItem<K>[], done: DoneMap<K>): number {
  return items.reduce((n, it) => n + (done[it.key] ? 1 : 0), 0);
}

/** The next item not yet done, starting after `after` and wrapping; null when all are done. */
export function nextUndone<K extends string>(items: readonly ChecklistItem<K>[], done: DoneMap<K>, after?: K): ChecklistItem<K> | null {
  const start = after ? items.findIndex((i) => i.key === after) + 1 : 0;
  for (let k = 0; k < items.length; k++) {
    const it = items[(start + k) % items.length];
    if (!done[it.key]) return it;
  }
  return null;
}

/* ── the spotlight's geometry ── */

export interface Box { left: number; top: number; width: number; height: number }

export const HOLE_PAD = 8;
export const CARD_GAP = 12;
export const CARD_MAX_W = 320;

/** The hole: 8px around the target, its radius min(14, half its height). */
export function holeFor(t: Box): Box & { r: number } {
  const h = { left: t.left - HOLE_PAD, top: t.top - HOLE_PAD, width: t.width + 2 * HOLE_PAD, height: t.height + 2 * HOLE_PAD };
  return { ...h, r: Math.min(14, h.height / 2) };
}

/** The dim's clip path: the whole window, less a rounded hole (even-odd), so the target is pressed THROUGH it. */
export function dimPath(vw: number, vh: number, h: Box & { r: number }): string {
  const { left: x, top: y, width: w, height: ht, r } = h;
  return `M0 0H${vw}V${vh}H0Z M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + ht - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + ht}`
    + `H${x + r}A${r} ${r} 0 0 1 ${x} ${y + ht - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
}

/** The step card: under the hole, 12px away; above it when it would not fit before the window's foot. Its left starts
 *  at the hole's left, held inside the window with a 12px margin. */
export function cardPlace(h: Box, card: { width: number; height: number }, vw: number, vh: number): { left: number; top: number; up: boolean } {
  const below = h.top + h.height + CARD_GAP;
  const up = below + card.height > vh - 12 && h.top - CARD_GAP - card.height >= 12;
  const top = up ? h.top - CARD_GAP - card.height : below;
  const left = Math.max(12, Math.min(h.left, vw - 12 - card.width));
  return { left, top, up };
}

/** How far to scroll the sheet so the target sits ~150px from the top, or 0 when it is already wholly in view. */
export function scrollDelta(t: Box, view: { top: number; bottom: number }, aim = 150): number {
  if (t.top >= view.top && t.top + t.height <= view.bottom) return 0;
  return t.top - (view.top + aim);
}

/* ── the Contact list's state ── */

export type ContactGuideKey = "add" | "search" | "open" | "edit" | "hk";

export const CONTACT_CHECKLIST: readonly ChecklistItem<ContactGuideKey>[] = [
  { key: "add", title: "Add an agent", line: "One you'd love to query is a good start." },
  { key: "search", title: "Search for an agent", line: "Find anyone on your list by name or agency." },
  { key: "open", title: "Open an agent's card", line: "Everything you know about them, in one place." },
  { key: "edit", title: "Edit an agent", line: "Fix a detail, or add what they're looking for." },
  { key: "hk", title: "Do some housekeeping", line: "Fill in one gap and watch List health climb." },
];

export interface GuideState<K extends string = string> { done: DoneMap<K>; seen: boolean; hidden: boolean }

const BASE = "todoPrefs.contacts.guide";

export function contactGuideOf(user: User | null | undefined): GuideState<ContactGuideKey> {
  const g = (user?.todoPrefs as { contacts?: { guide?: { done?: Record<string, unknown>; seen?: unknown; hidden?: unknown } } } | undefined)?.contacts?.guide;
  const done: DoneMap<ContactGuideKey> = {};
  for (const it of CONTACT_CHECKLIST) if (g?.done?.[it.key] === true) done[it.key] = true;
  return { done, seen: g?.seen === true, hidden: g?.hidden === true };
}
export const guideDonePath = (k: ContactGuideKey): UserPaths => ({ [`${BASE}.done.${k}`]: true });
export const GUIDE_SEEN_PATH: UserPaths = { [`${BASE}.seen`]: true };
export const GUIDE_HIDDEN_PATH: UserPaths = { [`${BASE}.hidden`]: true };
