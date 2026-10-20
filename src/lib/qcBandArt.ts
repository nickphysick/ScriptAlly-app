/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v139 §C — WHAT EACH GROUP BAND DRAWS IN ITS ART SLOT, AND WHICH TONE IT WEARS, per grouping. Pure: the
 * list draws it (`QcList138`), the page picks the tone with it.
 *
 *   Who it's with  unchanged: the talon (Your move), the hourglass (Waiting), the archive box (Closed) — `null` here
 *   Status         the status's own stage glyph, black in a white disc; Passed / No response (and Withdrawn) grey
 *   Next action    the glyph of the stage the action belongs to, plus a badge (star, send, !, ×, clock, dots)
 *   Package        the package cube in a lavender disc; "No package" faint
 *   No grouping    unchanged — `null`
 *
 * Under Status and Next action the band's colour follows whose court it is, as the default grouping's does.
 */
import { QueryStatus } from "../types";
import { GLYPHS, type GlyphKey } from "./qc138";
import type { GroupBy, NextAction } from "./qcCalView";
import { tileCourt } from "./qcSummary";

export type BandTone = "you" | "waiting" | "closed";
export type BandBadge = "star" | "send" | "bang" | "x" | "clock" | "dots";

/**
 * v141 §D — A GLYPH PER STATUS. The seven stage glyphs fold statuses together (No response and Withdrawn under Passed's
 * circle-with-a-line, R&R under Full requested, Resubmitted under Full sent, Signed under Offer); a group per status
 * needs each its own, or two jump buttons draw the same mark. The extra five stay in the stage glyphs' grammar:
 *   nr  No response — a dashed circle with a clock hand (the mock's own svg)
 *   rr  Revise & resubmit — Full requested's disc with a ring cut out of it
 *   rs  Resubmitted — Full sent's disc with the same ring cut out
 *   sg  Signed — Offer's ring and centre without the dashed ring (settled, not your move)
 *   wd  Withdrawn — the ring with a diagonal stroke rather than Passed's level one
 */
export type StageKey = GlyphKey | "nr" | "rr" | "rs" | "sg" | "wd";
const OWN_GLYPH: Partial<Record<string, StageKey>> = {
  [QueryStatus.NO_RESPONSE]: "nr", [QueryStatus.REVISE_RESUBMIT]: "rr", [QueryStatus.RESUBMITTED]: "rs",
  [QueryStatus.SIGNED]: "sg", [QueryStatus.WITHDRAWN]: "wd",
};
/** the glyph a status draws on its own (a Status group, a stand row): its stage glyph unless it has one of its own */
export const stageKeyOfStatus = (s: string): StageKey => OWN_GLYPH[s] ?? glyphOfStatus(s);

export type BandArt =
  | { kind: "glyph"; glyph: StageKey; grey: boolean; badge: BandBadge | null; badgeTone: "rust" | "grey" | "navy" | null }
  | { kind: "package"; none: boolean };

const CLOSED_GREY: ReadonlySet<string> = new Set([QueryStatus.REJECTED, QueryStatus.NO_RESPONSE, QueryStatus.WITHDRAWN]);

export const glyphOfStatus = (s: string): GlyphKey => GLYPHS.find((g) => (g.statuses as readonly string[]).includes(s))?.key ?? "q";

/** v139 — each next action: the stage glyph it belongs to and its badge. Anything else (Revision owed, today): the
 *  Queried glyph with the navy dots, as the pack asks. */
export const ACTION_ART: Readonly<Record<NextAction, { glyph: GlyphKey; badge: BandBadge; tone: "rust" | "grey" | "navy" }>> = {
  offer: { glyph: "of", badge: "star", tone: "rust" },
  full: { glyph: "fr", badge: "send", tone: "rust" },
  partial: { glyph: "pr", badge: "send", tone: "rust" },
  nudge: { glyph: "q", badge: "bang", tone: "rust" },
  close: { glyph: "q", badge: "x", tone: "grey" },
  wait: { glyph: "q", badge: "dots", tone: "navy" },
  revision: { glyph: "q", badge: "dots", tone: "navy" },
};

export function bandArtOf(groupBy: GroupBy, key: string): BandArt | null {
  if (groupBy === "status") {
    const grey = CLOSED_GREY.has(key);
    return { kind: "glyph", glyph: stageKeyOfStatus(key), grey, badge: null, badgeTone: null };
  }
  if (groupBy === "action") {
    /* a closed status's band (Passed, No response…): the closed glyph, grey, and no badge */
    if (CLOSED_GREY.has(key) || key === QueryStatus.SIGNED) return { kind: "glyph", glyph: stageKeyOfStatus(key), grey: key !== QueryStatus.SIGNED, badge: null, badgeTone: null };
    const a = ACTION_ART[key as NextAction] ?? ACTION_ART.wait;
    return { kind: "glyph", glyph: a.glyph, grey: false, badge: a.badge, badgeTone: a.tone };
  }
  if (groupBy === "package") return { kind: "package", none: key === "pkg:none" };
  return null;
}

/** The band's tone: the default grouping's by key; Status and Next action by whose court; packages powder. */
export function bandToneOf(groupBy: GroupBy, key: string): BandTone {
  if (groupBy === "status") {
    const c = tileCourt(key as QueryStatus);
    return c === "you" ? "you" : c === "closed" || c == null ? "closed" : "waiting";
  }
  if (groupBy === "action") {
    if (CLOSED_GREY.has(key) || key === QueryStatus.SIGNED) return "closed";
    return key === "wait" ? "waiting" : "you";
  }
  if (groupBy === "package") return "waiting";
  return key === "you" ? "you" : key === "closed" ? "closed" : "waiting";
}
