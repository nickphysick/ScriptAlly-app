/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v60 — "Ready for lift off?" (ref design-refs/dashboard-v60/dashboard-v60.html `.ways`).
 *
 * Before the first query this replaces v59's title row AND its focus card (the getting-started plan
 * included); the hairline and the founding panel below it are untouched. Four offers, 2×2, in the
 * card grammar. ⚠️ NOTHING HERE IS REQUIRED: the copy says so and never urges, and none of the four
 * repeats "Log a query" or "Add an agent", which live only on the left doors.
 */
import React from "react";
import type { FirstUseTile, TileKey } from "../../../lib/dashFirstUse";
import { tilesDone } from "../../../lib/dashFirstUse";

export const LIFT_TITLE = "Ready for lift off?";

const ICON: Record<TileKey, React.ReactNode> = {
  import: <><path d="M10 3v9" /><path d="m6.5 8.5 3.5 3.5 3.5-3.5" /><path d="M3 12.5V16h14v-3.5" /></>,
  mats: <><path d="M5 2.5h7l3 3v12H5z" /><path d="M12 2.5v3h3" /><path d="M7.5 9.5h5M7.5 12.5h5M7.5 15h3" /></>,
  comps: <><path d="M3.5 3.5h3v13h-3zM7.5 3.5h3v13h-3z" /><path d="m11.8 4.6 2.9-.8 3.3 12.4-2.9.8z" /></>,
  version: <><path d="M4 6.5h12v10H4z" /><path d="M6 4h8M7.5 2h5" /></>,
};

export const Dash60Lift: React.FC<{
  loading: boolean;
  tiles: readonly FirstUseTile[];
  hasAgents: boolean;
  onTile: (k: TileKey) => void;
}> = ({ loading, tiles, hasAgents, onTile }) => (
  <>
    <div className="d58-listhead" data-d58="list-head">
      <div className="d59-titlerow" data-d58="title-row">
        <h2 className="d58-listtitle" data-d58="list-title" data-d60="lift-title">{LIFT_TITLE}</h2>
      </div>
      <span className="d58-listbar" data-d58="list-bar" aria-hidden="true" />
    </div>
    <div className="d60-liftsub" data-d60="lift-sub">
      <span>{hasAgents ? "Agents are on file. While you're here:" : "Start on the left, or with any of these:"}</span>
      <b className={loading ? "d58-sk" : undefined} data-d60="lift-done">{tilesDone(tiles)} OF 4 · NOTHING REQUIRED</b>
    </div>
    <div className="d60-ways" data-d60="ways">
      {tiles.map((t) => (
        <div key={t.key} className={`d60-way${t.done ? " is-done" : ""}`} data-d60="way" data-key={t.key} data-done={t.done ? "1" : "0"}>
          <div className="d60-wi">
            <div className="d60-wh">
              <span className="d60-ic" aria-hidden="true"><svg viewBox="0 0 20 20">{ICON[t.key]}</svg></span>
              <h4 className="d60-wt">{t.title}</h4>
            </div>
            <p className="d60-wp">{t.copy}</p>
            <div className="d60-wf">
              <small className={loading ? "d58-sk" : undefined} data-d60="way-status">{t.done ? "✓ " : ""}{t.status.toUpperCase()}</small>
              <button type="button" className="d60-wa" data-d60="way-act" disabled={loading} onClick={() => onTile(t.key)}>{t.action} →</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  </>
);
