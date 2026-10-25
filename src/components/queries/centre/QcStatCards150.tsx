/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v150 Part B (design-refs/query-centre-v150/, screens 01 and 03) — the four stat cards under the header:
 * Your move · With the agent · Gone quiet · Closed. They replace the quick-filter chips and the "your move" banner.
 *
 * ⚠️ A CARD IS THE OLD CHIP: pressing it sets the one "Where it stands" filter (`qcF138.where`), pressing it again
 *    clears it, and the list and Birds-eye both read that filter. The counts are the chips' (lib/qc150 `statCards`).
 * ⚠️ THE WHOLE CARD IS ONE BUTTON (`.qc150-hit`, stretched under the content); the detail link and "Show them" are
 *    their own buttons above it, so a press on either does its own thing and never also toggles the card.
 * ⚠️ THE HEAD IS INSET FROM THE CARD ON THREE SIDES (≈5px), so the card's cream frame shows all round the tint.
 */
import React from "react";
import type { WhereKey } from "../../../lib/qcSummary";
import type { StatCard } from "../../../lib/qc150";
import "./qcv150.css";

/* the head doodles, lifted from the mock's background set: a feather, a plane, a sleeping envelope, a stamp */
const DOODLE: Record<WhereKey, React.ReactNode> = {
  you: <svg className="qc150-dd" viewBox="-24 -30 48 60" aria-hidden="true"><path d="M-6 28 C-3 8 3 -10 14 -27" /><path d="M-4 16 C-17 8 -16 -10 12 -25 M-3 7 C10 2 18 -12 14 -27 M-5 22 l-6 5" /></svg>,
  agent: <svg className="qc150-dd" viewBox="-40 -26 70 52" aria-hidden="true"><path d="M-22 4 L24 -12 L0 22 L-3 8 Z M-3 8 L24 -12" /><path d="M-38 20 C-30 12 -26 22 -18 14" strokeDasharray="2 5" /></svg>,
  quiet: <svg className="qc150-dd" viewBox="-26 -26 52 52" aria-hidden="true"><rect x="-18" y="-6" width="36" height="25" rx="2" /><path d="M-18 -6 L0 8 L18 -6" /><path d="M6 -14 h7 l-7 7 h7 M14 -23 h5 l-5 5 h5" /></svg>,
  closed: <svg className="qc150-dd" viewBox="-26 -26 52 52" aria-hidden="true"><rect x="-15" y="-19" width="30" height="38" rx="1" strokeDasharray="2.4 2.4" /><rect x="-9" y="-13" width="18" height="18" /><path d="M-9 11 h18" /><circle cx="12" cy="13" r="11" strokeOpacity=".6" /></svg>,
};
const SWATCH: Record<WhereKey, string> = { you: "you", agent: "agent", quiet: "quiet", closed: "closed" };

export const QcStatCards150: React.FC<{
  cards: StatCard[] | null;
  where: WhereKey | null;
  /** a card press: set this court's filter, or clear it when it is already set */
  onCard: (k: WhereKey) => void;
  /** a detail link (With the agent, Gone quiet): Birds-eye, filtered to that card */
  onDetail: (k: WhereKey) => void;
  loading: boolean;
}> = ({ cards, where, onCard, onDetail, loading }) => (
  <div className="qc150-cards" data-qc150="cards" aria-busy={loading || undefined}>
    {(cards ?? SKELETON).map((c) => {
      const on = where === c.key;
      const faces = (
        <span className={`qc150-faces qc150-faces--${c.key}`} data-qc150="faces" data-n={c.faces.length} data-more={c.more}>
          {c.faces.map((f) => <span key={f.key} className="qc150-face" title={f.title}>{f.initials}</span>)}
          {c.more > 0 ? <i className="qc150-more" data-qc150="more">+{c.more}</i> : null}
        </span>
      );
      return (
        <div key={c.key} className={`qc150-c qc150-c--${c.key}`} data-qc150="card" data-k={c.key} data-on={on ? "" : undefined}>
          <button type="button" className="qc150-hit" data-qc150="hit" aria-pressed={on} disabled={loading || !cards}
            aria-label={`${c.label}: ${c.count} ${c.count === 1 ? "query" : "queries"}. ${on ? "Showing only these; press to show all" : "Show only these"}`}
            onClick={() => onCard(c.key)} />
          <span className="qc150-h" data-qc150="head">
            <i className={`qc149-sw qc149-sw--${SWATCH[c.key]} qc150-sw`} aria-hidden="true" />
            <b>{c.label}</b>
            {DOODLE[c.key]}
          </span>
          <span className="qc150-n" data-qc150="count">{cards ? c.count : ""}</span>
          {c.key === "you" ? (
            <span className="qc150-yx">
              <span className="qc150-next" data-qc150="next">{c.next ? <><b>Next:</b> {c.next.who} · {c.next.what}</> : cards ? "Nothing is waiting on you." : ""}</span>
              <span className="qc150-go">
                {faces}
                {c.count > 0 ? <button type="button" className="qc150-show" data-qc150="show" disabled={loading} onClick={() => onCard("you")}>Show them →</button> : null}
              </span>
            </span>
          ) : (
            <>
              {faces}
              <span className="qc150-s" data-qc150="detail">{detailLine(c, onDetail)}</span>
            </>
          )}
        </div>
      );
    })}
  </div>
);

function detailLine(c: StatCard, onDetail: (k: WhereKey) => void): React.ReactNode {
  const d = c.detail;
  if (!d) return null;
  if (d.kind === "split") {
    return d.parts.map((p, i) => <React.Fragment key={p.word}>{i ? " · " : ""}<b>{p.n}</b> {p.word}</React.Fragment>);
  }
  const words = d.kind === "due" ? "due this week" : "ready to nudge";
  /* a zero is stated, not linked: a link to an empty Birds-eye goes nowhere */
  if (d.n === 0) return <><b>0</b> {words}</>;
  return (
    <button type="button" className="qc150-link" data-qc150="detail-link" onClick={() => onDetail(c.key)} title="Open in Birds-eye">
      <b>{d.n}</b> {words}
    </button>
  );
}

const SKELETON: StatCard[] = (["you", "agent", "quiet", "closed"] as WhereKey[]).map((k) => ({
  key: k, label: { you: "Your move", agent: "With the agent", quiet: "Gone quiet", closed: "Closed" }[k], count: 0, faces: [], more: 0, next: null, detail: null,
}));
