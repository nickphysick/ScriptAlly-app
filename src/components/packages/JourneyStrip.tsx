/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * JourneyStrip — the persistent four-station orientation band under the Builder's page header
 * (mockup .journey in design-refs/scriptally-guided-builder.html): 1 Write → 2 Combine → 3 Attach →
 * 4 See what wins, with the current view's station lit (gallery → 1, composer → 2, packages home →
 * 3 Attach, stats page → 4 See what wins). Attach and See-what-wins are now DISTINCT destinations —
 * the home is the attach surface; the stats page is its own analytics view. Rendered on the WORKING
 * views only — never on first-visit, whose page is the pitch; the strip takes over the teaching once
 * the user is inside.
 *
 * Display-only THIS pass: no navigation on click (a mid-composer click navigating away is a
 * data-loss trap) — station navigation is a flagged follow-up. Cursor stays default.
 *
 * The chevron joins are the ref's rotated-square trick: an 18px square rotated 45° hangs off each
 * station's left edge, its top+right borders drawing the ">" and its background:inherit filling with
 * the station's own ground so a lit station notches cleanly into its unlit neighbour.
 *
 * Bold Pastille had no mock — its treatment is DERIVED from Bold's grammar (light blush ground from
 * the pane family, card-white lit station, ink hairlines via the theme border tokens, burgundy
 * icons/bar) and kept in the single `.t-bold .pkgjs` block below so Nick's verdict is a token-level
 * adjustment. Cappuccino values are sampled from the ref (the ground gradient = --btnH → --selBg).
 */
import React from "react";
import { FONT_SERIF, FONT_MONO } from "../../lib/designTokens";

export type JourneyView = "gallery" | "composer" | "home" | "wins";

/** Which station lights per view — Attach (home) and See what wins (stats) are now separate. */
const LIT: Record<JourneyView, number[]> = { gallery: [1], composer: [2], home: [3], wins: [4] };

/** Station icon SVGs, ported verbatim from the ref (44px box, 34px ink-line art, currentColor). */
const ICONS: React.ReactNode[] = [
  <svg key="write" width={34} height={34} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M30 8l6 6L16 34l-8 2 2-8z" /><path d="M27 11l6 6" /><path d="M10 40h28" opacity={0.4} /></svg>,
  <svg key="combine" width={34} height={34} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" aria-hidden="true"><path d="M24 6l16 9v18l-16 9-16-9V15z" /><path d="M24 42V24M8 15l16 9 16-9" /><path d="M16 10.5l16 9" opacity={0.45} /></svg>,
  <svg key="attach" width={34} height={34} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" aria-hidden="true"><path d="M6 22L42 8l-16 34-4-14-16-6z" /><path d="M26 28L42 8" opacity={0.45} /></svg>,
  <svg key="wins" width={34} height={34} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 34l10-10 8 8 14-14" /><path d="M30 18h8v8" /><circle cx={16} cy={24} r={1.4} fill="currentColor" /></svg>,
];

const STATIONS: { name: string; sub: string }[] = [
  { name: "Write", sub: "letters, synopses & pages" },
  { name: "Combine", sub: "into a named package" },
  { name: "Attach", sub: "to the queries you send" },
  { name: "See what wins", sub: "which version pulls requests" },
];

export interface JourneyStripProps {
  view: JourneyView;
}

export const JourneyStrip: React.FC<JourneyStripProps> = ({ view }) => {
  const lit = LIT[view];
  return (
    <div className="pkgjs" role="img" aria-label={`How packages work: write materials, combine them into a package, attach it to queries, see what wins. You are at ${lit.map((n) => STATIONS[n - 1].name).join(" and ")}.`}>
      <style>{`
        /* Cappuccino values sampled from the ref; every Bold divergence lives in the ONE .t-bold block. */
        .pkgjs { --js-ground:linear-gradient(135deg, var(--btnH), var(--selBg)); --js-lit:var(--card); --js-bar:var(--burg); --js-sub:#8a7264; --js-num:#b3a291; }
        .t-bold .pkgjs { --js-ground:#f5ece9; --js-sub:#7a4438; --js-num:#a08276; }
        .pkgjs .journey { display:flex; align-items:stretch; border:var(--bdw) solid var(--bd); border-radius:var(--chromerad); overflow:hidden; background:var(--js-ground); }
        .pkgjs .jst { flex:1; display:flex; align-items:center; gap:13px; padding:15px 22px; position:relative; opacity:.55; min-width:0; }
        .pkgjs .jst.on { opacity:1; background:var(--js-lit); box-shadow:inset 0 -3px 0 var(--js-bar); }
        .pkgjs .jst + .jst::before { content:''; position:absolute; left:-9px; top:50%; width:18px; height:18px; transform:translateY(-50%) rotate(45deg); border-top:var(--bdw) solid var(--bd); border-right:var(--bdw) solid var(--bd); background:inherit; z-index:1; }
        .pkgjs .jic { width:44px; height:44px; flex-shrink:0; color:var(--js-bar); display:flex; align-items:center; justify-content:center; }
        .pkgjs .jst b { display:block; font-family:${FONT_SERIF}; font-size:16.5px; font-weight:700; color:var(--headT); }
        .pkgjs .jst i { display:block; font-style:normal; font-size:11px; color:var(--js-sub); margin-top:2px; line-height:1.35; }
        .pkgjs .jnum { position:absolute; top:8px; right:12px; font-family:${FONT_MONO}; font-size:8px; color:var(--js-num); }
        @media (max-width: 900px) { .pkgjs .jst i { display:none; } .pkgjs .jst { padding:12px 14px; gap:9px; } }
      `}</style>
      <div className="journey">
        {STATIONS.map((s, i) => (
          <div key={s.name} className={`jst${lit.includes(i + 1) ? " on" : ""}`}>
            <span className="jnum">{i + 1}</span>
            <span className="jic">{ICONS[i]}</span>
            <div><b>{s.name}</b><i>{s.sub}</i></div>
          </div>
        ))}
      </div>
    </div>
  );
};
