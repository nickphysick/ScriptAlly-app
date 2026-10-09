/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v58 — the activity feed drawer's model.
 *
 * The entries are `feedEntries`' own (one resolver for every surface that narrates an event). This
 * file only arranges them for the drawer: full-date day headings, the three summary figures, the
 * agent / you filter, and the step back to an earlier month.
 */
import { ActivityType, QueryStatus } from "../types";
import { FEED_DAYS, type FeedEntry, type FeedSeg } from "./dashFeed";
import { STAGE_NAME, type QcRow } from "./qcSummary";
import { MONTHS_SHORT } from "./dates";

export type FeedFilter = "all" | "in" | "out";

export const FEED_FILTERS: readonly { key: FeedFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "in", label: "From agents" },
  { key: "out", label: "By you" },
];

const DAY = 86_400_000;
const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const shortDate = (ms: number): string => { const d = new Date(ms); return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`; };
const midnight = (ms: number) => { const d = new Date(ms); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };

export interface DrawerEvent {
  entry: FeedEntry;
  /** the sentence. The writer's own housekeeping is worded here, with the name set apart. */
  say: readonly FeedSeg[];
  /** the mono tag on a reply card: "PARTIAL REQUESTED", "PASSED ON QUERY" */
  tag: string;
  /** agency, and the query's earlier fact where there is one */
  meta: string;
}

export interface DrawerDay { key: number; heading: string; count: string; events: DrawerEvent[] }

/** A pass names how far the query got — the closed card's own three words. */
const passTag = (row: QcRow | undefined): string =>
  `Passed on ${row?.furthest === "full" ? "full" : row?.furthest === "partial" ? "partial" : "query"}`;

/** The stage the query stood at before this event, "Partial sent 5 Sep" — or when it was queried. */
function earlierFact(e: FeedEntry, row: QcRow | undefined): string {
  if (!row) return "";
  const spans = row.history.spans;
  const at = spans.findIndex((s) => s.status === e.status);
  const prev = at > 0 ? spans[at - 1] : null;
  if (prev) return `${STAGE_NAME[prev.status]} ${shortDate(prev.startMs)}`;
  if (e.status !== QueryStatus.QUERIED && row.sentMs != null) return `Queried ${shortDate(row.sentMs)}`;
  return "";
}

/**
 * What the writer did to their files, said the way the rest of the feed speaks ("You added …").
 * The log's own description is "Added X at Y", which names nobody as its subject.
 */
const HOUSE_SAY: Record<string, (who: FeedSeg) => FeedSeg[]> = {
  [ActivityType.AGENT_ADDED]: (w) => [{ t: "You added " }, w, { t: " to your contact list" }],
  [ActivityType.AGENT_UPDATED]: (w) => [{ t: "You updated " }, w, { t: "'s details" }],
  [ActivityType.AGENT_DELETED]: (w) => [{ t: "You removed " }, w, { t: " from your contact list" }],
  [ActivityType.MANUSCRIPT_ADDED]: (w) => [{ t: "You added " }, w, { t: " to your manuscripts" }],
  [ActivityType.MANUSCRIPT_UPDATED]: (w) => [{ t: "You updated the details of " }, w],
  [ActivityType.MANUSCRIPT_DELETED]: (w) => [{ t: "You removed " }, w, { t: " from your manuscripts" }],
};
const isManuscript = (t: string) => t.startsWith("Manuscript");

export function drawerEvents(entries: readonly FeedEntry[], qcRows: readonly QcRow[], filter: FeedFilter = "all"): DrawerEvent[] {
  const byId = new Map(qcRows.map((r) => [r.id, r]));
  return entries
    .filter((e) => filter === "all" || e.dir === filter)
    .map((e) => {
      const row = e.queryId ? byId.get(e.queryId) : undefined;
      const tag = e.status === QueryStatus.REJECTED ? passTag(row) : e.pill;
      const fact = e.dir === "in" ? earlierFact(e, row) : (e.requery?.text ?? "");
      const house = e.app ? HOUSE_SAY[e.activityType] : undefined;
      const say = house && e.who ? house(isManuscript(e.activityType) ? { t: e.who, em: true } : { t: e.who, who: true }) : e.say;
      /* a housekeeping event's line under it is the agency alone */
      const agency = e.app ? e.agency.split(" · ")[0] : e.agency;
      return { entry: e, say, tag, meta: [e.app && isManuscript(e.activityType) ? "" : agency, fact].filter(Boolean).join(" · ") };
    });
}

export function drawerDays(events: readonly DrawerEvent[], now: Date): DrawerDay[] {
  const today = midnight(now.getTime());
  const days: DrawerDay[] = [];
  for (const ev of events) {
    const key = midnight(ev.entry.at);
    let day = days[days.length - 1];
    if (!day || day.key !== key) {
      const d = new Date(key);
      const full = `${WEEKDAY[d.getDay()]} ${d.getDate()} ${MONTH[d.getMonth()]}`;
      day = { key, heading: key === today ? `Today · ${full}` : full, count: "", events: [] };
      days.push(day);
    }
    day.events.push(ev);
  }
  for (const d of days) d.count = `${d.events.length} ${d.events.length === 1 ? "update" : "updates"}`;
  return days;
}

export interface DrawerSummary { replies: number; did: number; need: number }

/** The three figures, over the whole window — the filter never changes them. */
export const drawerSummary = (entries: readonly FeedEntry[]): DrawerSummary => ({
  replies: entries.filter((e) => e.dir === "in").length,
  did: entries.filter((e) => e.dir === "out").length,
  need: entries.filter((e) => e.need !== null).length,
});

export const SUMMARY_NOUN = {
  replies: (n: number) => (n === 1 ? "reply from an agent" : "replies from agents"),
  did: (n: number) => (n === 1 ? "thing you did" : "things you did"),
  need: (n: number) => (n === 1 ? "still needs you" : "still need you"),
};

/** How many of the feed's entries happened today — the floating tab's rust pill. */
export const todayCount = (entries: readonly FeedEntry[], now: Date): number => {
  const today = midnight(now.getTime());
  return entries.filter((e) => midnight(e.at) === today).length;
};

/** Where the default window starts. */
export const defaultFrom = (now: Date): number => now.getTime() - FEED_DAYS * DAY;

/**
 * The step back: the calendar month that holds the day before the window starts, from its first
 * day. From 9 September that is "September", and the window then starts on 1 September.
 */
export function earlierWindow(from: number): { label: string; from: number } {
  const d = new Date(from - 1);
  const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  return { label: MONTH[d.getMonth()], from: start };
}

/** The line that closes the list. */
export const windowEndLine = (from: number, now: Date): string =>
  from >= defaultFrom(now) - 1000 ? `That's the last ${FEED_DAYS} days.` : `That's everything since ${shortDate(from)}.`;

export const rangeLabel = (from: number, now: Date): string =>
  from >= defaultFrom(now) - 1000 ? `Last ${FEED_DAYS} days` : `Since ${shortDate(from)}`;
