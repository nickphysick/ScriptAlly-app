/**
 * DashboardDemo — the hero's contained dashboard reproduction (design ref:
 * design-refs/landing-v13.html, .dashpanel/.drz — values verbatim). A fixed 1180px-wide
 * replica scaled to its container (scale = containerWidth / 1180, transform-origin top-left),
 * cropped just beneath the stat cards (base height 478 unscaled ≈ 298px at the ref's 736px).
 *
 * Pure presentation: static data, no Firebase, no stores, no workspace imports. Everything
 * the two-act demo animates in Phase 4 is already here — the split grid (.mk-split), the
 * collapsible stats row, the 2×2 minis, the mix-lens popup and the cursor — driven then by
 * refs this component owns.
 */

import React, { useLayoutEffect, useRef, useState } from "react";

export const REPLICA_WIDTH = 1180;
export const REPLICA_HEIGHT = 478;

export const DashboardDemo: React.FC = () => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.623); // the ref's desktop value; corrected on measure

  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setScale(w / REPLICA_WIDTH);
    };
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    // Fallback for environments that starve ResizeObserver callbacks (headless previews).
    window.addEventListener("resize", measure);
    return () => { ro?.disconnect(); window.removeEventListener("resize", measure); };
  }, []);

  return (
    <div className="mk-dashpanel" ref={panelRef} style={{ height: Math.round(REPLICA_HEIGHT * scale) }}>
      <div className="mk-drz" style={{ transform: `scale(${scale})` }}>
        {/* replica top bar */}
        <div className="mk-dzbar">
          <span className="mk-dzbrand">
            <span className="mk-monogram">S</span>
            <span className="mk-wordmark">ScriptAlly</span>
          </span>
          <span className="mk-dzsearch">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
            </svg>
            Search agents, queries&hellip;
            <kbd>&#8984;K</kbd>
          </span>
          <span className="mk-dzuser"><span className="mk-monoinit">W</span>Writer</span>
        </div>

        {/* the greeting zone — the grid track is the split state machine */}
        <div className="mk-dzwrap">
          <div className="mk-dzmain">
            <div className="mk-dzeyebrow">Sunday 5 July &middot; Week nine of querying</div>
            <div className="mk-dzhi">Good morning, Writer</div>
            <div className="mk-dzchip"><span className="mk-dot" />3 things need your attention</div>
            <div className="mk-dzctas">
              <span className="mk-dzbtn">Send query</span>
              <span className="mk-dzbtn">Record a response</span>
              <span className="mk-dzbtn">Add agent</span>
              <span className="mk-dzbtn">Add manuscript</span>
            </div>
            <div className="mk-dzminis">
              <div className="mk-dzmini"><div className="mk-dzcap">Queries sent</div><div className="mk-n">23</div><div className="mk-p">+3 this week</div></div>
              <div className="mk-dzmini"><div className="mk-dzcap">Active queries</div><div className="mk-n">16</div><div className="mk-p">10 awaiting a reply</div></div>
              <div className="mk-dzmini"><div className="mk-dzcap">Agents</div><div className="mk-n">16</div><div className="mk-p">2 idle</div></div>
              <div className="mk-dzmini"><div className="mk-dzcap">Responses</div><div className="mk-n">11</div><div className="mk-p">55% rate</div></div>
            </div>
          </div>
          <div className="mk-dzside">
            <div className="mk-dztodo">
              <div className="mk-todoband"><span className="mk-dot" /><h4>To-do list</h4><span className="mk-x">&times;</span></div>
              <div className="mk-trows">
                <div className="mk-trow">
                  <span className="mk-chip">Pages</span>
                  <div className="mk-tinfo"><div className="mk-tn">Priya Raman</div><div className="mk-td">Time to send your <b>partial manuscript</b></div></div>
                  <button type="button" className="mk-sbtn" tabIndex={-1}>Mark sent</button>
                </div>
                <div className="mk-trow">
                  <span className="mk-chip">Nudge</span>
                  <div className="mk-tinfo"><div className="mk-tn">Fenella Str</div><div className="mk-td">Response expected <b>5 days ago</b></div></div>
                  <button type="button" className="mk-sbtn" tabIndex={-1}>Nudge</button>
                </div>
                <div className="mk-trow">
                  <span className="mk-chip">Offer</span>
                  <div className="mk-tinfo"><div className="mk-tn">Tom Ellery</div><div className="mk-td"><b>An offer to weigh</b></div></div>
                  <button type="button" className="mk-sbtn" tabIndex={-1}>Review</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* the four stat cards — exact data and visuals per the ref */}
        <div className="mk-dzstats">
          <div className="mk-dzstat">
            <div className="mk-dzcap">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M21 3L10 14" /><path d="M21 3l-7 18-4-7-7-4 18-7z" /></svg>
              Queries sent
            </div>
            <div className="mk-dznum">23</div><div className="mk-dzsub">+3 this week</div>
            <div className="mk-mbar">
              <i style={{ "--h": "26%" } as React.CSSProperties} /><i style={{ "--h": "52%" } as React.CSSProperties} />
              <i style={{ "--h": "38%" } as React.CSSProperties} /><i style={{ "--h": "18%" } as React.CSSProperties} />
              <i style={{ "--h": "64%" } as React.CSSProperties} /><i style={{ "--h": "44%" } as React.CSSProperties} />
              <i style={{ "--h": "34%" } as React.CSSProperties} /><i className="mk-hot" style={{ "--h": "82%" } as React.CSSProperties} />
            </div>
          </div>
          <div className="mk-dzstat">
            <div className="mk-dzcap">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M6 2h12M6 22h12M8 2v4l4 4 4-4V2M8 22v-4l4-4 4 4v4" /></svg>
              Active queries
            </div>
            <div className="mk-dznum">16</div><div className="mk-dzsub">10 awaiting a reply</div>
            <svg className="mk-spark" width="100%" height="26" viewBox="0 0 220 26" preserveAspectRatio="none">
              <path d="M0,20 L30,19 L60,16 L90,17 L120,12 L150,10 L180,6 L214,3 L214,26 L0,26 Z" fill="rgba(124,58,42,0.14)" stroke="none" />
              <path d="M0,20 L30,19 L60,16 L90,17 L120,12 L150,10 L180,6 L214,3" fill="none" stroke="#7c3a2a" strokeWidth={2} />
              <circle cx="214" cy="3" r="3" fill="#7c3a2a" stroke="none" />
            </svg>
          </div>
          <div className="mk-dzstat">
            <div className="mk-dzcap">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><circle cx="17.5" cy="9" r="2.5" /><path d="M16 14.5c3 .3 5.5 2.3 5.5 5.5" /></svg>
              Agents
            </div>
            <div className="mk-dznum">16</div><div className="mk-dzsub">2 idle</div>
            <div className="mk-dzpeople">
              {Array.from({ length: 14 }, (_, i) => <i key={i} />)}
              <i className="mk-idle" /><i className="mk-idle" />
            </div>
          </div>
          <div className="mk-dzstat">
            <div className="mk-dzcap">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7l-10 6L2 7" /></svg>
              Responses received
            </div>
            <div className="mk-dznum">11</div><div className="mk-dzsub">55% rate</div>
            <div className="mk-dzslider"><span className="mk-f" /><span className="mk-k" /></div>
          </div>
        </div>

        {/* mix-lens popup + cursor — idle until the Phase 4 timeline drives them */}
        <div className="mk-mixp">
          <div className="mk-ph2"><span className="mk-cap">Right now</span><span className="mk-val">16 active</span></div>
          <div className="mk-mrow"><span className="mk-mi">→</span><span className="mk-ml">Queried</span><span className="mk-mv">8</span></div>
          <div className="mk-mrow"><span className="mk-mi">‹</span><span className="mk-ml">Partial requested</span><span className="mk-mv">3</span></div>
          <div className="mk-mrow"><span className="mk-mi">›</span><span className="mk-ml">Partial sent</span><span className="mk-mv">1</span></div>
          <div className="mk-mrow"><span className="mk-mi">«</span><span className="mk-ml">Full requested</span><span className="mk-mv">2</span></div>
          <div className="mk-mrow"><span className="mk-mi">»</span><span className="mk-ml">Full sent</span><span className="mk-mv">1</span></div>
          <div className="mk-mrow"><span className="mk-mi">✎</span><span className="mk-ml">Revise &amp; resubmit</span><span className="mk-mv">1</span></div>
          <div className="mk-pf2">10 with agents &middot; 6 waiting on you</div>
        </div>
        <svg className="mk-cursor" width="17" height="20" viewBox="0 0 17 20" aria-hidden="true">
          <path d="M1 1l6.5 16 2.3-6.6 6.9-1.7z" fill="#2d2016" stroke="#fffefb" strokeWidth={1.4} />
        </svg>
      </div>
    </div>
  );
};
