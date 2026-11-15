/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Overnight fixes v1, Part 2. A failed load is an error, never an empty account. When the queries, agents or
 * manuscripts read fails, a page that would have drawn its day-one or empty state draws this error instead, with
 * "Try again". No import or set-up entry point is offered while it stands: a writer who imports again over a read
 * that failed ends up with duplicates.
 *
 * Pure: the words, and which reads block a page. The loader (`lib/db.tsx`) holds the state, and
 * `components/notes/LoadFailed` draws it with the Your notes error's own markup and classes.
 */

export type ReadState = "ok" | "failed" | "retrying";
export type ReadName = "queries" | "agents" | "manuscripts";

export interface ReadStates {
  queriesRead?: ReadState;
  agentsRead?: ReadState;
  manuscriptsRead?: ReadState;
}

/** The reads that are down, in a fixed order. "retrying" counts as down: until a retry answers, the list is not known
 *  to be empty, so nothing may draw it as empty. */
export function downReads(r: ReadStates, which: readonly ReadName[] = ["queries", "agents", "manuscripts"]): ReadName[] {
  const of: Record<ReadName, ReadState | undefined> = { queries: r.queriesRead, agents: r.agentsRead, manuscripts: r.manuscriptsRead };
  /* only the two named states are down: anything else (absent, or a stand-in from a context that predates them) is up */
  return which.filter((k) => of[k] === "failed" || of[k] === "retrying");
}

/** The Your notes pattern ("We couldn’t load your notes. Try again?"), for the read that failed. More than one
 *  failed: the account. */
export function loadFailedWords(down: readonly ReadName[]): string | null {
  if (down.length === 0) return null;
  if (down.length > 1) return "We couldn’t load your account. Try again?";
  const noun: Record<ReadName, string> = { queries: "queries", agents: "agents", manuscripts: "manuscript" };
  return `We couldn’t load your ${noun[down[0]]}. Try again?`;
}

/** True while a retry is in flight and nothing has failed again: the button waits. */
export function retryingOnly(r: ReadStates, down: readonly ReadName[]): boolean {
  const of: Record<ReadName, ReadState | undefined> = { queries: r.queriesRead, agents: r.agentsRead, manuscripts: r.manuscriptsRead };
  return down.length > 0 && down.every((k) => of[k] === "retrying");
}

/** What a page needs to draw the error: the words, whether the button waits, and the retry. Null when every read is up. */
export interface LoadFailure { down: ReadName[]; words: string; busy: boolean }
export function loadFailure(r: ReadStates, which?: readonly ReadName[]): LoadFailure | null {
  const down = downReads(r, which);
  const words = loadFailedWords(down);
  return words ? { down, words, busy: retryingOnly(r, down) } : null;
}
