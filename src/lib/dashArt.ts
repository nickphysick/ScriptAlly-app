/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * dashArt — the dashboard's illustrations, stated once (17 Sep; v16, 18 Sep).
 *
 * ⚠️ THE VERSION IS THE FILE'S OWN HASH (the first eight hex of its md5), and a test recomputes it —
 * so replacing the picture without bumping the query string fails rather than serving a cached old
 * picture for a year. Both files are 1000×1000 originals from the QueryHawk designs folder, resized
 * to 2.5× their display size and quantised to a 256-colour palette with the alpha kept.
 *
 * ⚠️ `ACTIVE_QUERY_ART` HAS NO RENDERER TODAY, AND THE FILE STAYS (Nick, 18 Sep). The v16 chart header
 * is the title, the eyebrow and the grain chip — no picture. The header keeps its flex row so the 96px
 * slot can come back beside the count without a relayout, and this constant is what would fill it;
 * the md5 lock keeps the file honest in the meantime.
 *
 * ⚠️ TWO OF THE THREE QUICK-ACTION TILES ARE WAITING ON ARTWORK. `QUICK_ART` is keyed by
 * `dashActions`' `art` key, and a key with no entry draws the ref's dashed placeholder square. That
 * absence IS the state machine — adding a file here takes the placeholder off, and nothing else moves.
 */
export const ACTIVE_QUERY_ART = { src: "/images/active-query-hawk.png", version: "34316907", width: 240, height: 240 } as const;
export const QUICK_ACTIONS_ART = { src: "/images/quick-actions.png", version: "a5af21df", width: 130, height: 130 } as const;

export interface DashArt { src: string; version: string; width: number; height: number }

/** The tile artwork, by `QuickAction.art`. Absent = not drawn yet; the tile says so. */
export const QUICK_ART: Partial<Record<"quill" | "letter" | "card", DashArt>> = {
  quill: QUICK_ACTIONS_ART,
  /* letter: open-letter.png — "Record a response" */
  /* card:   calling-card.png — "Add an agent" */
};

/** What the placeholder says while a tile's picture is missing — two short words, the ref's. */
export const ART_PLACEHOLDER: Record<"quill" | "letter" | "card", string> = {
  quill: "quill",
  letter: "open letter",
  card: "calling card",
};

export const artUrl = (a: { src: string; version: string }): string => `${a.src}?v=${a.version}`;
