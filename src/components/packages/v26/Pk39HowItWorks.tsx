/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v39 Part G (design-refs/submission-packages-v39/, screens 12–15) — How it works: a five-step walk
 * through the page as it is, in a centred dialog. On the left, a miniature of the page drawn in markup and CSS (ref
 * `.hw2-pg`, `p9-` prefix, pk39.css), each step outlining its region in rust and fading the rest; on the right, "STEP n
 * OF 5", a heading, a paragraph, the dots, Back and Next ("Got it" on the last step closes).
 *
 * ⚠️ IT REPLACES v40's How it works (the three-step diagram, `.p6-hwm`) on BOTH doors: the header's button and the brand
 *    new page's. The brand-new hero keeps its own illustration (screen 18 still draws it).
 * ⚠️ THE OVERLAY IS THE SHELL'S (`useOverlay`): focus trapped, the page inert and still, focus back to the opener on
 *    close. Escape goes through the app's one escape stack (pageModal), never a second listener. ← and → step through.
 * ⚠️ THE MOTION is the ref's, one animation per step, restarted by remounting the miniature for each step; under
 *    reduced motion every step shows its end state (pk39.css).
 * The copy is verbatim from the pack; the names in the miniature are illustrative and report nothing.
 */
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { useOverlay } from "../../shell/useOverlay";

export const HOW_STEPS: readonly [string, string][] = [
  ["Pick a package, or make one", "Your packages sit in a row at the top. Each has its own icon and colour, so you can spot it at a glance here, in the Query Centre and in your results. Click one to open it below, or press + New."],
  ["Keep your materials in one place", "Your materials holds every query letter, synopsis and version of your book. Write or paste a new one, attach the file, and edit it whenever you like."],
  ["Drag them into the package", "Each package takes one query letter, the pages it sends (from a version of your book) and, if you want one, a synopsis. Add anything else agents ask for under Also sends."],
  ["Pick it when you log a query", "Choose the package as you log a query and every slot fills itself. Once it’s out with agents it locks, so what each agent got stays true. Change it later and the queries already sent keep what they had."],
  ["See what’s working", "Further down, How your packages are doing shows which package gets agents asking for more, then which letter, synopsis and opening inside them does best. Each one ranks once enough agents have answered."],
];

/** The miniature page (ref `#hw2Pg`), for one step. Remounted per step, so each step's animation plays from its start. */
const Miniature: React.FC<{ s: number }> = ({ s }) => (
  <div className="p9-hw2-pg p9-go" data-s={s} aria-hidden="true" data-pk39="hw-page">
    <div className="p9-hw2-hd"><u /><u className="p9-s" /><i /></div>
    <div className="p9-hw2-lb" data-z="1">
      <span className="p9-hw2-k">Your packages</span>
      <div className="p9-hw2-lbs">
        <b style={{ ["--c" as string]: "#1d4b63" }}><i />Standard UK</b>
        <b style={{ ["--c" as string]: "#2c6782" }}><i />US agents</b>
        <b style={{ ["--c" as string]: "#583a5a" }}><i />Dual timeline</b>
        <b className="p9-nw">+ New</b>
      </div>
    </div>
    <div className="p9-hw2-bd">
      <div className="p9-hw2-mt" data-z="2">
        <p>Your materials</p>
        <div className="p9-hw2-tabs"><span className="p9-on">Letters</span><span>Synopses</span><span>Versions</span></div>
        <div className="p9-hw2-mr p9-r1"><i /><span><u /><u className="p9-s" /></span></div>
        <div className="p9-hw2-mr"><i /><span><u /><u className="p9-s" /></span></div>
        <div className="p9-hw2-mr"><i /><span><u /><u className="p9-s" /></span></div>
      </div>
      <div className="p9-hw2-pk" data-z="3">
        <p><i />Standard UK<span className="p9-hw2-lk">🔒</span></p>
        <div className="p9-hw2-sl p9-s1"><em>Query letter</em><span className="p9-hw2-slot"><span className="p9-hw2-it"><i />Hook-first</span></span></div>
        <div className="p9-hw2-sl p9-s2"><em>Synopsis</em><span className="p9-hw2-slot"><span className="p9-hw2-it"><i />One-page</span></span></div>
        <div className="p9-hw2-sl p9-s3"><em>Pages from</em><span className="p9-hw2-slot"><span className="p9-hw2-it p9-v"><i>1</i>Fast-paced opening</span></span></div>
      </div>
      <span className="p9-hw2-fly"><i />Hook-first</span>
    </div>
    <div className="p9-hw2-q" data-z="4"><span className="p9-hw2-av">JM</span><span><b>Jonathan Marsh</b><small>Queried today · with <em>Standard UK</em></small></span></div>
    <div className="p9-hw2-rs" data-z="5">
      <div className="p9-hw2-bn">How your packages are doing</div>
      <div className="p9-hw2-sc"><span><u style={{ width: "72%" }} /></span><span><u style={{ width: "48%" }} /></span><span><u style={{ width: "30%" }} /></span></div>
      <div className="p9-hw2-pc">The pieces inside them</div>
    </div>
  </div>
);

const Guide: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [i, setI] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const nextRef = useRef<HTMLButtonElement | null>(null);
  const { trapTab, scrimClick } = useOverlay(rootRef, { scrimClasses: ["p9-hw2"], onScrimClick: onClose });
  useEscapeLayer(true, onClose, ESC_LEVEL.pageModal);
  /* focus goes to Next on open (useOverlay returns it to the opener on close) */
  useEffect(() => { nextRef.current?.focus(); }, []);
  const last = i === HOW_STEPS.length - 1;
  const next = () => (last ? onClose() : setI(i + 1));
  const back = () => setI(Math.max(0, i - 1));
  const [t, p] = HOW_STEPS[i];
  return (
    <div className="p9-hw2" ref={rootRef} tabIndex={-1} data-pk39="hw" onClick={scrimClick}
      onKeyDown={(e) => {
        trapTab(e);
        if (e.key === "ArrowRight") { e.preventDefault(); if (!last) setI(i + 1); }
        if (e.key === "ArrowLeft") { e.preventDefault(); back(); }
      }}>
      <div className="p9-hw2-c" role="dialog" aria-modal="true" aria-labelledby="p9-hw2T">
        <button type="button" className="p9-hw2-x" aria-label="Close" onClick={onClose}>✕</button>
        <Miniature key={i} s={i + 1} />
        <div className="p9-hw2-tx">
          <p className="p9-hw2-n" data-pk39="hw-step">Step {i + 1} of {HOW_STEPS.length}</p>
          <h2 id="p9-hw2T">{t}</h2>
          <p className="p9-hw2-p">{p}</p>
          <div className="p9-hw2-f">
            <div className="p9-hw2-dots">
              {HOW_STEPS.map((_, n) => <button type="button" key={n} aria-label={`Step ${n + 1}`} aria-current={n === i ? "step" : undefined} onClick={() => setI(n)} />)}
            </div>
            <div className="p9-hw2-b">
              <button type="button" className="p9-hw2-bk" disabled={i === 0} onClick={back}>Back</button>
              <button type="button" ref={nextRef} className="p9-hw2-nx" data-pk39="hw-next" onClick={next}>{last ? "Got it" : "Next"}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Pk39HowItWorks: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) =>
  open ? createPortal(<Guide onClose={onClose} />, document.body) : null;
