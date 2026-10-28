/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v26 — the empty-state hero with its three steps, the
 * animation stage, and the How it works dialog. Markup is the ref's (`renderHd` with HD = "a", `.pb-hero`,
 * `#stage`, `#hwm`). ⚠️ v39: the navy header card is DELETED — the populated page opens on the Contact list's
 * header (Pk39Header); every class carries the `p6-` prefix that pk26.generated.css is written against.
 *
 * ⚠️ THE ANIMATION IS THE REF'S `.an` STAGE: three material cards drop into the package's slots, a tick lights for
 *    each, "Ready" appears, the package's label travels to a query's "What went" and the pieces fade in. 10s loop,
 *    paused on hover, the finished frame under prefers-reduced-motion (pk26.css). Its names are illustrative —
 *    it explains the idea, it does not report the writer's data.
 */
import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { PACKAGES_HERO } from "../../../lib/packagesPage";
import { Mark } from "./icons";

const CROWN = "M3 15.5h14M3.5 6.5l3.5 4 3-6 3 6 3.5-4-1.5 9h-10z";

/** The ref's `#stage`. `id` is dropped: the hero and the dialog each draw one. */
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

/** How it works (ref `#hwm`): the animation replayed, with a short explanation. */
/** The ref's `HW`: Your materials → Your package → Log a query, drawn once (decorative; the copy beside it says it). */
const HowDiagram: React.FC = () => (
  <div className="p6-hw2" aria-hidden="true">
    <div className="p6-hw2-lib">
      <p className="p6-hw2-k"><i>1</i>Your materials</p>
      <div className="p6-hw2-m p6-m1"><span className="p6-hw2-ic p6-p"><svg viewBox="0 0 20 20"><rect x="2.5" y="4.5" width="15" height="11" rx="2" /><path d="M3 5.5l7 5.5 7-5.5" /></svg></span><b>Hook-first</b></div>
      <div className="p6-hw2-m p6-m2"><span className="p6-hw2-ic p6-p"><svg viewBox="0 0 20 20"><path d="M5 2.5h7l3 3v12H5z" /><path d="M8 9h5M8 12h5" /></svg></span><b>One-page</b></div>
      <div className="p6-hw2-m p6-m3"><span className="p6-hw2-ic p6-n">1</span><b>Fast-paced opening</b></div>
    </div>
    <div className="p6-hw2-pk">
      <p className="p6-hw2-k"><i>2</i>Your package</p>
      <div className="p6-hw2-card">
        <div className="p6-hw2-h"><b>Standard UK</b><span className="p6-hw2-r">Ready</span></div>
        <div className="p6-hw2-t">
          <div className="p6-hw2-s p6-s1"><small>Query letter</small><span className="p6-hw2-f">Hook-first</span></div>
          <div className="p6-hw2-s p6-s2"><small>Synopsis</small><span className="p6-hw2-f">One-page</span></div>
          <div className="p6-hw2-s p6-s3"><small>Pages from</small><span className="p6-hw2-f">Fast-paced opening</span></div>
        </div>
      </div>
    </div>
    <div className="p6-hw2-q">
      <p className="p6-hw2-k"><i>3</i>Log a query</p>
      <div className="p6-hw2-qc"><span className="p6-hw2-av">JM</span><span><b>Jonathan Marsh</b><small>Package <em>Standard UK</em></small></span></div>
      <div className="p6-hw2-w">Remembered: Hook-first · One-page · Fast-paced opening</div>
    </div>
  </div>
);

export const HowItWorks: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  useEscapeLayer(open, onClose, ESC_LEVEL.pageModal);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { if (open) closeRef.current?.focus(); }, [open]);
  if (!open) return null;
  return createPortal(
    <div className="p6-layer">
      <div className="p6-hwm" data-pk26="hwm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="p6-hwm-c" role="dialog" aria-modal="true" aria-label="How it works">
          <button ref={closeRef} type="button" className="p6-hwm-x" aria-label="Close" onClick={onClose}>✕</button>
          {/* v40: the ref's three-step diagram ("how it works, in the new layout") and its copy, with the lifecycle line */}
          <div className="p6-id-hwmStage"><HowDiagram /></div>
          <div className="p6-hwm-tx">
            <b>How packages work</b>
            <p><b>1</b> Keep your letters, synopses and versions on the left. <b>2</b> Drag one of each into a package on the right. <b>3</b> Pick the package when you log a query, and QueryHawk remembers exactly what that agent got.</p>
            <p className="p6-hw-lc"><span>Draft</span>→<span>Ready</span>→<span>🔒 Out with agents</span> A package locks when its first query goes out, so its results always mean one thing.</p>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
