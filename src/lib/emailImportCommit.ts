/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Email-import commit — the deterministic write half. Runs only after the user reviews and hits
 * "Add". It persists the accepted records through the SAME primitives native logging uses:
 *
 *   · new_agent → addAgent (agency required, name optional) then addQuery (manuscript ↔ agent),
 *     clearing addQuery's auto-seeded rung so our honest rung set is authoritative.
 *   · matched   → append rungs to the existing query (creates nothing).
 *
 * Rungs are written in the exact per-query `activity` subcollection shape Smart Import uses
 * (`{ type, resultingStatus, createdAt, note, dateProvisional? }`), with `assignTimes` (reused from
 * smartImportCommit) giving provisional rungs ordering-only keys. recomputeQuery is then the single
 * writer of derived status / pipeline dates — provisional rungs' dates are never surfaced.
 *
 * Atomicity: addAgent/addQuery encapsulate their own writes and can't join one transaction, so —
 * as in Smart Import — operations are ordered so a mid-way failure is recoverable and surfaced
 * (agent persists with importedNeedsReview; the error is thrown, never a silent partial). The rung
 * set itself is one writeBatch.
 */
import { collection, doc, getDocs, deleteDoc, writeBatch, query, where, Timestamp } from "firebase/firestore";
import { db } from "./firebase";
import { recomputeQuery } from "./recomputeQuery";
import { assignTimes } from "./smartImportCommit";
import { QueryStatus, SubmissionMethod, SubmissionStatus, ActivityType, Agent } from "../types";
import type { ProposalRecord, ProposalSubject } from "./emailImport";

export interface EmailCommitDeps {
  userId: string;
  manuscriptTitle: string;
  addAgent: (
    a: Omit<Agent, "id" | "userId" | "dateAdded" | "lastCheckedDate"> & { id?: string },
    bypassLimits?: boolean
  ) => Promise<{ success: boolean; error?: string; id?: string }>;
  addQuery: (q: any, bypassLimits?: boolean) => Promise<{ success: boolean; error?: string; id?: string }>;
}

export interface EmailCommitResult {
  agentName: string;
  queryId: string;
  recordCount: number;
  created: boolean; // true when a new agent + query were created
}

const tsMillis = (v: any): number => (v && typeof v.toMillis === "function" ? v.toMillis() : 0);

/**
 * Ordering keys for the rungs. A rung with a real date is DATED — its createdAt is derived from
 * that date and is NEVER overridden (assignTimes' monotonic clamp must not touch it, or a user-set
 * date would be silently shifted to an import-time/sequential value). assignTimes governs ordering
 * for the provisional (date-less) rungs only, relative to the dated anchors and importBaseMs.
 *
 * Dated-ness is decided by the presence of a real date, not by the dateProvisional flag — so a
 * user-supplied date always lands even if an upstream flag is momentarily inconsistent.
 */
export function timeRungs(
  rungs: { status: QueryStatus; date: string | null }[],
  importBaseMs: number
): { status: QueryStatus; ms: number; provisional: boolean }[] {
  return assignTimes(rungs, importBaseMs).map((t, i) =>
    rungs[i].date != null
      ? { status: t.status, ms: new Date(rungs[i].date as string).getTime(), provisional: false }
      : { status: t.status, ms: t.ms, provisional: true }
  );
}

/**
 * Global-feed (timeline) projection for a pipeline status — phrasings the timeline grammar
 * (getActivityKeyAndDefaults / extractAgentFromText) recognises; the glyph/family comes from
 * resultingStatus, set alongside.
 */
function feedEntryFor(status: QueryStatus, agentName: string, agency: string): { type: ActivityType; desc: string } {
  const at = `${agentName} at ${agency}`;
  switch (status) {
    case QueryStatus.QUERIED: return { type: ActivityType.QUERY_SENT, desc: `Query sent to ${at}` };
    case QueryStatus.PARTIAL_REQUESTED: return { type: ActivityType.STATUS_CHANGED, desc: `${at} requested a partial manuscript` };
    case QueryStatus.PARTIAL_SENT: return { type: ActivityType.MATERIALS_SENT, desc: `Partial manuscript sent to ${at}` };
    case QueryStatus.FULL_REQUESTED: return { type: ActivityType.STATUS_CHANGED, desc: `${at} requested the full manuscript` };
    case QueryStatus.FULL_SENT: return { type: ActivityType.MATERIALS_SENT, desc: `Full manuscript sent to ${at}` };
    case QueryStatus.REVISE_RESUBMIT: return { type: ActivityType.STATUS_CHANGED, desc: `Revise & Resubmit request received from ${at}` };
    case QueryStatus.OFFER: return { type: ActivityType.STATUS_CHANGED, desc: `Offer of representation from ${at}` };
    case QueryStatus.REJECTED: return { type: ActivityType.STATUS_CHANGED, desc: `Rejection received from ${at}` };
    case QueryStatus.WITHDRAWN: return { type: ActivityType.STATUS_CHANGED, desc: `Withdrew query from ${at}` };
    case QueryStatus.NO_RESPONSE: return { type: ActivityType.STATUS_CHANGED, desc: `No response received from ${at}` };
    default: return { type: ActivityType.STATUS_CHANGED, desc: `${status} — ${at}` };
  }
}

/**
 * Persist the accepted records. `accepted` must already carry the user's resolved date state
 * (a real `date` with `dateProvisional:false`, or `dateProvisional:true` with `date:null`).
 */
export async function commitEmailImport(
  deps: EmailCommitDeps,
  subject: ProposalSubject,
  manuscriptId: string,
  accepted: ProposalRecord[]
): Promise<EmailCommitResult> {
  if (accepted.length === 0) throw new Error("Nothing to add — accept at least one record.");

  let queryId: string;
  let agentName: string;
  let created = false;
  let clearSeededRung = false;

  if (subject.kind === "new_agent") {
    // 1a. Create the agent — agency is the confirmed identity; name only if present.
    const agentRes = await deps.addAgent(
      {
        name: subject.agentName?.trim() ?? "",
        agency: subject.agency,
        email: "",
        website: "",
        genres: [],
        mswlNotes: "",
        starRating: 3,
        submissionStatus: SubmissionStatus.OPEN,
        responseTimeWeeks: 0,
        noResponseMeansNo: false,
        submissionMethod: SubmissionMethod.EMAIL,
        materialsWanted: [],
        notes: "",
        importedNeedsReview: true,
      },
      true
    );
    if (!agentRes.success || !agentRes.id) {
      throw new Error(agentRes.error || "Couldn't create the agent.");
    }
    const agentId = agentRes.id;
    agentName = subject.agentName?.trim() || subject.agency;

    // 1b. Create the query. Initial status = the most-advanced accepted rung; recomputeQuery
    //     confirms it from the rungs. Only pass dateSent when a real queried date is known.
    const initialStatus = (accepted[accepted.length - 1].resultingStatus as QueryStatus) || QueryStatus.QUERIED;
    const queriedDated = accepted.find(
      (r) => r.resultingStatus === QueryStatus.QUERIED && !r.dateProvisional && r.date
    );
    const qRes = await deps.addQuery(
      {
        manuscriptId,
        agentId,
        packageId: "",
        personalisationNotes: "",
        sendMethod: SubmissionMethod.EMAIL,
        status: initialStatus,
        ...(queriedDated?.date ? { dateSent: queriedDated.date } : {}),
      },
      true
    );
    if (!qRes.success || !qRes.id) {
      // The agent now exists (importedNeedsReview) — recoverable; surface, never silent-partial.
      throw new Error(qRes.error || "Created the agent, but couldn't create the query. Please try again.");
    }
    queryId = qRes.id;
    created = true;
    clearSeededRung = true;
  } else {
    if (!subject.queryId) throw new Error("Matched proposal is missing its queryId.");
    queryId = subject.queryId;
    agentName = subject.agentName?.trim() || subject.agency;
  }

  // 2. Write the rungs into the per-query activity subcollection.
  const actCol = collection(db, "users", deps.userId, "queries", queryId, "activity");

  // new_agent → drop addQuery's auto-seeded rung so our set is authoritative; base ordering at now.
  // matched   → keep the real history; base provisional ordering AFTER the latest existing rung.
  let baseMs = Date.now();
  const existing = await getDocs(actCol);
  if (clearSeededRung) {
    await Promise.all(existing.docs.map((d) => deleteDoc(d.ref)));
  } else {
    const latest = Math.max(0, ...existing.docs.map((d) => tsMillis(d.data().createdAt)));
    baseMs = Math.max(Date.now(), latest + 1);
  }

  // Dated-ness is the presence of a real date (user-set or stated), NOT the flag — so a date the
  // user supplied always lands. Provisional rungs (no date) get ordering keys; dated rungs keep
  // their real createdAt (timeRungs never lets assignTimes override it).
  const seedRungs = accepted.map((r) => ({
    status: r.resultingStatus as QueryStatus,
    date: r.date ?? null,
  }));
  const timed = timeRungs(seedRungs, baseMs);

  const batch = writeBatch(db);
  for (let i = 0; i < timed.length; i++) {
    const rung = timed[i];
    const ref = doc(actCol, `eml-${baseMs}-${i}-${Math.random().toString(36).slice(2, 8)}`);
    batch.set(ref, {
      type: rung.status,
      resultingStatus: rung.status,
      createdAt: Timestamp.fromMillis(rung.ms),
      note: rung.provisional ? `${rung.status} (from email — date needed)` : `${rung.status} (from email)`,
      ...(rung.provisional ? { dateProvisional: true } : {}),
      queryId,
      agentName,
      manuscriptTitle: deps.manuscriptTitle,
    });
  }
  await batch.commit();

  // 2b. Global activities feed — the source the Dashboard "Story so far" timeline reads (FortnightInFocus
  //     derives pipeline dates from the query doc, which recomputeQuery sets, so it's already correct).
  //     addQuery stamped its seed events at the import time; imported pipeline events must instead carry
  //     each rung's REAL date. Provisional rungs get no feed event (never assert a date the user didn't give).
  const feedCol = collection(db, "users", deps.userId, "activities");
  if (created) {
    // Replace addQuery's now-dated pipeline seeds for THIS query. The agent-added meta-event carries
    // queryId:"" (it legitimately happened now), so it is never matched here and stays put.
    const seeded = await getDocs(query(feedCol, where("queryId", "==", queryId)));
    await Promise.all(seeded.docs.map((d) => deleteDoc(d.ref)));
  }
  const feedBatch = writeBatch(db);
  for (const rung of timed) {
    if (rung.provisional) continue;
    const ref = doc(feedCol);
    const { type, desc } = feedEntryFor(rung.status, agentName, subject.agency);
    feedBatch.set(ref, {
      id: ref.id,
      userId: deps.userId,
      queryId,
      manuscriptId,
      activityType: type,
      description: desc,
      date: new Date(rung.ms).toISOString(), // the rung's real date — not the import time
      details: "",
      resultingStatus: rung.status,
    });
  }
  await feedBatch.commit();

  // 3. Single writer of derived state — status, pipeline dates (provisional dates left unset),
  //    responses, revisionRound — all from the rungs. Never write status directly.
  await recomputeQuery(deps.userId, queryId);

  return { agentName, queryId, recordCount: accepted.length, created };
}
