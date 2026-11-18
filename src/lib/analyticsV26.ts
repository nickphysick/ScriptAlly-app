/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Analytics v26 — the figures behind the one short page (design-refs/analytics-v26/analytics-v26.html).
 * Pure: everything reads the model's own `items` (each query in scope with its dated stages), the activity log, the
 * writer's agents and tasks, and the caller's clock.
 *
 * ⚠️ EVERY FIGURE IS COUNTED FROM WHAT THE WRITER HAS LOGGED. Nothing here estimates, forecasts or infers. The one
 *    outside figure on the page is `BENCHMARKS_QUERYTRACKER` (lib/analyticsV24), read only by section F.
 * ⚠️ v24'S PARTITION AND TALLY ARE REUSED, NEVER RESTATED: `outcomes` (who asked to read more, who is waiting, who
 *    ended) and `replyTally` (a request is a reply). `nowGroups` is `outcomes` cut four ways, so the four sum to sent.
 * ⚠️ ONE MARK IS ONE QUERY. Every list here carries query ids, so the page draws exactly one mark per query.
 */
import { ActivityType, QueryStatus, type Activity, type Agent, type Task } from "../types";
import { DAY_MS } from "./analytics";
import type { Enriched } from "./analyticsModel";
import { AGENT_RESPONSE_STATUSES } from "./queryDerivation";
import { isDatedReply, outcomes, replyTally, type Outcomes, type ReplyTally } from "./analyticsV24";
import { MONTHS_SHORT } from "./dates";

/* ══════════════════════════════════ words ══════════════════════════════════ */

/** "1 week", "7 weeks". Never called with less than 1: every weeks figure on the page is at least 1. */
export const wk = (n: number): string => (n === 1 ? "1 week" : `${n} weeks`);
/** Days to weeks: rounded, at least 1. */
export const weeksOf = (days: number): number => Math.max(1, Math.round(days / 7));
/** "about 1 in 4", or "all of them" when N would be 1 or less. Never "1 in 1". `n` must be > 0. */
export function oneIn(n: number, of: number): string {
  const N = Math.round(of / n);
  return N <= 1 ? "all of them" : `about 1 in ${N}`;
}
export const cap = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s);

const asked = (e: Enriched): boolean => e.row.reachedRequest || e.row.reachedOffer;
const answered = (e: Enriched): boolean => asked(e) || e.row.status === QueryStatus.REJECTED;
const closed = (e: Enriched): boolean => e.bucket === "closed";
function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/* ══════════════════════════════════ where they are now ══════════════════════════════════ */

export type GroupKey = "waiting" | "reading" | "offer" | "ended";
/** What became of one query, for its mark's tip. */
export type Fate = "waiting" | "reading" | "offer" | "readPassed" | "passed" | "closed" | "withdrew";
export interface Mark {
  id: string;
  agent: string;
  agency: string;
  status: QueryStatus;
  fate: Fate;
  /** the tip's one line: "Waiting 6 weeks", "Passed after 9 weeks" */
  line: string;
}
export interface NowGroup { key: GroupKey; marks: Mark[] }
export interface NowGroups {
  groups: NowGroup[];
  /** the four counts, empty groups included */
  counts: Record<GroupKey, number>;
  /** the ended group's line: passed (by letter, or after reading) · closed by the writer · withdrawn */
  passed: number; closedByYou: number; withdrew: number;
}

const GROUP_ORDER: GroupKey[] = ["waiting", "reading", "offer", "ended"];
export function fateOf(e: Enriched): Fate {
  if (e.row.reachedOffer) return "offer";
  if (asked(e)) {
    if (!closed(e)) return "reading";
    return e.row.status === QueryStatus.WITHDRAWN ? "withdrew" : "readPassed";
  }
  if (!closed(e)) return "waiting";
  if (e.row.status === QueryStatus.REJECTED) return "passed";
  if (e.row.status === QueryStatus.WITHDRAWN) return "withdrew";
  return "closed";
}
export const groupOf = (f: Fate): GroupKey => (f === "waiting" ? "waiting" : f === "reading" ? "reading" : f === "offer" ? "offer" : "ended");

/** The day a closed query closed: the log's closing rung, else the query's own closed date. */
const closedAt = (e: Enriched): number | null => e.dates.closed ?? null;
const afterWeeks = (from: number | null, to: number | null): string | null =>
  from === null || to === null || to < from ? null : wk(weeksOf((to - from) / DAY_MS));

/** The mark's tip line. Every figure is a difference of two logged dates; a missing date drops the "after …". */
export function lineOf(e: Enriched, f: Fate, nowMs: number): string {
  const sent = e.row.sentMs;
  const reply = isDatedReply(e) ? wk(weeksOf(e.replyDays as number)) : null;
  const askedFull = e.row.reachedFull;
  switch (f) {
    case "waiting": return sent === null ? "Waiting, no send date" : `Waiting ${wk(weeksOf((nowMs - sent) / DAY_MS))}`;
    case "reading": return `Asked for ${askedFull ? "the whole book" : "a partial"}${reply ? ` after ${reply}` : ""}`;
    case "offer": return reply ? `Made an offer. First replied after ${reply}` : "Made an offer";
    case "readPassed": return "Read more, then passed";
    case "passed": { const a = afterWeeks(sent, closedAt(e)) ?? reply; return a ? `Passed after ${a}` : "Passed"; }
    case "closed": { const a = afterWeeks(sent, closedAt(e)); return a ? `You closed it after ${a}` : "You closed it"; }
    case "withdrew": { const a = afterWeeks(sent, closedAt(e)); return a ? `You withdrew it after ${a}` : "You withdrew it"; }
    default: { const unhandled: never = f; return unhandled; }
  }
}
export const markOf = (e: Enriched, nowMs: number): Mark => {
  const f = fateOf(e);
  return { id: e.row.id, agent: e.row.agentName, agency: e.row.agentSub, status: e.row.status, fate: f, line: lineOf(e, f, nowMs) };
};

export function nowGroups(items: Enriched[], nowMs: number, o: Outcomes = outcomes(items)): NowGroups {
  const by: Record<GroupKey, Mark[]> = { waiting: [], reading: [], offer: [], ended: [] };
  for (const e of items) { const mk = markOf(e, nowMs); by[groupOf(mk.fate)].push(mk); }
  const counts = { waiting: by.waiting.length, reading: by.reading.length, offer: by.offer.length, ended: by.ended.length };
  /* ⚠️ THE SAME PARTITION AS `outcomes`: a disagreement is a bug in one of them, never a rounding */
  if (counts.waiting !== o.waiting || counts.offer !== o.of.offer || counts.reading !== o.of.open
    || counts.ended !== o.ended.total + o.of.saidNo + o.of.withdrew) {
    throw new Error("analyticsV26.nowGroups: the four groups disagree with outcomes");
  }
  const ended = by.ended;
  return {
    groups: GROUP_ORDER.filter((k) => by[k].length > 0).map((k) => ({ key: k, marks: by[k] })),
    counts,
    passed: ended.filter((m) => m.fate === "passed" || m.fate === "readPassed").length,
    closedByYou: ended.filter((m) => m.fate === "closed").length,
    withdrew: ended.filter((m) => m.fate === "withdrew").length,
  };
}

/* ══════════════════════════════════ how far they got ══════════════════════════════════ */

export type StepKey = "sent" | "replied" | "asked" | "full" | "offer";
export interface PathStep { key: StepKey; label: string; count: number; note: string | null }
export function pathSteps(items: Enriched[], o: Outcomes = outcomes(items), t: ReplyTally = replyTally(items)): PathStep[] {
  const sent = o.sent;
  const s = (key: StepKey, label: string, count: number, note: string | null): PathStep => ({ key, label, count, note: count > 0 ? note : null });
  return [
    s("sent", "Sent", sent, null),
    s("replied", "Replied", t.all, t.all > 0 ? `${cap(oneIn(t.all, sent))} so far` : null),
    s("asked", "Asked to read more", o.asked, o.asked > 0 ? cap(oneIn(o.asked, sent)) : null),
    s("full", "Asked for the whole book", o.full, o.asked > 0 ? `${o.full} of the ${o.asked} who asked for more` : null),
    s("offer", "Made an offer", o.of.offer, null),
  ];
}

/* ══════════════════════════════════ how long do replies take? ══════════════════════════════════ */

export type ReplyKind = "asked" | "passed";
export interface ReplyPoint {
  id: string; weeks: number; kind: ReplyKind; mark: Mark;
  /** what the first reply was (the log's first incoming rung), so its mark is drawn as that reply */
  replyStatus: QueryStatus;
}
export interface WaitPoint { id: string; weeks: number; mark: Mark }
export interface ReplyTimes {
  replies: ReplyPoint[];
  typical: number | null; quickest: number | null; slowest: number | null;
  typicalAsked: number | null; typicalPassed: number | null;
  /** the middle half of the replies, only when there are 4 or more */
  bandFrom: number | null; bandTo: number | null;
  /** queries still waiting for a first answer, with a send date, at their weeks out */
  waiting: WaitPoint[];
  /** waiting queries out longer than `slowest` (0 when there is no reply yet) */
  beyond: WaitPoint[];
}
export function replyTimes(items: Enriched[], nowMs: number): ReplyTimes {
  const replies: ReplyPoint[] = items.filter((e) => answered(e) && isDatedReply(e)).map((e) => ({
    id: e.row.id, weeks: weeksOf(e.replyDays as number), kind: asked(e) ? "asked" as const : "passed" as const, mark: markOf(e, nowMs),
    replyStatus: e.replyStatus ?? (asked(e) ? (e.row.reachedFull ? QueryStatus.FULL_REQUESTED : QueryStatus.PARTIAL_REQUESTED) : QueryStatus.REJECTED),
  }));
  const ws = replies.map((r) => r.weeks);
  const sorted = [...ws].sort((a, b) => a - b);
  const n = sorted.length;
  const mid = (xs: number[]) => (xs.length ? Math.round(median(xs)) : null);
  const waiting: WaitPoint[] = items.filter((e) => fateOf(e) === "waiting" && e.row.sentMs !== null)
    .map((e) => ({ id: e.row.id, weeks: weeksOf((nowMs - (e.row.sentMs as number)) / DAY_MS), mark: markOf(e, nowMs) }))
    .sort((a, b) => a.weeks - b.weeks || a.id.localeCompare(b.id));
  const slowest = n ? sorted[n - 1] : null;
  return {
    replies,
    typical: mid(ws), quickest: n ? sorted[0] : null, slowest,
    typicalAsked: mid(replies.filter((r) => r.kind === "asked").map((r) => r.weeks)),
    typicalPassed: mid(replies.filter((r) => r.kind === "passed").map((r) => r.weeks)),
    bandFrom: n >= 4 ? sorted[Math.floor(n / 4)] : null,
    bandTo: n >= 4 ? sorted[Math.ceil((3 * n) / 4) - 1] : null,
    waiting,
    beyond: slowest === null ? [] : waiting.filter((w) => w.weeks > slowest),
  };
}

/* ══════════════════════════════════ is it getting better? ══════════════════════════════════ */

export const ROUNDS_FLOOR = 9;
export interface Round {
  /** 0 first, 1 next, 2 latest */
  index: 0 | 1 | 2;
  ids: string[];
  marks: Mark[];
  firstMs: number; lastMs: number;
  /** "Nov to Feb", or "Nov" when the run sits inside one month */
  months: string;
  asked: number; waiting: number;
}
const monthWord = (ms: number) => MONTHS_SHORT[new Date(ms).getMonth()];
/**
 * The dated queries in send order, cut into three runs: ceil(n ÷ 3) in each of the first two, the rest in the third.
 * Null under `ROUNDS_FLOOR` dated queries. `asked` counts a run's queries that ever asked to read more.
 */
export function rounds(items: Enriched[], nowMs: number): Round[] | null {
  const dated = items.filter((e) => e.row.sentMs !== null)
    .sort((a, b) => (a.row.sentMs as number) - (b.row.sentMs as number) || a.row.id.localeCompare(b.row.id));
  const n = dated.length;
  if (n < ROUNDS_FLOOR) return null;
  const size = Math.ceil(n / 3);
  const cuts: [number, number][] = [[0, size], [size, 2 * size], [2 * size, n]];
  return cuts.map(([a, b], i) => {
    const run = dated.slice(a, b);
    const firstMs = run[0].row.sentMs as number;
    const lastMs = run[run.length - 1].row.sentMs as number;
    const sameMonth = new Date(firstMs).getMonth() === new Date(lastMs).getMonth() && new Date(firstMs).getFullYear() === new Date(lastMs).getFullYear();
    return {
      index: i as 0 | 1 | 2,
      ids: run.map((e) => e.row.id),
      marks: run.map((e) => markOf(e, nowMs)),
      firstMs, lastMs,
      months: sameMonth ? monthWord(firstMs) : `${monthWord(firstMs)} to ${monthWord(lastMs)}`,
      asked: run.filter(asked).length,
      waiting: run.filter((e) => fateOf(e) === "waiting").length,
    };
  });
}
export const ROUND_NAMES = ["First", "Next", "Latest"] as const;
export const ROUND_ORDINALS = ["first", "second", "latest"] as const;

/* ══════════════════════════════════ who says yes? ══════════════════════════════════ */

export const GENRE_FLOOR = 3;
export interface YesRow { label: string; asked: number; sent: number }
export interface WhoSaysYes {
  byGenre: YesRow[];
  byNote: { withNote: YesRow | null; without: YesRow | null };
  lead: string | null;
  /** agents on the writer's list who take `lead` and have no query for this manuscript */
  unqueried: number;
  unqueriedIds: string[];
}
const norm = (s: string) => s.trim().toLowerCase();
export function whoSaysYes(items: Enriched[], agents: readonly Agent[]): WhoSaysYes {
  const agentById = new Map(agents.map((a) => [a.id, a]));
  const firstGenre = (e: Enriched): string | null => {
    const g = agentById.get(e.row.agentId)?.genres;
    const f = Array.isArray(g) ? g.find((x) => typeof x === "string" && x.trim()) : undefined;
    return f ? f.trim() : null;
  };
  const groups = new Map<string, { label: string; asked: number; sent: number }>();
  for (const e of items) {
    const g = firstGenre(e);
    if (!g) continue;
    const k = norm(g);
    const row = groups.get(k) ?? { label: g, asked: 0, sent: 0 };
    row.sent++;
    if (asked(e)) row.asked++;
    groups.set(k, row);
  }
  const byGenre = [...groups.values()].filter((r) => r.sent >= GENRE_FLOOR)
    .sort((a, b) => b.sent - a.sent || a.label.localeCompare(b.label)).slice(0, 3);
  const noted = (e: Enriched) => typeof e.q.personalisationNotes === "string" && e.q.personalisationNotes.trim().length > 0;
  const tally = (xs: Enriched[], label: string): YesRow | null => (xs.length ? { label, asked: xs.filter(asked).length, sent: xs.length } : null);
  let lead: YesRow | null = null;
  for (const r of byGenre) {
    if (r.asked === 0) continue;
    if (!lead || r.asked / r.sent > lead.asked / lead.sent || (r.asked / r.sent === lead.asked / lead.sent && r.sent > lead.sent)) lead = r;
  }
  const queried = new Set(items.map((e) => e.row.agentId));
  const unqueriedIds = lead === null ? [] : agents
    .filter((a) => !queried.has(a.id) && Array.isArray(a.genres) && a.genres.some((g) => typeof g === "string" && norm(g) === norm(lead!.label)))
    .map((a) => a.id);
  return {
    byGenre,
    byNote: { withNote: tally(items.filter(noted), "With a personal note"), without: tally(items.filter((e) => !noted(e)), "Without one") },
    lead: lead?.label ?? null,
    unqueried: unqueriedIds.length,
    unqueriedIds,
  };
}

/* ══════════════════════════════════ do nudges work? ══════════════════════════════════ */

export interface NudgeRow { queryId: string; agent: string; agency: string; atMs: number; repliedDays: number | null }
export interface NudgeResults { rows: NudgeRow[]; replied: number; due: number; dueIds: string[] }
const isNudge = (a: Activity) => a.eventKey === "nudge_sent" || (!a.eventKey && a.activityType === ActivityType.NUDGE_SENT);
const toMs = (iso: unknown): number | null => {
  if (typeof iso !== "string" || !iso) return null;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : null;
};
/**
 * One row per nudge sent on this manuscript's queries, newest first. The activity log's nudge-sent events are the
 * source; `Query.lastNudgeSentDate` stands in only for a query whose log holds no nudge at all.
 * ⚠️ A REPLY BELONGS TO THE LAST NUDGE BEFORE IT. A reply is an incoming rung of the log (`AGENT_RESPONSE_STATUSES`), or
 *    where the log has none, the query's own dated incoming stages. A nudge's `repliedDays` is the days to the first
 *    reply that belongs to it; a reply before the nudge never counts.
 * `due` = open queries whose FIRST nudge is due and not sent: the task engine's own `nudge_overdue` / `nudge-first`.
 */
export function nudgeResults(items: Enriched[], activities: readonly Activity[], tasks: readonly Task[]): NudgeResults {
  const ids = new Set(items.map((e) => e.row.id));
  const byQ = new Map<string, Activity[]>();
  for (const a of activities) if (ids.has(a.queryId)) { const l = byQ.get(a.queryId) ?? []; l.push(a); byQ.set(a.queryId, l); }
  const rows: NudgeRow[] = [];
  for (const e of items) {
    const acts = byQ.get(e.row.id) ?? [];
    let nudges = acts.filter(isNudge).map((a) => toMs(a.date)).filter((t): t is number => t !== null);
    if (!nudges.length) { const f = toMs(e.q.lastNudgeSentDate); if (f !== null) nudges = [f]; }
    if (!nudges.length) continue;
    nudges.sort((a, b) => a - b);
    let replies = acts.filter((a) => a.resultingStatus && AGENT_RESPONSE_STATUSES.has(a.resultingStatus as QueryStatus))
      .map((a) => toMs(a.date)).filter((t): t is number => t !== null);
    if (!replies.length) {
      replies = [e.dates.partialRequested, e.dates.fullRequested, e.dates.offer, e.row.status === QueryStatus.REJECTED ? e.dates.closed : null]
        .filter((t): t is number => t !== null && t !== undefined);
    }
    replies.sort((a, b) => a - b);
    nudges.forEach((n, i) => {
      const next = i + 1 < nudges.length ? nudges[i + 1] : Infinity;
      /* the last nudge before reply r is the one with n < r <= next */
      const r = replies.find((t) => t > n && t <= next);
      rows.push({ queryId: e.row.id, agent: e.row.agentName, agency: e.row.agentSub, atMs: n, repliedDays: r === undefined ? null : Math.max(0, Math.round((r - n) / DAY_MS)) });
    });
  }
  rows.sort((a, b) => b.atMs - a.atMs || a.queryId.localeCompare(b.queryId));
  const open = new Set(items.filter((e) => !closed(e)).map((e) => e.row.id));
  const dueIds = [...new Set(tasks.filter((t) => t.taskType === "nudge_overdue" && t.reason === "nudge-first" && !!t.relatedRecordId && open.has(t.relatedRecordId))
    .map((t) => t.relatedRecordId as string))];
  return { rows, replied: rows.filter((r) => r.repliedDays !== null).length, due: dueIds.length, dueIds };
}

/* ══════════════════════════════════ what to do next ══════════════════════════════════ */

export type FindingKey = "beyond" | "typical" | "bestRound";
export type Finding =
  | { key: "beyond"; n: number; slowest: number; ids: string[] }
  | { key: "typical"; typical: number; typicalAsked: number | null; typicalPassed: number | null; quietWeeks: number }
  | { key: "bestRound"; best: Round; all: Round[] };
/** Up to three, in this order; each omitted when its condition fails. `typical` needs one dated reply. */
export function findings(t: ReplyTimes, r: Round[] | null, quietWeeks: number): Finding[] {
  const out: Finding[] = [];
  if (t.beyond.length > 0 && t.slowest !== null) out.push({ key: "beyond", n: t.beyond.length, slowest: t.slowest, ids: t.beyond.map((w) => w.id) });
  if (t.typical !== null) out.push({ key: "typical", typical: t.typical, typicalAsked: t.typicalAsked, typicalPassed: t.typicalPassed, quietWeeks });
  if (r) {
    /* best = most asked; a tie goes to the later run */
    let best = r[0];
    for (const x of r) if (x.asked >= best.asked) best = x;
    if (best.asked > 0) out.push({ key: "bestRound", best, all: r });
  }
  return out;
}

/* ══════════════════════════════════ everything the page reads ══════════════════════════════════ */

/** The page's three states: no queries; fewer than this many replies; this many or more. */
export const EVERYDAY_REPLIES = 5;
export type PageState = "dayOne" | "early" | "everyday";
export const stateOf = (sent: number, replies: number): PageState => (sent === 0 ? "dayOne" : replies < EVERYDAY_REPLIES ? "early" : "everyday");

export interface V26 {
  state: PageState;
  outcomes: Outcomes; tally: ReplyTally;
  now: NowGroups; path: PathStep[]; times: ReplyTimes; rounds: Round[] | null;
  who: WhoSaysYes; nudges: NudgeResults; findings: Finding[];
  /** the oldest waiting query's weeks out (the Early header), or null */
  oldestWaiting: number | null;
  quietWeeks: number;
}
export function buildV26(input: { items: Enriched[]; activities: readonly Activity[]; agents: readonly Agent[]; tasks: readonly Task[]; nowMs: number; quietWeeks: number }): V26 {
  const { items, activities, agents, tasks, nowMs, quietWeeks } = input;
  const o = outcomes(items);
  const t = replyTally(items);
  const times = replyTimes(items, nowMs);
  const r = rounds(items, nowMs);
  return {
    state: stateOf(o.sent, t.all),
    outcomes: o, tally: t,
    now: nowGroups(items, nowMs, o),
    path: pathSteps(items, o, t),
    times, rounds: r,
    who: whoSaysYes(items, agents),
    nudges: nudgeResults(items, activities, tasks),
    findings: findings(times, r, quietWeeks),
    oldestWaiting: times.waiting.length ? times.waiting[times.waiting.length - 1].weeks : null,
    quietWeeks,
  };
}

/** The lead line's "About 1 in N" for F, and the header's third line's M. */
export const mostOneIn = (requestRatePct: number): number => Math.round(100 / requestRatePct);
