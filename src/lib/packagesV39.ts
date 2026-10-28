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
/** A package's colour as its hex — what every surface paints through `--pc`. */
export const hexOf = (p: Pick<SubmissionPackage, "colour"> | null | undefined): string => BY_KEY.get(colourOf(p))!.hex;
/** The `--pc` custom property for an element that a package colours. */
export const pcStyle = (p: Pick<SubmissionPackage, "colour"> | null | undefined) => ({ "--pc": hexOf(p) }) as CSSProperties;

/**
 * The new-package dialog's first choice: the first colour, in palette order, that no LIVE package of the manuscript
 * already uses; Harbour when all eight are taken. A retired package's colour is free again.
 */
export function firstFreeColour(pkgs: readonly Pick<SubmissionPackage, "colour" | "status">[]): PackageColour {
  const used = new Set(pkgs.filter((p) => p.status !== "Retired").map((p) => colourOf(p)));
  return PACKAGE_COLOURS.find((c) => !used.has(c.key))?.key ?? "harbour";
}
