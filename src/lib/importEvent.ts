/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE IMPORT'S ONE FEED EVENT (import review v1, Part D; ref design-refs/onboarding/import-review-v1/
 * feed-import.dc.html).
 *
 * An import writes exactly one activity of its own: `eventKey: "imported"`, tied to the manuscript the
 * rows went into, dated the moment of the import, carrying what it wrote — agents added, queries
 * imported, and those queries in the Query Centre's three groups. Smart import, the template import
 * and the column matcher all write it, each with its own route.
 *
 * ⚠️ THE THREE GROUPS ARE THE QUERY CENTRE'S OWN: `tileCourt`, the function the desk's `deskSections`
 * counts with (via `rowsForTile`). Withdrawn and Signed are in no group, so they are left out of the
 * group line while the sentence's query total still counts them. A count derived here any other way
 * would be free to disagree with the desk the writer opens next.
 *
 * ⚠️ IT REPLACES THE OLD SUMMARY LINE, WHICH NOTHING EVER RENDERED: a `Status Changed` with no status,
 * no query and no manuscript has no pill and no subject, so the feed dropped it twice over.
 */
import { doc, setDoc, type Firestore } from "firebase/firestore";
import { ActivityType, type Activity, type QueryStatus } from "../types";
import { tileCourt } from "./qcSummary";
import type { FeedSeg } from "./dashFeed";

export type ImportRoute = "smart" | "template" | "matcher";

/** The route's name, as the row's foot says it (uppercased by the row's CSS). */
export const IMPORT_ROUTE_LABEL: Record<ImportRoute, string> = {
  smart: "Smart import",
  template: "Template import",
  matcher: "Column matcher",
};

export interface ImportCounts {
  agents: number;
  queries: number;
  withAgents: number;
  withYou: number;
  closed: number;
}

/** The counts, from what the import wrote: the agents it created and each query's status. */
export function importCounts(agentsAdded: number, statuses: readonly QueryStatus[]): ImportCounts {
  let withAgents = 0, withYou = 0, closed = 0;
  for (const s of statuses) {
    const t = tileCourt(s);
    if (t === "agent") withAgents++;
    else if (t === "you") withYou++;
    else if (t === "closed") closed++;
  }
  return { agents: agentsAdded, queries: statuses.length, withAgents, withYou, closed };
}

const n = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;

/**
 * "You imported your list: 8 agents and 8 queries for Import Test Book." A part with zero is left
 * out: "You imported 6 queries for Import Test Book." Singulars agree: "1 agent", "1 query".
 * The counts are bold, the manuscript in the typewriter face (`em`).
 */
export function importSentence(c: Pick<ImportCounts, "agents" | "queries">, manuscript: string): FeedSeg[] {
  const parts: FeedSeg[] = [];
  if (c.agents > 0) parts.push({ t: n(c.agents, "agent", "agents"), who: true });
  if (c.queries > 0) parts.push({ t: n(c.queries, "query", "queries"), who: true });
  const lead = parts.length === 2 ? "You imported your list: " : "You imported ";
  const body = parts.length === 2 ? [parts[0], { t: " and " }, parts[1]] : parts;
  return [{ t: lead }, ...body, ...(manuscript ? [{ t: " for " }, { t: manuscript, em: true }] : []), { t: "." }];
}

/** The mono group line, in the design's order; a group at zero is left out. Words are the desk's. */
export function importGroupLine(c: Pick<ImportCounts, "withAgents" | "withYou" | "closed">): string[] {
  return [
    c.withAgents > 0 ? `${c.withAgents} with agents` : null,
    c.withYou > 0 ? `${c.withYou} with you` : null,
    c.closed > 0 ? `${c.closed} closed` : null,
  ].filter((x): x is string => x !== null);
}

/** The row's link. */
export const IMPORT_SEE = "See them in your Query Centre →";
/** Added to the feed's end line only when the window holds an import. */
export const IMPORT_END_LINE = "Your imported queries keep their own dates, so they show on their timelines in the Query Centre.";

/** The fields an import event carries beyond an ordinary activity. */
export interface ImportEventFields {
  eventKey: "imported";
  importCounts: ImportCounts;
  importRoute: ImportRoute;
}
export type ImportActivity = Activity & ImportEventFields;

export const isImportActivity = (a: Activity): a is ImportActivity =>
  a.eventKey === "imported" && typeof (a as Partial<ImportEventFields>).importCounts === "object";

/**
 * The event's document. An existing activity type (`Status Changed`, as the old summary line used)
 * with the new `eventKey` — no rules change: `eventKey` is any string up to 64 characters, and the
 * create rule does not restrict the document's keys. The event is never updated after it is written.
 * `resultingStatus` is deliberately absent: it is not a status and must never feed a derivation.
 */
export function importEventDoc(p: {
  id: string; userId: string; manuscriptId: string; manuscriptTitle: string; dateIso: string;
  route: ImportRoute; counts: ImportCounts;
}): ImportActivity {
  return {
    id: p.id,
    userId: p.userId,
    queryId: "",
    manuscriptId: p.manuscriptId,
    activityType: ActivityType.STATUS_CHANGED,
    description: importSentence(p.counts, p.manuscriptTitle).map((s) => s.t).join(""),
    date: p.dateIso,
    details: "",
    eventKey: "imported",
    importCounts: p.counts,
    importRoute: p.route,
  };
}

/** Writes the event, unless the import wrote nothing. Returns the id written, or null. */
export async function writeImportEvent(
  firestore: Firestore,
  p: { userId: string; manuscriptId: string; manuscriptTitle: string; dateMs: number; route: ImportRoute; counts: ImportCounts },
): Promise<string | null> {
  if (p.counts.agents === 0 && p.counts.queries === 0) return null;
  const id = "imp-ev-" + Math.random().toString(36).slice(2, 11);
  await setDoc(doc(firestore, "users", p.userId, "activities", id), importEventDoc({
    id, userId: p.userId, manuscriptId: p.manuscriptId, manuscriptTitle: p.manuscriptTitle,
    dateIso: new Date(p.dateMs).toISOString(), route: p.route, counts: p.counts,
  }));
  return id;
}

/**
 * The column matcher's events. A matcher run imports one kind of record: an AGENTS run adds agents and
 * no queries, so it writes one event tied to no manuscript (shown under every manuscript, as agent
 * events are). A QUERIES run names each row's manuscript, so it writes one event per manuscript its
 * rows went into — one, in the usual run — and rows that matched no manuscript share one event tied
 * to none. Agents added (none, in a queries run) ride on the first event, so nothing is counted twice.
 */
export function matcherImportEvents(
  agentsAdded: number,
  queries: readonly { manuscriptId: string; manuscriptTitle: string; status: QueryStatus }[],
): { manuscriptId: string; manuscriptTitle: string; counts: ImportCounts }[] {
  if (queries.length === 0) return agentsAdded > 0 ? [{ manuscriptId: "", manuscriptTitle: "", counts: importCounts(agentsAdded, []) }] : [];
  const groups = new Map<string, { title: string; statuses: QueryStatus[] }>();
  for (const q of queries) {
    const g = groups.get(q.manuscriptId) ?? { title: q.manuscriptId ? q.manuscriptTitle : "", statuses: [] };
    g.statuses.push(q.status);
    groups.set(q.manuscriptId, g);
  }
  return [...groups.entries()].map(([manuscriptId, g], i) => ({
    manuscriptId, manuscriptTitle: g.title, counts: importCounts(i === 0 ? agentsAdded : 0, g.statuses),
  }));
}
