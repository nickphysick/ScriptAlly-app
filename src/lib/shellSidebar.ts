/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * shellSidebar — pure derivations for the v2 shell sidebar (Phase 3 of the shell rollout; ref
 * design-refs/scriptally-shell-v2.html). Everything is DERIVED from live db state — nothing
 * stored — and the task ledger reuses the To-do board's own selectors, so the sidebar can
 * never disagree with the page.
 */
import { Agent, Manuscript, Query, SubmissionPackage } from "../types";
import { assembleBoard, ribbonTiles, BoardInput } from "./todoBoard";
import { groupHousekeeping, hkGapCount } from "./todoHousekeeping";
import { activeQueryCount, isShelvedPresentation } from "./manuscriptPage";

export interface LedgerTiles {
  urgent: number;
  housekeeping: number;
  notes: number;
}

/** "YYYY-MM-DD" local — the same shape ToDoPage derives (kept private there). */
export const localYMD = (ms: number): string => {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/**
 * The To-do board's ribbon counts, by the To-do page's OWN recipe: assembleBoard →
 * groupHousekeeping gaps + individual stale cards → ribbonTiles. Keep in step with
 * ToDoPage.tsx's derivation — same calls, same order, never a parallel tally.
 */
export function sidebarBoardTiles(input: Omit<BoardInput, "today">): LedgerTiles {
  const board = assembleBoard({ ...input, today: localYMD(input.now) });
  const groups = groupHousekeeping(board.hk, input.agents, input.mutedTaskRules, input.queries);
  const stale = board.hk.filter((c) => c.taskType === "no_response_close");
  return ribbonTiles(board, hkGapCount(groups) + stale.length);
}

export interface LedgerRow {
  key: "urgent" | "housekeeping" | "notes";
  label: string;
  count: number;
}

/** Ledger rows with zero-count rows HIDDEN (the baked rule). Empty array === the quiet note. */
export function ledgerRows(tiles: LedgerTiles): LedgerRow[] {
  const rows: LedgerRow[] = [
    { key: "urgent", label: "Urgent", count: tiles.urgent },
    { key: "housekeeping", label: "Housekeeping", count: tiles.housekeeping },
    { key: "notes", label: "Notes", count: tiles.notes },
  ];
  return rows.filter((r) => r.count > 0);
}

export const LEDGER_EMPTY_NOTE = "Tasks and reminders will appear here — nothing to show right now.";

/** Nav count chips by shellV2Nav page key. Only cheaply-countable pages carry one. */
export function sideNavCounts(input: {
  queries: Query[];
  agents: Agent[];
  manuscripts: Manuscript[];
  packages: SubmissionPackage[];
  todoTotal: number;
}): Record<string, number> {
  return {
    "queries-hub": input.queries.length,
    todo: input.todoTotal,
    packages: input.packages.length,
    "agents-list": input.agents.length,
    manuscripts: input.manuscripts.length,
  };
}

/** Playfair initials for the switcher tile — the first letters of the first TWO words ("MD"
 *  for Murphy's Day Out, per the mockup). Deliberately NOT agentInitials, whose convention is
 *  first + last word ("MO" here) — a person's name is not a book title. */
export function manuscriptInitials(title: string): string {
  return title.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

/** Switcher subtitle: "16 queries · 11 active" (singular-safe); shelved manuscripts read "shelved". */
export function manuscriptSubtitle(m: Pick<Manuscript, "status" | "shelved">, msQueries: Query[]): string {
  if (isShelvedPresentation(m)) return "shelved";
  const n = msQueries.length;
  return `${n} ${n === 1 ? "query" : "queries"} · ${activeQueryCount(msQueries)} active`;
}

/** The stored active-manuscript selection resolved against the live list (fallback: first). */
export function resolveActiveManuscript(
  manuscripts: Manuscript[],
  storedId: string | null
): Manuscript | null {
  if (manuscripts.length === 0) return null;
  return manuscripts.find((m) => m.id === storedId) ?? manuscripts[0];
}

/** Pro line default copy — the pack's baked option A. */
export const SHELL_PRO_COPY = "Unlock your full query log";
