/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * queryCardFacts — everything a Query Centre card says, derived once.
 *
 * ⚠️ IT DERIVES, IT NEVER STORES, AND IT NEVER REACHES. `recomputeQuery` is the single writer of
 * status and the pipeline dates; this module reads its output and turns it into the four things a
 * card states — whose court it is in, the leaf date, one sentence, one caption. Every input it
 * cannot get from the query itself is a PARAMETER, so a caller cannot be handed a figure this
 * function fetched from somewhere the caller did not expect.
 *
 * ⚠️ THE BAND SAYS WHOSE MOVE IT IS, NEVER WHETHER THAT IS GOOD OR BAD. There is no "late" turn and
 * no red: an overdue query keeps its own court's colour and gains an ink `!` ring plus a factual
 * line. See `design-refs/query-overdue-marker.html` for the alternatives that were refused.
 *
 * ⚠️ THE COPY IS FACTUAL AND IS LOCKED AS SUCH. "17 days since request" states a number; it does
 * not say `still`, `already`, `only` or `overdue`. `queryCardFacts.test.ts` asserts the absence of
 * that vocabulary, because the temptation arrives one adverb at a time.
 */
import { QueryStatus } from "../types";
import type { Query } from "../types";
import { resolveExpectedDate, type ExpectedSource } from "./expectedDate";
import { lastSendMs } from "./queryCentreGroups";
import { classifyQueryMaterial, type MaterialKind } from "./agentMaterials";
import { formatQueryMaterial } from "./materials";

const DAY = 86_400_000;
/** ⚠️ EXPORTED (v14 §2) so the list's Sent leaf builds its month strip from the SAME table the
 *  card's leaf does — a second array of month names is a second thing to keep in step. */
export const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/**
 * ⚠️ HOW LONG A REQUEST MAY SIT BEFORE THE CARD MARKS IT — Nick's call, and a NAMED constant so it
 * is one edit rather than a number buried in a branch. It marks the card; it does not scold. The
 * agent-side marker has no equivalent constant because it is not a threshold at all: that one
 * fires the day the expected reply passes, which is a date somebody actually stated.
 */
export const WRITER_TURN_ATTENTION_DAYS = 14;

/** Whose court the query is in. `sand` is Queried — with the agent, but not yet deeper in. */
export type Turn = "sand" | "you" | "agent" | "offer" | "closed";

/**
 * ⚠️ THE REGISTER IS WHAT THE CARD, THE LIST AND THE DRAWER ALL READ — one derivation, five values.
 *
 * It is NOT a sixth state and it is not `Turn` renamed. `Turn` is whose court a query sits in and
 * knows nothing about dates; the register splits the agent's court by whether the stated window has
 * passed, which is the distinction a reader actually acts on. Deriving it at each surface is how
 * three of them come to disagree about whether the same query needs attention — the fault this repo
 * records more than any other.
 */
export type Register = "calm" | "late" | "you" | "offer" | "closed";

/** the chip's words, per register — the one place they are spelled */
export const REGISTER_LABEL: Record<Register, string> = {
  calm: "Waiting",
  late: "Past expected",
  you: "Your move",
  offer: "Offer",
  closed: "Closed",
};

/**
 * ⚠️ DERIVED FROM THE TURN AND THE WINDOW, NEVER FROM THE STATUS DIRECTLY. `attention` is already
 * the "past the stated window" fact and is computed once, from the resolved expected date; reading
 * the status here would be a second answer to a question `cardFacts` has already asked.
 */
export const registerOf = (turn: Turn, pastWindow: boolean): Register =>
  turn === "you" ? "you"
    : turn === "offer" ? "offer"
      : turn === "closed" ? "closed"
        : pastWindow ? "late" : "calm";

/**
 * How far the query has travelled, and in which direction — the tint ladder's rung.
 *
 * ⚠️ FINER THAN `Turn`, AND BOTH ARE KEPT. `Turn` answers "whose move" in five courts and drives
 * the quick filters, the grouping and the reconciliation against `queryBucket`. `Stage` answers
 * "how far in" in eight rungs and drives nothing but paint. Collapsing them would either coarsen
 * the band back to five flat tints — where Queried and Full Sent are the same colour, which is the
 * fault the ladder exists to fix — or split the filters into eight pills nobody asked for.
 */
export type Stage = "out-1" | "out-2" | "out-3" | "in-1" | "in-2" | "in-3" | "offer" | "closed";

/**
 * THE STATE — five values, colours v2 (design-refs/query-state-colours-v2.md). Colour says whose
 * court it is and whether the journey has started; DEPTH is `StatusDot`'s alone.
 *
 * ⚠️ IT DOES NOT REPLACE `Stage`, AND THAT IS A DELIBERATE OVERLAP RATHER THAN A LEFTOVER. The
 * eight-rung ladder is retired from the Query Centre, but `stageFor` is a SHARED export: the
 * To-do stream reads it in `TodoCalendarPage` (three sites, `tl-st-{stage}` band classes) and in
 * `TaskPane` (an inline `var(--stage-{stage})`), and `calendarStageTints.test.ts` locks the
 * calendar's own mirror against `.t-f12`'s copy. Deleting it here would blank another stream's
 * live surfaces silently and redden their lock, mid-flight. Retiring `Stage` is that stream's to
 * schedule; this file states which values belong to which surface so neither drifts.
 */
export type State = "queried" | "agent" | "you" | "offer" | "closed";

/** One run of the fact sentence. Rendered as nodes — never as `innerHTML`. */
export interface Run {
  text: string;
  strong?: boolean;
}

export interface CardLeaf {
  /** `AUG` — the month strip. */
  month: string;
  /** `12` — the numeral. */
  day: number;
  /** One word, always: `sent` · `requested` · `received` · `closed`. */
  caption: string;
}

/**
 * The four fixed slots, in card order. `null` = nothing recorded for that slot.
 *
 * ⚠️ KEYED BY `MaterialKind`, WHICH IS WHAT `classifyQueryMaterial` RETURNS — so there is no
 * translation table between the classifier and the card, and none to drift. It also means the card
 * can read `MATERIAL_ROW_NAMES` for its labels rather than spelling a fifth copy of "Opening
 * sample" into a component.
 */
export type CardMaterials = Record<MaterialKind, string | null>;

export interface CardFacts {
  turn: Turn;
  /** the reader-facing register — see `registerOf`; the chip, the list and the drawer read this */
  register: Register;
  /** ⚠️ RETIRED FROM THE QUERY CENTRE, LIVE FOR THE TO-DO STREAM — see `State` above. */
  stage: Stage;
  /** The state colour's key — the token, and the card's `qcc--st-{state}` class (colours v2). */
  state: State;
  turnWord: string;
  leaf: CardLeaf | null;
  sentence: Run[];
  caption: string;
  /**
   * The caption's clauses, unjoined (v14). `caption` stays the joined string every existing reader
   * takes; a renderer that wants the ref's HAIRLINE PIPE between clauses draws it from these,
   * because a divider that is a rule cannot be a character inside a string.
   */
  captionParts: string[];
  /**
   * ⚠️ WHICH CLAUSE IS THE REMINDER, AS AN INDEX — because the quick-action anchor needs to make
   * exactly that clause a control (§4.2), and the alternative is a renderer matching the prose it
   * was handed. This file already records why that is wrong: the drawer's tray used to REGEX the
   * caption for a figure, and the day the caption changed it went on labelling a true number with
   * a false label. A view that tests `part.startsWith("Nudge agent in")` is the same mistake with
   * a shorter regex — the wording is this module's to change, and it would silently stop being a
   * control the moment it did. `null` where the caption carries no reminder clause at all.
   */
  nudgePartIndex: number | null;
  /**
   * ⚠️ HOW LONG THIS HAS BEEN WAITING, AS A NUMBER — because the drawer's stat tray was REGEXING
   * the caption for it (`/^(\d+)\s+(\w+)/`) and v14's new caption opens with a different figure
   * entirely. The tray would have gone on labelling it "waiting so far" while showing days-to-
   * expected: a true number under a false label, which is the worst shape a figure can take. The
   * tray reads this now, and the prose is free to change without moving a number underneath it.
   */
  elapsed: { value: number; unit: string };
  /** The ink `!` ring. Never a colour, never a fifth band tint. */
  attention: boolean;
  expectedReply: Date | null;
  expectedSource: ExpectedSource;
  materials: CardMaterials;
  /**
   * ⚠️ NOTHING RECORDED IS NOT THE SAME AS NOTHING SENT, so the card draws no cluster at all rather
   * than four faded slots that would read as "this went out empty".
   */
  materialsRecorded: boolean;
}

export interface CardFactsInput {
  /**
   * ⚠️ THE DECISION IS AN ACTIVITY THAT ALREADY EXISTS — no new field, and this is the correction
   * to the brief rather than a shortcut past it.
   *
   * `src/lib/offerDecision.ts` has recorded offer decisions since July: `OFFER_ACCEPTED` /
   * `OFFER_DECLINED` activities, built by `buildOfferDecisionWrites`, collected by the To-do
   * board's `FocusFlow` and written through `db.tsx`. The brief proposed an optional `decision`
   * field on the Offer activity "written by the existing Record decision surface IF ONE EXISTS" —
   * one does, and it expresses the decision as the activity's TYPE. Adding the field would be a
   * SECOND way to record one fact, which is the shape this repo has an audit about.
   *
   * So the caller derives it (`hasOfferDecision`, or the accepted/declined split) and hands it in.
   * `cardFacts` stays pure and reads no store.
   */
  offerDecision?: "accepted" | "declined" | null;
  /** The agency's stated response window, from the AGENT record. Never stored on the query. */
  agencyWeeks?: number | null;
  /** A window the agent stated in a reply, if the caller has the events to derive one. */
  replyStated?: { ms: number; statedAt: number } | null;
  /**
   * ⚠️ THE AGENT'S DISPLAY NAME, FOR THE RELATIONAL COPY — passed in, never looked up.
   * `cardFacts` takes a `Query` and knows nothing about agents; giving it a lookup would put the
   * agent store behind a pure function two views call on every render.
   */
  agentName?: string | null;
}

/* ── the two scales ──────────────────────────────────────────────────────────────────────────── */

/**
 * ⚠️ DAYS TO 20, WEEKS TO 69, THEN MONTHS. `design-refs/query-centre.html`'s `span()`, and the
 * boundaries are the point: "21 days" reads as arithmetic where "3 weeks" reads as a wait, and
 * "10 weeks" is still a wait where "70 days" is a grievance.
 */
export function span(n: number): [number, string] {
  if (n < 21) return [n, n === 1 ? "day" : "days"];
  if (n < 70) return [Math.round(n / 7), "weeks"];
  return [Math.round(n / 30.44), "months"];
}

const spanWords = (n: number): string => {
  const [v, u] = span(n);
  return `${v} ${u}`;
};

/** Whole days between two instants, rounded — the ref's `days()`. */
const daysBetween = (fromMs: number, toMs: number): number => Math.round((toMs - fromMs) / DAY);

/** `12 Aug`. */
const shortDate = (d: Date): string => `${d.getDate()} ${MON[d.getMonth()]}`;

/* ── whose court ─────────────────────────────────────────────────────────────────────────────── */

const YOU: ReadonlySet<QueryStatus> = new Set([
  QueryStatus.PARTIAL_REQUESTED,
  QueryStatus.FULL_REQUESTED,
  QueryStatus.REVISE_RESUBMIT,
]);
const AGENT: ReadonlySet<QueryStatus> = new Set([QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT]);

export function turnFor(status: QueryStatus): Turn {
  if (status === QueryStatus.QUERIED) return "sand";
  if (YOU.has(status)) return "you";
  if (AGENT.has(status)) return "agent";
  if (status === QueryStatus.OFFER) return "offer";
  return "closed";
}

/**
 * ⚠️ THE ONE MAPPING, EXPORTED — the card, the leaf, the panel header and the quick-filter swatches
 * all read it, and a second copy anywhere is how two surfaces come to paint one query differently.
 * Taken from `design-refs/query-centre.html` line 618.
 *
 * ⚠️ EXHAUSTIVE OVER THE ENUM, and the default is the SAFE one. An unrecognised status is closed,
 * which is the quiet grey — never a rung of a ladder it has not been placed on.
 */
const STAGE_OF: Partial<Record<QueryStatus, Stage>> = {
  [QueryStatus.QUERIED]: "out-1",
  [QueryStatus.PARTIAL_SENT]: "out-2",
  [QueryStatus.FULL_SENT]: "out-3",
  [QueryStatus.PARTIAL_REQUESTED]: "in-1",
  [QueryStatus.FULL_REQUESTED]: "in-2",
  [QueryStatus.REVISE_RESUBMIT]: "in-3",
  [QueryStatus.OFFER]: "offer",
};

export function stageFor(status: QueryStatus): Stage {
  return STAGE_OF[status] ?? "closed";
}

/**
 * ⚠️ THE PINK FAMILY IS "SOMETHING IS ASKED OF YOU", WHICH IS WHY R&R SITS IN IT. Partial and Full
 * Requested are the agent asking; a revise-and-resubmit is the same sentence in longer form. All
 * three are with you until you send.
 */
const STATE_OF: Partial<Record<QueryStatus, State>> = {
  [QueryStatus.QUERIED]: "queried",
  [QueryStatus.PARTIAL_SENT]: "agent",
  [QueryStatus.FULL_SENT]: "agent",
  [QueryStatus.PARTIAL_REQUESTED]: "you",
  [QueryStatus.FULL_REQUESTED]: "you",
  [QueryStatus.REVISE_RESUBMIT]: "you",
  [QueryStatus.OFFER]: "offer",
};

export function stateFor(status: QueryStatus): State {
  return STATE_OF[status] ?? "closed";
}

/**
 * THE ONE `{state} → token` MAPPING, exported once (the rulesheet's own words). Every surface that
 * needs the colour in JS rather than through a class reads THIS — the stat tiles' icon discs, the
 * board's header rule, the list's status pill. Nothing stores a colour.
 */
export const STATE_TOKEN: Record<State, string> = {
  queried: "var(--state-queried)",
  agent: "var(--state-agent)",
  you: "var(--state-you)",
  offer: "var(--state-offer)",
  closed: "var(--state-closed)",
};

/** …and its deeper step, for rules and rings. Same key, so the two cannot fall out of step. */
export const STATE_ACCENT_TOKEN: Record<State, string> = {
  queried: "var(--state-queried-deep)",
  agent: "var(--state-agent-deep)",
  you: "var(--state-you-deep)",
  offer: "var(--state-offer-deep)",
  closed: "var(--state-closed-deep)",
};

/**
 * …and one step deeper again, for a 1.2px line drawn OVER its own fill (dashboard v27, Phase 6).
 * Same key as the other two, so all three move together.
 *
 * ⚠️ NOT A DARKER `-deep`: that step is shared with the Contact list's board, the desk strip, the
 * active tab and the estimate bars, none of which asked to be retoned. A band border on a faded
 * stack is a different job from a ring on a card.
 */
export const STATE_LINE_TOKEN: Record<State, string> = {
  queried: "var(--state-queried-line)",
  agent: "var(--state-agent-line)",
  you: "var(--state-you-line)",
  offer: "var(--state-offer-line)",
  closed: "var(--state-closed-line)",
};

export function turnWordFor(status: QueryStatus): string {
  const turn = turnFor(status);
  if (turn === "sand" || turn === "agent") return "With the agent";
  if (turn === "you") return "With you";
  if (turn === "offer") return "Offer";
  return status === QueryStatus.NO_RESPONSE ? "No response" : "Closed";
}

/**
 * HOW A CLOSED QUERY ENDED, in words.
 *
 * ⚠️ THE REF HAD A FREE-TEXT `closed` FIELD AND THIS APP DOES NOT — which is the whole reason this
 * function exists rather than a `.charAt(0).toUpperCase()` on a stored string. `Query.closingReason`
 * is an INTERNAL TOKEN (`noResponseAfterWindow` | `withdrew` | `agentClosedSubmissions` | `other`),
 * so sentence-casing it would have printed `NoResponseAfterWindow` on the card. Nothing in the repo
 * mapped it back: `recordResponse.ts:218` maps prose TO token and there was no return journey.
 *
 * ⚠️ `Pass after full` IS DERIVED FROM THE FURTHEST SEND, NOT FROM A STORED PHRASE. `fullSentDate`
 * and `partialSentDate` are `recomputeQuery` output, so the card's account of how far a query got
 * and the pipeline's cannot disagree. A rejection that never sent anything beyond the query is a
 * bare `Pass` — never `Pass after query`, which reads as a stage that does not exist.
 *
 * ⚠️ AND AN UNRECOGNISED TOKEN FALLS BACK TO THE STATUS, which is always true. `other` carries
 * `closingNotes` — the writer's own unbounded prose — and a card is not where that belongs.
 */
export /**
 * ⚠️ RELATIONAL, AND STILL NOT AN APPRAISAL. "Marcus passed — after the full" states what happened
 * between two people; "Rejected after full" states a verdict on the writer. The register is the
 * same and the sentence does a different job — which is the whole point of the copy pass.
 *
 * ⚠️ WITHDRAWN NAMES THE WRITER, NOT THE AGENT, because the writer is who acted. Reading "Marcus
 * withdrew" off a query the writer withdrew would be false, and it is the one row in the ref's
 * table with no agent in it for exactly that reason.
 *
 * ⚠️ AND THE AGENCY-CLOSED CASE HAS NO ROW IN THE BRIEF'S TABLE. It is kept, relationally worded,
 * rather than folded into "passed" — an agency shutting its list did not pass on this book, and
 * saying it did would be the app inventing a rejection. Reported as a gap.
 */
function closedSentence(
  query: Pick<Query, "status" | "closingReason" | "partialSentDate" | "fullSentDate">,
  who: string,
  closedOn: string | null,
): string {
  if (query.status === QueryStatus.WITHDRAWN) {
    return closedOn ? `You withdrew — ${closedOn}` : "You withdrew";
  }
  if (query.closingReason === "agentClosedSubmissions") return `${who} closed to submissions`;
  if (query.status === QueryStatus.REJECTED) {
    const stage = query.fullSentDate ? "full" : query.partialSentDate ? "partial" : "query";
    return `${who} passed — after the ${stage}`;
  }
  return query.status;
}

/* ── materials ───────────────────────────────────────────────────────────────────────────────── */

/** Card order, and the order the tooltip lists them in. */
export const MATERIAL_SLOTS: readonly MaterialKind[] = ["queryLetter", "synopsis", "sample", "other"];

/**
 * ⚠️ EVERY ITEM GOES THROUGH `formatQueryMaterial`. `materialsWanted` is a backward-compatible
 * union — legacy plain strings beside structured `QueryMaterial`s — and reading `.material` off it
 * directly is how a card comes to print `[object Object]` for one writer and nothing for the next.
 */
export function cardMaterials(items: Query["materialsWanted"]): {
  materials: CardMaterials;
  materialsRecorded: boolean;
} {
  const materials: CardMaterials = { queryLetter: null, synopsis: null, sample: null, other: null };
  let recorded = false;
  for (const item of items ?? []) {
    const label = formatQueryMaterial(item);
    if (!label) continue;
    recorded = true;
    const slot = classifyQueryMaterial(item);
    /**
     * ⚠️ THE VALUE IS THE QUANTITY OR `Sent` — NEVER THE ROW'S OWN NAME. `formatQueryMaterial`
     * returns the material's label, so a synopsis with no page count came back as "Synopsis" and
     * the row rendered "Synopsis · Synopsis". A value column that repeats its own label states
     * nothing and reads as a bug, which is what it was.
     *
     * ⚠️ THE TEST IS A DIGIT, and it is the honest one: a quantity is the only thing these three
     * rows can carry beyond their own name — "First 3 chapters", "2 pages", "7,400 words". No digit
     * means the material went with no amount recorded, and `Sent` is exactly what is known.
     *
     * ⚠️ `other` IS EXEMPT because its value IS free text the writer typed, which may legitimately
     * contain no digit and is never the row's name.
     */
    const value = slot === "other" || /\d/.test(label) ? label : "Sent";
    /* Two items in one slot read as one parcel: "First 3 chapters · 50 pages". */
    materials[slot] = materials[slot] ? `${materials[slot]} · ${value}` : value;
  }
  return { materials, materialsRecorded: recorded };
}

/* ── the whole card ──────────────────────────────────────────────────────────────────────────── */

/**
 * ⚠️ FIRST NAME, AND THE TWO FALLBACKS ARE NOT DECORATION. A card reading "is waiting on your
 * partial" with no subject reads as a system message; "The agent" keeps it a sentence about a
 * person even when the record has no name. A single-token name is returned whole — an agency with
 * no named contact is still who the writer is waiting on.
 *
 * ⚠️ AND NEVER A PRONOUN. The record holds no gender and never will, so every sentence names the
 * person or says "the window". `queryCopy.test.ts` greps this module for the three pronouns and
 * for the appraisal words, because a comment cannot stop the next edit.
 */
export const firstNameOf = (name: string | null | undefined): string => {
  const full = (name ?? "").trim();
  if (!full) return "The agent";
  return full.split(/\s+/)[0] || full;
};

export function cardFacts(query: Query, today: Date, input: CardFactsInput = {}): CardFacts {
  const nowMs = today.getTime();
  const status = query.status;
  /**
   * ⚠️ A DECIDED OFFER READS AS CLOSED, whatever its stored status says.
   *
   * `offerDecision.ts` deliberately leaves an ACCEPTED offer at status `Offer` — "the query keeps
   * its historically-true OFFER status; the parked full Offer Decision Flow owns any closing
   * ceremony later". That is right about the RECORD and wrong about the CARD: a slate "Offer /
   * awaiting your decision" band on an offer you have already accepted states something untrue to
   * the one person who knows better. Declined already closes itself, because that activity carries
   * `resultingStatus: WITHDRAWN` and `recomputeQuery` honours it.
   *
   * ⚠️ IT CHANGES THE CARD AND NOTHING ELSE. The status is not rewritten, no activity is added, and
   * `recomputeQuery` is untouched — this is a presentation rule over data that already exists,
   * which is what lets it disagree with the stored status safely.
   */
  const decided = status === QueryStatus.OFFER && !!input.offerDecision;
  const turn = decided ? "closed" : turnFor(status);

  /**
   * ⚠️ TWO ANCHORS, DELIBERATELY — and the ref conflates them because its fixture only carries one
   * date per query.
   *
   *   · THE LEAF is the last ACTIVITY. A partial request is not a send, and the leaf under a
   *     `requested` caption must show the day the agent asked.
   *   · THE WAIT is the last SEND (`lastSendMs`), which is also what every live caller hands
   *     `resolveExpectedDate`. Measuring "N waiting" and "expected by X" from the same instant is
   *     what stops a card stating a wait its own expected date contradicts.
   *
   * On an agent-side query the two coincide, which is why one date was enough to draw a mockup.
   */
  const sentMs = lastSendMs(query);
  /**
   * ⚠️ NO RESPONSE ANCHORS ITS LEAF TO THE SEND, NOT TO THE LAST ACTIVITY — and this is a
   * correction the ref could not have shown, because its fixture carried one date per query.
   * `lastStatusChange` on a No Response query is the day the WRITER gave up on it, and a leaf
   * captioned `sent` over that date would state that something went out that day. Nothing did:
   * the whole meaning of the status is that the send was the last thing that happened.
   */
  /**
   * ⚠️ WHEN THE DEFINING DATE IS UNKNOWN THE LEAF SHOWS THE SEND AND SAYS `sent`. Falling back to
   * `dateSent` while keeping the caption `closed` or `requested` puts the send date under a word
   * that describes a different event — a true date under a false label, which is worse than either
   * alone. The elapsed line then says nothing, because there is nothing to measure.
   */
  const hasDefiningDate = !!query.lastStatusChange;
  const leafIso =
    status === QueryStatus.NO_RESPONSE || !hasDefiningDate
      ? (sentMs != null ? new Date(sentMs).toISOString() : query.dateSent)
      : query.lastStatusChange;
  const leafMs = leafIso ? new Date(leafIso).getTime() : NaN;

  const resolved = resolveExpectedDate(query, sentMs, input.agencyWeeks, input.replyStated ?? null);
  const expectedApplies = turn === "sand" || turn === "agent";
  const expectedReply = expectedApplies && resolved.ms != null ? new Date(resolved.ms) : null;

  const leaf: CardLeaf | null = Number.isNaN(leafMs)
    ? null
    : (() => {
        const d = new Date(leafMs);
        /**
         * ⚠️ ONE WORD, ALWAYS, AND `No Response` TAKES `sent` DESPITE BEING A CLOSED TURN. The
         * caption names what happened on the leaf's own date, which is why it branches on the
         * status here and not on the court: a query that was never answered ends on a send.
         */
        const caption =
          status === QueryStatus.NO_RESPONSE || !hasDefiningDate
            ? "sent"
            : turn === "you"
              ? "requested"
              : turn === "offer"
                ? "received"
                : turn === "closed"
                  ? "closed"
                  : "sent";
        return { month: MON[d.getMonth()].toUpperCase(), day: d.getDate(), caption };
      })();

  const sinceLeaf = Number.isNaN(leafMs) ? 0 : Math.max(0, daysBetween(leafMs, nowMs));
  const sinceSend = sentMs == null ? sinceLeaf : Math.max(0, daysBetween(sentMs, nowMs));

  let sentence: Run[];
  let caption: string;
  /* set only where a caption has more than one clause; otherwise derived from `caption` below */
  let captionParts: string[] | null = null;
  let nudgePartIndex: number | null = null;
  let attention = false;
  const who = firstNameOf(input.agentName);

  if (expectedApplies) {
    if (expectedReply) {
      const past = daysBetween(expectedReply.getTime(), nowMs);
      if (past > 0) {
        attention = true;
        sentence = [
          { text: `${who} is ` },
            { text: `${past} ${past === 1 ? "day" : "days"}`, strong: true },
            { text: " past the window" },
        ];
        caption = `${spanWords(sinceSend)} waiting · nudge available`;
      } else {
        /**
         * ⚠️ v14'S STANDING COPY: what is coming, and when you would chase it — never how long it
         * has been. "3 weeks waiting" is a fact about the past that the reader can already see in
         * the leaf; "12 days away · Nudge agent in 5 days" is the two things they can act on.
         *
         * ⚠️ THE SECOND FIGURE IS `reconcileNudge`'S OUTPUT, READ WHERE IT IS STORED. `nudgeDate`
         * on the query IS what that function derives — `logNudge` writes it and `deleteActivity`
         * re-derives it through `reconcileNudge` — so counting to it here is one derivation with
         * two readers rather than a second reminder rule living on a card.
         */
        sentence = [{ text: `Waiting on ${who} — reply expected by ` }, { text: shortDate(expectedReply), strong: true }];
        const away = Math.max(0, daysBetween(nowMs, expectedReply.getTime()));
        const nudgeMs = query.nudgeDate ? new Date(query.nudgeDate).getTime() : NaN;
        const nudgeIn = Number.isNaN(nudgeMs) ? null : daysBetween(nowMs, nudgeMs);
        /* a reminder in the past is not a reminder to count to — it has already come round */
        captionParts = [
          `${spanWords(away)} away`,
          nudgeIn != null && nudgeIn > 0 ? `Nudge agent in ${spanWords(nudgeIn)}` : "no nudge set",
        ];
        /* ⚠️ BOTH WORDINGS ARE THE REMINDER CLAUSE — "no nudge set" is as much a reminder control
           as a date is, because pressing it is how you set one. Marking only the dated form would
           make the affordance appear and disappear with the data. */
        nudgePartIndex = 1;
        caption = captionParts.join(" · ");
      }
    } else {
      /**
       * ⚠️ NOBODY HAS STATED A DATE, AND THE CARD SAYS SO RATHER THAN INVENTING ONE. `resolveExpectedDate`
       * returns `null` precisely so this case exists; a house fallback here would put a date on the
       * card attributed to no one, which is the fault that resolver was written to end.
       */
      sentence = [{ text: `Waiting on ${who} — ` }, { text: "no reply window stated", strong: true }];
      caption = `${spanWords(sinceSend)} waiting`;
    }
  } else if (turn === "you") {
    const what =
      status === QueryStatus.PARTIAL_REQUESTED ? "partial" : status === QueryStatus.FULL_REQUESTED ? "full" : "revisions";
    sentence = [{ text: `${who} is waiting on your ` }, { text: what, strong: true }];
    caption = `${sinceLeaf} ${sinceLeaf === 1 ? "day" : "days"} since request`;
    attention = sinceLeaf > WRITER_TURN_ATTENTION_DAYS;
  } else if (turn === "offer") {
    sentence = [{ text: `${who} is waiting on your ` }, { text: "answer", strong: true }];
    caption = `${sinceLeaf} ${sinceLeaf === 1 ? "day" : "days"} since offer`;
  } else if (status === QueryStatus.NO_RESPONSE) {
    const weeks = input.agencyWeeks;
    sentence = resolved.ms != null
        ? [{ text: `${who} went quiet — window closed ` }, { text: shortDate(new Date(resolved.ms)), strong: true }]
        /* ⚠️ NO WINDOW WAS EVER STATED, so there is no date to close. The brief's row assumes one;
           stating the span the record does hold is the honest form, and inventing a date here is
           what `resolveExpectedDate` returns null to prevent. */
        : [{ text: `${who} went quiet — ` }, { text: weeks ? `the window was ${weeks} weeks` : "no window was stated", strong: true }];
    caption = `${spanWords(sinceSend)} since sending`;
  } else {
    /* ⚠️ THE DECISION NAMES ITSELF. "Withdrawn by you" is true of a declined offer and says nothing
       about the offer; the writer's own act is the more useful fact on a card they are scanning. */
    const decisionWord =
      input.offerDecision === "accepted" ? "Offer accepted"
        : input.offerDecision === "declined" ? "Offer declined"
          : null;
    sentence = [{ text: decisionWord ?? closedSentence(query, who, leaf ? `${leaf.day} ${MON[new Date(leafMs).getMonth()]}` : null) }];
    /**
     * ⚠️ "REPLIED AFTER 0 DAYS" WAS A FALSE FIGURE, AND IT REACHED THE PAGE. Measured on two
     * Rejected cards: both printed it, because `lastStatusChange` was ABSENT, so the leaf fell back
     * to `dateSent`, so the interval computed from the send to itself. The card was not broken —
     * it was confidently reporting a number it had no basis for, which is the worse failure.
     *
     * ⚠️ SO THE INTERVAL IS ONLY STATED WHEN THE APP KNOWS IT. `lastStatusChange` present means a
     * real last activity to measure to; absent means we do not know how long the reply took, and
     * the caption says nothing rather than inventing a duration. This is the house rule that copy
     * asserts only what the code knows.
     *
     * ⚠️ AND A GENUINE SAME-DAY REPLY IS A DIFFERENT FACT from an unknown one. With a real
     * `lastStatusChange` that happens to equal the send, "replied the same day" is true and worth
     * saying; equality alone cannot tell the two apart, which is why this reads the FIELD rather
     * than comparing two numbers.
     */
    const replied = hasDefiningDate && sentMs != null && !Number.isNaN(leafMs)
      ? Math.max(0, daysBetween(sentMs, leafMs))
      : null;
    caption = replied == null ? "" : replied === 0 ? "replied the same day" : `replied after ${spanWords(replied)}`;
  }

  const { materials, materialsRecorded } = cardMaterials(query.materialsWanted);

  return {
    turn,
    /* ⚠️ a DECIDED offer is closed here too — same reason as `state` below */
    register: registerOf(decided ? "closed" : turn, attention),
    stage: decided ? "closed" : stageFor(status),
    /* a DECIDED offer is closed in both keys — the decision is what ended it, and the status
       string still says Offer, which is why neither key can read the status alone */
    state: decided ? "closed" : stateFor(status),
    turnWord: decided ? "Closed" : turnWordFor(status),
    leaf,
    sentence,
    caption,
    captionParts: captionParts ?? (caption ? caption.split(" · ") : []),
    nudgePartIndex,
    elapsed: (() => { const [v, u] = span(sinceSend); return { value: v, unit: u }; })(),
    attention,
    expectedReply,
    expectedSource: expectedApplies ? resolved.source : null,
    materials,
    materialsRecorded,
  };
}

/** The sentence as plain text — for `title`, `aria-label` and locks. Never for rendering. */
export const sentenceText = (runs: Run[]): string => runs.map((r) => r.text).join("");
