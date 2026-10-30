/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD FEED v1 — THE FEED'S MODEL (Part D; ref design-refs/dashboard-feed-v1/, the middle column).
 *
 * The entries are `feedEntries`' own (one resolver for every surface that narrates an event), worded by
 * `drawerEvents`. This file only arranges them for the page: day headings, which entries are BIG cards (requests,
 * offers, and your materials going out) and which are one-line MINI rows, each big card's figures and journey, and
 * the seven-day window.
 *
 * ⚠️ EVERY FIGURE HAS A SOURCE OR IS DROPPED — never invented, never a dash:
 *   request  · "Days to reply"   the request's own stage start less the stage before it (`stageHistory`)
 *            · "Send by"         `Query.expectedSendDate`
 *   offer    · "Weeks querying"  the offer's stage start less `dateSent`
 *            · "Reply by"        `Query.offerResponseDeadline`
 *   full out · "Words"           the manuscript's `wordCount`
 *            · "Days since query" the send's stage start less `dateSent`
 *   partial out · "Days since query", and "Days to send" (the send less its request, when the request is dated)
 * ⚠️ THE JOURNEY IS THE QUERY'S DATED STAGES (`QcRow.history`, the document first), and a step still to come is drawn
 * only while the query still stands at the request (`FeedEntry.need`).
 */
import { ActivityType, QueryStatus, type Agent, type Manuscript, type Query } from "../types";
import type { FeedEntry, FeedSeg } from "./dashFeed";
import type { DrawerEvent, FeedFilter } from "./dashFeedDrawer";
import { anyToMs } from "./qcStages";
import { dayMonth } from "./dates";
import type { QcRow } from "./qcSummary";
import { readSummary } from "./queryActions/packages";
import { sentRecordOf } from "./queryActions/sentRecord";

const DAY = 86_400_000;
const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const midnight = (ms: number) => { const d = new Date(ms); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
/** midnight yesterday — by calendar, so it holds on the days the clocks change */
const isYesterday = (key: number, today: number) => { const t = new Date(today); return key === new Date(t.getFullYear(), t.getMonth(), t.getDate() - 1).getTime(); };
const clock = (ms: number) => new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });

/** The feed shows seven days at a time: today and the six before it. */
export const F1_WINDOW_DAYS = 7;
/** The start of `windows` seven-day windows: midnight six days ago for one, thirteen for two, …
 *  ⚠️ COUNTED IN CALENDAR DAYS, NEVER `n × 86 400 000`: across the clocks changing, a day is 23 or 25 hours, and the
 *  millisecond form put the window's edge an hour off midnight (caught on 25 October by DF1-D). */
export const f1From = (now: Date, windows = 1): number =>
  new Date(now.getFullYear(), now.getMonth(), now.getDate() - (windows * F1_WINDOW_DAYS - 1)).getTime();

export const F1_END = (days: number) => `That's the last ${days} days.`;
export const F1_EARLIER = "Show earlier";
export const F1_NOTHING = "Nothing new this week.";

export type F1Kind = "request" | "offer" | "sent";
export interface F1Fig { label: string; value: string }
export interface F1Stop { status: QueryStatus; label: string; date: string; next?: boolean }
export interface F1Mat { name: string; version: string }

export interface F1Big {
  type: "big";
  id: string;
  kind: F1Kind;
  dir: "in" | "out";
  queryId: string;
  status: QueryStatus;
  /** the disc: the agent's initials, or the writer's */
  initials: string;
  /** "Nadia Hussain", or "You sent a full manuscript" */
  name: string;
  /** "Today at 11:40 · Hussain Literary", or "28 Oct at 11:20 · to Rae Abbott, Abbott Books" */
  meta: string;
  headline: string;
  figs: F1Fig[];
  stops: F1Stop[];
  /** the package the query went with, if it went with one */
  pkg: string | null;
  /** the materials that went, on a full request only */
  mats: F1Mat[] | null;
}

export interface F1Mini {
  type: "mini";
  id: string;
  dir: "in" | "out";
  status: QueryStatus | null;
  /** the nudge's bell, the writer's own housekeeping, the import — rows with no status of their own */
  glyph: "status" | "bell" | "house" | "import";
  say: readonly FeedSeg[];
  time: string;
  at: number;
}

export type F1Item = F1Big | F1Mini;
export interface F1Day { key: number; first: string; rest: string; items: F1Item[] }

/** "Today" / "Friday 30 October"; "Yesterday" / "Thursday 29 October"; "Wednesday" / "28 October" */
export function dayHeading(key: number, now: Date): { first: string; rest: string } {
  const today = midnight(now.getTime());
  const d = new Date(key);
  const full = `${WEEKDAY[d.getDay()]} ${d.getDate()} ${MONTH[d.getMonth()]}`;
  if (key === today) return { first: "Today", rest: full };
  if (isYesterday(key, today)) return { first: "Yesterday", rest: full };
  return { first: WEEKDAY[d.getDay()], rest: `${d.getDate()} ${MONTH[d.getMonth()]}` };
}

/** "Today at 11:40" / "Yesterday at 13:05" / "28 Oct at 11:20" */
export function whenLine(ms: number, now: Date): string {
  const today = midnight(now.getTime());
  const key = midnight(ms);
  const day = key === today ? "Today" : isYesterday(key, today) ? "Yesterday" : dayMonth(ms);
  return `${day} at ${clock(ms)}`;
}

/** A journey stop's date: "Today", a weekday within the week, else "9 Oct" */
export function stopDate(ms: number, now: Date): string {
  const today = midnight(now.getTime());
  const key = midnight(ms);
  if (key === today) return "Today";
  if (key < today && key > today - 7 * DAY) return WEEKDAY_SHORT[new Date(ms).getDay()];
  return dayMonth(ms);
}

/** The big cards: requests, offers, and the writer's partial or full going out. */
export function bigKind(e: Pick<FeedEntry, "status" | "dir" | "activityType" | "app" | "imported">): F1Kind | null {
  if (e.app || e.imported || !e.status) return null;
  const s = e.status;
  if (e.dir === "in" && (s === QueryStatus.PARTIAL_REQUESTED || s === QueryStatus.FULL_REQUESTED || s === QueryStatus.REVISE_RESUBMIT)) return "request";
  if (s === QueryStatus.OFFER || s === QueryStatus.SIGNED) return "offer";
  if (e.dir === "out" && (s === QueryStatus.FULL_SENT || s === QueryStatus.PARTIAL_SENT)) return "sent";
  return null;
}

const STOP_LABEL: Partial<Record<QueryStatus, string>> = {
  [QueryStatus.QUERIED]: "Queried",
  [QueryStatus.PARTIAL_REQUESTED]: "Partial asked",
  [QueryStatus.PARTIAL_SENT]: "Partial",
  [QueryStatus.FULL_REQUESTED]: "Full asked",
  [QueryStatus.FULL_SENT]: "Full sent",
  [QueryStatus.REVISE_RESUBMIT]: "R&R asked",
  [QueryStatus.RESUBMITTED]: "Resubmitted",
  [QueryStatus.OFFER]: "Offer",
  [QueryStatus.SIGNED]: "Signed",
};
const NEXT_STOP: Partial<Record<QueryStatus, { status: QueryStatus; label: string }>> = {
  [QueryStatus.PARTIAL_REQUESTED]: { status: QueryStatus.PARTIAL_SENT, label: "Send partial" },
  [QueryStatus.FULL_REQUESTED]: { status: QueryStatus.FULL_SENT, label: "Send full" },
  [QueryStatus.REVISE_RESUBMIT]: { status: QueryStatus.RESUBMITTED, label: "Resubmit" },
};
/** at most this many stops, the most recent kept */
export const MAX_STOPS = 5;

/** The query's dated stages as stops; a partial asked for and sent reads as one "Partial" stop (the send's). */
export function journeyStops(row: QcRow | undefined, q: Query, need: boolean, now: Date): F1Stop[] {
  const spans = row?.history.spans ?? [];
  const has = (s: QueryStatus) => spans.some((x) => x.status === s);
  const stops: F1Stop[] = [];
  for (const sp of spans) {
    if (sp.status === QueryStatus.PARTIAL_REQUESTED && has(QueryStatus.PARTIAL_SENT)) continue;
    const label = STOP_LABEL[sp.status];
    if (!label) continue;
    stops.push({ status: sp.status, label, date: stopDate(sp.startMs, now) });
  }
  const next = need ? NEXT_STOP[q.status as QueryStatus] : undefined;
  const kept = stops.slice(-(next ? MAX_STOPS - 1 : MAX_STOPS));
  if (next) {
    const by = anyToMs(q.expectedSendDate);
    kept.push({ status: next.status, label: next.label, date: by != null ? `by ${dayMonth(by)}` : "", next: true });
  }
  return kept;
}

const firstName = (a: Agent | undefined, fallback: string) => ((a?.name ?? "").trim().split(/\s+/)[0] || fallback);
const initialsOf = (s: string) => s.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
const days = (a: number, b: number) => Math.max(0, Math.round((b - a) / DAY));

export interface F1Ctx {
  queries: readonly Query[];
  agents: readonly Agent[];
  manuscripts: readonly Manuscript[];
  qcRows: readonly QcRow[];
  /** the writer's name, for their own disc */
  userName: string;
  now: Date;
}

export function bigCard(ev: DrawerEvent, kind: F1Kind, ctx: F1Ctx): F1Big | null {
  const e = ev.entry;
  const q = e.queryId ? ctx.queries.find((x) => x.id === e.queryId) : undefined;
  if (!q || !e.status) return null;
  const agent = ctx.agents.find((a) => a.id === q.agentId);
  const row = ctx.qcRows.find((r) => r.id === q.id);
  const ms = ctx.manuscripts.find((m) => m.id === q.manuscriptId);
  const who = (agent?.name ?? "").trim() || e.who || "The agent";
  const first = firstName(agent, who);
  const agency = (agent?.agency ?? e.agency ?? "").trim();
  const title = (ms?.title ?? "").trim() || "your manuscript";
  const spans = row?.history.spans ?? [];
  const at = spans.findIndex((s) => s.status === e.status);
  const span = at >= 0 ? spans[at] : undefined;
  const prev = at > 0 ? spans[at - 1] : undefined;
  const sentMs = anyToMs(q.dateSent);
  const figs: F1Fig[] = [];
  let headline: string;
  if (kind === "request") {
    headline = e.status === QueryStatus.FULL_REQUESTED ? `${first} asked for the full manuscript`
      : e.status === QueryStatus.PARTIAL_REQUESTED ? `${first} asked for a partial`
        : `${first} asked you to revise and resubmit`;
    if (span && prev) figs.push({ label: "Days to reply", value: String(days(prev.startMs, span.startMs)) });
    const by = anyToMs(q.expectedSendDate);
    if (by != null) figs.push({ label: "Send by", value: dayMonth(by) });
  } else if (kind === "offer") {
    headline = e.status === QueryStatus.SIGNED ? `You signed with ${first}` : `${first} made an offer on ${title}`;
    const offerMs = span?.startMs ?? e.at;
    if (sentMs != null) figs.push({ label: "Weeks querying", value: String(Math.max(0, Math.round((offerMs - sentMs) / (7 * DAY)))) });
    const by = anyToMs(q.offerResponseDeadline);
    if (by != null) figs.push({ label: "Reply by", value: dayMonth(by) });
  } else {
    const full = e.status === QueryStatus.FULL_SENT;
    headline = full ? `The whole book is with ${first}` : `Your partial is with ${first}`;
    const sendMs = span?.startMs ?? e.at;
    if (full && typeof ms?.wordCount === "number" && ms.wordCount > 0) figs.push({ label: "Words", value: ms.wordCount.toLocaleString("en-GB") });
    if (sentMs != null) figs.push({ label: "Days since query", value: String(days(sentMs, sendMs)) });
    if (!full && prev && prev.status === QueryStatus.PARTIAL_REQUESTED) figs.push({ label: "Days to send", value: String(days(prev.startMs, sendMs)) });
  }
  const rec = sentRecordOf(q);
  const pkg = rec.how === "package" ? rec.packageName : null;
  let mats: F1Mat[] | null = null;
  if (kind === "request" && e.status === QueryStatus.FULL_REQUESTED) {
    const pieces = readSummary(rec.materials).pieces;
    const named = pieces.map((p) => ({ name: p.key === "sample" ? "Opening sample" : p.label, version: (p.value ?? "").trim() }));
    mats = named.length ? named.slice(0, 3) : null;
  }
  const out = e.dir === "out";
  const sentWord = e.status === QueryStatus.FULL_SENT ? "a full manuscript" : "a partial";
  return {
    type: "big", id: e.id, kind, dir: e.dir, queryId: q.id, status: e.status,
    initials: out ? initialsOf(ctx.userName || "You") : initialsOf(who),
    name: out && kind === "sent" ? `You sent ${sentWord}` : who,
    meta: out && kind === "sent"
      ? `${whenLine(e.at, ctx.now)} · to ${[who, agency].filter(Boolean).join(", ")}`
      : [whenLine(e.at, ctx.now), agency].filter(Boolean).join(" · "),
    headline, figs: figs.slice(0, 2), stops: journeyStops(row, q, !!e.need, ctx.now), pkg, mats,
  };
}

const miniOf = (ev: DrawerEvent): F1Mini => {
  const e = ev.entry;
  const glyph: F1Mini["glyph"] = e.imported ? "import" : e.app ? "house" : !e.status || e.activityType === ActivityType.NUDGE_SENT ? "bell" : "status";
  return { type: "mini", id: e.id, dir: e.dir, status: e.status, glyph, say: ev.say, time: e.time, at: e.at };
};

/** The writer's queries sent on one day, as one row: "You queried A, B and C." (one: "You queried A with Title.") */
function sentTogether(group: readonly DrawerEvent[]): F1Mini {
  const names = group.map((g) => g.entry.who).filter((w): w is string => !!w);
  const say: FeedSeg[] = [{ t: "You queried " }];
  names.forEach((n, i) => {
    if (i > 0) say.push({ t: i === names.length - 1 ? " and " : ", " });
    say.push({ t: n, who: true });
  });
  say.push({ t: "." });
  const last = group[0];
  return { ...miniOf(last), id: `sent-${group.map((g) => g.entry.id).join("+")}`, say };
}

const isQuerySend = (e: FeedEntry) => e.dir === "out" && e.status === QueryStatus.QUERIED && !e.app && !e.imported;

/**
 * The feed: the window's events, filtered (Agents = what agents did, You = what the writer did), under day headings.
 * Several queries sent on one day share one row.
 */
export function f1Days(events: readonly DrawerEvent[], filter: FeedFilter, ctx: F1Ctx): F1Day[] {
  const shown = events.filter((ev) => filter === "all" || ev.entry.dir === filter);
  /* the events arrive newest first; each day keeps that order */
  const groups: { key: number; evs: DrawerEvent[] }[] = [];
  for (const ev of shown) {
    const key = midnight(ev.entry.at);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.evs.push(ev); else groups.push({ key, evs: [ev] });
  }
  return groups.map(({ key, evs }) => {
    const sends = evs.filter((ev) => isQuerySend(ev.entry));
    const items: F1Item[] = [];
    let sentPlaced = false;
    for (const ev of evs) {
      if (isQuerySend(ev.entry) && sends.length > 1) {
        if (!sentPlaced) { items.push(sentTogether(sends)); sentPlaced = true; }
        continue;
      }
      const kind = bigKind(ev.entry);
      items.push((kind ? bigCard(ev, kind, ctx) : null) ?? miniOf(ev));
    }
    return { key, ...dayHeading(key, ctx.now), items };
  });
}
