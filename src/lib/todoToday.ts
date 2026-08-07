/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * todoToday — the Today page's pure derivations (workspace pack, Phase 3).
 *
 * Today is the one page in the workspace that is a LIST YOU BUILT rather than a view of what
 * exists. Everything here protects that: the subtitle counts what you actually cleared, the bench
 * only ever suggests things you have not already dealt with, and the quick-add makes exactly one
 * kind of thing.
 */

import { BoardCard } from "./todoBoard";
import { TaskFlag } from "../types";

/**
 * THE DERIVED SUBTITLE — "{done} of {total} cleared — Thursday 6 August".
 *
 * `total` is done + still-open, so it is the size of the list you committed to, not the size of
 * the app's backlog. A day where you cleared everything reads "4 of 4", and a day you have not
 * started reads "0 of 4" — never "0 of 0", which would say you had no plan when you had one.
 */
export function todaySubtitle(doneN: number, openN: number, nowMs: number): string {
  const total = doneN + openN;
  const date = new Date(nowMs).toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long",
  });
  if (total === 0) return `Nothing on today's list yet — ${date}`;
  return `${doneN} of ${total} cleared — ${date}`;
}

/** "14:32" — the time a cleared item settled at, en-GB 24h. */
export function clearedAtLabel(whenMs: number | undefined): string {
  if (whenMs == null || Number.isNaN(whenMs)) return "";
  return new Date(whenMs).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/**
 * ⚠️ THE SUGGESTED BENCH, AND ITS FOUR EXCLUSIONS (audit item 6).
 *
 * The bench proposes what you might add to today. It must never propose:
 *   · anything SNOOZED — you already said not now, and re-offering it is the app arguing;
 *   · anything DISMISSED — you already said no;
 *   · a NOTE — notes are dateless and nothing chases them, so "add this to today" is meaningless;
 *   · anything ALREADY ON TODAY — the list you are looking at.
 *
 * A suggestion engine that ignores the answers it has already been given is worse than no
 * suggestions, because it teaches you to stop reading them.
 *
 * Capped at three. The cap is the point, not a performance measure: a bench of ten is a second
 * to-do list, and the page already has the real one above it.
 */
export const BENCH_MAX = 3;

export interface BenchItem {
  card: BoardCard;
  /** The why-line — stated, never inferred by the reader. */
  why: string;
}

export interface BenchInput {
  /** The open lanes, in the order they should be considered. */
  candidates: BoardCard[];
  /** Flags, for the snoozed and dismissed stances. */
  flags: Pick<TaskFlag, "snoozedUntil" | "skippedAt" | "queryId" | "agentId">[];
  /** Keys already committed to today (card.key). */
  onToday: Set<string>;
  nowMs: number;
}

/** A stance that silences a card: asleep, or explicitly skipped. */
function silenced(
  card: BoardCard,
  flags: BenchInput["flags"],
  nowMs: number
): boolean {
  const id = card.relatedRecordId ?? card.userTaskId;
  if (!id) return false;
  return flags.some((f) => {
    if (f.queryId !== id && f.agentId !== id) return false;
    if (f.skippedAt) return true; // dismissed
    if (!f.snoozedUntil) return false;
    const ms = Date.parse(f.snoozedUntil);
    return !Number.isNaN(ms) && ms > nowMs; // still asleep
  });
}

/**
 * ⚠️ THE WHY IS A REASON, NOT A KIND (corrections fix 7).
 *
 * It used to fall through to `card.kind.toLowerCase()` — so the right-hand line repeated the
 * meta chip beside it and told you nothing you could not already see. The KIND stays in the
 * chips; this line answers the only question the bench raises: why THIS one, out of everything?
 *
 * So every branch names a reason with its own evidence in it — an offer on the table, the oldest
 * unanswered request and how long, a stale query that would take about a minute to close. Where
 * there is genuinely no distinguishing reason, it says the plainest true thing rather than
 * dressing the kind up as one.
 */
export function benchWhy(card: BoardCard): string {
  if (card.taskType === "offer_received") return "an offer is on the table";
  if (card.nature === "task" && card.dueState === "overdue") return "overdue";
  if (card.nature === "task" && card.dueState === "today") return "due today";
  if (card.taskType === "no_response_close") return "about a minute";
  if (card.taskType === "nudge_overdue") {
    const days = /(\d+)\s*DAYS/.exec(card.due ?? "")?.[1];
    return days ? `oldest unanswered request · ${days} days` : "oldest unanswered request";
  }
  if (card.taskType === "partial_requested" || card.taskType === "full_requested") return "they are waiting on you";
  if (card.taskType === "revise_resubmit") return "a revision was invited";
  if (card.taskType === "data_quality_poor") return "a small gap to close";
  return "next on your list";
}

/** The bench's own heading (the copy register). It states WHAT the bench is and how big the pool
 *  behind it is — never the implementation guarantee, which is the derivation's business and the
 *  test's, not the reader's. */
export function benchHeading(remaining: number, filtered = false): string {
  /* tasks-audit P5: while a filter narrows the page, the header says so — "MATCHING" is the
     narrowed pool, "REMAINING" the whole one. The figure is card-unit either way. */
  return `THE MOST PRESSING OF THE ${remaining} ${filtered ? "MATCHING" : "REMAINING"}`;
}

export function suggestedBench(input: BenchInput): BenchItem[] {
  const out: BenchItem[] = [];
  for (const card of input.candidates) {
    if (out.length >= BENCH_MAX) break;
    if (card.nature === "note") continue;            // notes are never bench material
    if (input.onToday.has(card.key)) continue;        // already on the list you are reading
    if (silenced(card, input.flags, input.nowMs)) continue; // snoozed or dismissed
    out.push({ card, why: benchWhy(card) });
  }
  return out;
}

/**
 * ⚠️ THE QUICK-ADD MAKES A DATED TASK, NEVER A NOTE (audit item 7).
 *
 * "Add something to today" and "add a task or note" are different promises, and one control keeps
 * one of them. Typing here always produces a task due today — which is also what makes it appear
 * on this page at all, since Today surfaces dated work. A note created here would vanish from the
 * page the instant it was made, which is the clearest possible sign the verb was wrong.
 */
export function todayQuickAddFields(text: string, todayYmd: string): {
  text: string;
  dueDate: string;
} {
  return { text: text.trim(), dueDate: todayYmd };
}
