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
  | "status-direction"
  | "status-wording";

export const REVIEW_REASON_CODES: readonly ReviewReasonCode[] = [
  "two-dates", "missing-day", "serial-outlier", "no-date", "status-direction", "status-wording",
];

/** A later pipeline event lifted from a note (conservative): the event, its code-parsed date
 *  (year-anchored to the sent date), and the verbatim note date it came from. */
export interface TimelineEvent {
  type: QueryStatus;
  date: string | null; // ISO
  raw: string | null;  // verbatim note date
}

export interface ParsedQuery {
  agentRef: string;
  /** Best-guess status; null only for a truly empty status cell (validation then drops the row). */
  status: QueryStatus | null;
  /** The query's sent date (ISO) — the spine. Parsed in code from the Date-sent column. */
  sentDate: string | null;
  /** The verbatim Date-sent cell, kept so the review screen can quote it ("you wrote 'March 2024'"). */
  sentDateRaw?: string | null;
  timeline?: TimelineEvent[];
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
