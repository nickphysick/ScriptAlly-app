/**
 * FeatureRows — the full-bleed parchment features band (design ref:
 * design-refs/landing-v13.html .featband): centred header (no eyebrow, no tick, no kickers)
 * and seven alternating rows with hairline separators. Copy comes verbatim from
 * landingCopy.ts; each visual is a faithful static tableau from the ref markup.
 */

import React from "react";
import { FEATURES_H2, FEATURES_SUB, FEATURE_ROWS, FeatureRow } from "./landingCopy";

/* ── Row visuals (static tableaux, keyed by row) ── */

const SDot: React.FC<{ glyph: string; fill?: "half" | "full" | "solid" }> = ({ glyph, fill = "half" }) => (
  <span
    className="mk-sdot"
    style={
      fill === "full" ? { background: "conic-gradient(#7c3a2a 100%, rgba(124,58,42,0.28) 0)" }
      : fill === "solid" ? { background: "#7c3a2a" }
      : undefined
    }
  >
    <span className="mk-c" style={fill === "solid" ? { background: "#7c3a2a", color: "#fdfaf5" } : undefined}>{glyph}</span>
  </span>
);

const ImportVisual: React.FC = () => (
  <>
    <div className="mk-xls">
      <table>
        <tbody>
          <tr><th>agent</th><th>sent??</th><th>status</th><th>notes</th></tr>
          <tr><td>M. Atwood</td><td>14/3</td><td>partial!!</td><td>chase???</td></tr>
          <tr><td>marsh (jon?)</td><td className="mk-bad">??</td><td>no reply</td><td>—</td></tr>
          <tr><td>E.Whitfield</td><td>14 March</td><td className="mk-bad">FULL?!</td><td>see email</td></tr>
          <tr><td>priya raman</td><td>1.5.24</td><td>partial snt</td><td className="mk-bad">WHICH VER</td></tr>
          <tr><td>tom ellery</td><td>3/3</td><td className="mk-bad">OFFER!!!</td><td>!!!</td></tr>
        </tbody>
      </table>
    </div>
    <div className="mk-xarrow">→<span className="mk-xcap">Smart import</span></div>
    <div className="mk-scard mk-dbclean">
      <div className="mk-dbrow"><span className="mk-monoinit">MA</span><div><div className="mk-dn">Margaret Atwood</div><div className="mk-da">Pickwick Editorial</div></div><SDot glyph="←" /></div>
      <div className="mk-dbrow"><span className="mk-monoinit">EW</span><div><div className="mk-dn">Eleanor Whitfield</div><div className="mk-da">Greenfield Literary</div></div><SDot glyph="←" fill="full" /></div>
      <div className="mk-dbrow"><span className="mk-monoinit">TE</span><div><div className="mk-dn">Tom Ellery</div><div className="mk-da">Curtis Vane</div></div><SDot glyph="✓" fill="solid" /></div>
    </div>
  </>
);

const TrackVisual: React.FC = () => (
  <>
    <div className="mk-scard mk-pipec">
      <div className="mk-pt">What's live right now?</div>
      <div className="mk-piperow">
        <div className="mk-pnode mk-fill">→</div><div className="mk-pdots" />
        <div className="mk-pnode">‹</div><div className="mk-pdots" />
        <div className="mk-pnode">›</div><div className="mk-pdots" />
        <div className="mk-pnode">«</div>
      </div>
      <div className="mk-pl"><span>8 queried</span><span>3 partials req.</span><span>1 sent</span><span>fulls</span></div>
    </div>
    <div className="mk-scard mk-qc mk-qc2">
      <span className="mk-monoinit">GP</span><span className="mk-nm">Greg Panetta</span>
      <div className="mk-ag">Panetta &amp; Co · Queried 2 Jun</div>
      <span className="mk-spill"><SDot glyph="←" />Partial requested</span>
    </div>
  </>
);

const AgentsVisual: React.FC = () => (
  <>
    <div className="mk-scard mk-ccard mk-disc1">
      <div className="mk-crow">
        <span className="mk-monoinit">EW</span>
        <div><div className="mk-cname">Eleanor Whitfield</div><div className="mk-cag">Greenfield Literary</div></div>
        <span className="mk-fitb mk-fit-strong">Strong fit</span>
      </div>
      <div className="mk-cwhy">Actively seeking speculative fiction with literary voice — open to submissions.</div>
    </div>
    <div className="mk-scard mk-ccard mk-disc2">
      <div className="mk-crow">
        <span className="mk-monoinit">PR</span>
        <div><div className="mk-cname">Priya Raman</div><div className="mk-cag">The Lantern Agency</div></div>
        <span className="mk-fitb mk-fit-good">Good fit</span>
      </div>
      <div className="mk-cwhy">Adult SFF, character-led. Reopens to submissions in September.</div>
    </div>
  </>
);

const PulseVisual: React.FC = () => (
  <div className="mk-scard mk-trackc">
    <div className="mk-trackband">
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h4l2-7 4 14 3-10 2 3h5" /></svg>
      <h4>Tracking</h4>
    </div>
    <div className="mk-trackbody">
      <div className="mk-tev">
        <span className="mk-tic">→</span>
        <div>
          <div className="mk-tn2">Query sent</div><div className="mk-ts">via Email</div>
          <div><span className="mk-matpill">Query letter · v3</span><span className="mk-matpill">Synopsis · 1 pg</span></div>
        </div>
        <span className="mk-tdate">14 MAR</span>
      </div>
      <div className="mk-tev">
        <span className="mk-tic">‹</span>
        <div><div className="mk-tn2">Partial requested</div><div className="mk-ts">Priya asked for the first three chapters</div></div>
        <span className="mk-tdate">2 APR</span>
      </div>
      <div className="mk-tev">
        <span className="mk-tic">›</span>
        <div>
          <div className="mk-tn2">Partial sent</div><div className="mk-ts">via Email</div>
          <div><span className="mk-matpill">First three chapters</span></div>
        </div>
        <span className="mk-tdate">5 APR</span>
      </div>
      <span className="mk-waitchip">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "currentColor" }}><path d="M6 2h12M6 22h12M8 2v4l4 4 4-4V2M8 22v-4l4-4 4 4v4" /></svg>
        Waiting to hear back · expected by ~28 May
      </span>
    </div>
  </div>
);

const PackagesVisual: React.FC = () => (
  <div className="mk-scard mk-pkgc">
    <div className="mk-pt2">Package · Second batch</div>
    <div className="mk-pkr">
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
      Query letter — v3<span className="mk-pv">Used in 6</span>
    </div>
    <div className="mk-pkr">
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 10h16M4 14h10" /></svg>
      Synopsis — 1 page<span className="mk-pv">Used in 6</span>
    </div>
    <div className="mk-pkr">
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h8l4 4v14H7z" /><path d="M15 3v4h4" /></svg>
      First three chapters<span className="mk-pv">Used in 4</span>
    </div>
  </div>
);

const EmailVisual: React.FC = () => (
  <>
    <div className="mk-scard mk-mailc">
      <div className="mk-mh">FROM <b>m.atwood@pickwick.co.uk</b><br />SUBJECT <b>Re: THE BOOK OF LOST CLOCKWORKS</b></div>
      <div className="mk-mb">
        Dear Bethus — I enjoyed the opening pages very much and would love to see{" "}
        <span className="mk-hl">the first three chapters</span>. Could you send them{" "}
        <span className="mk-hl">by 20 August</span>?
      </div>
    </div>
    <div className="mk-scard mk-qc mk-mailqc">
      <span className="mk-monoinit">MA</span><span className="mk-nm">Margaret Atwood</span>
      <div className="mk-ag">Pickwick Editorial</div>
      <span className="mk-spill"><SDot glyph="←" />Partial requested</span>
    </div>
  </>
);

const NotesVisual: React.FC = () => (
  <>
    <div className="mk-pnote mk-y"><span className="mk-cv">"Ask about film rights if the call happens."</span></div>
    <div className="mk-pnote mk-g"><span className="mk-cv">"Ch. 3 rewrite before the full goes out."</span></div>
    <div className="mk-pinned">
      <span className="mk-cv">"Marsh reopens to subs in September — query then."</span>
      <div className="mk-pt3">Pinned · Notes to self</div>
    </div>
  </>
);

const VISUALS: Record<string, React.ReactNode> = {
  import: <ImportVisual />,
  track: <TrackVisual />,
  agents: <AgentsVisual />,
  pulse: <PulseVisual />,
  packages: <PackagesVisual />,
  email: <EmailVisual />,
  notes: <NotesVisual />,
};

const Row: React.FC<{ row: FeatureRow; onPrimary: () => void; onLink?: (row: FeatureRow) => void }> = ({ row, onPrimary, onLink }) => (
  <div className={"mk-frow" + (row.flip ? " mk-flip" : "")}>
    <div className="mk-fcopy">
      <h3>
        {row.heading}
        {row.pro && <span className="mk-protag">Pro</span>}
      </h3>
      <p>
        {row.body.map((seg, i) => (seg.b ? <b key={i}>{seg.text}</b> : <React.Fragment key={i}>{seg.text}</React.Fragment>))}
      </p>
      <div className="mk-factions">
        <button type="button" className="mk-btn" onClick={onPrimary}>{row.primary}</button>
        {row.link && (
          <button type="button" className="mk-tlink" onClick={() => onLink?.(row)}>{row.link}</button>
        )}
      </div>
    </div>
    <div className={"mk-fv" + (row.key === "notes" ? " mk-notesv" : "")} style={row.key === "pulse" ? { height: 300 } : undefined} aria-hidden="true">
      {VISUALS[row.key]}
    </div>
  </div>
);

export const FeatureRows: React.FC<{
  onStart: () => void;
  onRowLink: (row: FeatureRow) => void;
}> = ({ onStart, onRowLink }) => (
  <section className="mk-featband" id="mk-features">
    <div className="mk-feathead">
      <h2>{FEATURES_H2}</h2>
      <p>{FEATURES_SUB}</p>
    </div>
    <div className="mk-rows">
      {FEATURE_ROWS.map((row) => (
        <Row key={row.key} row={row} onPrimary={onStart} onLink={onRowLink} />
      ))}
    </div>
  </section>
);
