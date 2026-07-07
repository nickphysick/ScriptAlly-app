/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Agents page derivations — every list/pane value the rebuilt Agents route needs, computed
 * client-side from the existing hooks (agents/queries/manuscripts/activities). DERIVED OVER
 * STORED throughout: last status comes from the activity history, tier grouping from the stored
 * star rating, "Up next" from open/queried/rating — nothing here is written back.
 *
 * Kept pure and component-free so the ordering, grouping and timeline rules are unit-testable
 * (the repo's lib-level vitest pattern — no component-test infra).
 */
import { Agent, Query, Manuscript, Activity, QueryStatus, SubmissionStatus } from "../types";
import { isHomeMarket, normaliseCountry } from "./territory";

export type AgentsSubFilter = "all" | "open" | "closed";
export type AgentsQueriedFilter = "all" | "yes" | "no";
export type AgentsSort = "rating" | "az" | "resp";
export type AgentsLocationFilter = "all" | "domestic" | "international";
export type AgentsGroupBy = "none" | "rating" | "location" | "queried";

/**
 * An agent's territory relative to the user's home market — DERIVED from `agent.country` vs the
 * user's resolved `homeCountry` (the deployed location foundation: territory.ts + ISO codes). Never
 * stored. `none` = no resolvable country, so such an agent matches neither the Domestic nor the
 * International filter (it only appears under "All") and groups under "No location".
 */
export type AgentTerritory = "domestic" | "international" | "none";
export function agentTerritory(agent: Pick<Agent, "country">, homeCountry: string): AgentTerritory {
  if (!normaliseCountry(agent.country)) return "none";
  return isHomeMarket(agent.country, homeCountry) ? "domestic" : "international";
}

/** Query ids belonging to an agent — the join used by every activity-derived value. */
const queryIdsFor = (agentId: string, queries: Query[]): Set<string> =>
  new Set(queries.filter((q) => q.agentId === agentId).map((q) => q.id));

/** Has this agent ever been queried (any query on record, regardless of stage)? */
export const agentQueried = (agentId: string, queries: Query[]): boolean =>
  queries.some((q) => q.agentId === agentId);

/** Live filter: availability + queried + name/agency search + location (domestic/international vs
 *  the user's home market). `location`/`homeCountry` are optional so existing 5-arg callers/tests
 *  keep the pre-location behaviour; the Agents page passes both. */
export function filterAgents(
  agents: Agent[],
  queries: Query[],
  sub: AgentsSubFilter,
  queried: AgentsQueriedFilter,
  search: string,
  location: AgentsLocationFilter = "all",
  homeCountry: string = "",
): Agent[] {
  const term = search.trim().toLowerCase();
  return agents.filter((a) => {
    if (sub === "open" && a.submissionStatus !== SubmissionStatus.OPEN) return false;
    if (sub === "closed" && a.submissionStatus === SubmissionStatus.OPEN) return false;
    const q = agentQueried(a.id, queries);
    if (queried === "yes" && !q) return false;
    if (queried === "no" && q) return false;
    if (location !== "all" && agentTerritory(a, homeCountry) !== location) return false;
    if (term && !(a.name || "").toLowerCase().includes(term) && !(a.agency || "").toLowerCase().includes(term))
      return false;
    return true;
  });
}

/** Response time for ordering: 0/absent means "unknown", pushed to the end (99). */
const respWeeks = (a: Agent): number => (a.responseTimeWeeks && a.responseTimeWeeks > 0 ? a.responseTimeWeeks : 99);

export function sortAgents(agents: Agent[], sort: AgentsSort): Agent[] {
  const list = [...agents];
  if (sort === "rating") list.sort((a, b) => (b.starRating || 0) - (a.starRating || 0) || a.name.localeCompare(b.name));
  else if (sort === "az") list.sort((a, b) => a.name.localeCompare(b.name));
  else list.sort((a, b) => respWeeks(a) - respWeeks(b) || a.name.localeCompare(b.name));
  return list;
}

export interface AgentListGroup {
  key: string;
  /** Band header label; null = flat run of rows with no header. */
  label: string | null;
  /** Trailing stars shown beside a tier label (e.g. "★★★★★"); null when not a tier. */
  stars: string | null;
  rows: Agent[];
}

/**
 * The rendered list order. A Pinned group always sits on top; set-aside agents always sink to a
 * muted bottom group (existing lifecycle semantics — hidden from suggestions, never interleaved).
 * The MIDDLE is sectioned by the chosen `groupBy` (NOT by the sort): "none" → one flat run;
 * "rating" → star tiers (1★ folds into Long shots so no agent vanishes); "location" → Domestic /
 * International / No location; "queried" → Queried / Not queried. Rows within every section keep the
 * active sort order.
 */
export function groupAgents(
  filtered: Agent[],
  sort: AgentsSort,
  groupBy: AgentsGroupBy,
  queries: Query[],
  homeCountry: string,
): AgentListGroup[] {
  const pinned = filtered.filter((a) => a.pinned && !a.setAside);
  const aside = filtered.filter((a) => a.setAside);
  const rest = filtered.filter((a) => !a.pinned && !a.setAside);
  const groups: AgentListGroup[] = [];

  if (pinned.length) groups.push({ key: "pinned", label: "Pinned", stars: null, rows: sortAgents(pinned, sort) });

  const sorted = sortAgents(rest, sort);
  if (groupBy === "rating") {
    const tiers: [number, string, string][] = [
      [5, "Top picks", "★★★★★"],
      [4, "Strong fits", "★★★★"],
      [3, "Good fits", "★★★"],
      [2, "Long shots", "★★"],
    ];
    for (const [r, label, stars] of tiers) {
      const rows = sorted.filter((a) => (r === 2 ? (a.starRating || 0) <= 2 : a.starRating === r));
      if (rows.length) groups.push({ key: `tier-${r}`, label, stars, rows });
    }
  } else if (groupBy === "location") {
    const sections: [AgentTerritory, string][] = [
      ["domestic", "Domestic"],
      ["international", "International"],
      ["none", "No location"],
    ];
    for (const [terr, label] of sections) {
      const rows = sorted.filter((a) => agentTerritory(a, homeCountry) === terr);
      if (rows.length) groups.push({ key: `loc-${terr}`, label, stars: null, rows });
    }
  } else if (groupBy === "queried") {
    const yes = sorted.filter((a) => agentQueried(a.id, queries));
    const no = sorted.filter((a) => !agentQueried(a.id, queries));
    if (yes.length) groups.push({ key: "q-yes", label: "Queried", stars: null, rows: yes });
    if (no.length) groups.push({ key: "q-no", label: "Not queried", stars: null, rows: no });
  } else if (rest.length) {
    groups.push({ key: "flat", label: null, stars: null, rows: sorted });
  }

  if (aside.length)
    groups.push({ key: "aside", label: "Set aside · hidden from suggestions", stars: null, rows: sortAgents(aside, sort) });
  return groups;
}

/** Flat row order (for keyboard navigation) mirroring groupAgents. */
export const flattenGroups = (groups: AgentListGroup[]): Agent[] => groups.flatMap((g) => g.rows);

/**
 * The "Up next" candidate: open ∧ not yet queried ∧ not set aside, highest star rating,
 * tie-break fastest response time. Computed over the CURRENTLY FILTERED list, so it hides
 * whenever no visible agent matches. Null = hide the card.
 */
export function upNextCandidate(filtered: Agent[], queries: Query[]): Agent | null {
  const cands = filtered.filter(
    (a) => a.submissionStatus === SubmissionStatus.OPEN && !a.setAside && !agentQueried(a.id, queries),
  );
  if (!cands.length) return null;
  cands.sort((a, b) => (b.starRating || 0) - (a.starRating || 0) || respWeeks(a) - respWeeks(b));
  return cands[0];
}

const activityTime = (a: Activity): number => {
  const t = Date.parse(a.date);
  return Number.isNaN(t) ? 0 : t;
};

/**
 * The agent's LAST status — derived from the activity history (newest status-bearing activity
 * across the agent's queries), never stored. Falls back to the newest query's derived `status`
 * for records whose history predates resultingStatus stamping. Null = never queried (no dot).
 */
export function lastStatusForAgent(agentId: string, queries: Query[], activities: Activity[]): QueryStatus | null {
  const ids = queryIdsFor(agentId, queries);
  if (!ids.size) return null;
  let best: Activity | null = null;
  for (const act of activities) {
    if (!act.resultingStatus || !ids.has(act.queryId)) continue;
    if (!best || activityTime(act) > activityTime(best)) best = act;
  }
  if (best?.resultingStatus) return best.resultingStatus;
  // Fallback: newest query by dateSent (undated imports sort last).
  const agentQueries = queries.filter((q) => q.agentId === agentId);
  agentQueries.sort((a, b) => Date.parse(b.dateSent || "0") - Date.parse(a.dateSent || "0"));
  return agentQueries[0]?.status ?? null;
}

export interface AgentTimelineEntry {
  id: string;
  status: QueryStatus;
  /** The exact QueryStatus enum string — the timeline's status label. */
  label: string;
  manuscriptTitle: string;
  dateISO: string;
  dateLabel: string;
  /** Optional muted note line (the activity's details, when present). */
  note?: string;
}

/** "03 Apr 2026" — the timeline/notes date treatment from the design reference. */
export function formatTimelineDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleString("en-GB", { month: "short" });
  return `${day} ${month} ${d.getFullYear()}`;
}

/**
 * "Your history with {first name}" — every status-bearing activity across the agent's queries,
 * oldest first, manuscript titles resolved at read time. Non-status events (nudges, agent edits)
 * never enter the timeline.
 */
export function buildAgentTimeline(
  agentId: string,
  queries: Query[],
  manuscripts: Manuscript[],
  activities: Activity[],
): AgentTimelineEntry[] {
  const ids = queryIdsFor(agentId, queries);
  if (!ids.size) return [];
  const titleOf = (msId: string): string => manuscripts.find((m) => m.id === msId)?.title ?? "Untitled manuscript";
  return activities
    .filter((a) => a.resultingStatus && ids.has(a.queryId))
    .sort((a, b) => activityTime(a) - activityTime(b))
    .map((a) => ({
      id: a.id,
      status: a.resultingStatus as QueryStatus,
      label: a.resultingStatus as string,
      manuscriptTitle: titleOf(a.manuscriptId),
      dateISO: a.date,
      dateLabel: formatTimelineDate(a.date),
      note: a.details?.trim() ? a.details.trim() : undefined,
    }));
}

/** Singular-safe live count for the top bar: "1 agent on file" / "12 agents on file". */
export const agentsCountLabel = (n: number): string => `${n} ${n === 1 ? "agent" : "agents"} on file`;

/** Idle = on file but never queried (the existing "not queried" terminology). Pure — the
 *  masthead pulse line's `{i} idle` reads this, so it can't drift from the Not-queried filter. */
export function agentIdleCount(agents: { id: string }[], queries: { agentId?: string }[]): number {
  const queried = new Set(queries.map((q) => q.agentId).filter(Boolean));
  return agents.filter((a) => !queried.has(a.id)).length;
}

/** Masthead pulse line — `Your database · {n} agents on file · {i} idle` (slab uppercases). */
export function agentsPulse(count: number, idle: number): string {
  return `Your database · ${agentsCountLabel(count)} · ${idle} idle`;
}

/** The Up-next meta line: "5★ fit · open · not yet queried". */
export const upNextMeta = (agent: Agent): string => `${agent.starRating || 0}★ fit · open · not yet queried`;

/**
 * The contextual filter sentence above the list — one plain-English line composed from
 * Status × Queried × Sort, e.g. "All agents, both queried and unqueried, sorted by star rating."
 * or "Agents open to submissions you haven't queried yet, sorted by response time." It narrates
 * the CURRENT lens; the tier headers still label the groups (different jobs).
 */
export function filterSentence(sub: AgentsSubFilter, queried: AgentsQueriedFilter, sort: AgentsSort): string {
  const subject =
    sub === "open" ? "Agents open to submissions" : sub === "closed" ? "Agents closed to submissions" : "All agents";
  const queriedClause =
    queried === "yes" ? " you've already queried" : queried === "no" ? " you haven't queried yet" : ", both queried and unqueried";
  const sortPhrase = sort === "az" ? "sorted A to Z" : sort === "resp" ? "sorted by response time" : "sorted by star rating";
  return `${subject}${queriedClause}, ${sortPhrase}.`;
}

/**
 * The summary line that replaces the descriptive sentence: `N agents · filtered by … · sorted by …
 * · grouped by …`. Returns structured clauses (label + value) so the component can style the values
 * in the accent; only the clauses that APPLY are emitted — no "filtered by" with no active filters,
 * no "grouped by" when None. `N` is the filtered count.
 */
export interface AgentsSummaryClause {
  label: string;
  value: string;
}
export interface AgentsSummaryModel {
  count: string;
  clauses: AgentsSummaryClause[];
}
export function agentsSummary(
  n: number,
  sub: AgentsSubFilter,
  queried: AgentsQueriedFilter,
  location: AgentsLocationFilter,
  sort: AgentsSort,
  groupBy: AgentsGroupBy,
): AgentsSummaryModel {
  const count = `${n} ${n === 1 ? "agent" : "agents"}`;
  const clauses: AgentsSummaryClause[] = [];

  const active: string[] = [];
  if (sub === "open") active.push("open");
  else if (sub === "closed") active.push("closed");
  if (queried === "yes") active.push("queried");
  else if (queried === "no") active.push("not queried");
  if (location === "domestic") active.push("domestic");
  else if (location === "international") active.push("international");
  if (active.length) clauses.push({ label: "filtered by", value: active.join(", ") });

  clauses.push({ label: "sorted by", value: sort === "az" ? "a to z" : sort === "resp" ? "response time" : "star rating" });

  if (groupBy !== "none") {
    clauses.push({ label: "grouped by", value: groupBy === "rating" ? "rating" : groupBy === "location" ? "location" : "queried status" });
  }
  return { count, clauses };
}

/* ── Desk rule (ref design-refs/pane-height-rules-v1.html, Rule 3) ─────────────────────── */

/**
 * The reading-pane document's floor in px — keeps the sparsest record composed (≈ header +
 * wish-list band + submission-profile row; eyeballed against the ref's frame 3). Mirrored by
 * `--ag-pane-floor` in agentsV2.css — an artefact test keeps the two in step. Change both.
 */
export const READING_PANE_FLOOR_PX = 360;

/** The document clamp: height = clamp(floor, content, viewport line). */
export function clampPaneHeight(contentPx: number, capPx: number, floorPx: number = READING_PANE_FLOOR_PX): number {
  return Math.min(Math.max(contentPx, floorPx), capPx);
}

/**
 * Provenance footer line — renders ONLY what exists on the record: `Added {date}` from the
 * rules-required dateAdded (omitted if unparsable — never "Invalid Date"), `· {n} queries`
 * when n > 0 (singular-safe). User agent docs carry no verification field, so there is no
 * right-hand segment (schema decision flagged in BUILD-REPORT.md).
 */
export function paneProvenance(agent: Pick<Agent, "dateAdded">, queryCount: number): string {
  const parts: string[] = [];
  const d = agent.dateAdded ? new Date(agent.dateAdded) : null;
  if (d && !Number.isNaN(d.getTime())) {
    parts.push(`Added ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`);
  }
  if (queryCount > 0) parts.push(`${queryCount} ${queryCount === 1 ? "query" : "queries"}`);
  return parts.join(" · ");
}
