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

/** THE CARD'S COLOUR — YOUR HISTORY, never their door (agent-card-visual pack).
 *
 *  Sage means something of yours is live; soft pink means nothing is. The band's pill names
 *  WHICH pink case applies (no active queries vs never queried) — the colour deliberately does
 *  not distinguish them.
 *
 *  The closed-door override that used to return "s-grey" is GONE: the door is expressed in ink
 *  (a hatched band and a `Closed` pill), never in colour. See the two-systems EXCEPTION recorded
 *  in CLAUDE.md — this page inverts the app-wide rule on purpose. */
export function agentStateClass(agent: Agent, queries: Query[]): "s-sage" | "s-pink" {
  return agentRelationship(agent.id, queries) === "active" ? "s-sage" : "s-pink";
}

/** THE DIM RULE: a card fades ONLY when the door is closed AND nothing of yours is live.
 *
 *  A card with an active query NEVER dims, whatever the door is doing — an outstanding full or
 *  a live offer does not matter less because the agency shut its doors. That is exactly the case
 *  the old door-precedence bug hid, and dimming it would reintroduce the same error in a softer
 *  form. Hover restores full strength (CSS): the record stays entirely valid. */
export function agentCardDims(agent: Agent, queries: Query[]): boolean {
  return !isDoorOpen(agent) && agentRelationship(agent.id, queries) !== "active";
}

/* ══════════════════════════════════════════════════════════════════════════════
   THE THREE AXES (rebuild v2 established two; the door became the third, 28 Jul)

   Round one: "Awaiting your pages" was treated as a peer of "Active queries" when it is a
   SUBSET. The counts gave it away (12 active + 3 awaiting + 4 no-active = 19 against 16 agents)
   and filtering on both returned the union where a reader expects the intersection.

   Round two, the SAME class of defect one level up: "Closed for submissions" was folded into
   the standing list and the overlap resolved with a "door outranks history" precedence. But
   the door and your history are facts about DIFFERENT SYSTEMS — theirs and yours — and neither
   outranks the other. The precedence made an agency that shut its doors while holding your
   full disappear from "Active queries", and (because whose-turn is gated on active) from the
   turn axis as well: a query you were actively waiting on became invisible to both. THE
   PRECEDENCE IS REMOVED. Do not reintroduce it — the door is its own axis.

     · AXIS A — WHERE THINGS STAND (your history). active / noactive / never. Exclusive, so the
       counts partition the list and sum to the total.
     · AXIS B — WHOSE TURN (within active only). Counts sum to the ACTIVE count, not the total.
       Never stored: it reads the CTA engine's ball-holder (`getPrimaryAction`), the same
       derivation the Queries command bar and the To-do flows use.
     · AXIS C — THEIR DOOR (their submission status). open / closed. INDEPENDENT of A and B, so
       its counts also sum to the total, and an agent can be both "Active queries" and "Closed
       for submissions" at once — which is precisely the situation worth seeing.
   ══════════════════════════════════════════════════════════════════════════════ */

/** Axis A — YOUR HISTORY. Exclusive and exhaustive; says nothing about their door. */
export type AgentStanding = "active" | "noactive" | "never";

/** Axis B. `null` = the axis doesn't apply (the agent has no active query). */
export type AgentTurn = "you" | "them" | null;

/** Axis C — THEIR DOOR. Independent of everything above. */
export type AgentDoor = "open" | "closed";

/**
 * Axis A for one agent: purely the relationship — "active" (a live query), "noactive" (only
 * terminal ones), "never" (none on record). It does NOT consult the door: a closed agency you
 * have a live full with is still an agent you have an active query with.
 */
export function agentStanding(agent: Agent, queries: Query[]): AgentStanding {
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
 *
 * The gate is the HISTORY axis, which no longer consults the door — so an agent whose agency
 * has closed still reports whose turn it is on the query you have open with them.
 */
export function agentTurn(agent: Agent, queries: Query[]): AgentTurn {
  if (agentStanding(agent, queries) !== "active") return null;
  const live = queries.filter((q) => q.agentId === agent.id && !isTerminalStatus(q.status));
  if (!live.length) return null;
  return live.some((q) => getPrimaryAction(q.status as QueryStatus).ballHolder === "writer") ? "you" : "them";
}

/** Axis C for one agent — just `isDoorOpen` in axis clothing; nothing new is derived. */
export const agentDoor = (agent: Agent): AgentDoor => (isDoorOpen(agent) ? "open" : "closed");

/** The wording for each axis value — one place, so filters, groups and tags all agree. */
export const STANDING_LABEL: Record<AgentStanding, string> = {
  active: "Active queries",
  noactive: "No active queries",
  never: "Never queried",
};

export const TURN_LABEL: Record<Exclude<AgentTurn, null>, string> = {
  you: "Awaiting your pages",
  them: "Waiting on the agent",
};

/** Door wording is always "…to queries" — never a bare "Closed" (the two-systems vocabulary). */
export const DOOR_LABEL: Record<AgentDoor, string> = {
  open: "Open to queries",
  closed: "Closed for submissions",
};

export const STANDING_ORDER: readonly AgentStanding[] = ["active", "noactive", "never"];
export const TURN_ORDER: readonly Exclude<AgentTurn, null>[] = ["you", "them"];
export const DOOR_ORDER: readonly AgentDoor[] = ["open", "closed"];

export interface AgentAxisCounts {
  total: number;
  standing: Record<AgentStanding, number>;
  /** Keyed within the active set only — `you + them === standing.active`. */
  turn: Record<Exclude<AgentTurn, null>, number>;
  /** Independent of standing — `open + closed === total`, and the sets OVERLAP with standing. */
  door: Record<AgentDoor, number>;
}

/**
 * All three axes counted in one pass over the WHOLE list (never the filtered view — a filter row
 * must show what it would reveal). The reconciliation invariants are locked in agentList.test.ts:
 * standing sums to the total, turn sums to the active count, door sums to the total.
 */
export function agentAxisCounts(agents: Agent[], queries: Query[]): AgentAxisCounts {
  const out: AgentAxisCounts = {
    total: agents.length,
    standing: { active: 0, noactive: 0, never: 0 },
    turn: { you: 0, them: 0 },
    door: { open: 0, closed: 0 },
  };
  for (const a of agents) {
    out.standing[agentStanding(a, queries)] += 1;
    const t = agentTurn(a, queries);
    if (t) out.turn[t] += 1;
    out.door[agentDoor(a)] += 1;
  }
  return out;
}

/* (RETIRED with the toolbar rebuild: `AGENT_LIST_CHIPS` / `matchesAgentFilter` / `visibleAgents`
   / `agentListCounts` / the location-filter trio. They modelled "Awaiting your pages" as a PEER
   of "Active queries" — the exact bug the two axes above exist to fix — and had no callers left
   once the chip row went. Keeping them would have left a working, tested API that reproduces the
   defect for whoever reached for it next. The card's own state class and the axis derivations
   cover everything they did.) */

/** Search is name OR agency, case-insensitive (the mockup's exact reach). */
export function matchesAgentSearch(agent: Agent, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return (agent.name || "").toLowerCase().includes(q) || (agent.agency || "").toLowerCase().includes(q);
}

/* ── Sort ──────────────────────────────────────────────────────────────────── */

export type AgentListSort = "rating" | "az" | "recent" | "speed";

/**
 * THE DEFAULT ORDER, stated explicitly so the grid can't drift: highest star rating first, then
 * alphabetically within a tier. An unstated default is how grids rot as they grow.
 */
export const DEFAULT_AGENT_SORT: AgentListSort = "rating";

export const AGENT_SORT_OPTIONS: readonly { key: AgentListSort; label: string }[] = [
  { key: "rating", label: "Star rating" },
  { key: "az", label: "Name A–Z" },
  { key: "recent", label: "Recently queried" },
  { key: "speed", label: "Fastest to reply" },
];

/**
 * When this agent was last queried — DERIVED, never stored.
 *
 * THE KEY IS `max(dateSent)` ACROSS ALL THEIR QUERIES — their most recent contact, explicitly,
 * not whichever query the fetch happens to return first. An agent can hold queries on several
 * manuscripts, so "the first one found" would order the grid by an arbitrary fact.
 *
 * SCOPE: the agent list is GLOBAL, not manuscript-scoped — it reads the whole `queries`
 * collection from the DB context and has no manuscript selector — so the max is global too. If
 * this page ever gains a manuscript scope, this call must be given the scoped query set, and the
 * pulse/counts alongside it; that is a deliberate coupling, not an oversight.
 *
 * WHY dateSent and not a second scan of the activity feed: `dateSent` is `recomputeQuery`'s own
 * output FROM that feed, so it already is the log's derivation, computed once and shared. A
 * parallel scan here could disagree with it — and `Activity` carries no agentId (the closed-stamp
 * helper has to string-match descriptions to get one), so the parallel path would also be the
 * more fragile of the two.
 *
 * Returns null for a never-queried agent, and `sortAgentList` sinks those to the BOTTOM — an
 * agent you have never approached is not one you contacted at the beginning of time.
 */
export function lastQueriedAt(agentId: string, queries: Query[]): number | null {
  let newest: number | null = null;
  for (const q of queries) {
    if (q.agentId !== agentId) continue;
    const t = Date.parse(q.dateSent || "");
    if (!Number.isNaN(t) && (newest === null || t > newest)) newest = t;
  }
  return newest;
}

/**
 * Sorting. Absence sorts LAST in every order — an unrated agent is not a zero-star agent, an
 * agent with no stated response time is not instant, and one never queried is not "queried at the
 * beginning of time". Name breaks every tie so the grid is stable rather than incidentally ordered.
 */
export function sortAgentList(agents: Agent[], sort: AgentListSort, queries: Query[] = []): Agent[] {
  const byName = (a: Agent, b: Agent) => (a.name || "").localeCompare(b.name || "");
  const list = [...agents];
  switch (sort) {
    case "az":
      return list.sort(byName);
    case "speed":
      return list.sort((a, b) => {
        const av = a.responseTimeWeeks && a.responseTimeWeeks > 0 ? a.responseTimeWeeks : Infinity;
        const bv = b.responseTimeWeeks && b.responseTimeWeeks > 0 ? b.responseTimeWeeks : Infinity;
        return av - bv || byName(a, b);
      });
    case "recent":
      return list.sort((a, b) => {
        // never-queried sinks: -Infinity puts it after every real date under a descending sort
        const av = lastQueriedAt(a.id, queries) ?? -Infinity;
        const bv = lastQueriedAt(b.id, queries) ?? -Infinity;
        return bv - av || byName(a, b);
      });
    default:
      return list.sort((a, b) => (b.starRating || 0) - (a.starRating || 0) || byName(a, b));
  }
}

/* ── Grouping ──────────────────────────────────────────────────────────────── */

export type AgentGrouping = "none" | "standing" | "turn" | "door" | "stars";

export const AGENT_GROUP_OPTIONS: readonly { key: AgentGrouping; label: string }[] = [
  { key: "none", label: "None" },
  { key: "standing", label: "Where things stand" },
  { key: "turn", label: "Whose turn" },
  { key: "door", label: "Their door" },
  { key: "stars", label: "Star rating" },
];

export interface AgentGroup {
  key: string;
  title: string;
  /** The 88px rule stub's colour — sage/pink/tan/gold, per the To-do board's section pattern. */
  stub: string;
  /** Rating groups draw their tier in stars beside the title. */
  stars?: number;
  agents: Agent[];
}

/** The stub palette, named by role so a future group type picks a meaning rather than a hex. */
export const GROUP_STUB = {
  sage: "#c3cfc0",   // active / waiting on the agent — in motion, not owed
  pink: "#e8c8bc",   // awaiting your pages — the writer owes something
  tan: "#ddd0c0",    // no active queries / never queried — dormant
  grey: "#cfc8bf",   // closed for submissions
  gold: "#e0c9a4",   // rating tiers
} as const;

const STANDING_STUB: Record<AgentStanding, string> = {
  active: GROUP_STUB.sage,
  noactive: GROUP_STUB.tan,
  never: GROUP_STUB.tan,
};

const TURN_STUB: Record<Exclude<AgentTurn, null>, string> = {
  you: GROUP_STUB.pink,
  them: GROUP_STUB.sage,
};

const DOOR_STUB: Record<AgentDoor, string> = {
  open: GROUP_STUB.sage,
  closed: GROUP_STUB.grey,
};

const TIER_WORD = ["One star", "Two stars", "Three stars", "Four stars", "Five stars"];

/**
 * Split an ALREADY SORTED list into sections. Sorting stays outside so it applies WITHIN groups
 * for free — grouping only partitions, it never reorders. Empty sections are dropped; the
 * unrated tail gets its own honest section rather than being folded into "One star".
 */
export function groupAgents(
  agents: Agent[],
  grouping: AgentGrouping,
  queries: Query[],
): AgentGroup[] {
  if (grouping === "none") return [];

  const out: AgentGroup[] = [];
  const push = (key: string, title: string, stub: string, members: Agent[], stars?: number) => {
    if (members.length) out.push({ key, title, stub, agents: members, ...(stars ? { stars } : {}) });
  };

  if (grouping === "standing") {
    for (const k of STANDING_ORDER) {
      push(k, STANDING_LABEL[k], STANDING_STUB[k], agents.filter((a) => agentStanding(a, queries) === k));
    }
    return out;
  }

  if (grouping === "turn") {
    for (const k of TURN_ORDER) {
      push(k, TURN_LABEL[k], TURN_STUB[k], agents.filter((a) => agentTurn(a, queries) === k));
    }
    // the axis doesn't apply to everyone, and a silently-dropped remainder would be a lie
    push("na", "No active queries", GROUP_STUB.tan, agents.filter((a) => agentTurn(a, queries) === null));
    return out;
  }

  if (grouping === "door") {
    for (const k of DOOR_ORDER) {
      push(k, DOOR_LABEL[k], DOOR_STUB[k], agents.filter((a) => agentDoor(a) === k));
    }
    return out;
  }

  for (const tier of [5, 4, 3, 2, 1]) {
    push(`s${tier}`, TIER_WORD[tier - 1], GROUP_STUB.gold, agents.filter((a) => (a.starRating || 0) === tier), tier);
  }
  push("s0", "Not yet rated", GROUP_STUB.tan, agents.filter((a) => !a.starRating));
  return out;
}

/* (The domestic/international location filter is superseded: the popover filters by the actual
   COUNTRIES in use, with counts, which is both more precise and self-explanatory. `agentTerritory`
   still serves the card's home-market flag rule.) */

/* ── the filter SET (rebuild v2): four independent facets, ANDed ─────────────
   Within one facet the ticks are alternatives (OR); across facets they narrow (AND) — which is
   what fixes the old union bug: ticking "Active queries" AND "Awaiting your pages" now returns
   the intersection a reader expects, because they live on different axes. An empty facet means
   "no constraint", never "nothing". */

export interface AgentFilterSet {
  standing: AgentStanding[];
  turn: Exclude<AgentTurn, null>[];
  /** Their door — its own facet, because it is its own axis. */
  door: AgentDoor[];
  /** Minimum star rating(s) ticked; the LOWEST tick wins, so 4+ and 3+ together read as 3+. */
  stars: number[];
  /** ISO country codes. */
  loc: string[];
}

export const emptyFilterSet = (): AgentFilterSet => ({ standing: [], turn: [], door: [], stars: [], loc: [] });

export const filterCount = (f: AgentFilterSet): number =>
  f.standing.length + f.turn.length + f.door.length + f.stars.length + f.loc.length;

export const isFilterSetEmpty = (f: AgentFilterSet): boolean => filterCount(f) === 0;

export function matchesFilterSet(agent: Agent, queries: Query[], f: AgentFilterSet): boolean {
  if (f.standing.length && !f.standing.includes(agentStanding(agent, queries))) return false;
  if (f.turn.length) {
    const t = agentTurn(agent, queries);
    if (!t || !f.turn.includes(t)) return false;
  }
  if (f.door.length && !f.door.includes(agentDoor(agent))) return false;
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
  // "weeks", never "wks" (agent-list-fixes P3) — the card front has room for the word.
  // NO-REPLY-MEANS-NO is REMOVED from the card front: it is detail for when you are writing to
  // them, not for scanning. It stays in the editor and stays stored — nothing is lost.
  return [weeks && weeks > 0 ? `~${weeks} weeks` : "response unknown", methodShort(agent)];
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

/* ══════════════════════════════════════════════════════════════════════════════
   THE PAGE'S THREE STATES — loading · blank account · list
   ══════════════════════════════════════════════════════════════════════════════ */

/**
 * What the Contact list is currently showing.
 *
 * ⚠️ THREE, NOT TWO, AND THE THIRD IS THE ONE THAT BITES. `agents.length === 0` means "loading OR
 * empty": the collections arrive over a live snapshot, so a page that branches on the count alone
 * paints its first-run state for a beat on every refresh and then swaps it for a list. That is the
 * flash the editorial empty state must never have, and it is why `collectionsReady` — the flag
 * `db.tsx` raises once manuscripts, agents AND queries have each delivered a first snapshot, and
 * which the Dashboard has always read — is an input rather than an afterthought.
 *
 * ⚠️ AND `adding` IS NOT AN EDGE CASE — it is the FIRST thing that happens on a blank account.
 * The page's own `onAddAgent` mints an UNSAVED stub that lives in the grid and not in `agents`, so
 * a writer who has just pressed "Add your first agent" still has `agentCount === 0`. Without this
 * input the new card would be created, focused and scrolled to, and then rendered behind the empty
 * state that offered it.
 *
 * Pure, so the gate can be asserted without a browser: a static render cannot press a button, and
 * a source lock reading the predicate off the component would prove it was written, not that it
 * decides anything.
 */
export type ContactListState = "settling" | "blank" | "list";

export interface ContactListStateInput {
  /** `collectionsReady` from the db context — never a count-derived guess. */
  collectionsReady: boolean;
  /** How many agents are ON FILE. Excludes the unsaved stub, which is what `adding` carries. */
  agentCount: number;
  /** An unsaved new-agent card is open in the grid. */
  adding: boolean;
}

export const contactListState = ({
  collectionsReady,
  agentCount,
  adding,
}: ContactListStateInput): ContactListState => {
  /* An agent on file, or one being written, is a list — whatever the flag says. Waiting for
     `collectionsReady` when there is demonstrably something to draw would blank a page that has
     already loaded its own collection while another was still in flight. */
  if (agentCount > 0 || adding) return "list";
  return collectionsReady ? "blank" : "settling";
};
