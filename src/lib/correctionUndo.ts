/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE UNDO CONTRACT FOR A CORRECTION ═══════════════════════════════════════════════════════
 *
 * ⚠️ WHAT THE EXISTING PRIMITIVE LACKED IS NOT A FEATURE, IT IS A LIFETIME. `ToastOptions.undo` is a
 * closure the toast calls if pressed, and it is exactly right for the writes it was built for: the
 * inverse of an action taken a moment ago, on a record nothing else has touched since. It carries
 * no notion of the world moving on underneath it. A correction is different — the query it edited
 * stays on screen, and the writer can record a response, log a nudge or correct a second entry
 * before the six seconds are out.
 *
 * ⚠️ AND "PUT IT BACK" STOPS BEING TRUTHFUL THE MOMENT SOMETHING IS BUILT ON THE CORRECTED RECORD.
 * Undoing a date edit after a response was recorded against the corrected timeline does not restore
 * a previous state — it produces a third one nobody chose. So a pending correction-undo RETIRES
 * itself when a newer write lands on the same query.
 *
 * ⚠️ HOW "NEWER" IS DETECTED, AND WHY IT IS NOT A TIMESTAMP. The query's own activity log is the
 * record of everything that happens to it, and it is already live in the page (`onSnapshot`). So the
 * signal is a CHANGE IN THE SET OF ACTIVITY IDS on that query since the correction committed —
 * anything appended, and anything else removed. That beats a clock in three ways: it needs no
 * stored field, it cannot drift, and it is immune to two writes inside one millisecond. It is
 * deliberately NOT `lastStatusChange` or any derived field, because a correction that changes no
 * status would leave those untouched while the log had plainly moved.
 *
 * ⚠️ THE CORRECTION'S OWN WRITES ARE THE BASELINE, not what preceded them. `idsAfter` is taken once
 * the correction has landed, so the operation never retires its own undo — a mistake that would
 * make undo work only for corrections that changed nothing.
 */

/** What a pending correction-undo needs to know to tell whether it is still truthful. */
export interface PendingUndo {
  queryId: string;
  /** The activity ids on that query immediately AFTER the correction committed. */
  idsAfter: readonly string[];
  /** Restores by id. One call, however many documents the operation moved. */
  restore: () => Promise<void>;
  /** The toast's own words — names the event and the query, so a stale toast is still legible. */
  message: string;
}

const sameSet = (a: readonly string[], b: readonly string[]): boolean => {
  if (a.length !== b.length) return false;
  const s = new Set(a);
  return b.every((id) => s.has(id));
};

/**
 * Is this pending undo still truthful?
 *
 * ⚠️ ORDER IS NOT PART OF THE QUESTION — a re-fetch may hand the ids back differently without
 * anything having happened, and treating that as a write would retire every undo on the next
 * snapshot. Membership is the fact; sequence is the timeline's business.
 */
export function undoStillValid(pending: PendingUndo, currentIds: readonly string[]): boolean {
  return sameSet(pending.idsAfter, currentIds);
}

/**
 * ⚠️ ONE TOAST PER OPERATION, HOWEVER MANY DOCUMENTS MOVED. Remove-both touches two entries and a
 * move touches two queries; three receipts for one decision would leave the writer choosing which
 * to press. The message names the EVENT and the QUERY because the toast outlives the selection —
 * a writer who has clicked away needs to know what they would be putting back, and where.
 */
export function undoMessage(eventLabel: string, agentName: string, count = 1): string {
  const what = count > 1 ? `${count} entries` : eventLabel;
  return `${what} removed · ${agentName}`;
}

export const undoMoveMessage = (eventLabel: string, fromAgent: string, toAgent: string): string =>
  `${eventLabel} moved · ${fromAgent} → ${toAgent}`;
