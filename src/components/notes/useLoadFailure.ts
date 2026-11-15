/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The signed-in app's read failure, from the loader (overnight fixes v1, Part 2). Kept apart from `LoadFailed` so the
 * component stays free of the db (and Firebase) for the pages tests render bare.
 */
import { useScriptAllyDb } from "../../lib/db";
import { loadFailure, type LoadFailure, type ReadName } from "../../lib/loadFailure";

export type PageLoadFailure = LoadFailure & { retry: () => void };

/** The signed-in app's read failure, from the loader. `which` narrows it to the reads a page draws from. */
export function useLoadFailure(which?: readonly ReadName[]): PageLoadFailure | null {
  /* every caller already reads the db through useScriptAllyDb, so its tests' mocks serve this too (absent reads: up) */
  const db = useScriptAllyDb();
  const f = loadFailure({ queriesRead: db.queriesRead, agentsRead: db.agentsRead, manuscriptsRead: db.manuscriptsRead }, which);
  if (!f) return null;
  /* retryReads re-runs every failed read, agents included; retryAgents stands in for a context that predates it */
  return { ...f, retry: () => (db.retryReads ? db.retryReads() : db.retryAgents?.()) };
}
