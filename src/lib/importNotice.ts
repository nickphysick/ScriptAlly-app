/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The rows an import did not bring in, kept for the dashboard (onboarding v5, part 2).
 *
 * The import ends on the dashboard now, so the one fact the closing page used to carry — some rows
 * were skipped — is stated there, in one line, with the rows behind it, until the writer dismisses
 * it. This module builds that notice when the commit returns and keeps it per account, on the
 * device.
 *
 * ⚠️ THREE THINGS KEEP A ROW OUT, AND THE NOTICE IS ONE ROW FOR EACH (import fixes, 10 Oct):
 *   1. validation (`validateSmartImport(...).skipped`, each with its query and its reason);
 *   2. the commit itself, when a query's agent could not be saved (an `errors` line, "Skipped a
 *      {status} query — its agent couldn't be saved.");
 *   3. the review's AUTOMATIC set-aside: a row with no agent name and no agency is set aside
 *      before the review opens, so it never reaches validation or the commit. If it is still set
 *      aside when the writer imports, it was not imported, and it is listed with the validator's
 *      own reason for such a row. A row the writer removed on purpose is not listed: they know.
 * The count is the list's length, so the headline and the list cannot disagree. Before this rule
 * the count came from the commit, which never saw (3) — so the one row most likely to be left out
 * of a writer's file was the one row the line never mentioned.
 *
 * ⚠️ EVERY REASON IS THE SOURCE'S OWN STRING, VERBATIM. Nothing here rewords why a row was skipped.
 */
import type { ParsedAgent, ParsedQuery } from "../types/smartImport";
import { ALREADY_REASON } from "./importDuplicates";
export { ALREADY_REASON };

export interface ImportNoticeRow {
  /** The agent's name, else the agency, else "" — a row that named nobody has nobody to name. */
  who: string;
  /** The status as read, or "" when the row had none. */
  status: string;
  /** The sent date (ISO), or null. */
  sentDate: string | null;
  /** Why it was skipped: the build's reason, verbatim. */
  reason: string;
}
export interface ImportNotice {
  /** How many rows were not imported — the list's own length. */
  count: number;
  /** One per row that was not imported. */
  rows: ImportNoticeRow[];
  /** When the import returned (ms). */
  at: number;
}

/** The reason validation gives a row with no agent name or agency (smartImport.ts). */
export const NO_NAME_REASON = "Row has no agent name or agency to identify it";
/** The line the commit writes when a query's agent could not be saved (smartImportCommit.ts). */
const COMMIT_SKIP = /^Skipped a (.*) query — its agent couldn't be saved\.$/;

/** A row the review set aside by itself and that was still set aside at import. */
export interface SetAsideRow { status: string; sentDate: string | null }

export function buildImportNotice(
  skipped: readonly { query: ParsedQuery; reason: string }[],
  outcome: { errors: readonly string[] },
  agents: readonly ParsedAgent[],
  setAside: readonly SetAsideRow[] = [],
  now: number = Date.now(),
  /** rows not written because the account already holds that query */
  already: readonly { who: string; status: string; sentDate: string | null }[] = [],
): ImportNotice | null {
  const byRef = new Map(agents.map((a) => [a.ref, a]));
  const rows: ImportNoticeRow[] = skipped.map(({ query, reason }) => {
    const a = byRef.get(query.agentRef);
    return {
      who: (a?.name ?? "").trim() || (a?.agency ?? "").trim(),
      status: query.status ?? "",
      sentDate: query.sentDate ?? null,
      reason,
    };
  });
  for (const line of outcome.errors) {
    const m = COMMIT_SKIP.exec(line);
    if (m) rows.push({ who: "", status: m[1], sentDate: null, reason: line });
  }
  for (const r of setAside) rows.push({ who: "", status: r.status, sentDate: r.sentDate, reason: NO_NAME_REASON });
  for (const r of already) rows.push({ who: r.who, status: r.status, sentDate: r.sentDate, reason: ALREADY_REASON });
  if (rows.length === 0) return null;
  return { count: rows.length, rows, at: now };
}

const keyFor = (uid: string) => `sa.importSkipped.${uid}`;

const isRow = (r: unknown): r is ImportNoticeRow =>
  !!r && typeof r === "object"
  && typeof (r as ImportNoticeRow).who === "string" && typeof (r as ImportNoticeRow).status === "string"
  && typeof (r as ImportNoticeRow).reason === "string"
  && ((r as ImportNoticeRow).sentDate === null || typeof (r as ImportNoticeRow).sentDate === "string");

/** Keep the notice for this account on this device. A null notice clears the key. */
export function saveImportNotice(uid: string, notice: ImportNotice | null): void {
  try {
    if (!uid || typeof localStorage === "undefined") return;
    if (!notice) localStorage.removeItem(keyFor(uid));
    else localStorage.setItem(keyFor(uid), JSON.stringify(notice));
  } catch { /* private mode, or storage full: the dashboard simply shows no line */ }
}

export function readImportNotice(uid: string): ImportNotice | null {
  try {
    if (!uid || typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(keyFor(uid));
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<ImportNotice>;
    if (typeof v.count !== "number" || v.count <= 0 || !Array.isArray(v.rows) || !v.rows.every(isRow)) return null;
    /* A stored list that is not the count is not shown as a list. */
    return { count: v.count, rows: v.rows.length === v.count ? v.rows : [], at: typeof v.at === "number" ? v.at : 0 };
  } catch { return null; }
}

export function clearImportNotice(uid: string): void {
  try { if (uid && typeof localStorage !== "undefined") localStorage.removeItem(keyFor(uid)); } catch { /* nothing to clear */ }
}

// ── The line's words ─────────────────────────────────────────────────────────────────────────────
/** "3 rows from your file weren't imported." / "1 row from your file wasn't imported." */
export const noticeHeadline = (count: number): string =>
  count === 1 ? "1 row from your file wasn't imported." : `${count} rows from your file weren't imported.`;

/** The second sentence — said only when EVERY skipped row has the no-name reason. With mixed
 *  reasons, or no list to check, the line states the count alone. */
export function noticeWhy(notice: ImportNotice): string | null {
  if (notice.rows.length === 0 || !notice.rows.every((r) => r.reason === NO_NAME_REASON)) return null;
  return notice.count === 1 ? "It had no agent or agency name." : "They had no agent or agency name.";
}

export const noticeToggle = (count: number, open: boolean): string =>
  `${open ? "Hide" : "Show"} the ${count === 1 ? "row" : "rows"}`;
export const NOTICE_DISMISS = "Dismiss";
