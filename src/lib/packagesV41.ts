/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v41 (design-refs/submission-packages-v41/) — the page's words and the small derivations its new
 * parts read. Nothing here stores or counts anything new: the figures are packageReplies' (lib/packagesV38), the stage
 * is v40's (lib/packagesV40), and the active package is the manuscript's `activePackageId`.
 */
import type { User } from "../types";

/* ══ Part B · the founding writer strip ══ */
export const FOUNDING_TAG = "Founding writer perk";
export const FOUNDING_LEAD = "This is a QueryHawk Pro page, and it’s yours in full.";
export const FOUNDING_REST = "Use it, and let us know what you think.";
export const FOUNDING_ASK = "Tell us what you think";
export const FOUNDING_SHOW = "Show the founding writer note";
/** The strip's dismissal, one leaf on the user (`todoPrefs` is an unconstrained map; no rules change). */
export const FOUNDING_NOTE_PATH = "todoPrefs.packages.foundingNoteHidden";
export const foundingNoteHidden = (user: Pick<User, "todoPrefs"> | null | undefined): boolean => user?.todoPrefs?.packages?.foundingNoteHidden === true;

/* ══ Part C · the header ══ */
export const HEADER_TITLE = "Your packages";
/** The subheader: "What each agent receives for {title}, and what works best." — or without "for …" with no manuscript. */
export function headerSub(title: string | null | undefined): { lead: string; title: string | null; tail: string } {
  const t = title?.trim() || null;
  return t ? { lead: "What each agent receives for ", title: t, tail: ", and what works best." } : { lead: "What each agent receives, and what works best.", title: null, tail: "" };
}

/* ══ Part D · the current batch row ══ */
export const BATCH_LEAD = "Your current batch is going out with";
export const BATCH_LEAD_SHORT = "Going out with";
export const BATCH_NONE = "Your current batch isn’t going out with a package yet.";
export const BATCH_NONE_REST = "Choose one and it’s picked for you each time you log a query.";

/* ══ Part E · the list ══ */
export type ListTab = "all" | "out" | "ready" | "draft";
export const LIST_TABS: [ListTab, string][] = [["all", "All"], ["out", "Out with agents"], ["ready", "Ready"], ["draft", "Draft"]];
export const LIST_EMPTY = "No packages yet. Make one and pick it the next time you log a query.";
export const packagesCount = (n: number) => `${n} package${n === 1 ? "" : "s"}`;

type Stage = "draft" | "ready" | "out" | "retired";
/** The tab counts, over the LIVE packages (retired ones are in no tab; "Show retired" adds them). */
export function tabCounts(stages: readonly Stage[]): Record<ListTab, number> {
  const live = stages.filter((s) => s !== "retired");
  return { all: live.length, out: live.filter((s) => s === "out").length, ready: live.filter((s) => s === "ready").length, draft: live.filter((s) => s === "draft").length };
}
/** Which packages the list shows: the tab's live packages, then the retired ones when they are shown (any tab). */
export function listFilter(stage: Stage, tab: ListTab, showRetired: boolean): boolean {
  if (stage === "retired") return showRetired;
  return tab === "all" || stage === tab;
}
/** The status pill's words (ref `stLabel`): a draft names what it still needs. */
export function statusWords(stage: Stage, has: { version: boolean; letter: boolean }): string {
  if (stage === "retired") return "Retired";
  if (stage === "out") return "Out with agents";
  if (stage === "ready") return "Ready to send";
  const need = [has.version ? null : "a version", has.letter ? null : "a letter"].filter(Boolean);
  return need.length ? `Draft · needs ${need.join(" and ")}` : "Draft";
}
/** The Asked for more cell: a dash before anything is sent, "Too early" before 4 answers, else the share. */
export function rateWords(f: { sent: number; ranked: boolean; pct: number | null }): { k: "none" | "early" | "rate"; text: string } {
  if (!f.sent) return { k: "none", text: "—" };
  if (!f.ranked) return { k: "early", text: "Too early" };
  return { k: "rate", text: `${f.pct ?? 0}%` };
}
