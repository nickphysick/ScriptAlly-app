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
  buildRows,
  median,
  monthKey,
  rangeWindow,
  rowsInWindow,
  safePct,
  whenMs,
} from "./analytics";

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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
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
    closed = row.stageMs[row.status] ?? (row.status === QueryStatus.REJECTED ? whenMs(q.rejectedDate) : null) ?? whenMs(q.lastStatusChange);
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
}

export interface Enriched {
  row: AnalyticsRow;
  q: Query;
  dates: StageDates;
  bucket: StateBucket;
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
  reply: { rows: ReplyRow[]; withoutWindow: number; maxWeeks: number; figure: Figure };
  endings: { lanes: EndingLane[]; closed: number; undatedClosed: number; maxWeeks: number; figure: Figure };
  stages: { rows: StageGap[]; maxDays: number };
  volume: { months: VolumeMonth[]; max: number; undated: number };
  story: { events: StoryEvent[]; foot: string | null };
  caveats: { lead: string; notes: { title: string; text: string }[] };
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
    return { row, q, dates: stageDates(row, q), bucket: stateBucket(row.status) };
  });

  const sent = items.length;
  const requests = items.filter((e) => e.row.reachedRequest).length;
  const fulls = items.filter((e) => e.row.reachedFull).length;
  const offers = items.filter((e) => e.row.reachedOffer).length;
  const openOffers = items.filter((e) => e.row.status === QueryStatus.OFFER).length;
  const stillOut = items.filter((e) => e.row.status === QueryStatus.QUERIED).length;
  const waits = items.map((e) => e.row.replyDays).filter((d): d is number => d !== null);
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
      description: "Letter, synopsis and opening chapters out with agents",
      split: splitOf(items),
    },
    {
      key: "requested",
      dotStatus: QueryStatus.PARTIAL_REQUESTED,
      name: "Material requested",
      count: requests,
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
      description: fulls ? "Asked to read the whole book" : "No full manuscript requested yet",
      split: splitOf(fullSet),
    },
    {
      key: "offer",
      dotStatus: QueryStatus.OFFER,
      name: "Offer",
      count: offers,
      description: offers ? "Offers of representation" : "No offer yet",
      split: splitOf(offerSet),
    },
  ];
  const links: JourneyLink[] = [];
  for (let i = 0; i < stagesOut.length - 1; i++) {
    const from = stagesOut[i].count;
    const to = stagesOut[i + 1].count;
    links.push({ from, to, label: from === 0 ? DASH : safePct(to, from) });
  }

  /* ── fact line ── */
  const requestRate = figure(sent, () => safePct(requests, sent), `${requests} of ${sent} ${sent === 1 ? "query" : "queries"}`, "no queries sent yet");
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
    if (e.row.replyDays === null) continue;
    if (e.row.windowWeeks === null) { withoutWindow++; continue; }
    replyRows.push({
      id: e.row.id,
      name: e.row.agentName,
      sub: e.row.agentSub,
      windowWeeks: e.row.windowWeeks,
      replyWeeks: e.row.replyDays / 7,
      replyDays: e.row.replyDays,
      bucket: stateBucket(e.row.respondedStatus ?? e.row.status),
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

  return {
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
    reply: { rows: replyRows, withoutWindow, maxWeeks: replyMax, figure: replyFig },
    endings: { lanes, closed: ended, undatedClosed, maxWeeks: endMax, figure: endFig },
    stages: { rows: gapRows, maxDays: stageMax },
    volume: { months: vMonths, max: vMax, undated },
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
    case "requested": return `${n} material requested`;
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
