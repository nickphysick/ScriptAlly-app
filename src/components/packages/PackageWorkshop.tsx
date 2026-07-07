/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PackageWorkshop — the single-page rebuild of the Submission Package Builder (ref
 * design-refs/scriptally-workshop-themed.html). Two on-brand framed windows on the desk beneath the
 * qhbar: the WORKSHOP (materials palette + active-package bench + other-packages grid) and PACKAGE
 * ANALYTICS (scope-toggled this-package / all-packages). Building is drag-and-drop with a first-class
 * click fallback; everything happens on one surface with a dirty in-memory draft + save/discard.
 *
 * Same data model + engine as the old builder — a new UI over `versions` + `packages` +
 * packageMetrics. The host provides the qhbar/desk chrome; this component renders the two windows.
 *
 * PHASE 1 (this commit): the two-window shell + band-fill headers (text/icons on --hdrOn) + white
 * bodies + the region frames (palette | building split, analytics scope + body) + the full theme
 * token scaffold. The palette chips, the interactive bench, the other-packages grid and the live
 * analytics land in Phases 2–5; their zones show skeletal placeholders here.
 *
 * Theme: consumes existing tokens; --hdrOn is added per theme in index.css. Workshop-local --wk-*
 * tokens carry the per-theme accents — burgundy (build) + sage (win) in Cappuccino/Bold collapse to
 * Editorial's single graphite accent (--acc), which is honest to its system (the mock's Editorial
 * hexes + charcoal masthead are NOT trusted — Editorial rides its real .t-edn values). No color-mix:
 * the two burgundy/graphite alpha tints are pre-computed rgba per the standing rule.
 */
import React, { useState } from "react";
import { ManuscriptVersion, SubmissionPackage, Query, ComponentType } from "../../types";
import { TypeGlyph } from "./TypeGlyph";
import { TYPE_META, BUILDER_TYPES } from "./typeMeta";
import { FONT_SERIF, FONT_MONO } from "../../lib/designTokens";

/** Workshop-window header icon (tool) + analytics-window header icon (bar chart), from the ref. */
const toolIcon = (
  <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 005.4-5.4l-2.5 2.5-2.1-.4-.4-2.1z" /></svg>
);
const chartIcon = (
  <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M4 20h16" /></svg>
);
const pencilIcon = (
  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20h4L18 10l-4-4L4 16z" /><path d="M13 7l4 4" /></svg>
);

export interface PackageWorkshopProps {
  versions: ManuscriptVersion[];
  packages: SubmissionPackage[];
  queries: Query[];
  /** Inline create from the palette — host calls addVersion (fileAttached:false, contentType:'text'). */
  onCreateVersion: (type: ComponentType, name: string) => void;
  /** Full text edit — host opens MaterialModal for the version. */
  onEditVersion: (version: ManuscriptVersion) => void;
}

export const PackageWorkshop: React.FC<PackageWorkshopProps> = ({ versions, packages, onCreateVersion, onEditVersion }) => {
  // Inline-create state for the palette (P2): which group is showing its name input, and its value.
  const [newInType, setNewInType] = useState<ComponentType | null>(null);
  const [newName, setNewName] = useState("");

  const commitNew = (type: ComponentType) => {
    const name = newName.trim();
    if (name) onCreateVersion(type, name);
    setNewInType(null);
    setNewName("");
  };

  return (
    <div className="pkgwk">
      <style>{`
        /* ── Workshop-local tokens. Cappuccino sampled from the ref; Bold sampled; Editorial rides its
           REAL .t-edn tokens (graphite single accent — no burgundy/sage/gold in its system). ── */
        .pkgwk { --wk-burg:var(--burg); --wk-acc:var(--sage-d); --wk-gold:var(--gold);
          --wk-bar:#eee2d2; --wk-dash:#c9bca8; --wk-dashd:#e7dbc9;
          --wk-pulse:rgba(124,58,42,.16); --wk-scopebg:rgba(124,58,42,.07); --wk-flash:#e9f0e9; }
        .t-bold .pkgwk { --wk-bar:#e7d3cc; --wk-dash:#caa99f; --wk-dashd:#e3cfc9; }
        .t-edn .pkgwk { --wk-burg:var(--acc); --wk-acc:var(--acc); --wk-gold:var(--muted);
          --wk-bar:var(--abtn-bg); --wk-dash:var(--bd); --wk-dashd:var(--bd);
          --wk-pulse:rgba(68,72,77,.16); --wk-scopebg:rgba(68,72,77,.07); --wk-flash:#eef0f2; }

        /* ── Two-window shell ── */
        .pkgwk .wk-windows { display:flex; gap:24px; align-items:stretch; min-height:640px; }
        .pkgwk .wk-win { background:var(--card); border:var(--bdw) solid var(--bd); border-radius:16px; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 8px 26px rgba(40,28,18,.10); }
        .pkgwk .wk-workshop { flex:1; min-width:0; }
        .pkgwk .wk-analytics { width:376px; flex-shrink:0; }
        .pkgwk .wk-h { display:flex; align-items:center; gap:13px; padding:18px 28px; background:linear-gradient(135deg,var(--band-a),var(--band-b)); border-bottom:var(--bdw) solid var(--bd); }
        .pkgwk .wk-ri { color:var(--hdrOn); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .pkgwk .wk-h h3 { font-family:${FONT_SERIF}; font-size:19px; font-weight:800; color:var(--hdrOn); }
        .pkgwk .wk-tag { margin-left:auto; font-family:${FONT_MONO}; font-size:8.5px; letter-spacing:.1em; text-transform:uppercase; color:var(--hdrOn); opacity:.55; }

        /* Workshop body: palette | building split */
        .pkgwk .wk-body { display:flex; flex:1; min-height:0; }
        .pkgwk .wk-palette { background:var(--card); border-right:var(--bdw) solid var(--bd); padding:22px; width:258px; flex-shrink:0; overflow-y:auto; }
        .pkgwk .wk-building { flex:1; min-width:0; padding:28px 32px; overflow-y:auto; background:var(--card); }
        .pkgwk .pal-lab { font-family:${FONT_MONO}; font-size:8px; letter-spacing:.12em; text-transform:uppercase; color:var(--muted); margin-bottom:15px; }
        .pkgwk .palgroup { margin-bottom:22px; }
        .pkgwk .palgroup-h { display:flex; align-items:center; gap:8px; font-family:${FONT_MONO}; font-size:8.5px; letter-spacing:.06em; text-transform:uppercase; color:var(--hdr); margin-bottom:11px; }
        .pkgwk .palgroup-h .g { color:var(--wk-burg); display:inline-flex; }
        /* Palette chips (draggable + clickable) + inline create (ref .chip / .newchip / .newin) */
        .pkgwk .chip { display:flex; align-items:center; gap:11px; background:var(--card); border:var(--bdw) solid var(--bd); border-radius:10px; padding:12px 13px; margin-bottom:9px; cursor:grab; transition:box-shadow .12s,transform .12s; box-shadow:0 1px 2px rgba(40,28,18,.04); text-align:left; width:100%; font:inherit; color:inherit; }
        .pkgwk .chip:hover { box-shadow:0 5px 14px rgba(58,28,20,.12); transform:translateY(-1px); }
        .pkgwk .chip.dragging { opacity:.4; }
        .pkgwk .chip .cg { width:28px; height:28px; border-radius:8px; background:var(--selBg); color:var(--wk-burg); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .pkgwk .chip .cmid { min-width:0; flex:1; }
        .pkgwk .chip .cn { font-family:${FONT_SERIF}; font-size:14.5px; font-weight:600; line-height:1.12; color:var(--ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .pkgwk .chip .cf { font-family:${FONT_MONO}; font-size:7.5px; color:var(--muted); margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .pkgwk .chip .cedit { color:var(--wk-dash); cursor:pointer; background:none; border:0; padding:2px; display:flex; opacity:0; transition:opacity .12s,color .12s; flex-shrink:0; }
        .pkgwk .chip:hover .cedit, .pkgwk .chip:focus-within .cedit { opacity:1; }
        .pkgwk .chip .cedit:hover { color:var(--wk-burg); }
        .pkgwk .chip .grip { color:var(--wk-dash); font-size:13px; letter-spacing:-2px; flex-shrink:0; }
        .pkgwk .newchip { display:flex; align-items:center; gap:8px; border:1.5px dashed var(--wk-dash); border-radius:10px; padding:11px 13px; color:var(--muted); cursor:pointer; font-size:12px; font-style:italic; background:none; width:100%; text-align:left; }
        .pkgwk .newchip:hover { border-color:var(--wk-burg); color:var(--wk-burg); }
        .pkgwk .newin { width:100%; border:1.5px solid var(--wk-burg); border-radius:10px; padding:10px 12px; font-family:${FONT_SERIF}; font-size:13.5px; outline:none; background:var(--card); color:var(--ink); }
        .pkgwk .newin::placeholder { color:var(--muted); font-style:italic; }
        .pkgwk .bench-lab { font-family:${FONT_MONO}; font-size:9.5px; letter-spacing:.1em; text-transform:uppercase; color:var(--wk-burg); display:flex; align-items:center; gap:9px; margin-bottom:16px; }
        .pkgwk .bench-lab .dotp { width:9px; height:9px; border-radius:50%; background:var(--wk-burg); box-shadow:0 0 0 4px var(--wk-pulse); flex-shrink:0; }

        /* Analytics body: scope toggle + panel */
        .pkgwk .wk-scope { display:flex; gap:3px; background:var(--wk-scopebg); border-radius:9px; padding:3px; margin:20px 22px 0; }
        .pkgwk .wk-scope button { flex:1; font-family:${FONT_MONO}; font-size:9px; border:0; background:transparent; color:var(--muted); padding:10px 4px; border-radius:7px; cursor:pointer; text-transform:uppercase; }
        .pkgwk .wk-scope button.on { background:var(--card); color:var(--wk-burg); font-weight:600; box-shadow:0 1px 2px rgba(58,28,20,.1); }
        .t-edn .pkgwk .wk-scope button.on { color:var(--wk-acc); }
        .pkgwk .wk-anbody { padding:22px 24px; overflow-y:auto; flex:1; }

        /* Phase-1 skeletal placeholder (removed as each zone is built out) */
        .pkgwk .wk-skel { font-family:${FONT_SERIF}; font-style:italic; font-size:13px; color:var(--muted); line-height:1.6; }

        @media (max-width: 1040px) { .pkgwk .wk-windows { flex-direction:column; } .pkgwk .wk-analytics { width:auto; } }
        @media (max-width: 720px) { .pkgwk .wk-body { flex-direction:column; } .pkgwk .wk-palette { width:auto; border-right:0; border-bottom:var(--bdw) solid var(--bd); } }
      `}</style>

      <div className="wk-windows">
        {/* WORKSHOP window */}
        <section className="wk-win wk-workshop">
          <div className="wk-h"><span className="wk-ri">{toolIcon}</span><h3>Workshop</h3><span className="wk-tag">build &amp; assemble</span></div>
          <div className="wk-body">
            <div className="wk-palette">
              <div className="pal-lab">Your materials — drag or click to use</div>
              {BUILDER_TYPES.map((t) => {
                const items = versions.filter((v) => v.componentType === t);
                const noun = TYPE_META[t].label.toLowerCase();
                return (
                  <div key={t} className="palgroup">
                    <div className="palgroup-h"><span className="g"><TypeGlyph type={t} size={13} /></span>{TYPE_META[t].plural}</div>
                    {items.map((v) => (
                      // Draggable (DnD wired in P3) + a hover edit pencil → MaterialModal. Click-to-use lands in P3.
                      <div key={v.id} className="chip" draggable data-mat={v.id}>
                        <span className="cg"><TypeGlyph type={t} size={14} /></span>
                        <div className="cmid">
                          <div className="cn">{v.versionName}</div>
                          {v.fileName && <div className="cf">{v.fileName}</div>}
                        </div>
                        <button type="button" className="cedit" aria-label={`Edit ${v.versionName}`} onClick={(e) => { e.stopPropagation(); onEditVersion(v); }}>{pencilIcon}</button>
                        <span className="grip" aria-hidden="true">⋮⋮</span>
                      </div>
                    ))}
                    {newInType === t ? (
                      <input
                        className="newin"
                        autoFocus
                        value={newName}
                        placeholder={`Name your ${noun}…`}
                        aria-label={`Name your new ${noun}`}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") commitNew(t); if (e.key === "Escape") { setNewInType(null); setNewName(""); } }}
                        onBlur={() => { setNewInType(null); setNewName(""); }}
                      />
                    ) : (
                      <button type="button" className="newchip" onClick={() => { setNewInType(t); setNewName(""); }}>＋ New {noun}</button>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="wk-building">
              <div className="bench-lab"><span className="dotp" />Active package — drag materials from the left, or click to add</div>
              <div className="wk-skel">The editable bench, save/discard and the other-packages grid land in Phases 3–4.</div>
            </div>
          </div>
        </section>

        {/* ANALYTICS window */}
        <section className="wk-win wk-analytics">
          <div className="wk-h"><span className="wk-ri">{chartIcon}</span><h3>Package analytics</h3></div>
          <div className="wk-scope">
            <button type="button" className="on">This package</button>
            <button type="button">All packages</button>
          </div>
          <div className="wk-anbody">
            <div className="wk-skel">Result hero, readiness checklist and the cross-package leaderboard ({packages.length} package{packages.length === 1 ? "" : "s"}) arrive in Phase 5 — reusing the packageMetrics engine.</div>
          </div>
        </section>
      </div>
    </div>
  );
};
