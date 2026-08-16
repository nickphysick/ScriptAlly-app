/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The ScriptAlly template's column contract — ONE constant, read by the generator that writes the
 * sheet and by the parser that reads it back.
 *
 * ⚠️ TWO PLACES THAT MUST AGREE, SO THEY READ THE SAME LIST. A template whose columns are typed
 * out in the generator and typed out again in the parser is a template that works until someone
 * renames a heading in one of them, and then fails on the writer's own filled-in sheet with no
 * error anyone can trace. That is the entire reason this file exists.
 *
 * ⚠️ THERE IS ALREADY A DIFFERENT TEMPLATE IN THE REPO, AND THIS IS NOT IT.
 * `public/ScriptAlly-pipeline-import-template.xlsx` is a THREE-tab workbook (Instructions, Agents,
 * Queries) with a richer per-stage date model — Partial requested / Partial sent / Full requested
 * / Full sent as separate columns. It is what the landing page and the Queries empty state link to,
 * and it goes through Smart Import. The contract below is the single flat sheet the capture fork
 * specifies: one agent per row, parsed locally, no API call. Both now exist. Which survives is a
 * product decision, flagged rather than taken.
 *
 * ⚠️ ONLY THE AGENT NAME IS REQUIRED. Every other column may be blank, because a writer part-way
 * through reconstructing their history has real gaps, and a sheet that refuses to import until
 * every cell is filled is a sheet they abandon. A blank is imported as an absence; it is never
 * guessed at.
 */

import { QueryStatus } from "../types";

/** A column in the template, in sheet order. */
export interface TemplateColumn {
  /** The heading written into the sheet and matched when reading it back. */
  header: string;
  /** What a filler is told the column is for — the sheet's own second row. */
  hint: string;
  required?: boolean;
}

/**
 * ⚠️ THE ORDER IS THE SHEET'S ORDER, and the parser does NOT depend on it — headings are matched
 * by name, so a writer who moves a column still imports. The order is for the person filling it in.
 */
export const TEMPLATE_COLUMNS: TemplateColumn[] = [
  { header: "Agent name", hint: "Required. One agent per row.", required: true },
  { header: "Agency", hint: "The agency they work for." },
  { header: "Agent email", hint: "Where you sent the query." },
  { header: "Agency website", hint: "Optional." },
  { header: "Manuscript", hint: "Which book you queried them about." },
  { header: "Status", hint: "Pick from the list. Leave blank if you're not sure." },
  { header: "Date sent", hint: "YYYY-MM-DD or DD/MM/YYYY." },
  { header: "Date of last response", hint: "YYYY-MM-DD or DD/MM/YYYY. Blank if they never replied." },
  { header: "Materials sent", hint: "Free text — e.g. \"query + 10 pages\"." },
  { header: "Response window (weeks)", hint: "How long they say they take. A whole number." },
  { header: "Notes", hint: "Anything else worth keeping." },
];

export const TEMPLATE_HEADERS: string[] = TEMPLATE_COLUMNS.map((c) => c.header);

/** The one column a row cannot do without. */
export const TEMPLATE_REQUIRED_HEADERS: string[] =
  TEMPLATE_COLUMNS.filter((c) => c.required).map((c) => c.header);

/**
 * ⚠️ STATUS ACCEPTS THE DISPLAY LABELS AND NOTHING ELSE. The xlsx gets a validation dropdown fed
 * from this list and a hidden reference sheet behind it; the csv carries the permitted values in a
 * comment row the parser skips. An unrecognised status is FLAGGED for the writer to correct — never
 * mapped by guesswork, because "Partial" could mean requested or sent and the two are opposite
 * sides of the same exchange.
 */
export const TEMPLATE_STATUS_VALUES: string[] = Object.values(QueryStatus);

/** The comment row a csv template carries, and which the parser skips on the way back in. */
export const TEMPLATE_COMMENT_PREFIX = "#";

export const TEMPLATE_STATUS_COMMENT =
  `${TEMPLATE_COMMENT_PREFIX} Status must be one of: ${TEMPLATE_STATUS_VALUES.join(" | ")}`;

/**
 * ⚠️ ONE EXAMPLE ROW, CLEARLY MARKED, AND THE PARSER SKIPS IT. A template with no example leaves a
 * writer guessing at date format on their first row; a template whose example silently imports
 * gives them an agent they have never heard of. It is marked in the one column that cannot be
 * blank, so the skip cannot be defeated by clearing some other cell.
 */
export const TEMPLATE_EXAMPLE_MARKER = "EXAMPLE — delete this row";

export const TEMPLATE_EXAMPLE_ROW: Record<string, string> = {
  "Agent name": `${TEMPLATE_EXAMPLE_MARKER} · Margaret Holloway`,
  "Agency": "Holloway & Finch",
  "Agent email": "queries@hollowayfinch.co.uk",
  "Agency website": "https://hollowayfinch.co.uk",
  "Manuscript": "The Salt Road",
  "Status": QueryStatus.PARTIAL_SENT,
  "Date sent": "2026-03-14",
  "Date of last response": "2026-04-02",
  "Materials sent": "query + first 50 pages",
  "Response window (weeks)": "8",
  "Notes": "Personalised on her coastal-memoir wish list",
};

/** Is this row the shipped example rather than the writer's own data? */
export function isExampleRow(agentName: string): boolean {
  return agentName.trim().toUpperCase().startsWith(TEMPLATE_EXAMPLE_MARKER.split(" ")[0]);
}

/**
 * Normalise a heading for matching: case, surrounding space and internal runs of space collapse.
 *
 * ⚠️ MATCHED, NOT COMPARED. A writer's spreadsheet application will happily hand back
 * "Agent Name " or "agent  name"; refusing those would be refusing the writer's own file over
 * whitespace. Anything that is not a known heading is IGNORED rather than fatal — an extra column
 * of their own is not an error.
 */
export function normaliseHeader(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Known headings by their normalised form → the canonical header. */
export const TEMPLATE_HEADER_LOOKUP: ReadonlyMap<string, string> = new Map(
  TEMPLATE_HEADERS.map((h) => [normaliseHeader(h), h]),
);
