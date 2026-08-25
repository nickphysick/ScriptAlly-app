/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ MOVING AN ENTRY TO ANOTHER QUERY (ref 172, cards 10 and 11) ══════════════════════════════
 *
 * ⚠️ THE RISK HERE IS NOT THE UI, IT IS THAT TWO QUERIES CHANGE AT ONCE. Every other correction
 * touches one record and one derivation; a move takes an event out of one history and puts it into
 * another, so two logs move, two statuses recompute, and one reversal has to undo both or the
 * writer is left with a record that exists in neither place or in both.
 *
 * ⚠️ SO THE PREVIEW IS RUN TWICE — once per query, through the SAME `previewCorrection` the single
 * -query corrections use. The sheet shows the source losing the entry and the target gaining it,
 * each block a real derivation. A hand-written summary of "what the target will become" would be a
 * second model of the rules, and the whole pack exists to not have one.
 *
 * This module is pure: it decides WHAT the move is and what it costs. The write lives in `db.tsx`,
 * where the batch and the capture are.
 */
import type { QueryStatus } from "../types";
import { staleNoteCheck, type MoveTarget } from "./correctionGuards";

/** A destination as the picker draws it — enough to see a nonsensical landing before choosing it. */
export interface MoveCandidate extends MoveTarget {
  agency: string;
  /** Lowercased haystack for the search box; built once so filtering does no work per keystroke. */
  search: string;
}

const CLOSED: ReadonlySet<string> = new Set(["Rejected", "Withdrawn", "No Response"]);

/**
 * ⚠️ THE SOURCE QUERY IS NOT A DESTINATION. Offering it would let a writer "move" an event onto the
 * query it already lives on — a no-op that still runs two recomputes and leaves a toast promising
 * an undo of nothing.
 */
export function moveCandidates(
  queries: readonly { id: string; agentId?: string; status: string }[],
  agents: readonly { id: string; name?: string; agency?: string }[],
  sourceQueryId: string,
): MoveCandidate[] {
  const byId = new Map(agents.map((a) => [a.id, a]));
  return queries
    .filter((q) => q.id !== sourceQueryId)
    .map((q) => {
      const a = q.agentId ? byId.get(q.agentId) : undefined;
      const agentName = (a?.name || "").trim() || (a?.agency || "").trim() || "Unnamed agent";
      const agency = (a?.agency || "").trim();
      return {
        queryId: q.id,
        agentName,
        agency,
        status: q.status as QueryStatus,
        closed: CLOSED.has(q.status),
        search: `${agentName} ${agency} ${q.status}`.toLowerCase(),
      };
    })
    .sort((x, y) => x.agentName.localeCompare(y.agentName));
}

/** ⚠️ SUBSTRING, NOT FUZZY — a picker that reorders under the writer's hands is worse than a long list. */
export const filterCandidates = (all: readonly MoveCandidate[], term: string): MoveCandidate[] => {
  const t = term.trim().toLowerCase();
  return t ? all.filter((c) => c.search.includes(t)) : [...all];
};

/**
 * What the sheet must say before this move happens. Pure — the caller renders it.
 *
 * ⚠️ A CLOSED TARGET IS STATED, NEVER PREVENTED (card 11). Filing an event onto a closed query is a
 * legitimate correction — the event genuinely happened before the closure — and hiding closed
 * queries from the picker would leave the writer unable to fix a misfiled record at all. What the
 * sheet owes them is the truth: it does not reopen, and the offer to reopen first sits beside it.
 *
 * ⚠️ AND NO GENDERED PRONOUN FOR AN AGENT. The ref's own copy reads "she passed in March"; this app
 * does not know an agent's pronouns and a name does not supply them, so the sentence names the
 * query instead. Same meaning, no guess about a real person.
 */
export interface MoveNotices {
  /** Card 11 — the target is closed and will stay closed. */
  closedNote?: string;
  /** Card 10 — the note names the source's agent and would read as being about the target. */
  staleNote?: string;
}

/**
 * What moving THIS event to a closed query actually does (D4).
 *
 * ⚠️ THE OLD COPY SET HOMEWORK. It said "An event dated before the closure slots into the record
 * without reopening it" — a RULE, stated without the event's date, leaving the reader to compare two
 * dates the app already had and work out which case they were in.
 *
 * ⚠️ AND THERE ARE THREE CASES, NOT ONE. `deriveStatus` takes the LAST status-bearing activity in
 * chronological order:
 *
 *   · the event carries no `resultingStatus` → it cannot move a status at all, whatever its date
 *   · it carries one and is dated BEFORE the closure → the closure is still last; nothing changes
 *   · it carries one and is dated AFTER the closure → it becomes the last rung, and the query's
 *     status becomes that event's. The closure IS superseded.
 *
 * The third case is why `moveTargetNote`'s old flat promise was false. Stated plainly, without a
 * verdict and without telling the writer whether to do it: it is a correction, and correcting a
 * misfiling is exactly what this flow is for.
 */
export function moveNotices(
  target: MoveCandidate,
  note: string,
  sourceAgentName: string,
  /** The event being moved. Omit and the notice states only that the target is closed. */
  event?: { date?: string; resultingStatus?: string | null },
  /** When the target closed — the date of its last status-bearing rung. */
  closedAt?: string | null,
): MoveNotices {
  const out: MoveNotices = {};
  if (target.closed) {
    const head = `${target.agentName}'s query is closed — ${target.status.toLowerCase()}.`;
    out.closedNote = `${head} ${closureEffect(event, closedAt)}`;
  }
  const stale = staleNoteCheck(note, sourceAgentName);
  if (stale.stale) out.staleNote = stale.message;
  return out;
}

/**
 * ⚠️ THE ORDER OF THE TWO BLOCKS IS SOURCE THEN TARGET, and it is not cosmetic. The writer opened
 * this from an entry on the source, so the first thing they should read is what happens to the
 * record they were looking at; the target is the consequence of their choice, not their starting
 * point. Card 11 draws it the other way round because its subject is the surprise, and the surprise
 * there is stated in the notice above both blocks instead.
 */
export const MOVE_BLOCK_TITLES = { source: "This query", target: "The query it moves to" } as const;

/**
 * Which of the three cases this move is, in words.
 *
 * ⚠️ IT COMPARES THE SAME KEY THE DERIVATION SORTS ON — the activity's own `date`. Comparing
 * anything else would let the sentence and the outcome disagree, which is the fault the whole
 * correction pack exists to avoid.
 *
 * ⚠️ AND AN UNKNOWN DATE IS SAID, NOT GUESSED. Without the event, or without a closure date to
 * compare it to, the notice states that the query is closed and stops — it does not fall back to
 * the reassuring branch. The standing rule: an unknown is never folded into a known.
 */
export const closureEffect = (
  event?: { date?: string; resultingStatus?: string | null },
  closedAt?: string | null,
): string => {
  if (!event) return "Moving an entry here does not by itself reopen it.";
  if (!event.resultingStatus) {
    return "This entry carries no status, so it records against that query without changing where it stands.";
  }
  if (!event.date || !closedAt) {
    return "This entry carries a status; whether it lands before or after the closure is not recorded, so what it does to that query cannot be stated here.";
  }
  return event.date < closedAt
    ? "This entry is dated before that closure, so it slots into the record and the query stays closed."
    : `This entry is dated after that closure, so it becomes the query's latest event and its status changes to ${event.resultingStatus}.`;
};

/**
 * When a query closed — the date of its LAST status-bearing rung.
 *
 * ⚠️ IT ORDERS BY THE SAME KEY THE STATUS DERIVATION DOES. On a closed query the last rung IS the
 * closure, so this needs no separate notion of "the closing event" that could drift from what
 * `deriveStatus` actually picked. Null when the log carries no status-bearing rung at all, which the
 * notice then says rather than guessing.
 */
export const closureDateOf = (
  docs: readonly { data: { date?: string; resultingStatus?: string } }[],
): string | null => {
  const dated = docs
    .filter((d) => !!d.data.resultingStatus && !!d.data.date)
    .map((d) => d.data.date as string)
    .sort();
  return dated.length > 0 ? dated[dated.length - 1] : null;
};
