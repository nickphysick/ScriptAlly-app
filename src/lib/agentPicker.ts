/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * STAGE 1'S PICKER — the card grid that replaced the combobox popup.
 *
 * ⚠️ THE GRID *IS* THE RESULT SET. The field used to be a combobox whose listbox opened on focus,
 * and because stage 1 autofocuses the field, the pane arrived with an expanded, empty popup hanging
 * under it. That was read as two faults — a clunky arrival and a void beneath the field — and it is
 * one: a results overlay with nothing to show, opened before anyone asked for results. Removing the
 * overlay and rendering the contacts in place fixes both, because there is no longer a state in
 * which results are hidden.
 *
 * Everything here is DERIVED from the agents and queries the page already holds — no new read, no
 * listener, no stored "unqueried" flag that would be wrong the first time a query was logged from
 * another surface.
 */
import type { Agent, Query } from "../types";
import { isTerminalStatus } from "./agentList";
import { agentPrimary, agentAgencyLine } from "./agentDisplay";

/**
 * The grid shows a working set, not the whole address book — a hundred cards is a directory, and
 * the writer came here to pick one agent, not to browse. "See all" carries the rest.
 */
export const PICKER_LIMIT = 8;

export type PickerState = "cold" | "grid" | "all-queried";

/**
 * Which of the three stage-1 states applies.
 *
 * ⚠️ "COLD" MEANS NO CONTACTS AT ALL, not "nobody to suggest". The two empty states are different
 * situations and get different screens: a new account has nothing to pick from and needs a way to
 * add someone, whereas a writer who has queried everyone has a full address book and an
 * achievement. Collapsing them would tell one of those two people the wrong thing.
 */
export function pickerState(agents: Agent[], queries: Query[]): PickerState {
  if (agents.length === 0) return "cold";
  return unqueried(agents, queries).length > 0 ? "grid" : "all-queried";
}

/**
 * ⚠️ NEVER QUERIED MEANS NEVER — not "no OPEN query". An agent who passed on your last book is a
 * decision, not a suggestion; the duplicate notice raises prior history after you choose. Set-aside
 * agents are excluded for the same reason: offering one would undo that decision every time create
 * mode opened.
 */
function unqueried(agents: Agent[], queries: Query[]): Agent[] {
  const queried = queriedAgentIds(queries);
  return agents.filter((a) => !queried.has(a.id) && a.setAside !== true);
}

/**
 * ⚠️ ONE SELECTOR FOR "HAS THIS AGENT BEEN QUERIED", and everything that answers that question
 * reads it. The all-queried panel said "16 of 16 contacts queried" while every row beneath it was
 * marked "Not queried" — two components reading different sources for one fact. The rows were
 * wrong: they were handed an EMPTY set by their caller, so nothing could ever look queried. A
 * shared derivation is what makes that disagreement impossible rather than merely fixed.
 */
export function queriedAgentIds(queries: Query[]): Set<string> {
  return new Set(queries.map((q) => q.agentId).filter(Boolean));
}

/** Name and agency, the two things a card shows. Never the id, never notes. */
export function matchesQuery(a: Agent, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return `${agentPrimary(a)} ${agentAgencyLine(a)}`.toLowerCase().includes(needle);
}

export interface PickerResult {
  cards: Agent[];
  /** How many matched before the cap — what "See all" is offering to show. */
  matched: number;
  /** Every contact on file, which is what the heading counts. */
  total: number;
  truncated: boolean;
}

/**
 * THE GRID — a STANDING set of suggestions: the agents you have never queried, newest first,
 * because the one you meant is usually someone you added last week and never got round to.
 *
 * ⚠️ IT DOES NOT FILTER AS YOU TYPE. It used to, and that made the page reshuffle under the
 * writer on every keystroke — the thing they were reaching for moved while they reached. Typing is
 * the DROPDOWN's job; the grid stays where it was put, so a writer who types two letters and
 * changes their mind still sees the same cards in the same places.
 */
export function pickerCards(
  agents: Agent[],
  queries: Query[],
  limit: number = PICKER_LIMIT,
): PickerResult {
  const sorted = unqueried(agents, queries)
    .slice()
    .sort((a, b) => Date.parse(b.dateAdded || "0") - Date.parse(a.dateAdded || "0"));
  return {
    cards: sorted.slice(0, limit),
    matched: sorted.length,
    total: agents.length,
    truncated: sorted.length > limit,
  };
}

/** "Queried 12 Jun" / "Not queried" — read from the ONE selector, never from a caller's guess. */
export function queryHistoryLabel(a: Agent, queries: Query[], now: number = Date.now()): string {
  const mine = queries.filter((q) => q.agentId === a.id);
  if (mine.length === 0) return "Not queried";
  const latest = mine
    .map((q) => String(q.dateSent ?? ""))
    .filter(Boolean)
    .sort()
    .pop();
  /* ⚠️ THE SAME GUARD AS THE PLATE, AND FOR THE SAME REASON. This parsed without a NaN check and
     would have printed "Queried Invalid Date NaN" on any record the plate would have skipped —
     the second instance of one fault, found by looking for siblings rather than fixing the one
     that was reported. A record with an unusable date says only that it was queried. */
  const label = plateDate(latest);
  return label ? `Queried ${label}` : "Queried";
}

/**
 * THE DROPDOWN — a typeahead over EVERY contact, queried or not.
 *
 * ⚠️ IT MUST NOT HIDE THE AGENTS YOU HAVE ALREADY QUERIED. A second query to the same agent is a
 * real thing writers do — a resubmission, a different book — and in the all-queried state it is
 * the only thing left to do. Each row states its history instead, so the writer is told rather
 * than prevented.
 */
export function dropdownResults(
  agents: Agent[],
  query: string,
  limit: number = PICKER_LIMIT,
): Agent[] {
  return agents
    /* ⚠️ AN EMPTY QUERY LISTS EVERYONE. Opening the list is an act of browsing as much as of
       searching — the writer asked to see their contacts, and answering with nothing would make
       the control useless until they had already guessed a name. */
    .filter((a) => a.setAside !== true && matchesQuery(a, query))
    .slice()
    /* ⚠️ ALPHABETICAL, AND DELIBERATELY NEUTRAL. Newest-first is a recommendation about which
       contact matters, and rating-descending is the same recommendation wearing a search's
       clothes — which is why the stars went. A list you can predict the shape of is a list you can
       scan; the writer knows the name they are looking for. */
    .sort((a, b) => agentPrimary(a).localeCompare(agentPrimary(b), "en-GB"))
    .slice(0, limit);
}

/** "12 of 12" — the all-queried state's count, stated rather than implied. */
export function queriedCount(agents: Agent[], queries: Query[]): { done: number; total: number } {
  const queried = queriedAgentIds(queries);
  const live = agents.filter((a) => a.setAside !== true);
  return { done: live.filter((a) => queried.has(a.id)).length, total: live.length };
}

/**
 * The card's response-time line. Absent is ABSENT — no "—", no "unknown", no zero.
 * A card with one fewer line is quieter than a card asserting it does not know something.
 */
export function replyLine(a: Agent): string | null {
  const w = a.responseTimeWeeks;
  return typeof w === "number" && w > 0 ? `~${w} ${w === 1 ? "week" : "weeks"}` : null;
}

/**
 * Keyboard traversal within the grid, in DOM order.
 *
 * ⚠️ ±1 IN DOM ORDER, NOT TWO-DIMENSIONAL. The grid is `auto-fill`, so its column count is a
 * function of the rendered width and is not knowable here — a "move down one row" that guessed the
 * column count would jump somewhere the writer did not point at, and would guess differently at
 * every viewport. Stepping by one is predictable, always lands on a card, and matches how the
 * popup this replaced behaved.
 *
 * Returns -1 to mean "leave the grid and go back to the field", which is what ↑ from the first
 * card does — the field is above the grid, so up out of it is the only honest answer.
 */
export function moveInGrid(index: number, key: string, count: number): number | null {
  if (count === 0) return null;
  if (key === "ArrowDown" || key === "ArrowRight") return Math.min(index + 1, count - 1);
  if (key === "ArrowUp" || key === "ArrowLeft") return index <= 0 ? -1 : index - 1;
  return null;
}


/* ══ THE FOLDED ALL-QUERIED BLOCK (ref 77-folded-nameplates.html) ══════════════════════════
   ⚠️ SUPERSEDES A GRID OF ALREADY-QUERIED CARDS, and the reason is worth keeping. A grid says
   "choose from these" — it is the shape this component uses to RECOMMEND — and nothing in this set
   is being recommended: they have all been queried. It also made the writer scroll past sixteen
   entries they had come here to bypass. Folded, the state is one sentence and the names are there
   if wanted. */

/**
 * ⚠️ TWO STATES, FROM `isTerminalStatus` — the app's existing split, not a second one.
 * `active` covers offer, partial requested, full requested and everything else still open;
 * `previous` covers rejected, withdrawn and no response. **Offer counts as ACTIVE** (CLAUDE.md's
 * agent-list law), because a live offer is the most open a conversation gets.
 */
export type PlateState = "active" | "previous";

export interface Nameplate {
  agent: Agent;
  state: PlateState;
  /** yyyy-mm-dd, or "" when the record has no usable date. */
  sentOn: string;
  /** "14 Mar 2024", or null — an unparseable or absent date renders NOTHING. */
  sentLabel: string | null;
}

/**
 * ⚠️ THE YEAR IS ALWAYS PRESENT. Elsewhere the app drops it for the current year, which is right
 * for a list you are working through this week; here the whole point is how long ago something
 * went, and "14 Mar" beside "14 Mar 2024" invites the reader to assume they are the same year.
 *
 * ⚠️ AND AN UNPARSEABLE DATE RENDERS NOTHING AT ALL. `new Date(junk)` yields an Invalid Date whose
 * `toLocaleDateString` is the literal string "Invalid Date", and `getFullYear()` is `NaN` — which
 * is exactly how "Invalid Date NaN" reached the screen. Guarding the FORMATTER is what stops a bad
 * record printing an error message at the writer; the record itself is a separate fault.
 */
export function plateDate(iso: string | null | undefined): string | null {
  const raw = String(iso ?? "").trim();
  if (!raw) return null;
  const d = new Date(raw.length === 10 ? raw + "T00:00:00" : raw);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getDate()} ${d.toLocaleString("en-GB", { month: "short" })} ${d.getFullYear()}`;
}

/**
 * ⚠️ NEVER SUBSTITUTES ONE FIELD FOR ANOTHER. `agentPrimary` falls back to the agency when a name
 * is missing, which is right for a line that just needs to say who this record is about — and
 * wrong on a NAMEPLATE, where it renders "Penhallow Literary" as a person. An agency is not a
 * name; where there is no name, say so.
 */
export function plateName(a: Agent): string {
  const name = String(a.name ?? "").trim();
  return name || "Unnamed contact";
}

/**
 * Every queried contact as a nameplate, most recent send first.
 *
 * ⚠️ ORDERED BY DATE, NEVER BY STATE. Sorting the still-open ones to the top would put them
 * forward, and nothing in this set is being put forward. Records with no usable date sort last —
 * they cannot claim a position in a chronology they are not in.
 */
export function nameplates(agents: Agent[], queries: Query[]): Nameplate[] {
  const out: Nameplate[] = [];
  for (const a of agents) {
    if (a.setAside === true) continue;
    const mine = queries.filter((q) => q.agentId === a.id);
    if (mine.length === 0) continue;
    const latest = mine
      .slice()
      .sort((x, y) => String(x.dateSent ?? "").localeCompare(String(y.dateSent ?? "")))
      .pop()!;
    const sentOn = String(latest.dateSent ?? "");
    out.push({
      agent: a,
      state: isTerminalStatus(latest.status as never) ? "previous" : "active",
      sentOn,
      sentLabel: plateDate(sentOn),
    });
  }
  return out.sort((x, y) => (y.sentOn || "").localeCompare(x.sentOn || ""));
}

/** "You have queried all 16 contacts for this manuscript — 9 still waiting, 7 concluded." */
export function foldedLine(plates: Nameplate[], manuscriptTitle?: string): string {
  const total = plates.length;
  const active = plates.filter((p) => p.state === "active").length;
  const book = manuscriptTitle ? ` for ${manuscriptTitle}` : "";
  const noun = total === 1 ? "contact" : "contacts";
  return `You have queried all ${total} ${noun}${book} — ${active} still waiting, ${total - active} concluded.`;
}
