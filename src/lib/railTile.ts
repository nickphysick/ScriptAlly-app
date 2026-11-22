/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * railTile — what the sidebar's manuscript tile shows (sidebar rail v1, 5 Nov; ref
 * design-refs/shell/sidebar-rail-v1.js `build()`).
 *
 * The rail has no room for a title, so the book is its initials on a cream title-page tile: the first
 * letters of its first two words, a leading article dropped ("The Taloned Mr Ripley" → "TM"). A title
 * that names every book ("All manuscripts") shows a stack; a title with no letters at all shows the
 * Library glyph, because two blank initials would read as a tile that failed to load.
 */
export type RailTile = { kind: "initials"; text: string } | { kind: "stack" } | { kind: "blank" };

export function railTile(title: string | null | undefined): RailTile {
  const t = (title ?? "").trim();
  if (/^(all|every)\b/i.test(t)) return { kind: "stack" };
  const text = t
    .replace(/^(the|a|an)\s+/i, "")
    .split(/\s+/)
    .filter((w) => /^\p{L}/u.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
  return text ? { kind: "initials", text } : { kind: "blank" };
}
