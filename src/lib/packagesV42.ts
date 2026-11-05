/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v42 (design-refs/submission-packages-v42/) — the page's words and the small derivations its new
 * parts read: the stat tiles' foot, the builder's "Use for current batch", the empty card, the drawers' copy and How it
 * works. Nothing here stores or counts anything new: the figures are packageReplies' (lib/packagesV38, read through
 * v41's `railLine`), the stage is v40's, and the current batch is the manuscript's `activePackageId`.
 */
import type { RailLine } from "./packagesV41";

/** Every package icon is navy with a cream glyph (v42 Part E): the stored colour is kept and never shown. */
export const PACKAGE_NAVY = "#2d3a50";

/* ══ Part C · the stat tiles ══ */
export const CURRENT_BATCH = "Current batch";
export const retiredLink = (n: number, shown: boolean) => (shown ? "Hide retired" : `Retired (${n})`);
/** A tile's foot: the figure (typewriter) and its label (serif), in its stage's words. */
export type TileFoot = { big: string; label: string };
export function tileFoot(l: RailLine, has: { version: boolean; letter: boolean }): TileFoot {
  if (l.k === "rate") return { big: `${l.pct}%`, label: "asked for more" };
  if (l.k === "answers") return { big: `${l.got} of ${l.need}`, label: "answers in" };
  if (l.k === "ready") return { big: "Ready", label: "to send" };
  if (l.k === "needs") return { big: `${(has.version ? 1 : 0) + (has.letter ? 1 : 0)} of 2`, label: "pieces in" };
  return { big: "Retired", label: "" };
}

/* ══ Part D · the builder ══ */
export const USE_FOR_BATCH = "Use for current batch";
export const STEPS_BAND = "Pick each piece";

/* ══ Part E · the drawers and the icon popover ══ */
export const NEW_TITLE = "Making a new package";
export const NEW_SUB = "Give it a name and an icon you’ll recognise. You’ll pick its pieces on the page.";
export const editTitle = (name: string) => `Editing ${name}`;
export const EDIT_SUB = "Rename it, change its icon, or add a note on who it’s for.";
export const ICON_HINT = "Pick one you’ll recognise. It shows on the tile, in the Query Centre and in your results.";

/* ══ Part F · the empty state ══ */
export const EMPTY_TITLE = "No packages yet";
export const EMPTY_BODY = "A package is everything one agent receives: pages from a version of your book, your query letter and, if they want one, a synopsis. Make one and pick it the next time you log a query.";

/* ══ Part G · How it works, one animated infographic ══ */
export const HOW_TITLE = "How packages work";
export const HOW_INTRO = "A package is simply what you send an agent. Put one together once, use it as often as you like, and we’ll show you which ones get the best response.";
export const HOW_STATIONS: readonly [string, string][] = [
  ["Choose what goes in", "Start with the version of your book, as that decides which pages agents see. Then add your query letter, and a synopsis if you like."],
  ["Give it a name", "Call it something you’ll remember, like “US agents”, and pick an icon. Its tile sits at the top of this page."],
  ["Send it with a query", "When you log a query, choose the package. We’ll keep a note of exactly what that agent received, so you don’t have to."],
  ["See what’s working", "Once a few agents have replied, you’ll see which packages get them asking for more pages."],
];
/** When each station appears, in seconds after the dialog opens (the ref's sequence, ~12s in all). */
export const HOW_STATION_AT: readonly number[] = [0.3, 4.1, 6.7, 10];
export const HOW_PLAY_AGAIN = "Play again";
export const HOW_GOT_IT = "Got it";
