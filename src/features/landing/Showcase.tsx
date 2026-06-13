/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pinned scrollytelling showcase (the page centrepiece). A two-column CSS grid where the
 * left "stage" is sticky and four panels crossfade as their matching chapter crosses the
 * viewport middle. Driven by IntersectionObserver in a cleaned-up effect. A fixed left
 * rail shows progress while the showcase is in view and lets you click to jump.
 *
 * Under prefers-reduced-motion the observers are skipped and the scoped CSS shows every
 * panel statically (the rail is hidden), so nothing animates.
 */
import React, { useEffect, useRef, useState } from "react";

const RAIL = ["Pipeline", "Agents", "Follow-ups", "Your desk"];

const Check: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const PlaneIcon: React.FC<{ size?: number }> = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);
const SearchIcon: React.FC<{ size?: number; sw?: number }> = ({ size = 15, sw = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.5" y2="16.5" />
  </svg>
);
const ClockIcon: React.FC<{ size?: number }> = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15.5 14" />
  </svg>
);
const LayoutIcon: React.FC<{ size?: number }> = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="12" y1="3" x2="12" y2="21" />
  </svg>
);

export const Showcase: React.FC = () => {
  const [active, setActive] = useState(0);
  const [railShow, setRailShow] = useState(false);
  const chapterRefs = useRef<(HTMLDivElement | null)[]>([]);
  const showcaseRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return; // panels are shown statically by CSS; no observers needed

    // Activate the chapter crossing the middle of the viewport.
    const chapterIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const idx = Number((e.target as HTMLElement).dataset.ch);
            if (!Number.isNaN(idx)) setActive(idx);
          }
        });
      },
      { rootMargin: "-48% 0px -48% 0px", threshold: 0 }
    );
    chapterRefs.current.forEach((c) => c && chapterIO.observe(c));

    // Show the rail only while the showcase is in view.
    let railIO: IntersectionObserver | undefined;
    if (showcaseRef.current) {
      railIO = new IntersectionObserver(
        (entries) => entries.forEach((e) => setRailShow(e.isIntersecting)),
        { threshold: 0.05 }
      );
      railIO.observe(showcaseRef.current);
    }

    return () => {
      chapterIO.disconnect();
      railIO?.disconnect();
    };
  }, []);

  const jumpTo = (i: number) => {
    chapterRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <>
      {/* Intro */}
      <section className="intro">
        <div className="eye">How it works</div>
        <h2>
          Everything you scrawled across<br />fifteen spreadsheet tabs — <em>in one calm place.</em>
        </h2>
        <p>Keep scrolling. Each part of the querying life finds its home, one at a time.</p>
      </section>

      {/* Progress rail */}
      <div className={`rail${railShow ? " show" : ""}`}>
        {RAIL.map((label, i) => (
          <button
            key={label}
            type="button"
            className={`rail-item${active === i ? " active" : ""}`}
            onClick={() => jumpTo(i)}
          >
            <span className="rail-dot" />
            <span className="rail-label">{label}</span>
          </button>
        ))}
      </div>

      {/* Pinned showcase */}
      <section className="showcase" id="sa-showcase" ref={showcaseRef}>
        <div className="stage-col">
          <div className="stage">
            {/* Panel 0 — Pipeline */}
            <div className={`stage-panel${active === 0 ? " active" : ""}`}>
              <div className="frame">
                <div className="fr-band">
                  <div className="fr-icon"><PlaneIcon /></div>
                  <div className="fr-ttl"><div className="a">Your pipeline</div><div className="b">From slush pile to signed</div></div>
                </div>
                <div className="fr-body">
                  <div className="pl-track">
                    <div className="pl-line" />
                    <div className="pl-plane"><PlaneIcon size={24} /></div>
                    <div className="pl-stops">
                      <div className="pl-stop"><div className="pl-d q" /><div className="pl-lbl">Queried</div></div>
                      <div className="pl-stop"><div className="pl-d r" /><div className="pl-lbl">Partial</div></div>
                      <div className="pl-stop"><div className="pl-d f" /><div className="pl-lbl">Full out</div></div>
                      <div className="pl-stop"><div className="pl-d o" /><div className="pl-lbl">Offer</div></div>
                    </div>
                  </div>
                  <div className="pl-rows">
                    <div className="pl-row"><div className="nm">M. Holloway<small>queried 14 days ago</small></div><span className="hc-pill burg">Full out</span></div>
                    <div className="pl-row"><div className="nm">J. Pryce<small>queried 6 days ago</small></div><span className="hc-pill gold">Partial requested</span></div>
                    <div className="pl-row"><div className="nm">R. Castellanos<small>queried 2 days ago</small></div><span className="hc-pill sage">Queried</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Panel 1 — Agents */}
            <div className={`stage-panel${active === 1 ? " active" : ""}`}>
              <div className="frame">
                <div className="fr-band">
                  <div className="fr-icon"><SearchIcon /></div>
                  <div className="fr-ttl"><div className="a">Your agents</div><div className="b">Know them before you query</div></div>
                </div>
                <div className="fr-body">
                  <div className="ag-search"><SearchIcon size={13} sw={2} /><span>Search agents — fantasy, literary, MSWL…</span></div>
                  <div className="ag-row"><div className="ag-av">MH</div><div className="ag-meta"><div className="ag-nm">Margaret Holloway</div><div className="ag-agency">Pemberton Literary</div></div><div className="ag-side"><div className="ag-stars">★★★★★</div><span className="ag-tag new">Not yet queried</span></div></div>
                  <div className="ag-row"><div className="ag-av">RC</div><div className="ag-meta"><div className="ag-nm">R. Castellanos</div><div className="ag-agency">Vellum &amp; Vane</div></div><div className="ag-side"><div className="ag-stars">★★★★</div><span className="ag-tag new">Not yet queried</span></div></div>
                  <div className="ag-row"><div className="ag-av">JP</div><div className="ag-meta"><div className="ag-nm">Jonah Pryce</div><div className="ag-agency">Aldous Literary</div></div><div className="ag-side"><div className="ag-stars">★★★★</div><span className="ag-tag done">Queried</span></div></div>
                </div>
              </div>
            </div>

            {/* Panel 2 — Follow-ups */}
            <div className={`stage-panel${active === 2 ? " active" : ""}`}>
              <div className="frame">
                <div className="fr-band">
                  <div className="fr-icon"><ClockIcon /></div>
                  <div className="fr-ttl"><div className="a">Your follow-ups</div><div className="b">Never lose a nudge</div></div>
                </div>
                <div className="fr-body">
                  <div className="nd-row"><div className="nd-clock over"><ClockIcon /></div><div className="nd-meta"><div className="nd-nm">Margaret Holloway</div><div className="nd-sub">Overdue · 6 weeks, no reply</div></div><span className="nd-act">Nudge</span></div>
                  <div className="nd-row"><div className="nd-clock soon"><ClockIcon /></div><div className="nd-meta"><div className="nd-nm">Jonah Pryce</div><div className="nd-sub">Response expected by 24 Jun</div></div><span className="nd-act" style={{ background: "none", border: 0, color: "var(--muted)" }}>Waiting</span></div>
                  <div className="nd-log">
                    <div className="nd-logttl">Activity</div>
                    <div className="nd-li"><span className="dot" /><span className="tx"><em>Full manuscript</em> requested — Pemberton Literary</span></div>
                    <div className="nd-li"><span className="dot" /><span className="tx"><em>Nudge sent</em> after 4 weeks of silence</span></div>
                    <div className="nd-li"><span className="dot" /><span className="tx"><em>Query sent</em> via Pemberton form</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Panel 3 — Before / After */}
            <div className={`stage-panel${active === 3 ? " active" : ""}`}>
              <div className="frame">
                <div className="fr-band">
                  <div className="fr-icon"><LayoutIcon /></div>
                  <div className="fr-ttl"><div className="a">Your desk</div><div className="b">Leave the spreadsheet behind</div></div>
                </div>
                <div className="fr-body" style={{ padding: 14, height: "calc(100% - 52px)" }}>
                  <div className="ba">
                    <div className="ba-half ba-cold">
                      <span className="tag">Before</span>
                      <div className="ba-grid">
                        {Array.from({ length: 18 }).map((_, i) => (
                          <div key={i} className={`ba-cell${i < 3 ? " h" : ""}`} />
                        ))}
                      </div>
                    </div>
                    <div className="ba-half ba-warm">
                      <span className="tag">After</span>
                      <div className="ba-card">
                        <div className="ba-cb" />
                        <div className="ba-cbody">
                          <div className="ba-wr" />
                          <div className="ba-wr" style={{ width: "72%" }} />
                          <div className="ba-wr" style={{ width: "86%" }} />
                        </div>
                      </div>
                    </div>
                    <div className="ba-div" />
                    <div className="ba-arrow">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="chapters">
          <div className="chapter" data-ch="0" ref={(el) => { chapterRefs.current[0] = el; }}>
            <div className="ch-eye"><span className="ln" /><b>01</b> Your pipeline</div>
            <h3>From slush pile<br />to <em>signed.</em></h3>
            <p>Log a query and ScriptAlly traces it the whole way — queried, partial requested, full manuscript out, offer. The status, response counts and dates are worked out for you, so the pipeline is always honest.</p>
            <div className="ch-feat">
              <span><Check /> Status derived from what actually happened, not hand-typed</span>
              <span><Check /> Every stage and date in one glance</span>
            </div>
          </div>

          <div className="chapter" data-ch="1" ref={(el) => { chapterRefs.current[1] = el; }}>
            <div className="ch-eye"><span className="ln" /><b>02</b> Your agents</div>
            <h3>Know them before<br />you <em>query.</em></h3>
            <p>A searchable agent database with ratings, agencies and manuscript wishlists. The ones you haven't written to surface first — so you always know who's next, and who you've already approached for this book.</p>
            <div className="ch-feat">
              <span><Check /> Typeahead search across MSWL, agency and rating</span>
              <span><Check /> Queried / not-queried tracked per manuscript</span>
            </div>
          </div>

          <div className="chapter" data-ch="2" ref={(el) => { chapterRefs.current[2] = el; }}>
            <div className="ch-eye"><span className="ln" /><b>03</b> Your follow-ups</div>
            <h3>Never lose<br />a <em>nudge.</em></h3>
            <p>Every agent has a clock. ScriptAlly surfaces who's overdue, when a reply is expected, and keeps a full activity log of the back-and-forth — so a slow agent never quietly slips off your radar.</p>
            <div className="ch-feat">
              <span><Check /> Overdue nudges, distinct from send reminders</span>
              <span><Check /> A complete, chronological history per query</span>
            </div>
          </div>

          <div className="chapter" data-ch="3" ref={(el) => { chapterRefs.current[3] = el; }}>
            <div className="ch-eye"><span className="ln" /><b>04</b> Your desk</div>
            <h3>Leave the<br />spreadsheet <em>behind.</em></h3>
            <p>Trade the cold grey grid for a warm stationer's desk. Everything you tracked across fifteen tabs, now in one calm place that actually feels like it's on your side while you do the hard part — the writing.</p>
            <div className="ch-feat">
              <span><Check /> Import your existing spreadsheet in minutes</span>
              <span><Check /> Export back to CSV any time — it's your data</span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
