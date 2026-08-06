/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The settled-desk hero zone (ref design-refs/dashboard-settled-desk.html).
 *
 * Two columns: the greeting and its action row on the left, the to-do card on the right, at
 * `minmax(0,1fr) 400px` with the two tops aligned.
 *
 * ⚠️ THE TO-DO CARD IS ALWAYS ON, and that is what this file replaces. It used to live behind an
 * attention chip that opened a focus slot — a disclosure you had to know to press, hiding the one
 * thing the page exists to tell you. There is no chip, no popover, no drawer and no open/closed
 * state: the card is furniture. `FocusGreeting` and its slot mechanics are retired with it.
 *
 * ⚠️ AND THERE IS NO SUB-HEADING under the greeting — deliberately removed, not lost. The date
 * caption above it already says where you are in the week.
 */
import React from "react";
import { longDate, salutation, weekOfQuerying } from "../../lib/dashboardStats";
import { Query } from "../../types";

const CTA_ICONS = {
  send: <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" aria-hidden="true"><path d="M22 2 11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" /></svg>,
  record: <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" aria-hidden="true"><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></svg>,
  agent: <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><path d="M20 8v6M23 11h-6" /></svg>,
  manuscript: <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>,
};

interface DashboardHeroProps {
  firstName: string;
  queries: Query[];
  /** The to-do card — supplied by Dashboard with its live handlers. */
  todo: React.ReactNode;
  onSendQuery: () => void;
  onRecordResponse: () => void;
  onAddAgent: () => void;
  onAddManuscript: () => void;
}

export const DashboardHero: React.FC<DashboardHeroProps> = ({
  firstName, queries, todo, onSendQuery, onRecordResponse, onAddAgent, onAddManuscript,
}) => {
  const now = new Date();

  return (
    <div className="sa-herozone">
      <div className="sa-hero">
        <div className="sa-hero-datecap">
          <span className="sa-hero-lbl">{longDate(now)}</span>
          <span className="sa-hero-sep" aria-hidden="true" />
          <span className="sa-hero-lbl">{weekOfQuerying(queries, now)} of querying</span>
        </div>
        {/* ⚠️ THE NAME IS BURGUNDY ITALIC (this ref + the pack's baked decisions). It SUPERSEDES
            the v37 lock, which read "plain Playfair, NO italics/colour on the name" — recorded
            rather than quietly overwritten, because that was a decision and this replaces it. */}
        <h1 className="sa-hero-hi">
          {salutation(now)}, <em>{firstName}</em>
        </h1>
        <div className="sa-hero-actions">
          <button type="button" className="sa-hbtn dark" onClick={onSendQuery}>{CTA_ICONS.send}Send query</button>
          <button type="button" className="sa-hbtn" onClick={onRecordResponse}>{CTA_ICONS.record}Record a response</button>
          <button type="button" className="sa-hbtn" onClick={onAddAgent}>{CTA_ICONS.agent}Add agent</button>
          <button type="button" className="sa-hbtn" onClick={onAddManuscript}>{CTA_ICONS.manuscript}Add manuscript</button>
        </div>
      </div>

      <div className="sa-hero-todo">{todo}</div>
    </div>
  );
};
