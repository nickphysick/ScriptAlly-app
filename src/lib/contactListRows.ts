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
 * Contact list rows v1.2 (D6/D7): every action is the small outline button, shown in the status's place on row hover or
 *    focus (with a mouse) or at the row's end (with no hover); no rust, no "!". `ym` (your move, `stand === "you"`) is
 *    kept for readers that sort or group by it.
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
