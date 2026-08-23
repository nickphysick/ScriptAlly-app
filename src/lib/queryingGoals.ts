/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QUERYING GOALS — the storage contract. (Phase 1 of the goals pack; the derivation lands in
 * Phase 2 and this file grows into it.)
 *
 * ⚠️ THE LIST IS THE ONLY THING STORED. A goal is an append-only sequence of intents on the user
 * document; the count, the period, the label, whether the target was reached and on what day, and
 * the four-period history are ALL derived at read time from that list and the writer's queries.
 * There is deliberately no progress counter, no `met` flag, no period-close write and no cached
 * history — every one of those is a second source of truth for something the queries already say,
 * and this codebase has paid for that shape before.
 *
 * ⚠️ APPEND, NEVER MUTATE. Rewriting the last entry to change a target would restate the past:
 * a period that ran under a target of 5 would retroactively have run under 12. Appending leaves
 * the old intent standing and dates the new one, which is what lets a completed period be read
 * with the target that was actually in force while it was running.
 */
import type { QueryingGoalEntry } from "../types";

/**
 * ⚠️ ARTEFACT-LOCKED TO `firestore.rules` — the `queryingGoals` size cap in `isValidUser` MUST
 * carry this same number. If the two drift, the client permits a write the rules deny SILENTLY,
 * which is the failure this repo has met before (see the MAX_COMPS note in the rules file).
 * `queryingGoalsCap.test.ts` reads both files and fails when they disagree.
 *
 * ⚠️ IT IS A DOCUMENT-SIZE GUARD, NOT A LIMIT ON HOW OFTEN YOU MAY CHANGE YOUR MIND. An entry is
 * roughly 80 bytes; 200 of them is ~16KB against a 1MB document. A writer who changed target
 * every month for sixteen years would reach it.
 */
export const MAX_GOAL_ENTRIES = 200;

/** The entries a write may carry — the tail, if a very long history ever reaches the cap. */
export const boundGoalEntries = (entries: readonly QueryingGoalEntry[]): QueryingGoalEntry[] =>
  entries.length <= MAX_GOAL_ENTRIES ? [...entries] : entries.slice(entries.length - MAX_GOAL_ENTRIES);
