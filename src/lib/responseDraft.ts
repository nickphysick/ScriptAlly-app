/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * RECORDING A RESPONSE — the draft, and what each outcome means (ref 83-record-response.html).
 *
 * Where create mode asks "who are you querying", this asks "what came back, and when". Everything
 * else follows from those two, which is why they are the only two the header tracks and the only
 * two Save waits for.
 *
 * ⚠️ NOTHING HERE WRITES. The draft is local state until Save, which goes through
 * `recordQueryResponse` — the app's single response-write path, which appends the activity carrying
 * its `resultingStatus` and lets `recomputeQuery` derive status, response count, revision round and
 * every pipeline date. This module maps outcomes to statuses; it never sets one.
 */
import { QueryStatus } from "../types";
import type { RecordResponseData } from "./recordResponse";

/**
 * The six things that can come back.
 *
 * ⚠️ WITHDRAWN IS DELIBERATELY ABSENT, and its absence is a decision rather than an oversight.
 * Withdrawing is not a response: nothing came back, the writer pulled out. It has no place in a
 * list answering "what came back?" — it belongs with the query's own actions (§5's Withdraw), and
 * that action exists precisely so removing "Mark closed" from the toolbar does not make the status
 * unreachable.
 */
export type ResponseOutcome =
  | "partial" | "full" | "rr" | "offer" | "rejected" | "noreply";

/**
 * ⚠️ EVERY OUTCOME MAPS TO AN EXACT `QueryStatus` MEMBER, never a string that looks like one.
 * The enum's values carry spellings a literal will get wrong — "Revise & Resubmit" has an
 * ampersand, "No Response" a space — and a near-miss would write a status nothing else in the app
 * recognises, which recomputes into a query that has quietly left the pipeline.
 */
export const OUTCOME_STATUS: Record<ResponseOutcome, QueryStatus> = {
  partial: QueryStatus.PARTIAL_REQUESTED,
  full: QueryStatus.FULL_REQUESTED,
  rr: QueryStatus.REVISE_RESUBMIT,
  offer: QueryStatus.OFFER,
  rejected: QueryStatus.REJECTED,
  noreply: QueryStatus.NO_RESPONSE,
};

/** What `recordQueryResponse` calls each of these — its own vocabulary, mapped once. */
export const OUTCOME_RESPONSE_TYPE: Record<ResponseOutcome, RecordResponseData["responseType"]> = {
  partial: "partial",
  full: "full",
  rr: "rr",
  offer: "offer",
  rejected: "rejected",
  noreply: "close",
};

export const OUTCOME_ORDER: readonly ResponseOutcome[] = [
  "partial", "full", "rr", "offer", "rejected", "noreply",
] as const;

/** The name and the one line beneath it. Plain description — the app reports, never appraises. */
export const OUTCOME_LABEL: Record<ResponseOutcome, string> = {
  partial: "Partial requested",
  full: "Full requested",
  rr: "Revise & resubmit",
  offer: "Offer",
  rejected: "Rejection",
  noreply: "Closed — no reply",
};
export const OUTCOME_DESC: Record<ResponseOutcome, string> = {
  partial: "They want to read more",
  full: "They want the manuscript",
  rr: "Changes, then send again",
  offer: "Representation offered",
  rejected: "A pass",
  noreply: "Their stated window has passed",
};

/**
 * Which mark an outcome wears, in the StatusDot language.
 *
 * ⚠️ THREE FAMILIES, AND NO RED ANYWHERE. Incoming sage for things the agent did, burgundy for an
 * offer, muted grey for endings. A rejection is grey, not red: the app reports what happened and
 * does not tell the writer how to feel about it — and red would be the app having an opinion in
 * the one place a writer is least likely to want one.
 */
export type OutcomeTone = "in" | "offer" | "shut";
export const OUTCOME_TONE: Record<ResponseOutcome, OutcomeTone> = {
  partial: "in", full: "in", rr: "in",
  offer: "offer",
  rejected: "shut", noreply: "shut",
};

/** Which step flow an outcome opens — §2 builds the bodies; the shape is decided here. */
export type ResponseJourney = "request" | "offer" | "ending";
export const OUTCOME_JOURNEY: Record<ResponseOutcome, ResponseJourney> = {
  partial: "request", full: "request", rr: "request",
  offer: "offer",
  rejected: "ending", noreply: "ending",
};

export interface ResponseDraft {
  outcome: ResponseOutcome | null;
  /** ISO yyyy-mm-dd — when the reply arrived. */
  dateArrived: string;
  notes: string;
}

export const emptyResponseDraft = (dateArrived: string): ResponseDraft => ({
  outcome: null,
  dateArrived,
  notes: "",
});

/**
 * ⚠️ SAVE WAITS FOR TWO FACTS AND NOTHING ELSE — the outcome and the date. Everything the later
 * steps collect is detail about a response that already happened, and a writer who only wants to
 * record that an agent passed should not be walked through three panels to say so. This is the same
 * required-≠-sequential rule the create stack is built on; there is a test asserting Save is live
 * while later steps are unvisited.
 */
export const responseReady = (d: ResponseDraft): boolean =>
  d.outcome !== null && d.dateArrived.trim() !== "";

/** The header's two chips, in the three-state mark language (empty · dash pre-filled · tick). */
export type ChipState = "empty" | "prefilled" | "done";
export interface ResponseChip { key: "outcome" | "date"; label: string; state: ChipState }

/**
 * ⚠️ A TICK MEANS CONFIRMED, AND A DASH MEANS "WE FILLED THIS IN". The date arrives pre-filled with
 * today, which is right far more often than not — but pre-filling is not the writer agreeing, so it
 * takes the dash until the step carrying it has been opened. The outcome has no default and so is
 * simply empty until chosen. Same grammar as create's header, and for the same reason: an outlined
 * tick still reads as done.
 */
export function responseChips(d: ResponseDraft, opened: { when: boolean }): ResponseChip[] {
  return [
    { key: "outcome", label: "Outcome", state: d.outcome ? "done" : "empty" },
    {
      key: "date",
      label: "Date",
      state: !d.dateArrived ? "empty" : opened.when ? "done" : "prefilled",
    },
  ];
}

/**
 * How long they took, stated as a fact.
 *
 * ⚠️ NO COMMENT ON WHETHER THAT IS FAST OR SLOW. "Replied in 6 days" is information; "quick reply!"
 * is the app having an opinion about someone else's agency, and it would be wrong about as often as
 * it was right. Returns null when it cannot be computed rather than guessing at a number.
 */
export function repliedIn(sentISO: string | undefined, arrivedISO: string): string | null {
  if (!sentISO || !arrivedISO) return null;
  const a = Date.parse(`${sentISO.slice(0, 10)}T00:00:00`);
  const b = Date.parse(`${arrivedISO.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  const days = Math.round((b - a) / 86_400_000);
  if (days < 0) return null;
  if (days === 0) return "Replied the same day";
  return `Replied in ${days} day${days === 1 ? "" : "s"}`;
}

/**
 * The draft, as `recordQueryResponse` wants it.
 *
 * ⚠️ BUILT EXPLICITLY, NEVER CAST. `RecordResponseData` has eighteen fields because it serves the
 * rich form as well; casting an empty object through it would typecheck and then hand the write
 * path `undefined` where it expects strings. Everything this journey does not yet collect is
 * stated as empty here, which is a claim we can actually make — §2 fills the per-outcome fields in.
 *
 * `closingReason` matters: "No response after expected window" is what keeps a "Closed — no reply"
 * mapping to NO_RESPONSE. The one value that would divert it to WITHDRAWN is "Withdrew my
 * submission", which this journey never sends — withdrawing is not a response (§5 owns it).
 */
export function responseDraftToPayload(d: ResponseDraft): RecordResponseData {
  if (!d.outcome) throw new Error("responseDraftToPayload: no outcome chosen");
  return {
    responseType: OUTCOME_RESPONSE_TYPE[d.outcome],
    dateReceived: d.dateArrived,
    /* The writer's note rides as the response's own text. */
    feedbackText: d.notes,
    feedbackType: d.notes.trim() ? "Yes" : "No",
    rrNotes: d.outcome === "rr" ? d.notes : "",
    /* §2 collects these; stated empty rather than guessed. */
    materialsType: "Pages",
    materialsQuantity: 0,
    materialsOtherText: "",
    expectedBy: "",
    sendReminderDate: "",
    privateReflection: "",
    rejectionLesson: "",
    requeryPreference: "",
    offerDate: d.outcome === "offer" ? d.dateArrived : "",
    offerDeadline: "",
    offerNotes: d.outcome === "offer" ? d.notes : "",
    closingReason: "No response after expected window",
    closingNotes: d.outcome === "noreply" ? d.notes : "",
  };
}
