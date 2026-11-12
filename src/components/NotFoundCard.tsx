/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "We can't find that page." — the app's not-found screen (non-workspace v1, Phase 1; ref: design-refs/getting-in-v1.html,
 * screen 6). Shown for an unknown in-app address and for a Help article that is not published (Phase 7).
 *
 * Built from existing primitives: `.sp-card` (primitives.css), `.ph-primary` / `.ph-secondary` (pageHeader.css), the
 * Contact list's scout drawing. The ref's "Search QueryHawk" button is left out: the app has no global search to open.
 *
 * ⚠️ SIGNED OUT (Phase 7: a Help article that is not published, read in the public shell), the heading and body are the
 *    same and the actions are not: the Dashboard, Queries and Agents are behind sign-in and the feedback pop-up is only
 *    mounted in the app shell, so `publicShell` offers the Help centre, the home page and the Contact page instead.
 */
import React from "react";
import { openFeedback } from "../lib/feedbackStore";
import "./notFound.css";

export const NOT_FOUND = {
  heading: "We can't find that page.",
  body: "The address may be mistyped, or the page has moved. Nothing of yours is missing.",
  home: "Go to your Dashboard",
  queries: "Queries",
  agents: "Agents",
  broken: "Tell us a link is broken",
  /* signed out (Phase 7) */
  helpHome: "Go to the Help centre",
  siteHome: "QueryHawk home",
} as const;

export const SCOUT_ART = { src: "/images/contact-list-scout.webp", width: 160, height: 160 };

/** `onNavigate` takes an app tab; with `publicShell`, `onGoPath` takes a path (`/help`, `/`, `/contact`). */
export const NotFoundCard: React.FC<{ onNavigate: (tab: string) => void; publicShell?: boolean; onGoPath?: (path: string) => void }> = ({ onNavigate, publicShell, onGoPath }) => (
  <div className="nf-wrap" data-page="not-found">
    <section className="sp-card nf-card" role="region" aria-labelledby="nf-h">
      <img className="nf-art" src={SCOUT_ART.src} width={SCOUT_ART.width} height={SCOUT_ART.height} alt="" />
      <div>
        <h1 id="nf-h" className="nf-h">{NOT_FOUND.heading}</h1>
        <p className="nf-lede">{NOT_FOUND.body}</p>
        {publicShell ? (
          <>
            <div className="nf-acts">
              <button type="button" className="ph-primary" onClick={() => onGoPath?.("/help")}>{NOT_FOUND.helpHome}</button>
            </div>
            <ul className="nf-links">
              <li><button type="button" className="nf-lnk" onClick={() => onGoPath?.("/")}>{NOT_FOUND.siteHome}</button></li>
              <li><button type="button" className="nf-lnk" onClick={() => onGoPath?.("/contact")}>{NOT_FOUND.broken}</button></li>
            </ul>
          </>
        ) : (
          <>
            <div className="nf-acts">
              <button type="button" className="ph-primary" onClick={() => onNavigate("dashboard")}>{NOT_FOUND.home}</button>
            </div>
            <ul className="nf-links">
              <li><button type="button" className="nf-lnk" onClick={() => onNavigate("queries")}>{NOT_FOUND.queries}</button></li>
              <li><button type="button" className="nf-lnk" onClick={() => onNavigate("agents")}>{NOT_FOUND.agents}</button></li>
              <li><button type="button" className="nf-lnk" onClick={() => openFeedback()}>{NOT_FOUND.broken}</button></li>
            </ul>
          </>
        )}
      </div>
    </section>
  </div>
);
