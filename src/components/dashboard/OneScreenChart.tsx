/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OneScreenChart — the active-queries chart card (§3–§4). P2 SHELL: the card frame, header row
 * and sparse state; the SVG, popup, pins, keyboard, ranges and ledger view land in P3. Nothing
 * mounts this page until the final wiring phase, so the shell is scaffolding, not a shipped gap.
 */
import React from "react";
import { Agent, Query } from "../../types";
import { ledgerView, rangeChip, weeklyLedger } from "../../lib/oneScreen";
import { Skel } from "./OneScreenDashboard";

export const OneScreenChart: React.FC<{
  loading: boolean;
  queries: Query[];
  agents: Agent[];
  now: Date;
}> = ({ loading, queries, now }) => {
  const ledger = weeklyLedger(queries, now);
  const view = ledgerView(ledger, "8");
  const active = ledger.length ? ledger[ledger.length - 1].active : 0;

  return (
    <div className={`os-card os-lift os-lead${loading ? " isload" : ""}`}>
      {loading && <Skel bars={["h", "grow", ""]} />}
      <div className="os-lh">
        <span className="os-ll">Active queries</span>
      </div>
      <div className="os-fig">
        <span className="os-n">{active}</span>
        {view.length >= 2 && <span className="os-chip">{rangeChip(view)}</span>}
      </div>
      <div className="os-chartwrap">
        {ledger.length < 2 && (
          <div className="os-sparse on">
            <span>The line begins once you have queried in two separate weeks.</span>
          </div>
        )}
      </div>
    </div>
  );
};
