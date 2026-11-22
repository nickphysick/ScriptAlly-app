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

/* ══ Part D · a package's one line in its stage's words (v41's rail row; v42's stat tiles read it through
   packagesV42.tileFoot). v42 retired the rail, the batch strip and its picker, and with them their words. ══ */
type Stage = "draft" | "ready" | "out" | "retired";
/** A rail row's one line under the name (ref `meta`): what has happened to it, in its stage's words. */
export type RailLine =
  | { k: "rate"; sent: number; pct: number }
  | { k: "answers"; sent: number; got: number; need: number }
  | { k: "ready" }
  | { k: "needs"; text: string }
  | { k: "retired" };
export function railLine(stage: Stage, f: { sent: number; answered: number; ranked: boolean; pct: number | null }, has: { version: boolean; letter: boolean }, need: number): RailLine {
  if (stage === "out" || (stage === "retired" && f.sent > 0)) {
    return f.ranked ? { k: "rate", sent: f.sent, pct: f.pct ?? 0 } : { k: "answers", sent: f.sent, got: Math.min(f.answered, need), need };
  }
  if (stage === "retired") return { k: "retired" };
  if (stage === "ready") return { k: "ready" };
  const n = [has.version ? null : "a version", has.letter ? null : "a letter"].filter(Boolean);
  return { k: "needs", text: `Needs ${n.join(" and ")}` };
}
export const railLineText = (l: RailLine): string =>
  l.k === "rate" ? `${l.sent} sent · ${l.pct}% asked for more` : l.k === "answers" ? `${l.sent} sent · ${l.got} of ${l.need} answers in`
    : l.k === "ready" ? "Ready to send" : l.k === "needs" ? l.text : "Retired";
