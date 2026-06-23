/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smart Import review — the pure working model behind the two-screen review UI. No React, no
 * Firebase: parsing a `SmartImportResult` into the editable `agents[]` + `queries[]` model, the
 * status/reason derivations the cards read, and converting the final model back into a
 * `SmartImportResult` for commitSmartImport. Kept standalone so it's unit-testable.
 *
 * Query shape (the redesign): a query carries its SENT date (the spine), an optional `timeline` of
 * later events lifted from notes, and a list of TYPED reasons. Each reason's wording + input is
 * derived from its code (queryReasonText / statusDirectionChoices) so copy stays consistent
 * run-to-run and the function payload stays tiny.
 */
import { QueryStatus } from "../types";
import { ParsedAgent, ParsedQuery, SmartImportResult, ReviewReasonCode, REVIEW_REASON_CODES } from "../types/smartImport";
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

// ── Query working model ─────────────────────────────────────────────────────────────────────────
/** A later pipeline event on a query (editable): the event, its parsed date, and the verbatim note
 *  date it came from. */
export interface ReviewTimelineEvent { type: QueryStatus; date: string | null; raw: string | null; }

/** A typed query reason. Copy + the right input are derived from `code` (queryReasonText /
 *  statusDirectionChoices). Resolving sets `resolved` — the row goes Ready when none remain open. */
export interface QueryReason { code: ReviewReasonCode; resolved: boolean; }

export interface ReviewQuery {
  id: string;
  agentRef: string;
  status: QueryStatus;
  /** The query's sent date — the spine. The row shows this date alongside the status. */
  sentDate: string | null;
  /** The verbatim Date-sent cell, kept so reason copy can quote what they wrote. */
  sentDateRaw: string | null;
  /** Later events lifted from notes (editable). Seeds activity rungs on commit. */
  timeline: ReviewTimelineEvent[];
  /** Typed, resolvable reasons. A query can carry more than one. */
  reasons: QueryReason[];
  notes: string;
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

// ── Query dates, status options & reason copy ────────────────────────────────────────────────────
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
export const hasOpenQueryReasons = (q: ReviewQuery) => q.reasons.some((r) => !r.resolved);
export const queryStatusOf = (q: ReviewQuery): "needs-check" | "captured" =>
  hasOpenQueryReasons(q) ? "needs-check" : "captured";

/** The date shown on a query row: its sent date (the spine), regardless of status. */
export const currentDate = (q: ReviewQuery): string | null => q.sentDate;

// ── Two-tier review classification (overview + pills + guided overlay all read this) ──────────────
// FIX (gold, BLOCKING): an agent with no agency, or an agent caught in an unresolved duplicate
// cluster — import is gated on these. SHARPEN (pink, OPTIONAL): a query's typed reasons, or an
// agent's non-duplicate "mapping" flag — each has a safe default, so they're skippable. Everything
// else is READY.
export type ReviewTier = "ready" | "fix" | "sharpen";

/** Agents in an unresolved duplicate cluster — the leaders carrying an open `duplicate` reason and
 *  every sibling they merge with. */
export function unresolvedDuplicateAgentIds(agents: ReviewAgent[]): Set<string> {
  const ids = new Set<string>();
  for (const a of agents) {
    if (a.deleted) continue;
    if (a.mergeWith.length && a.reasons.some((r) => r.kind === "duplicate" && !r.resolved)) {
      ids.add(a.id);
      for (const m of a.mergeWith) ids.add(m);
    }
  }
  return ids;
}

export const agentTier = (a: ReviewAgent, inUnresolvedDup: boolean): ReviewTier =>
  !a.agency.trim() || inUnresolvedDup ? "fix"
    : a.reasons.some((r) => r.kind === "mapping" && !r.resolved) ? "sharpen"
    : "ready";

export const queryTier = (q: ReviewQuery): ReviewTier =>
  q.reasons.some((r) => !r.resolved) ? "sharpen" : "ready";

export interface ReviewTallies { agents: number; queries: number; ready: number; fix: number; sharpen: number; }

/** Live counts by tier across surviving agents + queries (deleted/removed excluded). ready+fix+sharpen
 *  always equals agents+queries — every live record sits in exactly one tier. */
export function reviewTallies(agents: ReviewAgent[], queries: ReviewQuery[]): ReviewTallies {
  const liveAgents = agents.filter((a) => !a.deleted);
  const liveQueries = queries.filter((q) => !q.removed);
  const dupIds = unresolvedDuplicateAgentIds(agents);
  const t: ReviewTallies = { agents: liveAgents.length, queries: liveQueries.length, ready: 0, fix: 0, sharpen: 0 };
  for (const a of liveAgents) t[agentTier(a, dupIds.has(a.id))]++;
  for (const q of liveQueries) t[queryTier(q)]++;
  return t;
}

const isReviewReasonCode = (c: unknown): c is ReviewReasonCode =>
  typeof c === "string" && (REVIEW_REASON_CODES as readonly string[]).includes(c);
const coerceStatus = (s: unknown): QueryStatus | null =>
  typeof s === "string" && (Object.values(QueryStatus) as string[]).includes(s) ? (s as QueryStatus) : null;

/** Whether a status is a "full" or "partial" material stage (drives the status-direction choices). */
const isPartialStage = (s: QueryStatus) => s === QueryStatus.PARTIAL_REQUESTED || s === QueryStatus.PARTIAL_SENT;

/** The two real choices a `status-direction` flag offers — sent-by-me vs requested-by-agent, for the
 *  material (full/partial) implied by the best-guess status. */
export function statusDirectionChoices(status: QueryStatus): { label: string; status: QueryStatus }[] {
  return isPartialStage(status)
    ? [{ label: "I sent the partial", status: QueryStatus.PARTIAL_SENT },
       { label: "The agent requested it", status: QueryStatus.PARTIAL_REQUESTED }]
    : [{ label: "I sent the full", status: QueryStatus.FULL_SENT },
       { label: "The agent requested it", status: QueryStatus.FULL_REQUESTED }];
}

/** Lowercase a status for prose ("Full Requested" → "full requested"). */
const lc = (s: string) => s.toLowerCase();

/**
 * The plain-English message for a typed query reason, in the Form-11 voice — specific about what we
 * saw, never apologetic, fix offered in place. Assembled from the code (+ the query's own values),
 * so wording stays consistent run-to-run and the function payload stays tiny.
 */
export function queryReasonText(code: ReviewReasonCode, q: ReviewQuery): string {
  switch (code) {
    case "two-dates": {
      const ev = q.timeline[0];
      const evLabel = ev ? lc(ev.type) : "a later step";
      const sent = q.sentDate ? fmtDate(q.sentDate) : (q.sentDateRaw || "the first date");
      const evDate = ev?.date ? fmtDate(ev.date) : (ev?.raw || "the second date");
      return `We found two dates here. We've read ${sent} as the day you sent the query, and ${evDate} — from your note — as the day the ${evLabel} happened. Right way round?`;
    }
    case "missing-day":
      return `You've got ${q.sentDateRaw || "a month and year"} here, but no specific day. Pin it to a date, or keep it as just the month?`;
    case "serial-outlier":
      return `We read this as ${fmtDate(q.sentDate)} — but that's well outside your other dates (it came through as a stray spreadsheet number). Is that right, or shall we set it?`;
    case "no-date":
      return `We don't have a date for this one. When did you send the query?`;
    case "status-direction":
      return isPartialStage(q.status)
        ? `Did you send the partial manuscript, or did the agent request it from you?`
        : `Did you send the full manuscript, or did the agent request it from you?`;
    case "status-wording":
      return `We've read this as '${lc(q.status)}' — does that look right, or is it further along?`;
  }
}

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
    const status = coerceStatus(q.status) ?? QueryStatus.QUERIED;
    const timeline: ReviewTimelineEvent[] = (q.timeline || []).map((t) => ({
      type: coerceStatus(t.type) ?? status,
      date: t.date ?? null,
      raw: t.raw ?? null,
    }));
    const reasons: QueryReason[] = (q.reasons || [])
      .filter(isReviewReasonCode)
      .map((code) => ({ code, resolved: false }));
    return {
      id: `q${i}`,
      agentRef: q.agentRef,
      status,
      sentDate: q.sentDate ?? null,
      sentDateRaw: q.sentDateRaw ?? null,
      timeline,
      reasons,
      notes: q.notes ?? "",
      removed: false,
    };
  });

  return { agents, queries };
}

/** Pure cascade for the agents-screen bin: marks the agent deleted and all its not-yet-removed queries
 *  removed. Extracted from the UI's remove() handler so it can be unit-tested without React. */
export function applyAgentRemoval(
  agents: ReviewAgent[],
  queries: ReviewQuery[],
  id: string
): { agents: ReviewAgent[]; queries: ReviewQuery[] } {
  return {
    agents: agents.map((a) => (a.id === id ? { ...a, deleted: true } : a)),
    queries: queries.map((q) =>
      q.agentRef === id && !q.removed ? { ...q, removed: true, removedReason: "Agent removed" as const } : q
    ),
  };
}

/** Convert the final working model back into a SmartImportResult for commitSmartImport. Excludes
 *  deleted agents / removed queries, carries merge-repointed agentRefs, and writes each query's
 *  edited spine (sentDate) + timeline straight through. null stays null (never fabricated). */
export function modelToResult(result: SmartImportResult, agents: ReviewAgent[], queries: ReviewQuery[]): SmartImportResult {
  const origAgents = new Map((result.agents || []).map((a) => [a.ref, a]));
  const agentsOut: ParsedAgent[] = agents.filter((a) => !a.deleted).map((a) => {
    const o = origAgents.get(a.id);
    return { ...(o ?? { ref: a.id, name: a.name }), ref: a.id, name: a.name, agency: a.agency, genres: a.genres, website: a.website || o?.website, responseTimeWeeks: a.weeks };
  });
  // Cross-reference guard: exclude queries whose agent was deleted even if the cascade missed them.
  const survivingAgentIds = new Set(agentsOut.map((a) => a.ref));
  const queriesOut: ParsedQuery[] = queries.filter((q) => !q.removed && survivingAgentIds.has(q.agentRef)).map((q) => {
    const o = (result.queries || [])[Number(q.id.slice(1))];
    return {
      agentRef: q.agentRef,
      status: q.status,
      sentDate: q.sentDate,
      sentDateRaw: q.sentDateRaw ?? o?.sentDateRaw ?? null,
      timeline: q.timeline.map((t) => ({ type: t.type, date: t.date, raw: t.raw })),
      notes: q.notes ?? o?.notes ?? "",
    };
  });
  return { agents: agentsOut, queries: queriesOut };
}

/** Presentation only: render any QueryStatus named in prose lowercase + single-quoted (e.g. "mapped
 *  to Queried" → "mapped to 'queried'"). The enum stays exact for logic — this is just for note text. */
const STATUS_PROSE_RE = new RegExp(
  "['‘’\"]?(" + QUERY_STATUS_OPTIONS.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).sort((a, b) => b.length - a.length).join("|") + ")['‘’\"]?",
  "gi",
);
export const quoteStatuses = (text: string): string =>
  text.replace(STATUS_PROSE_RE, (_m, s: string) => `'${s.toLowerCase()}'`);
