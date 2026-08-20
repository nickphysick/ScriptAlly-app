/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ A REPLY THAT DECIDES NOTHING (Part A, Phase 1; ref design-refs/167-holding-reply.html) ═════
 *
 * An acknowledgement, "still reading", "sorry, two more weeks", "can you resend as a PDF". Contact,
 * not an answer. Before this, a writer had two options and both were wrong: record nothing and
 * watch the tracker keep counting a silence that had ended, or record a false stage change.
 *
 *   DOES                                          DOES NOT
 *   sit on the timeline as incoming               change the query's status
 *   restart the waiting clock from their reply    change whose turn it is (still theirs)
 *   supply a new window, attributed to them       count as an answer in "11 answered · 14 not"
 *   end the no-reply state and expiry figure      move the query out of "No reply yet"
 *   record that the agent has engaged             close anything
 *
 * ⚠️ NON-STATUS BY CONSTRUCTION, WHICH IS WHY THE "DOES NOT" COLUMN NEEDS NO CODE. Derivation is
 * gated entirely on `resultingStatus` (`queryDerivation.orderedStatusBearing`), so an event that
 * carries none cannot move status, `hasAgentResponded`, the response count, `revisionRound`,
 * `responseReceivedAt`, `rejectedDate`, `lastStatusChange` or any pipeline date. `recomputeQuery`
 * is not taught to ignore this type — it already cannot see it. That is the whole of D1 and D5.
 *
 * ⚠️ THE CONSTANT IS HERE, NOT IN `ActivityType`. `src/types.ts` belongs to the manuscripts stream,
 * and `writerExpectedDate` is the standing precedent for exactly this: validated and allowlisted in
 * `firestore.rules`, reached through ONE cast in a single named module. D8 approved the value
 * `"Holding Reply"` as an `ActivityType` member; the value ships as approved, and only its
 * DECLARATION SITE differs. Fold it into the enum when that file is next open to this stream.
 *
 * ⚠️ TWO STORES, TWO SPELLINGS, AND THAT IS THE EXISTING CONVENTION rather than an accident:
 * `NUDGE_SENT`/`"Nudge sent"` does the same. The global feed's `activityType` is Title Case and
 * rules-validated; the per-query subcollection's `type` is sentence case and must NOT be a
 * `QueryStatus` member, which is what keeps it invisible to derivation.
 */
import type { Activity } from "../types";
import { normalizeResultingStatus } from "./queryDerivation";
import { isSendStatus } from "./timelineChapters";

/** The GLOBAL feed's `activityType`. Rules-validated; quoted in `firestore.rules`. */
export const HOLDING_REPLY_TYPE = "Holding Reply" as const;

/** The per-query subcollection's `type`. Deliberately not a QueryStatus member. */
export const HOLDING_REPLY_NESTED_TYPE = "Holding reply" as const;

/**
 * What the timeline calls it.
 *
 * ⚠️ IT NAMES WHAT HAPPENED, NOT WHAT DID NOT. "No decision yet" is the second clause because the
 * first fact is that they replied — the writer's silence has ended, which is the thing they want to
 * see. A label leading with the negative ("No decision from …") would file a piece of good news
 * under disappointment.
 */
export const HOLDING_REPLY_LABEL = "They replied — no decision yet";

const DAY = 86400000;

export interface HoldingReplyInput {
  /** When the reply arrived (ISO). This is the event's date and the clock's new anchor. */
  repliedOn: string;
  /** Their new timeframe in weeks, if they gave one. Absent is the common case. */
  weeks?: number | null;
  /** What they said, if the writer kept it. */
  note?: string;
}

export interface HoldingReplyWrites {
  /** AUTHORITATIVE row for `users/{uid}/queries/{qid}/activity`. */
  nested: {
    type: typeof HOLDING_REPLY_NESTED_TYPE;
    createdAt: string;
    note: string;
    queryId: string;
    agentName: string;
    /** Their stated weeks, ON THE EVENT (D3) — never written back to the agent record. */
    replyWeeks?: number;
  };
  /** The global-feed PROJECTION twin, written under the SAME id (the saveQueryEdits convention). */
  activity: Omit<Activity, "id" | "userId">;
}

const DESC_MAX = 512;
const DETAILS_MAX = 4096;

/**
 * ⚠️ NO `queryUpdates`, AND ITS ABSENCE IS THE DESIGN. The nudge's builder returns query fields to
 * write; this one returns none, because everything a holding reply changes is DERIVED from the
 * event's existence: the waiting clock re-bases off it, the no-reply state ends because a reply
 * exists, and the window comes from the event's own `replyWeeks`. A stored `lastHoldingReplyDate`
 * would be a second copy of the log's own fact, free to drift the moment an entry is corrected.
 *
 * ⚠️ AND THE TIMEFRAME IS NOT WRITTEN TO THE AGENT (D3). Two weeks was what she said about THIS
 * manuscript in August, not the agency's standing policy — so it lives on the event, and
 * `resolveExpectedDate` reads it as a dated statement that a later one can outrank.
 */
export function buildHoldingReplyWrites(
  query: { id: string; manuscriptId: string },
  agent: { name?: string; agency?: string } | null | undefined,
  input: HoldingReplyInput,
): HoldingReplyWrites {
  const agentName = agent?.name || "the agent";
  const agency = agent?.agency || "";
  const eventISO = new Date(input.repliedOn).toISOString();
  const note = input.note?.trim();
  const weeks = typeof input.weeks === "number" && input.weeks > 0 ? input.weeks : undefined;

  let description = agency ? `${agentName} at ${agency} replied without a decision` : `${agentName} replied without a decision`;
  if (description.length > DESC_MAX) description = description.slice(0, DESC_MAX);

  /* ⚠️ BOTH PARTS OPTIONAL, so `details` may legitimately be empty — the EVENT is worth recording
     on its own, because it is what ends the silence. */
  const parts: string[] = [];
  if (weeks) parts.push(`They expect to reply within ${weeks} week${weeks === 1 ? "" : "s"}`);
  if (note) parts.push(`"${note}"`);
  let details = parts.join(" · ");
  if (details.length > DETAILS_MAX) details = details.slice(0, DETAILS_MAX);

  return {
    nested: {
      type: HOLDING_REPLY_NESTED_TYPE,
      createdAt: eventISO,
      note: details,
      queryId: query.id,
      agentName,
      ...(weeks ? { replyWeeks: weeks } : {}),
    },
    activity: {
      queryId: query.id,
      manuscriptId: query.manuscriptId,
      activityType: HOLDING_REPLY_TYPE as unknown as Activity["activityType"],
      description,
      date: eventISO,
      details,
      // deliberately NO resultingStatus — this is the whole of "decides nothing"
    },
  };
}

/** A stored holding reply as read back from the authoritative per-query store. */
export interface StoredHoldingReply { type?: unknown; createdAt?: unknown; replyWeeks?: unknown }

const at = (v: unknown): number => (typeof v === "string" ? new Date(v).getTime() : NaN);

/** Every holding reply on this query, oldest first, as instants. */
export function holdingReplyTimes(events: readonly StoredHoldingReply[] | null | undefined): number[] {
  return (events || [])
    .filter((e) => e.type === HOLDING_REPLY_NESTED_TYPE)
    .map((e) => at(e.createdAt))
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => a - b);
}

/**
 * The MOST RECENT holding reply's stated window, as a dated statement — or null.
 *
 * ⚠️ THE LATEST ONE, AND ONLY IF IT STATED A WINDOW. An agent who wrote twice has superseded their
 * own earlier estimate; taking the earliest, or merging them, would keep a figure they have already
 * replaced. A later reply that gave NO timeframe is deliberately not treated as clearing the older
 * one — silence about a date is not a retraction of it — so the search walks back to the most
 * recent reply that actually named a window.
 *
 * ⚠️ ANCHORED ON THE REPLY, NOT THE SEND. "Two more weeks" means two weeks from when they said it.
 * Measuring from the original send would place the new window in the past on any long silence,
 * which is precisely the case this feature exists for.
 */
export function replyStatedWindow(
  events: readonly StoredHoldingReply[] | null | undefined,
): { ms: number; statedAt: number } | null {
  const withWindows = (events || [])
    .filter((e) => e.type === HOLDING_REPLY_NESTED_TYPE && typeof e.replyWeeks === "number" && (e.replyWeeks as number) > 0)
    .map((e) => ({ statedAt: at(e.createdAt), weeks: e.replyWeeks as number }))
    .filter((e) => !Number.isNaN(e.statedAt))
    .sort((a, b) => a.statedAt - b.statedAt);
  const latest = withWindows[withWindows.length - 1];
  if (!latest) return null;
  return { ms: latest.statedAt + latest.weeks * 7 * DAY, statedAt: latest.statedAt };
}

/**
 * When the wait currently being measured began — the later of the writer's last outbound send and
 * the agent's last holding reply.
 *
 * ⚠️ THIS IS THE RE-BASE, AND IT IS THE POINT OF PHASE 2. A reply restarts the clock: the writer is
 * no longer waiting on a two-year silence, they are waiting on the four days since the agent wrote.
 * The list keeps measuring from the send (D2) — "how long has this been going" — while the tracker
 * measures from here — "what am I waiting on now". Both true, different questions.
 */
export function waitAnchorMs(lastSendMs: number | null, events: readonly StoredHoldingReply[] | null | undefined): number | null {
  return waitAnchor(events, lastSendMs)?.ms ?? null;
}

/** What the wait is currently measured from, and WHICH KIND of event that is. */
export interface WaitAnchor {
  ms: number;
  /** `send` — the writer's last outbound. `reply` — the agent's last holding reply. */
  kind: "send" | "reply";
}

/**
 * ⚠️ §1b · THE ANCHOR COMES FROM THE ACTIVITY LOG, and the field is only a fallback.
 *
 * `queryAmbientStatus` picked the send date by STATUS — `dateSent` at Queried, `partialSentDate`
 * at Partial Sent, `fullSentDate` at Full Sent — so a query whose derived stage date was absent had
 * no anchor AT ALL, even with `dateSent` sitting on the record and both rungs drawn on the card
 * above. Those three fields are `recomputeQuery`'s output; the log is its input, and the input is
 * the thing that always exists.
 *
 * ⚠️ OUTBOUND IS `isSendStatus`, THE CTA ENGINE'S OWN ANSWER, never a list of three statuses
 * written out here. A send is exactly a status some request can target, plus the first query —
 * so a new send stage joins this derivation without an edit, and cannot come to disagree with the
 * chapters or the command bar about what counts as sending something.
 *
 * ⚠️ AND THE KIND RIDES WITH THE INSTANT (§3a), because the label above the bar names the event:
 * "Sent 1 May" for an outbound and "Replied 18 Aug" for a holding reply. Deriving the two
 * separately is how the figure and the word come to describe different events.
 */
export function waitAnchor(
  events: readonly StoredHoldingReply[] | null | undefined,
  fallbackSendMs: number | null,
): WaitAnchor | null {
  const sends = (events || [])
    .map((e) => ({ s: normalizeResultingStatus((e as { type?: unknown }).type), t: at(e.createdAt) }))
    .filter((e) => e.s !== null && isSendStatus(e.s) && !Number.isNaN(e.t))
    .map((e) => e.t);
  const lastSend = sends.length ? Math.max(...sends) : fallbackSendMs;

  const replies = holdingReplyTimes(events);
  const lastReply = replies.length ? replies[replies.length - 1] : null;

  if (lastSend == null) return lastReply == null ? null : { ms: lastReply, kind: "reply" };
  if (lastReply == null) return { ms: lastSend, kind: "send" };
  /* ⚠️ A TIE KEEPS THE REPLY. Same instant means an import stamped both with one ordering key;
     the reply is the later thing in any real sequence, and it is the one the writer is waiting on. */
  return lastReply >= lastSend ? { ms: lastReply, kind: "reply" } : { ms: lastSend, kind: "send" };
}

/** Has the agent been in touch on this query, whether or not they decided anything? */
export function hasHoldingReply(events: readonly StoredHoldingReply[] | null | undefined): boolean {
  return holdingReplyTimes(events).length > 0;
}
