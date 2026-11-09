/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * YOUR NOTES v1 (design-refs/your-notes-v1) — THE PAGE'S RULES, pure. What a stored `betaFeedback` doc reads as on the
 * page: its kind in the writer's words, its title, its chip, its counting line, the switch's four filters, the ring's
 * four buckets and the timeline. `yourNotes.test.ts` holds each one.
 *
 * The record is `betaFeedback`, written only by callables (`sendBetaFeedback`, `addFeedbackNote`, `markFeedbackSeen`) and
 * by the founder's desk; a writer reads their own. Every field is read defensively: anything missing or malformed is
 * read as absent, never guessed.
 *
 * ⚠️ BUILT AND FIXED ARE ONE OUTCOME TO A WRITER — "Now in the app" — and both count as four (Nick's ruling).
 * ⚠️ THE COUNTING LINE IS THE SERVER'S RULE, COPIED: the client cannot import from functions/. A note says "Counted"
 *    only where `functions/src/foundingContributions.ts` counts it (a status, `counted` not false, five words, among the
 *    week's first three). `yourNotes.test.ts` holds the copy's total equal to the server's `writerTotals` over fixtures.
 *    The page never computes a RANK: that is `foundingStats`, the server's.
 * ⚠️ COPY NEVER NAMES OUR FOUNDER: "our founder", "we", "us".
 */
import type { FeedbackKind } from "./beta";
import type { ComposeKey } from "./foundingCard";
import { dayMonth } from "./dates";

/* ── reading a stored note ─────────────────────────────────────────────────────────────────────────────────────── */

export type NoteStatus = "read" | "planned" | "built" | "fixed";
const STATUSES: readonly NoteStatus[] = ["read", "planned", "built", "fixed"];

export interface LogEntry { status: string; at: number | null; note: string | null }
export interface YourNote {
  id: string;
  kind: string;
  message: string;
  title: string | null;
  status: NoteStatus | null;
  statusAt: number | null;
  createdAt: number | null;
  pageName: string;
  /** `counted: false` excludes a note from counting (set by the desk) */
  counted: boolean | null;
  reply: { text: string; at: number | null } | null;
  writerSeenAt: number | null;
  statusLog: LogEntry[] | null;
}

/** A Firestore Timestamp, a number or an ISO string → epoch ms; anything else → null. */
export const msOf = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v && typeof (v as { toMillis?: unknown }).toMillis === "function") return (v as { toMillis: () => number }).toMillis();
  if (typeof v === "string") { const t = Date.parse(v); return Number.isFinite(t) ? t : null; }
  return null;
};
const str = (v: unknown): string => (typeof v === "string" ? v : "");

export function noteFrom(id: string, d: Record<string, unknown>): YourNote {
  const status = STATUSES.includes(d.status as NoteStatus) ? (d.status as NoteStatus) : null;
  const r = d.reply && typeof d.reply === "object" ? (d.reply as Record<string, unknown>) : null;
  const replyText = r ? str(r.text).trim() : "";
  const log = Array.isArray(d.statusLog)
    ? d.statusLog.flatMap((e) => (e && typeof e === "object" && typeof (e as { status?: unknown }).status === "string"
      ? [{ status: (e as { status: string }).status, at: msOf((e as { at?: unknown }).at), note: str((e as { note?: unknown }).note).trim() || null }]
      : []))
    : null;
  const title = str(d.title).trim();
  return {
    id,
    kind: str(d.kind),
    message: str(d.message).trim(),
    title: title || null,
    status,
    statusAt: msOf(d.statusAt),
    createdAt: msOf(d.createdAt),
    pageName: str(d.pageName).trim(),
    counted: typeof d.counted === "boolean" ? d.counted : null,
    reply: replyText ? { text: replyText, at: msOf(r!.at) } : null,
    writerSeenAt: msOf(d.writerSeenAt),
    statusLog: log && log.length ? log : null,
  };
}

/** Newest first; undated last. */
export const byNewest = (a: YourNote, b: YourNote): number => (b.createdAt ?? -Infinity) - (a.createdAt ?? -Infinity);

/* ── the kind ──────────────────────────────────────────────────────────────────────────────────────────────────── */

/** The pop-up's three ways in, from the kind the callable stored. "Article" (Help Centre) is none of them. */
export function composeKeyOf(kind: string): ComposeKey | null {
  if (kind === "Something I liked") return "like";
  if (kind === "Something's broken" || kind === "Something's confusing") return "dont";
  if (kind === "An idea") return "idea";
  return null;
}

/** The kind in the writer's own words (curly apostrophes, as the copy is written). */
export function kindWords(kind: FeedbackKind | string): string {
  switch (kind) {
    case "Something's broken": return "Something’s broken";
    case "Something's confusing": return "Something’s confusing";
    case "Something I liked": return "What I like";
    case "An idea": return "An idea";
    case "Article": return "About an article";
    default: return kind || "A note";
  }
}

/* ── the row ───────────────────────────────────────────────────────────────────────────────────────────────────── */

export const TITLE_CUT = 90;
/** The desk's title, or the message in curly quotes cut at about 90 characters. */
export function rowTitle(n: Pick<YourNote, "title" | "message">): string {
  if (n.title) return n.title;
  const m = n.message.replace(/\s+/g, " ");
  return `“${m.length > TITLE_CUT ? `${m.slice(0, TITLE_CUT - 2).trim()}…` : m}”`;
}

/** A reply the writer has not seen: newer than `writerSeenAt` (or never seen). A reply with no date counts as new until seen. */
export function hasNewReply(n: Pick<YourNote, "reply" | "writerSeenAt">): boolean {
  if (!n.reply) return false;
  if (n.writerSeenAt == null) return true;
  return n.reply.at != null && n.reply.at > n.writerSeenAt;
}
export const newReplyCount = (notes: readonly YourNote[]): number => notes.filter(hasNewReply).length;

/* ── where a note is: the ring's buckets and the chips ─────────────────────────────────────────────────────────── */

export type BucketKey = "none" | "read" | "planned" | "inapp";
export const bucketOf = (s: NoteStatus | null): BucketKey => (s === "built" || s === "fixed" ? "inapp" : s ?? "none");

export const BUCKETS: readonly { key: BucketKey; label: string; fill: string; ink: string; hatch?: boolean }[] = [
  { key: "none", label: "Not read yet", fill: "#f1eee9", ink: "#5b4f47", hatch: true },
  { key: "read", label: "Read", fill: "#efe7da", ink: "#5b4f47" },
  { key: "planned", label: "Planned", fill: "#d9e1ea", ink: "#5b4f47" },
  { key: "inapp", label: "Now in the app", fill: "#ecd6d2", ink: "#5b4f47" },
];
export function bucketCounts(notes: readonly YourNote[]): Record<BucketKey, number> {
  const c: Record<BucketKey, number> = { none: 0, read: 0, planned: 0, inapp: 0 };
  for (const n of notes) c[bucketOf(n.status)] += 1;
  return c;
}
/** the ring's middle: everything we have read */
export const readSoFar = (c: Record<BucketKey, number>): number => c.read + c.planned + c.inapp;

/** The chip: the band's "Your last note" classes, one per status. */
export const CHIP: Record<BucketKey, { cls: "wt" | "rd" | "pl" | "ok"; label: string }> = {
  none: { cls: "wt", label: "Not read yet" },
  read: { cls: "rd", label: "Read" },
  planned: { cls: "pl", label: "Planned" },
  inapp: { cls: "ok", label: "Now in the app" },
};

/* ── the switch ────────────────────────────────────────────────────────────────────────────────────────────────── */

export type FilterKey = "all" | "replies" | "open" | "done";
export const FILTERS: readonly { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" }, { key: "replies", label: "With a reply" }, { key: "open", label: "Still open" }, { key: "done", label: "In the app" },
];
/** Still open: not read yet, planned, or read for anything but "What I like". */
export function passes(n: YourNote, f: FilterKey): boolean {
  const b = bucketOf(n.status);
  switch (f) {
    case "all": return true;
    case "replies": return !!n.reply;
    case "open": return b === "none" || b === "planned" || (b === "read" && n.kind !== "Something I liked");
    case "done": return b === "inapp";
  }
}
export const filterCounts = (notes: readonly YourNote[]): Record<FilterKey, number> =>
  Object.fromEntries(FILTERS.map((f) => [f.key, notes.filter((n) => passes(n, f.key)).length])) as Record<FilterKey, number>;
/** A ring segment or legend row sets the switch. */
export const FILTER_FOR_BUCKET: Record<BucketKey, FilterKey> = { none: "open", planned: "open", inapp: "done", read: "all" };

/* ── counting: the server's rule, copied (see the header) ──────────────────────────────────────────────────────── */

export const MIN_WORDS = 5;
export const WEEKLY_CAP = 3;
export const NOW_IN_APP_WORTH = 4;
export const wordCount = (m: string): number => m.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

function londonDay(ms: number): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(ms));
  const n = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return Date.UTC(n("year"), n("month") - 1, n("day"));
}
function isoWeekLondon(ms: number): string {
  const d = new Date(londonDay(ms));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) + 3);
  const year = d.getUTCFullYear();
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const week = 1 + Math.round(((d.getTime() - jan4.getTime()) / 86_400_000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
  return `${year}-W${week}`;
}

export type CountState = { state: "pending" } | { state: "counted"; worth: number } | { state: "silent" };
/**
 * Each note's line. pending → "Counts once we've read it"; counted → "Counted" / "Counted as 4 notes"; silent → nothing
 * (excluded, under five words, or past the week's three).
 */
export function countStates(notes: readonly YourNote[]): Map<string, CountState> {
  const out = new Map<string, CountState>();
  const words = (n: YourNote) => wordCount(n.message) >= MIN_WORDS && n.counted !== false;
  const counting = notes.filter((n) => n.status && words(n)).sort((a, b) => (a.createdAt ?? Infinity) - (b.createdAt ?? Infinity));
  const perWeek = new Map<string, number>();
  let undated = 0;
  for (const n of counting) {
    const wk = n.createdAt == null ? `undated-${undated++}` : isoWeekLondon(n.createdAt);
    const k = perWeek.get(wk) ?? 0;
    const inApp = n.status === "built" || n.status === "fixed";
    if (k < WEEKLY_CAP) { perWeek.set(wk, k + 1); out.set(n.id, { state: "counted", worth: inApp ? NOW_IN_APP_WORTH : 1 }); }
    /* past the week's three the base point is capped but the bonus is not (the server's rule) */
    else if (inApp) out.set(n.id, { state: "counted", worth: NOW_IN_APP_WORTH - 1 });
  }
  for (const n of notes) {
    if (out.has(n.id)) continue;
    out.set(n.id, !n.status && words(n) ? { state: "pending" } : { state: "silent" });
  }
  return out;
}

/* ── the timeline ──────────────────────────────────────────────────────────────────────────────────────────────── */

const STEP_WORDS: Record<string, string> = { sent: "Sent", read: "Read", planned: "Planned", built: "Now in the app", fixed: "Now in the app", reopened: "Opened again" };
export interface TimelineStep { label: string; at: number | null; note: string | null; todo: boolean }

/**
 * `statusLog` (newest last) after "Sent", or — with no log — "Sent" at `createdAt` plus the current status at
 * `statusAt` when both exist. Then the steps still to come, hollow: what lies ahead of where the note is now. A read
 * "What I like" has nothing ahead of it.
 */
export function timeline(n: YourNote): TimelineStep[] {
  const done: TimelineStep[] = [{ label: "Sent", at: n.createdAt, note: null, todo: false }];
  if (n.statusLog) {
    for (const e of n.statusLog) if (e.status !== "sent") done.push({ label: STEP_WORDS[e.status] ?? e.status, at: e.at, note: e.note, todo: false });
  } else if (n.status && n.statusAt != null) {
    done.push({ label: STEP_WORDS[n.status], at: n.statusAt, note: null, todo: false });
  }
  const b = bucketOf(n.status);
  const ahead = n.kind === "Something I liked" && b === "read" ? [] : ({ none: ["Read", "Planned", "In the app"], read: ["Planned", "In the app"], planned: ["In the app"], inapp: [] } as const)[b];
  return [...done, ...ahead.map((label) => ({ label, at: null, note: null, todo: true }))];
}

/** A built or fixed "What I don't" note can be said to be still happening. */
export const canReopen = (n: YourNote): boolean => (n.status === "built" || n.status === "fixed") && composeKeyOf(n.kind) === "dont";

/* ── dates ─────────────────────────────────────────────────────────────────────────────────────────────────────── */

const TIME = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
/** "Today", "6 Nov" */
export function shortDate(ms: number | null, now = Date.now()): string {
  if (ms == null) return "";
  return sameDay(new Date(ms), new Date(now)) ? "Today" : dayMonth(ms);
}
/** "Today, 09:52", "6 Nov, 21:14" */
export function stamp(ms: number | null, now = Date.now()): string {
  if (ms == null) return "";
  return `${shortDate(ms, now)}, ${TIME.format(new Date(ms))}`;
}

/* ── the words ─────────────────────────────────────────────────────────────────────────────────────────────────── */

export const NOTES_TITLE = (n: number): string => (n ? `${n} ${n === 1 ? "note" : "notes"} sent` : "Your notes");
export const CONTEXT_LINE = "Sent with it: the page, your browser and your account. Never anything you’ve written in QueryHawk.";
export const EMPTY_LINE = "Tell us what you like, what you don’t, or something you’d add. Each note shows here, with whether we’ve read it and what we did about it.";
export const LOAD_FAILED = "We couldn’t load your notes. Try again?";
export const KEY_LINES: readonly { key: BucketKey; line: string }[] = [
  { key: "none", line: "It’s with us. It counts towards your rank once we’ve read it." },
  { key: "read", line: "Our founder has read it, and often replies." },
  { key: "planned", line: "We’re going to do something about it." },
  { key: "inapp", line: "It’s fixed, or it’s been added. It counts as four notes." },
];
