/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The column matcher's words (onboarding v5, part 3, phase 4). The matcher keeps what it does; these
 * replace its developer copy. Stated once so the screen, its run log and the lock read one set.
 */
import { parseTemplateDate } from "./templateImport";
import { focusReasonMeta } from "./smartImportReviewModel";
import { findExistingAgent } from "./importDuplicates";
import { NO_AGENT_MATCH_REASON } from "./smartImport";

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
  queryExists: (title: string, agent: string) => `"${title}" to ${agent} is already in your queries. Row not imported.`,
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
/**
 * Why a history row with no usable date was skipped, in the import review's own words for a date
 * it cannot use ("Date needed" for a blank or unreadable cell, "Date to confirm" for one that
 * could mean two days). The row carries this reason in the dashboard's skipped-rows notice.
 */
export function eventDateReason(why: "blank" | "ambiguous" | "unreadable"): string {
  return focusReasonMeta(why === "ambiguous" ? "ambiguous-date" : why === "unreadable" ? "unreadable-date" : "no-date").pill;
}
/**
 * WHICH QUERY A HISTORY ROW BELONGS TO. A row attaches only when the manuscript AND the agent both
 * match — the agent by `sameAgent`, the match every import path uses. It used to attach to the
 * first query on a manuscript with that title and never read the agent, so on a manuscript queried
 * to several agents an event landed on whichever query the store listed first.
 *
 *   · the row names an agent: that agent's one query for that manuscript, or nothing;
 *   · the row names no agent: the manuscript's query when it has exactly one, or nothing.
 * "Nothing" is never silent: the caller logs the row, counts it and sends it to the notice.
 */
export type HistorySkip = "no-query" | "no-agent-several" | "agent-unknown" | "agent-no-query" | "agent-several";
export type HistoryMatch = { kind: "attach"; queryId: string; agentId: string } | { kind: "skip"; why: HistorySkip };
export function matchHistoryRow(
  row: { title: string; agent?: string | null },
  manuscripts: readonly { id: string; title: string }[],
  agents: readonly { id: string; name: string; agency: string }[],
  queries: readonly { id: string; manuscriptId: string; agentId: string }[],
): HistoryMatch {
  const title = row.title.trim().toLowerCase();
  const msIds = new Set(manuscripts.filter((m) => title && (m.title ?? "").trim().toLowerCase() === title).map((m) => m.id));
  const pool = queries.filter((q) => msIds.has(q.manuscriptId));
  const named = (row.agent ?? "").trim();
  if (named) {
    const agent = findExistingAgent(agents, { name: named });
    if (!agent) return { kind: "skip", why: "agent-unknown" };
    const mine = pool.filter((q) => q.agentId === agent.id);
    if (mine.length === 0) return { kind: "skip", why: "agent-no-query" };
    if (mine.length > 1) return { kind: "skip", why: "agent-several" };
    return { kind: "attach", queryId: mine[0].id, agentId: agent.id };
  }
  if (pool.length === 0) return { kind: "skip", why: "no-query" };
  if (pool.length > 1) return { kind: "skip", why: "no-agent-several" };
  return { kind: "attach", queryId: pool[0].id, agentId: pool[0].agentId };
}
/**
 * The reason a skipped history row carries in the dashboard's notice, in words the import already
 * uses: the review's label for a row that names nobody, and the import's reason for an agent it
 * cannot find. Where neither fits (the agent is on the list but has no query, or more than one,
 * for that manuscript) there is no existing wording, and none is made up: the reason is empty and
 * the run's log says what happened. `null` = the row is not sent to the notice (no query at all on
 * that manuscript: the run's log line stands, as before).
 */
export function historySkipReason(why: HistorySkip): string | null {
  if (why === "no-query") return null;
  if (why === "no-agent-several") return focusReasonMeta("needs-identifying").pill;
  if (why === "agent-unknown") return NO_AGENT_MATCH_REASON;
  return "";
}
const why = (reason?: string) => (reason ? ` ${reason}` : "");
export const ERR = {
  noName: (row: number) => `Row ${row} has no name. Row not imported.`,
  noTitle: (row: number) => `Row ${row} has no title. Row not imported.`,
  needsBoth: (row: number) => `Row ${row} needs both a manuscript title and an agent name. Row not imported.`,
  agentFailed: (name: string, reason?: string) => `Couldn't add agent ${name}.${why(reason)}`,
  manuscriptFailed: (title: string, reason?: string) => `Couldn't add manuscript "${title}".${why(reason)}`,
  queryFailed: (row: number, reason?: string) => `Couldn't add the query in row ${row}.${why(reason)}`,
  /** kept as built: no query for this manuscript, or none for this agent on it */
  eventNoQuery: (row: number) => `Activity row ${row}: no query matches this manuscript and agent, so there is nothing to attach the event to. Import the query first, then this row.`,
  eventNoAgentSeveral: (row: number, title: string) => `Row ${row} names no agent, and "${title}" has more than one query, so the event can't be placed. Row not imported.`,
  eventAgentSeveral: (row: number, title: string, agent: string) => `Row ${row}: there is more than one query to ${agent} for "${title}", so the event can't be placed. Row not imported.`,
  eventNoDate: (row: number) => `Row ${row} has no date that could be read, so the event can't be placed in a query's history. Row not imported.`,
  eventFailed: (reason?: string) => `Couldn't add the event to a query's history.${why(reason)}`,
  rowUnreadable: (row: number, reason: string) => `Row ${row} couldn't be read: ${reason}`,
} as const;

/** No rendered string of the matcher may match this (lock M2). */
export const DEVELOPER_WORDS = /database|repositor|catalog|stream|inject|synchron|migration|console|registr|Zite|Mock|Demo/i;
