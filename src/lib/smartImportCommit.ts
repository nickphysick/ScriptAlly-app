/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smart Import commit — the deterministic half that protects the database. Runs only after the
 * user confirms the review screen. Dedupes agents against the existing list (merge, never
 * duplicate), attaches every imported query to the Branch-B manuscript, and seeds each query's
 * activity history through the same shapes native query-logging writes, so recomputeQuery
 * derives status, stage dates, and the "Responses Received" flag identically to hand-logged
 * queries. No model involvement here.
 */
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "./firebase";
import { recomputeQuery } from "./recomputeQuery";
import { Agent, QueryStatus, SubmissionMethod } from "../types";
import { SmartImportResult, ParsedAgent, ParsedQuery } from "../types/smartImport";
import { validateSmartImport } from "./smartImport";

export interface CommitDeps {
  userId: string;
  existingAgents: Agent[];
  manuscriptTitle: string;
  addAgent: (
    a: Omit<Agent, "id" | "userId" | "dateAdded" | "lastCheckedDate"> & { id?: string },
    bypassLimits?: boolean
  ) => Promise<{ success: boolean; error?: string; id?: string }>;
  addQuery: (
    q: any,
    bypassLimits?: boolean
  ) => Promise<{ success: boolean; error?: string; id?: string }>;
}

export interface CommitOutcome {
  agentsCreated: number;
  agentsMerged: number;
  queriesImported: number;
  queriesSkipped: number;
  errors: string[];
}

const norm = (s = "") => s.trim().toLowerCase();

/** How many agents in the proposal already exist (for the review screen's merge note). */
export function countExistingMatches(result: SmartImportResult, existingAgents: Agent[]): number {
  return (result.agents || []).filter((a) =>
    existingAgents.some(
      (ex) => norm(ex.name) === norm(a.name) && (!a.agency || !ex.agency || norm(ex.agency) === norm(a.agency))
    )
  ).length;
}

const mapMethod = (m: ParsedAgent["submissionMethod"]): SubmissionMethod =>
  m === "Online Form" ? SubmissionMethod.ONLINE_FORM : SubmissionMethod.EMAIL;

// Pipeline ladder positions for rung seeding; terminal statuses sit above every rung.
const LADDER: Partial<Record<QueryStatus, number>> = {
  [QueryStatus.QUERIED]: 0,
  [QueryStatus.PARTIAL_REQUESTED]: 1,
  [QueryStatus.PARTIAL_SENT]: 2,
  [QueryStatus.FULL_REQUESTED]: 3,
  [QueryStatus.FULL_SENT]: 4,
};
const finalPosition = (s: QueryStatus): number => LADDER[s] ?? 99; // terminal → above all rungs

const RUNGS: { field: keyof ParsedQuery; status: QueryStatus; note: string }[] = [
  { field: "partialRequestedDate", status: QueryStatus.PARTIAL_REQUESTED, note: "Partial requested (imported)" },
  { field: "partialSentDate", status: QueryStatus.PARTIAL_SENT, note: "Partial sent (imported)" },
  { field: "fullRequestedDate", status: QueryStatus.FULL_REQUESTED, note: "Full requested (imported)" },
  { field: "fullSentDate", status: QueryStatus.FULL_SENT, note: "Full sent (imported)" },
];

export async function commitSmartImport(
  deps: CommitDeps,
  result: SmartImportResult,
  manuscriptId: string
): Promise<CommitOutcome> {
  const { userId, existingAgents, manuscriptTitle, addAgent, addQuery } = deps;
  const outcome: CommitOutcome = { agentsCreated: 0, agentsMerged: 0, queriesImported: 0, queriesSkipped: 0, errors: [] };

  const { importable, skipped } = validateSmartImport(result);
  outcome.queriesSkipped = skipped.length;

  // 1. Agents — dedupe against existing, merge rather than duplicate. Import bypasses the
  //    Free-tier cap (same as the Import desk) so a real pipeline can land whole.
  const refToAgent: Record<string, { id: string; name: string }> = {};
  for (const a of result.agents || []) {
    const match = existingAgents.find(
      (ex) => norm(ex.name) === norm(a.name) && (!a.agency || !ex.agency || norm(ex.agency) === norm(a.agency))
    );
    if (match) {
      refToAgent[a.ref] = { id: match.id, name: match.name };
      outcome.agentsMerged++;
      continue;
    }
    const res = await addAgent(
      {
        name: a.name,
        agency: a.agency ?? "",
        email: a.email ?? "",
        website: a.website ?? "",
        genres: a.genres ?? [],
        mswlNotes: a.mswlNotes ?? "",
        starRating: 3,
        submissionStatus: "Open" as any,
        responseTimeWeeks: a.responseTimeWeeks ?? 0,
        noResponseMeansNo: a.noResponseMeansNo ?? false,
        submissionMethod: mapMethod(a.submissionMethod),
        materialsWanted: [],
        notes: "",
        importedNeedsReview: true,
      },
      true
    );
    if (res.success && res.id) {
      refToAgent[a.ref] = { id: res.id, name: a.name };
      outcome.agentsCreated++;
    } else {
      outcome.errors.push(`Couldn't save agent ${a.name}: ${res.error || "unknown error"}`);
    }
  }

  // 2. Queries — create through the native addQuery (it seeds QUERY_SENT + the final-status
  //    entry and recomputes), then append dated intermediate rungs in the same per-query
  //    activity shape and recompute once more so historical stage dates derive correctly.
  for (const q of importable) {
    const agent = refToAgent[q.agentRef];
    if (!agent) {
      outcome.queriesSkipped++;
      continue;
    }

    const res = await addQuery(
      {
        manuscriptId,
        agentId: agent.id,
        packageId: "",
        personalisationNotes: q.notes ?? "",
        sendMethod: SubmissionMethod.EMAIL,
        status: q.status!,
        dateSent: q.dateQueried!,
      },
      true
    );
    if (!res.success || !res.id) {
      outcome.errors.push(`Couldn't import the query to ${agent.name}: ${res.error || "unknown error"}`);
      continue;
    }
    const queryId = res.id;

    // Intermediate rungs strictly below the final status, only where the sheet gave a date.
    const finalPos = finalPosition(q.status!);
    let appended = false;
    for (const rung of RUNGS) {
      const date = q[rung.field] as string | null | undefined;
      if (!date || (LADDER[rung.status] ?? 0) >= finalPos) continue;
      try {
        const id = "imp-" + Math.random().toString(36).substr(2, 9);
        await setDoc(doc(db, "users", userId, "queries", queryId, "activity", id), {
          type: rung.status,
          resultingStatus: rung.status,
          createdAt: Timestamp.fromDate(new Date(date)),
          note: rung.note,
          queryId,
          agentName: agent.name,
          manuscriptTitle,
        });
        appended = true;
      } catch (e) {
        outcome.errors.push(`Couldn't seed ${rung.status} history for ${agent.name}.`);
      }
    }
    if (appended) {
      try {
        await recomputeQuery(userId, queryId);
      } catch {
        outcome.errors.push(`Couldn't recompute the imported query to ${agent.name}.`);
      }
    }
    outcome.queriesImported++;
  }

  return outcome;
}
