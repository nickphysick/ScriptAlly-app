/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * LightHeader — the app's populated-page header (the Analytics / Query Centre "light" header, `.lh` in
 * design-refs/analytics-v24 and design-refs/comps-v28): on the page colour, an eyebrow, a large typewriter title, a
 * "for {book}" by-line between two short rules, the buttons, an optional line under them, and ONE white card on
 * the right. Its pair for a page with nothing yet is `EmptyPanel`.
 *
 * ⚠️ LIFTED FROM PAGE-LOCAL COPIES (comps v28 §0.1). Analytics' `A21Header`, the Query Centre's `QcHeader138` and the
 *    Contact list's `ContactLightHeader` each draw this header themselves; Comparable titles is the first page to
 *    use the shared part. Its values are A21Header's (a21.css), which the comps v28 mock was built on. The three
 *    page-local copies are candidates to move onto it, page by page, each proved unchanged by its own header locks.
 * ⚠️ lib/brand.tsx FORCES h1–h3 AND BARE SPANS AT RUNTIME: every face here is stated with two classes and
 *    `!important`, and child spans inherit.
 * ⚠️ DESKTOP VALUES ONLY ABOVE 760px; the phone gets a stacked header from the same markup.
 */
import React from "react";
import "./lightHeader.css";

export interface LightRow {
  key: string;
  count: number;
  label: string;
  swatch: string;
  /** a pressable row is a toggle (`aria-pressed`); an inert one is a list item */
  pressed?: boolean;
  onPress?: () => void;
}

/** The card's left half: a segmented bar of the non-zero rows, then every row. */
export const LightCardRows: React.FC<{ rows: LightRow[] | null; label: string; loading?: boolean }> = ({ rows, label, loading }) => {
  const all = rows ?? [];
  const bar = all.filter((r) => r.count > 0);
  return (
    <div className="slh-c1" data-slh="rows" role="group" aria-label={label}>
      <div className="slh-bar" data-slh="bar" aria-hidden="true">
        {loading || !bar.length
          ? <i style={{ flex: "1 1 0", background: "rgba(28, 19, 15, 0.07)" }} />
          : bar.map((r) => <i key={r.key} data-slh="seg" data-k={r.key} style={{ flex: `${r.count} 1 0`, background: r.swatch }} />)}
      </div>
      <ul>
        {(loading ? [] : all).map((r) => {
          const inner = (
            <>
              <span className="slh-sq" data-slh="sw" style={{ background: r.swatch }} aria-hidden="true" />
              <b data-slh="n">{r.count}</b>
              <span data-slh="label">{r.label}</span>
            </>
          );
          return r.onPress ? (
            <li key={r.key} data-slh="row" data-k={r.key}>
              <button type="button" className="slh-rowbtn" aria-pressed={!!r.pressed} onClick={r.onPress}>{inner}</button>
            </li>
          ) : (
            <li key={r.key} data-slh="row" data-k={r.key}>{inner}</li>
          );
        })}
      </ul>
    </div>
  );
};

const RING_R = 34, RING_C = 2 * Math.PI * RING_R;

/** The card's right half: an 84px ring, a label and a sub-line. Pressable when `onPress` is given. */
export const LightCardRing: React.FC<{
  pct: number | null; label: string; sub: string; ariaLabel: string; onPress?: () => void; loading?: boolean;
}> = ({ pct, label, sub, ariaLabel, onPress, loading }) => {
  const arc = pct === null || loading ? 0 : (Math.max(0, Math.min(100, pct)) / 100) * RING_C;
  const body = (
    <>
      <span className="slh-ring" data-slh="ring">
        <svg viewBox="0 0 84 84" aria-hidden="true">
          <circle cx="42" cy="42" r={RING_R} fill="none" stroke="#e5ded3" strokeWidth="9" />
          {arc > 0 ? <circle cx="42" cy="42" r={RING_R} fill="none" stroke="#2a3a52" strokeWidth="9" data-slh="ring-arc"
            strokeDasharray={`${arc.toFixed(2)} ${RING_C.toFixed(2)}`} transform="rotate(-90 42 42)" /> : null}
        </svg>
        <b data-slh="ring-pct">{loading ? "" : <>{pct ?? 0}<small>%</small></>}</b>
      </span>
      <span className="slh-rl" data-slh="ring-label">{label}</span>
      <span className="slh-rs" data-slh="ring-sub">{loading ? "" : sub}</span>
    </>
  );
  return onPress
    ? <button type="button" className="slh-c2" data-slh="ring-panel" onClick={onPress} disabled={loading} aria-label={ariaLabel}>{body}</button>
    : <div className="slh-c2" data-slh="ring-panel" aria-label={ariaLabel}>{body}</div>;
};

export const LightHeader: React.FC<{
  /** "— Comparable titles —" */
  eyebrow: string;
  /** the title's visible content (a number inside it is the caller's `<b>`) */
  title: React.ReactNode;
  /** what a screen reader reads for the title */
  titleLabel: string;
  /** the book the page is about; null reads "your book" */
  book: string | null;
  acts: React.ReactNode;
  /** a line under the buttons (a link, a note) */
  extra?: React.ReactNode;
  card: React.ReactNode;
  loading?: boolean;
  className?: string;
  attrs?: Record<string, string | undefined>;
}> = ({ eyebrow, title, titleLabel, book, acts, extra, card, loading, className, attrs }) => (
  <header className={`slh${className ? ` ${className}` : ""}`} data-slh="header" data-own-header="" data-loading={loading ? "" : undefined} aria-busy={loading || undefined} {...attrs}>
    <div className="slh-row" data-slh="header-row">
      <div className="slh-tb" data-slh="title-block">
        <p className="slh-k" data-slh="eyebrow">{eyebrow}</p>
        <h1 className="slh-h1" data-page-title="" data-slh="title" tabIndex={-1} aria-label={titleLabel}>
          <span aria-hidden="true">{title}</span>
        </h1>
        <p className="slh-by" data-slh="byline"><i aria-hidden="true" /><em>for</em> {book ?? "your book"}<i aria-hidden="true" /></p>
        <div className="slh-b" data-slh="acts">{acts}</div>
        {extra}
      </div>
      <div className="slh-card" data-slh="card">{card}</div>
    </div>
  </header>
);
