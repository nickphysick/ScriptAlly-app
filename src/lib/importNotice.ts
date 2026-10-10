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
 * ⚠️ ITS LENGTH IS THE COMMIT'S OWN COUNT. Two things skip a row, and both are counted by
 * `commitSmartImport` into `queriesSkipped`: validation (`validateSmartImport(...).skipped`, each
 * with its query and its reason), and the commit itself, when a query's agent could not be saved
 * (an `errors` line, "Skipped a {status} query — its agent couldn't be saved."). The notice is one
 * row for each, so `rows.length === outcome.queriesSkipped`. If the two ever stop reconciling, the
 * notice carries the count alone and no list — a list that disagrees with its own headline is worse
 * than none.
 *
 * ⚠️ EVERY REASON IS THE SOURCE'S OWN STRING, VERBATIM. Nothing here rewords why a row was skipped.
 */
import type { ParsedAgent, ParsedQuery } from "../types/smartImport";

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
  /** How many rows were not imported — `outcome.queriesSkipped`. */
  count: number;
  /** One per skipped row; empty when the count could not be reconciled to a list. */
  rows: ImportNoticeRow[];
  /** When the import returned (ms). */
  at: number;
}

/** The reason validation gives a row with no agent name or agency (smartImport.ts). */
export const NO_NAME_REASON = "Row has no agent name or agency to identify it";
/** The line the commit writes when a query's agent could not be saved (smartImportCommit.ts). */
const COMMIT_SKIP = /^Skipped a (.*) query — its agent couldn't be saved\.$/;

export function buildImportNotice(
  skipped: readonly { query: ParsedQuery; reason: string }[],
  outcome: { queriesSkipped: number; errors: readonly string[] },
  agents: readonly ParsedAgent[],
  now: number = Date.now(),
): ImportNotice | null {
  if (outcome.queriesSkipped <= 0) return null;
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
  /* The list must be the count. If it is not, state the count alone. */
  return { count: outcome.queriesSkipped, rows: rows.length === outcome.queriesSkipped ? rows : [], at: now };
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
