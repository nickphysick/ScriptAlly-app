/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smart Import response contract — exactly what the smartImportMap Cloud Function returns,
 * what the review screen renders, and what commitSmartImport consumes. The model only
 * proposes this shape; the client re-validates before any write.
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
  confidence: "high" | "low";
  issues?: string[];
}

export interface ParsedQuery {
  agentRef: string;
  dateQueried: string | null; // ISO
  status: QueryStatus | null;
  partialRequestedDate?: string | null;
  partialSentDate?: string | null;
  fullRequestedDate?: string | null;
  fullSentDate?: string | null;
  offerDate?: string | null;   // when an offer came in (the Offer rung's own date)
  reviseDate?: string | null;  // when an R&R was received (the Revise & Resubmit rung's own date)
  closedDate?: string | null;
  notes?: string;
  confidence: "high" | "low";
  flags?: string[];
}

export interface StatusTranslation {
  original: string;
  mapped: QueryStatus | null;
  count: number;
}

export interface SmartImportResult {
  columnMapping: Record<string, string>;
  statusTranslations: StatusTranslation[];
  agents: ParsedAgent[];
  queries: ParsedQuery[];
  warnings: string[];
}
