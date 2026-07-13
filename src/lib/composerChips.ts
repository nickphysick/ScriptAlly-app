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
  /** The status this chip records — drives the StatusDot shown beside its label. */
  dotStatus: QueryStatus;
  /** primary = the likely next POSITIVE step (soft pink); outcome = another possible response
   *  (neutral); terminal = Rejection (always grey); reopen = dashed. Styling only. */
  tone: "primary" | "outcome" | "terminal" | "reopen";
}

export interface ComposerModel {
  question: string;
  chips: ComposerChip[];
}

// Base chips (no tone — tone is assigned per state below, since which chip is the "positive step"
// depends on the status). dotStatus drives the StatusDot beside each label.
type BaseChip = Omit<ComposerChip, "tone">;
const REJECTION: BaseChip = { key: "rejected", label: "Rejection", action: { kind: "record", responseType: "rejected" }, dotStatus: QueryStatus.REJECTED };
const OFFER: BaseChip = { key: "offer", label: "Offer", action: { kind: "record", responseType: "offer" }, dotStatus: QueryStatus.OFFER };
const PARTIAL_REQ: BaseChip = { key: "partial-req", label: "Partial requested", action: { kind: "record", responseType: "partial" }, dotStatus: QueryStatus.PARTIAL_REQUESTED };
const FULL_REQ: BaseChip = { key: "full-req", label: "Full requested", action: { kind: "record", responseType: "full" }, dotStatus: QueryStatus.FULL_REQUESTED };
const RR: BaseChip = { key: "rr", label: "Revise & resubmit", action: { kind: "record", responseType: "rr" }, dotStatus: QueryStatus.REVISE_RESUBMIT };
const REOPEN: BaseChip = { key: "reopen", label: "Reopen this query", action: { kind: "reopen" }, dotStatus: QueryStatus.QUERIED };
const tone = (c: BaseChip, t: ComposerChip["tone"]): ComposerChip => ({ ...c, tone: t });

const MARK_SENT_LABEL: Record<PrimaryMarkKind, string> = { partial: "Partial sent", full: "Full sent", resubmit: "Resubmitted" };

/** Always the same prompt — the composer asks one question and the chips carry the branching. */
const QUESTION = "What happened next?";

/**
 * @param status  the query's current status
 * @param opts.canCloseNoResponse  true once the agent's stated window has passed — appends the
 *        `[ No response — close it ]` chip (5a/6c). The caller derives it from the agent's response
 *        guidelines + days waiting; this module never decides it (and never auto-closes).
 */
export function composerChips(status: QueryStatus, opts: { canCloseNoResponse?: boolean } = {}): ComposerModel {
  const bucket = queryBucket(status);

  if (bucket === "closed") {
    return { question: "This query is closed.", chips: [tone(REOPEN, "reopen")] };
  }

  if (bucket === "move") {
    // The pink/primary chip IS getPrimaryAction's mark-sent target — the composer can't diverge
    // from the CTA. It's also the "positive step" here (the writer moving the query forward).
    const pa = getPrimaryAction(status);
    const chips: ComposerChip[] = [];
    if (pa.kind === "mark-sent") {
      chips.push({ key: "mark-sent", label: MARK_SENT_LABEL[pa.markKind], action: { kind: "mark-sent", markKind: pa.markKind }, dotStatus: pa.target, tone: "primary" });
    }
    chips.push(tone(REJECTION, "terminal"));
    return { question: QUESTION, chips };
  }

  // bucket === "waiting" — the agent holds it. Positive step (the next rung up) is PINK, then the
  // other possible response (neutral), then Rejection (always grey), last.
  let chips: ComposerChip[];
  switch (status) {
    case QueryStatus.QUERIED:
      chips = [tone(PARTIAL_REQ, "primary"), tone(FULL_REQ, "outcome"), tone(REJECTION, "terminal")];
      break;
    case QueryStatus.PARTIAL_SENT:
      chips = [tone(FULL_REQ, "primary"), tone(OFFER, "outcome"), tone(REJECTION, "terminal")];
      break;
    case QueryStatus.FULL_SENT:
    default:
      chips = [tone(OFFER, "primary"), tone(RR, "outcome"), tone(REJECTION, "terminal")];
      break;
  }
  if (opts.canCloseNoResponse) {
    chips = [...chips, { key: "no-response", label: "No response — close it", action: { kind: "close" }, dotStatus: QueryStatus.NO_RESPONSE, tone: "terminal" }];
  }
  return { question: QUESTION, chips };
}
