/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * About — the public marketing route at /about (ref: design-refs/scriptally-about.html).
 *
 * ⚠️ FULL-WIDTH ALTERNATING BANDS, NOT THE DOCUMENT CARD. Privacy and Terms are documents you
 * consult; this is a page you read once, and the card's reading column would make three short
 * sections look like a contract. The two shapes are deliberately different — `DocumentShell` is
 * for the legal tier and this page does not use it.
 *
 * ⚠️ THE SIGN-OFF FOLLOWS `IdentityLine`'s LAW WITHOUT IMPORTING IT: the hairline is its OWN
 * element, never a border or a pseudo-element on either text, so it holds its position whatever
 * the two labels do. The component itself is not reused because it takes an `AgentLike` and pulls
 * `lib/agentDisplay` — a workspace import the marketing tier states it does not make — and a
 * founder's role is not an agency, however alike the two rows look.
 *
 * Pure presentation over static copy: no Firebase, no stores, no workspace imports.
 */

import React, { useEffect } from "react";
import {
  ABOUT_DOCUMENT_TITLE, ABOUT_HERO_H1, ABOUT_HERO_BODY, ABOUT_VISIONS,
  ABOUT_COMMITMENTS_EYEBROW, ABOUT_COMMITMENTS,
  ABOUT_FOUNDER_BODY, ABOUT_FOUNDER_NAME, ABOUT_FOUNDER_ROLE,
} from "./aboutCopy";
import { Runs } from "./CopyRuns";
import { AboutIllustration, CommitmentTick } from "./marketingMarks";
import { MarketingFooter } from "./MarketingFooter";

export const AboutPage: React.FC<{
  onNavigate: (tab: string, subPageName?: string) => void;
}> = ({ onNavigate }) => {
  useEffect(() => {
    const prev = document.title;
    document.title = ABOUT_DOCUMENT_TITLE;
    return () => { document.title = prev; };
  }, []);

  return (
    <div>
      <main>
        <section className="mk-band">
          <div className="mk-bandcopy">
            <h1>{ABOUT_HERO_H1}</h1>
            <p><Runs runs={ABOUT_HERO_BODY} onNavigate={onNavigate} /></p>
          </div>
          <AboutIllustration slot="hero" />
        </section>

        {/* ⚠️ THE SIDE IS SET BY A CLASS, NOT BY DOM ORDER — every vision renders illustration-first
            so the markup is uniform, and the alternating band asks CSS to put the copy first
            instead. Writing it the other way (swap the JSX, no class) reads fine and measures
            wrong: the flip class was a no-op against a DOM order that already agreed with it, and
            all three visions rendered their plate on the left. Measured at 1280, not inferred. */}
        {ABOUT_VISIONS.map((vision, i) => (
          <section className={"mk-band" + (i % 2 === 1 ? " mk-band--copyfirst" : "")} key={vision.key}>
            <AboutIllustration slot={vision.key as "simplify" | "waste" | "time"} />
            <div className="mk-bandcopy">
              <div className="mk-eyebrow">{vision.eyebrow}</div>
              <h2>{vision.heading}</h2>
              <p><Runs runs={vision.body} onNavigate={onNavigate} /></p>
            </div>
          </section>
        ))}

        <section className="mk-commitstrip">
          <div className="mk-commitinner">
            <div className="mk-eyebrow">{ABOUT_COMMITMENTS_EYEBROW}</div>
            <div className="mk-commitgrid">
              {ABOUT_COMMITMENTS.map((commitment) => (
                <div className="mk-commit" key={commitment.heading}>
                  <CommitmentTick />
                  <strong>{commitment.heading}</strong>
                  <span>{commitment.body}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mk-founder">
          <p><Runs runs={ABOUT_FOUNDER_BODY} onNavigate={onNavigate} /></p>
          <div className="mk-signoff">
            <span className="mk-signname">{ABOUT_FOUNDER_NAME}</span>
            {/* Its own element — see the docblock. A border on either label would drift the moment
                either label's length changed. */}
            <span className="mk-signrule" aria-hidden="true" />
            <span className="mk-signrole">{ABOUT_FOUNDER_ROLE}</span>
          </div>
        </section>
      </main>

      <MarketingFooter onNavigate={onNavigate} />
    </div>
  );
};
