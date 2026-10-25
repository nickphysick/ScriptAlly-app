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
  /** Versions v2 — a line the item's done note adds beneath its count (optional; no other page sets one) */
  tip?: string;
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

export type ContactGuideKey = "add" | "search" | "pin" | "open" | "edit" | "hk";

export const CONTACT_CHECKLIST: readonly ChecklistItem<ContactGuideKey>[] = [
  { key: "add", title: "Add an agent", line: "One you'd love to query is a good start." },
  { key: "search", title: "Search for an agent", line: "Find anyone on your list by name or agency." },
  /* Contact list v19 §K, v20 §G, v24 F — the third of six: "Go full screen". Its spotlight is the list's navy bar's Full
     screen button, and it ticks when the list goes full screen. The key stays "pin", so a tick already earned is kept. */
  { key: "pin", title: "Go full screen", line: "Turn the list into an address book while you work." },
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
/** Help system v1 B — "Show the page guide again" */
export const GUIDE_UNHIDE_PATH: UserPaths = { [`${BASE}.hidden`]: false };
/** Help system v1 C.3 — with no agents yet, the items that need one, and the line each shows instead */
export const CONTACT_NEEDS_AN_AGENT: readonly ContactGuideKey[] = ["search", "pin", "open", "edit", "hk"];
export const CONTACT_ADD_FIRST = "Add an agent first";

/* ── the Query Centre's state (v139) ── */

export type QcGuideKey = "log" | "find" | "pin" | "open" | "resp" | "birds";

export const QC_CHECKLIST: readonly ChecklistItem<QcGuideKey>[] = [
  { key: "log", title: "Log a query", line: "Who you sent it to, and when." },
  { key: "find", title: "Find a query", line: "Search by agent or agency, or press Filters and tick a status." },
  /* Query Centre v140 §G, v142 §A — the third of six: "Go full screen" (the Contact list v20 wording). Its spotlight is the
     title row's Full screen button, and it ticks when the list goes full screen. The key stays `pin`, so a tick already
     earned stays earned. */
  { key: "pin", title: "Go full screen", line: "Turn the list into the whole page while you work." },
  { key: "open", title: "Open a query", line: "Its whole story, in one panel." },
  { key: "resp", title: "Record a response", line: "Try it on a practice query. Nothing is saved." },
  { key: "birds", title: "See the Birds-eye view", line: "Every live query on one timeline. Press B." },
];

/** With no queries yet, the items that need one (§A): the practice query does not, so "resp" is never here. */
/* v140 §G — "pin" too: with no queries the page draws its empty state, which has no list and so no Pin button */
export const QC_NEEDS_A_QUERY: readonly QcGuideKey[] = ["find", "pin", "open", "birds"];
export const QC_AFTER_FIRST = "After your first query";

export const QC_ALL_DONE = {
  title: "All done",
  line: "You know your way round the Query Centre. This checklist goes away next time you visit.",
};

const QC_BASE = "todoPrefs.queries.guide";

/** `finished`: all six (five before v140) were done in an earlier visit — the pill does not come back (v18.3 F). */
export interface QcGuideState extends GuideState<QcGuideKey> { finished: boolean }

export function qcGuideOf(user: User | null | undefined): QcGuideState {
  const g = (user?.todoPrefs as { queries?: { guide?: { done?: Record<string, unknown>; seen?: unknown; hidden?: unknown; finished?: unknown } } } | undefined)?.queries?.guide;
  const done: DoneMap<QcGuideKey> = {};
  for (const it of QC_CHECKLIST) if (g?.done?.[it.key] === true) done[it.key] = true;
  return { done, seen: g?.seen === true, hidden: g?.hidden === true, finished: g?.finished === true };
}
export const qcGuideDonePath = (k: QcGuideKey): UserPaths => ({ [`${QC_BASE}.done.${k}`]: true });
export const QC_GUIDE_SEEN_PATH: UserPaths = { [`${QC_BASE}.seen`]: true };
export const QC_GUIDE_HIDDEN_PATH: UserPaths = { [`${QC_BASE}.hidden`]: true };
/** Help system v1 B — "Show the page guide again" */
export const QC_GUIDE_UNHIDE_PATH: UserPaths = { [`${QC_BASE}.hidden`]: false };
export const QC_GUIDE_FINISHED_PATH: UserPaths = { [`${QC_BASE}.finished`]: true };

/* ── Manuscripts v27 Part D — the Manuscripts page's state ──
   ⚠️ ITS DONE FLAGS ARE NOT STORED: they are read from the saved manuscript (`lib/manuscriptV27.msGuideDone`). Only
      `seen` and `hidden` live here, per account, written by leaf like the other two pages'.
   ⚠️ NOT IN `GUIDE_PAGES` (yet): adding it changes the Help Centre's guide cards and every other page's "Your next
      guide is …", which are outside this pack. */

export type MsGuideKey = "details" | "logline" | "pitch" | "synopsis";

export const MS_CHECKLIST: readonly ChecklistItem<MsGuideKey>[] = [
  { key: "details", title: "Check your book's details", line: "Genre, age category and word count." },
  { key: "logline", title: "Write your logline", line: "The hook in a single sentence." },
  { key: "pitch", title: "Add an elevator pitch", line: "The 30-second version, said out loud." },
  { key: "synopsis", title: "Add a synopsis", line: "The whole story, ending included." },
];

const MS_BASE = "todoPrefs.manuscripts.guide";

export function msGuideOf(user: User | null | undefined): { seen: boolean; hidden: boolean } {
  const g = (user?.todoPrefs as { manuscripts?: { guide?: { seen?: unknown; hidden?: unknown } } } | undefined)?.manuscripts?.guide;
  return { seen: g?.seen === true, hidden: g?.hidden === true };
}
export const MS_GUIDE_SEEN_PATH: UserPaths = { [`${MS_BASE}.seen`]: true };
export const MS_GUIDE_HIDDEN_PATH: UserPaths = { [`${MS_BASE}.hidden`]: true };
export const MS_GUIDE_UNHIDE_PATH: UserPaths = { [`${MS_BASE}.hidden`]: false };

/* ── Help system v1 C.4 — the pages with a guide, in sidebar order, for the last note's "Your next guide is …" ──
   Help Centre v1 — and for the Help Centre's guide cards: each page's route, its sidebar group, its items, and what is
   done there. ⚠️ A CARD'S COUNT IS THE PILL'S COUNT (lock HC1-H2): the same done flags, the same credit for what is
   already on file (an agent ticks "Add an agent", a query ticks "Log a query"), the same skips on this device. */

/** What a card needs to know of the account's records: whether the page has anything on it yet. */
export interface GuideCounts { agents: number; queries: number }

export interface GuidePage {
  page: string;
  route: string;
  /** the sidebar group the page sits in (the card's eyebrow) */
  group: string;
  items: readonly ChecklistItem[];
  /** done flags as the page's pill reads them (saved ticks plus what is already on file) */
  done: (user: User | null | undefined, c: GuideCounts) => DoneMap;
  /** items that cannot be done yet (the page shows "Add an agent first" there) */
  blocked: (c: GuideCounts) => readonly string[];
  /** the account flag "finished in an earlier visit", where the page keeps one */
  finishedFlag: (user: User | null | undefined) => boolean;
  /** Restart: show the guide again and let it open by itself (never clears a done tick) */
  restart: UserPaths;
  finished: (user: User | null | undefined, skipped: readonly string[]) => boolean;
}

/** Pages with a guide, in the sidebar's order (Queries before Agents). Skips on this device count as done. */
export const GUIDE_PAGES: readonly GuidePage[] = [
  {
    page: "Query Centre", route: "/queries", group: "Queries", items: QC_CHECKLIST,
    done: (u, c) => ({ ...qcGuideOf(u).done, ...(c.queries > 0 ? { log: true } : {}) }),
    blocked: (c) => (c.queries > 0 ? [] : QC_NEEDS_A_QUERY),
    finishedFlag: (u) => qcGuideOf(u).finished,
    restart: { [`${QC_BASE}.seen`]: false, [`${QC_BASE}.hidden`]: false, [`${QC_BASE}.finished`]: false },
    finished: (u, sk) => { const g = qcGuideOf(u); return g.finished || QC_CHECKLIST.every((it) => g.done[it.key] || sk.includes(it.key)); },
  },
  {
    page: "Contact list", route: "/agents", group: "Agents", items: CONTACT_CHECKLIST,
    done: (u, c) => ({ ...contactGuideOf(u).done, ...(c.agents > 0 ? { add: true } : {}) }),
    blocked: (c) => (c.agents > 0 ? [] : CONTACT_NEEDS_AN_AGENT),
    finishedFlag: () => false,
    restart: { [`${BASE}.seen`]: false, [`${BASE}.hidden`]: false },
    finished: (u, sk) => { const g = contactGuideOf(u); return CONTACT_CHECKLIST.every((it) => g.done[it.key] || sk.includes(it.key)); },
  },
];

/** One Help Centre guide card. */
export interface GuideCard {
  page: string;
  route: string;
  group: string;
  total: number;
  /** done or skipped on this device, as the pill counts */
  n: number;
  /** per item, in order: counted */
  segs: boolean[];
  /** the first item, and the next one not counted and not blocked */
  first: string;
  next: string | null;
  finished: boolean;
}

export function guideCard(g: GuidePage, user: User | null | undefined, c: GuideCounts, skipped: readonly string[]): GuideCard {
  const done = g.done(user, c);
  const segs = g.items.map((it) => !!done[it.key] || skipped.includes(it.key));
  const n = segs.filter(Boolean).length;
  const blocked = g.blocked(c);
  const next = g.items.find((it, i) => !segs[i] && !blocked.includes(it.key))?.title ?? null;
  return {
    page: g.page, route: g.route, group: g.group, total: g.items.length, n, segs,
    first: g.items[0].title, next, finished: n === g.items.length || g.finishedFlag(user),
  };
}

/** The first page with a guide that is not finished, other than `page`; null when every other guide is done. */
export function nextGuideAfter(page: string, user: User | null | undefined, skippedOf: (page: string) => readonly string[]): string | null {
  for (const g of GUIDE_PAGES) if (g.page !== page && !g.finished(user, skippedOf(g.page))) return g.page;
  return null;
}

/* ── the Versions page's state (Versions v2 §GUIDE; design-refs/versions-v2 S19–S21, S28) ── */

export type VersionsGuideKey = "add" | "edit" | "use" | "check";

export const VERSIONS_CHECKLIST: readonly ChecklistItem<VersionsGuideKey>[] = [
  { key: "add", title: "Add a version", line: "Name it and list what changed.", tip: "A new version becomes the one in use. You can change that any time." },
  { key: "edit", title: "Edit a version", line: "Rename it, or add a change you missed." },
  { key: "use", title: "Change which version is in use", line: "The one new queries go out with." },
  { key: "check", title: "Check how a version is performing", line: "How far it gets, and every query it went with." },
];

/** What each step's spotlight card says (the ref's `ins`). */
export const VERSIONS_STEP_TEXT: Record<VersionsGuideKey, string> = {
  add: "Press New version. Name it, list what changed, and choose which version it starts from.",
  edit: "Press the pencil on any version to change its name, its changes or its word count.",
  use: "Press this on another version. New queries will go out with it from now on.",
  check: "Click any version that’s gone out.",
};

/** The line a locked step shows instead of its own (the ref's `lock`). */
export const VERSIONS_LOCKED: Record<Exclude<VersionsGuideKey, "add">, string> = {
  edit: "Unlocks after your first version",
  use: "Unlocks once you have two versions",
  check: "Unlocks once a version has gone out",
};

const VER_BASE = "todoPrefs.versions.guide";

export function versionsGuideOf(user: User | null | undefined): GuideState<VersionsGuideKey> {
  const g = (user?.todoPrefs as { versions?: { guide?: { done?: Record<string, unknown>; seen?: unknown; hidden?: unknown } } } | undefined)?.versions?.guide;
  const done: DoneMap<VersionsGuideKey> = {};
  for (const it of VERSIONS_CHECKLIST) if (g?.done?.[it.key] === true) done[it.key] = true;
  return { done, seen: g?.seen === true, hidden: g?.hidden === true };
}
export const versionsGuideDonePath = (k: VersionsGuideKey): UserPaths => ({ [`${VER_BASE}.done.${k}`]: true });
export const VERSIONS_GUIDE_SEEN_PATH: UserPaths = { [`${VER_BASE}.seen`]: true };
export const VERSIONS_GUIDE_HIDDEN_PATH: UserPaths = { [`${VER_BASE}.hidden`]: true };
export const VERSIONS_GUIDE_UNHIDE_PATH: UserPaths = { [`${VER_BASE}.hidden`]: false };
