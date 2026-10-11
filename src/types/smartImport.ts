/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smart Import response contract — exactly what the smartImportMap Cloud Function returns,
 * what the review screen renders, and what commitSmartImport consumes. The model only PROPOSES
 * meaning (status + verbatim dates + conservative note events); deterministic code parses the
 * dates and the client re-validates before any write.
 *
 * Per-query shape (the redesign): the SENT date is the spine — always the Date-sent column,
 * parsed in code, never from notes. Later pipeline events lifted from notes hang off it in
 * `timeline`. `reasons` are typed codes the review screen turns into copy + the right input.
 */
import { QueryStatus } from "../types";

export interface ParsedAgent {
  ref: string;
  name: string;
  agency?: string;
  email?: string;
  website?: string;
  genres?: string[];
  submissionMethod?: "Email" | "Online Form" | null;
  responseTimeWeeks?: number | null;
  noResponseMeansNo?: boolean | null;
  /** Set in review by the writer; no file gives either. Absent or null = not stated. */
  starRating?: number | null;
  submissionStatus?: "Open" | "Closed" | null;
  mswlNotes?: string;
  /** Legacy/fixtures only — the function no longer emits agent confidence. Optional so older callers
   *  and test fixtures still type-check. Agent review flags come from `issues`. */
  confidence?: "high" | "low";
  issues?: string[];
}

/** Typed reason codes the review screen turns into plain-English copy + the right input. The union
 *  of the model's semantic codes (status-direction/status-wording) and the parser's mechanical codes
 *  (missing-day/serial-outlier/no-date/two-dates). There is no `missing-year` — the year is inferred
 *  silently upstream. */
export type ReviewReasonCode =
  | "two-dates"
  | "missing-day"
  | "serial-outlier"
  | "no-date"
  | "unreadable-date"            // the template's Date sent cell held text that is not a date
  | "ambiguous-date"             // …or a date that reads two ways (03/05/2026)
  | "unreadable-response-date"   // the same two, for the Date of last response cell
  | "ambiguous-response-date"
  | "status-direction"
  | "status-wording"
  | "check-name"          // agent/agency cell was a note, not a name — real part extracted, confirm
  | "needs-identifying";  // cell named no real agent/agency at all — writer must say who it was

export const REVIEW_REASON_CODES: readonly ReviewReasonCode[] = [
  "two-dates", "missing-day", "serial-outlier", "no-date",
  "unreadable-date", "ambiguous-date", "unreadable-response-date", "ambiguous-response-date",
  "status-direction", "status-wording",
  "check-name", "needs-identifying",
];

/** A later pipeline event lifted from a note (conservative): the event, its code-parsed date
 *  (year-anchored to the sent date), and the verbatim note date it came from. */
export interface TimelineEvent {
  type: QueryStatus;
  date: string | null; // ISO
  raw: string | null;  // verbatim note date
  /** Optional per-event note that rides this event onto its own activity rung (the field
   *  EditQueryDrawer renders). Used by the duplicate-collapse reconcile to carry a discarded row's
   *  note (e.g. "asked for 50pp") into the kept query's history. Absent for ordinary imports →
   *  commit falls back to the generated "{status} (imported)" label, byte-identical to before. */
  note?: string;
}

export interface ParsedQuery {
  agentRef: string;
  /** Best-guess status; null for an empty or unread status cell. The review reads null as Queried
   *  (an unread one is asked about first); a null that reaches validation is still dropped. */
  status: QueryStatus | null;
  /** The query's sent date (ISO) — the spine. Parsed in code from the Date-sent column. */
  sentDate: string | null;
  /** The verbatim Date-sent cell, kept so the review screen can quote it ("you wrote 'March 2024'"). */
  sentDateRaw?: string | null;
  timeline?: TimelineEvent[];
  /** The verbatim Status cell, when the template parser could not read it as one of the statuses
   *  (onboarding v9). The review quotes it back in its "where does this one stand?" question. */
  statusRaw?: string | null;
  /** Typed reason codes; copy is assembled client-side so the function payload stays tiny. */
  reasons?: ReviewReasonCode[];
  notes?: string;
}

export interface StatusTranslation {
  original: string;
  mapped: QueryStatus | null;
  count: number;
}

export interface SmartImportResult {
  columnMapping?: Record<string, string>;
  statusTranslations?: StatusTranslation[];
  agents: ParsedAgent[];
  queries: ParsedQuery[];
  warnings?: string[];
}
