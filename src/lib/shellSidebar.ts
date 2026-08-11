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

/* ⚠️ THE COUNTING LAW IS NOT HERE. It is `lib/todoCount` (todoCounts / todoBadgeCount) — the one
   implementation, which also supplies the side container's LIST-row figures. These tiles are the
   RIBBON's three numbers and nothing more; do not add an `actionable` field back, or the app will
   have two answers to the same question again, which is the fault the law was written to end. */

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

/* (The PANEL's notification desk line was removed by the canonical shell pack — the panel
   states urgency as one burgundy dot beside the To-do count. `deskNotice` returned with a NEW
   surface (Mobile Pass 1): the <md dashboard's desk-line card, the doorway to /todo — exactly
   the tombstone's condition, "do not re-add the derivation without re-adding the surface". The
   desktop panel remains desk-line-free.) */

export interface DeskNotice {
  /** `hot` = something is actually urgent; `calm` = the quiet form. Drives the treatment. */
  tone: "hot" | "calm";
  /** The roundel figure — the URGENT count, so a calm desk shows a plain 0. */
  count: number;
  headline: string;
  /** The housekeeping line. NULL when there is no housekeeping — never "0 items". */
  sub: string | null;
}

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** THE DESK LINE (panel-foot pack wording, recovered at 6d64b75; surface = the mobile
 *  dashboard, Mobile Pass 1). One line says what needs you; the housekeeping total rides
 *  behind it as context rather than as a peer. No stored field — both figures come off the
 *  tiles. The quiet state is a genuinely different treatment, not the loud one greyed out. */
export function deskNotice(tiles: LedgerTiles): DeskNotice {
  const hk = tiles.housekeeping;
  const sub = hk > 0 ? plural(hk, "housekeeping item", "housekeeping items") : null;
  if (tiles.urgent > 0) {
    return {
      tone: "hot",
      count: tiles.urgent,
      headline: `${plural(tiles.urgent, "task", "tasks")} ${tiles.urgent === 1 ? "requires" : "require"} your attention`,
      sub: sub && `plus ${sub}`,
    };
  }
  return {
    tone: "calm",
    count: 0,
    headline: "Nothing needs you today",
    sub: sub && `${sub} when you have a moment`,
  };
}

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

/**
 * The manuscript arrows' destination (polish P6).
 *
 * ⚠️ IT WRAPS, AND THAT IS THE POINT OF A SHORTCUT. Clamping at the ends would give the arrows a
 * SECOND disabled state — greyed at one manuscript, and greyed again at either end of three —
 * which turns a quick step-through into a control you have to look at before using. The card
 * itself still opens the full picker, so nothing depends on the arrows reaching a particular end.
 *
 * Returns the current id when there is nothing to step to, so a caller can compare and skip the
 * write rather than storing the same value again.
 */
export function stepManuscript(
  manuscripts: { id: string }[],
  currentId: string | null,
  dir: 1 | -1,
): string | null {
  if (manuscripts.length === 0) return null;
  if (manuscripts.length === 1) return manuscripts[0].id;
  const at = manuscripts.findIndex((m) => m.id === currentId);
  // An unknown current id steps from the first, matching resolveActiveManuscript's own fallback.
  const from = at === -1 ? 0 : at;
  const next = (from + dir + manuscripts.length) % manuscripts.length;
  return manuscripts[next].id;
}

/**
 * The manuscript the workspace is scoped to (manuscript-scope B1).
 *
 * ⚠️ IDENTITY IS BY ID, NEVER BY TITLE. Two manuscripts may share a title, a title may be edited,
 * and a display string is not a key — the whole pack forbids matching on one.
 *
 * ⚠️ A STORED ID THAT NO LONGER RESOLVES FALLS BACK, IT DOES NOT THROW. Deleting the selected
 * manuscript is an ordinary thing to do, and the shell must not be the thing that breaks when it
 * happens. Same path covers "never chosen".
 *
 * The default is the most recently CREATED manuscript. `Manuscript` carries no `updatedAt`, and
 * adding one is a schema change with migration implications for a default — noted as possible
 * future work rather than done here. `createdDate` is optional and legacy rows lack it, so those
 * sort last and the array order decides between them, which is stable.
 */
export function resolveScopedManuscript<T extends { id: string; createdDate?: string }>(
  manuscripts: T[],
  storedId: string | null | undefined,
): T | null {
  if (manuscripts.length === 0) return null;
  const stored = storedId ? manuscripts.find((m) => m.id === storedId) : undefined;
  if (stored) return stored;
  return mostRecentlyCreated(manuscripts);
}

/** Newest by `createdDate`; undated rows sort last and keep their given order. */
export function mostRecentlyCreated<T extends { createdDate?: string }>(manuscripts: T[]): T | null {
  if (manuscripts.length === 0) return null;
  let best = manuscripts[0];
  let bestMs = Date.parse(best.createdDate ?? "");
  for (const m of manuscripts.slice(1)) {
    const ms = Date.parse(m.createdDate ?? "");
    // ⚠️ NaN comparisons are always false, so an undated row never displaces a dated one.
    if (Number.isNaN(bestMs) ? !Number.isNaN(ms) : ms > bestMs) { best = m; bestMs = ms; }
  }
  return best;
}
