/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v151 (design-refs/query-centre-v151/) — the pure parts of the one table: the status track, "Last heard",
 * the "Who it's with" sections, the headings' sort, the Due column's words and the Next move column's kind.
 *
 * ⚠️ NOTHING HERE IS STORED. Every value is read off the Query Centre's own rows (`buildQcRows`), so the table and the
 *    rest of the app cannot disagree about where a query stands.
 * ⚠️ A CLOSED QUERY'S TRACK STOPS WHERE THE QUERY GOT TO (`furthest`, from its real history), never at four steps.
 */
import { QueryStatus } from "../types";
import { STAGE_NAME, whereItStands, type QcRow, type WhereKey } from "./qcSummary";
import { STATE_LABEL, STATE_ORDER, stateOf } from "./queryState";
import { nextDoor, nextWords } from "./queryActions/entry";
import { MONTHS_SHORT } from "./dates";

const DAY = 86_400_000;
const sod = (ms: number): number => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
export const daysFrom = (ms: number, nowMs: number): number => Math.round((sod(ms) - sod(nowMs)) / DAY);

/* ── the status track ─────────────────────────────────────────────────────────────────────────────────────────── */

export const CLOSED_STATUSES: readonly QueryStatus[] = [QueryStatus.REJECTED, QueryStatus.NO_RESPONSE, QueryStatus.WITHDRAWN];
export const isClosedRow = (r: Pick<QcRow, "status">): boolean => CLOSED_STATUSES.includes(r.status);

export type StepState = "past" | "cur" | "future" | "end";
export interface TrackStep { status: QueryStatus; state: StepState }
export interface Track { steps: TrackStep[]; title: string; closed: boolean }

/** the live step a status stands at: Queried 0 · Partial 1 · Full 2 · Offer 3 */
export function liveLevel(status: QueryStatus): number {
  switch (status) {
    case QueryStatus.PARTIAL_REQUESTED: case QueryStatus.PARTIAL_SENT: return 1;
    case QueryStatus.FULL_REQUESTED: case QueryStatus.FULL_SENT: case QueryStatus.REVISE_RESUBMIT: case QueryStatus.RESUBMITTED: return 2;
    case QueryStatus.OFFER: case QueryStatus.SIGNED: return 3;
    default: return 0;
  }
}
const REACHED_LEVEL: Record<QcRow["furthest"], number> = { query: 0, partial: 1, full: 2 };
const REACHED_GLYPH: readonly QueryStatus[] = [QueryStatus.QUERIED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT];
const STAGE_WORD = ["query", "partial", "full"] as const;
const CLOSED_WORD: Partial<Record<QueryStatus, string>> = {
  [QueryStatus.REJECTED]: "Passed", [QueryStatus.NO_RESPONSE]: "No reply", [QueryStatus.WITHDRAWN]: "Withdrawn",
};

export function trackOf(r: Pick<QcRow, "status" | "furthest">): Track {
  if (isClosedRow(r)) {
    const lv = REACHED_LEVEL[r.furthest] ?? 0;
    const steps: TrackStep[] = [];
    for (let i = 0; i <= lv; i++) steps.push({ status: REACHED_GLYPH[i], state: i === lv ? "end" : "past" });
    return { steps, title: `${CLOSED_WORD[r.status] ?? STAGE_NAME[r.status]} at ${STAGE_WORD[lv]} stage`, closed: true };
  }
  const i = liveLevel(r.status);
  const glyphs = [QueryStatus.QUERIED, i === 1 ? r.status : QueryStatus.PARTIAL_SENT, i === 2 ? r.status : QueryStatus.FULL_SENT, i === 3 ? r.status : QueryStatus.OFFER];
  return {
    steps: glyphs.map((status, k) => ({ status, state: k === i ? "cur" : k < i ? "past" : "future" })),
    title: STAGE_NAME[r.status],
    closed: false,
  };
}

/* ── Last heard: the latest stage the AGENT moved the query into ──────────────────────────────────────────────── */

const AGENT_MOVES: ReadonlySet<QueryStatus> = new Set([
  QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.REVISE_RESUBMIT, QueryStatus.OFFER, QueryStatus.REJECTED,
]);
export function lastHeardMs(r: Pick<QcRow, "history">): number | null {
  let best: number | null = null;
  for (const s of r.history.spans) if (AGENT_MOVES.has(s.status) && (best == null || s.startMs > best)) best = s.startMs;
  return best;
}

/** "2 Jul", or "2 Jul 2025" in another year */
export function shortDate(ms: number, nowMs: number): string {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}${d.getFullYear() === new Date(nowMs).getFullYear() ? "" : ` ${d.getFullYear()}`}`;
}

/* ── Due ──────────────────────────────────────────────────────────────────────────────────────────────────────── */

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export interface DueCell { text: string; late: boolean }
/** "8 days late" · "Today" · "Tomorrow" · "Sat 10 Oct" inside the week · "22 Oct" beyond it; null for closed or undated */
export function dueCell(dueMs: number | null, nowMs: number): DueCell | null {
  if (dueMs == null) return null;
  const d = daysFrom(dueMs, nowMs);
  if (d < 0) return { text: `${-d} ${d === -1 ? "day" : "days"} late`, late: true };
  if (d === 0) return { text: "Today", late: true };
  if (d === 1) return { text: "Tomorrow", late: true };
  const dt = new Date(dueMs);
  if (d < 7) return { text: `${WD[dt.getDay()]} ${dt.getDate()} ${MONTHS_SHORT[dt.getMonth()]}`, late: false };
  return { text: shortDate(dueMs, nowMs), late: false };
}
export const dueMsOf = (r: Pick<QcRow, "court" | "expectedMs" | "status">): number | null =>
  isClosedRow(r) || r.court === "closed" ? null : r.expectedMs;

/* ── Next move: a button where the writer has something to do, plain words otherwise ──────────────────────────── */

export interface NextCell { kind: "act" | "text" | "none"; label: string }
export function nextCell(r: QcRow, phrase: string | null, nowMs: number): NextCell {
  if (isClosedRow(r) || r.court === "closed") return { kind: "none", label: "—" };
  const door = nextDoor(r, nowMs);
  /* "Record a response" is waiting, not a move of the writer's: it reads "Reply due" or "Waiting" (lib/qcRowLines) */
  if (!door || door.mode === "resp") return { kind: "text", label: phrase ?? "Waiting" };
  return { kind: "act", label: nextWords(r, nowMs) ?? door.label };
}

/* ── the sections ─────────────────────────────────────────────────────────────────────────────────────────────── */

export const WHO_GROUPS: readonly { key: WhereKey; label: string }[] = [
  { key: "you", label: "Your move" }, { key: "agent", label: "With the agent" }, { key: "quiet", label: "Gone quiet" }, { key: "closed", label: "Closed" },
];
export const TAB_LABEL: Record<WhereKey, string> = { you: "Your move", agent: "With the agent", quiet: "Gone quiet", closed: "Closed" };

export interface Section<T> { key: string; label: string; rows: T[] }
/** Who it's with: the four tabs' own sets (`whereItStands`), in order, empty ones dropped; rows keep their sort */
export function whoSections<T extends QcRow>(rows: readonly T[], nowMs: number): Section<T>[] {
  /* v152 §1.5 — rows the page has stamped group into the six states, in their order (lib/queryState) */
  if (rows.length && stateOf(rows[0])) {
    return STATE_ORDER.map((k) => ({ key: k as string, label: STATE_LABEL[k], rows: rows.filter((r) => stateOf(r) === k) }))
      .filter((s) => s.rows.length > 0);
  }
  return WHO_GROUPS.map((g) => ({ key: g.key, label: g.label, rows: rows.filter((r) => whereItStands(r, nowMs) === g.key) }))
    .filter((s) => s.rows.length > 0);
}

/* ── the headings' sort ───────────────────────────────────────────────────────────────────────────────────────── */

export type SortKey151 = "agent" | "agency" | "stage" | "queried" | "heard" | "next" | "due";
export interface Sort151 { key: SortKey151; desc: boolean }
export const DEFAULT_SORT_151: Sort151 = { key: "due", desc: false };
export const COLUMNS_151: readonly { key: SortKey151; label: string }[] = [
  { key: "agent", label: "Agent" }, { key: "agency", label: "Agency" }, { key: "stage", label: "Where it stands" },
  { key: "queried", label: "Queried" }, { key: "heard", label: "Last heard" }, { key: "next", label: "Next move" }, { key: "due", label: "Due" },
];
export const pressSort = (s: Sort151, key: SortKey151): Sort151 => (s.key === key ? { key, desc: !s.desc } : { key, desc: false });

const STAGE_RANK: Record<string, number> = {
  [QueryStatus.QUERIED]: 0, [QueryStatus.PARTIAL_REQUESTED]: 1, [QueryStatus.PARTIAL_SENT]: 2, [QueryStatus.FULL_REQUESTED]: 3,
  [QueryStatus.REVISE_RESUBMIT]: 3.5, [QueryStatus.FULL_SENT]: 4, [QueryStatus.RESUBMITTED]: 4.5, [QueryStatus.OFFER]: 5,
  [QueryStatus.SIGNED]: 5.5, [QueryStatus.REJECTED]: 6, [QueryStatus.NO_RESPONSE]: 7, [QueryStatus.WITHDRAWN]: 8,
};

/**
 * One order for the table. Due ascending is the default: the most late first (the earliest date), then the soonest,
 * then rows with no date. A missing value sorts last in BOTH directions. Ties keep the agent's name order.
 */
export function sort151<T extends QcRow>(rows: readonly T[], s: Sort151, nextLabel: (r: T) => string): T[] {
  const val = (r: T): string | number | null => {
    switch (s.key) {
      case "agent": return r.agentName.toLowerCase() || null;
      case "agency": return r.agencyKey.toLowerCase() || null;
      case "stage": return STAGE_RANK[r.status] ?? 99;
      case "queried": return r.sentMs;
      case "heard": return lastHeardMs(r);
      case "next": { const l = nextLabel(r); return l && l !== "—" ? l.toLowerCase() : null; }
      case "due": return dueMsOf(r);
    }
  };
  const dir = s.desc ? -1 : 1;
  return [...rows].sort((a, b) => {
    const x = val(a), y = val(b);
    if (x == null && y == null) return a.agentName.localeCompare(b.agentName);
    if (x == null) return 1;
    if (y == null) return -1;
    const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
    return c !== 0 ? c * dir : a.agentName.localeCompare(b.agentName);
  });
}

/* ── the header's count line: the same sources as v150's header ───────────────────────────────────────────────── */
export interface CountLine { sent: number; active: number; heardPct: number }

/** v151 §0 — full screen is not part of this design: the pin hook is kept, inert, behind this switch */
export const QC_FULL_SCREEN = false;
