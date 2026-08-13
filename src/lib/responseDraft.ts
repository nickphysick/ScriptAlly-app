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

/** The three colours a saved response can be sealed in. */
export type SealKind = "sage" | "burgundy" | "grey";

/**
 * ⚠️ THE SEAL'S COLOUR IS THE OUTCOME'S KIND, NOT ITS NAME — three families, six outcomes.
 * Sage = they asked for something (a partial, a full, a revision: work continues). Burgundy = an
 * offer. Warm grey = it ended.
 *
 * ⚠️ WARM GREY, NEVER RED, AND THAT IS THE WHOLE POINT OF THE THIRD FAMILY. A pass is the commonest
 * thing that happens to a query; sealing it in red would make the ordinary outcome of the work look
 * like an error the writer caused. An ending is closed with dignity — the app reports, it never
 * appraises.
 *
 * ⚠️ AND `rr` IS SAGE, DELIBERATELY. Revise & Resubmit reads like a setback and is a REQUEST: the
 * agent has asked for more work and wants to see it again. Grouping it with the endings would seal
 * an invitation in the colour of a door closing.
 */
export const OUTCOME_SEAL: Record<ResponseOutcome, SealKind> = {
  partial: "sage",
  full: "sage",
  rr: "sage",
  offer: "burgundy",
  rejected: "grey",
  noreply: "grey",
};

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
  /* Per-journey. Each belongs to exactly one step, which is what lets a change of outcome know
     precisely what it would discard — see STEP_FIELDS. */
  /** request — what they asked to see, and by when. */
  askedFor: string;
  deadline: string;
  /** offer — the terms, and the day they need an answer. */
  offerTerms: string;
  offerReplyBy: string;
  /** ending — their words, if the writer wants to keep them. */
  theirWords: string;
}

export const emptyResponseDraft = (dateArrived: string): ResponseDraft => ({
  outcome: null,
  dateArrived,
  notes: "",
  askedFor: "",
  deadline: "",
  offerTerms: "",
  offerReplyBy: "",
  theirWords: "",
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

/* ══ §2 · THE STACK CHANGES WITH THE OUTCOME ════════════════════════════════════════════════ */

/** Every step this journey can hold. Which of them apply depends on what came back. */
export type RespStep = "outcome" | "when" | "asked" | "offer" | "said" | "notes";

/**
 * ⚠️ THE OUTCOME DECIDES THE STACK, and the three shapes are genuinely different questions rather
 * than one question with fields hidden. A request wants to know what they asked for and by when; an
 * offer wants the terms and when they need an answer; an ending wants whatever they said, if
 * anything. Presenting all of it and hiding two thirds would make the writer read past questions
 * that do not apply to them.
 */
export const JOURNEY_STEPS: Record<ResponseJourney, readonly RespStep[]> = {
  request: ["outcome", "when", "asked", "notes"],
  offer: ["outcome", "when", "offer", "notes"],
  ending: ["outcome", "when", "said", "notes"],
};

/** The stack for a draft — before an outcome is chosen there is only the question that decides it. */
export const stepsFor = (o: ResponseOutcome | null): readonly RespStep[] =>
  o ? JOURNEY_STEPS[OUTCOME_JOURNEY[o]] : (["outcome"] as const);

export const RESP_STEP_SHORT: Record<RespStep, string> = {
  outcome: "Outcome", when: "When", asked: "What", offer: "Offer", said: "Reply", notes: "Notes",
};
export const RESP_STEP_TITLE: Record<RespStep, string> = {
  outcome: "What came back?",
  when: "When it arrived",
  asked: "What they asked for",
  offer: "The offer",
  said: "Anything they said",
  notes: "Notes",
};
export const RESP_STEP_HINT: Record<RespStep, string> = {
  outcome: "What the agent said",
  when: "The day their reply arrived",
  asked: "Materials, and any deadline",
  offer: "Terms, and when they need an answer",
  said: "Optional — their words, if you want them",
  notes: "Optional — anything worth remembering",
};
/** ⚠️ Everything after the outcome and the date is optional BY CONSTRUCTION (see responseReady). */
export const RESP_STEP_OPTIONAL: Record<RespStep, boolean> = {
  outcome: false, when: false, asked: true, offer: true, said: true, notes: true,
};

/** Which draft fields belong to which step — the basis for knowing what a change would discard. */
const STEP_FIELDS: Partial<Record<RespStep, (keyof ResponseDraft)[]>> = {
  asked: ["askedFor", "deadline"],
  offer: ["offerTerms", "offerReplyBy"],
  said: ["theirWords"],
};

/** True when the writer has actually put something into that step. */
export function stepHasContent(d: ResponseDraft, step: RespStep): boolean {
  return (STEP_FIELDS[step] ?? []).some((f) => String(d[f] ?? "").trim() !== "");
}

/**
 * Change the outcome, and report what that costs.
 *
 * ⚠️ IT DISCARDS WHAT NO LONGER APPLIES AND SAYS SO — never silently, and never by keeping it. An
 * offer's terms carried into a rejection would be an answer to a question nobody asked, riding into
 * the record; keeping the fields and hiding them is the same thing with a longer fuse. So the
 * fields are cleared, and the steps whose content went are NAMED back to the caller.
 *
 * ⚠️ AND IT ONLY SPEAKS WHEN THERE WAS SOMETHING TO LOSE. Switching between two endings before
 * typing anything drops nothing, and announcing a discard that discarded nothing teaches the writer
 * to ignore the notice — which is exactly when it matters.
 */
export function changeOutcome(
  d: ResponseDraft,
  next: ResponseOutcome,
): { draft: ResponseDraft; dropped: RespStep[] } {
  const before = stepsFor(d.outcome);
  const after = stepsFor(next);
  const leaving = before.filter((s) => !after.includes(s));
  const dropped = leaving.filter((s) => stepHasContent(d, s));
  let draft: ResponseDraft = { ...d, outcome: next };
  for (const s of leaving) {
    for (const f of STEP_FIELDS[s] ?? []) draft = { ...draft, [f]: "" };
  }
  return { draft, dropped };
}

/** The sentence the pane shows when a change cost something. */
export function droppedNotice(dropped: RespStep[]): string | null {
  if (dropped.length === 0) return null;
  const names = dropped.map((s) => RESP_STEP_TITLE[s].toLowerCase());
  const list = names.length === 1
    ? names[0]
    : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  return `Changing the outcome cleared what you'd entered under ${list}.`;
}
