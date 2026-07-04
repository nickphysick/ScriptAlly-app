/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FirstVisitHome — the Package Builder's first-visit state (0 materials AND 0 packages for the active
 * manuscript). A split stage (headline + a cycling product-UI demo of three worked packages) over a
 * "Create a library of materials" divider and three illustrative library cards. Ported from the
 * approved mockup (design-refs/scriptally-package-builder-cappuccino.html #home-empty) — every colour
 * is a theme token or a mockup-sampled value.
 *
 * The three library cards show illustrative example content (only ever seen at 0/0), clickable to
 * create the user's own; the carousel + CTA + "See this example in full" are wired to callbacks the
 * orchestrator fills in later phases (composer = P7, create-modal = P9, worked-examples = P10).
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { ComponentType } from "../../types";
import { TypeGlyph } from "./TypeGlyph";
import { FONT_SERIF, FONT_MONO } from "../../lib/designTokens";

/** The three strategy icons for the demo package-card header (raw SVG, currentColor). */
const ICONS: Record<string, string> = {
  sl: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M5 4h4v16H5zM9 5h4v15H9z"/><path d="M13.5 6.2l3.8-1 4 15.4-3.8 1z"/></svg>',
  ss: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.6"/><path d="M5 20a7 7 0 0114 0"/><path d="M17.5 3.5l1.2 1.2M19.5 2.8l.4 1.6"/></svg>',
  sp: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h11a1 1 0 011 1v14a1 1 0 01-1 1H8z"/><path d="M8 4v16M4.5 7H8M4.5 12H8M4.5 17H8"/><path d="M13 10.6c.55-1.1 2.2-1.1 2.75 0 .55-1.1 2.2-1.1 2.75 0 .4.85-.45 1.9-2.75 3.4-2.3-1.5-3.15-2.55-2.75-3.4z" fill="currentColor" stroke="none"/></svg>',
};

interface Slide {
  key: string;
  name: string;
  tint: string;
  hl: string;
  tx: string;
  lines: [string, string][];
  wl: string;
  wv: string;
}

/** The three demo packages (verbatim from the mockup CAR array — "The Lighthouse at Wick Point"). */
const CAR: Slide[] = [
  {
    key: "sl", name: "Comp-led · v1", tint: "var(--tl)", hl: "#f6ddd3",
    tx: 'Dear Ms Hartley,<br>THE LIGHTHOUSE AT WICK POINT is <span class="em">an 82,000-word literary mystery in the vein of The Lamplighters</span> and Magpie Murders. When retired keeper Elspeth Marr finds a stranger’s coat folded on the rocks below her light…',
    lines: [["var(--burg)", "Comp-led letter"], ["var(--sage-d)", "One-page synopsis"]],
    wl: "Sent with 3 queries", wv: "Partial requested ✓",
  },
  {
    key: "ss", name: "Character-led · v2", tint: "var(--ts)", hl: "#e7ece4",
    tx: 'Dear Ms Hartley,<br>Elspeth Marr has kept two things all her life: <span class="em">the Wick Point light, and a secret.</span> When a drowned stranger washes ashore wearing a coat she mended thirty years ago…',
    lines: [["var(--burg)", "Character-led letter"], ["var(--sage-d)", "One-page synopsis"], ["var(--gold)", "Chapters 1–3"]],
    wl: "Sent with 4 queries", wv: "Full manuscript requested ✓",
  },
  {
    key: "sp", name: "Personalised", tint: "var(--tp)", hl: "#f3e6cf",
    tx: 'Dear Ms Hartley,<br>Your Manuscript Wishlist asks for <span class="em">coastal settings, older protagonists and secrets that surface slowly</span> — so I hope THE LIGHTHOUSE AT WICK POINT might be a good fit…',
    lines: [["var(--burg)", "Personalised letter"], ["var(--sage-d)", "One-page synopsis"]],
    wl: "Sent with 1 query", wv: "Awaiting reply",
  },
];

/** Illustrative library cards (example content, shown only at 0/0; a click opens the create-modal). */
const LIB_EXAMPLES: { type: ComponentType; head: "xl" | "xs" | "xp"; label: string; title: string; file: string; ver: string; used: React.ReactNode }[] = [
  { type: ComponentType.QUERY_LETTER, head: "xl", label: "Query letter", title: "Comp-led rework", file: "MDO_Query_compled.docx", ver: "v2", used: <>IN <b>2 PACKAGES</b> · 3 SENT QUERIES</> },
  { type: ComponentType.SYNOPSIS, head: "xs", label: "Synopsis", title: "One-page synopsis", file: "MDO_Synopsis.docx", ver: "v1", used: <>IN <b>1 PACKAGE</b></> },
  { type: ComponentType.SAMPLE_PAGES, head: "xp", label: "Sample pages", title: "Chapters 1–3", file: "MDO_Pages_1-3.docx", ver: "v1", used: <>UNUSED — NEW</> },
];

const docIcon = (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
    <path d="M14 3H6a1 1 0 00-1 1v16a1 1 0 001 1h12a1 1 0 001-1V8z" />
    <path d="M14 3v5h5" />
  </svg>
);

export interface FirstVisitHomeProps {
  /** Open the composer (Phase 7). */
  onBuild: () => void;
  /** Open the create-modal for a material type (Phase 9). */
  onCreate: (type: ComponentType) => void;
  /** Open the worked-example popup for a demo slide (Phase 10). */
  onExample: (slideKey: string) => void;
}

export const FirstVisitHome: React.FC<FirstVisitHomeProps> = ({ onBuild, onCreate, onExample }) => {
  const [carI, setCarI] = useState(0);
  const [visible, setVisible] = useState(true);
  const hover = useRef(false);

  // 450ms crossfade, then swap to the next slide (functional setter → no stale closure).
  const step = useCallback(() => {
    setVisible(false);
    window.setTimeout(() => {
      setCarI((i) => (i + 1) % CAR.length);
      setVisible(true);
    }, 450);
  }, []);

  // 5s auto-rotate, paused on hover, disabled entirely under reduced-motion.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => { if (!hover.current) step(); }, 5000);
    return () => window.clearInterval(t);
  }, [step]);

  const d = CAR[carI];

  return (
    <div className="pkgfv">
      <style>{`
        .pkgfv .st2 { display:flex; align-items:center; justify-content:center; gap:34px; padding:20px 20px 4px; flex-wrap:wrap; }
        .pkgfv .lt { flex:0 1 400px; min-width:0; }
        /* Playfair loads up to 700 only, so 800/900 clamp to 700 — use loaded weights for a real step:
           the setup line sits at 600 and the payoff "wins requests" at 700 (a touch bolder). */
        .pkgfv .lt h2 { font-family:${FONT_SERIF}; font-size:46px; font-weight:600; line-height:1.08; letter-spacing:-.8px; color:var(--ink); margin:0; }
        .pkgfv .wr { font-weight:700; white-space:nowrap; }
        .pkgfv .rel { position:relative; white-space:nowrap; }
        .pkgfv .star { position:absolute; top:-16px; left:-16px; width:19px; height:19px; fill:var(--pink-b); transform-origin:center; animation:pkgGlint 2.6s ease-in-out infinite; }
        @keyframes pkgGlint { 0%,100%{ transform:scale(1) rotate(0deg); opacity:.9; } 50%{ transform:scale(1.25) rotate(18deg); opacity:1; } 75%{ transform:scale(.92) rotate(8deg); opacity:.8; } }
        .pkgfv .sl { font-size:14.5px; color:#6a594d; line-height:1.65; max-width:380px; margin-top:16px; }
        .pkgfv .build { display:inline-block; margin:24px 0 0; font-family:${FONT_SERIF}; font-size:16px; font-weight:700; color:var(--ink); background:var(--pink); border:1px solid var(--pink-b); border-radius:12px; padding:15px 32px; cursor:pointer; transition:background .15s,transform .15s; }
        .pkgfv .build:hover { background:var(--pink-h); transform:translateY(-1px); }
        .pkgfv .rt { position:relative; width:470px; height:340px; flex-shrink:0; transition:opacity .45s ease; }
        /* blurred manuscript pile behind the cards for depth (mockup .mdesk .pile: 2 sheets, blur, .7) */
        .pkgfv .pile { position:absolute; inset:26px 74px 40px; filter:blur(2.5px); opacity:.7; z-index:0; pointer-events:none; }
        .pkgfv .pile i { position:absolute; inset:0; background:#fbf7f0; border:1px solid #d9cdbc; border-radius:5px; display:block; }
        .pkgfv .pile i:nth-child(1) { transform:rotate(3deg) translate(10px,-5px); }
        .pkgfv .pile i:nth-child(2) { transform:rotate(-2deg) translate(-9px,4px); }
        .pkgfv .pgui { position:absolute; left:0; top:12px; z-index:1; transform:rotate(-2deg); width:256px; background:#fffefb; border:var(--bdw) solid var(--bd); border-radius:8px; padding:18px 19px 0; height:236px; overflow:hidden; box-shadow:0 12px 30px rgba(58,28,20,.10); }
        .pkgfv .pgui::after { content:''; position:absolute; left:0; right:0; bottom:0; height:56px; background:linear-gradient(rgba(255,254,251,0),#fffefb 78%); }
        .pkgfv .pgui .mt { font-family:${FONT_MONO}; font-size:7.5px; letter-spacing:.1em; text-transform:uppercase; background:var(--tl); color:var(--burg); display:inline-block; border-radius:4px; padding:3px 7px; margin-bottom:9px; }
        .pkgfv .pgui .tx { font-family:${FONT_SERIF}; font-size:11.5px; line-height:1.82; color:#4f4136; }
        .pkgfv .pgui .em { background:linear-gradient(transparent 60%, var(--hlc,var(--tl)) 60%); }
        .pkgfv .pkui { position:absolute; right:0; bottom:24px; z-index:2; transform:rotate(1.2deg); width:322px; background:#fffefb; border:var(--bdw) solid var(--bd); border-radius:12px; overflow:hidden; box-shadow:0 18px 44px rgba(58,28,20,.14); }
        .pkgfv .pkui-h { padding:11px 16px; border-bottom:var(--bdw) solid var(--bd); display:flex; align-items:center; gap:9px; transition:background .5s; }
        .pkgfv .pkui-h .ic { display:flex; color:var(--ink); }
        .pkgfv .pkui-h .nm { font-family:${FONT_SERIF}; font-size:16.5px; font-weight:700; color:var(--ink); }
        .pkgfv .pkui-h .tagp { margin-left:auto; font-family:${FONT_MONO}; font-size:7px; letter-spacing:.1em; text-transform:uppercase; background:rgba(255,254,251,.75); border-radius:5px; padding:3px 7px; color:#6a5347; }
        .pkgfv .pkui-b { padding:13px 18px 16px; }
        .pkgfv .pkln { display:flex; align-items:center; gap:9px; font-size:12.5px; color:#5f5044; padding:4px 0; }
        .pkgfv .pkln .d { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
        .pkgfv .winrow { margin-top:11px; background:#fdf1ec; border-left:4px solid var(--burg); border-radius:0 8px 8px 0; padding:9px 12px; }
        .pkgfv .winrow .wl { font-family:${FONT_MONO}; font-size:8px; letter-spacing:.08em; text-transform:uppercase; color:var(--burg); font-weight:500; }
        .pkgfv .winrow .wv { font-size:13.5px; font-weight:600; color:var(--ink); margin-top:2px; }
        .pkgfv .exlink { position:absolute; right:4px; bottom:0; font-family:${FONT_MONO}; font-size:8.5px; letter-spacing:.05em; color:var(--burg); text-decoration:underline; text-underline-offset:3px; cursor:pointer; background:none; border:0; padding:0; }
        .pkgfv .divrule { display:flex; align-items:center; gap:14px; margin:52px 24px 0; }
        .pkgfv .divrule::before, .pkgfv .divrule::after { content:''; flex:1; height:1px; background:#e6dac8; }
        .pkgfv .divrule span { font-family:${FONT_MONO}; font-size:8.5px; letter-spacing:.18em; text-transform:uppercase; color:#a4937f; }
        .pkgfv .contB { padding:14px 24px 8px; text-align:center; }
        .pkgfv .a2s { font-size:14px; color:#7a685a; margin:0 auto; max-width:560px; line-height:1.6; }
        .pkgfv .librow { display:flex; justify-content:center; gap:18px; margin-top:22px; flex-wrap:wrap; }
        .pkgfv .lib { flex:0 1 292px; background:#fffefb; border:var(--bdw) solid var(--bd); border-radius:12px; overflow:hidden; box-shadow:0 8px 20px rgba(58,28,20,.09); cursor:pointer; text-align:left; transition:transform .14s; padding:0; font:inherit; color:inherit; }
        .pkgfv .lib:hover { transform:translateY(-3px); }
        .pkgfv .lib-h { display:flex; align-items:center; gap:9px; padding:12px 17px; font-family:${FONT_MONO}; font-size:10.5px; letter-spacing:.1em; text-transform:uppercase; border-bottom:var(--bdw) solid var(--bd); }
        .pkgfv .lib-h.xl { background:var(--tl); color:var(--burg); }
        .pkgfv .lib-h.xs { background:var(--ts); color:var(--sage-d); }
        .pkgfv .lib-h.xp { background:var(--tp); color:var(--gold); }
        .pkgfv .lib-b { padding:20px 18px 22px; }
        .pkgfv .lt2 { font-family:${FONT_MONO}; font-size:9px; letter-spacing:.14em; text-transform:uppercase; color:#b3a291; }
        /* NB: NOT ".ti" — that class is Tabler Icons (icon font, !important) and would mangle the title. */
        .pkgfv .libti { font-family:${FONT_SERIF}; font-size:19.5px; font-weight:700; color:var(--ink); margin:6px 0 15px; }
        .pkgfv .extag { margin-left:auto; font-family:${FONT_MONO}; font-size:7px; letter-spacing:.12em; text-transform:uppercase; background:rgba(255,255,255,.55); border-radius:4px; padding:2px 5px; }
        .pkgfv .lfchip { display:inline-flex; align-items:center; gap:7px; background:#fdfaf5; border:1px solid #e4d8c6; border-radius:8px; padding:9px 12px; font-family:${FONT_MONO}; font-size:10.5px; color:#5d5247; max-width:100%; }
        .pkgfv .lfchip svg { flex-shrink:0; }
        .pkgfv .lfchip .v { background:var(--pink); color:var(--burg); border-radius:4px; padding:2px 6px; font-size:9px; }
        .pkgfv .used { font-family:${FONT_MONO}; font-size:9.5px; letter-spacing:.06em; color:var(--muted); margin-top:16px; }
        .pkgfv .used b { color:var(--burg); font-weight:500; }
        @media (prefers-reduced-motion: reduce) { .pkgfv .star { animation:none; } .pkgfv .rt { transition:none; } }
        @media (max-width: 900px) { .pkgfv .rt { display:none; } }
      `}</style>

      {/* Split stage — headline + CTA | cycling product-UI demo */}
      <div className="st2">
        <div className="lt">
          <h2>
            <span className="rel">Find
              <svg className="star" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" /></svg>
            </span> out what <span className="wr">wins requests</span>
          </h2>
          <div className="sl">Send different versions of your submission. ScriptAlly tracks which one gets agents asking for more.</div>
          <button type="button" className="build" onClick={onBuild}>＋ Build your first package</button>
        </div>

        <div className="rt" style={{ opacity: visible ? 1 : 0 }} onMouseEnter={() => { hover.current = true; }} onMouseLeave={() => { hover.current = false; }}>
          <div className="pile" aria-hidden="true"><i /><i /></div>
          <div className="pgui" style={{ ["--hlc" as string]: d.hl } as React.CSSProperties}>
            <span className="mt">Query letter</span>
            <div className="tx" dangerouslySetInnerHTML={{ __html: d.tx }} />
          </div>
          <div className="pkui">
            <div className="pkui-h" style={{ background: d.tint }}>
              <span className="ic" dangerouslySetInnerHTML={{ __html: ICONS[d.key] }} />
              <span className="nm">{d.name}</span>
              <span className="tagp">Package</span>
            </div>
            <div className="pkui-b">
              {d.lines.map(([colour, label], i) => (
                <div key={i} className="pkln"><span className="d" style={{ background: colour }} />{label}</div>
              ))}
              <div className="winrow"><div className="wl">{d.wl}</div><div className="wv">{d.wv}</div></div>
            </div>
          </div>
          <button type="button" className="exlink" onClick={() => onExample(d.key)}>See this example in full →</button>
        </div>
      </div>

      {/* Divider + illustrative library cards */}
      <div className="divrule"><span>Curate your library of materials</span></div>
      <div className="contB">
        <div className="a2s">Name each component, pin the actual file so you never lose track, then re-use it across multiple packages.</div>
        <div className="librow">
          {LIB_EXAMPLES.map((c) => (
            <button type="button" key={c.type} className="lib" onClick={() => onCreate(c.type)}>
              <div className={`lib-h ${c.head}`}><TypeGlyph type={c.type} size={14} />{c.label}<span className="extag">Example</span></div>
              <div className="lib-b">
                <div className="lt2">Title</div>
                <div className="libti">{c.title}</div>
                <span className="lfchip">{docIcon}{c.file}<span className="v">{c.ver}</span></span>
                <div className="used">{c.used}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
