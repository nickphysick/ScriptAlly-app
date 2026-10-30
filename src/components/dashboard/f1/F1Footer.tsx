/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD FEED v1 — THE FOOTER (Part F; ref design-refs/dashboard-feed-v1/, the foot of the right column).
 *
 * The links, Give feedback (the sidebar's own FeedbackDock, through `openFeedback`), and the copyright.
 *
 * ⚠️ A LINK IS HERE ONLY IF ITS PAGE EXISTS. The ref also draws "Cookies" and a "Follow us" menu: there is no cookies
 * page (only a section of the privacy policy, with no anchor), and the app has no social accounts of its own to link
 * to, so both are left out rather than pointing nowhere. "What's new" is the Help Centre's own section (`/help#whats-new`).
 */
import React from "react";
import { useNavigate } from "react-router-dom";
import { openFeedback } from "../../../lib/feedbackStore";

export const FOOTER_LINKS: readonly { label: string; to: string }[] = [
  { label: "Help centre", to: "/help" },
  { label: "What’s new", to: "/help#whats-new" },
  { label: "Pricing", to: "/pricing" },
  { label: "About", to: "/about" },
  { label: "Contact us", to: "/contact" },
  { label: "Privacy", to: "/privacy" },
  { label: "Terms", to: "/terms" },
];
export const FOOTER_COPYRIGHT = "© 2026 QueryHawk";

export const F1Footer: React.FC = () => {
  const navigate = useNavigate();
  return (
    <footer className="df1-foot" data-df1="footer">
      <nav aria-label="QueryHawk">
        {FOOTER_LINKS.map((l) => (
          <a key={l.to} href={l.to} data-df1="foot-link" onClick={(e) => { e.preventDefault(); navigate(l.to); }}>{l.label}</a>
        ))}
      </nav>
      <div className="df1-fsel">
        <button type="button" data-df1="give-feedback" onClick={() => openFeedback()}>Give feedback</button>
      </div>
      <small>{FOOTER_COPYRIGHT}</small>
    </footer>
  );
};
