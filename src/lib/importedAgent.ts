/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The agent an import writes. One builder for all four writers (the template and Smart Import,
 * the email import, and the column matcher's two), so none of them can add a value of its own.
 *
 * The rule: a field holds what the file gave, or it is left out.
 *   · `starRating`, `responseTimeWeeks` and `noResponseMeansNo` are optional in `isValidAgent`
 *     and in the type, so each is written only when the file gave one.
 *   · `submissionStatus` is required by the rules (firestore.rules, `isValidAgent`: a string, one
 *     of Open, Closed, Unknown). No import path reads a status from a file; the writer can set
 *     one in the import's review. Without one the builder writes `Unknown`, which every reader
 *     shows as not known.
 *   · `submissionMethod` is required by the rules too (a string). A file that names one keeps it;
 *     otherwise today's value, Email, stands. That one is still a value the file did not give.
 *   · `materialsWanted` is required as a list; an empty list is its empty form.
 */
import { Agent, SubmissionMethod, SubmissionStatus } from "../types";

/** What a file can say about an agent. Every field but the identity is optional. */
export interface FileAgent {
  name: string;
  agency?: string | null;
  email?: string | null;
  website?: string | null;
  genres?: readonly string[] | null;
  mswlNotes?: string | null;
  notes?: string | null;
  /** as the file wrote it: a number, or the cell's text */
  starRating?: number | string | null;
  responseTimeWeeks?: number | null;
  noResponseMeansNo?: boolean | null;
  submissionMethod?: "Email" | "Online Form" | null;
  /** only ever set by the writer, in the import's review; no file gives one */
  submissionStatus?: "Open" | "Closed" | null;
}

export type ImportedAgentDoc = Omit<Agent, "id" | "userId" | "dateAdded" | "lastCheckedDate">;

/** A rating the file gave: a whole number from 1 to 5. Anything else is no rating. */
export function fileRating(v: FileAgent["starRating"]): 1 | 2 | 3 | 4 | 5 | undefined {
  if (v == null) return undefined;
  const s = typeof v === "number" ? String(v) : v.trim();
  if (!/^[1-5]$/.test(s)) return undefined;
  return Number(s) as 1 | 2 | 3 | 4 | 5;
}

export function importedAgentDoc(file: FileAgent, extra: { importedNeedsReview?: boolean } = {}): ImportedAgentDoc {
  const rating = fileRating(file.starRating);
  const weeks = typeof file.responseTimeWeeks === "number" && Number.isFinite(file.responseTimeWeeks) && file.responseTimeWeeks > 0
    ? file.responseTimeWeeks : undefined;
  const doc: ImportedAgentDoc = {
    name: (file.name ?? "").trim(),
    agency: (file.agency ?? "").trim(),
    email: (file.email ?? "").trim(),
    website: (file.website ?? "").trim(),
    genres: [...(file.genres ?? [])],
    mswlNotes: file.mswlNotes ?? "",
    notes: file.notes ?? "",
    submissionStatus: file.submissionStatus === "Open" ? SubmissionStatus.OPEN
      : file.submissionStatus === "Closed" ? SubmissionStatus.CLOSED : SubmissionStatus.UNKNOWN,
    submissionMethod: file.submissionMethod === "Online Form" ? SubmissionMethod.ONLINE_FORM : SubmissionMethod.EMAIL,
    materialsWanted: [],
    ...(rating !== undefined ? { starRating: rating } : {}),
    ...(weeks !== undefined ? { responseTimeWeeks: weeks } : {}),
    ...(typeof file.noResponseMeansNo === "boolean" ? { noResponseMeansNo: file.noResponseMeansNo } : {}),
    ...(extra.importedNeedsReview ? { importedNeedsReview: true } : {}),
  };
  return doc;
}

/** The column matcher's agent ("match your own columns" and "Create from this row"): the file's fields, flagged as
 *  imported (v19.2 §E follow-up) so its Date added reads "Imported" as Smart import's, the template's and the email
 *  import's already do. Agents imported this way before the flag existed are not backfilled. */
export function matcherAgentDoc(file: FileAgent): ImportedAgentDoc {
  return importedAgentDoc(file, { importedNeedsReview: true });
}
