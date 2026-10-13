/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v17 §D — the row's four-bar stage track: Queried · Partial · Full · Offer.
 *
 * ⚠️ NOTHING IS DERIVED HERE THAT THE APP DOES NOT ALREADY DERIVE. How far a query got is `QcRow.furthest`
 *    (lib/qcSummary, from analytics.buildRows: it reads the history, so a request that was later sent still
 *    counts). `furthest` stops at "full"; an offer is the query's own status (Offer, or Signed after it).
 * ⚠️ A CLOSED AGENT'S TRACK SAYS NOTHING ABOUT HOW FAR IT GOT: all four bars are the closed grey. The stage
 *    line beside it carries the meaning; the track is `aria-hidden`.
 */
import { QueryStatus } from "../types";
import type { AgentFacts } from "./contactList";

export const STAGE_TRACK = ["Queried", "Partial", "Full", "Offer"] as const;

export interface StageTrack {
  /** how many bars are filled, 1 to 4; 0 when closed (all four are then the closed grey) */
  filled: 0 | 1 | 2 | 3 | 4;
  closed: boolean;
}

/** null for an agent with no query for this manuscript */
export function stageTrack(x: Pick<AgentFacts, "standing" | "q">): StageTrack | null {
  if (x.standing.kind === "none" || !x.q) return null;
  if (x.standing.kind === "closed") return { filled: 0, closed: true };
  const status = x.q.status as QueryStatus;
  if (status === QueryStatus.OFFER || status === QueryStatus.SIGNED) return { filled: 4, closed: false };
  return { filled: x.q.furthest === "full" ? 3 : x.q.furthest === "partial" ? 2 : 1, closed: false };
}

/** the disc's colour group: not queried, querying, or closed (every query closed, or closed to queries) */
export type DiscTone = "none" | "live" | "closed";
export const discTone = (x: Pick<AgentFacts, "standing" | "door">): DiscTone =>
  x.standing.kind === "closed" || (x.standing.kind === "none" && x.door === "closed") ? "closed" : x.standing.kind === "none" ? "none" : "live";
