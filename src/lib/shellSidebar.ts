/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * shellSidebar — pure derivations for the v2 shell sidebar (Phase 3 of the shell rollout; ref
 * design-refs/scriptally-shell-v2.html). Everything is DERIVED from live db state — nothing
 * stored — and the task ledger reuses the To-do board's own selectors, so the sidebar can
 * never disagree with the page.
 */
import { Agent, Manuscript, Query, SubmissionPackage, UserPlan } from "../types";
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

/* (The NOTIFICATION DESK LINE and its `deskNotice` derivation are REMOVED — canonical shell
   pack. The panel states urgency as one burgundy dot beside the To-do count instead; a count
   says how much, the dot says some of it will not wait. Recoverable at 6d64b75 if the block is
   ever wanted back, but do not re-add the derivation without re-adding the surface.) */

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

/** The upgrade row's copy — the capsule pack's baked wording (supersedes the flat shell's
 *  "Unlock your full query log" option A).
 *  ⚠️ RETAINED FOR THE ROW THAT NO LONGER EXISTS: the standalone upgrade row is gone (panel-foot
 *  pack, treatment 1 — the upsell folded into the plan line), so this constant is unused by the
 *  panel. Left in place because it is the baked wording, and the Pro link still reads "Upgrade". */
export const SHELL_PRO_COPY = "Upgrade to Pro";

/** THE PLAN LINE (panel-foot pack, treatment 1 — "folded into the plan line"; ref
 *  design-refs/scriptally-panel-foot.html column 1). The quietest of the four treatments and the
 *  one Notion/Figma/Raycast use: the plan you are on is stated as FACT beside your name, and the
 *  upsell is a plain slate link in that same line. No block of its own, no badge, no fill.
 *
 *  Why it wins here: the panel foot is exactly where someone goes when they think about their
 *  account, so the prompt is already in the right place — and a persistent sold-looking row in
 *  permanent chrome is a thing you learn to stop seeing. Pro users get the plan, no link. */
export function planLine(plan: UserPlan | undefined): { label: string; upgrade: boolean } {
  return plan === UserPlan.PRO ? { label: "Pro plan", upgrade: false } : { label: "Free plan", upgrade: true };
}
