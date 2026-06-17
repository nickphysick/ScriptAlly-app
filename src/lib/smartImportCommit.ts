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
import { doc, setDoc, getDocs, deleteDoc, collection, Timestamp } from "firebase/firestore";
import { db } from "./firebase";
import { recomputeQuery } from "./recomputeQuery";
import { Agent, ActivityType, QueryStatus, SubmissionMethod } from "../types";
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

// The linear pipeline ladder. Terminal statuses (Offer/Rejected/Withdrawn/No Response) and R&R
// aren't on it — they're appended as the final rung.
const LADDER: QueryStatus[] = [
  QueryStatus.QUERIED,
  QueryStatus.PARTIAL_REQUESTED,
  QueryStatus.PARTIAL_SENT,
  QueryStatus.FULL_REQUESTED,
  QueryStatus.FULL_SENT,
];
const STAGE_DATE_FIELD: Partial<Record<QueryStatus, keyof ParsedQuery>> = {
  [QueryStatus.QUERIED]: "dateQueried",
  [QueryStatus.PARTIAL_REQUESTED]: "partialRequestedDate",
  [QueryStatus.PARTIAL_SENT]: "partialSentDate",
  [QueryStatus.FULL_REQUESTED]: "fullRequestedDate",
  [QueryStatus.FULL_SENT]: "fullSentDate",
};
const TERMINAL = new Set<QueryStatus>([
  QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE,
]);

interface SeedRung { status: QueryStatus; date: string | null; }

/**
 * The activity rungs a query's final status implies, in pipeline order — so the SHAPE of the
 * history is correct (a "Partial Sent" query shows queried → partial-requested → partial-sent).
 * Each rung carries its genuine sheet date, or null when none is known (→ provisional, never
 * fabricated). A "sent" stage implies its matching "requested"; R&R implies a full was read.
 */
export function impliedRungs(q: ParsedQuery): SeedRung[] {
  const final = q.status!;
  const include = new Set<QueryStatus>([QueryStatus.QUERIED]);

  // Any ladder stage the sheet actually dated is part of the real shape.
  for (const s of LADDER) {
    const f = STAGE_DATE_FIELD[s];
    if (f && q[f]) include.add(s);
  }
  // The minimal implied path for the final status.
  const finalIdx = LADDER.indexOf(final);
  if (finalIdx >= 0) {
    include.add(final);
    if (final === QueryStatus.PARTIAL_SENT) include.add(QueryStatus.PARTIAL_REQUESTED);
    if (final === QueryStatus.FULL_SENT) include.add(QueryStatus.FULL_REQUESTED);
  } else if (final === QueryStatus.REVISE_RESUBMIT) {
    include.add(QueryStatus.FULL_REQUESTED);
    include.add(QueryStatus.FULL_SENT);
  }
  // Sent implies requested (an agent action — what "Responses received" derives from).
  if (include.has(QueryStatus.PARTIAL_SENT)) include.add(QueryStatus.PARTIAL_REQUESTED);
  if (include.has(QueryStatus.FULL_SENT)) include.add(QueryStatus.FULL_REQUESTED);

  const rungs: SeedRung[] = [];
  for (const s of LADDER) {
    if (include.has(s)) {
      const f = STAGE_DATE_FIELD[s];
      rungs.push({ status: s, date: (f ? (q[f] as string | null | undefined) : null) ?? null });
    }
  }
  if (finalIdx < 0) {
    // Off-ladder final rung — each carries its own date field: terminals → closedDate, Offer →
    // offerDate, Revise & Resubmit → reviseDate. A user-set date lands on its own rung, not queried.
    const finalDate = TERMINAL.has(final) ? (q.closedDate ?? null)
      : final === QueryStatus.OFFER ? (q.offerDate ?? null)
      : final === QueryStatus.REVISE_RESUBMIT ? (q.reviseDate ?? null)
      : null;
    rungs.push({ status: final, date: finalDate });
  }
  return rungs;
}

interface TimedRung extends SeedRung { ms: number; provisional: boolean; }

/**
 * Assign each rung an ordering-key time so derivation sorts them in correct pipeline order.
 * Dated rungs keep their real time (clamped monotonic). A provisional (date-unknown) rung is
 * sequenced relative to the nearest known date — just after a known rung below it, or just before
 * the first known rung above it — and never carries a real date (dateProvisional:true). A query
 * with NO known dates gets a synthetic monotonic key from importBaseMs + ladder index. These keys
 * are internal only; nothing surfaces them (the UI renders "date needed").
 */
export function assignTimes(rungs: SeedRung[], importBaseMs: number): TimedRung[] {
  const out: TimedRung[] = rungs.map((r) => ({ ...r, ms: NaN, provisional: r.date == null }));
  const firstDated = rungs.findIndex((r) => r.date != null);
  if (firstDated === -1) {
    out.forEach((r, i) => { r.ms = importBaseMs + i; });
    return out;
  }
  // Forward: dated rungs anchor; provisional rungs after an anchor sit 1ms later.
  let cursor = -Infinity;
  for (let i = 0; i < out.length; i++) {
    if (rungs[i].date != null) {
      const d = new Date(rungs[i].date as string).getTime();
      out[i].ms = cursor === -Infinity ? d : Math.max(d, cursor + 1);
      cursor = out[i].ms;
    } else if (cursor !== -Infinity) {
      out[i].ms = cursor + 1;
      cursor = out[i].ms;
    }
  }
  // Backward: leading provisional rungs (before the first dated) sit just before it, in order.
  for (let i = firstDated - 1; i >= 0; i--) {
    out[i].ms = out[i + 1].ms - 1;
  }
  return out;
}

export async function commitSmartImport(
  deps: CommitDeps,
  result: SmartImportResult,
  manuscriptId: string
): Promise<CommitOutcome> {
  const { userId, existingAgents, manuscriptTitle, addAgent, addQuery } = deps;
  const outcome: CommitOutcome = { agentsCreated: 0, agentsMerged: 0, queriesImported: 0, queriesSkipped: 0, errors: [] };

  const { importable, skipped } = validateSmartImport(result);
  outcome.queriesSkipped = skipped.length;

  // Snapshot the global activity-FEED ids before we write anything. addAgent emits an "Agent Added"
  // feed entry per agent and addQuery a "Query Sent"/"Status Changed" entry per query; after the
  // import we collapse all of those into ONE summary line so the dashboard feeds don't flood. The
  // authoritative per-query activity RUNGS (the status source) are written separately and untouched.
  const feedCol = collection(db, "users", userId, "activities");
  let preFeedIds = new Set<string>();
  try {
    preFeedIds = new Set((await getDocs(feedCol)).docs.map((d) => d.id));
  } catch { /* non-fatal: worst case we just don't collapse the feed */ }
  const importedQueryIds = new Set<string>();


  // 1. Agents — dedupe against existing, merge rather than duplicate. Import bypasses the
  //    Free-tier cap (same as the Import desk) so a real pipeline can land whole.
  //    Agency is the identity: an agency-only (no-name) agent is valid and written with an empty
  //    name. Only a row with NEITHER name nor agency is unidentifiable and skipped. Every row is
  //    isolated: one bad agent must never abort the batch (handleFirestoreError THROWS, so
  //    addAgent/addQuery can raise as well as return failure).
  const refToAgent: Record<string, { id: string; name: string }> = {};
  for (const a of result.agents || []) {
    if (!a.name?.trim() && !a.agency?.trim()) {
      // No name AND no agency — nothing to identify it by; its queries are skipped by validation.
      continue;
    }
    const agentName = a.name?.trim() ?? "";
    try {
      const match = existingAgents.find(
        (ex) => norm(ex.name) === norm(agentName) && norm(ex.agency) === norm(a.agency ?? "")
      );
      if (match) {
        refToAgent[a.ref] = { id: match.id, name: match.name };
        outcome.agentsMerged++;
        continue;
      }
      const res = await addAgent(
        {
          name: agentName,
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
      const label = agentName || a.agency || "(unnamed)";
      if (res.success && res.id) {
        refToAgent[a.ref] = { id: res.id, name: agentName };
        outcome.agentsCreated++;
      } else {
        outcome.errors.push(`Couldn't save agent ${label}: ${res.error || "unknown error"}`);
      }
    } catch (e) {
      console.error("Smart Import: agent write failed:", agentName || a.agency, e);
      outcome.errors.push(`Couldn't save agent ${agentName || a.agency || "(unnamed)"}.`);
    }
  }

  // 2. Queries — create the doc via the native addQuery (for the query record + the global-feed
  //    "Query sent to {Agent}" projection), then OWN the authoritative per-query activity log:
  //    clear whatever addQuery seeded (it stamps at import-time) and write the honest rung set —
  //    real dates where the sheet had them, provisional ordering keys where it didn't — so status,
  //    pipeline dates, "Responses received" and revisionRound all derive correctly. Recompute once.
  const importBaseMs = Date.now();
  for (const q of importable) {
    const agent = refToAgent[q.agentRef];
    if (!agent) {
      outcome.queriesSkipped++;
      outcome.errors.push(`Skipped a ${q.status} query — its agent couldn't be saved.`);
      continue;
    }

    let queryId: string;
    try {
      const res = await addQuery(
        {
          manuscriptId,
          agentId: agent.id,
          packageId: "",
          personalisationNotes: q.notes ?? "",
          sendMethod: SubmissionMethod.EMAIL,
          status: q.status!,
          // Only pass a real query date; without one the query imports provisionally.
          ...(q.dateQueried ? { dateSent: q.dateQueried } : {}),
        },
        true
      );
      if (!res.success || !res.id) {
        outcome.errors.push(`Couldn't import the query to ${agent.name}: ${res.error || "unknown error"}`);
        continue;
      }
      queryId = res.id;
      importedQueryIds.add(queryId);
    } catch (e) {
      console.error("Smart Import: query write failed:", agent.name, e);
      outcome.errors.push(`Couldn't import the query to ${agent.name}.`);
      continue;
    }

    try {
      const actCol = collection(db, "users", userId, "queries", queryId, "activity");
      const existing = await getDocs(actCol);
      await Promise.all(existing.docs.map((d) => deleteDoc(d.ref)));

      for (const rung of assignTimes(impliedRungs(q), importBaseMs)) {
        const id = "imp-" + Math.random().toString(36).substr(2, 9);
        await setDoc(doc(actCol, id), {
          type: rung.status,
          resultingStatus: rung.status,
          createdAt: Timestamp.fromMillis(rung.ms),
          note: rung.provisional ? `${rung.status} (imported — date needed)` : `${rung.status} (imported)`,
          ...(rung.provisional ? { dateProvisional: true } : {}),
          queryId,
          agentName: agent.name,
          manuscriptTitle,
        });
      }
      await recomputeQuery(userId, queryId);
      outcome.queriesImported++;
    } catch (e) {
      console.error("Smart Import: seeding/recompute failed:", agent.name, e);
      outcome.errors.push(`Couldn't seed the history for the query to ${agent.name}.`);
      // The query doc exists; count it so the user is never falsely told zero were imported.
      outcome.queriesImported++;
    }
  }

  // Collapse the per-row dashboard-feed projections into ONE summary line. Delete the feed entries
  // this import created — every new "Agent Added", and every "Query Sent"/"Status Changed" for an
  // imported query — then write a single "Smart import · …" event. Per-query activity rungs (the
  // status source of truth) and provisional rungs are untouched. Non-fatal: a feed left un-collapsed
  // is cosmetic, never a failed import.
  try {
    const post = await getDocs(feedCol);
    await Promise.all(
      post.docs
        .filter((d) => {
          if (preFeedIds.has(d.id)) return false;
          const data = d.data() as { activityType?: string; queryId?: string };
          return data.activityType === ActivityType.AGENT_ADDED
            || (typeof data.queryId === "string" && importedQueryIds.has(data.queryId));
        })
        .map((d) => deleteDoc(d.ref))
    );

    const summaryId = "imp-sum-" + Math.random().toString(36).substr(2, 9);
    await setDoc(doc(feedCol, summaryId), {
      id: summaryId,
      userId,
      queryId: "",
      manuscriptId: "",
      activityType: ActivityType.STATUS_CHANGED, // non-housekeeping so it shows in "The story so far"
      description: `Smart import · ${outcome.agentsCreated} agents added, ${outcome.queriesImported} queries logged`,
      date: new Date(importBaseMs).toISOString(),
      details: "",
    });
  } catch (e) {
    console.error("Smart Import: feed-summary collapse failed:", e);
  }

  return outcome;
}
