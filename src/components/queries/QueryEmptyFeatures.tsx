/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Query Centre's feature-led empty state (empty-states pack, Phase 2; ref
 * `design-refs/scriptally-empty-states-v3-feature-led.html`, the Query Centre screen).
 *
 * ⚠️ IT REPLACES THE CENTRED CARD RATHER THAN SITTING BESIDE IT. `QueryEmptyCard`'s `first` variant
 * is retired in the same commit — a replacement that is ADDED leaves the original reachable, and
 * this repo has three recorded instances of exactly that (the pkg-lab cascade, the import's two
 * auto-create blocks, the packages band's two ghost cards). The `filtered` variant is untouched and
 * still the answer to a view narrowed to zero.
 *
 * ⚠️ EVERY ILLUSTRATION IS DRAWN MARKUP AT FULL OPACITY, WEARING A DASHED "Example" PILL. This is
 * the OPPOSITE pattern from the dashboard's faded example, and the two are deliberately not made
 * consistent: the dashboard shows you the panel you already have, so it fades; these show you what
 * the page can do, so they are legible. The pill is what stops a legible picture reading as data.
 *
 * ⚠️ THE DOTS ARE THE REAL `StatusDot`, AND THAT IS A LAW RATHER THAN A CONVENIENCE. Every query
 * status in this app renders through that component, and a legend renders the actual component
 * rather than a recreation — which matters most here, on the one surface whose subject IS what the
 * dots mean. It needed no prop, no variant and no conditional to be used, which is the test the
 * pack sets for reuse; the ref's own `.sdot` conic-gradient is therefore not ported.
 *
 * ⚠️ WHAT IS COPIED RATHER THAN REUSED, AND WHY. The card, the list rows, the board stubs and the
 * calendar bars are hand-written here. Each of the real components takes a `Query` (or a derived
 * `CardFacts`) and would have needed an example-shaped input — which is the fabricated-value fault
 * this file exists to avoid — or a new "sample" prop on a shared component. The pack's rule is that
 * shared components must not learn about empty states, so they do not.
 */
import React from "react";
import "./queryEmptyFeatures.css";
import { StatusDot } from "../StatusDot";
import { STATE_TOKEN } from "../../lib/queryCardFacts";
import {
  QCF_AXIS, QCF_BOARD, QCF_CAL, QCF_CARD, QCF_CLOSING, QCF_DEPTH, QCF_EXAMPLE_TAG, QCF_HERO,
  QCF_HERO_NOTES, QCF_LIST, QCF_MOVES, QCF_ROWS, QCF_SWATCHES, QCF_VIEW_ON, QCF_VIEWS,
} from "./queryEmptyCopy";

/** The dashed pill. One component, so no illustration can ship without it. */
const Tag: React.FC = () => <span className="qcf-tag">{QCF_EXAMPLE_TAG}</span>;

/* ── the drawn examples ────────────────────────────────────────────────────────────────────── */

const ExampleCard: React.FC = () => {
  const c = QCF_CARD;
  return (
    <div className="qcf-rc">
      <div className="qcf-rc-head" style={{ background: STATE_TOKEN.you }}>
        <span className="qcf-rc-hp">{c.head}</span>
        <span className="qcf-rc-court">{c.court}</span>
      </div>
      <div className="qcf-rc-bd">
        <div className="qcf-rc-who">
          <span className="qcf-rc-av">{c.initials}</span>
          <span>
            <span className="qcf-rc-nm">{c.name}</span>
            <span className="qcf-rc-ag">{c.agency}</span>
            <span className="qcf-rc-meta">{c.meta}</span>
          </span>
        </div>
        <div className="qcf-rc-sec">
          <span className="qcf-rc-sl">{c.sentLabel}</span>
          <span className="qcf-rc-sv">{c.sentValue}</span>
        </div>
        <div className="qcf-rc-sec">
          <span className="qcf-rc-sl">{c.nextLabel}</span>
          <span className="qcf-rc-sv qcf-sd">
            <StatusDot status={c.status} overrideSize={14} decorative />
            {c.nextValue} <span className="qcf-rc-court">{c.nextCourt}</span>
          </span>
        </div>
      </div>
      <div className="qcf-rc-ft">
        <span className="qcf-b1">{c.primary}</span>
        <span className="qcf-b2">{c.secondary}</span>
      </div>
    </div>
  );
};

const Shades: React.FC = () => (
  <>
    <div className="qcf-swatches">
      {QCF_SWATCHES.map((s) => (
        <div key={s.state} className="qcf-sw" style={{ background: STATE_TOKEN[s.state] }}>
          <b>{s.name}</b>
          <span>{s.gloss}</span>
        </div>
      ))}
    </div>
    <div className="qcf-depth">
      {QCF_DEPTH.map((d) => (
        <div key={d.status}>
          <StatusDot status={d.status} overrideSize={18} decorative />
          {/* the ref breaks these labels over two lines; the newline is in the copy */}
          <span>{d.label}</span>
        </div>
      ))}
    </div>
  </>
);

const Moves: React.FC = () => (
  <div className="qcf-moves">
    {QCF_MOVES.map((m) => (
      <div key={m.who} className="qcf-mv">
        <span className="qcf-mv-l">
          <b className="qcf-sd">
            <StatusDot status={m.status} overrideSize={13} decorative />
            {m.who}
            <span className="qcf-rc-court">{m.court}</span>
          </b>
          <span>{m.line}</span>
        </span>
        <span className={m.primary ? "qcf-b1" : "qcf-b2"}>{m.act}</span>
      </div>
    ))}
  </div>
);

const Views: React.FC = () => (
  <>
    <div className="qcf-views">
      {QCF_VIEWS.map((v) => (
        <span key={v} className={v === QCF_VIEW_ON ? "on" : undefined}>{v}</span>
      ))}
    </div>
    <div className="qcf-twov">
      <div className="qcf-lst">
        {QCF_LIST.map((r) => (
          <div key={r.who}>
            <StatusDot status={r.status} overrideSize={13} decorative />
            <span>{r.who}</span>
            <i>{r.date}</i>
          </div>
        ))}
      </div>
      <div className="qcf-brd">
        {QCF_BOARD.map((col) => (
          <div key={col.state} className="qcf-col">
            {/* ⚠️ THE COUNT IS THE STUBS' OWN LENGTH — see `QCF_BOARD`'s note. */}
            <h5>{col.name} · {col.stubs.length}</h5>
            {col.stubs.map((s) => (
              <div key={s.who} className="qcf-stub" style={{ background: STATE_TOKEN[col.state] }}>
                <b>{s.who}</b>{s.note}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  </>
);

const Wait: React.FC = () => (
  <div className="qcf-tlx">
    <div className="qcf-ax">
      {QCF_AXIS.map((a) => (
        <i key={a.label} className={a.today ? "today" : undefined}>{a.label}</i>
      ))}
    </div>
    {/* the dashed today line — the ref's `.tlx .tl` */}
    <span className="qcf-today" aria-hidden="true" />
    {QCF_CAL.map((c) => (
      <div key={c.who} className="qcf-qc" style={{ left: `${c.left}%`, width: `${c.width}%`, top: c.top }}>
        <div className="qcf-qc-h" style={{ background: STATE_TOKEN[c.state] }}>
          {c.head}<span className="qcf-rc-court">{c.court}</span>
        </div>
        <div className="qcf-qc-b">
          <b>{c.who}</b><em>{c.agency}</em>
          <span>{c.line}<i>{c.note}</i></span>
        </div>
        <span className="qcf-qc-end" aria-hidden="true" />
      </div>
    ))}
  </div>
);

const ILLO: Record<string, React.FC> = {
  shades: Shades, court: Moves, views: Views, wait: Wait,
};

/* ── the page ──────────────────────────────────────────────────────────────────────────────── */

export const QueryEmptyFeatures: React.FC<{
  /** the scoped manuscript's title, for the hero's lede; null renders the book-less sentence */
  manuscriptTitle?: string | null;
  onLog: () => void;
  onImport: () => void;
  logRef?: React.Ref<HTMLButtonElement>;
  templateHref: string;
}> = ({ manuscriptTitle = null, onLog, onImport, logRef, templateHref }) => (
  <div className="qcf">
    {/* ── the hero ── */}
    <section className="qcf-hero">
      <div className="qcf-hero-tx">
        <h2 className="qcf-h2">{QCF_HERO.heading}</h2>
        <p className="qcf-lede">
          {manuscriptTitle
            ? <>{QCF_HERO.ledeBefore}<em>{manuscriptTitle}</em>{QCF_HERO.ledeAfter}</>
            : QCF_HERO.ledeNoBook}
        </p>
        <div className="qcf-acts">
          <button ref={logRef} type="button" className="qcf-cta" onClick={onLog}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
              <path d="M3 11 21 3l-8 18-3-8z" />
            </svg>
            {QCF_HERO.cta}
          </button>
          <span className="qcf-links">
            <button type="button" className="qcf-link" onClick={onImport}>{QCF_HERO.importLink}</button>
            <i aria-hidden="true">·</i>
            <a className="qcf-link" href={templateHref} download>{QCF_HERO.templateLink}</a>
          </span>
        </div>
        <span className="qcf-caveat">{QCF_HERO.caveat}</span>
      </div>
      <div className="qcf-ill qcf-ill--hero">
        <Tag />
        <ExampleCard />
        <div className="qcf-under">
          <span className="qcf-caveat">{QCF_HERO_NOTES.left}</span>
          <span className="qcf-caveat qcf-under-r">{QCF_HERO_NOTES.right}</span>
        </div>
      </div>
    </section>

    {/* ── the four feature rows ── */}
    {QCF_ROWS.map((r) => {
      const Illo = ILLO[r.key];
      return (
        <section key={r.key} className={`qcf-row qcf-row--${r.band}${r.flip ? " qcf-row--flip" : ""}`}>
          <div className="qcf-txt">
            <h3 className="qcf-h3">{r.heading}</h3>
            <p className="qcf-sub">{r.sub}</p>
            <span className="qcf-caveat">{r.caveat}</span>
          </div>
          <div className="qcf-ill">
            <Tag />
            <Illo />
          </div>
        </section>
      );
    })}

    {/* ── the closing ── */}
    <section className="qcf-closing">
      <div>
        <h3 className="qcf-h3 qcf-h3--close">{QCF_CLOSING.heading}</h3>
        <p className="qcf-sub qcf-sub--close">{QCF_CLOSING.sub}</p>
      </div>
      <div className="qcf-acts qcf-acts--close">
        <span className="qcf-links">
          <button type="button" className="qcf-link" onClick={onImport}>{QCF_CLOSING.importLink}</button>
        </span>
        <button type="button" className="qcf-cta" onClick={onLog}>{QCF_CLOSING.cta}</button>
      </div>
    </section>
  </div>
);
