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

/** How a chip records — each maps to an EXISTING canonical write path (or the nudge flow). */
export type ComposerChipAction =
  | { kind: "record"; responseType: "partial" | "full" | "rr" | "offer" | "rejected" }
  | { kind: "mark-sent"; markKind: PrimaryMarkKind }
  | { kind: "close" } // Close query — responseType "close"; the caller picks the closingReason by bucket
  | { kind: "nudge" } // TWS P3 — fires the nudge + reminder flow, NOT a QueryStatus transition
  | { kind: "reopen" };

export interface ComposerChip {
  key: string;
  label: string;
  action: ComposerChipAction;
  /** The status this chip records — drives the StatusDot shown beside its label. */
  dotStatus: QueryStatus;
  /** primary = likely next POSITIVE step (soft pink); outcome = another possible response (neutral);
   *  terminal = Rejection (grey); reopen = dashed; nudge = the outgoing nudge chip; close = give-up
   *  "Close query" (grey, × glyph, no StatusDot). Styling only. */
  tone: "primary" | "outcome" | "terminal" | "reopen" | "nudge" | "close";
}

export interface ComposerModel {
  question: string;
  chips: ComposerChip[];
  /** TR P5 — the status's other possible outcomes, tucked behind an "Other…" expander (no "less
   *  likely from here" label — the tuck is enough). */
  otherChips: ComposerChip[];
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
// TWS P3 — the nudge chip: an outgoing touch, offered only while waiting on the agent. dotStatus =
// QUERIED so its StatusDot reads outgoing; the action fires the nudge flow, never a status change.
// TR P5 — the label reads "Nudge again" once a future follow-up reminder is already set.
const NUDGE: BaseChip = { key: "nudge", label: "Nudge", action: { kind: "nudge" }, dotStatus: QueryStatus.QUERIED };
// TR P5 — the give-up "Close query" chip: offered in overdue/grace/your-move (caller passes canClose).
// One close action; the caller (TimelineComposer) picks the closing reason by bucket.
const CLOSE: BaseChip = { key: "close", label: "Close query", action: { kind: "close" }, dotStatus: QueryStatus.NO_RESPONSE };
const tone = (c: BaseChip, t: ComposerChip["tone"]): ComposerChip => ({ ...c, tone: t });

const MARK_SENT_LABEL: Record<PrimaryMarkKind, string> = { partial: "Partial sent", full: "Full sent", resubmit: "Resubmitted" };

/** Always the same prompt — the composer asks one question and the chips carry the branching. */
const QUESTION = "What happened next?";

/**
 * The fork's chip set. Every chip renders in ONE outlined style (no fill/bold "primary"); the single
 * suggested action is distinguished only by a pulse, applied by the caller from a derived rule.
 *
 * With-agent (waiting) states show the positive next step + Rejection (the agent may pass) + the
 * outgoing Nudge + (when offered) Close query; the remaining outcomes tuck under "Other…". Your-move
 * keeps its mark-sent + Close, Rejection under "Other" (the agent isn't evaluating there).
 *
 * @param status  the query's current status
 * @param opts.canClose  offer the give-up "Close query" chip — the caller passes it in overdue/grace
 *        (waiting, past expected) and on your-move statuses. within-window waiting never offers it.
 * @param opts.hasFutureReminder  a follow-up reminder is already set → the Nudge chip reads
 *        "Nudge again" (you're chasing a query you've already nudged).
 */
export function composerChips(status: QueryStatus, opts: { canClose?: boolean; hasFutureReminder?: boolean } = {}): ComposerModel {
  const bucket = queryBucket(status);
  const closeChip = tone(CLOSE, "close");

  if (bucket === "closed") {
    return { question: "This query is closed.", chips: [tone(REOPEN, "reopen")], otherChips: [] };
  }

  if (bucket === "move") {
    // The pink/primary chip IS getPrimaryAction's mark-sent target — the composer can't diverge
    // from the CTA. Rejection moves under "Other" (TR P5 — the writer owes materials; a rejection
    // is possible but not the primary path).
    const pa = getPrimaryAction(status);
    const chips: ComposerChip[] = [];
    if (pa.kind === "mark-sent") {
      chips.push({ key: "mark-sent", label: MARK_SENT_LABEL[pa.markKind], action: { kind: "mark-sent", markKind: pa.markKind }, dotStatus: pa.target, tone: "primary" });
    }
    if (opts.canClose) chips.push(closeChip);
    return { question: QUESTION, chips, otherChips: [tone(REJECTION, "terminal")] };
  }

  // bucket === "waiting" — the agent holds it. The positive next step + Rejection (a visible primary:
  // the agent is evaluating, so passing is a real outcome) + Nudge(/again) + optional Close query; the
  // remaining outcomes tuck under "Other…" (from Queried, Full requested stays there).
  const nudgeChip = tone({ ...NUDGE, label: opts.hasFutureReminder ? "Nudge again" : "Nudge" }, "nudge");
  let primary: BaseChip;
  let otherChips: ComposerChip[];
  switch (status) {
    case QueryStatus.QUERIED:
      primary = PARTIAL_REQ;
      otherChips = [tone(FULL_REQ, "outcome"), tone(OFFER, "outcome"), tone(RR, "outcome")];
      break;
    case QueryStatus.PARTIAL_SENT:
      primary = FULL_REQ;
      otherChips = [tone(OFFER, "outcome"), tone(RR, "outcome")];
      break;
    case QueryStatus.FULL_SENT:
    default:
      primary = OFFER;
      otherChips = [tone(RR, "outcome")];
      break;
  }
  const chips: ComposerChip[] = [tone(primary, "primary"), tone(REJECTION, "terminal"), nudgeChip];
  if (opts.canClose) chips.push(closeChip);
  return { question: QUESTION, chips, otherChips };
}
