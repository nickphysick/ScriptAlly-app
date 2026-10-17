/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Analytics v24 S4 and S5 — THE SAID-AGAINST-TOOK ROW, the one form for "did they keep their word". An agency over a
 * sub-line, then a pair of bars ("THEY SAID" over "THEY TOOK" / "YOU HAVE WAITED") on ONE scale shared by the whole
 * section, then a verdict.
 *
 * ⚠️ ONE SCALE PER SECTION, PASSED IN: equal weeks are equal pixels in every row of a section. A row that measured
 *    against its own longest bar would draw a one-week overrun as long as a seven-week one.
 * ⚠️ RUST MARKS TIME PAST WHAT AN AGENT SAID. A bar that has not run past keeps its own fill.
 */
import React from "react";
import { span } from "../../lib/analyticsV24";

/** `days: null` is a bar with no date to measure from: no bar is drawn and the value says so. */
export interface Bar { label: string; days: number | null; fill: string; kind: "said" | "took" | "waited" | "asked" }
export interface PairRowProps {
  id: string;
  who: string;
  sub: string;
  bars: Bar[];
  /** days that the whole section's bars are measured against */
  scale: number;
  verdict: { big: string; small?: string; late?: boolean };
  probe: string;
  state?: string;
}
export const RUST = "#b4553f";

export const PairRow: React.FC<PairRowProps> = ({ id, who, sub, bars, scale, verdict, probe, state }) => (
  <li data-a24={probe} data-id={id} data-state={state}>
    <div className="a24-who"><b>{who}</b><small>{sub}</small></div>
    <div className="a24-pb">
      {bars.map((b) => (
        <div key={b.kind} className="a24-pbr" data-a24="pair-bar" data-kind={b.kind} data-days={b.days === null ? "" : Math.round(b.days)}>
          <span>{b.label}</span>
          <div className="a24-pbt">{b.days === null ? null : <i style={{ width: `${Math.max(0, Math.min(100, (b.days / scale) * 100)).toFixed(3)}%`, background: b.fill }} />}</div>
          <em>{b.days === null ? "Not dated" : Math.round(b.days) === 0 ? "Today" : span(b.days)}</em>
        </div>
      ))}
    </div>
    <div className="a24-val" data-a24="verdict">
      <b>{verdict.big}</b>
      {verdict.small ? <span className={verdict.late ? "late" : undefined}>{verdict.small}</span> : null}
    </div>
  </li>
);

export const PairList: React.FC<{ children: React.ReactNode; probe: string }> = ({ children, probe }) => (
  <ul className="a24-rows" data-a24={probe}>{children}</ul>
);
