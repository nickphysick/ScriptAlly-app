/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QUICK PICKS — stage 1's right column (ref design-refs/qc-stage1.html, option 2).
 *
 * The agents on your contact list you have never queried, newest first. It answers the question
 * the blank search field cannot: "who was I going to send this to?" — which for most writers is
 * someone they added last week and have not got round to.
 *
 * ⚠️ DERIVED, NEVER STORED. No new query, no new listener, no cached list: this is a filter over
 * the agents and queries the page is already holding. A stored "unqueried" flag would be one
 * more thing to keep in step with every send, and it would be wrong the first time someone
 * logged a query from another surface.
 *
 * ⚠️ NEVER QUERIED MEANS NEVER — not "no OPEN queries". An agent who passed on your last book is
 * not a quick pick for this one: they are a decision, not a suggestion. The duplicate warning in
 * the form column is where prior history gets raised, and it does that after you choose.
 */
import type { Agent, Query } from "../types";

/** Five is the ref's cap, and there is deliberately no "show more". */
export const QUICK_PICK_LIMIT = 5;

/**
 * @param now  Injected for tests; the sort reads `dateAdded` only.
 */
export function quickPicks(
  agents: Agent[],
  queries: Query[],
  limit: number = QUICK_PICK_LIMIT,
): Agent[] {
  const queried = new Set(queries.map((q) => q.agentId).filter(Boolean));
  return agents
    .filter((a) => !queried.has(a.id))
    /* Set-aside agents are ones you have decided NOT to pursue. Offering them as a suggestion
       would undo that decision every time you opened create mode. */
    .filter((a) => a.setAside !== true)
    .slice()
    .sort((a, b) => Date.parse(b.dateAdded || "0") - Date.parse(a.dateAdded || "0"))
    .slice(0, limit);
}

/**
 * ⚠️ AN EMPTY PANEL IS NEVER RENDERED, and neither is a "no results" line. Both states this
 * covers are ordinary — a new account with no contacts, and a diligent writer who has queried
 * everyone — and neither is a failure worth reporting. The right column shows art instead, so
 * stage 1 keeps its two-column geometry and nothing jumps when an agent is chosen.
 */
export function hasQuickPicks(agents: Agent[], queries: Query[]): boolean {
  return quickPicks(agents, queries).length > 0;
}
