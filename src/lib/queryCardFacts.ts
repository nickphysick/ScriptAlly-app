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
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

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
 * How far the query has travelled, and in which direction — the tint ladder's rung.
 *
 * ⚠️ FINER THAN `Turn`, AND BOTH ARE KEPT. `Turn` answers "whose move" in five courts and drives
 * the quick filters, the grouping and the reconciliation against `queryBucket`. `Stage` answers
 * "how far in" in eight rungs and drives nothing but paint. Collapsing them would either coarsen
 * the band back to five flat tints — where Queried and Full Sent are the same colour, which is the
 * fault the ladder exists to fix — or split the filters into eight pills nobody asked for.
 */
export type Stage = "out-1" | "out-2" | "out-3" | "in-1" | "in-2" | "in-3" | "offer" | "closed";

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
  /** The tint ladder's rung — the token key, and the card's `qcc--s-{stage}` class. */
  stage: Stage;
  turnWord: string;
  leaf: CardLeaf | null;
  sentence: Run[];
  caption: string;
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
export function closedSentence(query: Pick<Query, "status" | "closingReason" | "partialSentDate" | "fullSentDate">): string {
  if (query.status === QueryStatus.WITHDRAWN) return "Withdrawn by you";
  if (query.closingReason === "agentClosedSubmissions") return "Agency closed to submissions";
  if (query.status === QueryStatus.REJECTED) {
    if (query.fullSentDate) return "Pass after full";
    if (query.partialSentDate) return "Pass after partial";
    return "Pass";
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
    /* Two items in one slot read as one parcel: "First 3 chapters · 50 pages". */
    materials[slot] = materials[slot] ? `${materials[slot]} · ${label}` : label;
  }
  return { materials, materialsRecorded: recorded };
}

/* ── the whole card ──────────────────────────────────────────────────────────────────────────── */

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
  const leafIso =
    status === QueryStatus.NO_RESPONSE
      ? (sentMs != null ? new Date(sentMs).toISOString() : query.dateSent)
      : (query.lastStatusChange ?? query.dateSent);
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
          status === QueryStatus.NO_RESPONSE
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
  let attention = false;

  if (expectedApplies) {
    if (expectedReply) {
      const past = daysBetween(expectedReply.getTime(), nowMs);
      if (past > 0) {
        attention = true;
        sentence = [
          { text: `Reply was expected by ${shortDate(expectedReply)} — ` },
          { text: `${past} ${past === 1 ? "day" : "days"} past`, strong: true },
        ];
        caption = `${spanWords(sinceSend)} waiting · nudge available`;
      } else {
        sentence = [{ text: "Reply expected by " }, { text: shortDate(expectedReply), strong: true }];
        caption = `${spanWords(sinceSend)} waiting`;
      }
    } else {
      /**
       * ⚠️ NOBODY HAS STATED A DATE, AND THE CARD SAYS SO RATHER THAN INVENTING ONE. `resolveExpectedDate`
       * returns `null` precisely so this case exists; a house fallback here would put a date on the
       * card attributed to no one, which is the fault that resolver was written to end.
       */
      sentence = [{ text: "Waiting — " }, { text: "no reply window stated", strong: true }];
      caption = `${spanWords(sinceSend)} waiting`;
    }
  } else if (turn === "you") {
    const what =
      status === QueryStatus.PARTIAL_REQUESTED ? "Partial" : status === QueryStatus.FULL_REQUESTED ? "Full" : "Revisions";
    sentence = [{ text: `${what} — ` }, { text: "not yet sent", strong: true }];
    caption = `${sinceLeaf} ${sinceLeaf === 1 ? "day" : "days"} since request`;
    attention = sinceLeaf > WRITER_TURN_ATTENTION_DAYS;
  } else if (turn === "offer") {
    sentence = [{ text: "Awaiting your decision", strong: true }];
    caption = `${sinceLeaf} ${sinceLeaf === 1 ? "day" : "days"} since offer`;
  } else if (status === QueryStatus.NO_RESPONSE) {
    const weeks = input.agencyWeeks;
    sentence = [
      { text: "No reply", strong: true },
      { text: weeks ? ` — window was ${weeks} weeks` : " — no window was stated" },
    ];
    caption = `${spanWords(sinceSend)} since sending`;
  } else {
    /* ⚠️ THE DECISION NAMES ITSELF. "Withdrawn by you" is true of a declined offer and says nothing
       about the offer; the writer's own act is the more useful fact on a card they are scanning. */
    const decisionWord =
      input.offerDecision === "accepted" ? "Offer accepted"
        : input.offerDecision === "declined" ? "Offer declined"
          : null;
    sentence = [{ text: decisionWord ?? closedSentence(query) }];
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
    const hasLastActivity = !!query.lastStatusChange;
    const replied = hasLastActivity && sentMs != null && !Number.isNaN(leafMs)
      ? Math.max(0, daysBetween(sentMs, leafMs))
      : null;
    caption = replied == null ? "" : replied === 0 ? "replied the same day" : `replied after ${spanWords(replied)}`;
  }

  const { materials, materialsRecorded } = cardMaterials(query.materialsWanted);

  return {
    turn,
    stage: decided ? "closed" : stageFor(status),
    turnWord: decided ? "Closed" : turnWordFor(status),
    leaf,
    sentence,
    caption,
    attention,
    expectedReply,
    expectedSource: expectedApplies ? resolved.source : null,
    materials,
    materialsRecorded,
  };
}

/** The sentence as plain text — for `title`, `aria-label` and locks. Never for rendering. */
export const sentenceText = (runs: Run[]): string => runs.map((r) => r.text).join("");
