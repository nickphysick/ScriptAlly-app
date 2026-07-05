/**
 * FormPeek — the Form 11 pair beneath the dashboard panel (design ref:
 * design-refs/landing-v13.html .formstrip.opt-c — the offset-peek arrangement). Log a query
 * (left, full height, upright, soft pink band) beside Add an agent (right, dropped 34px,
 * shorter, 1.2° tilt, sage band). No corner motifs. Both fade downward via CSS mask
 * (solid to 34%, gone by 96%). Static tableau — nothing interactive.
 */

import React from "react";

export const FormPeek: React.FC = () => (
  <div className="mk-formstrip" aria-hidden="true">
    <div className="mk-f11">
      <div className="mk-f11band mk-pink">
        <span className="mk-f11av">MA</span>
        <span>
          <span className="mk-f11pre">Logging a query to</span>
          <div className="mk-f11name">Margaret Atwood</div>
          <div className="mk-f11sub">Pickwick Editorial</div>
        </span>
      </div>
      <div className="mk-f11body">
        <div className="mk-f11lab">Manuscript</div>
        <div className="mk-f11field">The Book of Lost Clockworks<span className="mk-chev">▾</span></div>
        <div className="mk-f11lab">Date sent</div>
        <div className="mk-f11field">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 11h18" />
          </svg>
          5 July 2026
        </div>
        <div className="mk-f11lab">Sent via</div>
        <div className="mk-f11field">Email<span className="mk-chev">▾</span></div>
      </div>
    </div>

    <div className="mk-f11">
      <div className="mk-f11band">
        <span className="mk-f11av">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "#7c3a2a" }}>
            <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
          </svg>
        </span>
        <span>
          <span className="mk-f11pre">Growing your list</span>
          <div className="mk-f11name">Add an agent</div>
          <div className="mk-f11sub">New agent details</div>
        </span>
      </div>
      <div className="mk-f11body">
        <div className="mk-f11lab">Agent name</div>
        <div className="mk-f11field">Eleanor Whitfield</div>
        <div className="mk-f11lab">Agency</div>
        <div className="mk-f11field">Greenfield Literary</div>
        <div className="mk-f11lab">Submission route</div>
        <div className="mk-f11field">QueryManager<span className="mk-chev">▾</span></div>
      </div>
    </div>
  </div>
);
