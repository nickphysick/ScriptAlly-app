/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v58 — closed queries: the framed card with the grey band, the ring, four outcome tiles
 * and the latest line. The counts are `closedTile`'s (No Response and Rejected only — the Query
 * Centre's own closed court; Withdrawn and Signed are in neither).
 */
import React from "react";
import type { Agent, Query } from "../../../types";
import { CLOSED_BUCKETS, closedLatest, closedShare, type ClosedTile } from "../../../lib/dashClosed";
import { closedAt } from "../../../lib/oneScreen";
import { agentPrimary } from "../../../lib/agentDisplay";
import { DASH_ART, artUrl } from "../../../lib/dashArt";

export const closedBandTitle = (n: number | null): string =>
  n === null || n === 0 ? "Closed queries" : n === 1 ? "1 closed query" : `${n.toLocaleString("en-GB")} closed queries`;

export const CLOSED_NONE_TITLE = "None closed yet";
export const CLOSED_NONE_LINE = "When an agent passes, or you close a query that has gone quiet, it is counted here with how far it got.";

const R = 90;
const C = 2 * Math.PI * R;

export const Dash58Closed: React.FC<{
  loading: boolean;
  /** the last loaded page's shape, which the loading card takes */
  shape: "some" | "none";
  tile: ClosedTile | null;
  qcClosed: number;
  sentTotal: number;
  queries: Query[];
  agents: Agent[];
  now: Date;
  onSeeAll: () => void;
}> = ({ loading, shape, tile, qcClosed, sentTotal, queries, agents, now, onSeeAll }) => {
  const t = loading ? null : tile;
  const none = t ? t.total === 0 : shape === "none";
  const latest = t && t.total > 0
    ? closedLatest(
      t,
      (id) => { const q = queries.find((x) => x.id === id); return q ? closedAt(q) : null; },
      (id) => { const q = queries.find((x) => x.id === id); return agentPrimary(agents.find((a) => a.id === q?.agentId)) || "An agent"; },
      now.getTime(),
    )
    : null;
  const share = t ? closedShare(t.total, sentTotal) : 0;
  const derived = t ? JSON.stringify({ total: t.total, qc: qcClosed, counts: Object.fromEntries(t.buckets.map((b) => [b.key, b.count])) }) : undefined;

  return (
    <div className="os-card d58-closed" data-d58="closed" data-loading={loading ? "1" : "0"} data-derived={derived} role="group" aria-label="Closed queries">
      <div className="os-frame">
        <div className="os-band" data-d58="closed-band">
          <div className="os-bandrow">
            <h3 className={`os-cardttl${loading ? " d58-sk" : ""}`} data-d58="closed-title">{loading ? "0 closed queries" : closedBandTitle(t ? t.total : null)}</h3>
          </div>
        </div>
        <div className="d58-closedbody" data-d58="closed-body">
          <div className="d58-ring">
            <svg viewBox="0 0 200 200" aria-hidden="true">
              <circle cx="100" cy="100" r={R} fill="none" stroke="#e8e3dc" strokeWidth="12" />
              {t && t.total > 0 && (
                <circle
                  data-d58="arc" cx="100" cy="100" r={R} fill="none" stroke="#cdbfa6" strokeWidth="12" strokeLinecap="round"
                  strokeDasharray={`${(C * share).toFixed(2)} ${C.toFixed(2)}`} transform="rotate(-90 100 100)"
                />
              )}
            </svg>
            <div className="d58-ringart" aria-hidden="true">
              <img src={artUrl(DASH_ART.archivist)} width={DASH_ART.archivist.width} height={DASH_ART.archivist.height} alt="" decoding="async" />
            </div>
          </div>
          {none ? (
            <div className="d58-closedright d58-none" data-d58="closed-none">
              <h3 className={loading ? "d58-sk" : undefined}>{CLOSED_NONE_TITLE}</h3>
              <p className={loading ? "d58-sk" : undefined}>{CLOSED_NONE_LINE}</p>
            </div>
          ) : (
            <div className="d58-closedright">
              <div className="d58-tiles" data-d58="tiles">
                {CLOSED_BUCKETS.map((b) => {
                  const n = t?.buckets.find((x) => x.key === b.key)?.count ?? 0;
                  return loading ? (
                    <div className="d58-tile d58-sk" key={b.key}><b>0</b><span>{b.label}</span></div>
                  ) : (
                    <div className={`d58-tile${n === 0 ? " is-zero" : ""}`} key={b.key} data-d58="tile" data-bucket={b.key}>
                      <b data-d58="tile-n">{n}</b>
                      <span data-d58="tile-label">{b.label}</span>
                    </div>
                  );
                })}
              </div>
              <div className="d58-latest" data-d58="latest">
                <span className="d58-mono">LATEST</span>
                <span className={`d58-latesttext${loading ? " d58-sk" : ""}`}>
                  {latest ? <><b>{latest.who}</b> {latest.verb} · {latest.when}</> : " "}
                </span>
                <button type="button" className="d58-link" onClick={onSeeAll} disabled={loading}>See all →</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
