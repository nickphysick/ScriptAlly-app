/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QUERIES ON A PHONE v1 (design-refs/queries-mobile-v1/) — every figure, group and sentence the phone Query Centre
 * draws, as pure derivations over the desktop's own rows (`buildQcRows`). Nothing here decides anything new:
 *
 *  - the chips are `whereItStands`' four sets (the desktop v150 stat cards), plus All;
 *  - Your move is in the desktop's own urgency order (`statRows("you")`, earliest due first), so the top card is the
 *    first of that list;
 *  - every due date is `QcRow.expectedMs` (`expectedFor`: the writer's send-by date, the offer's deadline, or the
 *    agency's reply date);
 *  - the row's action words are the next-move words the desktop list uses (`nextWords`), and the top card's sentence
 *    is the query card's own strip (`stripOf`).
 *
 * ⚠️ THE HEADER LINE DOES NOT FOLLOW THE CHIP. "{sent} sent · {active} active" counts the manuscript's queries, so
 *    it reads the same whichever chip is chosen (QM1 L3).
 */
import { QueryStatus } from "../types";
import { STAGE_NAME, whereItStands, type QcRow, type WhereKey } from "./qcSummary";
import { statRows } from "./qc150";
import { nextDoor, nextWords } from "./queryActions/entry";
import { dayWords, stripOf, type Strip } from "./qcCardStory";
import { nudgePhase } from "./nudgeWindow";
import { dayMonth } from "./dates";

const DAY = 86_400_000;
export const startOfDay = (ms: number): number => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
const dayDiff = (ms: number, nowMs: number): number => Math.round((startOfDay(ms) - startOfDay(nowMs)) / DAY);
const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* ── the chips ─────────────────────────────────────────────────────────────────────────────────────────────── */

export type PhoneChip = WhereKey | "all";
export const PHONE_CHIPS: readonly PhoneChip[] = ["you", "agent", "quiet", "closed", "all"];
export const CHIP_LABEL: Record<PhoneChip, string> = { you: "Your move", agent: "Waiting", quiet: "Gone quiet", closed: "Closed", all: "All" };

export function chipCounts(rows: readonly QcRow[], nowMs: number): Record<PhoneChip, number> {
  const out: Record<PhoneChip, number> = { you: 0, agent: 0, quiet: 0, closed: 0, all: rows.length };
  for (const r of rows) out[whereItStands(r, nowMs)] += 1;
  return out;
}

/** "{sent} sent · {active} active": every query on the manuscript, and the ones not closed */
export function headerLine(rows: readonly QcRow[]): { sent: number; active: number } {
  return { sent: rows.length, active: rows.filter((r) => r.court !== "closed").length };
}

/** the tab opens on Your move, or on Waiting when nothing is the writer's */
export const defaultChip = (counts: Record<PhoneChip, number>): PhoneChip => (counts.you > 0 ? "you" : "agent");

export function rowsFor(rows: readonly QcRow[], chip: PhoneChip, nowMs: number): QcRow[] {
  if (chip === "all") return [...rows];
  return statRows(rows, chip, nowMs);
}

/* ── one row's words ──────────────────────────────────────────────────────────────────────────────────────── */

const agencyOf = (r: QcRow): string => (r.agency && r.agency !== "No agency" ? r.agency : "");
const join = (...xs: (string | null | undefined)[]): string => xs.filter(Boolean).join(" · ");

/** the row's one sub-line: what to do (Your move), where it stands (the rest) */
export function subLine(r: QcRow, nowMs: number): string {
  const w = whereItStands(r, nowMs);
  if (w === "you") return join(yourWords(r, nowMs), agencyOf(r));
  const stage = STAGE_NAME[r.status as QueryStatus] ?? String(r.status);
  if (w === "agent") return join(stage, agencyOf(r));
  const when = r.stageStartMs ?? r.sentMs;
  return join(when != null ? `${stage} ${dayWords(when, nowMs)}` : stage, agencyOf(r));
}

/** Your move's action, said to the writer: "Send your partial", "Decide on the offer", "Nudge Clara" */
export function yourWords(r: QcRow, nowMs: number): string {
  switch (r.status) {
    case QueryStatus.PARTIAL_REQUESTED: return "Send your partial";
    case QueryStatus.FULL_REQUESTED: return "Send your full";
    case QueryStatus.REVISE_RESUBMIT: return "Send your revision";
    case QueryStatus.OFFER: return "Decide on the offer";
    default: return nextWords(r, nowMs) ?? "Your move";
  }
}

export interface Stamp { text: string; late: boolean }
/** the date stamp on the right of a row: "8 days late" (dashed) when past, else the date; none when undated */
export function stampFor(r: QcRow, nowMs: number): Stamp | null {
  const w = whereItStands(r, nowMs);
  if (w === "closed") return { text: dayWords(r.lastMs, nowMs), late: false };
  if (r.expectedMs == null) return null;
  const n = dayDiff(r.expectedMs, nowMs);
  if (n < 0) return { text: `${-n} ${-n === 1 ? "day" : "days"} late`, late: true };
  if (n === 0) return { text: "Today", late: false };
  if (n === 1) return { text: "Tomorrow", late: false };
  if (n < 7) return { text: WEEKDAY[new Date(r.expectedMs).getDay()], late: false };
  return { text: dayWords(r.expectedMs, nowMs), late: false };
}

/** how much of the reply window has gone (0–1): from the send the window runs from to the reply date; null when undated */
export function windowGone(r: QcRow, nowMs: number): number | null {
  const start = r.stageStartMs ?? r.sentMs;
  if (r.expectedMs == null || start == null || r.expectedMs <= start) return null;
  return Math.max(0, Math.min(1, (nowMs - start) / (r.expectedMs - start)));
}

/* ── Your move: the top card and three groups ─────────────────────────────────────────────────────────────── */

export interface Hero { row: QcRow; pill: string; strip: Strip; sub: string; button: string | null }

/** the pill on the top card: "Due tomorrow", "8 days late", "Your move" when undated */
export function duePill(dueMs: number | null, nowMs: number): string {
  if (dueMs == null) return "Your move";
  const n = dayDiff(dueMs, nowMs);
  if (n < 0) return `${-n} ${-n === 1 ? "day" : "days"} late`;
  if (n === 0) return "Due today";
  if (n === 1) return "Due tomorrow";
  return `Due in ${n} days`;
}

export function heroOf(r: QcRow, first: string, agentWeeks: number | null, nowMs: number): Hero {
  const strip = stripOf({ row: r, first, nowMs, agentWeeks });
  const d = nextDoor(r, nowMs);
  return { row: r, pill: duePill(r.expectedMs, nowMs), strip, sub: strip.sub, button: d ? d.label : null };
}

export interface RowGroup { key: string; label: string; rows: QcRow[]; hot?: boolean }

/** Your move after its top card: Overdue (before today), This week (the next seven days), Later (and undated) */
export function yourMoveGroups(rows: readonly QcRow[], nowMs: number): { hero: QcRow | null; groups: RowGroup[] } {
  const mine = statRows(rows, "you", nowMs);
  const [hero, ...rest] = mine;
  const over: QcRow[] = [], week: QcRow[] = [], later: QcRow[] = [];
  for (const r of rest) {
    if (r.expectedMs == null) later.push(r);
    else { const n = dayDiff(r.expectedMs, nowMs); (n < 0 ? over : n < 7 ? week : later).push(r); }
  }
  const groups: RowGroup[] = [
    { key: "overdue", label: "Overdue", rows: over, hot: true },
    { key: "week", label: "This week", rows: week },
    { key: "later", label: "Later", rows: later },
  ].filter((g) => g.rows.length > 0);
  return { hero: hero ?? null, groups };
}

/** Waiting: replies due in the next seven days, then the rest */
export function waitingGroups(rows: readonly QcRow[], nowMs: number): { soon: QcRow[]; later: QcRow[] } {
  const mine = statRows(rows, "agent", nowMs);
  const soon: QcRow[] = [], later: QcRow[] = [];
  for (const r of mine) (r.expectedMs != null && dayDiff(r.expectedMs, nowMs) < 7 ? soon : later).push(r);
  return { soon, later };
}
/** a group of more than this many rows shows that many and "Show N more" */
export const GROUP_CAP = 6;

/** Gone quiet, the longest past its date first */
export function quietRows(rows: readonly QcRow[], nowMs: number): QcRow[] {
  return rows.filter((r) => whereItStands(r, nowMs) === "quiet")
    .sort((a, b) => (a.expectedMs ?? a.stageStartMs ?? 0) - (b.expectedMs ?? b.stageStartMs ?? 0) || a.agentName.localeCompare(b.agentName));
}

/* ── All: search, sort and four sections ──────────────────────────────────────────────────────────────────── */

export type PhoneSort = "due" | "recent" | "agent";
export const PHONE_SORTS: readonly { key: PhoneSort; label: string }[] = [
  { key: "due", label: "Due first" }, { key: "recent", label: "Recently updated" }, { key: "agent", label: "Agent A–Z" },
];
const lastNull = (x: number | null, y: number | null) => (x == null && y == null ? 0 : x == null ? 1 : y == null ? -1 : x - y);
const SORT_CMP: Record<PhoneSort, (a: QcRow, b: QcRow) => number> = {
  due: (a, b) => lastNull(a.expectedMs, b.expectedMs) || a.agentName.localeCompare(b.agentName),
  recent: (a, b) => b.lastMs - a.lastMs || a.agentName.localeCompare(b.agentName),
  agent: (a, b) => a.agentName.localeCompare(b.agentName, "en", { sensitivity: "base" }) || a.agency.localeCompare(b.agency),
};
export const matchesFind = (r: QcRow, find: string): boolean => {
  const t = find.trim().toLowerCase();
  return !t || r.agentName.toLowerCase().includes(t) || r.agency.toLowerCase().includes(t);
};

export interface AllSection { key: WhereKey; label: string; count: number; top: QcRow[] }
/** All: the four sets in order, each sorted and searched; each shows its top two */
export function allSections(rows: readonly QcRow[], find: string, sort: PhoneSort, nowMs: number): AllSection[] {
  const found = rows.filter((r) => matchesFind(r, find));
  return (["you", "agent", "quiet", "closed"] as WhereKey[]).map((k) => {
    const mine = found.filter((r) => whereItStands(r, nowMs) === k).sort(SORT_CMP[sort]);
    return { key: k, label: CHIP_LABEL[k], count: mine.length, top: mine.slice(0, 2) };
  });
}

/* ── Coming up ────────────────────────────────────────────────────────────────────────────────────────────── */

export const COMING_DAYS = 21;
export interface ComingEntry { row: QcRow; sentence: string; sub: string }
export interface ComingDay { ms: number; today: boolean; weekday: string; date: number; entries: ComingEntry[] }
export interface ComingWeek { label: string; days: ComingDay[] }
export interface PastDue { n: number; nudge: number; send: number; ids: string[] }

/** a Monday-start week index, so "This week" and "Next week" are calendar weeks */
const weekStart = (ms: number): number => { const d = new Date(startOfDay(ms)); const k = (d.getDay() + 6) % 7; d.setDate(d.getDate() - k); return d.getTime(); };

export function comingSentence(r: QcRow, nowMs: number): ComingEntry {
  const first = r.agentName.trim().split(/\s+/)[0] || r.agentName;
  const w = whereItStands(r, nowMs);
  const stage = STAGE_NAME[r.status as QueryStatus] ?? String(r.status);
  const since = r.stageStartMs ?? r.sentMs;
  if (r.status === QueryStatus.OFFER) return { row: r, sentence: `Answer ${r.agentName}’s offer`, sub: agencyOf(r) };
  if (r.status === QueryStatus.PARTIAL_REQUESTED) return { row: r, sentence: `Send your partial to ${first}`, sub: agencyOf(r) };
  if (r.status === QueryStatus.FULL_REQUESTED) return { row: r, sentence: `Send your full to ${first}`, sub: agencyOf(r) };
  if (r.status === QueryStatus.REVISE_RESUBMIT) return { row: r, sentence: `Send your revision to ${first}`, sub: agencyOf(r) };
  if (w === "agent") return { row: r, sentence: `${r.agentName} should reply`, sub: since != null ? `${stage} ${dayWords(since, nowMs)}` : stage };
  return { row: r, sentence: `${yourWords(r, nowMs)} · ${r.agentName}`, sub: agencyOf(r) };
}

/** the next 21 days from today, in date order, skipping empty days; and what is already past its date */
export function comingUp(rows: readonly QcRow[], nowMs: number): { weeks: ComingWeek[]; past: PastDue } {
  const today = startOfDay(nowMs);
  const end = today + COMING_DAYS * DAY;
  const live = rows.filter((r) => r.court !== "closed");
  const byDay = new Map<number, QcRow[]>();
  for (const r of live) {
    if (r.expectedMs == null) continue;
    const d = startOfDay(r.expectedMs);
    if (d < today || d >= end) continue;
    byDay.set(d, [...(byDay.get(d) ?? []), r]);
  }
  const thisWeek = weekStart(nowMs);
  const weeks: ComingWeek[] = [];
  for (const d of [...byDay.keys()].sort((a, b) => a - b)) {
    const wk = weekStart(d);
    const label = wk === thisWeek ? "This week" : wk === thisWeek + 7 * DAY ? "Next week" : "Later";
    let w = weeks[weeks.length - 1];
    if (!w || w.label !== label) { w = { label, days: [] }; weeks.push(w); }
    const date = new Date(d);
    w.days.push({
      ms: d, today: d === today, weekday: d === today ? "Today" : WEEKDAY[date.getDay()], date: date.getDate(),
      entries: byDay.get(d)!.sort((a, b) => a.agentName.localeCompare(b.agentName)).map((r) => comingSentence(r, nowMs)),
    });
  }
  const pastRows = pastDueRows(rows, nowMs);
  const nudge = pastRows.filter((r) => r.court === "agent" && nudgePhase({ expectedMs: r.expectedMs, stageStartMs: r.stageStartMs }, nowMs) === "nudge").length;
  const send = pastRows.filter((r) => r.court === "you").length;
  return { weeks, past: { n: pastRows.length, nudge, send, ids: pastRows.map((r) => r.id) } };
}

/** the live queries whose date is before today: the overdue set Coming up's summary counts and opens */
export function pastDueRows(rows: readonly QcRow[], nowMs: number): QcRow[] {
  const today = startOfDay(nowMs);
  return rows.filter((r) => r.court !== "closed" && r.expectedMs != null && r.expectedMs < today)
    .sort((a, b) => (a.expectedMs ?? 0) - (b.expectedMs ?? 0));
}

/* ── the celebration ──────────────────────────────────────────────────────────────────────────────────────── */

export type Cheer = "partial" | "full" | "offer";
export const CHEER_STATUS: Record<Cheer, QueryStatus> = {
  partial: QueryStatus.PARTIAL_REQUESTED, full: QueryStatus.FULL_REQUESTED, offer: QueryStatus.OFFER,
};
const cheerOf = (s: string): Cheer | null =>
  s === QueryStatus.PARTIAL_REQUESTED ? "partial" : s === QueryStatus.FULL_REQUESTED ? "full" : s === QueryStatus.OFFER ? "offer" : null;

/**
 * Which query, if any, has just moved INTO a request or an offer: compared against the statuses the page saw last.
 * A query the page has not seen before is not a move (a first load, a manuscript switch), and a pass never cheers.
 */
export function cheerFrom(prev: ReadonlyMap<string, string>, rows: readonly { id: string; status: string }[]): { id: string; kind: Cheer } | null {
  for (const r of rows) {
    const was = prev.get(r.id);
    if (was == null || was === r.status) continue;
    const k = cheerOf(r.status);
    if (k) return { id: r.id, kind: k };
  }
  return null;
}

export interface CheerWords { headline: string; line: string; stats: { n: string; label: string }[]; button: string }
const ORD = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"];
/** "second", "tenth", then 11th, 21st, 22nd, 23rd, 101st, 111th */
export const ordinal = (n: number): string => {
  if (n >= 1 && n <= ORD.length) return ORD[n - 1];
  const t = n % 100, u = n % 10;
  return `${n}${t >= 11 && t <= 13 ? "th" : u === 1 ? "st" : u === 2 ? "nd" : u === 3 ? "rd" : "th"}`;
};

/** the celebration's words, from the manuscript's own queries */
export function cheerWords(kind: Cheer, r: QcRow, rows: readonly QcRow[], msTitle: string | null, nowMs: number): CheerWords {
  const first = r.agentName.trim().split(/\s+/)[0] || r.agentName;
  const fulls = rows.filter((x) => x.furthest === "full").length;
  const partials = rows.filter((x) => x.furthest === "partial" || x.furthest === "full").length;
  const heard = rows.filter((x) => x.status !== QueryStatus.QUERIED && x.status !== QueryStatus.NO_RESPONSE && x.status !== QueryStatus.WITHDRAWN).length;
  const pct = rows.length ? Math.round((heard / rows.length) * 100) : 0;
  const book = msTitle ? ` for ${msTitle}` : "";
  const by = r.expectedMs != null ? dayWords(r.expectedMs, nowMs) : null;
  const stats = [
    { n: String(fulls), label: fulls === 1 ? "full request" : "full requests" },
    { n: String(partials), label: partials === 1 ? "partial" : "partials" },
    { n: `${pct}%`, label: "heard back" },
  ];
  if (kind === "offer") {
    return { headline: `${first} made an offer!`, line: `An offer${book}.${by ? ` Answer by ${by}.` : ""}`, stats, button: "Answer the offer" };
  }
  const n = kind === "full" ? fulls : partials;
  const what = kind === "full" ? "full request" : "partial request";
  return {
    headline: `${first} wants the ${kind === "full" ? "full" : "partial"}!`,
    line: `That’s your ${ordinal(Math.max(1, n))} ${what}${book}.${by ? ` Send it by ${by}.` : ""}`,
    stats,
    button: kind === "full" ? "Send the full now" : "Send the partial now",
  };
}

/** sessionStorage: the chip chosen this session */
export const CHIP_KEY = "sa.qm1.chip";
export function readChip(): PhoneChip | null {
  try { const v = window.sessionStorage.getItem(CHIP_KEY); return (PHONE_CHIPS as readonly string[]).includes(v ?? "") ? (v as PhoneChip) : null; } catch { return null; }
}
export function writeChip(c: PhoneChip): void {
  try { window.sessionStorage.setItem(CHIP_KEY, c); } catch { /* storage refused: the chip still works for this visit */ }
}

/** the tab bar's Queries badge: the Your-move count on the manuscript the page is scoped to (the first chip's count) */
export function yourMoveBadge(rows: readonly QcRow[], scopeId: string | null, nowMs: number): number {
  return rows.filter((r) => (!scopeId || r.manuscriptId === scopeId) && whereItStands(r, nowMs) === "you").length;
}
/** the manuscript the phone page is scoped to: the shell's active key when it names a manuscript, else the first */
export function phoneScopeId(manuscripts: readonly { id: string }[], stored: string | null): string | null {
  return stored && manuscripts.some((m) => m.id === stored) ? stored : manuscripts[0]?.id ?? null;
}

/* ── Phone app v2, Part 3 (ref design-refs/phone-app-v2/src/v2.js screenQueries2, qsheet.js stageTrack) ──────────── */

/** the Queries tab's chips, in the ref's order; the default is All. SUPERSEDES Your move · All · Waiting · Coming up. */
export const PA2_CHIPS: readonly PhoneChip[] = ["all", "you", "agent", "quiet", "closed"];
export const PA2_CHIP_LABEL: Record<PhoneChip, string> = { all: "All", you: "With you", agent: "With the agent", quiet: "Gone quiet", closed: "Closed" };
/** All, grouped by whose move it is, in this order (ref groupHd) */
export const PA2_GROUPS: readonly Exclude<PhoneChip, "all">[] = ["you", "agent", "quiet", "closed"];

const dm = (ms: number) => dayMonth(ms);

/**
 * A row's next-date line (ref `.row .when`): a fact about the next date, never a verdict — no "late", no "overdue".
 * `mine` sets it in ink at 600 when the move is the writer's (ref `.when.mv`).
 */
export function nextDateLine(r: QcRow, nowMs: number): { text: string; mine: boolean } {
  const w = whereItStands(r, nowMs);
  if (w === "closed") return { text: `${STAGE_NAME[r.status as QueryStatus] ?? String(r.status)} ${dm(r.lastMs)}`, mine: false };
  if (w === "you") {
    /* your move is a send (a request), an answer (an offer), or — on a query still in the agent's court whose reply
       date has passed — a nudge */
    const request = r.status === QueryStatus.PARTIAL_REQUESTED || r.status === QueryStatus.FULL_REQUESTED || r.status === QueryStatus.REVISE_RESUBMIT;
    const verb = r.status === QueryStatus.OFFER ? "Answer by" : request ? "Send by" : "Nudge from";
    return { text: r.expectedMs != null ? `${verb} ${dm(r.expectedMs)}` : yourWords(r, nowMs), mine: true };
  }
  if (r.expectedMs == null) return { text: "No reply date", mine: false };
  return { text: r.expectedMs < nowMs ? `Reply was expected ${dm(r.expectedMs)}` : `Reply expected by ${dm(r.expectedMs)}`, mine: false };
}

/** the four-step stage track (Queried · Partial · Full · Offer): the step a query is at, or the furthest a closed one got */
export const STAGE_STEPS = ["Queried", "Partial", "Full", "Offer"] as const;
export function stageIndex(status: QueryStatus | string, seen: readonly (QueryStatus | string | null | undefined)[]): number {
  const at = (s: QueryStatus | string | null | undefined): number => {
    switch (s) {
      case QueryStatus.OFFER: case QueryStatus.SIGNED: return 3;
      case QueryStatus.FULL_REQUESTED: case QueryStatus.FULL_SENT: case QueryStatus.RESUBMITTED: return 2;
      case QueryStatus.PARTIAL_REQUESTED: case QueryStatus.PARTIAL_SENT: case QueryStatus.REVISE_RESUBMIT: return 1;
      default: return 0;
    }
  };
  const closed = status === QueryStatus.REJECTED || status === QueryStatus.NO_RESPONSE || status === QueryStatus.WITHDRAWN;
  return closed ? Math.max(0, ...seen.map(at)) : at(status);
}
