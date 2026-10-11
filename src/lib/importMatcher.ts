/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The column matcher's words (onboarding v5, part 3, phase 4). The matcher keeps what it does; these
 * replace its developer copy. Stated once so the screen, its run log and the lock read one set.
 */
import { parseTemplateDate } from "./templateImport";

export type MatcherKind = "agents" | "manuscripts" | "queries" | "activities";

export const MATCHER_TITLE = "Match your own columns.";
export const MATCHER_SUB = "Choose the column in your file for each QueryHawk field.";
export const MATCHER_BACK = "‹ Back to import";
export const MATCHER_STEPS = ["Your file", "Match columns", "Import"] as const;

export const KIND_QUESTION = "What's in the file?";
export const KINDS: { id: MatcherKind; title: string; desc: string }[] = [
  { id: "agents", title: "Agents", desc: "Names, agencies, contact details" },
  { id: "manuscripts", title: "Manuscripts", desc: "Titles, genres, word counts" },
  { id: "queries", title: "Queries", desc: "Who you queried, when, and the status" },
  { id: "activities", title: "Query history", desc: "Dated events for queries already here" },
];

export const FILE_QUESTION = "Choose a file, or paste it";
export const FILE_DROP = "Drop a .csv file here, or choose one.";
export const FILE_PASTE = "Or paste the rows, comma separated";
export const FILE_READ = "Read the file";

export const MAP_FIELD = "QueryHawk field";
export const MAP_SKIP = "Don't import this";
export const MAP_REQUIRED = "Required";
/** Shown for a queries file. Both halves are what the run does: a row is linked by name to an agent
 *  and a manuscript already here; a row naming one that is not here is still imported and listed. */
export const MAP_LINK_NOTE = "Each row is linked to the agent and manuscript already here with the same name. A row with no match is still imported, and listed for you to decide.";
export const MAP_START_AGAIN = "‹ Start again";
export const importRowsLabel = (n: number): string => (n === 1 ? "Import 1 row" : `Import ${n} rows`);

export const RUN_WORKING = "Importing…";
export const RUN_KEEP_OPEN = "Keep this tab open until it finishes.";
export const RUN_PROGRESS = "Progress";
export const RUN_FINISHED = "Import finished.";
export const COUNT_IMPORTED = "Imported";
export const COUNT_NOT = "Not imported";
export const COUNT_DECIDE = "Need a decision";
export const LOG_TITLE = "Row by row";
/**
 * ⚠️ SHORTER THAN THE WORDS TABLE'S SENTENCE, ON PURPOSE. The table keeps "…and it will keep showing
 * them until each one has what it needs". That was true of a banner on the old query list
 * (`.qc-needbar`), which the Query Centre no longer draws: the rows are listed (measured: four
 * imported, four listed) but nothing marks them as needing anything or stops when they are fixed.
 * The sentence says what the app does.
 */
export const DECIDE_NOTE = "Every row above was imported. You can close this. They are on your query list.";
export const AFTER_ANOTHER = "Import another file";
export const afterOpenLabel = (kind: MatcherKind): string =>
  kind === "queries" ? "Open the Query Centre" : kind === "manuscripts" ? "Open Manuscripts" : "Open the Contact list";

/* ── The run's lines ── each states the same fact as the line it replaced, in the same order. */
export const LOG = {
  agentExists: (name: string) => `${name} is already on your contact list. Row not imported.`,
  manuscriptExists: (title: string) => `"${title}" is already in your manuscripts. Row not imported.`,
  agentAdded: (name: string, agency: string) => `Added agent: ${name}${agency ? `, ${agency}` : ""}`,
  manuscriptAdded: (title: string) => `Added manuscript: "${title}"`,
  queryAdded: (title: string, agent: string, status: string) => `Added query: "${title}" to ${agent}, ${status}`,
  eventAdded: (description: string) => `Added to a query's history: ${description}`,
} as const;
/**
 * A date cell as the matcher keeps it: the day the file wrote (ISO or day/month/year, the template's
 * own reader), or no date. Never the moment of the import. A cell that could mean two days, or
 * cannot be read, is kept as no date and said so in the run's log.
 */
export type MatcherDate = { iso: string } | { iso: null; why: "blank" | "ambiguous" | "unreadable" };
export function matcherDate(raw: string | null | undefined): MatcherDate {
  const text = (raw ?? "").trim();
  if (!text) return { iso: null, why: "blank" };
  const read = parseTemplateDate(text);
  if (read === "ambiguous") return { iso: null, why: "ambiguous" };
  if (!read) return { iso: null, why: "unreadable" };
  return { iso: read.iso };
}
/** The log line for a query whose date cell was not kept; null when the cell was simply blank. */
export function undatedQueryLine(row: number, raw: string, why: "blank" | "ambiguous" | "unreadable"): string | null {
  if (why === "blank") return null;
  return why === "ambiguous"
    ? `Row ${row}: the date "${raw.trim()}" could mean two days. Imported with no sent date.`
    : `Row ${row}: the date "${raw.trim()}" couldn't be read. Imported with no sent date.`;
}
const why = (reason?: string) => (reason ? ` ${reason}` : "");
export const ERR = {
  noName: (row: number) => `Row ${row} has no name. Row not imported.`,
  noTitle: (row: number) => `Row ${row} has no title. Row not imported.`,
  needsBoth: (row: number) => `Row ${row} needs both a manuscript title and an agent name. Row not imported.`,
  agentFailed: (name: string, reason?: string) => `Couldn't add agent ${name}.${why(reason)}`,
  manuscriptFailed: (title: string, reason?: string) => `Couldn't add manuscript "${title}".${why(reason)}`,
  queryFailed: (row: number, reason?: string) => `Couldn't add the query in row ${row}.${why(reason)}`,
  eventNoDate: (row: number) => `Row ${row} has no date that could be read, so the event can't be placed in a query's history. Row not imported.`,
  eventFailed: (reason?: string) => `Couldn't add the event to a query's history.${why(reason)}`,
  rowUnreadable: (row: number, reason: string) => `Row ${row} couldn't be read: ${reason}`,
} as const;

/** No rendered string of the matcher may match this (lock M2). */
export const DEVELOPER_WORDS = /database|repositor|catalog|stream|inject|synchron|migration|console|registr|Zite|Mock|Demo/i;
