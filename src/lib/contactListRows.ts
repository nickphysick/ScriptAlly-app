/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list rows v1 · Phase 2 — THE ROW'S NEXT ACTION, under the Query status track.
 *
 * ⚠️ THE WORDS ARE THE QUERY CARD'S OWN. The query card's Next box already words a query's next move (lib/qc1512
 *    `rowAct`: "Nudge", "Send your partial", "Send your full", "Answer the offer", "Close it", "Record a response"), and
 *    it opens the same journeys. The row says what the card says; it never keeps a second table of words. Where that
 *    source has nothing — an agent not yet queried — the design ref's "Log a query" is used.
 * ⚠️ YOUR MOVE IS `stand`, the disc's "!" (lib/contactList `agentFacts`, through queryCentreGroups `isYourMoveRow`): a
 *    request for the partial or full, an offer, or a reply date passed. A your-move action shows at rest, in rust; any
 *    other shows on row hover or focus. One fact draws both, so the "!" and the rust never disagree.
 * Closed queries, and agents closed to queries that were never queried, have no action.
 */
import type { DrawerMode } from "./queryActions/drawerStore";
import { rowAct } from "./qc1512";
import type { AgentFacts } from "./contactList";

export interface RowAction {
  label: string;
  /** the journey it opens: a drawer mode ("log" for an agent not yet queried) */
  mode: DrawerMode;
  /** your move: shown at rest, in rust */
  ym: boolean;
}

export const LOG_A_QUERY = "Log a query";

export function rowActionOf(x: Pick<AgentFacts, "q" | "stand" | "door">, nowMs: number): RowAction | null {
  if (!x.q || x.stand === "none") return x.door === "closed" ? null : { label: LOG_A_QUERY, mode: "log", ym: false };
  if (x.stand === "closed") return null;
  const a = rowAct(x.q, nowMs);
  return a ? { label: a.label, mode: a.mode, ym: x.stand === "you" } : null;
}
