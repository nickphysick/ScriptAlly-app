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
import { normaliseGenres } from "./manuscripts";

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
  /** The queried-rung date (the anchor). When status is "Queried" this is the query's only date. */
  dateQueried: string | null;
  /** The current-status rung's date (e.g. the full-sent date), kept separate from the queried anchor
   *  so both can be edited beyond Queried. Unused while status is Queried. Carries across status
   *  changes (relabelled, never discarded). All dates optional — never a check reason, never gating. */
  statusDate: string | null;
  /** Quiet, informational hint about an unparseable date cell — shown by the date field, never a reason. */
  dateNote: string | null;
  /** Reason/resolve machinery — a query only ever carries a STATUS-interpretation reason (never date). */
  reasons: ReasonItem[];
  removed: boolean;
  removedReason?: "Agent removed" | "Removed by you";
}

const friendly = (issues?: string[]): string | null =>
  issues && issues.length ? issues.join(" ") : null;

// ── Duplicate matching ────────────────────────────────────────────────────────────────────────────
// Normalise an agency for comparison: lowercase, drop "& co" and common trade words/suffixes so
// near-identical agencies match ("Pryce Lit" ≈ "Pryce Literary", "Okonkwo Lit" ≈ "Okonkwo Literary").
const AGENCY_NOISE = /\b(literary|lit|agency|agencies|associates|management|mgmt|books|media|group|company|ltd|llc|inc|the)\b/g;
export const agencyKey = (agency = ""): string =>
  agency.toLowerCase().replace(/&\s*co\b/g, " ").replace(AGENCY_NOISE, " ").replace(/[^a-z0-9]+/g, " ").trim();
const surnameOf = (name = "") => { const p = name.trim().toLowerCase().split(/\s+/).filter(Boolean); return p[p.length - 1] || ""; };
const firstOf = (name = "") => { const p = name.trim().toLowerCase().split(/\s+/).filter(Boolean); return p[0] || ""; };
// First names are compatible when equal, or one is an initial/abbreviation of the other ("j"/"jon"
// ≈ "jonathan", "m." ≈ "maria"). Trailing dots are ignored.
const firstNameCompatible = (a: string, b: string): boolean => {
  const x = a.replace(/\.$/, ""), y = b.replace(/\.$/, "");
  if (!x || !y) return false;
  if (x === y) return true;
  if (x.length === 1 || y.length === 1) return x[0] === y[0];
  return x.startsWith(y) || y.startsWith(x);
};
// Two NAMED agents are likely the same person when their surname matches and first names are
// compatible. (Agency-only agents have no name and never match this — agency-only stays its own.)
export const nameCompatible = (n1 = "", n2 = ""): boolean => {
  const s1 = surnameOf(n1), s2 = surnameOf(n2);
  if (!s1 || !s2 || s1 !== s2) return false;
  return firstNameCompatible(firstOf(n1), firstOf(n2));
};

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

/** The date shown on the card for a query: the queried anchor while Queried, else the status-rung date. */
export const currentDate = (q: ReviewQuery): string | null =>
  q.status === QueryStatus.QUERIED ? q.dateQueried : q.statusDate;

/** Editor label for a query's current-status date field (distinct from "Date queried"). */
const STATUS_DATE_LABEL: Partial<Record<QueryStatus, string>> = {
  [QueryStatus.PARTIAL_REQUESTED]: "Date partial requested",
  [QueryStatus.PARTIAL_SENT]: "Date partial sent",
  [QueryStatus.FULL_REQUESTED]: "Date full requested",
  [QueryStatus.FULL_SENT]: "Date full sent",
  [QueryStatus.OFFER]: "Date of offer",
  [QueryStatus.REVISE_RESUBMIT]: "Date R&R received",
  [QueryStatus.REJECTED]: "Date rejected",
  [QueryStatus.WITHDRAWN]: "Date withdrawn",
  [QueryStatus.NO_RESPONSE]: "Date closed",
};
export const statusDateLabel = (status: QueryStatus): string => STATUS_DATE_LABEL[status] ?? "Date of this status";

/** Presentation only: render any QueryStatus named in prose lowercase + single-quoted (e.g. "mapped
 *  to Queried" → "mapped to 'queried'"). The enum stays exact for logic — this is just for note text. */
const STATUS_PROSE_RE = new RegExp(
  "['‘’\"]?(" + QUERY_STATUS_OPTIONS.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).sort((a, b) => b.length - a.length).join("|") + ")['‘’\"]?",
  "gi",
);
export const quoteStatuses = (text: string): string =>
  text.replace(STATUS_PROSE_RE, (_m, s: string) => `'${s.toLowerCase()}'`);

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

/** Parse the AI result into the editable working model. Duplicate detection: named agents at a
 *  near-identical agency (agencyKey) with compatible names are clustered as likely the same person. */
export function parseModel(result: SmartImportResult): { agents: ReviewAgent[]; queries: ReviewQuery[] } {
  const agents: ReviewAgent[] = (result.agents || []).map((a) => ({
    id: a.ref,
    name: (a.name || "").trim(),
    agency: (a.agency || "").trim(),
    agencyOnly: !((a.name || "").trim()) && !!(a.agency || "").trim(),
    genres: normaliseGenres(a.genres), // validate raw import genres against the allow-list; drop unknowns

    website: a.website ?? "",
    submissionsOpen: a.submissionMethod !== null ? true : true,
    weeks: a.responseTimeWeeks && a.responseTimeWeeks > 0 ? Math.min(26, a.responseTimeWeeks) : 6,
    rating: 0,
    // A named agent flags only for a GENUINE detail issue from the mapper — never for an abbreviated
    // or missing name. An agency-only agent (no name) is valid and carries no reason → Captured.
    reasons: ((a.name || "").trim() && a.issues && a.issues.length
      ? [{ kind: "mapping", note: friendly(a.issues) || MAPPING_NOTE, resolved: false, undoable: true } as ReasonItem]
      : []),
    mergeWith: [],
    mergeResolved: false,
    deleted: false,
  }));

  // Duplicate clusters: named agents at a near-identical agency (agencyKey: suffix/noise stripped)
  // whose names are compatible (surname match + initial/abbrev-compatible first name) are likely the
  // same person — "j pryce"/"Jonathan Pryce" at "Pryce Lit"/"Pryce Literary". The LEADER carries the
  // shared dedupe control + the single `duplicate` reason. Agency-only agents never cluster.
  const byAgency = new Map<string, ReviewAgent[]>();
  for (const a of agents) {
    const key = agencyKey(a.agency);
    if (!key || !a.name.trim()) continue;
    (byAgency.get(key) ?? byAgency.set(key, []).get(key)!).push(a);
  }
  for (const sameAgency of byAgency.values()) {
    // Sub-cluster by name compatibility (transitive: j ↔ jon ↔ jonathan all merge).
    const clusters: ReviewAgent[][] = [];
    for (const a of sameAgency) {
      const hit = clusters.find((c) => c.some((m) => nameCompatible(m.name, a.name)));
      if (hit) hit.push(a); else clusters.push([a]);
    }
    for (const cluster of clusters) {
      if (cluster.length < 2) continue;
      const [leader, ...rest] = cluster;
      leader.mergeWith = rest.map((r) => r.id);
      if (!leader.reasons.some((r) => r.kind === "duplicate")) {
        leader.reasons.unshift({ kind: "duplicate", note: dupNoteOpen(leader.agency), resolved: false, undoable: true });
      }
    }
  }

  const queries: ReviewQuery[] = (result.queries || []).map((q, i) => {
    const status = (q.status as QueryStatus) ?? QueryStatus.QUERIED;
    return {
      id: `q${i}`,
      agentRef: q.agentRef,
      status,
      dateQueried: q.dateQueried ?? null, // the queried-rung anchor
      // The current-status rung's own date (e.g. fullSentDate) — only beyond Queried, else it IS the anchor.
      statusDate: status === QueryStatus.QUERIED ? null : ((q[dateFieldForStatus(status)] as string | null | undefined) ?? null),
      dateNote: q.dateNote ?? null, // informational only — never a reason
      // A query reason is ONLY ever a genuine STATUS-interpretation ambiguity (never a date).
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
    base.dateQueried = q.dateQueried; // the queried-rung anchor (edited or carried)
    // Beyond Queried, the current-status rung gets its own date; for Queried the rung IS dateQueried.
    if (q.status !== QueryStatus.QUERIED) (base as unknown as Record<string, string | null>)[dateFieldForStatus(q.status)] = q.statusDate;
    return base;
  });
  return { columnMapping: {}, statusTranslations: [], agents: agentsOut, queries: queriesOut, warnings: [] };
}
