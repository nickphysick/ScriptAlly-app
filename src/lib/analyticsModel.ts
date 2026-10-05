/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * analyticsModel — every figure the Analytics page shows (ref design-refs/analytics-v2a.html).
 *
 * ⚠️ PURE AND READ-ONLY. It takes the active manuscript's queries, the activity log, the agents,
 * the packages and versions, a range and a clock, and returns numbers. Nothing is stored, nothing is
 * written; `recomputeQuery` stays the single writer of query state. No component on the page reads a
 * raw activity — they read this.
 *
 * ⚠️ IT BUILDS ON `buildRows` RATHER THAN BESIDE IT. The per-query enrichment (first reply, the
 * rungs reached, the dated stages) already exists and is locked; a second enrichment is how two
 * pages come to disagree about one query. This module only groups and measures what that returns.
 *
 * ⚠️ THE THIN-SAMPLE RULE (baked decision 9). A figure resting on fewer than five queries says how
 * many (`chip`); a figure resting on none renders an em dash and a plain line saying what is missing
 * — never `0`, never `0%`. A figure never hides itself.
 *
 * ⚠️ MEDIAN, NEVER MEAN, everywhere a duration is summarised (`median` from `analytics.ts`).
 *
 * ⚠️ NO APPRAISAL. Nothing here names a verdict. Strings describe what happened and what a figure
 * rests on — never whether it is good.
 */
import { Activity, Agent, ManuscriptVersion, Query, QueryStatus, SubmissionPackage } from "../types";
import {
  AnalyticsRange,
  AnalyticsRow,
  DAY_MS,
  MIN_SAMPLE,
  buildRows,
  median,
  monthKey,
  rangeWindow,
  rowsInWindow,
  safePct,
  whenMs,
} from "./analytics";
import { MONTHS_SHORT } from "./dates";

/** The volume chart draws at most this many months. */
export const VOLUME_MAX_MONTHS = 24;

/** Below this, a figure states its population. */
export const THIN_SAMPLE = 5;

/* ────────────────────────────────── the five state fills ────────────────────────────────── */

/**
 * ⚠️ THE ONLY FIVE COLOURS THAT ENCODE STATE ON THE PAGE, and they are the `:root` tokens the Query
 * Centre reads. Flat fills — no depth step, no opacity ramp; depth is `StatusDot`'s job.
 */
export type StateBucket = "queried" | "requested" | "sent" | "offer" | "closed";

export const STATE_FILL: Record<StateBucket, string> = {
  queried: "var(--state-queried)",
  requested: "var(--state-you)",
  sent: "var(--state-agent)",
  offer: "var(--state-offer)",
  closed: "var(--state-closed)",
};

export const STATE_LABEL: Record<StateBucket, string> = {
  queried: "Still queried",
  requested: "Material requested",
  sent: "Material sent",
  offer: "Offer",
  closed: "Closed",
};

export const STATE_ORDER: StateBucket[] = ["queried", "requested", "sent", "offer", "closed"];

/**
 * ⚠️ EXHAUSTIVE, CLOSED WITH `never`. A default branch would file the next status under whichever
 * bucket came last, and on a page of counts that is a quietly wrong figure rather than an error.
 */
export function stateBucket(status: QueryStatus): StateBucket {
  switch (status) {
    case QueryStatus.QUERIED:
      return "queried";
    case QueryStatus.PARTIAL_REQUESTED:
    case QueryStatus.FULL_REQUESTED:
    case QueryStatus.REVISE_RESUBMIT:
      return "requested";
    case QueryStatus.PARTIAL_SENT:
    case QueryStatus.FULL_SENT:
    case QueryStatus.RESUBMITTED:
      return "sent";
    case QueryStatus.OFFER:
    case QueryStatus.SIGNED:
      return "offer";
    case QueryStatus.REJECTED:
    case QueryStatus.WITHDRAWN:
    case QueryStatus.NO_RESPONSE:
      return "closed";
    default: {
      const unhandled: never = status;
      return unhandled;
    }
  }
}

/* ────────────────────────────────── the thin-sample rule ────────────────────────────────── */

/** A figure as the page states it: its value, what it rests on, and — when thin — the chip. */
export interface Figure {
  /** The display value, or "—" when the population is zero. */
  value: string;
  /** The line beneath: what the figure rests on, or what is missing. */
  note: string;
  /** How many queries it rests on. */
  population: number;
  /** "Rests on N queries" when 0 < population < 5; otherwise null. */
  chip: string | null;
}

export const DASH = "—";

export const restsOn = (n: number): string => `Rests on ${n} ${n === 1 ? "query" : "queries"}`;

export function figure(population: number, value: () => string, note: string, missing: string): Figure {
  if (population <= 0) return { value: DASH, note: missing, population: 0, chip: null };
  return {
    value: value(),
    note,
    population,
    chip: population < THIN_SAMPLE ? restsOn(population) : null,
  };
}

/* ────────────────────────────────── dates ────────────────────────────────── */

/* ⚠️ THE ONE SHORT-MONTH TABLE IS `lib/dates.ts`'s — a second copy is what `dates.test.ts` exists to
   refuse ("Sept" was the bug a second table produced). */
const MONTHS: readonly string[] = MONTHS_SHORT;
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "4 Nov 2025" */
export const dayMonthYear = (ms: number): string => {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
/** "4 November 2025" */
export const dayMonthYearLong = (ms: number): string => {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
};
/** "4 Nov" */
export const dayMonth = (ms: number): string => {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};
/** "Jun" from a month key */
export const monthShort = (key: number): string => MONTHS[key % 12];
/** "June" from a month key */
export const monthLong = (key: number): string => MONTHS_LONG[key % 12];
/** "June 2026" from a month key */
export const monthYearLong = (key: number): string => `${MONTHS_LONG[key % 12]} ${Math.floor(key / 12)}`;

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;
const days = (n: number): string => plural(n, "day", "days");

/* ────────────────────────────────── dated stages ────────────────────────────────── */

/** The first dated arrival of any of these statuses, from the log first, the query's own field second. */
function firstOf(row: AnalyticsRow, statuses: QueryStatus[], fallbacks: (number | null)[]): number | null {
  let best: number | null = null;
  for (const s of statuses) {
    const t = row.stageMs[s];
    if (t !== undefined && (best === null || t < best)) best = t;
  }
  if (best !== null) return best;
  for (const f of fallbacks) if (f !== null && (best === null || f < best)) best = f;
  return best;
}

/** Every date the page reads off one query, each `null` when undated. */
export interface StageDates {
  sent: number | null;
  partialRequested: number | null;
  partialSent: number | null;
  fullRequested: number | null;
  fullSent: number | null;
  offer: number | null;
  /** The close rung's own date, for a closed query. */
  closed: number | null;
}

export function stageDates(row: AnalyticsRow, q: Query): StageDates {
  const partialRequested = firstOf(row, [QueryStatus.PARTIAL_REQUESTED], [whenMs(q.partialRequestedDate)]);
  const partialSent = firstOf(row, [QueryStatus.PARTIAL_SENT], [whenMs(q.partialSentDate)]);
  const fullRequested = firstOf(row, [QueryStatus.FULL_REQUESTED], [whenMs(q.fullRequestedDate)]);
  const fullSent = firstOf(row, [QueryStatus.FULL_SENT], [whenMs(q.fullSentDate)]);
  const offer = firstOf(row, [QueryStatus.OFFER], [whenMs(q.offerDate)]);
  let closed: number | null = null;
  if (stateBucket(row.status) === "closed") {
    closed = row.stageMs[row.status] ?? (row.status === QueryStatus.REJECTED ? whenMs(q.rejectedDate) : null);
    if (closed === null) {
      /* ⚠️ `lastStatusChange` LAST, AND NOT WHEN IT EQUALS THE SEND DATE. Legacy stamped values
         survive on documents not recomputed since (types.ts says so), and one equal to `dateSent`
         would draw a query that "ended" the day it went out — measured on the harness account as a
         No-response marker at 0 weeks. Undated is the honest reading. */
      const lsc = whenMs(q.lastStatusChange);
      closed = lsc !== null && lsc !== row.sentMs ? lsc : null;
    }
  }
  return { sent: row.sentMs, partialRequested, partialSent, fullRequested, fullSent, offer, closed };
}

/** A gap in whole days, or null when either end is undated or the order is not sane. */
export const gapDays = (from: number | null, to: number | null): number | null =>
  from !== null && to !== null && to >= from ? Math.round((to - from) / DAY_MS) : null;

/* ────────────────────────────────── the model ────────────────────────────────── */

export interface ModelInput {
  queries: Query[];
  activities: Activity[];
  agents: Agent[];
  packages?: SubmissionPackage[];
  versions?: ManuscriptVersion[];
  range: AnalyticsRange;
  nowMs: number;
  /** The manuscript's title, for the page's sentences. */
  title?: string;
}

export interface Enriched {
  row: AnalyticsRow;
  q: Query;
  dates: StageDates;
  bucket: StateBucket;
  /** Days from send to the agent's first reply, or null. See `firstReply`. */
  replyDays: number | null;
  /** What that first reply was. */
  replyStatus: QueryStatus | null;
}

/**
 * The agent's first reply — the log's first incoming rung (`buildRows`), and ONLY WHERE THE LOG HAS
 * NONE, the query document's own dated incoming rungs.
 *
 * ⚠️ WHY THE FALLBACK, AND WHY IT IS NOT `responseReceivedAt`. `buildRows` refuses the stored
 * `responseReceivedAt` because legacy stamped values equal the send date and read as nought-day
 * waits. The pipeline dates (`partialRequestedDate`, `fullRequestedDate`, `offerDate`,
 * `rejectedDate`) are a different thing: `recomputeQuery` derives them from the same log, and the
 * Query Centre treats the document as the authority for stage dates. Without this the page stated
 * a dated "first request" in the story rail and "no dated replies" in the fact line three inches
 * away — two sources disagreeing on one page, measured on the harness account.
 */
function firstReply(row: AnalyticsRow, dates: StageDates): { days: number | null; status: QueryStatus | null } {
  if (row.replyDays !== null) return { days: row.replyDays, status: row.respondedStatus };
  const candidates: [number | null, QueryStatus][] = [
    [dates.partialRequested, QueryStatus.PARTIAL_REQUESTED],
    [dates.fullRequested, QueryStatus.FULL_REQUESTED],
    [dates.offer, QueryStatus.OFFER],
    [row.status === QueryStatus.REJECTED ? dates.closed : null, QueryStatus.REJECTED],
  ];
  let best: { t: number; s: QueryStatus } | null = null;
  for (const [t, st] of candidates) if (t !== null && (best === null || t < best.t)) best = { t, s: st };
  if (!best) return { days: null, status: null };
  const g = gapDays(row.sentMs, best.t);
  return g === null ? { days: null, status: null } : { days: g, status: best.s };
}

export interface SplitRow {
  bucket: StateBucket;
  count: number;
  label: string;
  /** Share of the stage, 0–1. */
  share: number;
}

export interface JourneyStage {
  key: "queried" | "requested" | "full" | "offer";
  dotStatus: QueryStatus;
  name: string;
  count: number;
  /**
   * The count as the page states it — "—" when the stage before it is empty, because a stage whose
   * population is zero has no count, it has nothing to count (the thin-sample rule). A zero over a
   * real population ("0 offers from 2 fulls") is a true count and stays a 0.
   */
  display: string;
  description: string;
  /** What became of the queries that reached this stage: where they stand today. */
  split: SplitRow[];
}

export interface JourneyLink {
  /** "37%" or "5 of 10" or "—". */
  label: string;
  from: number;
  to: number;
}

export interface ReplyRow {
  id: string;
  name: string;
  sub: string;
  windowWeeks: number;
  replyWeeks: number;
  replyDays: number;
  bucket: StateBucket;
  /** When the query went out — v13 draws the rows in send order. */
  sentMs: number | null;
  /** The reply came inside the window the agency states. */
  inside: boolean;
}

export interface EndingLane {
  key: "rejected" | "noresponse" | "withdrawn" | "offer";
  label: string;
  bucket: StateBucket;
  weeks: number[];
  medianWeeks: number | null;
}

export interface StageGap {
  key: "q-r" | "r-s" | "s-f" | "f-o";
  label: string;
  bucket: StateBucket;
  days: number[];
  lo: number | null;
  hi: number | null;
  medianDays: number | null;
  chip: string | null;
  missing: string;
}

export interface VolumeMonth {
  key: number;
  label: string;
  counts: Record<StateBucket, number>;
  total: number;
}

export type StoryKind = "first" | "request" | "full" | "offer" | "letter" | "busiest" | "recentFull" | "today";

export interface StoryEvent {
  kind: StoryKind;
  atMs: number;
  date: string;
  what: string;
  who: string | null;
  gap: string | null;
  /** The status whose `StatusDot` marks it; null for events that are not a status (letter, busiest, today). */
  dotStatus: QueryStatus | null;
}

export interface AnalyticsModel {
  range: AnalyticsRange;
  /** Every query in range. */
  sent: number;
  /** Queries on the manuscript at all, before the range — tells "no queries" from "none in range". */
  total: number;
  requests: number;
  fulls: number;
  offers: number;
  openOffers: number;
  /** Status Queried today — out with an agent, no word back. */
  stillOut: number;
  /** Dated first replies. */
  replies: number;
  /** Queries with no send date: in "all time", never in a window, never on a chart axis. */
  undated: number;
  sinceMs: number | null;
  hero: { sent: number; requests: number; offers: number; since: string | null; under: string | null };
  journey: { stages: JourneyStage[]; links: JourneyLink[] };
  facts: { requestRate: Figure; stillOut: Figure; medianWait: Figure; busiestMonth: Figure };
  /** The median wait's own number, in days — what `facts.medianWait` displays; null with no dated reply. */
  medianWaitDays: number | null;
  reply: { rows: ReplyRow[]; withoutWindow: number; maxWeeks: number; figure: Figure };
  endings: { lanes: EndingLane[]; closed: number; undatedClosed: number; maxWeeks: number; figure: Figure };
  stages: { rows: StageGap[]; maxDays: number };
  volume: { months: VolumeMonth[]; max: number; undated: number; omittedMonths: number; omittedQueries: number };
  story: { events: StoryEvent[]; foot: string | null };
  caveats: { lead: string; notes: { title: string; text: string }[] };
  /** Every figure and sentence the v13 page states (design-refs/analytics-v13.html). */
  v13: V13;
  v17: V17;
}

/**
 * The page's figures for the queries it is handed. SCOPE IS THE CALLER'S: pass the active
 * manuscript's queries and nothing else.
 */
export function analyticsModel(input: ModelInput): AnalyticsModel {
  const { queries, activities, agents, packages = [], versions = [], range, nowMs } = input;
  const allRows = buildRows(queries, activities, agents, nowMs);
  const rows = rowsInWindow(allRows, rangeWindow(range, nowMs));
  const byId = new Map(queries.map((q) => [q.id, q]));
  const items: Enriched[] = rows.map((row) => {
    const q = byId.get(row.id)!;
    const dates = stageDates(row, q);
    const reply = firstReply(row, dates);
    return { row, q, dates, bucket: stateBucket(row.status), replyDays: reply.days, replyStatus: reply.status };
  });

  const sent = items.length;
  const requests = items.filter((e) => e.row.reachedRequest).length;
  const fulls = items.filter((e) => e.row.reachedFull).length;
  const offers = items.filter((e) => e.row.reachedOffer).length;
  const openOffers = items.filter((e) => e.row.status === QueryStatus.OFFER).length;
  const stillOut = items.filter((e) => e.row.status === QueryStatus.QUERIED).length;
  const waits = items.map((e) => e.replyDays).filter((d): d is number => d !== null);
  const replies = waits.length;
  const undated = items.filter((e) => e.row.sentMs === null).length;
  const sentDates = items.map((e) => e.row.sentMs).filter((t): t is number => t !== null);
  const sinceMs = sentDates.length ? Math.min(...sentDates) : null;

  /* ── hero ── */
  const underBits: string[] = [];
  if (sinceMs !== null) underBits.push(`Since ${dayMonthYearLong(sinceMs)}`);
  if (sent > 0) underBits.push(stillOut === 0 ? "none awaiting a first reply" : `${stillOut} still awaiting a first reply`);
  const hero = {
    sent,
    requests,
    offers,
    since: sinceMs === null ? null : dayMonthYearLong(sinceMs),
    under: underBits.length ? underBits.join(" · ") : null,
  };

  /* ── journey ── */
  const splitOf = (subset: Enriched[]): SplitRow[] => {
    const n = subset.length;
    return STATE_ORDER.map((b) => {
      const count = subset.filter((e) => e.bucket === b).length;
      return { bucket: b, count, label: splitLabel(b, count), share: n ? count / n : 0 };
    }).filter((s) => s.count > 0);
  };
  const reqSet = items.filter((e) => e.row.reachedRequest);
  const fullSet = items.filter((e) => e.row.reachedFull);
  const offerSet = items.filter((e) => e.row.reachedOffer);
  /* partial first = a partial was asked for at any point; straight to full = a request that never was */
  const partialFirst = reqSet.filter(
    (e) => e.dates.partialRequested !== null || e.row.stageMs[QueryStatus.PARTIAL_SENT] !== undefined ||
      e.row.status === QueryStatus.PARTIAL_REQUESTED || e.row.status === QueryStatus.PARTIAL_SENT ||
      e.dates.partialSent !== null,
  ).length;
  const straightToFull = requests - partialFirst;
  const stagesOut: JourneyStage[] = [
    {
      key: "queried",
      dotStatus: QueryStatus.QUERIED,
      name: "Queried",
      count: sent,
      display: "",
      description: "Letter, synopsis and opening chapters out with agents",
      split: splitOf(items),
    },
    {
      key: "requested",
      dotStatus: QueryStatus.PARTIAL_REQUESTED,
      name: "Material requested",
      count: requests,
      display: "",
      description: requests
        ? `Asked to read more — ${partialFirst} partial, ${straightToFull} straight to full`
        : "No agent has asked to read more yet",
      split: splitOf(reqSet),
    },
    {
      key: "full",
      dotStatus: QueryStatus.FULL_REQUESTED,
      name: "Full manuscript",
      count: fulls,
      display: "",
      description: fulls ? "Asked to read the whole book" : "No full manuscript requested yet",
      split: splitOf(fullSet),
    },
    {
      key: "offer",
      dotStatus: QueryStatus.OFFER,
      name: "Offer",
      count: offers,
      display: "",
      description: offers ? "Offers of representation" : "No offer yet",
      split: splitOf(offerSet),
    },
  ];
  stagesOut.forEach((st, i) => {
    const population = i === 0 ? sent : stagesOut[i - 1].count;
    st.display = population === 0 ? DASH : String(st.count);
  });
  const links: JourneyLink[] = [];
  for (let i = 0; i < stagesOut.length - 1; i++) {
    const from = stagesOut[i].count;
    const to = stagesOut[i + 1].count;
    links.push({ from, to, label: from === 0 ? DASH : safePct(to, from) });
  }

  /* ── fact line ── */
  /* below the guard the value IS the fraction, so the note says when a percentage will appear
     instead of stating the same fraction twice */
  const requestRate = figure(
    sent,
    () => safePct(requests, sent),
    sent < MIN_SAMPLE ? `A percentage from ${MIN_SAMPLE} queries up` : `${requests} of ${sent} queries`,
    "no queries sent yet",
  );
  const outDates = items.filter((e) => e.row.status === QueryStatus.QUERIED).map((e) => e.row.sentMs).filter((t): t is number => t !== null);
  /* ⚠️ ITS POPULATION IS THE QUERIES SENT, NOT THE ONES STILL OUT: "0 still out" of 12 sent is a
     true count, while "0" of nothing sent is the zero the thin-sample rule forbids. */
  const stillOutFig = figure(
    sent,
    () => String(stillOut),
    stillOut === 0 ? "none out without a reply" : outDates.length ? `Oldest sent ${dayMonth(Math.min(...outDates))}` : "none of them dated",
    "no queries sent yet",
  );
  stillOutFig.chip = null;
  const medWait = median(waits);
  const medianWait = figure(replies, () => days(medWait as number), `From ${plural(replies, "dated reply", "dated replies")}`, "no dated replies yet");

  const monthCounts = new Map<number, Enriched[]>();
  for (const e of items) {
    if (e.row.sentMs === null) continue;
    const k = monthKey(e.row.sentMs);
    const list = monthCounts.get(k) ?? [];
    list.push(e);
    monthCounts.set(k, list);
  }
  let busiestKey: number | null = null;
  for (const [k, list] of monthCounts) {
    const best = busiestKey === null ? -1 : monthCounts.get(busiestKey)!.length;
    /* ties go to the EARLIER month — the first time the writer sent that many */
    if (list.length > best || (list.length === best && busiestKey !== null && k < busiestKey)) busiestKey = k;
  }
  const busiestN = busiestKey === null ? 0 : monthCounts.get(busiestKey)!.length;
  const busiestMonth = figure(
    busiestN,
    () => monthLong(busiestKey as number),
    `${plural(busiestN, "query", "queries")} sent`,
    "no dated sends yet",
  );
  /* the chip on a month is about its sends, which is what the note already states */
  busiestMonth.chip = null;

  /* ── reply window ── */
  const replyRows: ReplyRow[] = [];
  let withoutWindow = 0;
  for (const e of items) {
    if (e.replyDays === null) continue;
    if (e.row.windowWeeks === null) { withoutWindow++; continue; }
    replyRows.push({
      id: e.row.id,
      name: e.row.agentName,
      sub: e.row.agentSub,
      windowWeeks: e.row.windowWeeks,
      replyWeeks: e.replyDays / 7,
      replyDays: e.replyDays,
      bucket: stateBucket(e.replyStatus ?? e.row.status),
      sentMs: e.row.sentMs,
      inside: e.replyDays / 7 <= e.row.windowWeeks,
    });
  }
  replyRows.sort((a, b) => a.name.localeCompare(b.name) || a.replyDays - b.replyDays);
  const replyMax = ceilTo(Math.max(20, ...replyRows.map((r) => Math.max(r.windowWeeks, r.replyWeeks))), 4);
  const replyFig = figure(replyRows.length, () => String(replyRows.length), restsOn(replyRows.length), "no replies against a stated window yet");

  /* ── weeks to an ending ── */
  const laneDefs: { key: EndingLane["key"]; label: string; bucket: StateBucket; match: (e: Enriched) => boolean; at: (e: Enriched) => number | null }[] = [
    { key: "rejected", label: "Rejected", bucket: "closed", match: (e) => e.row.status === QueryStatus.REJECTED, at: (e) => e.dates.closed },
    { key: "noresponse", label: "No response", bucket: "closed", match: (e) => e.row.status === QueryStatus.NO_RESPONSE, at: (e) => e.dates.closed },
    {
      key: "withdrawn",
      label: "Withdrawn",
      bucket: "closed",
      match: (e) => e.row.status === QueryStatus.WITHDRAWN && e.q.closingReason !== "offer_declined",
      at: (e) => e.dates.closed,
    },
    { key: "offer", label: "Offer", bucket: "offer", match: (e) => e.row.reachedOffer, at: (e) => e.dates.offer },
  ];
  let undatedClosed = 0;
  const lanes: EndingLane[] = laneDefs.map((d) => {
    const weeks: number[] = [];
    for (const e of items) {
      if (!d.match(e)) continue;
      const g = gapDays(e.row.sentMs, d.at(e));
      if (g === null) { undatedClosed++; continue; }
      weeks.push(Math.round((g / 7) * 10) / 10);
    }
    const med = median(weeks.map((w) => w * 10));
    return { key: d.key, label: d.label, bucket: d.bucket, weeks, medianWeeks: med === null ? null : med / 10 };
  });
  const ended = lanes.reduce((s, l) => s + l.weeks.length, 0);
  const endMax = ceilTo(Math.max(8, ...lanes.flatMap((l) => l.weeks)), 8);
  const endFig = figure(ended, () => String(ended), restsOn(ended), "no query has reached an ending yet");

  /* ── stage to stage ── */
  const gapDefs: { key: StageGap["key"]; label: string; bucket: StateBucket; missing: string; gap: (e: Enriched) => number | null }[] = [
    {
      key: "q-r",
      label: "Queried → requested",
      bucket: "requested",
      missing: "no dated request yet",
      gap: (e) => gapDays(e.dates.sent, minDate(e.dates.partialRequested, e.dates.fullRequested)),
    },
    {
      key: "r-s",
      label: "Requested → material sent",
      bucket: "sent",
      missing: "no dated send of requested material yet",
      gap: (e) => {
        const req = minDate(e.dates.partialRequested, e.dates.fullRequested);
        if (req === null) return null;
        const sentAfter = [e.dates.partialSent, e.dates.fullSent].filter((t): t is number => t !== null && t >= req);
        return sentAfter.length ? gapDays(req, Math.min(...sentAfter)) : null;
      },
    },
    {
      key: "s-f",
      label: "Sent → full requested",
      bucket: "requested",
      missing: "no dated partial-then-full yet",
      gap: (e) => gapDays(e.dates.partialSent, e.dates.fullRequested),
    },
    {
      key: "f-o",
      label: "Full → offer",
      bucket: "offer",
      missing: "no dated offer after a full yet",
      gap: (e) => gapDays(e.dates.fullSent, e.dates.offer),
    },
  ];
  const gapRows: StageGap[] = gapDefs.map((d) => {
    const ds = items.map(d.gap).filter((g): g is number => g !== null);
    return {
      key: d.key,
      label: d.label,
      bucket: d.bucket,
      days: ds,
      lo: ds.length ? Math.min(...ds) : null,
      hi: ds.length ? Math.max(...ds) : null,
      medianDays: median(ds),
      chip: ds.length > 0 && ds.length < THIN_SAMPLE ? restsOn(ds.length) : null,
      missing: d.missing,
    };
  });
  /* fastest to slowest by median; rows with no data keep their place at the end */
  gapRows.sort((a, b) => (a.medianDays === null ? 1 : 0) - (b.medianDays === null ? 1 : 0) || (a.medianDays ?? 0) - (b.medianDays ?? 0));
  const stageMax = ceilTo(Math.max(30, ...gapRows.flatMap((r) => r.days)), 30);

  /* ── volume ── */
  const vMonths: VolumeMonth[] = [];
  if (monthCounts.size) {
    const keys = [...monthCounts.keys()];
    const w = rangeWindow(range, nowMs);
    const first = w.fromMs === null ? Math.min(...keys) : monthKey(w.fromMs);
    const last = monthKey(nowMs);
    for (let k = first; k <= last; k++) {
      const list = monthCounts.get(k) ?? [];
      const counts = { queried: 0, requested: 0, sent: 0, offer: 0, closed: 0 } as Record<StateBucket, number>;
      for (const e of list) counts[e.bucket]++;
      vMonths.push({ key: k, label: monthShort(k), counts, total: list.length });
    }
  }
  /* ⚠️ AT MOST 24 BARS. A three-year history drawn as 36 slivers says nothing about any month; the
     earlier months are counted and said, never silently dropped. */
  const vOmitted = Math.max(0, vMonths.length - VOLUME_MAX_MONTHS);
  const vOmittedQueries = vMonths.slice(0, vOmitted).reduce((n, m) => n + m.total, 0);
  vMonths.splice(0, vOmitted);
  const vMax = Math.max(0, ...vMonths.map((m) => m.total));

  /* ── the story so far ── */
  const events = storyEvents(items, packages, versions, range, nowMs, stillOut);
  const firstMs = sinceMs;
  const foot = firstMs === null
    ? null
    : range === "all"
      ? `${days(Math.max(0, Math.floor((nowMs - firstMs) / DAY_MS)))} of querying this book, from the first letter to today.`
      : `${days(Math.max(0, Math.floor((nowMs - firstMs) / DAY_MS)))} from the first letter in this period to today.`;

  /* ── caveats, written from the live populations ── */
  const caveatNotes: { title: string; text: string }[] = [];
  caveatNotes.push({
    title: "Rates move on one reply",
    text: sent > 0
      ? `The request rate shifts by roughly ${Math.max(1, Math.round(100 / sent))} percentage ${Math.round(100 / sent) === 1 ? "point" : "points"} each time one more agent asks to read. Read it as a shape, not a score.`
      : "With no queries out there is no rate yet. Once there is one, each reply moves it.",
  });
  caveatNotes.push({
    title: "Silence isn't a no",
    text: stillOut > 0
      ? `${plural(stillOut, "query is", "queries are")} still out. ${stillOut === 1 ? "It counts" : "They count"} in the request rate as not yet requested, so the rate can still rise without another letter going out.`
      : "No query is waiting on a first reply, so the request rate will only move when more letters go out.",
  });
  caveatNotes.push({
    title: "Median, not average",
    text: "One reply after two years would drag an average out of shape. The median shows the middle of the pack.",
  });
  caveatNotes.push({
    title: "None of this is about the book alone",
    text: "How full an agent's list is, what sold last season, who's on leave, whether it landed on the right desk in the right week — none of it is visible from your side.",
  });

  const v13 = buildV13(items, { sent, requests, fulls, offers, stillOut, replies, sinceMs, nowMs, medWait, replyRows, withoutWindow, lanes, gapRows, title: input.title ?? "" });
  const v17 = buildV17(items, { sent, requests, fulls, offers, stillOut, replies, sinceMs, nowMs, medWait, replyRows, withoutWindow, lanes, gapRows, title: input.title ?? "", agents });

  return {
    v13,
    v17,
    range,
    sent,
    total: allRows.length,
    requests,
    fulls,
    offers,
    openOffers,
    stillOut,
    replies,
    undated,
    sinceMs,
    hero,
    journey: { stages: stagesOut, links },
    facts: { requestRate, stillOut: stillOutFig, medianWait, busiestMonth },
    medianWaitDays: replies > 0 && medWait != null ? (medWait as number) : null,
    reply: { rows: replyRows, withoutWindow, maxWeeks: replyMax, figure: replyFig },
    endings: { lanes, closed: ended, undatedClosed, maxWeeks: endMax, figure: endFig },
    stages: { rows: gapRows, maxDays: stageMax },
    volume: { months: vMonths, max: vMax, undated, omittedMonths: vOmitted, omittedQueries: vOmittedQueries },
    story: { events, foot },
    caveats: {
      lead: `Every figure on this page rests on ${plural(sent, "query", "queries")} and ${plural(replies, "dated reply", "dated replies")}.`,
      notes: caveatNotes,
    },
  };
}

function splitLabel(b: StateBucket, n: number): string {
  switch (b) {
    case "queried": return `${n} still out`;
    case "requested": return `${n} requested`;
    case "sent": return `${n} being read`;
    case "offer": return `${n} ${n === 1 ? "offer" : "offers"}`;
    case "closed": return `${n} closed`;
    default: {
      const unhandled: never = b;
      return unhandled;
    }
  }
}

const minDate = (a: number | null, b: number | null): number | null =>
  a === null ? b : b === null ? a : Math.min(a, b);

const ceilTo = (v: number, step: number): number => Math.max(step, Math.ceil(v / step) * step);

/* ────────────────────────────────── the story ────────────────────────────────── */

function whoOf(e: Enriched): string {
  return e.row.agentSub ? `${e.row.agentName} · ${e.row.agentSub}` : e.row.agentName;
}

export function storyEvents(
  items: Enriched[],
  packages: SubmissionPackage[],
  versions: ManuscriptVersion[],
  range: AnalyticsRange,
  nowMs: number,
  stillOut: number,
): StoryEvent[] {
  const ev: StoryEvent[] = [];
  const whole = range === "all";
  const earliest = <T,>(list: T[], at: (x: T) => number | null): { x: T; t: number } | null => {
    let best: { x: T; t: number } | null = null;
    for (const x of list) {
      const t = at(x);
      if (t !== null && (best === null || t < best.t)) best = { x, t };
    }
    return best;
  };
  const latest = <T,>(list: T[], at: (x: T) => number | null): { x: T; t: number } | null => {
    let best: { x: T; t: number } | null = null;
    for (const x of list) {
      const t = at(x);
      if (t !== null && (best === null || t > best.t)) best = { x, t };
    }
    return best;
  };

  const first = earliest(items, (e) => e.row.sentMs);
  if (first) {
    ev.push({
      kind: "first",
      atMs: first.t,
      date: dayMonthYear(first.t),
      what: whole ? "First query went out" : "First query in this period",
      who: whoOf(first.x),
      gap: null,
      dotStatus: QueryStatus.QUERIED,
    });
  }

  const reqAt = (e: Enriched) => minDate(e.dates.partialRequested, e.dates.fullRequested);
  const firstReq = earliest(items, reqAt);
  if (firstReq) {
    const partial = firstReq.x.dates.partialRequested !== null && firstReq.x.dates.partialRequested === firstReq.t;
    const g = first ? gapDays(first.t, firstReq.t) : null;
    ev.push({
      kind: "request",
      atMs: firstReq.t,
      date: dayMonthYear(firstReq.t),
      what: "First request for material",
      who: `${whoOf(firstReq.x)} — ${partial ? "partial" : "full"}`,
      gap: g === null ? null : `${days(g)} after the first query`,
      dotStatus: partial ? QueryStatus.PARTIAL_REQUESTED : QueryStatus.FULL_REQUESTED,
    });
  }

  const firstFull = earliest(items, (e) => e.dates.fullRequested);
  /* when the first request WAS a full, the same event is not stated twice */
  const fullIsFirstReq = !!firstFull && !!firstReq && firstFull.x === firstReq.x && firstFull.t === firstReq.t;
  if (firstFull && !fullIsFirstReq) {
    ev.push({
      kind: "full",
      atMs: firstFull.t,
      date: dayMonthYear(firstFull.t),
      what: "First full manuscript requested",
      who: whoOf(firstFull.x),
      gap: null,
      dotStatus: QueryStatus.FULL_REQUESTED,
    });
  }

  const offer = earliest(items, (e) => e.dates.offer);
  if (offer) {
    const standing =
      offer.x.row.status === QueryStatus.OFFER ? "still open"
        : offer.x.row.status === QueryStatus.SIGNED ? "accepted"
          : offer.x.q.closingReason === "offer_declined" ? "declined" : null;
    const g = firstReq ? gapDays(firstReq.t, offer.t) : null;
    ev.push({
      kind: "offer",
      atMs: offer.t,
      date: dayMonthYear(offer.t),
      what: "An offer of representation",
      who: standing ? `${whoOf(offer.x)} — ${standing}` : whoOf(offer.x),
      gap: g === null ? null : `${days(g)} from the first request`,
      dotStatus: QueryStatus.OFFER,
    });
  }

  /* the query letter changing: the letter each send went out with, in send order */
  const pkgById = new Map(packages.map((p) => [p.id, p]));
  const verById = new Map(versions.map((v) => [v.id, v]));
  const sends = items
    .filter((e) => e.row.sentMs !== null)
    .sort((a, b) => (a.row.sentMs as number) - (b.row.sentMs as number))
    .map((e) => {
      const pkg = pkgById.get(e.q.sentPackageId || e.q.packageId);
      const letter = pkg?.queryLetterVersionId || "";
      return { e, letter };
    });
  let prev: string | null = null;
  for (let i = 0; i < sends.length; i++) {
    const { e, letter } = sends[i];
    if (!letter) continue;
    if (prev !== null && letter !== prev) {
      const later = sends.slice(i).filter((s) => s.letter);
      const same = later.filter((s) => s.letter === letter).length;
      const name = verById.get(letter)?.versionName;
      ev.push({
        kind: "letter",
        atMs: e.row.sentMs as number,
        date: dayMonthYear(e.row.sentMs as number),
        what: name ? `A new query letter: ${name}` : "A new version of the query letter",
        who: same === later.length ? "Used for every query since" : `Used for ${plural(same, "query", "queries")} since`,
        gap: null,
        dotStatus: null,
      });
    }
    prev = letter;
  }

  /* the busiest month — only when it stands out at all */
  const byMonth = new Map<number, Enriched[]>();
  for (const e of items) {
    if (e.row.sentMs === null) continue;
    const k = monthKey(e.row.sentMs);
    byMonth.set(k, [...(byMonth.get(k) ?? []), e]);
  }
  let bk: number | null = null;
  for (const [k, list] of byMonth) {
    const best = bk === null ? -1 : byMonth.get(bk)!.length;
    if (list.length > best || (list.length === best && bk !== null && k < bk)) bk = k;
  }
  if (bk !== null && byMonth.get(bk)!.length >= 2) {
    const list = byMonth.get(bk)!;
    const waiting = list.filter((e) => e.row.status === QueryStatus.QUERIED).length;
    /* ⚠️ PLACED AT THE MONTH'S LAST SEND, NOT ITS FIRST DAY: the 1st of the month can precede the
       first query ever sent, and the spine would then open on a month before the story began. */
    const lastSend = Math.max(...list.map((e) => e.row.sentMs as number));
    ev.push({
      kind: "busiest",
      atMs: lastSend,
      date: monthYearLong(bk),
      what: `Busiest month — ${list.length} queries out`,
      who: waiting === 0 ? "None still awaiting a first reply" : `${waiting} still awaiting a first reply`,
      gap: null,
      dotStatus: null,
    });
  }

  const lastFull = latest(items, (e) => e.dates.fullRequested);
  if (lastFull && firstFull && lastFull.t !== firstFull.t) {
    ev.push({
      kind: "recentFull",
      atMs: lastFull.t,
      date: dayMonthYear(lastFull.t),
      what: "Most recent full requested",
      who: whoOf(lastFull.x),
      gap: null,
      dotStatus: QueryStatus.FULL_REQUESTED,
    });
  }

  ev.sort((a, b) => a.atMs - b.atMs);

  if (items.length) {
    const reading = items.filter((e) => e.row.status === QueryStatus.FULL_SENT || e.row.status === QueryStatus.RESUBMITTED).length;
    const bits: string[] = [];
    if (stillOut) bits.push(`${plural(stillOut, "query", "queries")} still out`);
    if (reading) bits.push(`${plural(reading, "full", "fulls")} being read`);
    ev.push({
      kind: "today",
      atMs: nowMs,
      date: "Today",
      what: bits.length ? bits.join(" · ") : "Nothing waiting on an agent today",
      who: null,
      gap: null,
      dotStatus: null,
    });
  }
  return ev;
}

/* ══════════════════════════════════ v13 (design-refs/analytics-v13.html) ══════════════════════════════════
 *
 * ⚠️ THE REF'S COPY, VERBATIM, WITH THE LIVE NUMBERS SUBSTITUTED — and where the ref's sentence would be
 * false of the data, the sentence says what the data says (a cold rejection the ref has no segment for,
 * a rate that counts still-out queries in its denominator). Every reading obeys the thin-sample rule:
 * a population of zero is an em dash and what is missing, never a 0.
 */

/** One query as a v13 mark — every month block, share segment, dot and lane is one of these. */
export interface V13Query {
  id: string;
  agent: string;
  agency: string;
  sentMs: number | null;
  /** The close rung's date for a closed query, the offer's for an offer; null while open. */
  endMs: number | null;
  bucket: StateBucket;
  /** "Still waiting for a first reply" … in the ref's words. */
  state: string;
}

export interface V13Reading { value: string; label: string }
export interface V13Segment { key: string; label: string; count: number; bucket: StateBucket; ids: string[] }
export interface V13FunnelRow { count: number; display: string; name: string; desc: string; went: string | null; note: string | null }

export interface V13 {
  title: string;
  sent: number;
  replies: number;
  feature: { eyebrow: string; hint: string };
  funnel: { headline: string; figNote: string; since: string | null; rows: V13FunnelRow[] };
  sentByMonth: {
    headline: string;
    lede: string;
    months: { key: number; label: string; items: V13Query[] }[];
    undated: number;
    readings: V13Reading[];
  };
  rate: {
    headline: string;
    lede: string;
    allTitle: string;
    reqTitle: string;
    all: V13Segment[];
    req: V13Segment[];
    readings: V13Reading[];
  };
  reply: { lede: string; figNote: string; rows: (ReplyRow & { query: V13Query })[]; maxWeeks: number; readings: V13Reading[] };
  waits: { gaps: StageGap[]; endings: EndingLane[]; endingQueries: Record<string, V13Query[]>; points: Record<string, { weeks: number; q: V13Query }[]>; readings: V13Reading[] };
  lanes: { lede: string; rows: V13Query[]; startMs: number | null; nowMs: number; undated: number; readings: V13Reading[] };
  caveats: { headline: string; notes: { title: string; text: string }[] };
}

export const V13_STATE: Record<StateBucket, string> = {
  queried: "Still waiting for a first reply",
  requested: "Material requested",
  sent: "Material sent, being read",
  offer: "Offer",
  closed: "Closed",
};

const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
  "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
/** A count in prose: words up to twenty, digits beyond (the ref's register). */
export const say = (n: number): string => (n >= 0 && n < WORDS.length ? WORDS[n] : String(n));
const Say = (n: number): string => { const w = say(n); return w.charAt(0).toUpperCase() + w.slice(1); };
const qs = (n: number) => (n === 1 ? "query" : "queries");
const listAnd = (xs: string[]): string => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

interface V13Ctx {
  sent: number; requests: number; fulls: number; offers: number; stillOut: number; replies: number;
  sinceMs: number | null; nowMs: number; medWait: number | null; replyRows: ReplyRow[]; withoutWindow: number;
  lanes: EndingLane[]; gapRows: StageGap[]; title: string;
}

export function buildV13(items: Enriched[], c: V13Ctx): V13 {
  const { sent, requests, fulls, offers, stillOut, replies, sinceMs, nowMs } = c;
  const asQuery = (e: Enriched): V13Query => ({
    id: e.row.id,
    agent: e.row.agentName,
    agency: e.row.agentSub,
    sentMs: e.row.sentMs,
    endMs: e.bucket === "closed" ? e.dates.closed : null,
    bucket: e.bucket,
    state: V13_STATE[e.bucket],
  });
  const byId = new Map(items.map((e) => [e.row.id, asQuery(e)]));

  /* ── the feature container ── */
  const feature = {
    eyebrow: c.title ? `Analytics · ${c.title}` : "Analytics",
    hint: sent === 0
      ? "Nothing recorded yet · updates with every reply you record"
      : `Based on ${sent} ${qs(sent)} · updates with every reply you record`,
  };

  /* ── fall-off by stage ── */
  const closedCold = items.filter((e) => e.bucket === "closed" && !e.row.reachedRequest).length;
  const counts = [sent, requests, fulls, offers];
  const NAMES: [string, string][] = [
    ["Queried", "Letter, synopsis and opening pages"],
    ["Material requested", "A partial or the full asked for"],
    ["Full manuscript", "The whole book requested"],
    ["Offer", "Representation offered"],
  ];
  const funnelRows: V13FunnelRow[] = NAMES.map(([name, desc], i) => {
    const prev = i === 0 ? null : counts[i - 1];
    const empty = i === 0 ? sent === 0 : prev === 0;
    let note: string | null = null;
    if (i === 1 && sent > 0) {
      const bits: string[] = [];
      if (stillOut) bits.push(`${stillOut} still waiting`);
      if (closedCold) bits.push(`${closedCold} closed`);
      note = bits.join(" · ") || null;
    } else if (i > 1 && prev !== null && prev > 0) {
      note = prev - counts[i] > 0 ? `${prev - counts[i]} did not, so far` : null;
    }
    return {
      count: counts[i],
      display: empty ? DASH : String(counts[i]),
      name,
      desc,
      went: i === 0 || prev === null || prev === 0 ? null : `${counts[i]} of ${prev} went on`,
      note,
    };
  });
  const sinceDays = sinceMs === null ? null : Math.max(0, Math.floor((nowMs - sinceMs) / DAY_MS));
  const funnel = {
    headline: sent === 1 ? "Where the one query got to" : `Where the ${sent} queries got to`,
    figNote: sent === 0 ? "no queries yet" : `${sent} ${qs(sent)}, bar length to scale`,
    since: sinceMs === null ? null : `since ${dayMonthYear(sinceMs)} · ${sinceDays} ${sinceDays === 1 ? "day" : "days"}`,
    rows: funnelRows,
  };

  /* ── queries sent, month by month ── */
  const dated = items.filter((e) => e.row.sentMs !== null);
  const byMonth = new Map<number, Enriched[]>();
  for (const e of dated) {
    const k = monthKey(e.row.sentMs as number);
    byMonth.set(k, [...(byMonth.get(k) ?? []), e]);
  }
  const months: { key: number; label: string; items: V13Query[] }[] = [];
  if (byMonth.size) {
    const first = Math.min(...byMonth.keys());
    const last = monthKey(nowMs);
    const lo = Math.max(first, last - (VOLUME_MAX_MONTHS - 1));
    const ORDER: StateBucket[] = ["closed", "queried", "requested", "sent", "offer"];
    for (let k = lo; k <= last; k++) {
      const list = (byMonth.get(k) ?? []).slice().sort((a, b) => ORDER.indexOf(a.bucket) - ORDER.indexOf(b.bucket));
      months.push({ key: k, label: monthShort(k), items: list.map(asQuery) });
    }
  }
  const spanMonths = byMonth.size ? monthKey(nowMs) - Math.min(...byMonth.keys()) + 1 : 0;
  const max = Math.max(0, ...[...byMonth.values()].map((l) => l.length));
  const busiest = max >= 2 ? [...byMonth.entries()].filter(([, l]) => l.length === max).map(([k]) => k).sort((a, b) => a - b) : [];
  const ones = [...byMonth.entries()].filter(([, l]) => l.length === 1).map(([k]) => k).sort((a, b) => a - b);
  const ledeBits: string[] = [];
  if (busiest.length) {
    ledeBits.push(busiest.length === 1
      ? `${Say(max)} went out in ${monthLong(busiest[0])}`
      : `${Say(max)} went out in ${monthLong(busiest[0])}${busiest.slice(1).map((k) => ` and ${say(max)} in ${monthLong(k)}`).join("")}`);
  }
  if (ones.length >= 2 && busiest.length) ledeBits.push(`${listAnd(ones.map(monthLong))} had one each`);
  else if (ones.length === 1 && busiest.length) ledeBits.push(`${monthLong(ones[0])} had one`);
  const sixAgo = (() => { const d = new Date(nowMs); d.setMonth(d.getMonth() - 6); d.setDate(1); d.setHours(0, 0, 0, 0); return d.getTime(); })();
  const recent = dated.filter((e) => (e.row.sentMs as number) >= sixAgo);
  const recentWaiting = recent.filter((e) => e.bucket === "queried").length;
  const sentByMonth = {
    headline: sent === 0
      ? "No queries sent yet"
      : `${sent} ${qs(sent)} over ${say(spanMonths)} ${spanMonths === 1 ? "month" : "months"}`,
    lede: `${ledeBits.length ? `${ledeBits.join("; ")}. ` : ""}Each block is one query, in its status colour today.`,
    months,
    undated: items.length - dated.length,
    readings: [
      sent === 0 ? { value: DASH, label: "no queries sent yet" } : { value: String(sent), label: `${qs(sent)} sent` },
      busiest.length
        ? { value: busiest.map(monthShort).join(" · "), label: busiest.length === 1 ? `busiest month, ${say(max)} queries` : `busiest months, ${say(max)} each` }
        : { value: DASH, label: "no month has more than one query yet" },
      recent.length
        ? { value: String(recent.length), label: `sent since ${monthLong(monthKey(sixAgo))} — ${recentWaiting} still waiting` }
        : { value: DASH, label: `nothing sent since ${monthLong(monthKey(sixAgo))}` },
    ],
  };

  /* ── response rate: the two share bars ── */
  const ids = (f: (e: Enriched) => boolean) => items.filter(f).map((e) => e.row.id);
  const seg = (key: string, label: string, bucket: StateBucket, f: (e: Enriched) => boolean): V13Segment => {
    const list = ids(f);
    return { key, label, bucket, count: list.length, ids: list };
  };
  const cold = (st: QueryStatus) => (e: Enriched) => !e.row.reachedRequest && e.row.status === st && !(st === QueryStatus.WITHDRAWN && e.q.closingReason === "offer_declined");
  const all = [
    seg("asked", "asked for more", "requested", (e) => e.row.reachedRequest),
    seg("waiting", "no reply yet", "queried", (e) => e.row.status === QueryStatus.QUERIED),
    seg("passed", "passed on the letter", "closed", cold(QueryStatus.REJECTED)),
    seg("silence", "closed for silence", "closed", cold(QueryStatus.NO_RESPONSE)),
    seg("withdrawn", "withdrawn", "closed", cold(QueryStatus.WITHDRAWN)),
  ].filter((x) => x.count > 0);
  const reqd = (e: Enriched) => e.row.reachedRequest;
  const req = [
    seg("offer", "offer", "offer", (e) => reqd(e) && e.row.reachedOffer),
    seg("reading", "still reading", "sent", (e) => reqd(e) && !e.row.reachedOffer && e.bucket === "sent"),
    seg("owed", "requested, not sent yet", "requested", (e) => reqd(e) && !e.row.reachedOffer && e.bucket === "requested"),
    seg("passedAfter", "passed after reading", "closed", (e) => reqd(e) && !e.row.reachedOffer && e.bucket === "closed"),
  ].filter((x) => x.count > 0);
  const silence = all.find((x) => x.key === "silence")?.count ?? 0;
  const withdrawn = all.find((x) => x.key === "withdrawn")?.count ?? 0;
  const passedCold = all.find((x) => x.key === "passed")?.count ?? 0;
  const pct = safePct(requests, sent);
  const rateLede: string[] = [];
  if (sent > 0) {
    rateLede.push(pct.includes("%") ? `That is a ${pct} request rate.` : `That is ${pct} so far — too few for a percentage, which appears from ${MIN_SAMPLE} queries.`);
    if (stillOut > 0) rateLede.push(`${Say(stillOut)} ${stillOut === 1 ? "query has" : "queries have"} had no reply yet, so the rate can still move either way.`);
    const closes: string[] = [];
    if (passedCold) closes.push(`${say(passedCold)} ${passedCold === 1 ? "was" : "were"} passed on from the letter alone`);
    if (silence) closes.push(`${say(silence)} ${silence === 1 ? "was" : "were"} closed by you after a long silence`);
    if (withdrawn) closes.push(`${say(withdrawn)} ${withdrawn === 1 ? "was" : "were"} withdrawn`);
    if (closes.length) { const t = listAnd(closes); rateLede.push(`${t.charAt(0).toUpperCase()}${t.slice(1)}.`); }
  }
  const rate = {
    headline: sent === 0 ? "No queries yet, so no requests" : `${requests} of ${sent} drew a request for more material`,
    lede: rateLede.join(" ") || "Once queries go out, this shows how many drew a request for more.",
    allTitle: `What happened to the ${sent}`,
    reqTitle: requests === 1 ? "What happened to the one request" : `What happened to the ${requests} requests`,
    all,
    req,
    readings: [
      sent === 0 ? { value: DASH, label: "no queries sent yet" } : { value: pct, label: `request rate — ${requests} of ${sent}` },
      requests === 0 ? { value: DASH, label: "no requests yet" } : { value: `${fulls} of ${requests}`, label: `${requests === 1 ? "request" : "requests"} went on to the full manuscript` },
      fulls === 0 ? { value: DASH, label: "no full manuscript requested yet" } : { value: `${offers} of ${fulls}`, label: `full ${fulls === 1 ? "read" : "reads"} led to an offer` },
    ],
  };

  /* ── response window honesty ── */
  const rows = c.replyRows.slice().sort((a, b) => (a.sentMs ?? 0) - (b.sentMs ?? 0)).map((r) => ({ ...r, query: byId.get(r.id)! }));
  const inside = rows.filter((r) => r.inside).length;
  const longest = rows.reduce<(typeof rows)[number] | null>((m, r) => (m === null || r.replyDays > m.replyDays ? r : m), null);
  const replyMax = Math.max(16, Math.ceil(Math.max(0, ...rows.map((r) => Math.max(r.windowWeeks, r.replyWeeks))) / 4) * 4);
  const reply = {
    lede: `The bar is the response time each agent states in their guidelines. The dot is when the reply arrived, coloured by what the reply was; a dotted line shows how far past the window it came. ${replies === 0 ? "No agent has replied yet." : `${Say(replies)} ${replies === 1 ? "agent has" : "agents have"} replied so far.`}`,
    figNote: rows.length === 0
      ? "no replies against a stated window yet"
      : `${say(rows.length)} ${rows.length === 1 ? "reply" : "replies"}, in the order the queries were sent${c.withoutWindow ? ` · ${c.withoutWindow} more from agencies that state no window` : ""}`,
    rows,
    maxWeeks: replyMax,
    readings: [
      c.medWait === null || replies === 0 ? { value: DASH, label: "no dated replies yet" } : { value: `${c.medWait} ${c.medWait === 1 ? "day" : "days"}`, label: `median wait for a reply${replies < THIN_SAMPLE ? ` — ${replies} ${replies === 1 ? "reply" : "replies"}` : ""}` },
      rows.length === 0 ? { value: DASH, label: "no replies against a stated window yet" } : { value: `${inside} of ${rows.length}`, label: "replied inside their stated window" },
      longest === null ? { value: DASH, label: "no replies yet" } : { value: `${Math.round(longest.replyDays / 7)} ${Math.round(longest.replyDays / 7) === 1 ? "week" : "weeks"}`, label: `longest wait for a reply, ${longest.sub || longest.name}` },
    ],
  };

  /* ── wait times by stage ── */
  const gap = (k: StageGap["key"]) => c.gapRows.find((g) => g.key === k)!;
  const qr = gap("q-r"), rs = gap("r-s");
  const pass = c.lanes.find((l) => l.key === "rejected")!;
  const daysR = (g: StageGap, label: string, missing: string): V13Reading =>
    g.medianDays === null ? { value: DASH, label: missing } : { value: `${g.medianDays} ${g.medianDays === 1 ? "day" : "days"}`, label: `${label}${g.days.length < THIN_SAMPLE ? ` — ${g.days.length} ${qs(g.days.length)}` : ""}` };
  const endingQueries: Record<string, V13Query[]> = {};
  for (const l of c.lanes) endingQueries[l.key] = [];
  for (const e of items) {
    const q = byId.get(e.row.id)!;
    if (e.row.status === QueryStatus.REJECTED) endingQueries.rejected.push(q);
    else if (e.row.status === QueryStatus.NO_RESPONSE) endingQueries.noresponse.push(q);
    else if (e.row.status === QueryStatus.WITHDRAWN && e.q.closingReason !== "offer_declined") endingQueries.withdrawn.push(q);
    if (e.row.reachedOffer) endingQueries.offer.push(q);
  }
  /* one dot per dated ending, tied to its query so its tooltip can name the agent — the same dates the
     lanes' weeks came from (the close rung, or the offer), so a dot and its lane cannot disagree */
  const points: Record<string, { weeks: number; q: V13Query }[]> = { rejected: [], noresponse: [], withdrawn: [], offer: [] };
  for (const e of items) {
    const q = byId.get(e.row.id)!;
    const add = (lane: string, at: number | null) => {
      const g = gapDays(e.row.sentMs, at);
      if (g !== null) points[lane].push({ weeks: Math.round((g / 7) * 10) / 10, q });
    };
    if (e.row.status === QueryStatus.REJECTED) add("rejected", e.dates.closed);
    else if (e.row.status === QueryStatus.NO_RESPONSE) add("noresponse", e.dates.closed);
    else if (e.row.status === QueryStatus.WITHDRAWN && e.q.closingReason !== "offer_declined") add("withdrawn", e.dates.closed);
    if (e.row.reachedOffer) add("offer", e.dates.offer);
  }
  const waits = {
    gaps: c.gapRows,
    endings: c.lanes,
    endingQueries,
    points,
    readings: [
      daysR(qr, "median from query to a request", "no dated request yet"),
      daysR(rs, "median for you to send what was asked for", "no requested material sent yet"),
      pass.medianWeeks === null
        ? { value: DASH, label: "no dated pass yet" }
        : { value: `${Math.round(pass.medianWeeks)} ${Math.round(pass.medianWeeks) === 1 ? "week" : "weeks"}`, label: `median time to a pass${pass.weeks.length < THIN_SAMPLE ? ` — ${pass.weeks.length} ${qs(pass.weeks.length)}` : ""}` },
    ],
  };

  /* ── how things stand: one line per query ── */
  const laneRows = dated.map((e) => byId.get(e.row.id)!).sort((a, b) => (a.sentMs as number) - (b.sentMs as number));
  const reading = items.filter((e) => e.bucket === "requested" || e.bucket === "sent").length;
  const openOffers = items.filter((e) => e.row.status === QueryStatus.OFFER).length;
  const waitingOldest = laneRows.filter((q) => q.bucket === "queried")[0] ?? null;
  const standBits: string[] = [];
  standBits.push(stillOut ? `${Say(stillOut)} ${stillOut === 1 ? "is" : "are"} still waiting for a first reply` : "None is waiting for a first reply");
  if (reading) standBits.push(`${say(reading)} ${reading === 1 ? "agent is" : "agents are"} reading material beyond the letter`);
  if (openOffers) standBits.push(`${say(openOffers)} ${openOffers === 1 ? "offer is" : "offers are"} open`);
  const lanes = {
    lede: `One line per query, from the day it went out to today or to the day it ended. ${standBits.join("; ")}.`,
    rows: laneRows,
    startMs: laneRows.length ? (laneRows[0].sentMs as number) : null,
    nowMs,
    undated: items.length - dated.length,
    readings: [
      sent === 0 ? { value: DASH, label: "no queries sent yet" } : { value: String(stillOut), label: "awaiting a first reply" },
      sent === 0 ? { value: DASH, label: "no queries sent yet" } : { value: String(reading), label: "reading more than the letter" },
      waitingOldest === null
        ? { value: DASH, label: "no query is waiting" }
        : (() => { const d = Math.floor((nowMs - (waitingOldest.sentMs as number)) / DAY_MS); return { value: `${d} ${d === 1 ? "day" : "days"}`, label: `oldest query still waiting, ${waitingOldest.agency || waitingOldest.agent}` }; })(),
    ],
  };

  /* ── what the numbers can't tell you ── */
  const pp = sent > 0 ? Math.max(1, Math.round(100 / sent)) : 0;
  const caveats = {
    headline: `Everything on this page rests on ${sent} ${qs(sent)} and ${replies} ${replies === 1 ? "reply" : "replies"}`,
    notes: [
      {
        title: "Small numbers move a lot",
        text: sent > 0
          ? `One more reply moves the request rate by about ${say(pp)} percentage ${pp === 1 ? "point" : "points"}. Treat the rates as a rough picture rather than a precise measure.`
          : "With no queries out there is no rate yet. Once there is one, every reply moves it.",
      },
      {
        title: "No reply is not counted as a no",
        text: stillOut > 0
          ? `${Say(stillOut)} ${stillOut === 1 ? "query is" : "queries are"} still waiting. ${stillOut === 1 ? "It counts" : "They count"} as not yet requested rather than as a pass, so the request rate can rise from here without another letter going out.`
          : "No query is waiting for a first reply, so the request rate will only move when more letters go out.",
      },
      {
        title: "Medians, not averages",
        text: "A single very slow reply would pull an average a long way. The median is the middle value, so it is less affected by one outlier.",
      },
      {
        title: "What this page cannot see",
        text: "How full an agent's list is, what they have recently sold, whether they are on leave, and when your query was actually read. None of that is recorded here, and all of it affects the numbers.",
      },
    ],
  };

  return { title: c.title, sent, replies, feature, funnel, sentByMonth, rate, reply, waits, lanes, caveats };
}

/* ══════════════════════════════════ v17 (design-refs/analytics-v17.html) ══════════════════════════════════
 *
 * ⚠️ THE REF'S COPY, VERBATIM, WITH THE LIVE NUMBERS SUBSTITUTED — and where the ref's sentence would be
 * false of the data, the sentence says what the data says (a cold rejection the ref has no segment for,
 * a rate that counts still-waiting queries in its denominator, the caveat that claims otherwise).
 *
 * ⚠️ THE THIN-SAMPLE RULE, v17's FORM (baked decision 9): a figure resting on fewer than five states its
 * population; a figure resting on none — or a count that is zero — is PLAIN WORDS ("None yet", "Not
 * yet", "No replies yet"). Never `0`, `0%` or a bare dash, and a figure never hides itself.
 *
 * ⚠️ ONE CLOCK: `nowMs` is the caller's, and every window here — the last 90 days, the 90 before, the
 * weeks of the log — is measured from it, so no two figures can disagree about what today is.
 */

/** One query as a v17 mark — every dot, segment, lane and record is one of these. */
export interface V17Query {
  id: string;
  agent: string;
  agency: string;
  sentMs: number | null;
  /** The close rung's date for a closed query; null while open. */
  endMs: number | null;
  bucket: StateBucket;
  /** "Still waiting for a first reply" … in the ref's words. */
  state: string;
}

/** A reading under a frame (and a figure in the strip): the value, its note, and what it rests on. */
/** ⚠️ `population` IS NULL FOR A PLAIN COUNT — its number already is its population. A STATISTIC (a rate,
 *  a median, an "n of m") carries the count it rests on, and under five its label says so. */
export interface V17Reading { value: string; label: string; population: number | null }
export interface V17Segment { key: string; label: string; count: number; bucket: StateBucket; ids: string[] }
export interface V17FunnelRow {
  count: number;
  /** The count as the page states it — words when it is zero. */
  display: string;
  name: string;
  desc: string;
  /** "n of m went on" — null on the first row, and where the stage before reached nobody. */
  went: string | null;
  note: string | null;
  /** What the row rests on: the stage before's count (the first row: every query). */
  population: number;
}
export interface V17Banner { count: string; title: string; sentence: string; bold?: string }

/** One cell of the at-a-glance strip. `all` and `d90` are the two states of the big number. */
export interface V17Glance {
  key: "sent" | "rate" | "wait" | "out" | "weeks";
  label: string;
  all: { value: string; unit: string | null; population: number | null };
  d90: { value: string; unit: string | null; population: number | null };
  /** The comparison line: `lead` (italic) around `bold` (roman) and `rest`. Always last 90 vs the 90 before. */
  compare: { lead: string; bold: string; rest: string };
  spark: { kind: "bars" | "line"; values: number[] };
}

export interface V17Week {
  /** Monday 00:00, local. */
  startMs: number;
  /** "3 Nov" */
  label: string;
  /** Mon … Sun — the queries sent that day. */
  days: V17Query[][];
  count: number;
}

export interface V17Record {
  key: "quickest" | "first-request" | "first-offer" | "busiest" | "run" | "full-read";
  label: string;
  /** "Not yet" when there is nothing to state. */
  value: string;
  who: string;
  aside: string | null;
  empty: boolean;
}

export interface V17 {
  title: string;
  sent: number;
  dated: number;
  replies: number;
  glance: V17Glance[];
  banners: V17Banner[];
  funnel: { since: string | null; rows: V17FunnelRow[] };
  log: { weeks: V17Week[]; busiest: number | null; months: { index: number; label: string }[]; readings: V17Reading[] };
  rate: { allTitle: string; reqTitle: string; all: V17Segment[]; req: V17Segment[]; readings: V17Reading[] };
  reply: { rows: (ReplyRow & { query: V17Query })[]; maxWeeks: number; stated: number; agents: number; note: string; readings: V17Reading[] };
  waits: { gaps: StageGap[]; endings: EndingLane[]; points: Record<string, { weeks: number; q: V17Query }[]>; readings: V17Reading[] };
  records: V17Record[];
  overTime: { startMs: number | null; nowMs: number; sent: number[]; requests: number[]; ended: number[]; max: number; readings: V17Reading[] };
  lanes: { rows: V17Query[]; startMs: number | null; nowMs: number; readings: V17Reading[] };
  caveats: { title: string; text: string }[];
}

export const V17_STATE: Record<StateBucket, string> = {
  queried: "Still waiting for a first reply",
  requested: "Material requested",
  sent: "Material sent, being read",
  offer: "Offer",
  closed: "Closed",
};

/* `say`, `Say`, `qs` and `listAnd` — the prose helpers — are shared with the block above. */
/** A count as a FIGURE: digits, except zero, which is a word. */
export const num = (n: number, zero = "None"): string => (n === 0 ? zero : String(n));
/** "n of m", with a zero numerator in words. */
const nOf = (n: number, m: number): string => `${n === 0 ? "None" : n} of ${m}`;
const durDays = (d: number): string => `${d} ${d === 1 ? "day" : "days"}`;
const durWeeks = (w: number): string => `${w} ${w === 1 ? "week" : "weeks"}`;
const MONTHS_FULL = MONTHS_LONG;

/** Monday 00:00 (local) of the week holding `ms`. */
export function mondayOf(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}
/** Mon = 0 … Sun = 6. */
export const weekdayOf = (ms: number): number => (new Date(ms).getDay() + 6) % 7;
const WEEKDAY = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const addDays = (ms: number, n: number): number => { const d = new Date(ms); d.setDate(d.getDate() + n); return d.getTime(); };
/** "1 to 7 June" / "29 May to 4 June" / "29 Dec 2025 to 4 Jan 2026" — a week, Monday to Sunday. */
export function weekRange(mondayMs: number): string {
  return dayRange(mondayMs, addDays(mondayMs, 6));
}
export function dayRange(a: number, b: number): string {
  const x = new Date(a), y = new Date(b);
  if (x.getFullYear() !== y.getFullYear()) return `${x.getDate()} ${MONTHS[x.getMonth()]} ${x.getFullYear()} to ${y.getDate()} ${MONTHS[y.getMonth()]} ${y.getFullYear()}`;
  if (x.getMonth() !== y.getMonth()) return `${x.getDate()} ${MONTHS_FULL[x.getMonth()]} to ${y.getDate()} ${MONTHS_FULL[y.getMonth()]}`;
  return `${x.getDate()} to ${y.getDate()} ${MONTHS_FULL[y.getMonth()]}`;
}

interface V17Ctx {
  sent: number; requests: number; fulls: number; offers: number; stillOut: number; replies: number;
  sinceMs: number | null; nowMs: number; medWait: number | null; replyRows: ReplyRow[]; withoutWindow: number;
  lanes: EndingLane[]; gapRows: StageGap[]; title: string; agents: Agent[];
}

/** A reply's status as a lower-case aside on a record ("partial requested"). */
const STATE_WORD: Partial<Record<QueryStatus, string>> = {
  [QueryStatus.PARTIAL_REQUESTED]: "partial requested",
  [QueryStatus.FULL_REQUESTED]: "full requested",
  [QueryStatus.OFFER]: "offer",
  [QueryStatus.REJECTED]: "passed",
  [QueryStatus.REVISE_RESUBMIT]: "revise and resubmit",
};

/** When the agent first asked for more: the earliest dated request rung. */
const requestAt = (e: Enriched): number | null => minDate(e.dates.partialRequested, e.dates.fullRequested);

export function buildV17(items: Enriched[], c: V17Ctx): V17 {
  const { sent, requests, fulls, offers, stillOut, replies, sinceMs, nowMs } = c;
  const asQuery = (e: Enriched): V17Query => ({
    id: e.row.id,
    agent: e.row.agentName,
    agency: e.row.agentSub,
    sentMs: e.row.sentMs,
    endMs: e.bucket === "closed" ? e.dates.closed : null,
    bucket: e.bucket,
    state: V17_STATE[e.bucket],
  });
  const byId = new Map(items.map((e) => [e.row.id, asQuery(e)]));
  const dated = items.filter((e) => e.row.sentMs !== null);
  const A0 = nowMs - 90 * DAY_MS, B0 = nowMs - 180 * DAY_MS;
  const inA = (t: number | null) => t !== null && t > A0 && t <= nowMs;
  const inB = (t: number | null) => t !== null && t > B0 && t <= A0;
  const replyAt = (e: Enriched): number | null => (e.replyDays === null || e.row.sentMs === null ? null : e.row.sentMs + e.replyDays * DAY_MS);
  const endedAt = (e: Enriched): number | null => (e.bucket === "closed" ? e.dates.closed : null);

  /* ── the training log's weeks: Monday of the first dated send → the week holding today ── */
  const weeks: V17Week[] = [];
  if (dated.length) {
    const first = mondayOf(Math.min(...dated.map((e) => e.row.sentMs as number)));
    const last = mondayOf(nowMs);
    for (let m = first; m <= last; m = addDays(m, 7)) {
      const d = new Date(m);
      weeks.push({ startMs: m, label: `${d.getDate()} ${MONTHS[d.getMonth()]}`, days: [[], [], [], [], [], [], []], count: 0 });
    }
    const idx = new Map(weeks.map((w, i) => [w.startMs, i]));
    for (const e of dated.slice().sort((a, b) => (a.row.sentMs as number) - (b.row.sentMs as number))) {
      const w = weeks[idx.get(mondayOf(e.row.sentMs as number)) as number];
      w.days[weekdayOf(e.row.sentMs as number)].push(byId.get(e.row.id)!);
      w.count++;
    }
  }
  const nWeeks = weeks.length;
  const wMax = Math.max(0, ...weeks.map((w) => w.count));
  /* ⚠️ TIES: THE EARLIEST WEEK WINS — the first time the writer sent that many — so exactly one is rust */
  const busiest = wMax > 0 ? weeks.findIndex((w) => w.count === wMax) : null;
  const active = weeks.filter((w) => w.count > 0).length;
  const months: { index: number; label: string }[] = [];
  weeks.forEach((w, i) => {
    const d = new Date(w.startMs);
    const prev = i === 0 ? null : new Date(weeks[i - 1].startMs);
    if (i === 0 || (prev && prev.getMonth() !== d.getMonth())) months.push({ index: i, label: MONTHS[d.getMonth()] });
  });
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];
  for (const e of dated) dayCounts[weekdayOf(e.row.sentMs as number)]++;
  const dayMax = Math.max(0, ...dayCounts);
  const topDay = dayMax > 0 ? dayCounts.indexOf(dayMax) : -1;
  const log = {
    weeks,
    busiest,
    months,
    readings: [
      busiest === null
        ? { value: "None yet", label: "no dated query sent yet", population: 0 }
        : { value: String(wMax), label: `busiest week, ${weekRange(weeks[busiest].startMs)}`, population: null },
      topDay < 0
        ? { value: "None yet", label: "no dated query sent yet", population: 0 }
        : { value: WEEKDAY[topDay], label: `the day you send most, ${dayMax} of ${dated.length}`, population: dated.length },
      nWeeks === 0
        ? { value: "None yet", label: "no week with a query sent yet", population: 0 }
        : { value: `${active} of ${nWeeks}`, label: "weeks with a query sent", population: nWeeks },
    ] as V17Reading[],
  };

  /* ── at a glance ── */
  const datedIn = (w: (t: number | null) => boolean) => dated.filter((e) => w(e.row.sentMs));
  const sA = datedIn(inA), sB = datedIn(inB);
  const reqOf = (xs: Enriched[]) => xs.filter((e) => e.row.reachedRequest).length;
  const rateVal = (r: number, n: number): { value: string; unit: string | null; population: number } => {
    if (n === 0) return { value: "No queries", unit: null, population: 0 };
    if (n < MIN_SAMPLE) return { value: nOf(r, n), unit: null, population: n };
    if (r === 0) return { value: "None", unit: null, population: n };
    return { value: String(Math.round((r / n) * 100)), unit: "%", population: n };
  };
  const repliesIn = (w: (t: number | null) => boolean) => items.filter((e) => e.replyDays !== null && w(replyAt(e))).map((e) => e.replyDays as number);
  const wA = repliesIn(inA), wB = repliesIn(inB);
  const medVal = (xs: number[]): { value: string; unit: string | null; population: number } => {
    const m = median(xs);
    return m === null ? { value: "No replies", unit: null, population: 0 } : { value: String(m), unit: m === 1 ? "day" : "days", population: xs.length };
  };
  const waitingAt = (t: number) => items.filter((e) => {
    if (e.row.sentMs === null || e.row.sentMs > t) return false;
    const r = replyAt(e), end = endedAt(e);
    if (r !== null && r <= t) return false;
    if (end !== null && end <= t) return false;
    /* a query that is no longer waiting today but has no dated reply left the waiting set undated: count it
       as waiting only while it is still Queried */
    if (r === null && end === null && e.row.status !== QueryStatus.QUERIED) return false;
    return true;
  }).length;
  const waitingIn = (xs: Enriched[]) => xs.filter((e) => e.row.status === QueryStatus.QUERIED).length;
  const outDates = items.filter((e) => e.row.status === QueryStatus.QUERIED).map((e) => e.row.sentMs).filter((t): t is number => t !== null);
  const oldestDays = outDates.length ? Math.floor((nowMs - Math.min(...outDates)) / DAY_MS) : null;
  const weeksA = Math.min(13, nWeeks), weeksB = Math.max(0, Math.min(13, nWeeks - 13));
  const activeA = weeks.slice(-13).filter((w) => w.count > 0).length;
  const activeB = weeks.slice(-26, -13).filter((w) => w.count > 0).length;
  /* sparkline samples: 24 instants from the first send to today */
  const samples = (f: (t: number) => number | null): number[] => {
    if (sinceMs === null) return [];
    const out: number[] = [];
    for (let i = 0; i < 24; i++) { const v = f(sinceMs + ((nowMs - sinceMs) * i) / 23); if (v !== null) out.push(v); }
    return out;
  };
  const reqAtList = items.map(requestAt).filter((t): t is number => t !== null);
  const glance: V17Glance[] = [
    {
      key: "sent",
      label: "Queries sent",
      all: { value: num(sent, "None yet"), unit: null, population: null },
      d90: { value: num(sA.length), unit: null, population: null },
      compare: sA.length === 0 && sB.length === 0
        ? { lead: "", bold: "None", rest: " sent in the last 180 days" }
        : { lead: "", bold: num(sA.length), rest: ` in the last 90 days, ${num(sB.length, "none")} in the 90 before` },
      spark: { kind: "bars", values: weeks.map((w) => w.count) },
    },
    {
      key: "rate",
      label: "Request rate",
      all: rateVal(requests, sent),
      d90: rateVal(reqOf(sA), sA.length),
      compare: sA.length === 0
        ? { lead: "", bold: "No queries", rest: ` sent in the last 90 days${sB.length ? `; ${nOf(reqOf(sB), sB.length)} asked for more in the 90 before` : ""}` }
        : { lead: "", bold: nOf(reqOf(sA), sA.length), rest: ` asked for more in the last 90 days, ${sB.length ? nOf(reqOf(sB), sB.length).replace(/^None/, "none") : "none sent"} in the 90 before` },
      spark: {
        kind: "line",
        values: samples((t) => {
          const s = dated.filter((e) => (e.row.sentMs as number) <= t).length;
          return s === 0 ? null : reqAtList.filter((r) => r <= t).length / s;
        }),
      },
    },
    {
      key: "wait",
      label: "Median wait",
      all: medVal(items.map((e) => e.replyDays).filter((d): d is number => d !== null)),
      d90: medVal(wA),
      compare: wA.length === 0
        ? { lead: "for a first reply, from ", bold: `${replies} ${replies === 1 ? "reply" : "replies"}`, rest: `; none in the last 90 days${wB.length ? `, ${wB.length} in the 90 before` : ""}` }
        : { lead: "for a first reply; ", bold: durDays(median(wA) as number), rest: ` across ${wA.length} ${wA.length === 1 ? "reply" : "replies"} in the last 90 days, ${wB.length ? `${durDays(median(wB) as number)} across ${wB.length} in the 90 before` : "none in the 90 before"}` },
      spark: {
        kind: "line",
        values: samples((t) => median(items.filter((e) => { const r = replyAt(e); return r !== null && r <= t; }).map((e) => e.replyDays as number))),
      },
    },
    {
      key: "out",
      label: "Still waiting",
      all: { value: num(stillOut), unit: null, population: null },
      d90: { value: num(waitingIn(sA)), unit: null, population: null },
      compare: oldestDays === null
        ? { lead: "", bold: "None", rest: " out without a reply" }
        : { lead: "oldest out for ", bold: durDays(oldestDays), rest: `; ${num(waitingIn(sA), "none")} sent in the last 90 days, ${num(waitingIn(sB), "none")} in the 90 before` },
      spark: { kind: "line", values: samples((t) => waitingAt(t)) },
    },
    {
      key: "weeks",
      label: "Querying for",
      all: nWeeks === 0 ? { value: "Not yet", unit: null, population: null } : { value: String(nWeeks), unit: nWeeks === 1 ? "week" : "weeks", population: null },
      d90: weeksA === 0 ? { value: "Not yet", unit: null, population: null } : { value: num(activeA), unit: `of ${weeksA} ${weeksA === 1 ? "week" : "weeks"}`, population: null },
      compare: nWeeks === 0
        ? { lead: "", bold: "No queries", rest: " sent yet" }
        : { lead: "queries sent in ", bold: num(active, "none"), rest: ` of them; ${activeA} of the last ${weeksA}, ${weeksB ? `${activeB} of the ${weeksB} before` : "none before"}` },
      spark: { kind: "bars", values: weeks.map((w) => (w.count > 0 ? 1 : 0)) },
    },
  ];

  /* ── where the queries got to ── */
  const closedCold = items.filter((e) => e.bucket === "closed" && !e.row.reachedRequest).length;
  const counts = [sent, requests, fulls, offers];
  const NAMES: [string, string][] = [
    ["Queried", "Letter, synopsis and opening pages"],
    ["Material requested", "A partial or the full asked for"],
    ["Full manuscript", "The whole book requested"],
    ["Offer", "Representation offered"],
  ];
  const funnelRows: V17FunnelRow[] = NAMES.map(([name, desc], i) => {
    const prev = i === 0 ? null : counts[i - 1];
    let note: string | null = null;
    if (i === 1 && sent > 0) {
      const bits: string[] = [];
      if (stillOut) bits.push(`${stillOut} still waiting`);
      if (closedCold) bits.push(`${closedCold} closed`);
      note = bits.join(" · ") || null;
    } else if (i > 1 && prev !== null && prev > 0) {
      note = prev - counts[i] > 0 ? `${prev - counts[i]} did not, so far` : null;
    }
    return {
      count: counts[i],
      display: counts[i] === 0 ? (i === 0 ? "None yet" : "None") : String(counts[i]),
      name,
      desc,
      went: i === 0 || prev === null || prev === 0 ? null : `${counts[i] === 0 ? "none" : counts[i]} of ${prev} went on`,
      note,
      population: i === 0 ? sent : (prev as number),
    };
  });
  const sinceDays = sinceMs === null ? null : Math.max(0, Math.floor((nowMs - sinceMs) / DAY_MS));

  /* ── response rate: the two share bars ── */
  const ids = (f: (e: Enriched) => boolean) => items.filter(f).map((e) => e.row.id);
  const seg = (key: string, label: string, bucket: StateBucket, f: (e: Enriched) => boolean): V17Segment => {
    const list = ids(f);
    return { key, label, bucket, count: list.length, ids: list };
  };
  const cold = (st: QueryStatus) => (e: Enriched) => !e.row.reachedRequest && e.row.status === st && !(st === QueryStatus.WITHDRAWN && e.q.closingReason === "offer_declined");
  const all = [
    seg("asked", "asked for more", "requested", (e) => e.row.reachedRequest),
    seg("waiting", "no reply yet", "queried", (e) => e.row.status === QueryStatus.QUERIED),
    seg("passed", "passed on the letter", "closed", cold(QueryStatus.REJECTED)),
    seg("silence", "closed for silence", "closed", cold(QueryStatus.NO_RESPONSE)),
    seg("withdrawn", "withdrawn", "closed", cold(QueryStatus.WITHDRAWN)),
  ].filter((x) => x.count > 0);
  const reqd = (e: Enriched) => e.row.reachedRequest;
  const req = [
    seg("offer", "offer", "offer", (e) => reqd(e) && e.row.reachedOffer),
    seg("reading", "still reading", "sent", (e) => reqd(e) && !e.row.reachedOffer && e.bucket === "sent"),
    seg("owed", "requested, not sent yet", "requested", (e) => reqd(e) && !e.row.reachedOffer && e.bucket === "requested"),
    seg("passedAfter", "passed after reading", "closed", (e) => reqd(e) && !e.row.reachedOffer && e.bucket === "closed"),
  ].filter((x) => x.count > 0);
  const silence = all.find((x) => x.key === "silence")?.count ?? 0;
  const withdrawn = all.find((x) => x.key === "withdrawn")?.count ?? 0;
  const passedCold = all.find((x) => x.key === "passed")?.count ?? 0;
  const pct = safePct(requests, sent);
  const rateLede: string[] = [];
  if (sent > 0) {
    rateLede.push(pct.includes("%") ? `That is a ${pct} request rate.` : `That is ${pct.replace(/^0 /, "none ")} so far, too few for a percentage, which appears from ${MIN_SAMPLE} queries.`);
    if (stillOut > 0) rateLede.push(`${Say(stillOut)} ${stillOut === 1 ? "query has" : "queries have"} had no reply yet, so the rate can still move either way.`);
    const closes: string[] = [];
    if (passedCold) closes.push(`${say(passedCold)} ${passedCold === 1 ? "was" : "were"} passed on from the letter alone`);
    if (silence) closes.push(`${say(silence)} ${silence === 1 ? "was" : "were"} closed by you after a long silence`);
    if (withdrawn) closes.push(`${say(withdrawn)} ${withdrawn === 1 ? "was" : "were"} withdrawn`);
    if (closes.length) { const t = listAnd(closes); rateLede.push(`${t.charAt(0).toUpperCase()}${t.slice(1)}.`); }
  }
  const rate = {
    allTitle: sent === 1 ? "What happened to the one query" : `What happened to the ${sent}`,
    reqTitle: requests === 1 ? "What happened to the one request" : `What happened to the ${requests} requests`,
    all,
    req,
    readings: [
      sent === 0 ? { value: "None yet", label: "no queries sent yet", population: 0 } : { value: pct.replace(/^0 of/, "None of"), label: pct.includes("%") ? `request rate, ${requests} of ${sent}` : `asked for more, too few queries for a percentage`, population: sent },
      requests === 0 ? { value: "None yet", label: "no requests yet, so none went on to the full", population: 0 } : { value: nOf(fulls, requests), label: `${requests === 1 ? "request" : "requests"} went on to the full`, population: requests },
      fulls === 0 ? { value: "None yet", label: "no full manuscript requested yet", population: 0 } : { value: nOf(offers, fulls), label: `full ${fulls === 1 ? "read" : "reads"} led to an offer`, population: fulls },
    ] as V17Reading[],
  };

  /* ── response window honesty ── */
  const rows = c.replyRows.slice().sort((a, b) => (a.sentMs ?? 0) - (b.sentMs ?? 0)).map((r) => ({ ...r, query: byId.get(r.id)! }));
  const inside = rows.filter((r) => r.inside).length;
  const longest = rows.reduce<(typeof rows)[number] | null>((m, r) => (m === null || r.replyDays > m.replyDays ? r : m), null);
  const replyMax = Math.max(16, Math.ceil(Math.max(0, ...rows.map((r) => Math.max(r.windowWeeks, r.replyWeeks))) / 4) * 4);
  /* how many of the manuscript's agents state a reply time at all — the reply chart can only draw those */
  const agentIds = new Set(items.map((e) => e.q.agentId));
  const scopedAgents = c.agents.filter((a) => agentIds.has(a.id));
  const stated = scopedAgents.filter((a) => (a.responseTimeWeeks ?? 0) > 0).length;
  const reply = {
    rows,
    maxWeeks: replyMax,
    stated,
    agents: scopedAgents.length,
    note: rows.length === 0
      ? "no replies against a stated window yet"
      : `in the order the queries were sent${c.withoutWindow ? ` · ${c.withoutWindow} more from agencies that state no window` : ""}`,
    readings: [
      c.medWait === null || replies === 0
        ? { value: "No replies yet", label: "so no median wait", population: 0 }
        : { value: durDays(c.medWait), label: `median wait for a reply${replies < THIN_SAMPLE ? `, from ${replies} ${replies === 1 ? "reply" : "replies"}` : ""}`, population: replies },
      rows.length === 0
        ? { value: "None yet", label: "no replies against a stated window yet", population: 0 }
        : { value: nOf(inside, rows.length), label: "replied inside their window", population: rows.length },
      longest === null
        ? { value: "No replies yet", label: "so no longest wait", population: 0 }
        : { value: `${Math.max(1, Math.round(longest.replyDays / 7))} wks`, label: `longest wait, ${longest.sub || longest.name}${rows.length < THIN_SAMPLE ? `, from ${rows.length} ${rows.length === 1 ? "reply" : "replies"}` : ""}`, population: rows.length },
    ] as V17Reading[],
  };

  /* ── wait times by stage ── */
  const gap = (k: StageGap["key"]) => c.gapRows.find((g) => g.key === k)!;
  const qr = gap("q-r"), rs = gap("r-s");
  const pass = c.lanes.find((l) => l.key === "rejected")!;
  const daysR = (g: StageGap, label: string, missing: string): V17Reading =>
    g.medianDays === null
      ? { value: "Not yet", label: missing, population: 0 }
      : { value: durDays(g.medianDays), label: `${label}${g.days.length < THIN_SAMPLE ? `, from ${g.days.length} ${qs(g.days.length)}` : ""}`, population: g.days.length };
  const points: Record<string, { weeks: number; q: V17Query }[]> = { rejected: [], noresponse: [], withdrawn: [], offer: [] };
  for (const e of items) {
    const q = byId.get(e.row.id)!;
    const add = (lane: string, at: number | null) => {
      const g = gapDays(e.row.sentMs, at);
      if (g !== null) points[lane].push({ weeks: Math.round((g / 7) * 10) / 10, q });
    };
    if (e.row.status === QueryStatus.REJECTED) add("rejected", e.dates.closed);
    else if (e.row.status === QueryStatus.NO_RESPONSE) add("noresponse", e.dates.closed);
    else if (e.row.status === QueryStatus.WITHDRAWN && e.q.closingReason !== "offer_declined") add("withdrawn", e.dates.closed);
    if (e.row.reachedOffer) add("offer", e.dates.offer);
  }
  const ended = c.lanes.reduce((s, l) => s + l.weeks.length, 0);
  const waits = {
    gaps: c.gapRows,
    endings: c.lanes,
    points,
    readings: [
      daysR(qr, "median from query to a request", "no dated request yet"),
      daysR(rs, "median for you to send what was asked", "no requested material sent yet"),
      pass.medianWeeks === null
        ? { value: "Not yet", label: "no dated pass yet", population: 0 }
        : { value: durWeeks(Math.max(1, Math.round(pass.medianWeeks))), label: `median time to a pass${pass.weeks.length < THIN_SAMPLE ? `, from ${pass.weeks.length} ${qs(pass.weeks.length)}` : ""}`, population: pass.weeks.length },
    ] as V17Reading[],
  };

  /* ── firsts and records ── */
  const replied = items.filter((e) => e.replyDays !== null);
  const quickest = replied.slice().sort((a, b) => (a.replyDays as number) - (b.replyDays as number) || (a.row.sentMs ?? 0) - (b.row.sentMs ?? 0))[0] ?? null;
  const reqd2 = items.map((e) => ({ e, t: requestAt(e) })).filter((x): x is { e: Enriched; t: number } => x.t !== null).sort((a, b) => a.t - b.t);
  const firstReq = reqd2[0] ?? null;
  const offerd = items.map((e) => ({ e, t: e.dates.offer })).filter((x): x is { e: Enriched; t: number } => x.t !== null).sort((a, b) => a.t - b.t);
  const firstOffer = offerd[0] ?? null;
  /* the longest run of consecutive weeks with a query sent; ties go to the earlier run */
  let run = 0, runStart = -1, best = 0, bestStart = -1;
  weeks.forEach((w, i) => {
    if (w.count > 0) { if (run === 0) runStart = i; run++; if (run > best) { best = run; bestStart = runStart; } } else run = 0;
  });
  /* the longest full read: from the full going out to the offer, the pass, or — still open — today */
  const reads = items.filter((e) => e.dates.fullSent !== null).map((e) => {
    const from = e.dates.fullSent as number;
    const offerT = e.dates.offer !== null && e.dates.offer >= from ? e.dates.offer : null;
    const closeT = e.bucket === "closed" && e.dates.closed !== null && e.dates.closed >= from ? e.dates.closed : null;
    const end = offerT ?? closeT ?? (e.bucket === "sent" ? nowMs : null);
    return end === null ? null : { e, days: Math.round((end - from) / DAY_MS), how: offerT !== null ? "to the offer" : closeT !== null ? "to a pass" : "still reading" };
  }).filter((x): x is { e: Enriched; days: number; how: string } => x !== null)
    .sort((a, b) => b.days - a.days || (a.e.row.sentMs ?? 0) - (b.e.row.sentMs ?? 0));
  const longestRead = reads[0] ?? null;
  const replyName = (s: QueryStatus | null) => (s ? STATE_WORD[s] : "");
  const who = (e: Enriched) => (e.row.agentSub ? `${e.row.agentName} · ${e.row.agentSub}` : e.row.agentName);
  const records: V17Record[] = [
    quickest === null
      ? { key: "quickest", label: "Quickest reply", value: "Not yet", who: "No agent has replied yet", aside: null, empty: true }
      : { key: "quickest", label: "Quickest reply", value: (quickest.replyDays as number) < 14 ? durDays(quickest.replyDays as number) : durWeeks(Math.round((quickest.replyDays as number) / 7)), who: who(quickest), aside: replyName(quickest.replyStatus), empty: false },
    firstReq === null
      ? { key: "first-request", label: "First request", value: "Not yet", who: "No agent has asked for more yet", aside: null, empty: true }
      : { key: "first-request", label: "First request", value: dayMonth(firstReq.t), who: sinceMs === null ? who(firstReq.e) : `${durDays(Math.max(0, Math.round((firstReq.t - sinceMs) / DAY_MS)))} after your first query`, aside: null, empty: false },
    firstOffer === null
      ? { key: "first-offer", label: "First offer", value: "Not yet", who: "No offer yet", aside: null, empty: true }
      : { key: "first-offer", label: "First offer", value: dayMonth(firstOffer.t), who: firstOffer.e.row.agentSub || firstOffer.e.row.agentName, aside: firstOffer.e.row.status === QueryStatus.OFFER ? "still open" : firstOffer.e.row.status === QueryStatus.SIGNED ? "signed" : "closed", empty: false },
    busiest === null
      ? { key: "busiest", label: "Busiest week", value: "Not yet", who: "No dated query sent yet", aside: null, empty: true }
      : { key: "busiest", label: "Busiest week", value: `${wMax} ${qs(wMax)}`, who: weekRange(weeks[busiest].startMs), aside: null, empty: false },
    best === 0
      ? { key: "run", label: "Longest run", value: "Not yet", who: "No dated query sent yet", aside: null, empty: true }
      : { key: "run", label: "Longest run", value: durWeeks(best), who: best === 1 ? `a query sent in the week of ${dayMonth(weeks[bestStart].startMs)}` : `a query sent every week, ${dayRange(weeks[bestStart].startMs, addDays(weeks[bestStart + best - 1].startMs, 6))}`, aside: null, empty: false },
    longestRead === null
      ? { key: "full-read", label: "Longest full read", value: "Not yet", who: "No full manuscript has gone out yet", aside: null, empty: true }
      : { key: "full-read", label: "Longest full read", value: durDays(longestRead.days), who: `${longestRead.e.row.agentSub || longestRead.e.row.agentName}, ${longestRead.how}`, aside: null, empty: false },
  ];

  /* ── the campaign over time: three running totals ── */
  const sentT = dated.map((e) => e.row.sentMs as number).sort((a, b) => a - b);
  const reqT = reqAtList.slice().sort((a, b) => a - b);
  const endT = items.map(endedAt).filter((t): t is number => t !== null).sort((a, b) => a - b);
  const n90 = (xs: number[]) => xs.filter((t) => t > A0 && t <= nowMs).length;
  const overTime = {
    startMs: sentT.length ? sentT[0] : null,
    nowMs,
    sent: sentT,
    requests: reqT,
    ended: endT,
    max: Math.max(1, sentT.length),
    readings: [
      { value: num(n90(sentT)), label: "sent in the last 90 days", population: null },
      { value: num(n90(endT)), label: "ended in the last 90 days", population: null },
      { value: num(n90(reqT)), label: "requests in the last 90 days", population: null },
    ] as V17Reading[],
  };

  /* ── how things stand: one line per query ── */
  const laneRows = dated.map((e) => byId.get(e.row.id)!).sort((a, b) => (a.sentMs as number) - (b.sentMs as number));
  const reading = items.filter((e) => e.bucket === "requested" || e.bucket === "sent").length;
  const openOffers = items.filter((e) => e.row.status === QueryStatus.OFFER).length;
  const waitingOldest = laneRows.filter((q) => q.bucket === "queried")[0] ?? null;
  const lanes = {
    rows: laneRows,
    startMs: laneRows.length ? (laneRows[0].sentMs as number) : null,
    nowMs,
    readings: [
      sent === 0 ? { value: "None yet", label: "no queries sent yet", population: 0 } : { value: num(stillOut), label: "awaiting a first reply", population: null },
      sent === 0 ? { value: "None yet", label: "no queries sent yet", population: 0 } : { value: num(reading), label: "reading more than the letter", population: null },
      waitingOldest === null
        ? { value: "None", label: "no query is waiting", population: 0 }
        : (() => { const d = Math.floor((nowMs - (waitingOldest.sentMs as number)) / DAY_MS); return { value: durDays(d), label: `oldest still waiting, ${waitingOldest.agency || waitingOldest.agent}`, population: null }; })(),
    ] as V17Reading[],
  };

  /* ── the nine banners ── */
  const firstMonth = sinceMs === null ? null : `${MONTHS[new Date(sinceMs).getMonth()]} ${new Date(sinceMs).getFullYear()}`;
  const banners: V17Banner[] = [
    {
      count: `${sent} ${qs(sent)} · 4 stages`,
      title: sent === 1 ? "Where the one query got to" : `Where the ${sent} queries got to`,
      sentence: "Each row is a stage, and its bar is how many queries reached it. The note beside each bar is how many went on from the stage before.",
    },
    {
      count: `${sent} ${qs(sent)} · ${nWeeks} ${nWeeks === 1 ? "week" : "weeks"}`,
      title: "Queries sent",
      sentence: "One dot per query on the day it went out, in its status colour today. The bars underneath are each week's total.",
    },
    {
      count: `${requests === 0 ? "None" : requests} of ${sent} asked for more`,
      title: "Response rate",
      sentence: rateLede.join(" ") || "Once queries go out, this shows how many drew a request for more.",
    },
    {
      count: replies === 0 ? "No replies yet" : `${replies} ${replies === 1 ? "reply" : "replies"} so far`,
      title: "Response window honesty",
      sentence: "The bar is the response time each agent states in their guidelines. The dot is when the reply arrived, coloured by what it was; a dotted line shows how far past the window it came.",
    },
    {
      count: `4 stages · ${ended === 0 ? "no" : ended} ${ended === 1 ? "ending" : "endings"}`,
      title: "Wait times by stage",
      sentence: "Left, the gap between one stage and the next, from the fastest query to the slowest, with the median marked. Right, how many weeks each closed query ran before it ended. The later stages rest on very few queries.",
    },
    {
      count: `from ${sent} ${qs(sent)}`,
      title: "Firsts and records",
      sentence: "The quickest, longest and busiest moments of the campaign so far. They update as replies come in.",
    },
    {
      count: firstMonth === null ? "No queries yet" : `${firstMonth} to today`,
      title: "The campaign over time",
      sentence: "Running totals since your first query: letters sent, requests for more, and queries that have ended. Move along the chart to read any day.",
    },
    {
      count: [`${stillOut === 0 ? "none" : stillOut} waiting`, `${reading === 0 ? "none" : reading} being read`, ...(openOffers ? [`${openOffers} ${openOffers === 1 ? "offer" : "offers"}`] : [])].join(" · "),
      title: "How things stand",
      sentence: "One line per query, from the day it went out to today or to the day it ended.",
    },
    {
      count: `${sent} ${qs(sent)} · ${replies === 0 ? "no" : replies} ${replies === 1 ? "reply" : "replies"}`,
      title: "Reading the numbers",
      sentence: "Everything on this page rests on ",
      bold: `${sent === 0 ? "no" : sent} ${qs(sent)} and ${replies === 0 ? "no" : replies} ${replies === 1 ? "reply" : "replies"}`,
    },
  ];

  /* ── what the numbers can't tell you ── */
  const pp = sent > 0 ? Math.max(1, Math.round(100 / sent)) : 0;
  const caveats = [
    {
      title: "Small numbers move a lot",
      text: sent > 0
        ? `One more reply moves the request rate by about ${say(pp)} percentage ${pp === 1 ? "point" : "points"}. Treat the rates as a rough picture rather than a precise measure.`
        : "With no queries out there is no rate yet. Once there is one, every reply moves it.",
    },
    {
      title: "No reply is not counted as a no",
      /* ⚠️ NOT THE REF'S SENTENCE. The ref says still-waiting queries are "left out of the rates until they
         close"; here the request rate's denominator is every query sent, waiting ones included. */
      text: stillOut > 0
        ? `${Say(stillOut)} ${stillOut === 1 ? "query is" : "queries are"} still waiting. ${stillOut === 1 ? "It counts" : "They count"} as not yet asked for more rather than as a no, so the rates can go up or down from here.`
        : "No query is waiting for a first reply, so the request rate will only move when more letters go out.",
    },
    {
      title: "Medians, not averages",
      text: "A single very slow reply would pull an average a long way. The median is the middle value, so it is less affected by one outlier.",
    },
    {
      title: "What this page cannot see",
      text: "How full an agent's list is, what they have recently sold, whether they are on leave, and when your query was actually read. None of that is recorded here, and all of it affects the numbers.",
    },
  ];

  return {
    title: c.title,
    sent,
    dated: dated.length,
    replies,
    glance,
    banners,
    funnel: { since: sinceMs === null ? null : `since ${dayMonthYear(sinceMs)} · ${sinceDays === 0 ? "today" : durDays(sinceDays as number)}`, rows: funnelRows },
    log,
    rate,
    reply,
    waits,
    records,
    overTime,
    lanes,
    caveats,
  };
}

