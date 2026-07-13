/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * composerChips — the Timeline composer's chip set (interaction layer, Stage 5a).
 *
 * Built ON the shipped CTA engine, NEVER a fork: the writer's-turn primary chip is taken straight
 * from `getPrimaryAction(status)` (same mark-sent target the control-bar CTA + the "Your move"
 * panel show), and the turn split is `queryBucket(status)`. So the composer and the CTA panel read
 * the same source and cannot disagree (locked by composerChips.test.ts + verified in the sweep).
 *
 * Each chip carries the ACTION it records, routed to the existing canonical paths — response chips
 * → recordQueryResponse (responseType), mark-sent chips → the MarkSentPopover flow (markKind),
 * reopen → recordQueryResponse "queried". This module invents no writer; it only decides which
 * chips a status offers. Pure, no React/Firebase.
 */
import { QueryStatus } from "../types";
import { getPrimaryAction, type PrimaryMarkKind } from "./queryPrimaryAction";
import { queryBucket } from "./queryAmbient";

/** How a chip records — each maps to an EXISTING canonical write path. */
export type ComposerChipAction =
  | { kind: "record"; responseType: "partial" | "full" | "rr" | "offer" | "rejected" }
  | { kind: "mark-sent"; markKind: PrimaryMarkKind }
  | { kind: "close" } // No response — close it (responseType "close", closingReason set by the caller)
  | { kind: "reopen" };

export interface ComposerChip {
  key: string;
  label: string;
  action: ComposerChipAction;
  /** primary = mirrors getPrimaryAction; outcome = a possible agent response; terminal = always-
   *  available close; reopen. Drives chip styling only. */
  tone: "primary" | "outcome" | "terminal" | "reopen";
}

export interface ComposerModel {
  question: string;
  chips: ComposerChip[];
}

const REJECTION: ComposerChip = { key: "rejected", label: "Rejection", action: { kind: "record", responseType: "rejected" }, tone: "terminal" };
const OFFER: ComposerChip = { key: "offer", label: "Offer", action: { kind: "record", responseType: "offer" }, tone: "outcome" };
const PARTIAL_REQ: ComposerChip = { key: "partial-req", label: "Partial requested", action: { kind: "record", responseType: "partial" }, tone: "outcome" };
const FULL_REQ: ComposerChip = { key: "full-req", label: "Full requested", action: { kind: "record", responseType: "full" }, tone: "outcome" };
const RR: ComposerChip = { key: "rr", label: "Revise & resubmit", action: { kind: "record", responseType: "rr" }, tone: "outcome" };
const REOPEN: ComposerChip = { key: "reopen", label: "Reopen this query", action: { kind: "reopen" }, tone: "reopen" };

const MARK_SENT_LABEL: Record<PrimaryMarkKind, string> = { partial: "Partial sent", full: "Full sent", resubmit: "Resubmitted" };

/**
 * @param status  the query's current status
 * @param opts.canCloseNoResponse  true once the agent's stated window has passed — appends the
 *        `[ No response — close it ]` chip (5a/6c). The caller derives it from the agent's response
 *        guidelines + days waiting; this module never decides it (and never auto-closes).
 */
export function composerChips(status: QueryStatus, opts: { canCloseNoResponse?: boolean } = {}): ComposerModel {
  const bucket = queryBucket(status);

  if (bucket === "closed") {
    return { question: "This query is closed.", chips: [REOPEN] };
  }

  if (bucket === "move") {
    // The primary chip IS getPrimaryAction's mark-sent target — the composer can't diverge from the CTA.
    const pa = getPrimaryAction(status);
    const chips: ComposerChip[] = [];
    if (pa.kind === "mark-sent") {
      chips.push({ key: "mark-sent", label: MARK_SENT_LABEL[pa.markKind], action: { kind: "mark-sent", markKind: pa.markKind }, tone: "primary" });
    }
    chips.push(REJECTION);
    const q =
      status === QueryStatus.PARTIAL_REQUESTED ? "They’ve asked for a partial — what did you do?"
      : status === QueryStatus.FULL_REQUESTED ? "They’ve asked for the full — what did you do?"
      : "They’ve asked for a revise & resubmit — what did you do?";
    return { question: q, chips };
  }

  // bucket === "waiting" — the agent holds it; offer the responses that can follow.
  let chips: ComposerChip[];
  switch (status) {
    case QueryStatus.QUERIED:
      chips = [PARTIAL_REQ, FULL_REQ, REJECTION];
      break;
    case QueryStatus.PARTIAL_SENT:
      chips = [FULL_REQ, OFFER, REJECTION];
      break;
    case QueryStatus.FULL_SENT:
    default:
      chips = [RR, OFFER, REJECTION];
      break;
  }
  if (opts.canCloseNoResponse) {
    chips = [...chips, { key: "no-response", label: "No response — close it", action: { kind: "close" }, tone: "terminal" }];
  }
  return { question: "What happened next?", chips };
}
