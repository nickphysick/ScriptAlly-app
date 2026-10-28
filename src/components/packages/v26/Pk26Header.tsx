/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v26 — the empty-state hero with its three steps and its animation stage. Markup is the ref's
 * (`.pb-hero`, `#stage`); every class carries the `p6-` prefix that pk26.generated.css is written against.
 * ⚠️ v39: the navy header card and the How it works dialog (`#hwm`, which replayed this stage) are DELETED — the
 *    populated page opens on the Contact list's header (Pk39Header), and both doors open the five-step guide
 *    (Pk39HowItWorks). The brand-new hero keeps this stage as its illustration (the v39 ref's screen 18 draws it).
 *
 * ⚠️ THE ANIMATION IS THE REF'S `.an` STAGE: three material cards drop into the package's slots, a tick lights for
 *    each, "Ready" appears, the package's label travels to a query's "What went" and the pieces fade in. 10s loop,
 *    paused on hover, the finished frame under prefers-reduced-motion (pk26.css). Its names are illustrative —
 *    it explains the idea, it does not report the writer's data.
 */
import React from "react";
import { Mark } from "./icons";

const CROWN = "M3 15.5h14M3.5 6.5l3.5 4 3-6 3 6 3.5-4-1.5 9h-10z";

/** The ref's `#stage`, the brand-new hero's illustration. */
export const AnimStage: React.FC = () => (
  <div className="p6-pb-stage p6-an" aria-hidden="true">
    <p className="p6-an-k p6-an-k1">Your materials</p>
    <i className="p6-an-g" style={{ left: 32 }} /><i className="p6-an-g" style={{ left: 194 }} /><i className="p6-an-g" style={{ left: 356 }} />
    <div className="p6-an-c p6-an-l"><i className="p6-an-ic p6-m"><Mark k="let" /></i><span><small>Query letter</small><b>Hook-first</b></span></div>
    <div className="p6-an-c p6-an-s"><i className="p6-an-ic p6-m"><Mark k="syn" /></i><span><small>Synopsis</small><b>One-page</b></span></div>
    <div className="p6-an-c p6-an-v"><i className="p6-an-ic p6-n">1</i><span><small>Pages from</small><b>Fast-paced opening</b></span></div>
    <div className="p6-an-p">
      <div className="p6-an-ph"><i className="p6-an-pi"><svg viewBox="0 0 20 20"><path d={CROWN} /></svg></i><b>Standard UK</b><span className="p6-an-t"><i /><i /><i /></span><span className="p6-an-r">Ready</span></div>
      <div className="p6-an-sl"><i /><i /><i /></div>
    </div>
    <div className="p6-an-q"><span className="p6-an-av">JM</span><span className="p6-an-qn"><b>Jonathan Marsh</b><small>Queried today</small></span><span className="p6-an-qw"><small>What went</small><span className="p6-an-qx">Hook-first · One-page · Fast-paced opening</span></span></div>
    <span className="p6-an-chip"><svg viewBox="0 0 20 20"><path d={CROWN} /></svg>Standard UK</span>
  </div>
);

/** The empty state's promise (ref `.pb-hero`): headline over two lines, the lede, three steps, the animation. */
export const Pk26Hero: React.FC<{ onBuild: () => void; onHow: () => void }> = ({ onBuild, onHow }) => (
  <section className="p6-pb-hero" aria-labelledby="p6-pbT" data-pk26="hero" data-own-header="">
    <div className="p6-pb-hero-tx">
      <h1 className="p6-id-pbT p6-pro-h" id="p6-pbT" data-page-title>Bundle it. Send it. Know what went.<span className="p6-hb-tag p6-pro2">Pro</span></h1>
      <p className="p6-pb-lede">Put your query letter, synopsis and pages together in a package. Attach it when you log a query, and QueryHawk remembers what each agent received, for good.</p>
      <ol className="p6-pb-steps">
        <li><span>1</span><b>Add your materials</b><small>Letters, synopses, versions</small></li>
        <li><span>2</span><b>Drag them into a package</b><small>One of each, synopsis optional</small></li>
        <li><span>3</span><b>Pick it when you log a query</b><small>Every slot fills itself</small></li>
      </ol>
      <div className="p6-pb-bt">
        <button type="button" className="p6-hd-p" onClick={onBuild}>Build your first package</button>
        <button type="button" className="p6-hd-s" onClick={onHow}>How it works</button>
      </div>
    </div>
    <AnimStage />
  </section>
);
