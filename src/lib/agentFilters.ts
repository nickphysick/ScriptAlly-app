/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE TOOLBAR'S MODEL — four facets and six orders, over one set of agents.
 *
 * ⚠️ TICKS WITHIN A FACET ARE ALTERNATIVES; FACETS NARROW EACH OTHER. That intersection is the
 * fix for a real defect this page carried once: a union across facets returned "open OR seeking
 * thrillers" where a reader ticking both plainly means "open AND seeking thrillers", and the
 * counts gave it away by summing past the list's own length. It is what lets "Closed to queries +
 * Active queries" answer the question worth asking — an agency that shut its doors while holding
 * your full.
 *
 * ⚠️ ROW COUNTS READ THE WHOLE LIST, NEVER THE FILTERED VIEW. A count of what you would see after
 * clicking reads 0 for every option you have not chosen, which is the one number nobody needs.
 *
 * ⚠️ ABSENCE SORTS LAST IN EVERY ORDER, IN BOTH DIRECTIONS. An unrated agent is not a zero-star
 * agent and an unstated window is not an instant reply; reversing the order must not promote them
 * to the top, because "last" here means "we do not know", not "least".
 */
import { Agent, Query } from "../types";
import { isDoorOpen } from "./agentList";
import { agentQueryStanding, historyBucket, replyBucket, REPLY_BUCKETS } from "./agentBoard";

export const DOOR_VALUES = ["Open to queries", "Closed to queries"] as const;
export const HISTORY_VALUES = ["Active queries", "Closed", "Never queried"] as const;

export type FacetKey = "door" | "genre" | "history" | "reply";

export interface AgentFilters {
  door: string[];
  genre: string[];
  history: string[];
  reply: string[];
}

export const emptyFilters = (): AgentFilters => ({ door: [], genre: [], history: [], reply: [] });
export const filterCount = (f: AgentFilters): number => f.door.length + f.genre.length + f.history.length + f.reply.length;
export const isFiltersEmpty = (f: AgentFilters): boolean => filterCount(f) === 0;

/** The value an agent takes in each facet. One place, so matching and counting cannot diverge. */
export function facetValues(agent: Agent, queries: Query[]): Record<FacetKey, string[]> {
  return {
    door: [isDoorOpen(agent) ? DOOR_VALUES[0] : DOOR_VALUES[1]],
    genre: agent.genres,
    history: [historyBucket(agentQueryStanding(agent.id, queries))],
    reply: [replyBucket(agent.responseTimeWeeks)],
  };
}

export function matchesFilters(agent: Agent, queries: Query[], f: AgentFilters): boolean {
  const v = facetValues(agent, queries);
  for (const key of ["door", "genre", "history", "reply"] as const) {
    const ticked = f[key];
    if (!ticked.length) continue;                              // an untouched facet constrains nothing
    if (!v[key].some((x) => ticked.includes(x))) return false;  // OR within, AND across
  }
  return true;
}

/** Every value a facet can take on THIS list, with how many agents hold it. Whole list, always. */
export function facetOptions(agents: Agent[], queries: Query[], key: FacetKey): { value: string; n: number }[] {
  const tally = new Map<string, number>();
  for (const a of agents) for (const v of facetValues(a, queries)[key]) tally.set(v, (tally.get(v) ?? 0) + 1);

  /* ⚠️ A FIXED-VOCABULARY FACET SHOWS ITS ZEROES, and they stay visible and inert rather than
     being hidden: their absence is information, and hiding rows makes the popover jump as the
     data changes. A free-vocabulary facet (the genres) can only show what exists. */
  const fixed: readonly string[] | null =
    key === "door" ? DOOR_VALUES : key === "history" ? HISTORY_VALUES : key === "reply" ? REPLY_BUCKETS : null;
  if (fixed) return fixed.map((value) => ({ value, n: tally.get(value) ?? 0 }));
  return [...tally.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([value, n]) => ({ value, n }));
}

/* ── sort ─────────────────────────────────────────────────────────────────────────────────── */

export type SortKey = "name" | "agency" | "added" | "reply" | "priority" | "genre";
export type SortDir = "asc" | "desc";

export interface SortSpec {
  key: SortKey;
  label: string;
  sub: string;
  /** The order segment's two words, [asc, desc] — they relabel per key. */
  dir: readonly [string, string];
  /** Most-useful-first: newest, highest, shortest. */
  defaultDir: SortDir;
}

export const SORTS: readonly SortSpec[] = [
  { key: "name", label: "Agent name", sub: "Alphabetical", dir: ["A to Z", "Z to A"], defaultDir: "asc" },
  { key: "agency", label: "Agency", sub: "Alphabetical", dir: ["A to Z", "Z to A"], defaultDir: "asc" },
  { key: "added", label: "Date added", sub: "When they joined your list", dir: ["Oldest", "Newest"], defaultDir: "desc" },
  { key: "reply", label: "Response time", sub: "Their stated window", dir: ["Shortest", "Longest"], defaultDir: "asc" },
  { key: "priority", label: "Priority", sub: "Your star rating", dir: ["Lowest", "Highest"], defaultDir: "desc" },
  { key: "genre", label: "Genres sought", sub: "First genre listed", dir: ["A to Z", "Z to A"], defaultDir: "asc" },
];

export const sortSpec = (key: SortKey): SortSpec => SORTS.find((s) => s.key === key) ?? SORTS[0];
export const DEFAULT_SORT: SortKey = "name";

/** The comparable value, or null when the agent does not state one. Null always sorts last. */
function sortValue(a: Agent, key: SortKey): string | number | null {
  switch (key) {
    case "name": return a.name.trim().toLowerCase() || null;
    case "agency": return a.agency.trim().toLowerCase() || null;
    case "added": return Date.parse(a.dateAdded) || null;
    case "reply": return a.responseTimeWeeks && a.responseTimeWeeks > 0 ? a.responseTimeWeeks : null;
    case "priority": return a.starRating ?? null;
    case "genre": return a.genres[0]?.trim().toLowerCase() ?? null;
    default: {
      /* an unrecognised key must do NOTHING rather than invent an order */
      const unhandled: never = key;
      return unhandled;
    }
  }
}

export function sortAgents(agents: Agent[], key: SortKey, dir: SortDir): Agent[] {
  const mul = dir === "asc" ? 1 : -1;
  return agents.slice().sort((x, y) => {
    const vx = sortValue(x, key);
    const vy = sortValue(y, key);
    /* ⚠️ ABSENCE LAST IN BOTH DIRECTIONS — computed BEFORE the multiplier, so reversing the order
       does not promote "we do not know" to the top of the list. */
    if (vx === null && vy === null) return x.name.localeCompare(y.name);
    if (vx === null) return 1;
    if (vy === null) return -1;
    const cmp = typeof vx === "number" && typeof vy === "number" ? vx - vy : String(vx).localeCompare(String(vy));
    /* a stable tiebreak, so two agents with the same window never swap between renders */
    return cmp === 0 ? x.name.localeCompare(y.name) : cmp * mul;
  });
}
