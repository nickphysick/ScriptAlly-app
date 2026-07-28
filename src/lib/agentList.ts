/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Agent list — the pure derivations behind the card grid (design authority:
 * design-refs/agent-list-mockup.html). Everything here is derived at read time from the agent
 * plus the live query set; nothing in this module is ever stored on the agent.
 *
 * Two vocabularies the whole page shares:
 *   · RELATIONSHIP (your history with them) — active / prev / never, worded exactly once in
 *     `relationshipLabel` so the card pill, the filter chips and the empty-history line agree.
 *   · DOOR (their submission status) — open or closed. `SubmissionStatus.UNKNOWN` is retired at
 *     the UI layer: it READS as open (no stamp, no fade, no closed-chip membership) and is only
 *     ever written as "Open"/"Closed", so an agent migrates off Unknown on its first saved edit.
 */
import { Activity, ActivityType, Agent, Manuscript, Query, QueryStatus, SubmissionStatus } from "../types";
import { materialRowsFromAgent, summaryFromRows } from "./agentMaterials";
import { agentTerritory } from "./agentsPage";
import { getPrimaryAction } from "./queryPrimaryAction";

/** Terminal query statuses — everything else, INCLUDING Offer, counts as an active query. */
export const TERMINAL_STATUSES: readonly QueryStatus[] = [
  QueryStatus.REJECTED,
  QueryStatus.WITHDRAWN,
  QueryStatus.NO_RESPONSE,
];

/** The statuses where the agent has asked for something and the writer owes it — "your pages". */
export const AWAITING_PAGES_STATUSES: readonly QueryStatus[] = [
  QueryStatus.PARTIAL_REQUESTED,
  QueryStatus.FULL_REQUESTED,
  QueryStatus.REVISE_RESUBMIT,
];

export const isTerminalStatus = (s: QueryStatus | string): boolean =>
  TERMINAL_STATUSES.includes(s as QueryStatus);

/** Every query on record for this agent, oldest first (the card's history strip order). */
export const queriesForAgent = (agentId: string, queries: Query[]): Query[] =>
  queries
    .filter((q) => q.agentId === agentId)
    .slice()
    .sort((a, b) => Date.parse(a.dateSent || "0") - Date.parse(b.dateSent || "0"));

export type AgentRelationship = "active" | "prev" | "never";

/** Your history with this agent: any live query → active; only terminal ones → prev; none → never. */
export function agentRelationship(agentId: string, queries: Query[]): AgentRelationship {
  const mine = queries.filter((q) => q.agentId === agentId);
  if (!mine.length) return "never";
  return mine.some((q) => !isTerminalStatus(q.status)) ? "active" : "prev";
}

/** The one place the relationship is worded — pill, chips and empty line all read from here. */
export function relationshipLabel(rel: AgentRelationship): string {
  switch (rel) {
    case "active": return "Active queries";
    case "prev": return "No active queries";
    default: return "Never queried";
  }
}

/** Does the agent have a request outstanding that the writer still owes materials for? */
export const awaitingYourPages = (agentId: string, queries: Query[]): boolean =>
  queries.some((q) => q.agentId === agentId && AWAITING_PAGES_STATUSES.includes(q.status));

/**
 * Their door. UNKNOWN reads as OPEN (decision 3) — the ONLY closed state is an explicit
 * `SubmissionStatus.CLOSED`, so door state, card fade, stamp and chip counts can never disagree.
 */
export const isDoorOpen = (agent: Pick<Agent, "submissionStatus">): boolean =>
  agent.submissionStatus !== SubmissionStatus.CLOSED;

/** Card state class: closed overrides everything, else active → sage, no-active/never → pink. */
export function agentStateClass(agent: Agent, queries: Query[]): "s-sage" | "s-pink" | "s-grey" {
  if (!isDoorOpen(agent)) return "s-grey";
  return agentRelationship(agent.id, queries) === "active" ? "s-sage" : "s-pink";
}

/* ══════════════════════════════════════════════════════════════════════════════
   THE TWO AXES (rebuild v2, decision 1)

   The old model treated "Awaiting your pages" as a peer of "Active queries" and it is not — it
   is a SUBSET of active. The counts gave it away (12 active + 3 awaiting + 4 no-active = 19
   against 16 agents) and filtering on both returned the union where a reader expects the
   intersection. So: two independent axes.

     · AXIS A — WHERE THINGS STAND. Exactly one value per agent, so the counts partition the
       list and must sum to the total. The door OUTRANKS the relationship: an agent closed for
       submissions reads "Closed", whatever their query history, because that is the fact that
       governs what you can do next.
     · AXIS B — WHOSE TURN. Only meaningful INSIDE active queries, so its counts sum to the
       active count, not the total. Never stored: it reads the CTA engine's ball-holder
       (`getPrimaryAction`), the same derivation the Queries command bar and the To-do flows
       use, so this page can never disagree with them about whose move it is.
   ══════════════════════════════════════════════════════════════════════════════ */

/** Axis A. Exclusive and exhaustive — every agent is exactly one of these. */
export type AgentStanding = "active" | "noactive" | "never" | "closed";

/** Axis B. `null` = the axis doesn't apply (the agent has no active query). */
export type AgentTurn = "you" | "them" | null;

/**
 * Axis A for one agent. Closed first — the door outranks history; otherwise the relationship
 * ("active" → live query, "noactive" → only terminal ones, "never" → none on record).
 */
export function agentStanding(agent: Agent, queries: Query[]): AgentStanding {
  if (!isDoorOpen(agent)) return "closed";
  const rel = agentRelationship(agent.id, queries);
  return rel === "prev" ? "noactive" : rel === "never" ? "never" : "active";
}

/**
 * Axis B for one agent, DERIVED from the CTA engine and nothing else: any live query whose
 * primary action puts the ball in the writer's court ⇒ "you"; otherwise, if a live query
 * exists, "them"; no live query ⇒ null (the axis doesn't apply).
 *
 * Reusing `getPrimaryAction` rather than re-listing statuses is the point: the writer's-turn
 * set is defined once, and a taxonomy change lands here for free.
 */
export function agentTurn(agent: Agent, queries: Query[]): AgentTurn {
  if (agentStanding(agent, queries) !== "active") return null;
  const live = queries.filter((q) => q.agentId === agent.id && !isTerminalStatus(q.status));
  if (!live.length) return null;
  return live.some((q) => getPrimaryAction(q.status as QueryStatus).ballHolder === "writer") ? "you" : "them";
}

/** The wording for each axis value — one place, so filters, groups and tags all agree. */
export const STANDING_LABEL: Record<AgentStanding, string> = {
  active: "Active queries",
  noactive: "No active queries",
  never: "Never queried",
  closed: "Closed for submissions",
};

export const TURN_LABEL: Record<Exclude<AgentTurn, null>, string> = {
  you: "Awaiting your pages",
  them: "Waiting on the agent",
};

export const STANDING_ORDER: readonly AgentStanding[] = ["active", "noactive", "never", "closed"];
export const TURN_ORDER: readonly Exclude<AgentTurn, null>[] = ["you", "them"];

export interface AgentAxisCounts {
  total: number;
  standing: Record<AgentStanding, number>;
  /** Keyed within the active set only — `you + them === standing.active`. */
  turn: Record<Exclude<AgentTurn, null>, number>;
}

/**
 * Both axes counted in one pass over the WHOLE list (never the filtered view — a filter row must
 * show what it would reveal). The two reconciliation invariants are locked in agentList.test.ts:
 * axis A sums to the total, axis B sums to the active count.
 */
export function agentAxisCounts(agents: Agent[], queries: Query[]): AgentAxisCounts {
  const out: AgentAxisCounts = {
    total: agents.length,
    standing: { active: 0, noactive: 0, never: 0, closed: 0 },
    turn: { you: 0, them: 0 },
  };
  for (const a of agents) {
    out.standing[agentStanding(a, queries)] += 1;
    const t = agentTurn(a, queries);
    if (t) out.turn[t] += 1;
  }
  return out;
}

export type AgentListFilter = "all" | "active" | "waiting" | "prev" | "notq" | "closed";

export interface AgentListChip {
  key: AgentListFilter;
  label: string;
}

/** Chip order + wording, straight from the mockup's control row. */
export const AGENT_LIST_CHIPS: readonly AgentListChip[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active queries" },
  { key: "waiting", label: "Awaiting your pages" },
  { key: "prev", label: "No active queries" },
  { key: "notq", label: "Never queried" },
  { key: "closed", label: "Closed for submissions" },
];

export function matchesAgentFilter(agent: Agent, queries: Query[], filter: AgentListFilter): boolean {
  switch (filter) {
    case "active": return agentRelationship(agent.id, queries) === "active";
    case "waiting": return awaitingYourPages(agent.id, queries);
    case "prev": return agentRelationship(agent.id, queries) === "prev";
    case "notq": return agentRelationship(agent.id, queries) === "never";
    case "closed": return !isDoorOpen(agent);
    default: return true;
  }
}

/** Search is name OR agency, case-insensitive (the mockup's exact reach). */
export function matchesAgentSearch(agent: Agent, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return (agent.name || "").toLowerCase().includes(q) || (agent.agency || "").toLowerCase().includes(q);
}

export const visibleAgents = (
  agents: Agent[],
  queries: Query[],
  filter: AgentListFilter,
  search: string,
  opts: { sort?: AgentListSort; location?: AgentLocationFilter; homeCountry?: string } = {},
): Agent[] =>
  sortAgentList(
    agents.filter(
      (a) =>
        matchesAgentFilter(a, queries, filter) &&
        matchesAgentSearch(a, search) &&
        matchesAgentLocation(a, opts.location ?? "all", opts.homeCountry ?? ""),
    ),
    opts.sort ?? DEFAULT_AGENT_SORT,
  );

/* ── Sort + location (restored in Phase 6; the F12 page had both) ──────────── */

export type AgentListSort = "rating" | "resp" | "added" | "az";

/**
 * THE DEFAULT ORDER, stated explicitly so the grid can't drift: highest star rating first, then
 * alphabetically within a tier. An unstated default is how grids rot as they grow.
 */
export const DEFAULT_AGENT_SORT: AgentListSort = "rating";

export const AGENT_SORT_OPTIONS: readonly { key: AgentListSort; label: string }[] = [
  { key: "rating", label: "Star rating" },
  { key: "resp", label: "Response time" },
  { key: "added", label: "Date added" },
  { key: "az", label: "Name A–Z" },
];

/** Unrated / unstated sort LAST in their respective orders — absence is not a zero. */
export function sortAgentList(agents: Agent[], sort: AgentListSort): Agent[] {
  const byName = (a: Agent, b: Agent) => (a.name || "").localeCompare(b.name || "");
  const list = [...agents];
  switch (sort) {
    case "az":
      return list.sort(byName);
    case "resp":
      return list.sort((a, b) => {
        const av = a.responseTimeWeeks && a.responseTimeWeeks > 0 ? a.responseTimeWeeks : Infinity;
        const bv = b.responseTimeWeeks && b.responseTimeWeeks > 0 ? b.responseTimeWeeks : Infinity;
        return av - bv || byName(a, b);
      });
    case "added":
      return list.sort((a, b) => Date.parse(b.dateAdded || "0") - Date.parse(a.dateAdded || "0") || byName(a, b));
    default:
      return list.sort((a, b) => (b.starRating || 0) - (a.starRating || 0) || byName(a, b));
  }
}

export type AgentLocationFilter = "all" | "domestic" | "international";

export const AGENT_LOCATION_OPTIONS: readonly { key: AgentLocationFilter; label: string }[] = [
  { key: "all", label: "Anywhere" },
  { key: "domestic", label: "My market" },
  { key: "international", label: "International" },
];

/** Location reads the REAL `agent.country` (ISO) against the user's home market. */
export const matchesAgentLocation = (agent: Agent, filter: AgentLocationFilter, homeCountry: string): boolean =>
  filter === "all" ? true : agentTerritory(agent, homeCountry) === filter;

/* ── the filter SET (rebuild v2): four independent facets, ANDed ─────────────
   Within one facet the ticks are alternatives (OR); across facets they narrow (AND) — which is
   what fixes the old union bug: ticking "Active queries" AND "Awaiting your pages" now returns
   the intersection a reader expects, because they live on different axes. An empty facet means
   "no constraint", never "nothing". */

export interface AgentFilterSet {
  standing: AgentStanding[];
  turn: Exclude<AgentTurn, null>[];
  /** Minimum star rating(s) ticked; the LOWEST tick wins, so 4+ and 3+ together read as 3+. */
  stars: number[];
  /** ISO country codes. */
  loc: string[];
}

export const emptyFilterSet = (): AgentFilterSet => ({ standing: [], turn: [], stars: [], loc: [] });

export const filterCount = (f: AgentFilterSet): number =>
  f.standing.length + f.turn.length + f.stars.length + f.loc.length;

export const isFilterSetEmpty = (f: AgentFilterSet): boolean => filterCount(f) === 0;

export function matchesFilterSet(agent: Agent, queries: Query[], f: AgentFilterSet): boolean {
  if (f.standing.length && !f.standing.includes(agentStanding(agent, queries))) return false;
  if (f.turn.length) {
    const t = agentTurn(agent, queries);
    if (!t || !f.turn.includes(t)) return false;
  }
  if (f.stars.length && (agent.starRating || 0) < Math.min(...f.stars)) return false;
  if (f.loc.length && !f.loc.includes(agent.country || "")) return false;
  return true;
}

/** Star-tier rows: how many agents would survive a "N and up" tick, over the whole list. */
export const starTierCount = (agents: Agent[], min: number): number =>
  agents.filter((a) => (a.starRating || 0) >= min).length;

/** Location rows: the countries actually in use, most-used first then alphabetical by code. */
export function locationCounts(agents: Agent[]): { code: string; n: number }[] {
  const seen = new Map<string, number>();
  for (const a of agents) {
    const c = (a.country || "").trim();
    if (c) seen.set(c, (seen.get(c) || 0) + 1);
  }
  return [...seen.entries()]
    .map(([code, n]) => ({ code, n }))
    .sort((x, y) => y.n - x.n || x.code.localeCompare(y.code));
}

export type AgentListCounts = Record<AgentListFilter, number>;

/**
 * Live chip counts over the WHOLE list (never the filtered view — a chip must show what it would
 * reveal). The relationship buckets partition the list; waiting and closed cut across them.
 */
export function agentListCounts(agents: Agent[], queries: Query[]): AgentListCounts {
  const c: AgentListCounts = { all: agents.length, active: 0, waiting: 0, prev: 0, notq: 0, closed: 0 };
  for (const a of agents) {
    const rel = agentRelationship(a.id, queries);
    if (rel === "active") c.active += 1;
    else if (rel === "prev") c.prev += 1;
    else c.notq += 1;
    if (awaitingYourPages(a.id, queries)) c.waiting += 1;
    if (!isDoorOpen(a)) c.closed += 1;
  }
  return c;
}

/** "12 of 20 agents" — singular-safe. */
export const agentCountLine = (visible: number, total: number): string =>
  `${visible} of ${total} ${total === 1 ? "agent" : "agents"}`;

/** The meta line's method token: Form / the free-text Other / Email. */
export function methodShort(agent: Pick<Agent, "submissionMethod" | "agentNotes">): string {
  const m = agent.submissionMethod as string;
  if (m === "Online Form") return "Form";
  if (m === "Other") return (agent.agentNotes || "").trim() || "Other";
  return m || "Email";
}

/**
 * The card's mono meta line. Absence is a first-class state (amendment A): an agent with no
 * stated response time reads "response unknown" rather than inventing a number, and the
 * no-reply token appears only once the writer has actually set it true.
 */
export function metaTokens(agent: Agent): string[] {
  const weeks = agent.responseTimeWeeks;
  const tokens = [weeks && weeks > 0 ? `~${weeks} wks` : "response unknown", methodShort(agent)];
  if (agent.noResponseMeansNo === true) tokens.push("No reply = no");
  return tokens;
}

/** "3 Apr 2026" — the mockup's stamp/bubble date format. */
export function formatCardDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/** The exact activity detail `updateAgent` stamps when the door is shut — the stamp date's source. */
export const CLOSED_DETAIL = "Submission status updated to Closed";

/**
 * "LAST UPDATED {date}" on the closed stamp — DERIVED, never stored: the newest AGENT_UPDATED
 * activity that recorded the door closing, falling back to `lastCheckedDate`. Activities carry no
 * agentId, so they're matched on the description `updateAgent` writes ("… for {name} at {agency}").
 */
export function closedStampDate(agent: Agent, activities: Activity[]): string {
  let newest = 0;
  for (const act of activities) {
    if (act.activityType !== ActivityType.AGENT_UPDATED) continue;
    if ((act.details || "").trim() !== CLOSED_DETAIL) continue;
    if (!(act.description || "").includes(agent.name)) continue;
    const t = Date.parse(act.date);
    if (!Number.isNaN(t) && t > newest) newest = t;
  }
  const iso = newest ? new Date(newest).toISOString() : agent.lastCheckedDate;
  return iso ? formatCardDate(iso) : "";
}

export interface CardHistoryEntry {
  queryId: string;
  status: QueryStatus;
  /** The manuscript this query was for — the label beside the dot. */
  title: string;
}

/** The card's history strip: one real StatusDot per query, oldest first, manuscript titles resolved. */
export function cardHistory(agent: Agent, queries: Query[], manuscripts: Manuscript[]): CardHistoryEntry[] {
  return queriesForAgent(agent.id, queries).map((q) => ({
    queryId: q.id,
    status: q.status,
    title: manuscripts.find((m) => m.id === q.manuscriptId)?.title ?? "Untitled manuscript",
  }));
}

/** The wishlist row: at most three genre chips plus an overflow count. */
export function wishlistChips(agent: Agent, max = 3): { shown: string[]; more: number } {
  const all = (agent.genres || []).filter(Boolean);
  return { shown: all.slice(0, max), more: Math.max(0, all.length - max) };
}

/**
 * The card's one-line materials summary — ONE source with the editor: the canonical string[] is
 * parsed into the four editor rows and summarised from those, so the face and the Materials tab
 * can never disagree. The free-text Other reads as its own words, never an "Other —" prefix.
 */
export function materialsSummary(agent: Agent): string | null {
  const stored = Array.isArray(agent.materialsWanted) ? (agent.materialsWanted as unknown[]) : [];
  const asStrings = stored.map((x) =>
    typeof x === "string" ? x : String((x as { type?: string })?.type || ""),
  ).filter(Boolean);
  return summaryFromRows(materialRowsFromAgent(asStrings));
}

export interface NotePreview {
  text: string;
  pinned: boolean;
}

/**
 * The card's note preview: the pinned note when one is resolvable, else the latest.
 *
 * PHASE 2 SCOPE: the grid does not subscribe to every agent's `notes` subcollection (that would be
 * one listener per card), so this reads the legacy flat `agent.notes` string. Phase 5 decides how
 * the subcollection reaches the card — see the report. `notes` here is the already-loaded list for
 * an agent when a caller has one (the editor does), and empty otherwise.
 */
export function notePreview(
  agent: Agent,
  notes: { id: string; text: string; createdAt: string }[] = [],
): NotePreview | null {
  if (notes.length) {
    if (agent.pinnedNoteId) {
      const pinned = notes.find((n) => n.id === agent.pinnedNoteId);
      if (pinned) return { text: pinned.text, pinned: true };
    }
    const latest = notes[notes.length - 1];
    return latest ? { text: latest.text, pinned: false } : null;
  }
  const flat = (agent.notes || "").trim();
  return flat ? { text: flat, pinned: false } : null;
}
