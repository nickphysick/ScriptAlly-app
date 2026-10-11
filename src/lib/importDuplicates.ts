/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Importing the same sheet twice must not double the history (import-truth, phase 4).
 *
 * A query in a file is ALREADY HERE when the account holds a query for the same agent and the
 * same manuscript, sent on the same day — or both with no sent date. It is not written, its
 * history is not written, and it is listed under the import's skipped rows as
 * "Already in your queries". The same agent with a different manuscript is a new query.
 *
 * One agent match for every import path (`sameAgent`): the template and Smart Import's commit, the
 * review's "already on your list" note, the duplicate check and the column matcher all ask it, so
 * an agent already on the Contact list is not added again on any of them.
 */
import type { Agent, Query } from "../types";
import type { ParsedAgent, ParsedQuery, SmartImportResult } from "../types/smartImport";

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

/**
 * Is the file's agent one already on the list? The names match, and the agencies match or one side
 * gives none. An agent known only by agency (no name) matches only the same agency.
 */
export function sameAgent(
  existing: Pick<Agent, "name" | "agency">,
  file: { name?: string | null; agency?: string | null },
): boolean {
  const n1 = norm(existing.name), n2 = norm(file.name);
  const a1 = norm(existing.agency), a2 = norm(file.agency);
  if (n1 !== n2) return false;
  if (!n1) return !!a1 && a1 === a2;
  return !a1 || !a2 || a1 === a2;
}
export function findExistingAgent<T extends Pick<Agent, "name" | "agency">>(
  existing: readonly T[], file: { name?: string | null; agency?: string | null },
): T | undefined {
  if (!norm(file.name) && !norm(file.agency)) return undefined;
  return existing.find((ex) => sameAgent(ex, file));
}

/** The reason a duplicate carries in the skipped-rows notice. */
export const ALREADY_REASON = "Already in your queries";

/** The day a query was sent, as written (YYYY-MM-DD), or "" for none. */
export const sentDay = (iso: string | null | undefined): string => (iso ?? "").slice(0, 10);

/** Same agent, same manuscript, same sent day — or both with no sent date. */
export function isSameQuery(
  existing: Pick<Query, "agentId" | "manuscriptId" | "dateSent">,
  cand: { agentId: string; manuscriptId: string; sentDate: string | null | undefined },
): boolean {
  return !!cand.agentId && !!cand.manuscriptId
    && existing.agentId === cand.agentId && existing.manuscriptId === cand.manuscriptId
    && sentDay(existing.dateSent) === sentDay(cand.sentDate);
}

export interface DuplicateRow { query: ParsedQuery; agent: ParsedAgent | undefined }
export interface DuplicateSplit {
  /** the result with the duplicates gone, and with them any agent already on the list that has no
   *  other query in the file — what is left is what the import will write */
  fresh: SmartImportResult;
  duplicates: DuplicateRow[];
}

/**
 * Split a read file into what is new and what is already in the account.
 * `manuscriptId` is the manuscript the import files its queries under; with none yet (set-up,
 * before the manuscript exists) nothing can be a duplicate.
 */
export function splitDuplicates(
  result: SmartImportResult,
  existingAgents: readonly Pick<Agent, "id" | "name" | "agency">[],
  existingQueries: readonly Pick<Query, "agentId" | "manuscriptId" | "dateSent">[],
  manuscriptId: string | null | undefined,
): DuplicateSplit {
  const agents = result.agents ?? [];
  const queries = result.queries ?? [];
  if (!manuscriptId || existingQueries.length === 0) return { fresh: result, duplicates: [] };

  const byRef = new Map(agents.map((a) => [a.ref, a]));
  const existingFor = new Map<string, string | null>();
  const idFor = (ref: string): string | null => {
    if (!existingFor.has(ref)) {
      const a = byRef.get(ref);
      existingFor.set(ref, (a && findExistingAgent(existingAgents, a)?.id) || null);
    }
    return existingFor.get(ref)!;
  };

  const duplicates: DuplicateRow[] = [];
  const kept: ParsedQuery[] = [];
  for (const q of queries) {
    const agentId = idFor(q.agentRef);
    const dup = !!agentId && existingQueries.some((ex) => isSameQuery(ex, { agentId, manuscriptId, sentDate: q.sentDate }));
    if (dup) duplicates.push({ query: q, agent: byRef.get(q.agentRef) });
    else kept.push(q);
  }
  if (duplicates.length === 0) return { fresh: result, duplicates };

  const stillQueried = new Set(kept.map((q) => q.agentRef));
  const dupRefs = new Set(duplicates.map((d) => d.query.agentRef));
  // an agent already on the list whose every row here is a duplicate has nothing left to write
  const keptAgents = agents.filter((a) => !(dupRefs.has(a.ref) && !stillQueried.has(a.ref)));
  return { fresh: { ...result, agents: keptAgents, queries: kept }, duplicates };
}
