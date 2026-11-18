/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v62 §5.8 — How it works: the four-row storyboard (what the agent wants to know, what gives them
 * their answer, the things you send, what happens next), drawn as the ref draws it. It names no real letter, version
 * or package. Shown in the "How packages work" pop-up, and on day one in a framed card under the header.
 * The pop-up traps focus, closes on Escape, a click outside or Got it, and gives focus back to the button that opened it.
 */
import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { FINISH_NOTE, HOW_LINE, HOW_TITLE } from "../../../lib/packagesV62";
import { useOverlay } from "../../shell/useOverlay";
import { M62 } from "./Pk62Icons";

const at = (r: number, c: number | string): React.CSSProperties => ({ gridRow: r, gridColumn: c });

export const Pk62Storyboard: React.FC = () => (
  <figure className="k62-sb" role="group" aria-label="What an agent wants to know, what answers it, what you send, and what happens next" data-pk62="storyboard">
    <div className="k62-sb-l" style={{ gridRow: 1 }}><i>1</i><span>What the agent<br />wants to know</span></div>
    <div className="k62-sb-q" style={at(1, 2)}>“Who are you?”</div>
    <div className="k62-sb-q" style={at(1, 3)}>“What’s the book about?”</div>
    <div className="k62-sb-q" style={at(1, 4)}>“Where does it fit?”</div>
    <div className="k62-sb-q" style={at(1, 5)}>“Can you write, and is it for me?”</div>
    <div className="k62-sb-br" aria-hidden="true" style={{ gridRow: 2 }}><i /></div>
    <i className="k62-sb-v" aria-hidden="true" style={at(2, 5)} />
    <div className="k62-sb-l" style={{ gridRow: 3 }}><i>2</i><span>What gives them<br />their answer</span></div>
    <div className="k62-sb-c" style={at(3, "2 / 5")}>
      <span className="k62-disc"><M62 k="mail" /></span><span><b>Your query letter</b><span>one of your letters</span></span>
      <em className="k62-sb-tag"><M62 k="open" />names your comps</em>
    </div>
    <div className="k62-sb-c" style={at(3, 5)}>
      <span className="k62-disc"><M62 k="book" /></span><span><b>Your manuscript sample</b><span>taken from one of your versions</span></span>
    </div>
    <i className="k62-sb-v" aria-hidden="true" style={at(4, "2 / 5")} />
    <i className="k62-sb-v" aria-hidden="true" style={at(4, 5)} />
    <div className="k62-sb-l" style={{ gridRow: 5 }}><i>3</i><span>The things<br />you send</span></div>
    <div className="k62-sb-pk" style={{ gridRow: 5 }}>
      <b>A package</b>
      <span className="k62-sb-s"><M62 k="mail" />Query letter</span>
      <span className="k62-sb-s"><M62 k="book" />Manuscript sample</span>
      <span className="k62-sb-plus" aria-hidden="true">+</span>
      <span className="k62-sb-s k62-opt">anything else they ask for</span>
      <p>Mix them however you like, and make as many as you want. A package is locked once it’s sent.</p>
    </div>
    <i className="k62-sb-v" aria-hidden="true" style={at(6, "2 / 6")} />
    <div className="k62-sb-l" style={{ gridRow: 7 }}><i>4</i><span>What happens<br />next</span></div>
    <div className="k62-sb-n" style={{ gridRow: 7 }}>
      <span className="k62-sb-t">Send it to a few agents</span><M62 k="arrow" />
      <span className="k62-sb-t">See what comes back</span><M62 k="arrow" />
      <span className="k62-sb-t k62-again"><M62 k="loop" />Change one thing, go again</span>
    </div>
  </figure>
);

/** §5.7 day one: one framed card holding the storyboard, under the header and the note. */
export const Pk62DayOne: React.FC = () => (
  <section className="k62-rc k62-first" aria-labelledby="k62-first-h" data-pk62="day-one">
    <div className="k62-rc-in"><div className="k62-first-in">
      <h2 id="k62-first-h">How it works</h2>
      <p className="k62-map-eg">{HOW_LINE}</p>
      <Pk62Storyboard />
      <p className="k62-first-n">{FINISH_NOTE}</p>
    </div></div>
  </section>
);

const How: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const okRef = useRef<HTMLButtonElement | null>(null);
  const { trapTab, scrimClick } = useOverlay(rootRef, { scrimClasses: ["k62-dim"], onScrimClick: onClose });
  useEscapeLayer(true, onClose, ESC_LEVEL.pageModal);
  useEffect(() => { okRef.current?.focus(); }, []);
  return (
    <div className="k62-dim k62-layer" ref={rootRef} tabIndex={-1} onClick={scrimClick} onKeyDown={trapTab} data-pk62="how-layer">
      <div className="k62-how" role="dialog" aria-modal="true" aria-labelledby="k62-howT" aria-describedby="k62-howP" data-pk62="how">
        <h3 id="k62-howT">{HOW_TITLE}</h3>
        <p className="k62-map-eg" id="k62-howP">{HOW_LINE}</p>
        <Pk62Storyboard />
        <div className="k62-how-f"><button type="button" ref={okRef} className="k62-btn k62-pri" data-pk62="how-ok" onClick={onClose}>Got it</button></div>
      </div>
    </div>
  );
};

export const Pk62How: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) =>
  open ? createPortal(<How onClose={onClose} />, document.body) : null;
