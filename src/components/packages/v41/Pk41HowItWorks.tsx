/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v41 Part H (screens 08–12) — How it works, rewritten for this page. REPLACES Pk39HowItWorks
 * (deleted), whose copy described the labels row, the materials card and dragging, none of which exist any more.
 *
 * A centred card, 620 wide, in the shared frame: a 250px miniature of the page on its own gradient, "Step n of 5", the
 * title in the typewriter, the copy, then the dots, Back and Next ("Got it" on the last). ✕, Escape and a click outside
 * close it; ← and → step. Each miniature is a small static drawing of that part of the page as it is now. For a
 * founding writer who has put the founding note away, a link under the card brings it back.
 */
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { MIN_SENDS_FOR_CLAIM } from "../../../lib/packagesV38";
import { FOUNDING_SHOW } from "../../../lib/packagesV41";
import { useOverlay } from "../../shell/useOverlay";

/** The five steps, in the pack's words. "4" is the real minimum-answers constant, never a literal. */
export const HOW_STEPS: readonly [string, string][] = [
  ["Make a package", "Press + New package, give it a name and choose an icon and colour you’ll recognise. That look follows it everywhere: the list, the Query Centre and your results."],
  ["Pick each piece", "Choose a package from the list on the left and work down its steps. Start with the version of your book, because it decides which pages go out. Then add a query letter, a synopsis if you want one, and anything agents might ask for. The preview shows exactly what an agent receives."],
  ["Set your current batch", "The strip along the bottom of the header shows what your current batch is going out with. Change it when you start a new batch, and it’s picked for you each time you log a query."],
  ["Log a query with it", "Choose the package as you log a query and QueryHawk records exactly what went. Once a package is out with agents it locks, so what each agent got stays true. To change anything, make a copy."],
  ["See what’s working", `Further down, How your packages are doing ranks your packages by how often agents ask for more, then your versions, letters and synopses. Each one is ranked once ${MIN_SENDS_FOR_CLAIM} agents have answered, so one lucky reply can’t top the list.`],
];

const Tile: React.FC<{ c: string; d: string }> = ({ c, d }) => (
  <span className="p41hw-ic" style={{ ["--c" as string]: c }}><svg viewBox="0 0 20 20" aria-hidden="true"><path d={d} /></svg></span>
);
const CROWN = "M3 15.5h14M3.5 6.5l3.5 4 3-6 3 6 3.5-4-1.5 9h-10z";
const FLAG = "M5 17V3.5M5 4h9l-2 3.5 2 3.5H5";
const FLASK = "M8 3h4M9 3v5l-4.5 8a1 1 0 0 0 .9 1.5h9.2a1 1 0 0 0 .9-1.5L11 8V3";
const LOCK = "M5.5 9h9a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1zM7 9V6.5a3 3 0 0 1 6 0V9";

/** The miniatures (ref `HWT[i][2]`, `mn-` classes, restated as `p41hw-`). */
const MINIS: React.ReactNode[] = [
  <>
    <div className="p41hw-hd"><b>Your packages</b><span className="p41hw-b2">How it works</span><span className="p41hw-b1 p41hw-pulse">+ New package</span></div>
    <div className="p41hw-drw">
      <div className="p41hw-dh"><i /><b>Making a new package</b></div>
      <div className="p41hw-in">US agents</div>
      <div className="p41hw-sw">{["#1d4b63", "#2c6782", "#22595b", "#2e5641", "#3b477a", "#583a5a"].map((c, i) => <i key={c} style={{ background: c }} className={i === 1 ? "p41hw-on" : ""} />)}</div>
    </div>
  </>,
  <div className="p41hw-two">
    <div className="p41hw-stp">{["Version", "Query letter", "Synopsis"].map((t, i) => <div key={t} className={i < 2 ? "p41hw-ok" : ""}><i>{i < 2 ? "✓" : i + 1}</i><b>{t}</b></div>)}</div>
    <div className="p41hw-mail"><div className="p41hw-mh">To <b>Jonathan Marsh</b></div><p>Dear Jonathan,</p><u /><u /><u style={{ width: "60%" }} />
      <div className="p41hw-at"><span>1 Opening pages</span><span className="p41hw-gh">No synopsis</span></div></div>
  </div>,
  <>
    <div className="p41hw-hd p41hw-sm p41hw-hdb"><b>Your packages</b></div>
    <div className="p41hw-bt p41hw-btin"><em>Going out with</em><Tile c="#1d4b63" d={CROWN} /><b>Standard UK</b><span>1 Prologue cut</span><span>Hook-first</span><span className="p41hw-pt">Change</span></div>
  </>,
  <>
    <div className="p41hw-row"><Tile c="#1d4b63" d={CROWN} /><b>Standard UK</b><span className="p41hw-st"><i />Out with agents</span><em>5 sent</em></div>
    <div className="p41hw-lock"><svg viewBox="0 0 20 20" aria-hidden="true"><path d={LOCK} /></svg><span><b>Out with 5 agents.</b> What went stays as it went.</span><span className="p41hw-mk">Make a copy</span></div>
  </>,
  <div className="p41hw-res">
    <div className="p41hw-rh">Doing best</div>
    {([["Standard UK", "#1d4b63", CROWN, 40, "40%"], ["First round", "#4a5466", FLAG, 14, "14%"], ["Dual timeline", "#583a5a", FLASK, 0, `1 of ${MIN_SENDS_FOR_CLAIM}`]] as const).map(([n, c, d, v, l]) => (
      <div className="p41hw-bar" key={n}><Tile c={c} d={d} /><span>{n}</span><i className={v ? "" : "p41hw-ey"}><u style={{ width: `${v ? v * 2 : 25}%` }} /></i><b>{l}</b></div>
    ))}
  </div>,
];

const Guide: React.FC<{ onClose: () => void; onShowFounding?: () => void }> = ({ onClose, onShowFounding }) => {
  const [i, setI] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const nextRef = useRef<HTMLButtonElement | null>(null);
  const { trapTab, scrimClick } = useOverlay(rootRef, { scrimClasses: ["p41-hw"], onScrimClick: onClose });
  useEscapeLayer(true, onClose, ESC_LEVEL.pageModal);
  /* focus goes to Next on open (useOverlay returns it to the opener on close) */
  useEffect(() => { nextRef.current?.focus(); }, []);
  const last = i === HOW_STEPS.length - 1;
  const next = () => (last ? onClose() : setI(i + 1));
  const back = () => setI(Math.max(0, i - 1));
  const [t, p] = HOW_STEPS[i];
  return (
    <div className="p41-hw" ref={rootRef} tabIndex={-1} data-pk41="hw" onClick={scrimClick}
      onKeyDown={(e) => {
        trapTab(e);
        if (e.key === "ArrowRight") { e.preventDefault(); if (!last) setI(i + 1); }
        if (e.key === "ArrowLeft") { e.preventDefault(); back(); }
      }}>
      <div className="p41-hwc" role="dialog" aria-modal="true" aria-labelledby="p41-hwT">
        <button type="button" className="p41-hwx" aria-label="Close" onClick={onClose}>✕</button>
        <div className="p41-hwm" aria-hidden="true"><div key={i} className="p41-hwp" data-pk41="hw-mini" data-step={i + 1}>{MINIS[i]}</div></div>
        <div className="p41-hwb">
          <span className="p41-hwn" data-pk41="hw-step">Step {i + 1} of {HOW_STEPS.length}</span>
          <h3 id="p41-hwT" className="p41-hwt" data-pk41="hw-title">{t}</h3>
          <p>{p}</p>
        </div>
        <div className="p41-hwf">
          <div className="p41-hwd">
            {HOW_STEPS.map((_, n) => <button type="button" key={n} aria-label={`Step ${n + 1}`} aria-current={n === i ? "step" : undefined} onClick={() => setI(n)} />)}
          </div>
          <button type="button" className="p41-hb2" disabled={i === 0} onClick={back}>Back</button>
          <button type="button" ref={nextRef} className="p41-hb1" data-pk41="hw-next" onClick={next}>{last ? "Got it" : "Next"}</button>
        </div>
        {onShowFounding ? <button type="button" className="p41-hwfn" data-pk41="show-founding" onClick={() => { onShowFounding(); onClose(); }}>{FOUNDING_SHOW}</button> : null}
      </div>
    </div>
  );
};

export const Pk41HowItWorks: React.FC<{ open: boolean; onClose: () => void; onShowFounding?: () => void }> = ({ open, onClose, onShowFounding }) =>
  open ? createPortal(<Guide onClose={onClose} onShowFounding={onShowFounding} />, document.body) : null;
