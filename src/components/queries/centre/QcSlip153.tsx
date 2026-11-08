/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v153 (design-refs/query-centre-v153.html) — THE SLIP: one framed card per query. A header band in the
 * stage's colour (the navy seal, the name, the agency in italic; the status word over the four-step track, an arrow
 * badge on the current step), the hover CTA beside it, and four fact boxes below.
 *
 * ⚠️ THE WHOLE SLIP IS ONE CONTROL: a click anywhere, Enter or Space opens the card (`onOpen`). Its id is
 *    `query-row-{id}`, the element the query panel gives focus back to when it closes. The CTA is a mouse shortcut to
 *    the same journeys the card offers, so it takes no tab stop of its own (a button inside a button is two controls
 *    claiming one place); a keyboard reader opens the card and acts there.
 * ⚠️ NO RED: the late Next box is a fill and a navy dot, its words stay ink.
 */
import React from "react";
import type { QcRow } from "../../../lib/qcSummary";
import type { RowAct } from "../../../lib/qc1512";
import type { DrawerMode } from "../../../lib/queryActions/drawerStore";
import { heardFact, nextFact, queriedFact, slipTone, slipTrack, standWords, type SlipTrack } from "../../../lib/qc153";
import { TrackNode, type TrackNodeKind } from "./StageGlyph";
import "../../containers/framedSlip.css";
import "./qcv153.css";

const A_IN = <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.5 3.5 4 12M4 5.5V12h6.5" /></svg>;
const A_OUT = <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 12.5 12 4M5.5 4H12v6.5" /></svg>;
const A_END = <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 8h8" /></svg>;

export const FACT_ICON = {
  queried: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"><path d="M14 2 1.8 7.2l5 2 2 5z" /><path d="M14 2 6.8 9.2" /></svg>,
  heard: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"><path d="M2 3h12v8H8.5L5 13.8V11H2z" /></svg>,
  next: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="6.2" /><path d="M8 4.6V8l2.4 1.6" /></svg>,
  sent: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"><path d="M2 5 8 2l6 3v6l-6 3-6-3z" /><path d="M2 5l6 3 6-3M8 8v6" /></svg>,
} as const;

const LIVE_KIND: readonly TrackNodeKind[] = ["q", "partial", "full", "offer"];
const NODE_TITLE = ["Queried", "Partial", "Full", "Offer"] as const;

/** the four-step track: ink to the current step, faded future, a dotted line into a skipped step */
export const Track153: React.FC<{ t: SlipTrack }> = ({ t }) => (
  <span className={`qc153-trk${t.ended ? " is-ended" : ""}`} data-qc153="track" data-dir={t.dir}>
    {t.nodes.map((n, i) => {
      const k: TrackNodeKind = n === "cur" ? (t.end ?? (i === 3 ? "offer-on" : LIVE_KIND[i])) : LIVE_KIND[i];
      return (
        <React.Fragment key={i}>
          {i ? <i className={`qc153-ln qc153-ln--${t.links[i - 1]}`} data-qc153="link" data-state={t.links[i - 1]} aria-hidden="true" /> : null}
          <span className={`qc153-nd qc153-nd--${n}`} data-qc153="node" data-state={n} title={NODE_TITLE[i]}>
            <TrackNode k={k} />
            {n === "cur" ? <b className={`qc153-arw qc153-arw--${t.dir}`} data-qc153="arrow" data-dir={t.dir} aria-hidden="true">{t.dir === "in" ? A_IN : t.dir === "out" ? A_OUT : A_END}</b> : null}
          </span>
        </React.Fragment>
      );
    })}
  </span>
);

export interface QcSlip153Props {
  row: QcRow;
  nowMs: number;
  selected: boolean;
  packageName: string | null;
  act: RowAct | null;
  onOpen: (id: string) => void;
  onAct: (id: string, mode?: DrawerMode) => void;
}

export const QcSlip153: React.FC<QcSlip153Props> = ({ row: r, nowMs, selected, packageName, act, onOpen, onAct }) => {
  const t = slipTrack(r);
  const word = standWords(r);
  const qd = queriedFact(r, nowMs);
  const hd = heardFact(r, nowMs);
  const nx = nextFact(r, nowMs);
  const cta = act && act.tone !== "plain" ? act : null;
  const open = () => onOpen(r.id);
  return (
    <div className={`sa-slip qc153-slip${selected ? " is-sel" : ""}`} id={`query-row-${r.id}`} data-qc153="slip" data-qcv="row" data-id={r.id}
      data-tone={slipTone(r.status)} data-status={r.status} role="button" tabIndex={0}
      aria-label={`${r.agentName}, ${r.agency}, ${word}`} aria-pressed={selected}
      onClick={open}
      onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); open(); } }}>
      <div className="sa-slip-in">
        <div className="qc153-top" data-qc153="head">
          <span className="qc153-seal" aria-hidden="true">{r.initials}</span>
          <span className="qc153-who">
            <b className="qc153-nm" data-qc153="name">{r.agentName}</b>
            <span className="qc153-ag" data-qc153="agency">{r.agency}</span>
          </span>
          <span className="qc153-rt">
            <span className="qc153-cta" data-qc153="cta" aria-hidden="true">
              {cta
                ? <button type="button" tabIndex={-1} className="qc153-btn" data-qc153="cta-btn" data-mode={cta.mode} onClick={(e) => { e.stopPropagation(); onAct(r.id, cta.mode); }}>{cta.label} →</button>
                : <button type="button" tabIndex={-1} className="qc153-btn qc153-btn--ghost" data-qc153="cta-open" onClick={(e) => { e.stopPropagation(); open(); }}>Open the card →</button>}
            </span>
            <span className="qc153-st">
              <span className="qc153-wd" data-qc153="word">{word}</span>
              <Track153 t={t} />
            </span>
          </span>
        </div>
        <div className="qc153-facts" data-qc153="facts">
          <div className="qc153-fact" data-qc153="fact" data-k="queried">
            <span className="qc153-fl"><i className="qc153-fi" aria-hidden="true">{FACT_ICON.queried}</i>Queried</span>
            <b>{qd.value}</b>{qd.line ? <em>{qd.line}</em> : null}
          </div>
          <div className={`qc153-fact${hd.soft ? " is-soft" : ""}`} data-qc153="fact" data-k="heard">
            <span className="qc153-fl"><i className="qc153-fi" aria-hidden="true">{FACT_ICON.heard}</i>Last heard</span>
            <b>{hd.value}</b>{hd.line ? <em>{hd.line}</em> : null}
          </div>
          <div className={`qc153-fact${nx.hot ? " is-hot" : ""}`} data-qc153="fact" data-k="next" data-hot={nx.hot ? "" : undefined}>
            <span className="qc153-fl"><i className="qc153-fi" aria-hidden="true">{FACT_ICON.next}</i>Next</span>
            <b>{nx.value}</b>
            {nx.bar != null ? <u className="qc153-win" data-qc153="window" aria-hidden="true"><i style={{ width: `${Math.round(nx.bar * 100)}%` }} /></u> : null}
          </div>
          <div className="qc153-fact" data-qc153="fact" data-k="sent">
            <span className="qc153-fl"><i className="qc153-fi" aria-hidden="true">{FACT_ICON.sent}</i>Sent with</span>
            <b>{packageName ?? "—"}</b>{packageName ? <em>package</em> : null}
          </div>
        </div>
      </div>
    </div>
  );
};
