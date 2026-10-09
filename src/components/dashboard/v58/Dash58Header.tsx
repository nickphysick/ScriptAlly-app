/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v58 — the header is the book: the manuscript being queried, set like a title page,
 * with the three ways in on the right. No greeting and no figures; the cards state the figures.
 */
import React from "react";

export interface Dash58HeaderProps {
  loading: boolean;
  title: string;
  author: string;
  onLog: () => void;
  onRecord: () => void;
  onAddAgent: () => void;
}

export const DASH_EYEBROW = "— NOW QUERYING —";
/** a manuscript-less account has no book to name; the page's empty state is its own pass */
export const DASH_NO_BOOK = "Your manuscript";

const Arrow = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
    <path d="M3 13 12.5 3.5M9 3.5h3.5V7" />
  </svg>
);

export const Dash58Header: React.FC<Dash58HeaderProps> = ({ loading, title, author, onLog, onRecord, onAddAgent }) => (
  <header className="d58-header" data-d58="header" data-ms-title={title} data-author={author}>
    <div className="d58-book" data-d58="book">
      <div className="d58-eyebrow" data-d58="eyebrow">{DASH_EYEBROW}</div>
      {/* the title is the page's h1; while loading it holds its line and says nothing */}
      <h1 className={`d58-title${loading ? " d58-sk" : ""}`} data-d58="title" data-page-title="">{loading ? " " : title || DASH_NO_BOOK}</h1>
      {(loading || author) && (
        <p className="d58-byline" data-d58="byline-row">
          <span className={loading ? "d58-sk" : undefined} data-d58="byline">{loading ? " " : `by ${author}`}</span>
        </p>
      )}
    </div>
    <div className="d58-btns" data-d58="buttons">
      <button type="button" className="d58-btn d58-btn--pri" data-d58="btn-log" onClick={onLog}><Arrow />Log a query</button>
      <button type="button" className="d58-btn" data-d58="btn-record" onClick={onRecord}>Record a response</button>
      <button type="button" className="d58-btn d58-btn--agent" data-d58="btn-agent" onClick={onAddAgent}>Add an agent</button>
    </div>
  </header>
);
