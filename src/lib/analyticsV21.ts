/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Analytics v21 — the figures the v21 page states that the v17 model did not (design-refs/analytics-v21/
 * analytics-v21.html). Pure: everything here reads the model's own `items` (each query in range with its dated
 * stages) and the caller's clock, so no figure on the page can disagree with another about what today is.
 *
 * ⚠️ `standing` IS THE ONE PARTITION OF A MANUSCRIPT'S QUERIES ON THIS PAGE. The header card and the How things
 *    stand chips both read it, and its four counts sum to the queries sent — every query in exactly one bucket,
 *    by its state today (`stateBucket`). Still waiting is Queried; Being read is a request or a send (the agent
 *    has asked for more, whoever holds it now); Offer is an offer or a signing; Ended is every close.
 * ⚠️ A REPLY IS PLACED AGAINST A WINDOW ONLY WHEN THE AGENCY STATES ONE. Replies from an agency that states no
 *    window are counted (`unplaced`) and never drawn; `insideShare` divides by the placed replies only.
 * ⚠️ THE THIN-SAMPLE RULE, v17's FORM, STILL HOLDS: a zero is words, and a statistic resting on fewer than five
 *    carries its population.
 */
import { QueryStatus, type Agent } from "../types";
import { DAY_MS, MIN_SAMPLE, median, safePct } from "./analytics";
import {
  STATE_FILL, THIN_SAMPLE, dayMonth, gapDays, mondayOf, num, say, weekRange, dayRange,
  type AnalyticsModel, type Enriched, type StateBucket,
} from "./analyticsModel";
import { MONTHS_SHORT } from "./dates";
import { STAGE_NAME } from "./qcSummary";
import { countryName } from "./territory";
import { agentInitials } from "./agentDisplay";

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;
const minDate = (a: number | null, b: number | null): number | null => (a === null ? b : b === null ? a : Math.min(a, b));
const agencyOf = (e: Enriched): string => e.row.agentSub || e.row.agentName;

/* ══════════════════════════════════ standing ══════════════════════════════════ */

export type StandingKey = "waiting" | "reading" | "offer" | "ended";
export const STANDING_ORDER: readonly StandingKey[] = ["waiting", "reading", "offer", "ended"];
export const STANDING_LABEL: Record<StandingKey, string> = { waiting: "Still waiting", reading: "Being read", offer: "Offer", ended: "Ended" };
/** ⚠️ THE LOCKED STATUS FILLS — `:root` tokens; never overridden, never anthracite or rust. */
export const STANDING_FILL: Record<StandingKey, string> = {
  waiting: STATE_FILL.queried,
  reading: STATE_FILL.sent,
  offer: STATE_FILL.offer,
  ended: STATE_FILL.closed,
};
export function standingOf(b: StateBucket): StandingKey {
  switch (b) {
    case "queried": return "waiting";
    case "requested":
    case "sent": return "reading";
    case "offer": return "offer";
    case "closed": return "ended";
    default: {
      const unhandled: never = b;
      return unhandled;
    }
  }
}
export interface StandingRow { key: StandingKey; label: string; count: number; ids: string[] }
/** All four, in order, zeros included: the caller decides what to hide. */
export function standing(items: Enriched[]): StandingRow[] {
  return STANDING_ORDER.map((key) => {
    const ids = items.filter((e) => standingOf(e.bucket) === key).map((e) => e.row.id);
    return { key, label: STANDING_LABEL[key], count: ids.length, ids };
  });
}

/* ══════════════════════════════════ replies against the stated window ══════════════════════════════════ */

export interface WindowReply {
  id: string;
  agency: string;
  /** "Asked for a partial", "Partial, then passed" … */
  what: string;
  /** the query's state today — the dot beside `what` */
  bucket: StateBucket;
  tookDays: number;
  saidWeeks: number;
  /** days past the stated window; 0 when inside */
  overDays: number;
  inside: boolean;
}
const WHAT: Partial<Record<QueryStatus, string>> = {
  [QueryStatus.PARTIAL_REQUESTED]: "Asked for a partial",
  [QueryStatus.FULL_REQUESTED]: "Asked for the full",
  [QueryStatus.REVISE_RESUBMIT]: "Asked for a revision",
  [QueryStatus.OFFER]: "Made an offer",
  [QueryStatus.REJECTED]: "Passed",
  [QueryStatus.NO_RESPONSE]: "Closed with no reply",
  [QueryStatus.WITHDRAWN]: "Withdrawn",
};
const ASK_WORD: Partial<Record<QueryStatus, string>> = {
  [QueryStatus.PARTIAL_REQUESTED]: "Partial",
  [QueryStatus.FULL_REQUESTED]: "Full",
  [QueryStatus.REVISE_RESUBMIT]: "Revision",
};
/** What the first reply was, and — where a request has since closed — how it ended. */
export function replyWhat(first: QueryStatus | null, now: QueryStatus): string {
  if (first === null) return STAGE_NAME[now];
  const ask = ASK_WORD[first];
  if (ask && (now === QueryStatus.REJECTED || now === QueryStatus.NO_RESPONSE || now === QueryStatus.WITHDRAWN)) {
    return `${ask}, then ${now === QueryStatus.REJECTED ? "passed" : now === QueryStatus.WITHDRAWN ? "withdrawn" : "closed"}`;
  }
  return WHAT[first] ?? STAGE_NAME[first];
}
export interface WindowReplies {
  /** quickest first */
  inside: WindowReply[];
  /** least over first */
  after: WindowReply[];
  /** replies from agencies that state no window: counted, never placed */
  unplaced: number;
  /** inside + after */
  dated: number;
}
export function windowReplies(items: Enriched[]): WindowReplies {
  const rows: WindowReply[] = [];
  let unplaced = 0;
  for (const e of items) {
    if (e.replyDays === null) continue;
    const w = e.row.windowWeeks;
    if (w === null || !(w > 0)) { unplaced++; continue; }
    const over = Math.max(0, e.replyDays - w * 7);
    rows.push({
      id: e.row.id,
      agency: agencyOf(e),
      what: replyWhat(e.replyStatus, e.row.status),
      bucket: e.bucket,
      tookDays: e.replyDays,
      saidWeeks: w,
      overDays: over,
      inside: over === 0,
    });
  }
  const inside = rows.filter((r) => r.inside).sort((a, b) => a.tookDays - b.tookDays || a.agency.localeCompare(b.agency));
  const after = rows.filter((r) => !r.inside).sort((a, b) => a.overDays - b.overDays || a.agency.localeCompare(b.agency));
  return { inside, after, unplaced, dated: rows.length };
}
/** "2 wks", "4 days", "1 wk" — weeks rounded, under a week in days. */
export function wksShort(d: number): string {
  if (d < 7) return `${d} ${d === 1 ? "day" : "days"}`;
  const w = Math.round(d / 7);
  return `${w} ${w === 1 ? "wk" : "wks"}`;
}
/** "two days", "seven weeks" — the lede's register. */
export function spanWords(d: number): string {
  if (d < 7) return `${say(d)} ${d === 1 ? "day" : "days"}`;
  const w = Math.round(d / 7);
  return `${say(w)} ${w === 1 ? "week" : "weeks"}`;
}
/** The section's lede, built from the figures it describes. */
export function windowLede(w: WindowReplies): { lead: string; bold: string | null; rest: string } {
  const lead = "Agents say in their guidelines how long they take to reply. ";
  if (w.dated === 0) {
    return { lead, bold: null, rest: w.unplaced > 0 ? `None of the agencies that have replied so far states a window, so there is nothing to set the replies against yet.` : "Once an agent replies, the reply is set against the time they say they take." };
  }
  const bold = `${w.inside.length === 0 ? "None" : w.inside.length} of the ${w.dated}`;
  let rest = ` who ${w.dated === 1 ? "has" : "have"} replied did it inside that time.`;
  if (w.after.length > 0) {
    const lo = w.after[0].overDays, hi = w.after[w.after.length - 1].overDays;
    const other = w.after.length === 1 ? "The other one" : `The other ${w.after.length}`;
    rest += lo === hi || spanWords(lo) === spanWords(hi)
      ? ` ${other} took longer, by ${spanWords(hi)}.`
      : ` ${other} took longer, by between ${spanWords(lo)} and ${spanWords(hi)}.`;
  }
  return { lead, bold, rest };
}
/** The header ring: placed replies inside their window. `pct` null with none placed. */
export function insideShare(w: WindowReplies): { inside: number; dated: number; pct: number | null; share: number } {
  if (w.dated === 0) return { inside: 0, dated: 0, pct: null, share: 0 };
  const share = w.inside.length / w.dated;
  return { inside: w.inside.length, dated: w.dated, pct: Math.round(share * 100), share };
}

/* ══════════════════════════════════ how long each step takes ══════════════════════════════════ */

export type StepKey = "q-a" | "a-s" | "s-f" | "f-o";
export interface StepGap {
  key: StepKey;
  /** whose turn the gap is */
  turn: "agent" | "you";
  days: number[];
  median: number | null;
  min: number | null;
  max: number | null;
  n: number;
  /** "queries" / "requests" */
  noun: [string, string];
}
const requestAt = (e: Enriched): number | null => minDate(e.dates.partialRequested, e.dates.fullRequested);
const STEPS: { key: StepKey; turn: "agent" | "you"; noun: [string, string]; gap: (e: Enriched) => number | null }[] = [
  { key: "q-a", turn: "agent", noun: ["query", "queries"], gap: (e) => gapDays(e.dates.sent, requestAt(e)) },
  {
    key: "a-s", turn: "you", noun: ["request", "requests"],
    gap: (e) => {
      const req = requestAt(e);
      if (req === null) return null;
      const after = [e.dates.partialSent, e.dates.fullSent].filter((t): t is number => t !== null && t >= req);
      return after.length ? gapDays(req, Math.min(...after)) : null;
    },
  },
  { key: "s-f", turn: "agent", noun: ["query", "queries"], gap: (e) => gapDays(e.dates.partialSent, e.dates.fullRequested) },
  { key: "f-o", turn: "agent", noun: ["query", "queries"], gap: (e) => gapDays(e.dates.fullRequested, e.dates.offer) },
];
export function stepGaps(items: Enriched[]): StepGap[] {
  return STEPS.map((s) => {
    const days = items.map(s.gap).filter((g): g is number => g !== null);
    return {
      key: s.key, turn: s.turn, noun: s.noun, days, n: days.length,
      median: median(days), min: days.length ? Math.min(...days) : null, max: days.length ? Math.max(...days) : null,
    };
  });
}
/** Below this a gap's line is dashed: it rests on too few to read as usual. */
export const STEP_THIN = 3;

/* ══════════════════════════════════ how long until a query ended ══════════════════════════════════ */

export interface Ending { n: number; median: number | null; min: number | null; max: number | null }
export interface Endings { pass: Ending; silent: Ending; offer: Ending & { agency: string | null } }
const weeksOf = (days: number[]): Ending => {
  const w = days.map((d) => Math.round(d / 7));
  const m = median(days);
  return { n: days.length, median: m === null ? null : Math.round(m / 7), min: w.length ? Math.min(...w) : null, max: w.length ? Math.max(...w) : null };
};
export function endings(items: Enriched[]): Endings {
  const at = (pick: (e: Enriched) => boolean, when: (e: Enriched) => number | null) =>
    items.filter(pick).map((e) => ({ e, d: gapDays(e.row.sentMs, when(e)) })).filter((x): x is { e: Enriched; d: number } => x.d !== null);
  const pass = at((e) => e.row.status === QueryStatus.REJECTED, (e) => e.dates.closed);
  const silent = at((e) => e.row.status === QueryStatus.NO_RESPONSE, (e) => e.dates.closed);
  const offer = at((e) => e.row.reachedOffer, (e) => e.dates.offer);
  return {
    pass: weeksOf(pass.map((x) => x.d)),
    silent: weeksOf(silent.map((x) => x.d)),
    offer: { ...weeksOf(offer.map((x) => x.d)), agency: offer.length === 1 ? agencyOf(offer[0].e) : null },
  };
}

/* ══════════════════════════════════ the desk ══════════════════════════════════ */

export interface DeskRow { n: number; text: string; tone: "b" | "r" | null; /** the chip's word at zero, where "None" would not read */ zero?: string }
export interface DeskCard {
  key: "sent" | "rate" | "wait";
  title: string;
  /** the section the card scrolls to */
  sec: number;
  colour: string;
  stamp: string | null;
  figure: string;
  unit: string | null;
  /** what the figure rests on, when it is a statistic */
  population: number | null;
  rows: DeskRow[];
  chart: { kind: "bars"; values: number[] } | { kind: "line"; values: number[] };
  axis: string[];
}
const monthLabel = (ms: number, nowMs: number): string => {
  const d = new Date(ms), n = new Date(nowMs);
  const m = MONTHS_SHORT[d.getMonth()];
  return nowMs - ms > 330 * DAY_MS && d.getFullYear() !== n.getFullYear() ? `${m} ${d.getFullYear()}` : m;
};
const sameMonth = (t: number | null, nowMs: number): boolean => {
  if (t === null || t > nowMs) return false;
  const a = new Date(t), b = new Date(nowMs);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
};
const plusMonth = (n: number): string | null => (n > 0 ? `+${n} this month` : null);

export function desk(model: AnalyticsModel, w: WindowReplies, nowMs: number): DeskCard[] {
  const items = model.items;
  const v = model.v17;
  const A0 = nowMs - 90 * DAY_MS, B0 = nowMs - 180 * DAY_MS;
  const since = model.sinceMs;
  const sentIn = (lo: number, hi: number) => items.filter((e) => e.row.sentMs !== null && e.row.sentMs > lo && e.row.sentMs <= hi).length;

  /* 13 weekly bars, the week holding today last */
  const thisMon = mondayOf(nowMs);
  const monOf = (i: number) => { const d = new Date(thisMon); d.setDate(d.getDate() - 7 * (12 - i)); return d.getTime(); };
  const weekly = Array.from({ length: 13 }, (_, i) => {
    const a = monOf(i), b = i === 12 ? Infinity : monOf(i + 1);
    return items.filter((e) => e.row.sentMs !== null && e.row.sentMs >= a && e.row.sentMs < b).length;
  });

  const sentCard: DeskCard = {
    key: "sent", title: "Queries sent", sec: 1, colour: "#2a3a52",
    stamp: plusMonth(items.filter((e) => sameMonth(e.row.sentMs, nowMs)).length),
    figure: num(model.sent, "None yet"),
    unit: since === null ? null : `since ${monthLabel(since, nowMs)}`,
    population: null,
    rows: [
      { n: sentIn(A0, nowMs), text: "in the last 90 days", tone: "b" },
      { n: model.stillOut, text: "still waiting", tone: null },
    ],
    chart: { kind: "bars", values: weekly },
    axis: [MONTHS_SHORT[new Date(monOf(0)).getMonth()], "Queries per week", "Now"],
  };

  const pct = model.sent >= MIN_SAMPLE && model.requests > 0;
  const rateCard: DeskCard = {
    key: "rate", title: "Request rate", sec: 2, colour: "#2f5f86",
    stamp: plusMonth(items.filter((e) => sameMonth(requestAt(e), nowMs)).length),
    figure: model.sent === 0 ? "No queries" : pct ? safePct(model.requests, model.sent) : `${num(model.requests)} of ${model.sent}`,
    unit: model.sent === 0 ? null : pct ? `${model.requests} of ${model.sent}` : "asked for more",
    population: model.sent > 0 ? model.sent : null,
    rows: [
      { n: model.fulls, text: "went on to the full", tone: "b" },
      { n: model.offers, text: `${model.offers === 1 ? "offer" : "offers"} so far`, tone: null, zero: "No" },
    ],
    chart: { kind: "line", values: v.glance.find((g) => g.key === "rate")?.spark.values ?? [] },
    axis: since === null ? [] : [monthLabel(since, nowMs), "Now"],
  };

  const replyAt = (e: Enriched) => (e.replyDays === null || e.row.sentMs === null ? null : e.row.sentMs + e.replyDays * DAY_MS);
  const waitsIn = (lo: number, hi: number) => items.filter((e) => { const r = replyAt(e); return r !== null && r > lo && r <= hi; }).map((e) => e.replyDays as number);
  const mA = median(waitsIn(A0, nowMs)), mB = median(waitsIn(B0, A0));
  const diff = mA === null || mB === null ? 0 : Math.round(mB - mA);
  const all = model.medianWaitDays;
  const waitCard: DeskCard = {
    key: "wait", title: "Median wait", sec: 3, colour: "#a0633f",
    stamp: diff === 0 ? null : `${Math.abs(diff)} ${Math.abs(diff) === 1 ? "day" : "days"} ${diff > 0 ? "quicker" : "slower"}`,
    figure: all === null ? "No replies" : String(all),
    /* the thin-sample rule: under five, the figure names what it rests on */
    unit: all === null ? null : `${all === 1 ? "day" : "days"}${model.replies < THIN_SAMPLE ? `, from ${plural(model.replies, "reply", "replies")}` : ""}`,
    population: all === null ? null : model.replies,
    rows: [
      { n: w.inside.length, text: "inside their window", tone: "r" },
      { n: w.after.length, text: "came after it", tone: null },
    ],
    chart: { kind: "line", values: v.glance.find((g) => g.key === "wait")?.spark.values ?? [] },
    axis: since === null ? [] : [monthLabel(since, nowMs), "Now"],
  };
  return [sentCard, rateCard, waitCard];
}
/** A count in a desk chip: digits, zero in words. */
export const chipN = (n: number): string => num(n);

/* ══════════════════════════════════ firsts and records ══════════════════════════════════ */

export interface FeaturedStage { status: QueryStatus; label: string; atMs: number }
export interface Featured {
  /** "First offer" / "First full request" / "First request" */
  label: string;
  atMs: number;
  id: string;
  initials: string;
  name: string;
  /** "LONDON · REPLIES IN ~8 WKS" — what the agent record states, nothing more */
  meta: string;
  status: QueryStatus;
  statusLabel: string;
  stages: FeaturedStage[];
  open: boolean;
}
export interface RecordRow { key: "quickest" | "first-request" | "busiest" | "run" | "quickest-pass"; label: string; detail: string; value: string }
export interface Records { featured: Featured | null; rows: RecordRow[]; lede: { lead: string; bold: string[]; rest: string[] } }

const durShort = (d: number): string => (d < 14 ? `${d} ${d === 1 ? "day" : "days"}` : `${Math.round(d / 7)} weeks`);

export function records(model: AnalyticsModel, agents: Agent[], nowMs: number): Records {
  const items = model.items;
  const byAgent = new Map(agents.map((a) => [a.id, a]));
  const dated = (xs: { e: Enriched; t: number | null }[]) => xs.filter((x): x is { e: Enriched; t: number } => x.t !== null).sort((a, b) => a.t - b.t || (a.e.row.sentMs ?? 0) - (b.e.row.sentMs ?? 0));
  const firstOffer = dated(items.map((e) => ({ e, t: e.dates.offer })))[0] ?? null;
  const firstFull = dated(items.map((e) => ({ e, t: e.dates.fullRequested })))[0] ?? null;
  const firstReq = dated(items.map((e) => ({ e, t: requestAt(e) })))[0] ?? null;
  const pick = firstOffer ? { x: firstOffer, label: "First offer" } : firstFull ? { x: firstFull, label: "First full request" } : firstReq ? { x: firstReq, label: "First request" } : null;

  let featured: Featured | null = null;
  if (pick) {
    const e = pick.x.e;
    const a = byAgent.get(e.row.agentId);
    const where = a?.city?.trim() || countryName(a?.country) || "";
    const wks = a && (a.responseTimeWeeks ?? 0) > 0 ? `REPLIES IN ~${a.responseTimeWeeks} ${a.responseTimeWeeks === 1 ? "WK" : "WKS"}` : "";
    const stages: FeaturedStage[] = ([
      [QueryStatus.QUERIED, e.dates.sent],
      [QueryStatus.PARTIAL_REQUESTED, e.dates.partialRequested],
      [QueryStatus.PARTIAL_SENT, e.dates.partialSent],
      [QueryStatus.FULL_REQUESTED, e.dates.fullRequested],
      [QueryStatus.FULL_SENT, e.dates.fullSent],
      [QueryStatus.OFFER, e.dates.offer],
      [e.row.status, e.bucket === "closed" ? e.dates.closed : null],
    ] as [QueryStatus, number | null][])
      .filter((s): s is [QueryStatus, number] => s[1] !== null)
      .map(([status, atMs]) => ({ status, label: STAGE_NAME[status], atMs }))
      .sort((p, q) => p.atMs - q.atMs);
    featured = {
      label: pick.label,
      atMs: pick.x.t,
      id: e.row.id,
      initials: a ? agentInitials(a) : (e.row.agentName.trim()[0] ?? "–").toUpperCase(),
      name: agencyOf(e),
      meta: [where.toUpperCase(), wks].filter(Boolean).join(" · "),
      status: e.row.status,
      statusLabel: STAGE_NAME[e.row.status],
      stages,
      open: e.bucket !== "closed",
    };
  }

  const v = model.v17.records;
  const rows: RecordRow[] = [];
  const quick = v.find((r) => r.key === "quickest");
  if (quick && !quick.empty) rows.push({ key: "quickest", label: "Quickest reply", detail: quick.aside ? `${quick.who} · ${quick.aside}` : quick.who, value: quick.value });
  const fr = v.find((r) => r.key === "first-request");
  if (fr && !fr.empty) rows.push({ key: "first-request", label: "First request", detail: fr.who, value: fr.value });
  const busy = v.find((r) => r.key === "busiest");
  if (busy && !busy.empty) rows.push({ key: "busiest", label: "Busiest week", detail: busy.who, value: busy.value });
  const run = v.find((r) => r.key === "run");
  if (run && !run.empty) rows.push({ key: "run", label: "Longest run", detail: run.who.replace(/^a query sent every week/, "a query every week"), value: run.value });
  /* the quickest pass: the shortest send-to-pass; ties to the earlier query */
  const passes = items.filter((e) => e.row.status === QueryStatus.REJECTED)
    .map((e) => ({ e, d: gapDays(e.row.sentMs, e.dates.closed) }))
    .filter((x): x is { e: Enriched; d: number } => x.d !== null)
    .sort((a, b) => a.d - b.d || (a.e.row.sentMs ?? 0) - (b.e.row.sentMs ?? 0));
  if (passes.length) {
    const p = passes[0];
    const earliest = items.filter((e) => e.row.sentMs !== null).sort((a, b) => (a.row.sentMs as number) - (b.row.sentMs as number))[0];
    rows.push({ key: "quickest-pass", label: "Quickest pass", detail: `${agencyOf(p.e)}${earliest && earliest.row.id === p.e.row.id ? ", the first query you sent" : ""}`, value: durShort(p.d) });
  }

  const lede = firstOffer && model.sinceMs !== null
    ? {
      lead: "The quickest, longest and busiest moments of the campaign so far. ",
      bold: [agencyOf(firstOffer.e), plural(Math.max(0, Math.round((firstOffer.t - model.sinceMs) / DAY_MS)), "day", "days")],
      rest: [" made the first offer, ", " after your first query."],
    }
    : { lead: "The quickest, longest and busiest moments of the campaign so far. They update as replies come in.", bold: [], rest: [] };
  void nowMs;
  return { featured, rows, lede };
}

/* ══════════════════════════════════ how things stand ══════════════════════════════════ */

/** The latest dated thing that happened to each query: what "Sort: latest activity" orders by. */
export function latestActivity(items: Enriched[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of items) {
    const ts = [e.dates.sent, e.dates.partialRequested, e.dates.partialSent, e.dates.fullRequested, e.dates.fullSent, e.dates.offer, e.dates.closed]
      .filter((t): t is number => t !== null);
    if (ts.length) out[e.row.id] = Math.max(...ts);
  }
  return out;
}
/** "Your move": a request owed, or an offer to answer — the same court the Query Centre calls yours. */
export const yourMove = (items: Enriched[]): number =>
  items.filter((e) => e.bucket === "requested" || e.row.status === QueryStatus.OFFER).length;

/* ══════════════════════════════════ everything the page reads ══════════════════════════════════ */

export interface V21 {
  standing: StandingRow[];
  window: WindowReplies;
  inside: ReturnType<typeof insideShare>;
  steps: StepGap[];
  endings: Endings;
  desk: DeskCard[];
  records: Records;
  activity: Record<string, number>;
  yourMove: number;
}
export function buildV21(model: AnalyticsModel, agents: Agent[], nowMs: number): V21 {
  const w = windowReplies(model.items);
  return {
    standing: standing(model.items),
    window: w,
    inside: insideShare(w),
    steps: stepGaps(model.items),
    endings: endings(model.items),
    desk: desk(model, w, nowMs),
    records: records(model, agents, nowMs),
    activity: latestActivity(model.items),
    yourMove: yourMove(model.items),
  };
}

/* re-exports the page uses for words */
export { THIN_SAMPLE, dayMonth, weekRange, dayRange };
