/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tour — a generic, reusable guided-tour overlay. Given an ordered list of steps
 * ({ targetId, title, body }), it spotlights each target element (a soft-pink ring whose huge
 * box-shadow doubles as the dimming scrim) and floats a parchment coach card beside it (band header +
 * mono n/N chip + Playfair title + body + Skip / ‹ Back / Next ›, the last Next reading "Let's go ✓").
 * Keyboard: Esc = skip, → / Enter = next, ← = back. The ring + card reposition on resize and on any
 * (inner) scroll; the target is scrolled into view once per step. `onDone(completed)` fires once —
 * completed=true only when the final Next is taken, false on skip / Esc / ✕.
 *
 * Presentational only — it stores nothing and knows nothing about its host. Body strings may contain
 * <b> (rendered as HTML). Ref: design-refs/scriptally-workshop-firstrun.html (the tour overlay).
 * Themed via the app roots: Cappuccino/Bold get the soft-pink primary Next from the ref; Editorial
 * collapses pink → its real graphite --abtn tokens (no invented values).
 */
import React, { useState, useLayoutEffect, useEffect, useCallback } from "react";
import { FONT_SERIF, FONT_MONO } from "../lib/designTokens";

export interface TourStep {
  /** id of the element to spotlight (must exist in the DOM when the step is shown). */
  targetId: string;
  title: string;
  /** May contain <b> — rendered as HTML. */
  body: string;
}

export interface TourProps {
  steps: TourStep[];
  /** Fires exactly once: completed=true only when the final Next is taken; false on skip/Esc/✕. */
  onDone: (completed: boolean) => void;
  /** Optional gold caption pinned top-centre above the scrim (e.g. "EXAMPLE DATA — cleared when the tour ends"). */
  badge?: string;
}

interface Rect { left: number; top: number; width: number; height: number; }

const CARD_W = 320;
const CARD_H = 232;
const PAD = 8;
const GAP = 18;

export const Tour: React.FC<TourProps> = ({ steps, onDone, badge }) => {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const step = steps[i];
  const last = i === steps.length - 1;

  // Scroll the target into view once per step (won't scroll if already visible).
  useEffect(() => {
    document.getElementById(steps[i].targetId)?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [steps, i]);

  // Measure the target rect (viewport coords). Re-run on step change, resize and any inner scroll.
  const measure = useCallback(() => {
    const el = document.getElementById(steps[i].targetId);
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    setRect({ left: r.left, top: r.top, width: r.width, height: r.height });
  }, [steps, i]);

  useLayoutEffect(() => { measure(); }, [measure]);
  useEffect(() => {
    const on = () => measure();
    window.addEventListener("resize", on);
    window.addEventListener("scroll", on, true); // capture inner-region scrolls too
    return () => { window.removeEventListener("resize", on); window.removeEventListener("scroll", on, true); };
  }, [measure]);

  const next = useCallback(() => { setI((n) => { if (n >= steps.length - 1) { onDone(true); return n; } return n + 1; }); }, [steps.length, onDone]);
  const back = useCallback(() => setI((n) => Math.max(0, n - 1)), []);
  const skip = useCallback(() => onDone(false), [onDone]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); skip(); }
      else if (e.key === "ArrowRight" || e.key === "Enter") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); back(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, back, skip]);

  // Card placement (viewport coords): right of the ring, flip left if it would overflow, else drop
  // below; always clamped into the viewport. Falls back to centre when the target isn't found.
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  let cl: number, ct: number;
  if (rect) {
    cl = rect.left + rect.width + GAP;
    ct = rect.top;
    if (cl + CARD_W > vw - 10) cl = rect.left - CARD_W - GAP;
    if (cl < 10) { cl = Math.min(rect.left, vw - CARD_W - 10); ct = rect.top + rect.height + 16; }
    if (ct + CARD_H > vh - 10) ct = vh - CARD_H - 10;
    if (ct < 10) ct = 10;
  } else {
    cl = Math.max(10, (vw - CARD_W) / 2);
    ct = Math.max(10, (vh - CARD_H) / 2);
  }

  return (
    <div className="satour">
      <style>{`
        /* Pink → graphite collapse for Editorial (its real --abtn tokens); Capp/Bold keep the ref's pink. */
        .satour { --tour-acc:var(--burg); --tour-nextbg:var(--pink); --tour-nextbd:var(--pink-b); --tour-nexthov:var(--pink-h); --tour-nexttx:var(--ink); }
        .t-edn .satour { --tour-acc:var(--acc); --tour-nextbg:var(--abtn-bg); --tour-nextbd:var(--abtn-bd); --tour-nexthov:var(--abtn-hov); --tour-nexttx:var(--abtn-ink); }
        .satour-scrim { position:fixed; inset:0; z-index:50; background:transparent; }
        .satour-badge { position:fixed; top:18px; left:50%; transform:translateX(-50%); z-index:53; font-family:${FONT_MONO}; font-size:8.5px; letter-spacing:.12em; text-transform:uppercase; color:var(--gold); background:var(--card); border:1px solid var(--gold); border-radius:999px; padding:7px 15px; box-shadow:0 6px 20px rgba(40,28,18,.22); white-space:nowrap; }
        .satour-ring { position:fixed; z-index:51; border:2.5px solid var(--pink-b); border-radius:16px; pointer-events:none;
          box-shadow:0 0 0 6px rgba(245,226,218,.35), 0 0 0 3000px rgba(36,28,21,.45); transition:left .35s ease, top .35s ease, width .35s ease, height .35s ease; }
        .t-edn .satour-ring { border-color:var(--acc); box-shadow:0 0 0 6px rgba(68,72,77,.22), 0 0 0 3000px rgba(28,28,30,.5); }
        .satour-card { position:fixed; z-index:52; width:${CARD_W}px; background:var(--card); border:var(--bdw) solid var(--bd); border-radius:14px; box-shadow:0 18px 44px rgba(30,20,12,.3); overflow:hidden; transition:left .35s ease, top .35s ease; }
        .t-bold .satour-card { border:1.5px solid #1d1712; }
        .satour .tc-h { display:flex; align-items:center; gap:10px; padding:12px 17px; background:linear-gradient(135deg,var(--band-a),var(--band-b)); border-bottom:var(--bdw) solid var(--bd); }
        .satour .tc-h .stepn { font-family:${FONT_MONO}; font-size:8.5px; letter-spacing:.08em; color:var(--tour-acc); background:rgba(255,254,251,.75); border-radius:5px; padding:3px 8px; }
        .satour .tc-h h5 { font-family:${FONT_SERIF}; font-size:15.5px; font-weight:800; color:var(--hdrOn); flex:1; min-width:0; }
        .satour .tc-h .x { margin-left:auto; cursor:pointer; color:var(--hdrOn); opacity:.55; font-size:14px; background:none; border:0; padding:2px; line-height:1; }
        .satour .tc-h .x:hover { opacity:.85; }
        .satour .tc-b { padding:14px 17px; font-size:13px; line-height:1.6; color:var(--ink); }
        .satour .tc-b b { color:var(--tour-acc); }
        .satour .tc-f { display:flex; align-items:center; padding:0 17px 14px; gap:10px; }
        .satour .tc-f .skip { font-family:${FONT_MONO}; font-size:8.5px; text-transform:uppercase; letter-spacing:.05em; color:var(--muted); cursor:pointer; background:none; border:0; padding:4px 0; }
        .satour .tc-f .skip:hover { color:var(--ink); }
        .satour .tc-f .nav { margin-left:auto; display:flex; gap:8px; }
        .satour .tc-f .back { font-family:${FONT_MONO}; font-size:9px; color:var(--btnT); background:var(--btnBg); border:1px solid var(--btnBd); border-radius:8px; padding:8px 13px; cursor:pointer; }
        .satour .tc-f .back:hover { background:var(--btnH); }
        .satour .tc-f .next { font-family:${FONT_SERIF}; font-size:14px; font-weight:700; color:var(--tour-nexttx); background:var(--tour-nextbg); border:1px solid var(--tour-nextbd); border-radius:9px; padding:8px 18px; cursor:pointer; }
        .satour .tc-f .next:hover { background:var(--tour-nexthov); }
        @media (prefers-reduced-motion: reduce) { .satour-ring, .satour-card { transition:none; } }
      `}</style>
      <div className="satour-scrim" onClick={(e) => e.stopPropagation()} aria-hidden="true" />
      {badge && <div className="satour-badge">{badge}</div>}
      {rect && (
        <div className="satour-ring" aria-hidden="true" style={{ left: rect.left - PAD, top: rect.top - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }} />
      )}
      <div className="satour-card" role="dialog" aria-modal="true" aria-label={step.title} style={{ left: cl, top: ct }}>
        <div className="tc-h">
          <span className="stepn">{i + 1} / {steps.length}</span>
          <h5>{step.title}</h5>
          <button type="button" className="x" onClick={skip} aria-label="Close tour">✕</button>
        </div>
        <div className="tc-b" dangerouslySetInnerHTML={{ __html: step.body }} />
        <div className="tc-f">
          <button type="button" className="skip" onClick={skip}>Skip tour</button>
          <span className="nav">
            {i > 0 && <button type="button" className="back" onClick={back}>‹ Back</button>}
            <button type="button" className="next" onClick={next}>{last ? "Let’s go ✓" : "Next ›"}</button>
          </span>
        </div>
      </div>
    </div>
  );
};
