/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v58 — the header is the book: the manuscript being queried, set like a title page,
 * with the three ways in on the right. No greeting and no figures; the cards state the figures.
 *
 * DASHBOARD v71 (ref design-refs/dashboard-v71/) — the same text on a desk-ink panel, and the three
 * buttons icon-first: Log a query cream with a rust pen, the other two ghosts on the ink. Below
 * 1200px of window the two ghosts fold to icon-only squares; their label stays as `aria-label`.
 */
import React from "react";

export interface Dash58HeaderProps {
  loading: boolean;
  title: string;
  author: string;
  onLog: () => void;
  onRecord: () => void;
  onAddAgent: () => void;
  /** first visit v1: the campaign's eyebrow, "— QUERYING —" (`campaignEyebrow`); null with no manuscript */
  eyebrow: string | null;
  /** first visit v1: no buttons before the first query (the top bar's Log a query is the shell's), all three after */
  buttons: "none" | "all";
}

/*
 * ⚠️ THE EYEBROW IS THE CAMPAIGN'S (first visit v1), NOT THE STORED STATUS: GETTING READY before the first
 * query, QUERYING while any is active, BETWEEN ROUNDS once every one has closed (`campaignEyebrow`). The stored
 * status stays the sidebar switcher's, which still reads it through `switcherStanding`. (v60.1 read the stored
 * status here, so "— READY TO QUERY —" never changed whatever the writer did.)
 * No manuscript, or still loading → a no-break space, so the line keeps its height (a plain space collapses,
 * and the header grew 14px when the data landed: DB59 L1 / DB60 P10 caught it).
 */
/** a manuscript-less account has no book to name; the page's empty state is its own pass */
export const DASH_NO_BOOK = "Your manuscript";

/** The three header buttons' words (v71): each is also the button's accessible name. */
export const HEADER_BUTTONS = { log: "Log a query", record: "Record a response", agent: "Add an agent" } as const;

/* The reference's own icons, 20-unit boxes drawn at 17px with a 1.6 stroke. */
const Pen = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 17l1.2-4.2L13.5 3.5l3 3-9.3 9.3z" /><path d="M11.5 5.5l3 3" /></svg>
);
const Reply = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8 5 3 10l5 5" /><path d="M3 10h8.5c3 0 5.5 2.4 5.5 5.5" /></svg>
);
const PersonPlus = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8" cy="7" r="3.2" /><path d="M2.5 17c.7-3.2 3-4.8 5.5-4.8s4.8 1.6 5.5 4.8M15.5 6v5M13 8.5h5" /></svg>
);

export const Dash58Header: React.FC<Dash58HeaderProps> = ({ loading, title, author, onLog, onRecord, onAddAgent, eyebrow, buttons }) => (
  <header className="d58-header d71-head" data-d58="header" data-ms-title={title} data-author={author}>
    <div className="d58-book" data-d58="book">
      <div className="d58-eyebrow" data-d58="eyebrow" data-eyebrow={eyebrow ?? ""}>{loading ? " " : eyebrow || " "}</div>
      {/* the title is the page's h1; while loading it holds its line and says nothing.
          ⚠️ A NO-BREAK SPACE, never a plain one: a block holding only a collapsible space has no line box,
          so the loading header was 56px shorter than the loaded one (DB58/DB59 L1, DB60 P10 caught it). */}
      <h1 className={`d58-title${loading ? " d58-sk" : ""}`} data-d58="title" data-page-title="">{loading ? "\u00a0" : title || DASH_NO_BOOK}</h1>
      {(loading || author) && (
        <p className="d58-byline" data-d58="byline-row">
          <span className={loading ? "d58-sk" : undefined} data-d58="byline">{loading ? "\u00a0" : `by ${author}`}</span>
        </p>
      )}
    </div>
    <div className="d58-btns" data-d58="buttons" data-set={buttons}>
      {buttons === "all" && <>
      <button type="button" className="d71-hb d71-hb--pri" data-d58="btn-log" aria-label={HEADER_BUTTONS.log} onClick={onLog}><Pen /><span className="d71-hbl">{HEADER_BUTTONS.log}</span></button>
      <button type="button" className="d71-hb" data-d58="btn-record" aria-label={HEADER_BUTTONS.record} onClick={onRecord}><Reply /><span className="d71-hbl">{HEADER_BUTTONS.record}</span></button>
      <button type="button" className="d71-hb" data-d58="btn-agent" aria-label={HEADER_BUTTONS.agent} onClick={onAddAgent}><PersonPlus /><span className="d71-hbl">{HEADER_BUTTONS.agent}</span></button>
      </>}
    </div>
  </header>
);
