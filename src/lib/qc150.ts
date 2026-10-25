/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v150 (design-refs/query-centre-v150/) — the four stat cards and Birds-eye as the list's second view,
 * as pure derivations. The page renders them; the unit suite calls them.
 *
 * ⚠️ THE FOUR CARDS ARE `whereItStands`' FOUR SETS (lib/qcSummary), the same sets the retired quick-filter chips
 *    counted, so each card's count IS the old chip's count and the four sum to All.
 * ⚠️ "READY TO NUDGE" IS NOT THE NUDGE WINDOW. Under `nudgePhase` every Gone quiet query is past the nudge window (the
 *    window's queries are With you), so the card's line counts the Gone quiet queries with NO NUDGE ON RECORD
 *    (`lastNudgeSentDate` unset) — Nick's ruling on v150's Step 0 stop.
 * ⚠️ BIRDS-EYE NEVER DRAWS A CLOSED QUERY. `eyeRows` drops them; the footer counts them over the same filtered set.
 */
import { QueryStatus } from "../types";
import { STAGE_NAME, stageOrder, whereItStands, type QcRow, type WhereKey } from "./qcSummary";
import { whenOf, type BvdWhen } from "./qcBirdsDrawer";
import { eyeRows, type EyeRow } from "./qcBirdsEye";
import { waitingRows, whenWords } from "./qc149";
import { dayMonth } from "./dates";

const DAY = 86_400_000;
const startOfDay = (ms: number): number => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };

/* ══ Part B · the stat cards ══════════════════════════════════════════════════════════════════════════════════════ */

export const STAT_KEYS: readonly WhereKey[] = ["you", "agent", "quiet", "closed"];
export const STAT_LABEL: Record<WhereKey, string> = { you: "Your move", agent: "With the agent", quiet: "Gone quiet", closed: "Closed" };
/** how many discs before "+N": five on With the agent (its card is narrower than its count), six elsewhere */
export const FACE_CAP: Record<WhereKey, number> = { you: 6, agent: 5, quiet: 6, closed: 6 };

export interface StatFace { key: string; initials: string; title: string }
export interface StatCard {
  key: WhereKey;
  label: string;
  count: number;
  /** one disc per query, the most urgent first, capped */
  faces: StatFace[];
  /** the queries past the cap ("+N"); 0 when none */
  more: number;
  /** Your move: "Tom Ellery’s offer · tomorrow" (null when nothing is waiting) */
  next: { who: string; what: string } | null;
  /** With the agent: replies due within 7 days · Gone quiet: never nudged · Closed: the split */
  detail: StatDetail | null;
}
export type StatDetail =
  | { kind: "due"; n: number }
  | { kind: "nudge"; n: number }
  | { kind: "split"; parts: { n: number; word: string }[] };

/** what the writer owes, in the card's own words: "offer", "full", "partial", "revision", "nudge" */
export function owedThing(r: QcRow, nowMs: number): string {
  switch (r.status) {
    case QueryStatus.OFFER: return "offer";
    case QueryStatus.FULL_REQUESTED: return "full";
    case QueryStatus.PARTIAL_REQUESTED: return "partial";
    case QueryStatus.REVISE_RESUBMIT: return "revision";
    default: return whereItStands(r, nowMs) === "you" && r.court === "agent" ? "nudge" : "next step";
  }
}

const byDue = (a: QcRow, b: QcRow) => {
  const x = a.expectedMs ?? Infinity, y = b.expectedMs ?? Infinity;
  return x !== y ? x - y : a.agentName.localeCompare(b.agentName);
};

/** the rows in one card, most urgent first: Your move as the banner ordered it, the open sets by date, Closed by last move */
export function statRows(rows: readonly QcRow[], k: WhereKey, nowMs: number): QcRow[] {
  if (k === "you") return waitingRows(rows, nowMs);
  const mine = rows.filter((r) => whereItStands(r, nowMs) === k);
  return k === "closed" ? mine.sort((a, b) => b.lastMs - a.lastMs || a.agentName.localeCompare(b.agentName)) : mine.sort(byDue);
}

export const plural = (n: number, one: string, many: string): string => (n === 1 ? one : many);

export function statCards(rows: readonly QcRow[], nowMs: number): StatCard[] {
  const today = startOfDay(nowMs);
  return STAT_KEYS.map((k) => {
    const mine = statRows(rows, k, nowMs);
    const cap = FACE_CAP[k];
    const faces = mine.slice(0, cap).map((r) => ({ key: r.id, initials: r.initials, title: `${r.agentName}${r.agency && r.agency !== "No agency" ? `, ${r.agency}` : ""}` }));
    let detail: StatDetail | null = null;
    let next: StatCard["next"] = null;
    if (k === "you" && mine[0]) next = { who: `${mine[0].agentName}’s ${owedThing(mine[0], nowMs)}`, what: whenWords(mine[0].expectedMs, nowMs) };
    if (k === "agent") detail = { kind: "due", n: mine.filter((r) => r.expectedMs != null && r.expectedMs >= today && r.expectedMs < nowMs + 7 * DAY).length };
    if (k === "quiet") detail = { kind: "nudge", n: mine.filter((r) => !r.query.lastNudgeSentDate).length };
    if (k === "closed") {
      const n = (s: QueryStatus) => mine.filter((r) => r.status === s).length;
      const passes = n(QueryStatus.REJECTED), withdrawn = n(QueryStatus.WITHDRAWN), none = n(QueryStatus.NO_RESPONSE);
      detail = { kind: "split", parts: [
        { n: passes, word: plural(passes, "pass", "passes") },
        { n: withdrawn, word: "withdrawn" },
        { n: none, word: "no response" },
      ].filter((p) => p.n > 0) };
    }
    return { key: k, label: STAT_LABEL[k], count: mine.length, faces, more: Math.max(0, mine.length - faces.length), next, detail };
  });
}

/* ══ Part C · the list title ═════════════════════════════════════════════════════════════════════════════════════ */

export type QcView150 = "list" | "birds";
export const QC_VIEW150_KEY = "qh.qc.view150";
export function readView150(): QcView150 {
  try { return window.sessionStorage.getItem(QC_VIEW150_KEY) === "birds" ? "birds" : "list"; } catch { return "list"; }
}
export function writeView150(v: QcView150): void {
  try { window.sessionStorage.setItem(QC_VIEW150_KEY, v); } catch { /* storage refused: the page still works */ }
}

/* ══ Part D · Birds-eye ═════════════════════════════════════════════════════════════════════════════════════════════ */

export type BeGroup = "urgency" | "status" | "none";
export type BeSort = "due" | "wait" | "agent";
export const BE_GROUPS: readonly { key: BeGroup; label: string }[] = [
  { key: "urgency", label: "Urgency" }, { key: "status", label: "Status" }, { key: "none", label: "None" },
];
export const BE_SORTS: readonly { key: BeSort; label: string }[] = [
  { key: "due", label: "Due date" }, { key: "wait", label: "Waiting longest" }, { key: "agent", label: "Agent A–Z" },
];
const WHEN_LABEL: Record<BvdWhen, string> = { overdue: "Overdue", upcoming: "Upcoming", watch: "Watch and wait", nodate: "No date" };
const WHEN_ORDER: readonly BvdWhen[] = ["overdue", "upcoming", "watch", "nodate"];

export interface BeGroupOut { key: string; label: string; rows: EyeRow[] }

const nameCmp = (a: EyeRow, b: EyeRow) => a.row.agentName.localeCompare(b.row.agentName, "en", { sensitivity: "base" });
const lastNull = (x: number | null, y: number | null): number => (x == null && y == null ? 0 : x == null ? 1 : y == null ? -1 : x - y);
export const BE_CMP: Record<BeSort, (a: EyeRow, b: EyeRow) => number> = {
  /* most overdue first: the earliest due date first; undated last */
  due: (a, b) => lastNull(a.row.expectedMs, b.row.expectedMs) || nameCmp(a, b),
  /* waiting longest: the earliest start of the stage it stands at; undated last */
  wait: (a, b) => lastNull(a.row.stageStartMs, b.row.stageStartMs) || nameCmp(a, b),
  agent: (a, b) => nameCmp(a, b) || a.row.agency.localeCompare(b.row.agency),
};

/** Birds-eye's groups over the rows the list already shows (search, Filters, the stat card): closed dropped */
export function beGroups(rows: readonly QcRow[], group: BeGroup, sort: BeSort, nowMs: number): BeGroupOut[] {
  const live = eyeRows(rows, nowMs);
  const make = (key: string, label: string, mine: EyeRow[]): BeGroupOut => ({ key, label, rows: mine.slice().sort(BE_CMP[sort]) });
  let out: BeGroupOut[];
  if (group === "none") out = [make("all", "All live queries", live)];
  else if (group === "urgency") out = WHEN_ORDER.map((w) => make(w, WHEN_LABEL[w], live.filter((r) => whenOf(r.row, nowMs) === w)));
  else out = stageOrder(live.map((r) => r.row)).map((s) => make(String(s), STAGE_NAME[s], live.filter((r) => r.row.status === s)));
  return out.filter((g) => g.rows.length > 0);
}
/** the closed queries in the same filtered set — Birds-eye's footer line */
export const closedCount = (rows: readonly QcRow[], nowMs: number): number => rows.filter((r) => whereItStands(r, nowMs) === "closed").length;

/** the bar tint by stage: Queried · requested · sent · Offer */
export type StageTint = "q" | "r" | "s" | "o";
export function stageTint(s: QueryStatus): StageTint {
  if (s === QueryStatus.OFFER) return "o";
  if (s === QueryStatus.PARTIAL_REQUESTED || s === QueryStatus.FULL_REQUESTED || s === QueryStatus.REVISE_RESUBMIT) return "r";
  if (s === QueryStatus.PARTIAL_SENT || s === QueryStatus.FULL_SENT || s === QueryStatus.RESUBMITTED) return "s";
  return "q";
}

export const shortDay = (ms: number): string => dayMonth(ms);

export interface BeBar { key: string; fromMs: number; toMs: number; label: string; title: string }
export interface BeLine {
  id: string;
  row: QcRow;
  when: BvdWhen;
  /** every dated stage before the current one, end to end */
  past: BeBar[];
  /** the current stage: from its latest date to the due date, or to today when overdue; null when nothing dates it */
  cur: (BeBar & { stage: string; tint: StageTint; overdue: boolean }) | null;
  dueMs: number | null;
  daysOver: number;
  inDays: number;
}

/**
 * One row's bars. ⚠️ PAST BARS RUN FROM A STAGE'S DATE TO THE NEXT STAGE'S DATE (the view takes 3px off the end), and
 * the current bar starts at the latest stage date — so the bars are in date order and never overlap.
 */
export function beLine(r: EyeRow, nowMs: number): BeLine {
  const row = r.row;
  const today = startOfDay(nowMs);
  const dated = row.history.spans.filter((s) => !s.current && Number.isFinite(s.startMs));
  const curSpan = row.history.spans.find((s) => s.current);
  const curStart = row.stageStartMs ?? curSpan?.startMs ?? null;
  const past: BeBar[] = [];
  for (let i = 0; i < dated.length; i++) {
    const s = dated[i];
    const end = dated[i + 1]?.startMs ?? curStart ?? s.endMs ?? today;
    if (!(end > s.startMs)) continue;
    past.push({ key: `${row.id}:p${i}`, fromMs: s.startMs, toMs: end, label: STAGE_NAME[s.status], title: `${STAGE_NAME[s.status]} · ${shortDay(s.startMs)} → ${shortDay(end)}` });
  }
  const due = row.expectedMs;
  const overdue = due != null && due < today;
  const daysOver = overdue ? Math.max(1, Math.round((today - startOfDay(due!)) / DAY)) : 0;
  const inDays = due != null && !overdue ? Math.round((startOfDay(due) - today) / DAY) : 0;
  const stage = STAGE_NAME[row.status];
  let cur: BeLine["cur"] = null;
  if (curStart != null) {
    const to = overdue ? today : due ?? today;
    const lab = due == null ? stage : overdue ? `${stage} · overdue since ${shortDay(due)}` : `${stage} · ${r.court === "you" ? "due" : "reply by"} ${shortDay(due)}`;
    cur = { key: `${row.id}:cur`, fromMs: curStart, toMs: Math.max(to, curStart + DAY), label: lab, title: `${stage} · ${shortDay(curStart)} → ${shortDay(to)}`, stage, tint: stageTint(row.status), overdue };
  }
  return { id: row.id, row, when: whenOf(row, nowMs), past, cur, dueMs: due, daysOver, inDays };
}

/* ── the time scale ── */
export const BE_SPANS = { "6w": 42, "3m": 91, "6m": 182 } as const;
export type BeZoom = keyof typeof BE_SPANS;
export const BE_TODAY_AT = 0.6;
export interface BeScale { r0: number; r1: number; ppd: number; width: number }
const firstOfMonth = (ms: number): number => { const d = new Date(ms); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); };
/**
 * The track: from the first of the month 21 days before the earliest stage date to half a zoom-width past the latest
 * due date. Today ± one span is always inside, so the today target has somewhere to land on a young account.
 */
export function beScale(lines: readonly BeLine[], span: number, viewW: number, nowMs: number): BeScale {
  const today = startOfDay(nowMs);
  const ppd = viewW / span;
  const starts = lines.flatMap((l) => [...l.past.map((b) => b.fromMs), ...(l.cur ? [l.cur.fromMs] : [])]).concat([today - span * DAY]);
  const ends = lines.flatMap((l) => [l.dueMs ?? today, l.cur?.toMs ?? today]).concat([today + span * DAY]);
  const r0 = firstOfMonth(Math.min(...starts) - 21 * DAY);
  const r1 = Math.max(...ends) + span * 0.5 * DAY;
  return { r0, r1, ppd, width: Math.round(((r1 - r0) / DAY) * ppd) };
}
export const beX = (s: BeScale, ms: number): number => ((ms - s.r0) / DAY) * s.ppd;

export const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export interface BeMonth { ms: number; x: number; w: number; name: string; year: string; cur: boolean; future: boolean }
/** the months: the full name at ≥118px, three letters at ≥52, otherwise none; the year on January and the current month where it fits */
export function beMonths(s: BeScale, nowMs: number): BeMonth[] {
  const out: BeMonth[] = [];
  const now = new Date(nowMs);
  let d = new Date(s.r0);
  while (d.getTime() < s.r1) {
    const n = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const x = beX(s, d.getTime()), w = beX(s, n.getTime()) - x;
    const cur = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    const name = w >= 118 ? MONTH_NAMES[d.getMonth()] : w >= 52 ? MONTH_NAMES[d.getMonth()].slice(0, 3) : "";
    const year = name && (d.getMonth() === 0 || cur) && w >= 150 ? String(d.getFullYear()) : "";
    out.push({ ms: d.getTime(), x, w, name, year, cur, future: !cur && d.getTime() > nowMs });
    d = n;
  }
  return out;
}
/** the ticks: every Monday; every second if Mondays are under 26px apart; every fourth if still; none within 44px of TODAY */
export function beTicks(s: BeScale, nowMs: number): { ms: number; x: number; label: string }[] {
  const step = s.ppd * 7 >= 26 ? 7 : s.ppd * 14 >= 26 ? 14 : 28;
  const tx = beX(s, startOfDay(nowMs));
  let d = new Date(s.r0);
  while (d.getDay() !== 1) d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  const out: { ms: number; x: number; label: string }[] = [];
  for (; d.getTime() < s.r1; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + step)) {
    const x = beX(s, d.getTime());
    if (Math.abs(x - tx) < 44) continue;
    out.push({ ms: d.getTime(), x, label: String(d.getDate()) });
  }
  return out;
}
