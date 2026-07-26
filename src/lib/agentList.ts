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

export const visibleAgents = (agents: Agent[], queries: Query[], filter: AgentListFilter, search: string): Agent[] =>
  agents.filter((a) => matchesAgentFilter(a, queries, filter) && matchesAgentSearch(a, search));

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
 * The card's one-line materials summary. Reads BOTH stored shapes — the legacy `string[]` and the
 * `materialsForm` object (Phase 5 owns the full editor shims) — and never prefixes the free-text
 * "Other" entry, which reads as its own words. Null when nothing is recorded.
 */
export function materialsSummary(agent: Agent): string | null {
  const raw = agent.materialsWanted as unknown;
  const parts: string[] = [];

  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === "string") {
        if (item.trim()) parts.push(item.trim());
      } else if (item && typeof item === "object") {
        // structured QueryMaterial-ish entry: { type, quantity? }
        const o = item as { type?: string; quantity?: string | number };
        const label = (o.type || "").trim();
        if (label) parts.push(o.quantity ? `${label} (${o.quantity})` : label);
      }
    }
  } else if (raw && typeof raw === "object") {
    const f = raw as {
      queryLetter?: boolean; synopsis?: boolean;
      pages?: { selected?: boolean; count?: string | number };
      chapters?: { selected?: boolean; count?: string | number };
      words?: { selected?: boolean; count?: string | number };
      other?: { selected?: boolean; value?: string };
    };
    if (f.queryLetter) parts.push("Query letter");
    if (f.synopsis) parts.push("Synopsis");
    // Multiple sample units can be selected on legacy data — render one entry each, never collapse.
    for (const [key, unit] of [["chapters", "chapters"], ["pages", "pages"], ["words", "words"]] as const) {
      const cell = f[key];
      if (cell?.selected) {
        const n = String(cell.count ?? "").trim();
        parts.push(n ? `Opening sample (${n} ${unit})` : "Opening sample");
      }
    }
    if (f.other?.selected && (f.other.value || "").trim()) parts.push(f.other.value!.trim());
  }

  return parts.length ? parts.join("  ·  ") : null;
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
