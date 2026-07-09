/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FirstVisitHome — the Package Workshop's LANDING, shown by the route at packagesCount === 0 (ref
 * design-refs/scriptally-workshop-firstrun.html, view 1). "Find out what wins requests" headline + a
 * static demo package card (with the burgundy result bar) + the soft "＋ Build your first package"
 * CTA + a quiet "New here? We'll show you around →" tour link, then the "Curate your library of
 * materials" act with three illustrative EXAMPLE cards.
 *
 * Reinstated + ADAPTED from the original carousel FirstVisitHome (retired in Phase D, recovered from
 * git): the cycling carousel, the live/clickable library cards and the worked-examples link are gone
 * — the ref's landing is static and illustrative-only. Its content/copy is reused. The CTA uses the
 * established --btn* button treatment (white/taupe/mocha · pink in Bold · graphite-tint in Editorial),
 * NOT the mock's raw --pink, so Editorial stays on real .t-edn tokens (flagged deviation from the ref).
 */
import React from "react";
import { ComponentType } from "../../types";
import { TypeGlyph } from "./TypeGlyph";
import { FONT_SERIF, FONT_MONO } from "../../lib/designTokens";

/** The three illustrative library cards (static EXAMPLE content — never clickable here). */
const LIB: { type: ComponentType; head: "xl" | "xs" | "xp"; label: string; title: string; file: string }[] = [
  { type: ComponentType.QUERY_LETTER, head: "xl", label: "Query letter", title: "Comp-led rework", file: "MDO_Query_v2.docx" },
  { type: ComponentType.SYNOPSIS, head: "xs", label: "Synopsis", title: "One-page synopsis", file: "MDO_Synopsis.docx" },
  { type: ComponentType.SAMPLE_PAGES, head: "xp", label: "Sample pages", title: "Chapters 1–3", file: "MDO_Pages_1-3.docx" },
];
const docIcon = (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" aria-hidden="true"><path d="M14 3H6a1 1 0 00-1 1v16a1 1 0 001 1h12a1 1 0 001-1V8z" /><path d="M14 3v5h5" /></svg>
);

export interface FirstVisitHomeProps {
  /** Enter the workshop (＋ Build your first package). */
  onBuild: () => void;
  /** Enter the workshop AND start the tour ("New here? We'll show you around →"). */
  onTour: () => void;
}

export const FirstVisitHome: React.FC<FirstVisitHomeProps> = ({ onBuild, onTour }) => {
  return (
    <div className="wkland">
      <style>{`
        /* --land-acc mirrors the workshop's --wk-burg collapse: burgundy in Capp/Bold, graphite in
           Editorial (real .t-edn --acc), so the landing's accents stay on-system in every theme. */
        .wkland { --land-acc:var(--burg); flex:1; min-height:0; background:var(--card); border:var(--bdw) solid var(--bd); border-radius:16px; overflow-y:auto; padding:34px 40px 30px; }
        .t-edn .wkland { --land-acc:var(--acc); }
        .t-bold .wkland { border:1.5px solid #1d1712; }
        .wkland .st2 { display:flex; align-items:center; justify-content:center; gap:40px; flex-wrap:wrap; }
        .wkland .lt { flex:0 1 400px; min-width:0; }
        .wkland h2 { font-family:${FONT_SERIF}; font-size:42px; font-weight:800; line-height:1.08; letter-spacing:-.7px; color:var(--headT); margin:0; }
        .wkland .sl { font-size:14px; color:var(--muted); line-height:1.6; max-width:380px; margin-top:14px; }
        .wkland .buildp { display:inline-flex; align-items:center; gap:8px; margin-top:22px; font-family:${FONT_SERIF}; font-size:16px; font-weight:700; color:var(--btnT); background:var(--btnBg); border:1px solid var(--btnBd); border-radius:12px; padding:15px 30px; cursor:pointer; }
        .wkland .buildp:hover { background:var(--btnH); }
        .wkland .tourlink { display:block; margin-top:12px; font-family:${FONT_MONO}; font-size:9px; letter-spacing:.06em; color:var(--land-acc); text-decoration:underline; text-underline-offset:3px; cursor:pointer; background:none; border:0; padding:0; }
        /* Static demo package card */
        .wkland .pkui { width:296px; background:#fffefb; border:var(--bdw) solid var(--bd); border-radius:12px; overflow:hidden; box-shadow:0 16px 40px rgba(58,28,20,.13); transform:rotate(1.2deg); flex-shrink:0; }
        .t-bold .wkland .pkui { border:1.5px solid #1d1712; }
        .wkland .pkui-h { padding:11px 16px; border-bottom:var(--bdw) solid var(--bd); display:flex; align-items:center; gap:9px; background:var(--band-a); }
        .wkland .pkui-h .nm { font-family:${FONT_SERIF}; font-size:15.5px; font-weight:700; color:var(--ink); }
        .wkland .pkui-b { padding:12px 16px 14px; }
        .wkland .pkln { display:flex; align-items:center; gap:9px; font-size:12px; color:var(--muted); padding:3.5px 0; }
        .wkland .pkln .dd { width:7px; height:7px; border-radius:50%; background:var(--land-acc); flex-shrink:0; }
        .wkland .winrow { margin-top:10px; background:#fffefb; border:var(--bdw) solid var(--bd); border-left:4px solid var(--land-acc); border-radius:0 8px 8px 0; padding:8px 12px; }
        .wkland .winrow .wl { font-family:${FONT_MONO}; font-size:8px; letter-spacing:.08em; text-transform:uppercase; color:var(--land-acc); }
        .wkland .winrow .wv { font-size:13px; font-weight:600; color:var(--ink); margin-top:2px; }
        /* Library act */
        .wkland .divrule { display:flex; align-items:center; gap:14px; margin:30px 10px 0; }
        .wkland .divrule::before, .wkland .divrule::after { content:''; flex:1; height:1px; background:var(--bd); }
        .wkland .divrule span { font-family:${FONT_SERIF}; font-size:16px; font-weight:700; color:var(--headT); white-space:nowrap; }
        .wkland .a2s { text-align:center; font-size:12.5px; color:var(--muted); margin:10px auto 0; max-width:520px; line-height:1.6; }
        .wkland .librow { display:flex; justify-content:center; gap:16px; margin-top:18px; flex-wrap:wrap; }
        .wkland .lib { flex:0 1 250px; background:#fffefb; border:var(--bdw) solid var(--bd); border-radius:11px; overflow:hidden; box-shadow:0 8px 20px rgba(58,28,20,.09); text-align:left; }
        .t-bold .wkland .lib { border:1.5px solid #1d1712; }
        .wkland .lib-h { display:flex; align-items:center; gap:8px; padding:9px 14px; font-family:${FONT_MONO}; font-size:8px; letter-spacing:.1em; text-transform:uppercase; border-bottom:var(--bdw) solid var(--bd); color:var(--headT); background:var(--band-a); }
        .wkland .lib-h .ex { margin-left:auto; background:rgba(255,254,251,.8); border-radius:4px; padding:2px 6px; font-size:6.5px; letter-spacing:.12em; }
        .wkland .lib-b { padding:11px 14px 13px; }
        .wkland .lt2 { font-family:${FONT_MONO}; font-size:6.5px; letter-spacing:.14em; text-transform:uppercase; color:var(--muted); }
        /* NOT ".ti" — Tabler Icons collision. */
        .wkland .libti { font-family:${FONT_SERIF}; font-size:15px; font-weight:700; color:var(--ink); margin:2px 0 8px; }
        .wkland .lfchip { display:inline-flex; align-items:center; gap:6px; background:#fdfaf5; border:1px solid #e4d8c6; border-radius:7px; padding:5px 9px; font-family:${FONT_MONO}; font-size:8px; color:#5d5247; }
      `}</style>

      <div className="st2">
        <div className="lt">
          <h2>Find out what<br />wins requests</h2>
          <div className="sl">Send different versions of your submission. ScriptAlly tracks which one gets agents asking for more.</div>
          <button type="button" className="buildp" onClick={onBuild}>＋ Build your first package</button>
          <button type="button" className="tourlink" onClick={onTour}>New here? We&rsquo;ll show you around →</button>
        </div>
        <div className="pkui" aria-hidden="true">
          <div className="pkui-h"><span className="nm">Character-led · v2</span></div>
          <div className="pkui-b">
            <div className="pkln"><span className="dd" />Character-led letter</div>
            <div className="pkln"><span className="dd" />One-page synopsis</div>
            <div className="pkln"><span className="dd" />Chapters 1–3</div>
            <div className="winrow"><div className="wl">Sent with 4 queries</div><div className="wv">Full manuscript requested ✓</div></div>
          </div>
        </div>
      </div>

      <div className="divrule"><span>Curate your library of materials</span></div>
      <div className="a2s">Name each component, pin the actual file so you never lose track, then re-use it across multiple packages.</div>
      <div className="librow">
        {LIB.map((c) => (
          <div key={c.type} className="lib">
            <div className={`lib-h ${c.head}`}><TypeGlyph type={c.type} size={13} />{c.label}<span className="ex">Example</span></div>
            <div className="lib-b">
              <div className="lt2">Title</div>
              <div className="libti">{c.title}</div>
              <span className="lfchip">{docIcon}{c.file}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
