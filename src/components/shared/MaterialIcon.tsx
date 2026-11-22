/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Material icons v1 — the ONE drawing for each material, everywhere a material is named.
 *
 * ⚠️ THE DRAWINGS ARE THE RULED REF, BYTE FOR BYTE. Each string below is `icons.<key>.inner` from
 * design-refs/material-icons-v1/material-icons-v1.json, copied verbatim (json keys letter, syn, pages,
 * chap, words, bio). MaterialIcon.test.tsx compares them to the file, so a hand "tidy" goes red.
 *
 * ⚠️ COLOUR IS `currentColor` ONLY — ink on paper, cream on navy. No tint, no fill of its own (the
 * synopsis plot points fill with currentColor, which is the ref's), never burgundy.
 *
 * ⚠️ THE ICON SITS BEFORE ITS LABEL AND NEVER REPLACES IT. It is aria-hidden: the words carry the name.
 * Which kind an item takes is `materialIconKind` (lib/materialIcon) — never decided from label text.
 */
import type { MaterialIconKind } from "../../lib/materialIcon";

export type { MaterialIconKind } from "../../lib/materialIcon";

export const MATERIAL_ICON_INNER: Readonly<Record<MaterialIconKind, string>> = {
  letter: "<path d=\"M6.5 11V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v6\"/><path d=\"M9.5 6.75h5M9.5 9.5h3\"/><path d=\"M3 11.5V19a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7.5l-9 5.5z\"/>",
  synopsis: "<rect x=\"5\" y=\"3\" width=\"14\" height=\"18\" rx=\"2\"/><circle cx=\"8.9\" cy=\"8\" r=\"1\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"8.9\" cy=\"12\" r=\"1\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"8.9\" cy=\"16\" r=\"1\" fill=\"currentColor\" stroke=\"none\"/><path d=\"M11.75 8h3.75M11.75 12h3.75M11.75 16h3.75\"/>",
  pages: "<rect x=\"7.5\" y=\"5.5\" width=\"12\" height=\"15.5\" rx=\"2\"/><path d=\"M4.5 17.5V5a2 2 0 0 1 2-2h9\"/>",
  chapters: "<rect x=\"5\" y=\"3\" width=\"14\" height=\"18\" rx=\"2\"/><path d=\"M11.2 8.2l1.3-1v4.3\"/><path d=\"M8.5 14.5h7M8.5 17.5h7\"/>",
  words: "<rect x=\"7.5\" y=\"5.5\" width=\"12\" height=\"15.5\" rx=\"2\"/><path d=\"M4.5 17.5V5a2 2 0 0 1 2-2h9\"/><path d=\"M10.9 17l2.6-7.25L16.1 17M11.85 14.4h3.3\"/>",
  bio: "<rect x=\"3\" y=\"5.5\" width=\"18\" height=\"13\" rx=\"2\"/><circle cx=\"8.4\" cy=\"10.6\" r=\"1.8\"/><path d=\"M5.6 15.6c.4-1.6 1.5-2.4 2.8-2.4s2.4.8 2.8 2.4\"/><path d=\"M14 10.25h4M14 13.5h2.75\"/>",
};

/** Never below 14px (the ruling). */
export const MATERIAL_ICON_MIN = 14;

export function MaterialIcon({ kind, size = 16, className }: { kind: MaterialIconKind; size?: number; className?: string }) {
  const px = Math.max(MATERIAL_ICON_MIN, size);
  return (
    <svg
      className={className ? `mat-ico ${className}` : "mat-ico"}
      data-mat-icon={kind}
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ flex: "none" }}
      dangerouslySetInnerHTML={{ __html: MATERIAL_ICON_INNER[kind] }}
    />
  );
}

/** The icon for an ITEM, or nothing (Full manuscript, Other, free text). The common call site. */
export function MaterialItemIcon({ kind, size, className }: { kind: MaterialIconKind | null; size?: number; className?: string }) {
  return kind ? <MaterialIcon kind={kind} size={size} className={className} /> : null;
}
