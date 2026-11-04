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
