/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OneScreenClosed — the Closed card (stage 3, 17 Sep; v16, 18 Sep).
 *
 * A ring of four arcs saying where each closed query stopped, the total in the hole, and a key of four
 * rows beneath it. Every figure is `dashClosed.closedTile`'s — the four buckets are mutually exclusive
 * and sum to the total, and the data layer checks that on every derivation.
 *
 * ⚠️ THE WORDS SAY HOW FAR A QUERY GOT, NEVER WHAT WAS DECIDED ABOUT IT. Silence is "No reply"; a pass
 * is named by the rung it stopped at, and the word for a pass does not appear on this card.
 *
 * ⚠️ A ZERO BUCKET KEEPS ITS ROW AND LOSES ITS COLOUR. The row greys out rather than disappearing:
 * "nothing stopped here" is a fact about the writer's querying, and a key that changes length as the
 * data moves is a key nobody can learn.
 *
 * ⚠️ "ALL N" OPENS THE QUERY CENTRE UNFILTERED. It has no link-level filter for closed queries, so the
 * card states the count and takes the reader to where the queries are, rather than inventing a
 * parameter the page does not read.
 */
import React from "react";
import { CLOSED_BUCKETS, DONUT, DONUT_C, closedDonut, type ClosedTile } from "../../lib/dashClosed";
import { OneScreenPanel } from "./OneScreenPanel";

export const OneScreenClosed: React.FC<{
  loading: boolean;
  /** null while the collections are still landing — no figure is stated */
  tile: ClosedTile | null;
  onSeeAll: () => void;
}> = ({ loading, tile, onSeeAll }) => {
  const t = loading ? null : tile;
  const fig = (n: number | undefined) => (n === undefined ? "" : n.toLocaleString("en-GB"));
  const arcs = t ? closedDonut(t) : [];
  const c = DONUT.box / 2;
  return (
    <OneScreenPanel variant="os-cl" probe="closed-tile" loading={loading} skel={["h", "grow", ""]}>
      <div className="os-hd">
        <div>
          <h3 className="os-cardttl">Closed</h3>
          <p className="os-sub">Where each one stopped</p>
        </div>
        <button type="button" className="os-mini os-clall" onClick={onSeeAll}>
          {t ? `All ${fig(t.total)}` : "All"}
        </button>
      </div>

      <div className="os-clpie">
        <svg viewBox={`0 0 ${DONUT.box} ${DONUT.box}`} role="img" aria-label={t ? `${fig(t.total)} closed` : "Closed"}>
          <circle className="os-dntrack" cx={c} cy={c} r={DONUT.r} fill="none" strokeWidth={DONUT.stroke} />
          {arcs.map((a) => (
            <circle
              key={a.key}
              className={`os-dnarc os-dnarc--${a.key}`}
              data-probe="closed-arc"
              data-bucket={a.key}
              cx={c} cy={c} r={DONUT.r} fill="none" strokeWidth={DONUT.stroke}
              strokeDasharray={`${a.len.toFixed(2)} ${DONUT_C.toFixed(2)}`}
              strokeDashoffset={a.offset.toFixed(2)}
              transform={`rotate(-90 ${c} ${c})`}
            />
          ))}
          <text className="os-dnn" x={c} y={c - 4} textAnchor="middle" data-probe-text="closed-total">{fig(t?.total)}</text>
          <text className="os-dnlab" x={c} y={c + 16} textAnchor="middle">CLOSED</text>
        </svg>
      </div>

      <div className="os-clkey">
        {CLOSED_BUCKETS.map((b) => {
          const count = t?.buckets.find((x) => x.key === b.key)?.count;
          return (
            <div
              className={`os-clrow${count === 0 ? " z" : ""}`}
              key={b.key}
              data-probe="closed-row"
              data-bucket={b.key}
            >
              <i className={`os-dnsw os-dnsw--${b.key}`} aria-hidden="true" />
              {b.label}
              <b data-probe-text="closed-count">{fig(count)}</b>
            </div>
          );
        })}
      </div>
    </OneScreenPanel>
  );
};
