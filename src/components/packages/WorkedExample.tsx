/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * WorkedExample — the worked-examples popup (mockup #exModal), opened from the first-visit demo
 * stack's "See this example in full →". One example package at a time ("The Lighthouse at Wick
 * Point" demo book), keyed to the carousel slides: sl = Comp-led, ss = Character-led, sp =
 * Personalised. An 860px card: per-example gradient band (icon tile + title + ✕), then a "desk" —
 * two rotated page-tops (query letter + synopsis, serif text fading out mid-page) over a blurred
 * manuscript pile that stands in for the sample pages (the mockup defines pages text but never
 * renders it — the pile is its stand-in, kept faithfully) — an ⓘ strategy note beneath, and a
 * centred "Use this package as a starting point" foot button (onUse; the mockup leaves its
 * behaviour undefined — the host opens a fresh composer).
 *
 * Scrim/close conventions mirror MaterialModal: fixed scrim, Escape + backdrop-mousedown + ✕,
 * lockStageScroll while open. Scoped under .pkgex; no bare .ti (Tabler Icons collision).
 */
import React, { useEffect } from "react";
import { lockStageScroll } from "../../lib/stageScroll";
import { FONT_SERIF, FONT_MONO, FONT_SANS } from "../../lib/designTokens";

interface ExampleDef {
  title: string;
  /** header band gradient + icon ink, sampled per example from the mockup. */
  grad: string;
  ink: string;
  icon: React.ReactNode;
  letter: React.ReactNode;
  synopsis: React.ReactNode;
  info: React.ReactNode;
}

/** Verbatim from the mockup EX/EXIC maps (sl / ss / sp). Unknown keys fall back to sl, as there. */
const EXAMPLES: Record<string, ExampleDef> = {
  sl: {
    title: "Comp-led package",
    grad: "linear-gradient(135deg,#f6ddd3,#f0d0c2)",
    ink: "var(--burg)",
    icon: (
      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" aria-hidden="true"><path d="M5 4h4v16H5zM9 5h4v15H9z" /><path d="M13.5 6.2l3.8-1 4 15.4-3.8 1z" /></svg>
    ),
    letter: (
      <>Dear Ms Hartley,<br /><br />THE LIGHTHOUSE AT WICK POINT is an 82,000-word literary mystery in the vein of <i>The Lamplighters</i> and <i>Magpie Murders</i>.<br /><br />When retired keeper Elspeth Marr finds a stranger&rsquo;s coat folded on the rocks below her light, she recognises the mending in its sleeve — her own stitching, from thirty years ago…</>
    ),
    synopsis: (
      <>THE LIGHTHOUSE AT WICK POINT is a literary mystery set on the north-east Scottish coast. ELSPETH MARR, 63, a retired lighthouse keeper, discovers a drowned stranger wearing a coat she mended in 1994 — the year her brother was declared lost at sea…</>
    ),
    info: (
      <>Leads every document with market position. The letter opens on title, word count and two recent comps; the synopsis names genre and setting in its first line; the pages open on plot. Commercial fiction — thrillers, romance, book-club — tends to favour this: comps are how agents judge where a book sits, and the guidance is two or three from the last few years.</>
    ),
  },
  ss: {
    title: "Character-led package",
    grad: "linear-gradient(135deg,#e9eee6,#dfe6db)",
    ink: "var(--sage-d)",
    icon: (
      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx={12} cy={8} r={3.6} /><path d="M5 20a7 7 0 0114 0" /><path d="M17.5 3.5l1.2 1.2M19.5 2.8l.4 1.6" /></svg>
    ),
    letter: (
      <>Dear Ms Hartley,<br /><br />Elspeth Marr has kept two things all her life: the Wick Point light, and a secret. When a drowned stranger washes ashore wearing a coat she mended thirty years ago, only one of them can survive the week.<br /><br />THE LIGHTHOUSE AT WICK POINT is an 82,000-word literary mystery…</>
    ),
    synopsis: (
      <>ELSPETH MARR has spent sixty-three years believing that keeping the light and keeping quiet were the same duty. Both certainties drown with the stranger who washes ashore in her brother&rsquo;s coat…</>
    ),
    info: (
      <>Leads every document with the protagonist. The letter skips the housekeeping and opens on Elspeth and the inciting incident; the synopsis begins inside her contradiction; the pages open in her voice rather than on the plot. Suits literary and voice-driven fiction, where the writing is the strongest card — the standard advice is to lead with your best selling point, and some agents prefer writers to jump straight to the pitch.</>
    ),
  },
  sp: {
    title: "Personalised package",
    grad: "linear-gradient(135deg,#f5e9d3,#f0e0c2)",
    ink: "var(--gold)",
    icon: (
      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 4h11a1 1 0 011 1v14a1 1 0 01-1 1H8z" /><path d="M8 4v16M4.5 7H8M4.5 12H8M4.5 17H8" /><path d="M13 10.6c.55-1.1 2.2-1.1 2.75 0 .55-1.1 2.2-1.1 2.75 0 .4.85-.45 1.9-2.75 3.4-2.3-1.5-3.15-2.55-2.75-3.4z" fill="currentColor" stroke="none" /></svg>
    ),
    letter: (
      <>Dear Ms Hartley,<br /><br />Your Manuscript Wishlist asks for coastal settings, older protagonists and secrets that surface slowly — so I hope THE LIGHTHOUSE AT WICK POINT might be a good fit for your list.<br /><br />When retired keeper Elspeth Marr finds a stranger&rsquo;s coat folded on the rocks below her light…</>
    ),
    synopsis: (
      <>A coastal mystery of long-buried family secrets: ELSPETH MARR, 63, has kept the Wick Point light — and a lie about her brother&rsquo;s death — for thirty years. When his coat comes back on a stranger&rsquo;s body, the tide starts returning everything she hid…</>
    ),
    info: (
      <>Leads with why this agent. The letter opens on her wish list; the synopsis foregrounds the themes it named (coast, older protagonist, slow secrets); the pages open on the imagery most likely to land with her. Works across genres and is what agents ask for most directly — mass, unpersonalised queries are the ones they say they ignore, and one specific line of research is enough. Best kept for priority agents, since each package is bespoke.</>
    ),
  },
};

export interface WorkedExampleProps {
  /** Carousel slide key (sl / ss / sp); unknown keys fall back to sl. */
  exKey: string;
  onClose: () => void;
  /** "Use this package as a starting point" — the host opens a fresh composer. */
  onUse: () => void;
}

export const WorkedExample: React.FC<WorkedExampleProps> = ({ exKey, onClose, onUse }) => {
  const d = EXAMPLES[exKey] ?? EXAMPLES.sl;

  useEffect(() => lockStageScroll(), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="pkgex" role="dialog" aria-modal="true" aria-label={d.title} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <style>{`
        .pkgex { position:fixed; inset:0; background:rgba(36,28,21,.45); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; }
        .pkgex .ex-modal { width:860px; max-width:96vw; background:var(--card); border:var(--bdw) solid var(--bd); border-radius:14px; box-shadow:0 18px 50px rgba(36,28,21,.3); position:relative; max-height:90vh; display:flex; flex-direction:column; }
        .t-capp .pkgex .ex-modal::after { content:''; position:absolute; inset:6px; border:1px solid var(--burg); pointer-events:none; border-radius:8px; }
        .pkgex .ex-head { padding:16px 22px; position:relative; z-index:9; display:flex; align-items:center; gap:12px; border-bottom:var(--bdw) solid var(--bd); border-radius:13px 13px 0 0; }
        .pkgex .ex-hic { width:34px; height:34px; border-radius:10px; background:rgba(255,254,251,.65); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .pkgex .ex-head h3 { font-family:${FONT_SERIF}; font-size:20px; font-weight:700; color:var(--ink); }
        .pkgex .ex-x { background:none; border:0; font-size:17px; color:var(--muted); cursor:pointer; position:relative; z-index:2; margin-left:auto; line-height:1; }
        .pkgex .ex-x:hover { color:var(--burg); }
        .pkgex .ex-body { padding:16px 26px 8px; overflow-y:auto; position:relative; z-index:1; }
        .pkgex .deskset { position:relative; width:640px; max-width:100%; margin:0 auto; padding:12px 0 4px; min-height:262px; }
        .pkgex .mspile { position:absolute; top:2px; left:50%; transform:translateX(-50%) rotate(-2deg); width:340px; height:210px; z-index:1; filter:blur(3px); opacity:.75; pointer-events:none; }
        .pkgex .mspile .sheetp { position:absolute; inset:0; background:#fbf7f0; border:1px solid #d9cdbc; border-radius:5px; box-shadow:0 4px 12px rgba(58,28,20,.1); }
        .t-bold .pkgex .mspile .sheetp { border-color:#7a7068; }
        .pkgex .mspile .p1 { transform:rotate(3.5deg) translate(14px,-6px); }
        .pkgex .mspile .p2 { transform:rotate(-2.5deg) translate(-12px,4px); }
        .pkgex .mspile .p3 { transform:rotate(1deg); }
        .pkgex .mspile .p3::before { content:''; position:absolute; inset:22px 26px auto 26px; height:130px; background:repeating-linear-gradient(180deg,#c9baa6 0 2px, transparent 2px 11px); opacity:.7; }
        .pkgex .pg { position:absolute; width:292px; background:#fffefb; border:var(--bdw) solid var(--bd); border-radius:6px 6px 0 0; border-bottom:0; padding:16px 17px 0; box-shadow:0 6px 18px rgba(58,28,20,.14); }
        .pkgex .pg::after { content:''; position:absolute; left:calc(-1 * var(--bdw)); right:calc(-1 * var(--bdw)); bottom:-2px; height:26px; background:linear-gradient(rgba(255,254,251,0), #fffefb 82%); pointer-events:none; }
        .pkgex .pg-let { top:26px; left:14px; transform:rotate(-1.1deg); z-index:3; }
        .pkgex .pg-syn { top:38px; right:14px; transform:rotate(1.2deg); z-index:2; }
        .pkgex .pg-tag { font-family:${FONT_MONO}; font-size:8px; letter-spacing:.11em; text-transform:uppercase; display:inline-block; border-radius:5px; padding:3px 8px; margin-bottom:9px; }
        .pkgex .pg-tag.tl { background:var(--tl); color:var(--burg); }
        .pkgex .pg-tag.ts { background:var(--ts); color:var(--sage-d); }
        .pkgex .pg-title { font-family:${FONT_SERIF}; font-size:13.5px; font-weight:600; color:var(--ink); margin-bottom:7px; }
        .pkgex .pg-txt { font-family:${FONT_SERIF}; font-size:10.8px; line-height:1.7; color:#4a3c32; max-height:118px; overflow:hidden; -webkit-mask-image:linear-gradient(#000 62%,transparent 97%); mask-image:linear-gradient(#000 62%,transparent 97%); }
        .pkgex .sheet-info { margin:6px 4px 0; padding:13px 14px; border-top:1px dashed #d8c9b8; font-family:${FONT_SANS}; font-size:12px; line-height:1.6; color:#7a6d60; position:relative; z-index:1; }
        .pkgex .sheet-info::before { content:'\\24D8  '; color:var(--burg); }
        .pkgex .ex-foot { display:flex; justify-content:center; padding:10px 22px 20px; position:relative; z-index:1; }
        .pkgex .sheet-use { font-family:${FONT_SERIF}; font-size:14.5px; font-weight:600; color:var(--ink); background:#fffefb; border:var(--bdw) solid var(--bd); border-radius:10px; padding:11px 26px; cursor:pointer; }
        .pkgex .sheet-use:hover { background:#faeee8; }
        @media (max-width:700px) {
          .pkgex .deskset { min-height:0; display:flex; flex-direction:column; gap:14px; align-items:center; }
          .pkgex .pg { position:static; transform:none; }
          .pkgex .mspile { display:none; }
        }
      `}</style>

      <div className="ex-modal">
        <div className="ex-head" style={{ background: d.grad }}>
          <span className="ex-hic" style={{ color: d.ink }}>{d.icon}</span>
          <h3>{d.title}</h3>
          <button type="button" className="ex-x" aria-label="Close" onClick={onClose}>✕</button>
        </div>

        <div className="ex-body">
          <div className="deskset">
            <div className="mspile" aria-hidden="true"><div className="sheetp p1" /><div className="sheetp p2" /><div className="sheetp p3" /></div>
            <div className="pg pg-let">
              <span className="pg-tag tl">Query letter</span>
              <div className="pg-title">The Lighthouse at Wick Point</div>
              <div className="pg-txt">{d.letter}</div>
            </div>
            <div className="pg pg-syn">
              <span className="pg-tag ts">Synopsis</span>
              <div className="pg-title">The Lighthouse at Wick Point</div>
              <div className="pg-txt">{d.synopsis}</div>
            </div>
          </div>
          <div className="sheet-info">{d.info}</div>
        </div>

        <div className="ex-foot">
          <button type="button" className="sheet-use" onClick={onUse}>Use this package as a starting point</button>
        </div>
      </div>
    </div>
  );
};
