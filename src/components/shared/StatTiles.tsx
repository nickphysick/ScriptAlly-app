/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * StatTiles — the row of counted tiles, shared (QC-chassis round, Phase 1).
 *
 * ⚠️ THIS IS AN EXTRACTION, NOT A SECOND TILE. `QueryStatTiles` drew this markup and owned the
 * Query Centre's own data (`STAT_TILES`, `QuickKey`, the overdue axis); the To-do page needs the
 * same tiles over a different set. A copy with the same class names would be a fork wearing
 * shared clothes — two components that look identical until one of them is restyled — so the
 * MARKUP moved here and `QueryStatTiles` became its wrapper. Both pages mount this.
 *
 * ⚠️ THE STYLESHEET DID NOT MOVE. `queryStatTiles.css` is imported here and the classes are
 * unchanged (`.qct`, `.qct-tile`, `.qct-ic`, `.qct-tx`, `.qct-k`, `.qct-n`), so the Query Centre
 * renders byte-identically and there is one place to restyle a tile. Moving the file would have
 * been a rename touching a hot stylesheet for no gain.
 *
 * ⚠️ THE COUNTS ARE THE WHOLE SET'S, NEVER THE FILTERED VIEW'S — the law this row has carried
 * since it replaced the chips, restated here because the To-do page is now a second caller who
 * could get it wrong. A tile that counted what it would show after clicking reads 0 for every
 * section you are not in, which is the one number nobody needs.
 */
import React from "react";
import "../queries/queryStatTiles.css";

export interface StatTile {
  /** the tile's own key — the caller's vocabulary, never interpreted here */
  key: string;
  label: string;
  /** the count, already derived by the caller from the ONE array its rows come from */
  count: number;
  /** the disc's fill; absent takes the plain parchment disc with its hairline */
  swatch?: string;
  /** the glyph inside the disc — a mark, or nothing */
  glyph?: React.ReactNode;
  /** the ringed mark the Query Centre's overdue tile wears instead of a glyph */
  mark?: string;
}

export const StatTiles: React.FC<{
  /**
   * ⚠️ ADDITIVE, AND IT COVERS THE FIGURE ONLY (the well round, §4). The tile's frame, its disc,
   * its glyph and its label all exist without query data, so they render immediately; the COUNT
   * is the one thing that has to wait. A tile that skeletons whole would take the page's shape
   * away while it loads, which is the opposite of what a skeleton is for. Optional, so the To-do
   * page's and Contact list's mounts are unchanged.
   */
  loading?: boolean;
  tiles: readonly StatTile[];
  /**
   * ⚠️ WHICH TILES ARE RINGED — A SET, NOT ONE KEY, AND THAT IS THE QUERY CENTRE'S OWN LAW.
   * Its row is TWO AXES: one active court plus `Past expected` as an independent flag, so "with
   * you AND past expected" must be able to ring both. The first version of this component took a
   * single key and quietly collapsed that to one — a real regression, caught by the Query
   * Centre's own lock, which is the argument for that lock existing. A page with one axis passes
   * one key and reads exactly as before.
   */
  selected: string | readonly string[] | null;
  onPick: (key: string) => void;
  label: string;
  /** how many columns the row lays out in; the Query Centre's five, the To-do page's seven */
  columns?: number;
}> = ({ tiles, selected, onPick, label, columns, loading }) => {
  const on = (k: string) => (Array.isArray(selected) ? selected.includes(k) : selected === k);
  return (
  <div
    className="qct"
    role="group"
    aria-label={label}
    /* ⚠️ THE COLUMN COUNT IS A STYLE, NOT A CLASS. The stylesheet states five and the To-do page
       needs seven; a `.qct--7` modifier would be a second place to keep in step every time a
       page's tile count changes. The default is absent, so the Query Centre keeps the
       stylesheet's own grid and its narrow-viewport step unchanged. */
    style={columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
  >
    {tiles.map((t) => (
      <button
        key={t.key}
        type="button"
        className={`qct-tile${on(t.key) ? " qct-tile--on" : ""}`}
        aria-pressed={on(t.key)}
        onClick={() => onPick(t.key)}
      >
        <span
          className={`qct-ic${t.swatch ? "" : " qct-ic--plain"}`}
          aria-hidden="true"
          style={t.swatch ? { background: t.swatch } : undefined}
        >
          {t.mark ? <span className="qct-mk">{t.mark}</span> : t.glyph}
        </span>
        <span className="qct-tx">
          <span className="qct-k">{t.label}</span>
          {loading ? <span className="qct-n qcs-l qct-n--sk" aria-hidden="true" /> : <span className="qct-n">{t.count}</span>}
        </span>
      </button>
    ))}
  </div>
  );
};
