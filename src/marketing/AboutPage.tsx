/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * About — the public marketing route at /about. The mission hero and the centred section header
 * come from design-refs/scriptally-about-v1.html; the vision bands, commitments and sign-off below
 * them are unchanged from design-refs/scriptally-about.html.
 *
 * ⚠️ THE MISSION HERO IS NOT A `.mk-band`. It is a stretch grid carrying a statement beside a
 * plate, the same rhythm as the landing hero; the bands below it are centre-aligned rows. Making
 * it a band again would centre the copy against a 340px plate and lose the escalation the three
 * paragraphs are built on.
 *
 * ⚠️ ITS MEASURE IS THIS PAGE'S 1180, NOT THE LANDING'S 1300. The rhythm is shared; the measure is
 * not. A 1300 hero above 1180 bands would put the page's own left edges 60px apart, and alignment
 * down a page beats matching a number across two.
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
  ABOUT_DOCUMENT_TITLE, ABOUT_MISSION_PRE, ABOUT_MISSION_MAIN,
  ABOUT_GAP_BODY, ABOUT_GAP_HIT, ABOUT_TURN, ABOUT_SECTION_H2, ABOUT_VISIONS,
  ABOUT_COMMITMENTS_EYEBROW, ABOUT_COMMITMENTS,
  ABOUT_FOUNDER_BODY, ABOUT_FOUNDER_NAME, ABOUT_FOUNDER_ROLE,
} from "./aboutCopy";
import { Runs } from "./CopyRuns";
import { MarketingIllustration, CommitmentTick } from "./marketingMarks";
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
        <section className="mk-mission">
          <div className="mk-missioncol">
            {/* One heading, two spans — the lead-in is half a sentence, not a level of its own. */}
            <h1 className="mk-missionline">
              <span className="mk-mission-pre">{ABOUT_MISSION_PRE}</span>
              <span className="mk-mission-main">{ABOUT_MISSION_MAIN}</span>
            </h1>
            <p className="mk-gapbody">{ABOUT_GAP_BODY}</p>
            <p className="mk-gaphit">{ABOUT_GAP_HIT}</p>
            <p className="mk-missionturn">{ABOUT_TURN}</p>
          </div>
          <MarketingIllustration slot="mission" />
        </section>

        {/* ⚠️ THE HEADER OWNS THE BREAK, WHICH IS WHY THE FIRST BAND GIVES ONE UP. A centred
            heading with a rule under it, sitting directly on top of a band's own top hairline,
            reads as two separators arguing. The band's hairline comes from `.mk-band + .mk-band`,
            so putting this section between the hero and the first band removes it structurally;
            `--first` only has to tighten the padding the hairline used to justify. */}
        <section className="mk-sechead">
          <h2>{ABOUT_SECTION_H2}</h2>
          <div className="mk-secrule" aria-hidden="true" />
        </section>

        {/* ⚠️ THE SIDE IS SET BY A CLASS, NOT BY DOM ORDER — every vision renders illustration-first
            so the markup is uniform, and the alternating band asks CSS to put the copy first
            instead. Writing it the other way (swap the JSX, no class) reads fine and measures
            wrong: the flip class was a no-op against a DOM order that already agreed with it, and
            all three visions rendered their plate on the left. Measured at 1280, not inferred. */}
        {ABOUT_VISIONS.map((vision, i) => (
          <section
            className={"mk-band" + (i === 0 ? " mk-band--first" : "") + (i % 2 === 1 ? " mk-band--copyfirst" : "")}
            key={vision.key}
          >
            <MarketingIllustration slot={vision.key as "simplify" | "waste" | "time"} />
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
