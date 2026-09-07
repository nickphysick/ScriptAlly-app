/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE AGENT BOARD — where an agent stands, and the seven ways to group them.
 *
 * ⚠️ WHERE THEY STAND IS DERIVED AT READ TIME AND NEVER STORED. The temptation is a cached field
 * on the agent — the board recomputes it for every card on every render, and memoising it onto the
 * document would be one line. It is forbidden for the same reason the two-systems axes are: an
 * agent's standing is a fact about their QUERIES, and `recomputeQuery` is the sole writer of those.
 * A cache here would be a second writer of a derived truth, stale from the first status change
 * that did not think to update it, and wrong in the direction nobody checks — a board that looks
 * right and describes last week.
 *
 * ⚠️ THE RULE IS FURTHEST-ALONG OPEN, ELSE MOST RECENTLY CLOSED, ELSE NOTHING. "Furthest along" is
 * `STATUS_ORDER`'s index — the canonical journey, not a second list — and it is taken over OPEN
 * queries only, because a rejection from March should not outrank a full request from last week.
 * When nothing is open the most recent CLOSE speaks, because that is the last thing that happened.
 *
 * ⚠️ AND THE CLOSED SET IS ONE COLUMN, NOT THREE. Rejected, Withdrawn and No Response are three
 * ways of being over; a board that split them would give three thin columns of the same fact and
 * push the live journey off the right-hand edge. It is the same aggregation the manuscript
 * journey draws for the same reason.
 */
import { Agent, Query, QueryStatus, SubmissionMethod } from "../types";
import { STATUS_ORDER } from "./statusOrder";
import { isTerminalStatus, queriesForAgent, isDoorOpen, methodShort } from "./agentList";
import { stateFor, STATE_ACCENT_TOKEN } from "./queryCardFacts";
import { getPrimaryAction } from "./queryPrimaryAction";
import { parseWhen } from "./dashboardStats";
import { countryName } from "./territory";

/** Where an agent stands. `kind: "none"` is a real answer — they have never been queried. */
export type AgentStanding =
  | { kind: "none" }
  | { kind: "open"; status: QueryStatus }
  | { kind: "closed"; status: QueryStatus };

/** The column an agent with no queries falls into. Stated once. */
export const NO_QUERIES = "No queries";
/** The one column every terminal status shares. */
export const CLOSED = "Closed";

/** Where this agent stands — derived, every time. See the header for why there is no cache. */
export function agentQueryStanding(agentId: string, queries: Query[]): AgentStanding {
  const mine = queriesForAgent(agentId, queries);
  if (!mine.length) return { kind: "none" };

  const open = mine.filter((q) => !isTerminalStatus(q.status));
  if (open.length) {
    /* furthest along the canonical journey — never a second ordering of the statuses */
    let best = open[0];
    let bestAt = STATUS_ORDER.indexOf(open[0].status as QueryStatus);
    for (const q of open.slice(1)) {
      const at = STATUS_ORDER.indexOf(q.status as QueryStatus);
      if (at > bestAt) { best = q; bestAt = at; }
    }
    return { kind: "open", status: best.status };
  }

  /* nothing live: the most recent close is the last thing that happened. The three derived audit
     fields are read in the same order, and through the same parser, as the dashboard's own. */
  const when = (q: Query) => parseWhen(q.lastStatusChange) ?? parseWhen(q.responseReceivedAt) ?? parseWhen(q.dateSent) ?? 0;
  let last = mine[0];
  for (const q of mine.slice(1)) if (when(q) > when(last)) last = q;
  return { kind: "closed", status: last.status };
}

/** The board column an agent belongs in when grouping by query status. */
export const standingColumn = (s: AgentStanding): string =>
  s.kind === "none" ? NO_QUERIES : s.kind === "closed" ? CLOSED : String(s.status);

/**
 * The column's mono sub-caption — whose turn it is.
 *
 * ⚠️ IT READS THE CTA ENGINE, NEVER A HAND TABLE. `getPrimaryAction(status).ballHolder` is the
 * same derivation the Queries command bar, the To-do flows and this page's own turn axis use, so
 * the board cannot come to disagree with them about whose move it is. The ref writes this as a
 * literal map; a literal map is a fifth copy of a rule the app already owns.
 */
export function columnCaption(column: string): string {
  if (column === NO_QUERIES) return "not approached";
  if (column === CLOSED) return "closed";
  if (column === String(QueryStatus.OFFER)) return "offer";
  const holder = getPrimaryAction(column as QueryStatus).ballHolder;
  return holder === "writer" ? "with you" : holder === "agent" ? "with the agent" : "closed";
}

/** The column's 2.5px underline. Query-status columns take the v2 state accents. */
export const columnAccent = (column: string): string =>
  column === NO_QUERIES ? STATE_ACCENT_TOKEN.closed
    : column === CLOSED ? STATE_ACCENT_TOKEN.closed
    : STATE_ACCENT_TOKEN[stateFor(column as QueryStatus)];

/**
 * ⚠️ THE CYCLING PALETTE IS FOR GROUPINGS THAT HAVE NO STATE MEANING. A country or a month is not
 * a point in the journey, so borrowing the state accents there would say something false in a
 * vocabulary two other pages read. These are positional and mean only "a different column".
 */
export const CYCLE = [
  "var(--state-agent-deep)", "var(--state-you-deep)", "var(--state-queried-deep)",
  "var(--state-offer-deep)", "var(--state-closed-deep)",
];

export type AgentGroupingKey = "status" | "rel" | "added" | "door" | "loc" | "method" | "reply";

/** Their stated window, in the buckets the filter facet also offers. One set of edges. */
export const REPLY_BUCKETS = ["Within 4 weeks", "5 to 8 weeks", "9 to 12 weeks", "Over 12 weeks", "Not stated"] as const;
export function replyBucket(weeks: number | undefined): string {
  if (!weeks || weeks <= 0) return "Not stated";
  if (weeks <= 4) return REPLY_BUCKETS[0];
  if (weeks <= 8) return REPLY_BUCKETS[1];
  if (weeks <= 12) return REPLY_BUCKETS[2];
  return REPLY_BUCKETS[3];
}

/** Your history with them, in three words. Reuses the standing rather than re-deriving it. */
export const historyBucket = (s: AgentStanding): string =>
  s.kind === "none" ? "Never queried" : s.kind === "closed" ? "Closed" : "Active queries";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function monthAdded(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "Not recorded" : `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export interface Grouping {
  key: AgentGroupingKey;
  label: string;
  sub: string;
  /** A FIXED order renders every column, empty ones included, so the ladder reads. */
  order: readonly string[] | null;
  column: (agent: Agent, queries: Query[]) => string;
}

/* ⚠️ THE STATUS ORDER IS BUILT FROM `STATUS_ORDER`, NOT TYPED OUT. A hand-written list of the
   journey is a fourth copy of it, and it goes stale the day a status is added — silently, by
   dropping every agent at that status out of every column. */
const STATUS_COLUMNS: readonly string[] = [NO_QUERIES, ...STATUS_ORDER.map(String), CLOSED];

export const GROUPINGS: readonly Grouping[] = [
  { key: "status", label: "Query status", sub: "Where each query stands", order: STATUS_COLUMNS,
    column: (a, q) => standingColumn(agentQueryStanding(a.id, q)) },
  { key: "rel", label: "Queried?", sub: "Active, closed or untouched", order: ["Active queries", "Closed", "Never queried"],
    column: (a, q) => historyBucket(agentQueryStanding(a.id, q)) },
  { key: "added", label: "Month added", sub: "Newest month first", order: null, column: (a) => monthAdded(a.dateAdded) },
  { key: "door", label: "Open or closed", sub: "Whether they're taking queries", order: ["Open to queries", "Closed to queries"],
    column: (a) => (isDoorOpen(a) ? "Open to queries" : "Closed to queries") },
  { key: "loc", label: "Location", sub: "By country", order: null,
    column: (a) => countryName(a.country) || "Not recorded" },
  { key: "method", label: "Submission method", sub: "How to approach them",
    order: [String(SubmissionMethod.EMAIL), "Form", String(SubmissionMethod.POST), String(SubmissionMethod.QUERY_MANAGER), "Other"],
    column: (a) => methodShort(a) },
  { key: "reply", label: "Response time", sub: "Their stated window", order: REPLY_BUCKETS,
    column: (a) => replyBucket(a.responseTimeWeeks) },
];

export const groupingFor = (key: AgentGroupingKey): Grouping =>
  GROUPINGS.find((g) => g.key === key) ?? GROUPINGS[0];

export interface BoardColumn {
  key: string;
  caption: string;
  accent: string;
  agents: Agent[];
}

/**
 * The board's columns.
 *
 * ⚠️ A FIXED-ORDER GROUPING RENDERS ITS EMPTY COLUMNS, and that is the point of having an order at
 * all: the journey is a ladder, and a ladder with its unoccupied rungs removed stops being one —
 * you cannot see that nothing has reached Full sent if there is no Full sent column. A grouping
 * with NO fixed order (a country, a month) has no ladder to show, so it renders only what exists.
 */
export function boardColumns(agents: Agent[], queries: Query[], key: AgentGroupingKey): BoardColumn[] {
  const g = groupingFor(key);
  const of = (a: Agent) => g.column(a, queries);

  let keys: string[];
  if (g.order) {
    keys = [...g.order];
    /* anything the fixed order does not name still gets a column — an unrecognised value is a
       fact about the data, and dropping it would silently lose agents off the board */
    for (const a of agents) if (!keys.includes(of(a))) keys.push(of(a));
  } else if (key === "added") {
    keys = [...new Set(agents.map(of))].sort((x, y) => {
      const at = (m: string) => Math.max(...agents.filter((a) => of(a) === m).map((a) => Date.parse(a.dateAdded) || 0));
      return at(y) - at(x); // newest month first
    });
  } else {
    keys = [...new Set(agents.map(of))].sort();
  }

  return keys.map((k, i) => ({
    key: k,
    caption: key === "status" ? columnCaption(k) : `${agents.filter((a) => of(a) === k).length} ${agents.filter((a) => of(a) === k).length === 1 ? "contact" : "contacts"}`,
    accent: key === "status" ? columnAccent(k) : CYCLE[i % CYCLE.length],
    agents: agents.filter((a) => of(a) === k),
  }));
}
