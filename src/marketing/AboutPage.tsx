/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * About — the public marketing route at /about, rebuilt 21 Oct (ref claude/about-page-v1.html).
 * Top to bottom: the aim ("We want to get good stories told.") beside the fireside drawing, the
 * skills gap on a navy band, "How will we do it?", three vision bands, the founder's note, and one
 * closing card pointing at the founding-writer offer.
 *
 * ⚠️ FULL-WIDTH BANDS, NOT THE DOCUMENT CARD. Privacy and Terms are documents you consult; this is
 * a page you read once. `DocumentShell` is for the legal tier and this page does not use it.
 *
 * ⚠️ ITS MEASURE IS 1180, NOT THE LANDING'S 1300 — alignment down a page beats matching a number
 * across two.
 *
 * ⚠️ THE SIGN-OFF FOLLOWS `IdentityLine`'s LAW WITHOUT IMPORTING IT: the hairline is its OWN
 * element, never a border or a pseudo-element on either text. The component itself is not reused
 * because it takes an `AgentLike` and pulls `lib/agentDisplay`, a workspace import the marketing
 * tier states it does not make.
 *
 * Pure presentation over static copy: no Firebase, no stores, no workspace imports.
 */

import React, { useEffect } from "react";
import {
  ABOUT_DOCUMENT_TITLE, ABOUT_STORY_ALT, ABOUT_STATEMENT_LINES,
  ABOUT_GAP_BODY, ABOUT_GAP_HIT, ABOUT_TURN, ABOUT_SECTION_H2, ABOUT_VISIONS,
  ABOUT_PLATES, AboutPlate,
  ABOUT_NOTE_EYEBROW, ABOUT_NOTE_HEADING, ABOUT_NOTE_BODY, ABOUT_NOTE_SIGNATURE,
  ABOUT_FOUNDER_NAME, ABOUT_FOUNDER_ROLE,
  ABOUT_CLOSE_HEADING, ABOUT_CLOSE_BODY, ABOUT_CLOSE_CTA, ABOUT_CLOSE_LINK,
} from "./aboutCopy";
import { Runs } from "./CopyRuns";

/**
 * The hero drawing's own facts. The version is the first eight hex digits of the file's md5 and
 * rides the URL: nothing under `public/` is fingerprinted by the build.
 */
const STORY = { src: "/images/about-story.png", version: "a35cb880", width: 1000, height: 1000 };

/**
 * An illustration slot awaiting the illustrator: a brush wash at the finished drawing's ratio, so
 * the page keeps its shape when the art drops in, and a caption naming the slot. The brief rides
 * `data-brief` so the copy file stays the one place it is written. When a drawing arrives, the
 * slot becomes an <img> with `ABOUT_PLATES[slot].alt` at the same ratio.
 */
const PlateSlot: React.FC<{ plate: AboutPlate; className?: string }> = ({ plate, className }) => (
  <div
    className={"mk-aplate mk-aplate--" + plate.slot + (className ? " " + className : "")}
    role="img"
    aria-label={"Illustration placeholder: " + plate.alt}
    data-illo={plate.slot}
    data-brief={plate.brief}
  >
    <span className="mk-aplatewash" aria-hidden="true" />
    <span className="mk-aplatetag">{plate.caption}</span>
  </div>
);

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
        {/* ⚠️ HERO v2 (21 Oct, Nick's pick of three): the aim in large type beside the drawing,
            then the skills-gap argument on its own navy band. The three statement lines are set
            explicitly so "told." can never be left alone on a line at desktop widths. */}
        <section className="mk-ahero">
          <div className="mk-aherocol">
            <h1 className="mk-ast">
              {ABOUT_STATEMENT_LINES.map((l) => <span className="mk-astl" key={l}>{l}</span>)}
            </h1>
          </div>
          <img className="mk-aheroart" src={STORY.src + "?v=" + STORY.version} alt={ABOUT_STORY_ALT}
               width={STORY.width} height={STORY.height} />
        </section>
        <section className="mk-agap" aria-label="The problem">
          <div className="mk-agapinner">
            <p className="mk-agapbody">{ABOUT_GAP_BODY}</p>
            <div className="mk-agapright">
              <p className="mk-agaphit">{ABOUT_GAP_HIT}</p>
              <p className="mk-agapturn">{ABOUT_TURN}</p>
            </div>
          </div>
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
            <PlateSlot plate={ABOUT_PLATES[vision.key]} />
            <div className="mk-bandcopy">
              <div className="mk-anum">{vision.eyebrow}</div>
              <h2>{vision.heading}</h2>
              <p><Runs runs={vision.body} onNavigate={onNavigate} /></p>
            </div>
          </section>
        ))}

        {/* ⚠️ THE FOUNDER'S NOTE REPLACES THE ONE-LINE SIGN-OFF. A page whose whole argument is
            "a person built this for people like you" ended on a sentence about that person in
            the third person. It is a letter now, signed. */}
        <section className="mk-note" aria-labelledby="mk-note-h">
          <PlateSlot plate={ABOUT_PLATES.founder} className="mk-noteart" />
          <div className="mk-notecol">
            <p className="mk-notekick">{ABOUT_NOTE_EYEBROW}</p>
            <h2 id="mk-note-h" className="mk-noteh">{ABOUT_NOTE_HEADING}</h2>
            {ABOUT_NOTE_BODY.map((para, i) => (
              <p className="mk-notep" key={i}><Runs runs={para} onNavigate={onNavigate} /></p>
            ))}
            <p className="mk-notesig" aria-hidden="true">{ABOUT_NOTE_SIGNATURE}</p>
            <div className="mk-signoff">
              <span className="mk-signname">{ABOUT_FOUNDER_NAME}</span>
              <span className="mk-signrule" aria-hidden="true" />
              <span className="mk-signrole">{ABOUT_FOUNDER_ROLE}</span>
            </div>
          </div>
        </section>

        <section className="mk-aclose" aria-labelledby="mk-aclose-h">
          <div className="mk-aclosecard">
            <h2 id="mk-aclose-h" className="mk-acloseh">{ABOUT_CLOSE_HEADING}</h2>
            <p className="mk-aclosep">{ABOUT_CLOSE_BODY}</p>
            <div className="mk-acloseacts">
              <button type="button" className="mk-btn mk-btn--navy" onClick={() => onNavigate("founders")}>
                {ABOUT_CLOSE_CTA}
              </button>
              <button type="button" className="mk-acloselink" onClick={() => onNavigate("pricing")}>
                {ABOUT_CLOSE_LINK}
              </button>
            </div>
          </div>
        </section>
      </main>

    </div>
  );
};
