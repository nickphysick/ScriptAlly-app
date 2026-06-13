/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Centred hero (wide). Copy block is centred and anchored just below the floating nav
 * via bounded padding (no full-viewport centring); the ruled-paper effect is bound to
 * the copy block (.hero-copy::before, radial-masked) so it sits behind the headline.
 */
import React from "react";

interface HeroProps {
  onStart: () => void;
  onHowItWorks: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onStart, onHowItWorks }) => (
  <header className="hero">
    <div className="hero-grid">
      <div className="hero-copy">
        <div className="hero-eye">The literary querying companion</div>
        <h1 className="hero-h1">A calmer place to <em>query.</em></h1>
        <p className="hero-sub">
          Track every submission, every agent, every nudge — in one warm, literary workspace built for
          novelists. No more colour-coded spreadsheet dread.
        </p>
        <div className="hero-cta">
          <button type="button" className="btn-primary" onClick={onStart}>Start free</button>
          <button type="button" className="btn-ghost" onClick={onHowItWorks}>See how it works ↓</button>
        </div>
      </div>

      <div className="hero-visual">
        <span className="hero-chip"><i /> Full requested · 2h ago</span>
        <div className="hero-card">
          <div className="hc-band">
            <div className="hc-av">MH</div>
            <div>
              <div className="t1">Querying · The Book of Lost Clockworks</div>
              <div className="t2">Margaret Holloway</div>
            </div>
          </div>
          <div className="hc-body">
            <div className="hc-row"><span className="l">Pemberton Literary</span><span className="hc-pill burg">Full out</span></div>
            <div className="hc-row"><span className="l">Aldous Literary</span><span className="hc-pill gold">Partial requested</span></div>
            <div className="hc-row"><span className="l">Vellum &amp; Vane</span><span className="hc-pill sage">Queried · 2d</span></div>
            <div className="hc-row"><span className="l">Harlow &amp; Finch</span><span className="hc-pill sage">Queried · 6d</span></div>
          </div>
        </div>
      </div>
    </div>

    <div className="scrollcue"><span>Scroll</span><span className="arr" /></div>
  </header>
);
