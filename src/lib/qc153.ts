/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v153 (design-refs/query-centre-v153.html) — the slip's pure parts: the header's stage colour, the
 * arrow on the current step (did something come in, go out, or end), the four-step track with skipped steps, and the
 * facts row's words.
 *
 * ⚠️ THE COLOUR IS THE STAGE, NOT THE GROUP. Queried (and anything with no live stage, so every closed status) is
 *    sand; partial requested/sent rose; full requested/sent, R&R and Resubmitted blue; Offer and Signed heather.
 * ⚠️ NO RED. Nothing here returns a rust or late colour: a late Next box is a fill (`hot`), its text stays ink.
 */
import { QueryStatus } from "../types";
import { STAGE_NAME, type QcRow } from "./qcSummary";
import { CLOSED_STATUSES, isClosedRow, lastHeardMs, liveLevel, shortDate } from "./qc151";
import { nextNum, type NextNum } from "./qc1512";
import { stateOf } from "./queryState";

/* ── the header's colour ─────────────────────────────────────────────────────────────────────────────────────── */

export type SlipTone = "sand" | "rose" | "blue" | "heather";
export const SLIP_TONE_FILL: Record<SlipTone, string> = { sand: "#efe7da", rose: "#ecd6d2", blue: "#d9e1ea", heather: "#e7d6dc" };
export function slipTone(status: QueryStatus | string): SlipTone {
  if (CLOSED_STATUSES.includes(status as QueryStatus)) return "sand";
  switch (liveLevel(status as QueryStatus)) {
    case 1: return "rose";
    case 2: return "blue";
    case 3: return "heather";
    default: return "sand";
  }
}

/* ── the arrow ───────────────────────────────────────────────────────────────────────────────────────────────── */

export type SlipDir = "in" | "out" | "end";
const CAME_IN: ReadonlySet<string> = new Set([QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.REVISE_RESUBMIT, QueryStatus.OFFER, QueryStatus.SIGNED]);
/** something came in (the agent asked, R&R, an offer, signed), went out (queried, sent, resubmitted), or it ended */
export function slipDir(status: QueryStatus | string): SlipDir {
  if (CLOSED_STATUSES.includes(status as QueryStatus)) return "end";
  return CAME_IN.has(status) ? "in" : "out";
}

/* ── the status word ─────────────────────────────────────────────────────────────────────────────────────────── */

const CLOSED_SHORT: Partial<Record<string, string>> = { [QueryStatus.NO_RESPONSE]: "No reply" };
/** the status's own name; No Response in the filter's short words ("No reply") */
export const standWords = (r: Pick<QcRow, "status">): string => CLOSED_SHORT[r.status] ?? STAGE_NAME[r.status];

/* ── the four-step track ─────────────────────────────────────────────────────────────────────────────────────── */

export type NodeState = "reached" | "skip" | "cur" | "fut";
export type LinkState = "done" | "skip" | "fut";
export type EndGlyph = "rj" | "nr" | "wd";
export interface SlipTrack {
  /** four nodes: queried, partial, full, offer */
  nodes: NodeState[];
  /** three connectors, each the line INTO node k+1 */
  links: LinkState[];
  cur: number;
  ended: boolean;
  /** the closed glyph on the current step, for a closed query */
  end: EndGlyph | null;
  dir: SlipDir;
}
const FURTHEST_LEVEL: Record<QcRow["furthest"], number> = { query: 0, partial: 1, full: 2 };
const END_GLYPH: Partial<Record<string, EndGlyph>> = { [QueryStatus.REJECTED]: "rj", [QueryStatus.NO_RESPONSE]: "nr", [QueryStatus.WITHDRAWN]: "wd" };

/**
 * The track. A step before the current one is REACHED when the history holds a live span at that level (a query is
 * always reached), otherwise SKIPPED (query straight to full). The line into a skipped step is dotted; the line into
 * a reached step, or into the current one, is done. A closed query stops at its furthest stage, greyed.
 */
export function slipTrack(r: Pick<QcRow, "status" | "furthest" | "history">): SlipTrack {
  const ended = isClosedRow(r);
  const cur = ended ? FURTHEST_LEVEL[r.furthest] ?? 0 : liveLevel(r.status);
  const seen = new Set<number>([0]);
  for (const s of r.history.spans) if (!CLOSED_STATUSES.includes(s.status)) seen.add(liveLevel(s.status));
  const nodes: NodeState[] = [0, 1, 2, 3].map((i) => (i === cur ? "cur" : i > cur ? "fut" : seen.has(i) ? "reached" : "skip"));
  const links: LinkState[] = [1, 2, 3].map((i) => (i > cur ? "fut" : nodes[i] === "skip" ? "skip" : "done"));
  return { nodes, links, cur, ended, end: ended ? END_GLYPH[r.status] ?? "rj" : null, dir: slipDir(r.status) };
}

/* ── the facts row ───────────────────────────────────────────────────────────────────────────────────────────── */

const DAY = 86_400_000;
const sod = (ms: number): number => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
const ago = (ms: number, nowMs: number): number => Math.max(0, Math.round((sod(nowMs) - sod(ms)) / DAY));

export interface Fact { value: string; line: string | null; soft?: boolean }
/** Queried: the date, and "over a year ago" / "N days ago" */
export function queriedFact(r: Pick<QcRow, "sentMs">, nowMs: number): Fact {
  if (r.sentMs == null) return { value: "—", line: null };
  const n = ago(r.sentMs, nowMs);
  return { value: shortDate(r.sentMs, nowMs), line: n > 365 ? "over a year ago" : n === 0 ? "today" : n === 1 ? "1 day ago" : `${n} days ago` };
}
/** Last heard: the date and the event in lower case, or "No reply yet" */
export function heardFact(r: Pick<QcRow, "history">, nowMs: number): Fact {
  const ms = lastHeardMs(r);
  if (ms == null) return { value: "No reply yet", line: null, soft: true };
  /* the AGENT's move on that day: a query sent the same day shares the date and must not name it */
  const span = r.history.spans.find((s) => s.startMs === ms && (slipDir(s.status) === "in" || s.status === QueryStatus.REJECTED));
  return { value: shortDate(ms, nowMs), line: span ? standWords(span).toLowerCase() : null };
}
/** Next: the existing Next wording (lib/qc1512 `nextNum`), joined onto one value */
export function nextWords(n: NextNum): string {
  if (n.kind === "dash") return "—";
  if (n.kind === "text") return n.text;
  return `${n.n} ${n.label[0]} ${n.label[1]}`;
}
export interface NextFact { value: string; hot: boolean; bar: number | null; line: string | null }
/**
 * The Next box: hot (the `#f6eee8` fill and the navy dot) when it is the writer's move or past its date; a
 * reply-window bar for Watch and wait (with the agent, inside the window), the share of the window gone.
 */
export function nextFact(r: QcRow, nowMs: number): NextFact {
  const n = nextNum(r, nowMs);
  const yours = r.court === "you" || r.court === "offer" || r.withYou;
  const hot = yours || (n.kind !== "dash" && n.tone === "late");
  let bar: number | null = null;
  const waiting = r.court === "agent" && !r.pastExpected && (stateOf(r) === "agent" || stateOf(r) == null);
  if (!hot && waiting && r.expectedMs != null && r.stageStartMs != null && r.expectedMs > r.stageStartMs) {
    bar = Math.min(1, Math.max(0, (nowMs - r.stageStartMs) / (r.expectedMs - r.stageStartMs)));
  }
  return { value: nextWords(n), hot, bar, line: nextLine(r, nowMs) };
}

/**
 * v153.2 — the Next box's second line, the ref's four (design-refs/query-centre-v153-2.html): an offer says "answer the
 * offer"; your move says when it was asked; with the agent it says the reply date, or "time for a nudge" once that has
 * passed. Gone quiet and closed say nothing more (the value already does). The reply date is the one `nextNum` counts
 * to, so the two lines cannot disagree. It was never built in v153, which drew the value alone.
 */
export function nextLine(r: QcRow, nowMs: number): string | null {
  if (isClosedRow(r) || r.court === "closed") return null;
  if (r.court === "offer") return "answer the offer";
  if (r.court === "you" || r.withYou) {
    if (r.stageStartMs == null) return null;
    const d = ago(r.stageStartMs, nowMs);
    return d === 0 ? "asked today" : `asked ${d} ${d === 1 ? "day" : "days"} ago`;
  }
  const st = stateOf(r);
  if (st === "quiet") return null;
  const due = st && r.court === "agent" ? (r as { replyMs?: number | null }).replyMs ?? r.expectedMs : r.expectedMs;
  if (due == null) return null;
  return sod(due) < sod(nowMs) ? "time for a nudge" : `reply by ${shortDate(due, nowMs)}`;
}

/* ── group headings and folds (List view) ────────────────────────────────────────────────────────────────────── */

/** Action's four open groups, each with its swatch and one line (the ref's); Gone quiet and Closed fold */
export const ACTION_WHY_153: Partial<Record<string, string>> = {
  offer: "Waiting on your answer", materials: "Agents want pages", nudge: "Past their reply date", agent: "With agents, not yet due",
};
const ACTION_SWATCH: Partial<Record<string, string>> = { offer: "#e7d6dc", materials: "#ecd6d2", nudge: "#efe7da", agent: "#efe7da", quiet: "#f4efe6", closed: "#f1efec" };
/** a heading's swatch: Action's own colours; a Status group takes its stage's tone; anything else sand */
export function sectionSwatch(group: string, key: string): string {
  if (group === "attention") return ACTION_SWATCH[key] ?? SLIP_TONE_FILL.sand;
  if (group === "status") return key === "closed" ? ACTION_SWATCH.closed! : SLIP_TONE_FILL[slipTone(key)];
  return SLIP_TONE_FILL.sand;
}
/** the groups that fold into one row: Gone quiet and Closed */
export const isFoldKey = (group: string, key: string): boolean => (group === "attention" && (key === "quiet" || key === "closed")) || (group === "status" && key === "closed");
export const FOLD_LINE: Record<"quiet" | "closed", string> = {
  quiet: "No reply after their window. Worth a nudge, or closing?",
  closed: "Passes and no-replies you’ve closed.",
};
/** the fold's stack: up to `max` initials, then "+N" for the rest */
export function foldInitials(rows: readonly Pick<QcRow, "id" | "initials">[], max = 4): { shown: { id: string; initials: string }[]; more: number } {
  return { shown: rows.slice(0, max).map((r) => ({ id: r.id, initials: r.initials })), more: Math.max(0, rows.length - max) };
}

/* ── the slim bar ────────────────────────────────────────────────────────────────────────────────────────────── */

/** the search's words: it matches the agent's name and agency (lib/qcSummary `matchesFind`), nothing else */
export const FIND_PLACEHOLDER = "Find an agent or agency";
/** the bar's Sort menu: four choices over the list's own sort (lib/qc151 `Sort151`) */
export const BAR_SORTS: readonly { label: string; line: string; sort: { key: "due" | "queried" | "heard" | "agent"; desc: boolean } }[] = [
  { label: "Next due", line: "Soonest first", sort: { key: "due", desc: false } },
  { label: "Queried", line: "Newest first", sort: { key: "queried", desc: true } },
  { label: "Last heard", line: "Most recent first", sort: { key: "heard", desc: true } },
  { label: "Agent", line: "A to Z", sort: { key: "agent", desc: false } },
];
const SORT_NAME: Record<string, string> = { agency: "Agency", stage: "Where it stands", next: "Next move" };
/** the Sort button's value: the matching choice's name, or the column's own for a sort set elsewhere */
export function barSortOf(s: { key: string; desc: boolean }): string {
  const hit = BAR_SORTS.find((o) => o.sort.key === s.key);
  return hit?.label ?? SORT_NAME[s.key] ?? "Next due";
}
