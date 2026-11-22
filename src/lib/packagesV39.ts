/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ SUBMISSION PACKAGES v39 (design-refs/submission-packages-v39/) — package colour, and the full lists under Results ══
 *
 * ⚠️ PART C · EVERY PACKAGE HAS A COLOUR, ONE OF EIGHT, IN THIS ORDER, AND NO OTHERS (the ref's `PCOL`). The KEY is
 *    stored (`SubmissionPackage.colour`), never the hex; a package without the field reads as Harbour, so nothing
 *    stored before v39 needs migrating. The rules hold the same eight keys (firestore.rules, isValidPackage).
 * ⚠️ COLOUR IS NEVER THE ONLY SIGNAL: wherever it shows, the package's name and icon show too.
 */
import type { CSSProperties } from "react";
import type { PackageColour, SubmissionPackage } from "../types";
import type { Fig } from "./packagesV38";
import { PACKAGE_NAVY } from "./packagesV42";

export const PACKAGE_COLOURS: readonly { key: PackageColour; name: string; hex: string }[] = [
  { key: "harbour", name: "Harbour", hex: "#1d4b63" },
  { key: "lake", name: "Lake", hex: "#2c6782" },
  { key: "teal", name: "Teal", hex: "#22595b" },
  { key: "pine", name: "Pine", hex: "#2e5641" },
  { key: "indigo", name: "Indigo", hex: "#3b477a" },
  { key: "plum", name: "Plum", hex: "#583a5a" },
  { key: "slate", name: "Slate", hex: "#4a5466" },
  { key: "charcoal", name: "Charcoal", hex: "#34373f" },
];
const BY_KEY = new Map(PACKAGE_COLOURS.map((c) => [c.key, c]));

/** A package's colour key: its own, else Harbour (absent, or a value from outside the eight). */
export const colourOf = (p: Pick<SubmissionPackage, "colour"> | null | undefined): PackageColour =>
  p?.colour && BY_KEY.has(p.colour) ? p.colour : "harbour";
/** A package's stored colour as its hex. v42 Part E: kept as the reading of the stored field, and never painted. */
export const hexOf = (p: Pick<SubmissionPackage, "colour"> | null | undefined): string => BY_KEY.get(colourOf(p))!.hex;
/**
 * The `--pc` custom property every package surface paints through. v42 Part E: PACKAGE COLOURS ARE NOT SHOWN ANYWHERE —
 * every package icon is navy (cream glyph), whatever the stored colour says. The argument is kept so every caller stays
 * as it was; the stored field is kept, and not migrated.
 */
export const pcStyle = (_p?: Pick<SubmissionPackage, "colour"> | null) => ({ "--pc": PACKAGE_NAVY }) as CSSProperties;

/* v42 A: the new-package dialog's first colour (`firstFreeColour`) is retired with the colour field. */

/* ══ PART H · the full lists under Results ═════════════════════════════════════════════════════════════════════════
 * ⚠️ EVERY FIGURE IS packageReplies' (lib/packagesV38 `Fig`), exactly as the top three: the same first-answer rule,
 *    edition-true for materials, ranked from MIN_SENDS_FOR_CLAIM answers. A row and a showcase for the same item read
 *    the same Fig, so they cannot disagree.
 */

/**
 * The full list's order (the ref's `order`): sent before unsent, then ranked before too early, then by rate, then by
 * sent. An under-threshold item is therefore never above a ranked one.
 */
export function fullListOrder<T extends { f: Fig }>(items: readonly T[]): T[] {
  const rate = (f: Fig) => (f.ranked && f.pct != null ? f.pct : -1);
  return [...items].sort((a, b) =>
    (Number(b.f.sent > 0) - Number(a.f.sent > 0))
    || (Number(b.f.ranked) - Number(a.f.ranked))
    || (rate(b.f) - rate(a.f))
    || (b.f.sent - a.f.sent));
}

/** A row's Rate cell (the ref's `rl-v`): a bar and a figure once ranked; a hatched bar and "Too early"; dashes and "Not sent". */
export type RateCell = { k: "ranked"; width: number; label: string } | { k: "early"; width: 100; label: "Too early" } | { k: "none"; width: 100; label: "Not sent" };
export function rateCell(f: Fig): RateCell {
  if (!f.sent) return { k: "none", width: 100, label: "Not sent" };
  if (!f.ranked || f.pct == null) return { k: "early", width: 100, label: "Too early" };
  return { k: "ranked", width: Math.max(3, f.pct), label: `${f.pct}%` };
}
/** The Sent, Answered and Asked for more cells: the count, or a dash for something never sent. */
export const countCells = (f: Fig): [string, string, string] => (f.sent ? [String(f.sent), String(f.answered), String(f.more)] : ["–", "–", "–"]);
