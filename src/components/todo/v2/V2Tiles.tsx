/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The To-do list's three tiles (v2; ref `.tiles`). Your move · Chase or close · Housekeeping, each
 * with the count, a sub-line naming what it is made of, and the state fill as its band and glyph
 * disc — the app's own `--state-*` tokens, never the ref's literal copies of them.
 *
 * ⚠️ A TILE IS A FILTER, NOT A TOGGLE AWAY FROM ONE. One tile is always selected (the ref's `.on`);
 * the page opens on Your move.
 */
import React from "react";
import { TILES, TILE_LABEL, type Tile, type TileCount } from "../../../lib/todoV2";

const BAND: Record<Tile, string> = {
  move: "var(--state-you)",
  chase: "var(--state-queried)",
  house: "var(--state-agent)",
};

const GLYPH: Record<Tile, React.ReactNode> = {
  move: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"><path d="m3 12 18-8-7 18-2.5-7.5L3 12Z" /></svg>,
  chase: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="8" /><path d="M12 7.5V12l3 2" /></svg>,
  house: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h10" /></svg>,
};

export const V2Tiles: React.FC<{
  counts: Record<Tile, TileCount>;
  selected: Tile;
  onPick: (t: Tile) => void;
}> = ({ counts, selected, onPick }) => (
  <div className="tdv2-tiles" role="group" aria-label="Task totals" data-todo-v2="tiles">
    {TILES.map((t) => (
      <button
        key={t}
        type="button"
        className={`tdv2-tile${t === selected ? " on" : ""}`}
        aria-pressed={t === selected}
        data-tile={t}
        onClick={() => onPick(t)}
      >
        <span className="tdv2-band" style={{ background: BAND[t] }} />
        <span className="tdv2-tbody">
          <span className="tdv2-gl" style={{ background: BAND[t] }} aria-hidden="true">{GLYPH[t]}</span>
          <span className="tdv2-lab">
            <b>{TILE_LABEL[t]}</b>
            <span className="tdv2-sub" data-todo-v2="tile-sub">{counts[t].sub}</span>
          </span>
          <span className="tdv2-num" data-todo-v2="tile-num">{counts[t].n}</span>
        </span>
      </button>
    ))}
  </div>
);
