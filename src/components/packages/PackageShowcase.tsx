/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PackageShowcase — the Pro-selling landing shown on the Submission Packages route when the writer
 * has ZERO packages (replaces the FR1 "Find out what wins requests" split-stage). A marketing surface:
 * a Queries-Hub-idiom header on the page ground, a hero with a 24s self-playing product demo, a
 * Version-compare section, the library trio and a closing CTA band. Ref (source of truth, ported
 * faithfully): design-refs/scriptally-packages-showcase.html.
 *
 * CAPPUCCINO-ONLY by design (a marketing surface, not themed workspace chrome): every colour is a
 * self-scoped `.pkgshow --*` token (the ref's :root), so it reads Cappuccino regardless of the user's
 * queriesTheme — the same stance the public marketing Landing takes. Fonts are the app's
 * Source Sans Pro / Playfair / JetBrains (not the ref's Inter — the documented marketing divergence).
 * Keyframe names are namespaced `psw*` (keyframes are always global). Pure presentation: no Firestore,
 * no state, no real data; the demo + "Make active" buttons are fiction. SC1 = header + token scope.
 */
import React from "react";
import { FONT_SANS, FONT_SERIF, FONT_MONO } from "../../lib/designTokens";

export interface PackageShowcaseProps {
  /** The active manuscript's title, shown in the header chip. */
  manuscriptTitle: string;
  /** "Unlock with Pro" — navigate to the plans page (host decision). */
  onUnlockPro: () => void;
  /** "Try it with example data →" — enter the workshop + start the FR3 tour (same hook as the old landing). */
  onTryExample: () => void;
}

/** Base tokens + header styling (the hero/compare/library/band CSS is appended in later phases). */
const SHOWCASE_CSS = `
  .pkgshow { --ground:#f2ede7; --card:#fdfaf5; --bd:#d8cebf; --ink:#241c15; --hdr:#5d4037; --muted:#9a8c80;
    --burg:#7c3a2a; --sage:#8a9e88; --sage-d:#5a6e58; --sage-l:#e9ede6; --gold:#a8842c;
    --pink:#f5e2da; --pink-b:#e8c8bc; --pink-h:#efd5ca; --pink-l:#fbf0eb;
    --slate:#6A89A7; --slate-d:#55708c; --sel:#f3ede2; --dash:#c9bca8;
    height:100%; overflow-y:auto; background:var(--ground); color:var(--ink); font-family:${FONT_SANS}; }
  .pkgshow .page { max-width:1280px; margin:0 auto; padding:34px 40px 90px; }
  /* header — Queries Hub idiom: Playfair on the ground, no card */
  .pkgshow .crumb { font-family:${FONT_MONO}; font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:#a4937f; }
  .pkgshow .hubrow { display:flex; align-items:baseline; gap:16px; margin-top:8px; }
  .pkgshow .hubrow h1 { font-family:${FONT_SERIF}; font-size:46px; font-weight:800; letter-spacing:-.8px; color:var(--ink); line-height:1; }
  .pkgshow .propill { display:inline-flex; align-items:center; gap:6px; font-family:${FONT_MONO}; font-size:9px; letter-spacing:.1em; background:#e7edf3; color:var(--slate-d); border:1px solid #cfdae4; border-radius:8px; padding:5px 10px; transform:translateY(-6px); }
  .pkgshow .mschip { margin-left:auto; display:inline-flex; align-items:center; gap:9px; background:var(--card); border:1px solid var(--bd); border-radius:10px; padding:10px 16px; font-weight:600; font-size:13.5px; color:var(--hdr); align-self:center; }
`;

const lockGlyph = (
  <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4.5" y="11" width="15" height="9.5" rx="2" /><path d="M8 11V7.5a4 4 0 018 0V11" />
  </svg>
);
const bookGlyph = (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" aria-hidden="true">
    <path d="M5 4h11l3 3v13H5z" /><path d="M8 4v6l2-1.5L12 10V4" />
  </svg>
);

export const PackageShowcase: React.FC<PackageShowcaseProps> = ({ manuscriptTitle }) => {
  return (
    <div className="pkgshow">
      <style>{SHOWCASE_CSS}</style>
      <div className="page">
        {/* header: Queries Hub idiom — bare on the ground, no card */}
        <div className="crumb">Scriptally / Manuscripts / Submission Packages</div>
        <div className="hubrow">
          <h1>Package Workshop</h1>
          <span className="propill">{lockGlyph} PRO</span>
          <span className="mschip">{bookGlyph}{manuscriptTitle}</span>
        </div>
      </div>
    </div>
  );
};
