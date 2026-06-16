/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smart Import review — the pure working model behind the two-screen review UI. No React, no
 * Firebase: parsing a `SmartImportResult` into the editable `agents[]` + `queries[]` model, the
 * status/reason derivations the cards read, and converting the final model back into a
 * `SmartImportResult` for Prompt 1's `commitSmartImport`. Kept standalone so it's unit-testable.
 */
import { QueryStatus } from "../types";
import { ParsedAgent, ParsedQuery, SmartImportResult } from "../types/smartImport";

// ── Working model ───────────────────────────────────────────────────────────────────────────────
export interface ReviewAgent {
  id: string;            // = ParsedAgent.ref (stable)
  name: string;
  agency: string;
  agencyOnly: boolean;   // the "?" toggle — name unknown, referenced by agency
  genres: string[];
  website: string;
  submissionsOpen: boolean;
  weeks: number;         // 1–26
  rating: number;        // 0–5 (0 = unrated)
  /** Per-reason items, each with its own friendly note + a resolved flag. Resolving a reason marks
   *  it done (struck-through sage note kept for confirmation) rather than dropping it; the card's
   *  status derives from whether any reason is still OPEN. The single `duplicate` reason lives on the
   *  group LEADER only — the whole duplicate cluster shares one notice. */
  reasons: ReasonItem[];
  mergeWith: string[];   // ids of likely-duplicate siblings (same agency); kept intact across resolve
  mergeResolved: boolean;
  deleted: boolean;
}

/** Why a card needs a look. `duplicate` resolves via the remove-one / keep-both controls; `mapping`
 *  is the low-confidence / flagged-by-the-mapper reason, resolved by "Mark as checked". */
export type CheckReason = "duplicate" | "mapping";
/** `undoable` notes show an Undo beside "✓ Checked"; a destructively-merged duplicate is not. */
export interface ReasonItem { kind: CheckReason; note: string; resolved: boolean; undoable: boolean; }

/** Default note for the mapping reason when the mapper didn't supply a sentence of its own. */
export const MAPPING_NOTE = "We weren't fully sure we read this agent's details correctly — worth a quick look.";
/** Default note for a query whose status mapping was low-confidence. */
export const QUERY_CHECK_NOTE = "We weren't fully sure how to read this query's status — worth a quick look.";
export const dupNoteOpen = (agency: string) =>
  `Looks like the same agent at ${agency}, imported more than once — remove the duplicate, or keep both.`;
export const dupNoteKept = (agency: string) => `Kept both — separate agents at ${agency}.`;
export const dupNoteMerged = "Merged the duplicate in — its queries moved across, nothing lost.";

/** Status precedence: no agency is a distinct blocking state; otherwise any open reason — or being a
 *  member of an unresolved duplicate cluster — means needs-check. */
export type AgentStatus = "needs-agency" | "needs-check" | "captured";
export const hasOpenReasons = (a: ReviewAgent) => a.reasons.some((r) => !r.resolved);
export const agentStatus = (a: ReviewAgent, dupOpen = false): AgentStatus =>
  !a.agency.trim() ? "needs-agency" : hasOpenReasons(a) || dupOpen ? "needs-check" : "captured";
export const resolveReason = (a: ReviewAgent, kind: CheckReason): ReasonItem[] =>
  a.reasons.map((r) => (r.kind === kind ? { ...r, resolved: true } : r));

export interface ReviewQuery {
  id: string;
  agentRef: string;
  status: QueryStatus;
  /** The date of this query's current status, or null → shown as "date needed" (never fabricated).
   *  A missing date is NOT a check reason and never blocks import. */
  date: string | null;
  /** Same reason/resolve machinery as agents — a low-confidence status mapping carries one. */
  reasons: ReasonItem[];
  removed: boolean;
  removedReason?: "Agent removed" | "Removed by you";
}

const normalise = (s = "") => s.trim().toLowerCase();
const friendly = (issues?: string[]): string | null =>
  issues && issues.length ? issues.join(" ") : null;

// ── Query dates & status options ─────────────────────────────────────────────────────────────────
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** Format an ISO date for display; null → "date needed" (never a fabricated date). */
export const fmtDate = (iso: string | null): string => {
  if (!iso) return "date needed";
  const [y, m, d] = iso.split("-").map(Number);
  return y && m && d ? `${d} ${MONTHS[m - 1]} ${y}` : iso;
};
export const QUERY_STATUS_OPTIONS: QueryStatus[] = [
  QueryStatus.QUERIED, QueryStatus.PARTIAL_REQUESTED, QueryStatus.PARTIAL_SENT,
  QueryStatus.FULL_REQUESTED, QueryStatus.FULL_SENT, QueryStatus.REVISE_RESUBMIT,
  QueryStatus.OFFER, QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE,
];
export const queryStatusOf = (q: ReviewQuery): "needs-check" | "captured" =>
  q.reasons.some((r) => !r.resolved) ? "needs-check" : "captured";

/** Which ParsedQuery field carries the date for a status's RUNG — i.e. which rung a known or
 *  user-set date should seed. This is what keeps the timeline honest: a Full Sent date seeds the
 *  full-sent rung, an Offer date the offer rung, etc. (commitSmartImport's impliedRungs reads exactly
 *  these per-rung fields). Every status maps to its own field — Offer → offerDate, Revise & Resubmit
 *  → reviseDate — so a date is never bodged onto the queried rung by default. */
export const dateFieldForStatus = (status: QueryStatus): keyof ParsedQuery => {
  switch (status) {
    case QueryStatus.QUERIED: return "dateQueried";
    case QueryStatus.PARTIAL_REQUESTED: return "partialRequestedDate";
    case QueryStatus.PARTIAL_SENT: return "partialSentDate";
    case QueryStatus.FULL_REQUESTED: return "fullRequestedDate";
    case QueryStatus.FULL_SENT: return "fullSentDate";
    case QueryStatus.OFFER: return "offerDate";
    case QueryStatus.REVISE_RESUBMIT: return "reviseDate";
    case QueryStatus.REJECTED:
    case QueryStatus.WITHDRAWN:
    case QueryStatus.NO_RESPONSE: return "closedDate";
    default: return "dateQueried";
  }
};

/** Parse the AI result into the editable working model. Duplicate detection: non-deleted agents
 *  that share a normalised (non-empty) agency are flagged as merge siblings. */
export function parseModel(result: SmartImportResult): { agents: ReviewAgent[]; queries: ReviewQuery[] } {
  const agents: ReviewAgent[] = (result.agents || []).map((a) => ({
    id: a.ref,
    name: (a.name || "").trim(),
    agency: (a.agency || "").trim(),
    agencyOnly: !((a.name || "").trim()) && !!(a.agency || "").trim(),
    genres: a.genres ?? [],
    website: a.website ?? "",
    submissionsOpen: a.submissionMethod !== null ? true : true,
    weeks: a.responseTimeWeeks && a.responseTimeWeeks > 0 ? Math.min(26, a.responseTimeWeeks) : 6,
    rating: 0,
    reasons: (a.confidence === "low" || !!(a.issues && a.issues.length)
      ? [{ kind: "mapping", note: friendly(a.issues) || MAPPING_NOTE, resolved: false, undoable: true } as ReasonItem]
      : []),
    mergeWith: [],
    mergeResolved: false,
    deleted: false,
  }));

  // Flag same-agency siblings as merge candidates. The LEADER carries the shared dedupe control and
  // the single `duplicate` reason (one post-it for the whole cluster) — members get neither.
  const byAgency = new Map<string, ReviewAgent[]>();
  for (const a of agents) {
    if (!a.agency) continue;
    const k = normalise(a.agency);
    (byAgency.get(k) ?? byAgency.set(k, []).get(k)!).push(a);
  }
  for (const group of byAgency.values()) {
    if (group.length < 2) continue;
    const [leader, ...rest] = group;
    leader.mergeWith = rest.map((r) => r.id);
    if (!leader.reasons.some((r) => r.kind === "duplicate")) {
      leader.reasons.unshift({ kind: "duplicate", note: dupNoteOpen(leader.agency), resolved: false, undoable: true });
    }
  }

  const queries: ReviewQuery[] = (result.queries || []).map((q, i) => {
    const status = (q.status as QueryStatus) ?? QueryStatus.QUERIED;
    return {
      id: `q${i}`,
      agentRef: q.agentRef,
      status,
      // The date of THIS query's current-status rung (honest attribution) — null → "date needed".
      date: (q[dateFieldForStatus(status)] as string | null | undefined) ?? null,
      reasons: (q.confidence === "low" || !!(q.flags && q.flags.length)
        ? [{ kind: "mapping", note: friendly(q.flags) || QUERY_CHECK_NOTE, resolved: false, undoable: true } as ReasonItem]
        : []),
      removed: false,
    };
  });

  return { agents, queries };
}

/** Convert the final working model back into a SmartImportResult for commitSmartImport. Starts from
 *  the original parse (so per-stage dates the model never surfaced survive), excludes deleted agents /
 *  removed queries, carries merge-repointed agentRefs, and — the date-attribution fix — writes each
 *  query's single date to the rung field matching its CURRENT status (a Full Sent date → fullSentDate,
 *  seeding the full-sent rung), never silently to the queried rung. null stays null (never fabricated). */
export function modelToResult(result: SmartImportResult, agents: ReviewAgent[], queries: ReviewQuery[]): SmartImportResult {
  const origAgents = new Map((result.agents || []).map((a) => [a.ref, a]));
  const agentsOut: ParsedAgent[] = agents.filter((a) => !a.deleted).map((a) => {
    const o = origAgents.get(a.id);
    return { ...(o ?? { ref: a.id, confidence: "high" as const, name: a.name }), ref: a.id, name: a.name, agency: a.agency, genres: a.genres, website: a.website || o?.website, responseTimeWeeks: a.weeks };
  });
  const queriesOut: ParsedQuery[] = queries.filter((q) => !q.removed).map((q) => {
    const o = (result.queries || [])[Number(q.id.slice(1))];
    const base: ParsedQuery = { ...(o ?? { agentRef: q.agentRef, confidence: "high" as const, status: q.status, dateQueried: null }), agentRef: q.agentRef, status: q.status };
    (base as unknown as Record<string, string | null>)[dateFieldForStatus(q.status)] = q.date; // date → its status rung's field
    return base;
  });
  return { columnMapping: {}, statusTranslations: [], agents: agentsOut, queries: queriesOut, warnings: [] };
}
