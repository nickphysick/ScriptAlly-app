/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Analytics v24 — the figures behind the seven question sections (design-refs/analytics-v24/analytics-v24.html).
 * Pure: everything reads the model's own `items` (each query in range with its dated stages) and the caller's clock.
 *
 * ⚠️ `outcomes` IS THE ONE PARTITION FOR S1 AND THE DESK'S REQUEST RATE; `standing` (lib/analyticsV21) stays the
 *    header card's. They answer different questions: `standing` is where each query is today, `outcomes` is whether
 *    the agent ever asked to read more.
 * ⚠️ ONE FORMATTER FOR EVERY DURATION ON THE PAGE (`span`): under 7 days "{n} days" ("1 day"), otherwise weeks
 *    rounded, "1 wk" / "{n} wks". A difference that rounds to nothing is "on time" (`diffWords`).
 * ⚠️ AN AGENCY'S STATED REPLY TIME IS FOR THE QUERY. Nothing here sets a request's reading time against it: no agency
 *    states a time for reading requested material, and none is stored.
 * ⚠️ THE BENCHMARKS ARE FIXED ANCHORS (`BENCHMARKS_QUERYTRACKER`), never computed and never collected.
 */
import { QueryStatus } from "../types";
import { DAY_MS, median } from "./analytics";
import { THIN_SAMPLE, gapDays, mondayOf, type AnalyticsModel, type Enriched, type StateBucket } from "./analyticsModel";
import { MONTHS_SHORT } from "./dates";
import { desk, replyWhat, windowReplies, type DeskCard } from "./analyticsV21";
import { say } from "./analyticsModel";

const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const agencyOf = (e: Enriched): string => e.row.agentSub || e.row.agentName;
const minDate = (a: number | null, b: number | null): number | null => (a === null ? b : b === null ? a : Math.min(a, b));
const requestAt = (e: Enriched): number | null => minDate(e.dates.partialRequested, e.dates.fullRequested);
const asked = (e: Enriched): boolean => e.row.reachedRequest || e.row.reachedOffer;

/* ══════════════════════════════════ units ══════════════════════════════════ */

/** "3 days", "1 day", "1 wk", "7 wks". */
export function span(days: number): string {
  const d = Math.max(0, Math.round(days));
  if (d < 7) return `${d} ${d === 1 ? "day" : "days"}`;
  const w = Math.round(d / 7);
  return `${w} ${w === 1 ? "wk" : "wks"}`;
}
/** The figure and the unit of `span`, apart: for a chip and the words beside it. */
export function spanParts(days: number): { n: number; unit: string } {
  const d = Math.max(0, Math.round(days));
  if (d < 7) return { n: d, unit: d === 1 ? "day" : "days" };
  const w = Math.round(d / 7);
  return { n: w, unit: w === 1 ? "wk" : "wks" };
}
/** A difference: "on time" when it rounds to nothing, else `span`. */
export const diffWords = (days: number): string => (Math.round(Math.abs(days)) === 0 ? "on time" : span(Math.abs(days)));
/** "seven weeks", "two days" — prose. */
export function spanProse(days: number): string {
  const d = Math.max(0, Math.round(days));
  if (d < 7) return `${say(d)} ${d === 1 ? "day" : "days"}`;
  const w = Math.round(d / 7);
  return `${say(w)} ${w === 1 ? "week" : "weeks"}`;
}
const dShort = (ms: number) => { const d = new Date(ms); return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`; };
const dLong = (ms: number) => { const d = new Date(ms); return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`; };
export { dShort, dLong };

/* ══════════════════════════════════ outcomes ══════════════════════════════════ */

export interface Outcomes {
  sent: number;
  /** any partial, full or offer request, whatever happened after */
  asked: number;
  /** no answer yet */
  waiting: number;
  /** closed without a request */
  ended: { total: number; letter: number; closed: number; withdrew: number };
  /** what became of the asked */
  of: { offer: number; open: number; saidNo: number; withdrew: number };
  /** asked for the whole book */
  full: number;
  ids: { asked: string[]; waiting: string[]; ended: string[] };
}
export function outcomes(items: Enriched[]): Outcomes {
  const a = items.filter(asked);
  const rest = items.filter((e) => !asked(e));
  const waiting = rest.filter((e) => e.bucket !== "closed");
  const ended = rest.filter((e) => e.bucket === "closed");
  const st = (s: QueryStatus) => (e: Enriched) => e.row.status === s;
  return {
    sent: items.length,
    asked: a.length,
    waiting: waiting.length,
    ended: {
      total: ended.length,
      letter: ended.filter(st(QueryStatus.REJECTED)).length,
      closed: ended.filter(st(QueryStatus.NO_RESPONSE)).length,
      withdrew: ended.filter(st(QueryStatus.WITHDRAWN)).length,
    },
    of: {
      offer: a.filter((e) => e.row.reachedOffer).length,
      open: a.filter((e) => !e.row.reachedOffer && e.bucket !== "closed").length,
      saidNo: a.filter((e) => !e.row.reachedOffer && e.bucket === "closed" && e.row.status !== QueryStatus.WITHDRAWN).length,
      withdrew: a.filter((e) => !e.row.reachedOffer && e.row.status === QueryStatus.WITHDRAWN).length,
    },
    full: items.filter((e) => e.row.reachedFull).length,
    ids: { asked: a.map((e) => e.row.id), waiting: waiting.map((e) => e.row.id), ended: ended.map((e) => e.row.id) },
  };
}

/** Below this many queries a rate is stated as "{n} of {m}", never a percentage (the thin-sample rule). */
export const RATE_FLOOR = 5;
export interface Rate { pct: number | null; n: number; of: number }
export function requestRate(o: Outcomes): Rate {
  return { pct: o.sent >= RATE_FLOOR ? Math.round((o.asked / o.sent) * 100) : null, n: o.asked, of: o.sent };
}
/** "26%" or "1 of 2" or "No queries". */
export const rateWords = (r: Rate): string => (r.of === 0 ? "No queries" : r.pct !== null ? `${r.pct}%` : `${r.n === 0 ? "None" : r.n} of ${r.of}`);

/* ══════════════════════════════════ did they reply when they said? ══════════════════════════════════ */

export interface KeepRow { id: string; agency: string; what: string; sentMs: number | null; saidWeeks: number; tookDays: number; diffDays: number }
export interface ReplyKeeping {
  kept: KeepRow[];
  longer: KeepRow[];
  placed: number;
  unplaced: number;
  /** over ALL dated replies, in days */
  typical: number | null;
  quickest: number | null;
  longest: number | null;
  replies: number;
  /** the reply each took, every dated reply — the desk's dot strip */
  all: number[];
}
export function replyKeeping(items: Enriched[]): ReplyKeeping {
  const rows: KeepRow[] = [];
  let unplaced = 0;
  const all: number[] = [];
  for (const e of items) {
    if (e.replyDays === null) continue;
    all.push(e.replyDays);
    const w = e.row.windowWeeks;
    if (w === null || !(w > 0)) { unplaced++; continue; }
    rows.push({ id: e.row.id, agency: agencyOf(e), what: replyWhat(e.replyStatus, e.row.status), sentMs: e.row.sentMs, saidWeeks: w, tookDays: e.replyDays, diffDays: e.replyDays - w * 7 });
  }
  const kept = rows.filter((r) => r.diffDays <= 0).sort((a, b) => a.tookDays - b.tookDays || a.agency.localeCompare(b.agency));
  const longer = rows.filter((r) => r.diffDays > 0).sort((a, b) => a.diffDays - b.diffDays || a.agency.localeCompare(b.agency));
  return {
    kept, longer, placed: rows.length, unplaced, replies: all.length, all: all.slice().sort((a, b) => a - b),
    typical: median(all), quickest: all.length ? Math.min(...all) : null, longest: all.length ? Math.max(...all) : null,
  };
}

/* ══════════════════════════════════ who are you still waiting on? ══════════════════════════════════ */

export interface WaitRow { id: string; agency: string; sentMs: number; saidWeeks: number | null; waitedDays: number; pastDays: number | null }
export interface ReadRow { id: string; agency: string; asked: "a partial" | "the full" | "a revision"; askedMs: number | null; sinceDays: number | null; yourMove: boolean; bucket: StateBucket }
export interface StillWaiting { waiting: WaitRow[]; reading: ReadRow[]; pastCount: number; longest: WaitRow | null; yourMove: number; noTime: number }
export function stillWaiting(items: Enriched[], nowMs: number): StillWaiting {
  const waiting: WaitRow[] = items
    .filter((e) => e.row.status === QueryStatus.QUERIED && e.row.sentMs !== null)
    .map((e) => {
      const waited = Math.max(0, Math.floor((nowMs - (e.row.sentMs as number)) / DAY_MS));
      const w = e.row.windowWeeks !== null && e.row.windowWeeks > 0 ? e.row.windowWeeks : null;
      return { id: e.row.id, agency: agencyOf(e), sentMs: e.row.sentMs as number, saidWeeks: w, waitedDays: waited, pastDays: w === null ? null : waited - w * 7 };
    })
    .sort((a, b) => b.waitedDays - a.waitedDays || a.agency.localeCompare(b.agency));
  const reading: ReadRow[] = items
    .filter((e) => e.bucket === "requested" || e.bucket === "sent")
    .map((e) => {
      const s = e.row.status;
      const kind: ReadRow["asked"] = s === QueryStatus.REVISE_RESUBMIT || s === QueryStatus.RESUBMITTED ? "a revision"
        : s === QueryStatus.FULL_REQUESTED || s === QueryStatus.FULL_SENT ? "the full" : "a partial";
      /* the request now open: the full's request date for a full, the partial's for a partial */
      const at = kind === "the full" ? (e.dates.fullRequested ?? requestAt(e)) : kind === "a partial" ? (e.dates.partialRequested ?? requestAt(e)) : requestAt(e);
      return { id: e.row.id, agency: agencyOf(e), asked: kind, askedMs: at, sinceDays: at === null ? null : Math.max(0, Math.floor((nowMs - at) / DAY_MS)), yourMove: e.bucket === "requested", bucket: e.bucket };
    })
    .sort((a, b) => (b.sinceDays ?? -1) - (a.sinceDays ?? -1) || a.agency.localeCompare(b.agency));
  return {
    waiting, reading,
    pastCount: waiting.filter((r) => r.pastDays !== null && r.pastDays > 0).length,
    longest: waiting[0] ?? null,
    yourMove: reading.filter((r) => r.yourMove).length,
    noTime: waiting.filter((r) => r.saidWeeks === null).length,
  };
}

/* ══════════════════════════════════ what you could expect by now ══════════════════════════════════ */

export interface ExpectedByNow { past: number; replied: number; closed: number; overdue: number; inside: number; noTime: number; undated: number }
export function expectedByNow(items: Enriched[], nowMs: number): ExpectedByNow {
  const out: ExpectedByNow = { past: 0, replied: 0, closed: 0, overdue: 0, inside: 0, noTime: 0, undated: 0 };
  for (const e of items) {
    const w = e.row.windowWeeks;
    if (w === null || !(w > 0)) { out.noTime++; continue; }
    if (e.row.sentMs === null) { out.undated++; continue; }
    if (nowMs <= e.row.sentMs + w * 7 * DAY_MS) { out.inside++; continue; }
    out.past++;
    if (e.row.hasResponded || asked(e) || e.row.status === QueryStatus.REJECTED) out.replied++;
    else if (e.row.status === QueryStatus.NO_RESPONSE || e.row.status === QueryStatus.WITHDRAWN) out.closed++;
    else out.overdue++;
  }
  return out;
}

/* ══════════════════════════════════ how many, and when ══════════════════════════════════ */

export interface Month { key: number; label: string; long: string; year: number; count: number; busiest: boolean }
export interface MonthlySends { months: Month[]; shown: Month[]; busiest: Month[]; lastThree: number; firstMs: number | null; lastMs: number | null }
export const MONTHS_SHOWN = 18;
const mk = (ms: number) => { const d = new Date(ms); return d.getFullYear() * 12 + d.getMonth(); };
export function monthlySends(items: Enriched[], nowMs: number): MonthlySends {
  const dated = items.map((e) => e.row.sentMs).filter((t): t is number => t !== null);
  if (!dated.length) return { months: [], shown: [], busiest: [], lastThree: 0, firstMs: null, lastMs: null };
  const first = Math.min(...dated), last = Math.max(...dated);
  const counts = new Map<number, number>();
  for (const t of dated) counts.set(mk(t), (counts.get(mk(t)) ?? 0) + 1);
  const months: Month[] = [];
  for (let k = mk(first); k <= mk(nowMs); k++) {
    months.push({ key: k, label: MONTHS_SHORT[k % 12], long: MONTHS_LONG[k % 12], year: Math.floor(k / 12), count: counts.get(k) ?? 0, busiest: false });
  }
  const max = Math.max(...months.map((m) => m.count));
  if (max > 0) for (const m of months) m.busiest = m.count === max;
  const now = mk(nowMs);
  return {
    months, shown: months.slice(-MONTHS_SHOWN), busiest: months.filter((m) => m.busiest),
    lastThree: dated.filter((t) => mk(t) > now - 3 && mk(t) <= now).length, firstMs: first, lastMs: last,
  };
}
/** "roughly two a month" — sends over the months from the first to now. */
export function perMonthWords(sent: number, months: number): string {
  if (months <= 0 || sent === 0) return "none a month";
  const r = sent / months;
  if (r < 0.75) return "less than one a month";
  const n = Math.round(r);
  return `roughly ${n <= 3 ? ["", "one", "two", "three"][n] : String(n)} a month`;
}

/* ══════════════════════════════════ moments ══════════════════════════════════ */

export interface Moment { key: "first" | "request" | "offer" | "busiest"; atMs: number; date: string; title: string; line: string; days: number | null }
export function moments(items: Enriched[], m: MonthlySends, nowMs: number = Date.now()): Moment[] {
  /* a date outside this year carries its year */
  const dOf = (ms: number) => (new Date(ms).getFullYear() === new Date(nowMs).getFullYear() ? dShort(ms) : dLong(ms));
  const out: Moment[] = [];
  const dated = items.filter((e) => e.row.sentMs !== null).sort((a, b) => (a.row.sentMs as number) - (b.row.sentMs as number));
  const first = dated[0];
  if (!first) return out;
  const t0 = first.row.sentMs as number;
  const after = (t: number) => Math.max(0, Math.round((t - t0) / DAY_MS));
  out.push({ key: "first", atMs: t0, date: dLong(t0), title: "Your first query went out", line: `${agencyOf(first)}, the first of ${items.length}.`, days: 0 });
  const reqs = items.map((e) => ({ e, t: requestAt(e) })).filter((x): x is { e: Enriched; t: number } => x.t !== null).sort((a, b) => a.t - b.t);
  if (reqs.length) {
    const { e, t } = reqs[0];
    const kind = e.dates.partialRequested !== null && (e.dates.fullRequested === null || e.dates.partialRequested <= e.dates.fullRequested) ? "a partial" : "the full";
    const replies = items.map((x) => x.replyDays).filter((d): d is number => d !== null);
    const quick = e.replyDays !== null && replies.length > 0 && e.replyDays === Math.min(...replies);
    const d = after(t);
    out.push({ key: "request", atMs: t, date: dOf(t), title: "First request to read more",
      line: `${agencyOf(e)} asked for ${kind}, ${d} ${d === 1 ? "day" : "days"} after your first query.${quick ? ` It was also your quickest reply, at ${spanProse(e.replyDays as number)}.` : ""}`, days: d });
  }
  const offers = items.map((e) => ({ e, t: e.dates.offer })).filter((x): x is { e: Enriched; t: number } => x.t !== null).sort((a, b) => a.t - b.t);
  if (offers.length) {
    const { e, t } = offers[0];
    const d = after(t);
    const fr = e.dates.fullRequested;
    const tail = fr !== null && fr <= t ? ` They asked for the full on ${dShort(fr)} and offered ${spanProse((t - fr) / DAY_MS)} later.` : "";
    out.push({ key: "offer", atMs: t, date: dOf(t), title: "Your first offer",
      line: `${agencyOf(e)}, ${d} ${d === 1 ? "day" : "days"} after your first query.${tail} ${e.bucket === "closed" ? "Ended." : "Still open."}`, days: d });
  }
  /* the busiest week: Monday to Sunday, at least two sends, the earliest on a tie */
  const weeks = new Map<number, number>();
  for (const e of dated) { const w = mondayOf(e.row.sentMs as number); weeks.set(w, (weeks.get(w) ?? 0) + 1); }
  let best: [number, number] | null = null;
  for (const [w, n] of [...weeks.entries()].sort((a, b) => a[0] - b[0])) if (n >= 2 && (!best || n > best[1])) best = [w, n];
  if (best) {
    const [w, n] = best;
    const end = w + 6 * DAY_MS;
    const a = new Date(w), b = new Date(end);
    const yr = b.getFullYear() === new Date(nowMs).getFullYear() ? "" : ` ${b.getFullYear()}`;
    const date = a.getMonth() === b.getMonth() ? `${a.getDate()} to ${b.getDate()} ${MONTHS_SHORT[b.getMonth()]}${yr}` : `${dShort(w)} to ${dShort(end)}${yr}`;
    const inBusiest = m.busiest.some((mm) => mm.key === mk(w) || mm.key === mk(end));
    out.push({ key: "busiest", atMs: w, date, title: "Your busiest week", line: `${n} queries in one week${inBusiest ? ", part of your busiest month" : ""}.`, days: n });
  }
  return out.sort((a, b) => a.atMs - b.atMs);
}

/* ══════════════════════════════════ benchmarking ══════════════════════════════════ */

/**
 * ⚠️ FIXED ANCHORS, NOT DATA. QueryTracker (querytracker.net), where writers log their own queries, most of them to US
 * agents: about 6% of queries draw a request for more; about half of all queries never get a reply; a writer sends
 * about 44 queries in all. Rounded and stated on the page as a rough guide. Change them here and nowhere else.
 */
export const BENCHMARKS_QUERYTRACKER = { requestRate: 6, replyRate: 50, queriesSent: 44 } as const;
export type Verdict = "Well above" | "Above" | "About the same" | "Below" | "Well below" | "Too early to say" | "Still early" | "About typical" | "More than most";
export function verdictOf(you: number, typical: number): Verdict {
  /* to three places, so 4.8 against 6 is the 0.8 it reads as rather than 0.7999… */
  const r = Math.round((you / typical) * 1000) / 1000;
  if (r >= 1.5) return "Well above";
  if (r >= 1.25) return "Above";
  if (r >= 0.8) return "About the same";
  if (r >= 0.5) return "Below";
  return "Well below";
}
export interface Bench { key: "rate" | "reply" | "sent"; you: number | null; typical: number; verdict: Verdict; unit: "%" | "" }
export function benchmark(o: Outcomes, ebn: ExpectedByNow): Bench[] {
  const B = BENCHMARKS_QUERYTRACKER;
  const rate = o.sent ? Math.round((o.asked / o.sent) * 100) : null;
  const reply = ebn.past ? Math.round((ebn.replied / ebn.past) * 100) : null;
  return [
    { key: "rate", you: rate, typical: B.requestRate, unit: "%", verdict: o.sent < 10 || rate === null ? "Too early to say" : verdictOf(rate, B.requestRate) },
    { key: "reply", you: reply, typical: B.replyRate, unit: "%", verdict: ebn.past < 5 || reply === null ? "Too early to say" : verdictOf(reply, B.replyRate) },
    { key: "sent", you: o.sent, typical: B.queriesSent, unit: "", verdict: o.sent < B.queriesSent ? "Still early" : o.sent <= 66 ? "About typical" : "More than most" },
  ];
}
/** Months of querying, rounded, at least one. */
export const monthOf = (firstMs: number | null, nowMs: number): number => (firstMs === null ? 0 : Math.max(1, Math.round((nowMs - firstMs) / (30.44 * DAY_MS))));

/* ══════════════════════════════════ everything the page reads ══════════════════════════════════ */

export interface V24 {
  outcomes: Outcomes; rate: Rate; keeping: ReplyKeeping; waiting: StillWaiting; expected: ExpectedByNow;
  monthly: MonthlySends; moments: Moment[]; bench: Bench[]; month: number; nowMs: number;
}
export function buildV24(model: AnalyticsModel, nowMs: number): V24 {
  const o = outcomes(model.items);
  const e = expectedByNow(model.items, nowMs);
  const m = monthlySends(model.items, nowMs);
  return {
    outcomes: o, rate: requestRate(o), keeping: replyKeeping(model.items), waiting: stillWaiting(model.items, nowMs), expected: e,
    monthly: m, moments: moments(model.items, m, nowMs), bench: benchmark(o, e), month: monthOf(m.firstMs, nowMs), nowMs,
  };
}
export { gapDays };

/** The header ring: replies kept to the stated time, over the replies that had one. Shaped as v21's ring reads it. */
export function ringOf(k: ReplyKeeping): { inside: number; dated: number; pct: number | null; share: number } {
  if (k.placed === 0) return { inside: 0, dated: 0, pct: null, share: 0 };
  const share = k.kept.length / k.placed;
  return { inside: k.kept.length, dated: k.placed, pct: Math.round(share * 100), share };
}

/* ══════════════════════════════════ the desk ══════════════════════════════════ */

/**
 * v24 §B: the three desk cards. Card 1 keeps v21's construction (weekly bars, "+N this month") with v24's rows;
 * card 2 is the request rate as `outcomes` counts it; card 3 is the typical reply as a dot strip.
 * ⚠️ THE SECTION NUMBERS ARE THE PAGE'S: S1 = 0 (what happened), S3 = 2 (how many), S4 = 3 (reply times).
 */
export function deskV24(model: AnalyticsModel, v: V24, nowMs: number): DeskCard[] {
  const [sent, rate] = desk(model, windowReplies(model.items), nowMs);
  const o = v.outcomes, k = v.keeping;
  const sentCard: DeskCard = {
    ...sent, sec: 2,
    rows: [
      { n: v.monthly.lastThree, text: "in the last three months", tone: "b" },
      { n: v.waiting.waiting.length, text: "still waiting for a reply", tone: null },
    ],
  };
  const rateCard: DeskCard = {
    ...rate, title: "Asked to read more", sec: 0,
    figure: rateWords(v.rate),
    unit: o.sent === 0 || v.rate.pct === null ? (o.sent === 0 ? null : "asked to read more") : `${o.asked} of ${o.sent}`,
    population: o.sent > 0 ? o.sent : null,
    rows: [
      { n: o.full, text: "asked for the whole book", tone: "b" },
      { n: o.of.offer, text: `${o.of.offer === 1 ? "offer" : "offers"} so far`, tone: null, zero: "No" },
    ],
  };
  const dots = model.items
    .filter((e) => e.replyDays !== null)
    .map((e) => ({ at: e.replyDays as number, title: `${agencyOf(e)}: ${span(e.replyDays as number)}` }))
    .sort((a, b) => a.at - b.at);
  const t = k.typical === null ? null : spanParts(k.typical);
  const q = k.quickest === null ? null : spanParts(k.quickest);
  const l = k.longest === null ? null : spanParts(k.longest);
  const longUnit = (p: { n: number; unit: string }) => (p.unit === "wk" ? "week" : p.unit === "wks" ? "weeks" : p.unit);
  const waitCard: DeskCard = {
    key: "wait", title: "Your typical reply time", sec: 3, colour: "#a0633f",
    stamp: k.replies === 0 ? null : `${k.replies} ${k.replies === 1 ? "reply" : "replies"}`,
    figure: t === null ? "No replies" : String(t.n),
    unit: t === null ? null : `${longUnit(t)}${k.replies < THIN_SAMPLE ? `, from ${k.replies} ${k.replies === 1 ? "reply" : "replies"}` : ""}`,
    population: t === null ? null : k.replies,
    rows: q && l ? [
      { n: q.n, text: `${q.unit}, your quickest`, tone: "r" },
      { n: l.n, text: `${l.unit}, your longest`, tone: null },
    ] : [],
    chart: { kind: "dots", dots, typical: k.typical },
    axis: l === null ? [] : ["0", "Your replies, in weeks", span(k.longest as number)],
  };
  return [sentCard, rateCard, waitCard];
}

/* ══════════════════════════════════ the seven questions ══════════════════════════════════ */

/** A run of answer text; `b` is a key figure, set in 600 ink. */
export interface Run { t: string; b?: boolean }
export interface Head { kicker: string; title: string; answer: Run[] }
/** The section tab's names and the h2s: one question each, in order. */
export const QUESTIONS = [
  "What happened to your queries?",
  "Benchmarking",
  "How many have you sent, and when?",
  "Do agents reply when they say they will?",
  "Who are you still waiting on?",
  "Moments worth remembering",
  "A note on these numbers",
] as const;
/** Sections 2, 4 and 6 (indexes 1, 3, 5) sit on the tint band. */
export const TINTED = [1, 3, 5] as const;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
/** "One", "two" … at the start of a sentence; digits past ten. */
const Say = (n: number) => { const w = say(n); return w.charAt(0).toUpperCase() + w.slice(1); };
const VERDICT_RATE: Record<string, string> = {
  "Well above": "well above what most writers see", Above: "above what most writers see", "About the same": "about what most writers see",
  Below: "below what most writers see", "Well below": "well below what most writers see",
};

export function heads(v: V24): Head[] {
  const o = v.outcomes, k = v.keeping, w = v.waiting, m = v.monthly;
  const nowY = new Date(v.nowMs).getFullYear();

  /* S1 */
  const s1: Run[] = [];
  s1.push({ t: o.waiting * 2 > o.sent ? "Most are still waiting for an answer. " : o.waiting === 0 ? "None is still waiting for an answer. " : `${o.waiting} ${o.waiting === 1 ? "is" : "are"} still waiting for an answer. ` });
  if (o.asked + o.ended.letter > 0) {
    s1.push({ t: "Of the agents who have replied so far, " });
    if (o.asked > 0) s1.push({ t: `${o.asked} asked to read more`, b: true });
    if (o.asked > 0 && o.ended.letter > 0) s1.push({ t: " and " });
    if (o.ended.letter > 0) s1.push({ t: `${o.ended.letter} said no to the letter` });
    s1.push({ t: "." });
  } else {
    s1.push({ t: "No agent has replied yet." });
  }
  if (o.of.offer > 0 && o.asked > 0) s1.push({ t: ` ${Say(o.of.offer)} of the ${o.asked} ${o.of.offer === 1 ? "has" : "have"} made an offer.` });

  /* S2 */
  const [rate, reply] = v.bench;
  const s2: Run[] = [];
  const rateBit = rate.verdict === "Too early to say" ? "It is too early to compare your request rate with other writers'" : `Your request rate is ${VERDICT_RATE[rate.verdict]}`;
  const replyBit = reply.verdict === "Too early to say" ? "too early to judge the silence"
    : reply.verdict === "Below" || reply.verdict === "Well below" ? "you have had fewer replies than most: roughly half of all queries never get a reply"
    : "the silence is ordinary: roughly half of all queries never get a reply";
  s2.push({ t: `${rateBit}, and ${replyBit}. First, what you could expect by now from your own agents; then how your figures compare with other writers.` });

  /* S3 */
  const s3: Run[] = [];
  const first = m.firstMs === null ? null : new Date(m.firstMs);
  if (first) {
    const fy = first.getFullYear();
    const since = fy === nowY ? `${MONTHS_LONG[first.getMonth()]} this year` : fy === nowY - 1 ? `${MONTHS_LONG[first.getMonth()]} last year` : `${MONTHS_LONG[first.getMonth()]} ${fy}`;
    s3.push({ t: `${plural(o.sent, "query", "queries")} since ${since}`, b: true });
    s3.push({ t: `, which is ${perMonthWords(o.sent, m.months.length)}. ` });
    const b = m.busiest;
    if (b.length === 1) s3.push({ t: `${b[0].long} was your busiest month, with ${b[0].count}. ` });
    else if (b.length > 1) s3.push({ t: `${listWords(b.map((x) => x.long))} were your busiest months, with ${b[0].count} each. ` });
    s3.push({ t: `You have sent ${m.lastThree === 0 ? "none" : m.lastThree} in the last three months.` });
  } else {
    s3.push({ t: "None of your queries has a date sent yet." });
  }

  /* S4 */
  const s4: Run[] = [{ t: "Most agents say in their guidelines how long they take to reply. " }];
  if (k.placed > 0) {
    s4.push({ t: `Of the ${k.placed} who have replied to you, ` });
    s4.push({ t: `${k.kept.length} kept to their time`, b: true });
    s4.push({ t: " and " });
    s4.push({ t: `${k.longer.length} took longer`, b: true });
    if (k.longer.length > 0) {
      const lo = span(k.longer[0].diffDays), hi = span(k.longer[k.longer.length - 1].diffDays);
      s4.push({ t: lo === hi ? `, by ${lo}` : `, by between ${lo} and ${hi}` });
    }
    s4.push({ t: ". Each row shows what the agent said next to what they actually took." });
  } else {
    s4.push({ t: k.replies === 0 ? "No agent has replied yet, so there is nothing to set against what they said." : "None of your replies came from an agency that gives a time." });
  }
  if (k.unplaced > 0 && k.placed > 0) s4.push({ t: ` ${Say(k.unplaced)} ${k.unplaced === 1 ? "reply came from an agency" : "replies came from agencies"} that give${k.unplaced === 1 ? "s" : ""} no time.` });

  /* S5 */
  const s5: Run[] = [];
  s5.push({ t: plural(w.waiting.length, "query", "queries"), b: true });
  s5.push({ t: ` ${w.waiting.length === 1 ? "has" : "have"} had no reply yet and ` });
  s5.push({ t: plural(w.reading.length, "agent", "agents"), b: true });
  s5.push({ t: ` ${w.reading.length === 1 ? "is" : "are"} reading more of the book. For each query still waiting, the top bar is how long the agent said they take and the bottom bar is how long you have waited so far. A rust bar has run past what they said. For agents reading more, the bar counts from the day they asked.` });

  return [
    { kicker: `Your ${plural(o.sent, "query", "queries")}`, title: QUESTIONS[0], answer: s1 },
    { kicker: `you against other writers · month ${v.month} of querying`, title: QUESTIONS[1], answer: s2 },
    { kicker: first ? `${plural(o.sent, "query", "queries")} since ${MONTHS_LONG[first.getMonth()]} ${first.getFullYear()}` : plural(o.sent, "query", "queries"), title: QUESTIONS[2], answer: s3 },
    { kicker: `${plural(k.replies, "reply", "replies")} so far`, title: QUESTIONS[3], answer: s4 },
    { kicker: `${w.waiting.length} waiting · ${w.reading.length} being read`, title: QUESTIONS[4], answer: s5 },
    { kicker: `from ${plural(o.sent, "query", "queries")}`, title: QUESTIONS[5], answer: [{ t: "The firsts and the high points of the campaign so far, in the order they happened. They update as replies come in." }] },
    { kicker: `${plural(o.sent, "query", "queries")} · ${plural(k.replies, "reply", "replies")}`, title: QUESTIONS[6], answer: [{ t: "Everything on this page comes from what you have logged. Three things worth keeping in mind when you read it." }] },
  ];
}
/** "November and June", "May, June and July". */
export function listWords(xs: string[]): string {
  if (xs.length <= 1) return xs[0] ?? "";
  return `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}
