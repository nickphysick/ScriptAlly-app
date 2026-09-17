/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OneScreenClosed — the Closed tile (dashboard stage 3, 17 Sep).
 *
 * The total, how many got past the letter, four rows saying how far the rest got, and a foot line
 * splitting them into answered and quiet. Every figure is `dashClosed.closedTile`'s — the four rows
 * are mutually exclusive and sum to the total, and the data layer checks that on every derivation.
 *
 * ⚠️ THE WORDS SAY HOW FAR A QUERY GOT, NEVER WHAT WAS DECIDED ABOUT IT. The word for a pass does not
 * appear on this tile, and silence is "No reply".
 *
 * ⚠️ "ALL N →" OPENS THE QUERY CENTRE UNFILTERED. It has no link-level filter for closed queries, so
 * the tile states the count and takes the reader to where the queries are, rather than inventing a
 * parameter the page does not read.
 */
import React from "react";
import type { ClosedTile } from "../../lib/dashClosed";
import { CLOSED_BUCKETS } from "../../lib/dashClosed";
import { OneScreenPanel } from "./OneScreenPanel";
import { StatePill } from "./OneScreenBreakdown";

export const OneScreenClosed: React.FC<{
  loading: boolean;
  /** null while the collections are still landing — no figure is stated */
  tile: ClosedTile | null;
  onSeeAll: () => void;
}> = ({ loading, tile, onSeeAll }) => {
  const t = loading ? null : tile;
  const fig = (n: number | undefined) => (n === undefined ? "" : n.toLocaleString("en-GB"));
  return (
    <OneScreenPanel variant="os-cl" probe="closed-tile" loading={loading} skel={["h", "", "", "", ""]} lift={false}>
      <div className="os-clhd">
        <h3 className="os-cltitle">Closed</h3>
        <button type="button" className="os-clall" onClick={onSeeAll}>
          {t ? `All ${fig(t.total)} →` : "All →"}
        </button>
      </div>
      <div className="os-clhead">
        <span className="os-clnum" data-probe-text="closed-total">{fig(t?.total)}</span>
        <span className="os-clsub">
          <span className="os-clsub1">closed</span>
          <span className="os-clsub2">{t ? `${fig(t.pastLetter)} got past the letter` : "got past the letter"}</span>
        </span>
      </div>
      <div className="os-clrows">
        {CLOSED_BUCKETS.map((b) => {
          const row = t?.buckets.find((x) => x.key === b.key);
          return (
            <div className="os-clrow" key={b.key} data-probe="closed-row" data-bucket={b.key}>
              <StatePill status={b.glyph} tone={b.tone} label={b.label} />
              <span className="os-cltrack" aria-hidden="true">
                <span className={`os-clfill os-clfill--${b.key}`} style={{ width: `${((row?.share ?? 0) * 100).toFixed(2)}%` }} />
              </span>
              <span className="os-clct" data-probe-text="closed-count">{fig(row?.count)}</span>
            </div>
          );
        })}
      </div>
      <p className="os-clfoot">
        {t ? `${fig(t.replied)} replied · ${fig(t.quiet)} went quiet` : "replied · went quiet"}
      </p>
    </OneScreenPanel>
  );
};
