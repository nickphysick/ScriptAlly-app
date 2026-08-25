/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE GUARDS (refs 170-correction-edges.html, 172-correction-edges-2.html) ══════════════════
 *
 * ⚠️ EVERY GUARD OFFERS A PATH. Not one of them is a bare refusal, because a writer who reaches a
 * guard has an intention the app has just declined to carry out — and leaving them holding it, with
 * nothing to do next, is how a correctable record starts feeling like a locked one.
 *
 * Pure: proposed change in → verdict out. No Firestore, no components, so every rule below is
 * provable over a fixture and the sheet only has to render what it is told.
 */
import { QueryStatus } from "../types";
import { normalizeResultingStatus } from "./queryDerivation";
import { isRequestStatus, isSendStatus } from "./timelineChapters";
import { getPrimaryAction } from "./queryPrimaryAction";

/** One event as the guards see it — the shape both the log and a preview row can supply. */
export interface GuardEvent {
  activityId?: string;
  status: QueryStatus | string;
  timeMs: number;
}

export type GuardVerdict =
  | { kind: "allow" }
  /** Refused, but with somewhere to go — `route` names the flow that CAN carry the intention. */
  | { kind: "route"; message: string; routeLabel: string; route: "delete-query" | "edit-instead" }
  /** Allowed, but something else must come too — the sheet offers all three. */
  | { kind: "cascade"; message: string; partners: GuardEvent[] };

/**
 * ⚠️ THE ⋯ ITSELF IS SUPPRESSED WITHOUT A DOCUMENT, which supersedes the positional root rule for
 * that case. `buildTimelineRows` SYNTHESISES a root from `query.dateSent` when no Queried rung
 * exists, and that row carries no `activityId` — there is nothing to edit and nothing to delete, so
 * offering either would be a menu over an absence. Position cannot tell: the synthesised row's
 * status is exactly `QUERIED`, the same as a real one.
 */
export const canCorrect = (e: GuardEvent): boolean => !!e.activityId;

/**
 * ⚠️ THE ROOT IS EDITABLE AND NEVER REMOVABLE, BY POSITION rather than by type. An imported query
 * always seeds a Queried rung first (`impliedRungs`), but a corrected or hand-built log need not —
 * so "is this the earliest event" is the question, and "is this a Queried rung" is a different one
 * that happens to agree most of the time.
 *
 * Removing it is a request to delete the QUERY, which is a real thing a writer may want and has its
 * own flow — so the guard routes there rather than refusing.
 */
export function rootGuard(target: GuardEvent, all: readonly GuardEvent[]): GuardVerdict {
  const earliest = [...all].sort((a, b) => a.timeMs - b.timeMs)[0];
  if (!earliest || earliest.activityId !== target.activityId) return { kind: "allow" };
  return {
    kind: "route",
    message: "This is the first thing that happened on this query — removing it would leave a record with no beginning. To get rid of the whole query, delete the query itself.",
    routeLabel: "Delete this query…",
    route: "delete-query",
  };
}

/**
 * ⚠️ A REQUEST A SEND ANSWERS CANNOT LEAVE ALONE — deleting it would strand the send as an answer to
 * nothing, and the chapter it opened would take its name from a round that no longer starts.
 *
 * ⚠️ NEVER A SILENT CASCADE AND NEVER A REFUSAL WITHOUT A PATH. Removing both is usually what the
 * writer means; editing instead is what they mean when only a detail was wrong. The sheet offers
 * both plus Cancel, and the DEPENDENCY is derived from the CTA engine — a send is what some request
 * targets — rather than from a list of pairs kept here.
 */
export function dependencyGuard(target: GuardEvent, all: readonly GuardEvent[]): GuardVerdict {
  const s = normalizeResultingStatus(target.status);
  if (!s || !isRequestStatus(s)) return { kind: "allow" };
  const action = getPrimaryAction(s);
  if (action.kind !== "mark-sent") return { kind: "allow" };

  /* the send this request asked for, if it has already happened AFTER the request */
  const partners = all.filter((e) => {
    const es = normalizeResultingStatus(e.status);
    return es === action.target && e.timeMs >= target.timeMs && e.activityId !== target.activityId;
  });
  if (!partners.length) return { kind: "allow" };

  return {
    kind: "cascade",
    message: `${partners.length === 1 ? "An entry depends" : "Entries depend"} on this one — removing it alone would leave a send answering nothing.`,
    partners,
  };
}

/**
 * ⚠️ KIND EDITS STAY WITHIN DIRECTION. A request and a send are different people's acts: turning
 * "they asked for a partial" into "I sent a partial" does not correct a record, it invents a
 * different history in which the agent never wrote. Request↔request and send↔send are corrections
 * of the same act; across the line is a different event, which is what delete-and-record is for.
 */
export const sameDirection = (a: QueryStatus, b: QueryStatus): boolean =>
  (isRequestStatus(a) && isRequestStatus(b)) || (isSendStatus(a) && isSendStatus(b));

export function kindGuard(from: QueryStatus, to: QueryStatus): GuardVerdict {
  if (sameDirection(from, to)) return { kind: "allow" };
  return {
    kind: "route",
    message: "That would change who acted, not what they did — a request is the agent's move and a send is yours. If the wrong thing was recorded entirely, remove this entry and record what actually happened.",
    routeLabel: "Edit instead",
    route: "edit-instead",
  };
}

/**
 * ⚠️ A DATE THAT CROSSES ANOTHER EVENT IS A REORDER, and the writer should see it as one before it
 * lands. This does not refuse — a crossing is often exactly right, because the original order was
 * the mistake — it reports WHICH events were crossed so the sheet can preview the new order and
 * offer to move the counterpart's date too.
 */
export function crossedBy(target: GuardEvent, toMs: number, all: readonly GuardEvent[]): GuardEvent[] {
  const lo = Math.min(target.timeMs, toMs);
  const hi = Math.max(target.timeMs, toMs);
  return all.filter((e) => e.activityId !== target.activityId && e.timeMs > lo && e.timeMs < hi);
}

/** ⚠️ THE TIMELINE RECORDS WHAT HAPPENED, so tomorrow is not a date it can hold. */
export const isFutureDate = (iso: string, now: number = Date.now()): boolean => {
  const t = new Date(iso).getTime();
  return !Number.isNaN(t) && t > now;
};

export const FUTURE_DATE_MESSAGE =
  "The timeline records what happened, so it cannot hold a future date. To plan ahead, set a reminder instead.";

/**
 * ⚠️ A ROOT CANNOT MOVE. The same reasoning as removal: a query whose first event has gone to
 * another query is a record with no beginning, and the destination gains an event that never
 * started anything there either.
 */
export function moveGuard(target: GuardEvent, all: readonly GuardEvent[]): GuardVerdict {
  const root = rootGuard(target, all);
  if (root.kind === "route") {
    return {
      kind: "route",
      message: "This is the first thing that happened on this query, so it cannot move — the query would be left with no beginning.",
      routeLabel: "Edit instead",
      route: "edit-instead",
    };
  }
  return { kind: "allow" };
}

/** A destination for a move, with the fact a writer needs to choose between them. */
export interface MoveTarget {
  queryId: string;
  agentName: string;
  status: QueryStatus;
  /** ⚠️ STATED TRUTHFULLY rather than hidden — a closed query is a legitimate destination for a
   *  correction, and omitting it would leave the writer unable to fix a misfiled event. */
  closed: boolean;
}

/**
 * The destination row's note in the picker.
 *
 * ⚠️ IT USED TO PROMISE "moving an entry here will not reopen it", AND THAT WAS FALSE.
 * `deriveStatus` takes the LAST status-bearing activity in chronological order, so an event dated
 * AFTER the closure and carrying a `resultingStatus` becomes the last rung and the query's status
 * becomes that event's. The promise holds only for an event dated before the closure — which this
 * function cannot know, because a picker row is drawn before any event is chosen.
 *
 * ⚠️ SO IT STATES THE FACT IT HAS AND STOPS. Which case applies is resolved by `moveNotices`, which
 * is given the event. A control that cannot know the answer must not offer one — the alternative
 * here was a confident wrong promise, which is the worse of the two failures.
 */
export const moveTargetNote = (t: MoveTarget): string =>
  t.closed ? `${t.status} — closed` : t.status;

/**
 * ⚠️ A NOTE THAT NAMES THE OLD QUERY MUST NOT TRAVEL SILENTLY. "Priya asked for fifty pages" is
 * true where it was written and misleading the moment it lands under another agent's name — so the
 * move offers to carry it, clear it, or stop, rather than deciding for the writer.
 */
export function staleNoteCheck(note: string, fromAgent: string): { stale: boolean; message?: string } {
  const n = (note || "").trim();
  if (!n || !fromAgent.trim()) return { stale: false };
  const first = fromAgent.trim().split(/\s+/)[0];
  const named = new RegExp(`\\b${first.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(n);
  if (!named) return { stale: false };
  return {
    stale: true,
    message: `This note mentions ${first}. It will read as being about the new query once it moves — keep it, clear it, or edit it first.`,
  };
}
