/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * WHICH SEND A REQUEST ASKS FOR — one reading, for every surface that logs or names a send (Next up v1.1).
 *
 * ⚠️ THE STATUS ALONE CANNOT SAY IT. An agent told about an offer elsewhere who answers "send me the full" leaves their
 * query at Queried, Partial requested, Partial sent or Full requested, with `offerReply: "full"` and `offerRefQueryId`
 * set (the offer journey's "The others" step) — and the "Send the full" task (`offer_send_full`, lib/db.tsx) hangs on
 * that query. Read from the status alone, everything but Full requested came out "partial": the sent journey opened
 * as a partial and its save recorded Partial Sent, and the To-do desk's own copy of the reading did the same. That
 * was two copies of one rule; this is the one now, read by SentJourney, the desk's send flow and its words.
 *
 * Order: a revision first (the agent's latest ask is the revision, whatever an earlier offer reply said), then a full
 * — asked for directly, or as the answer to an offer — then a partial.
 */
import { QueryStatus, type Query } from "../../types";

export type SentKind = "partial" | "full" | "rr";

export function sendKindOf(q: Pick<Query, "status" | "offerReply" | "offerRefQueryId">): SentKind {
  if (q.status === QueryStatus.REVISE_RESUBMIT) return "rr";
  if (q.status === QueryStatus.FULL_REQUESTED) return "full";
  if (q.offerReply === "full" && !!q.offerRefQueryId) return "full";
  return "partial";
}
