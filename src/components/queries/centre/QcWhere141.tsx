/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v141 — "WHERE IT STANDS": the four sets (lib/qcSummary `whereItStands`) as the hero card, the pinned
 * band's breakdown and the Filters menu's section draw them. Ref design-refs/query-centre-v141/query-centre-v141.html.
 *
 * ⚠️ ONE FILTER: every press here writes `Qc138Filters.where` through the page's one setter; none of these parts holds
 *    a copy of which set is on.
 */
import React from "react";
import { WHERE_KEYS, WHERE_LABEL, type WhereKey } from "../../../lib/qcSummary";
import "./qcv141.css";

/** the marker square, one per set; Gone quiet is striped */
export const WhereMark: React.FC<{ k: WhereKey; tone?: "card" | "band" }> = ({ k, tone = "card" }) => (
  <span className={`qc141-m qc141-m--${k}${tone === "band" ? " qc141-m--b" : ""}`} aria-hidden="true" />
);

/** the four-part proportion bar: each segment's width in proportion to its count, with a minimum visible width */
export const WhereBar: React.FC<{ counts: Record<WhereKey, number>; className: string }> = ({ counts, className }) => (
  <div className={className} data-qc141="bar" aria-hidden="true">
    {WHERE_KEYS.map((k) => (counts[k] > 0 ? <i key={k} className={`qc141-sg qc141-sg--${k}`} data-k={k} style={{ flex: counts[k] }} /> : null))}
  </div>
);

/** the Heard back ring (the mock's `.qsc .rg svg`): navy on #ece6dc, a rust tick at its start */
export const HeardRing: React.FC<{ pc: number; size?: number }> = ({ pc, size }) => {
  const C = 2 * Math.PI * 40;
  const arc = (C * Math.max(0, Math.min(100, pc))) / 100;
  return (
    <svg viewBox="0 0 96 96" width={size} height={size} aria-hidden="true" data-qc141="ring">
      <circle cx="48" cy="48" r="40" fill="none" stroke="#ece6dc" strokeWidth="9" />
      <circle cx="48" cy="48" r="40" fill="none" stroke="#2a3a52" strokeWidth="9" strokeDasharray={`${arc} ${C}`} transform="rotate(-90 48 48)" strokeLinecap="butt" />
      <circle cx="48" cy="48" r="40" fill="none" stroke="#a2452a" strokeWidth="9" strokeDasharray={`3 ${C}`} transform="rotate(-92 48 48)" />
      <text x="48" y="56" textAnchor="middle" style={{ fontFamily: "var(--sp-type)" }} fontSize="26" fill="#1c130f">{pc}<tspan fontSize="12" dy="-11">%</tspan></text>
    </svg>
  );
};

const agentWord = (n: number) => (n === 1 ? "agent" : "agents");

/**
 * Part B — the hero's breakdown card (the mock's `.qsc`), the header's right-hand item. Its width is the header rules'
 * `--hero-right-w`, its right edge the row's inset; it is no taller than the stack and centred on it.
 */
export const QcWhereCard: React.FC<{
  /** null while loading */
  counts: Record<WhereKey, number> | null;
  total: number;
  heard: number;
  heardPct: number;
  where: WhereKey | null;
  onPick: (k: WhereKey) => void;
}> = ({ counts, total, heard, heardPct, where, onPick }) => {
  const c = counts ?? { you: 0, agent: 0, quiet: 0, closed: 0 };
  return (
    <div className={`qc141-card${where ? " pk" : ""}`} data-qc141="card" data-loading={counts ? undefined : ""} aria-busy={counts ? undefined : true}>
      <div className="qc141-cl">
        <WhereBar counts={c} className="qc141-sb" />
        {WHERE_KEYS.map((k) => {
          const on = where === k;
          return (
            <button key={k} type="button" className={`qc141-rw qc141-rw--${k}${on ? " on" : ""}`} data-qc141="card-row" data-k={k} data-n={c[k]}
              aria-pressed={on} title={WHERE_LABEL[k].title} disabled={!counts} onClick={() => onPick(k)}>
              <WhereMark k={k} />
              <b data-qc141="card-n">{counts ? c[k] : ""}</b>
              <span className="qc141-rl"><span className="qc141-lw">{WHERE_LABEL[k].label}</span><span className="qc141-lc">{WHERE_LABEL[k].compact}</span></span>
            </button>
          );
        })}
      </div>
      <i className="qc141-dv" aria-hidden="true" />
      <div className="qc141-rg" data-qc141="heard">
        <HeardRing pc={counts ? heardPct : 0} />
        <b>Heard back<small data-qc141="heard-sub">{counts ? `${heard} of ${total} ${agentWord(total)}` : " "}</small></b>
      </div>
    </div>
  );
};
