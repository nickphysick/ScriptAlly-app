/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "In the field" — the manuscripts-page queries card. All counts are derived live from the
 * manuscript's queries via lib/manuscriptPage (zero-suppressed canonical stage rows; one
 * aggregate Closed row). Dots are the real StatusDot, never a recreation.
 */
import React from "react";
import { Query } from "../../types";
import { StatusDot } from "../StatusDot";
import { activeQueryCount, stageRows } from "../../lib/manuscriptPage";

interface FieldCardProps {
  queries: Query[];
  /** Shelved presentation hides the send affordance (shelved books leave the query picker). */
  shelved: boolean;
  onOpenHub: () => void;
  onSendFirst: () => void;
}

export const FieldCard: React.FC<FieldCardProps> = ({ queries, shelved, onOpenHub, onSendFirst }) => {
  const sent = queries.length;
  const active = activeQueryCount(queries);
  const rows = stageRows(queries);

  return (
    <div className="msv-panel">
      <div className="msv-band">
        <h3>In the field</h3>
        <span className="msv-lab">QUERIES</span>
      </div>
      {sent === 0 ? (
        <div className="msv-fieldempty">
          <div className="msv-qm">Still on the runway.</div>
          <span className="msv-lab">NO QUERIES SENT YET</span>
          {!shelved && (
            <div>
              <button type="button" className="msv-btn sm" onClick={onSendFirst}>
                Send first query
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="msv-fieldbody">
            <div className="msv-figrow">
              <span className="msv-fig">{sent}</span>
              <span className="msv-lab">QUERIES SENT</span>
              <span className={`msv-figpill${active > 0 ? "" : " grey"}`}>
                {active > 0 ? `${active} active` : "all closed"}
              </span>
            </div>
            <div className="msv-stagerows">
              {rows.map((r) => (
                <div key={r.key} className="msv-stagerow">
                  <StatusDot status={r.dotStatus} overrideSize={15} decorative />
                  <span className="msv-nm">{r.label}</span>
                  <span className="msv-ct">{r.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="msv-fieldfoot">
            <button type="button" className="msv-linky" onClick={onOpenHub}>
              VIEW IN QUERIES HUB &rarr;
            </button>
          </div>
        </>
      )}
    </div>
  );
};
