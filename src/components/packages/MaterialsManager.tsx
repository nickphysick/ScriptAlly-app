/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MaterialsManager — the "sheet gallery" opened from "Manage all materials →". One shelf per material
 * type (Query letters / Synopses / Sample pages), each a header pill (glyph + plural + count) over a
 * row of 196px "page-top" sheets: type pill, Playfair title, file chip, a serif preview that fades to
 * white before the bottom edge (CSS mask), and a derived used-in footer ("IN 2 PACKAGES · 3 SENT
 * QUERIES" / "UNUSED"). A dashed ghost tile ends each shelf as the sole add affordance; an empty
 * shelf's ghost is wider and carries a teaching line. Sheets open the material's edit modal (P9).
 * Ported from the mockup #v-mgr. NB: title/preview/used classes are .mti/.mtx/.musd (NOT ".ti" —
 * that is Tabler Icons and would mangle the text).
 */
import React from "react";
import { ManuscriptVersion, SubmissionPackage, Query, ComponentType } from "../../types";
import { TypeGlyph } from "./TypeGlyph";
import { TYPE_META, BUILDER_TYPES } from "./typeMeta";
import {
  packagesUsingVersion, componentMetrics, versionSnippet, versionMeta, formatRate,
  bestVersionOfType, mostUsedVersionOfType, meetsSampleThreshold,
} from "../../lib/packageMetrics";
import { FONT_SERIF, FONT_MONO } from "../../lib/designTokens";

const SHORT: Record<string, "tl" | "ts" | "tp"> = {
  [ComponentType.QUERY_LETTER]: "tl",
  [ComponentType.SYNOPSIS]: "ts",
  [ComponentType.SAMPLE_PAGES]: "tp",
};
const NOUN: Record<string, string> = {
  [ComponentType.QUERY_LETTER]: "letter",
  [ComponentType.SYNOPSIS]: "synopsis",
  [ComponentType.SAMPLE_PAGES]: "pages",
};
const GHOST_TEACH: Record<string, string> = {
  [ComponentType.QUERY_LETTER]: "Add the letter you actually send to agents",
  [ComponentType.SYNOPSIS]: "A one-page synopsis covers most agents",
  [ComponentType.SAMPLE_PAGES]: "Most UK agents want the first three chapters",
};

const fileIcon = (
  <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h9l5 5v13a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z" /><path d="M15 3v5h5M9 13h6M9 17h4" /></svg>
);
export interface MaterialsManagerProps {
  versions: ManuscriptVersion[];
  packages: SubmissionPackage[];
  queries: Query[];
  onBack: () => void;
  /** Open the edit modal for a material (Phase 9). */
  onEdit: (version: ManuscriptVersion) => void;
  /** Open the create modal for a type (Phase 9). */
  onCreate: (type: ComponentType) => void;
  /** Duplicate a material — opens the create modal seeded with "Copy of …" + the same text. */
  onDuplicate: (version: ManuscriptVersion) => void;
}

export const MaterialsManager: React.FC<MaterialsManagerProps> = ({ versions, packages, queries, onBack, onEdit, onCreate, onDuplicate }) => (
  <div className="pkgmgr">
    <style>{`
      .pkgmgr .backrow { display:flex; align-items:center; gap:12px; margin-bottom:6px; }
      /* Guided pass: one plain-English line under the heading — why this library exists. */
      .pkgmgr .mgr-sub { font-size:14px; color:#6a594d; line-height:1.6; margin:0 0 18px 46px; }
      .pkgmgr .vh-ic { width:34px; height:34px; border-radius:10px; background:linear-gradient(135deg,var(--band-a),var(--band-b)); color:var(--burg); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
      .pkgmgr .view-title { font-family:${FONT_SERIF}; font-size:23px; font-weight:700; color:var(--headT); }
      .pkgmgr .backbtn { margin-left:auto; font-family:${FONT_MONO}; font-size:10px; letter-spacing:.08em; text-transform:uppercase; background:var(--card); border:var(--bdw) solid var(--bd); color:var(--burg); border-radius:9px; padding:9px 14px; cursor:pointer; }
      .pkgmgr .backbtn:hover { background:#faeee8; }
      .pkgmgr .shelfwrap { display:flex; flex-direction:column; gap:22px; }
      .pkgmgr .shelf-h { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
      .pkgmgr .shelf-h .pg-tag { margin-bottom:0; }
      .pkgmgr .shelf { display:flex; gap:14px; flex-wrap:wrap; }
      .pkgmgr .pg-tag { display:inline-flex; align-items:center; gap:5px; font-family:${FONT_MONO}; font-size:8px; letter-spacing:.11em; text-transform:uppercase; border-radius:5px; padding:3px 8px; margin-bottom:9px; }
      .pkgmgr .pg-tag.tl { background:var(--tl); color:var(--burg); }
      .pkgmgr .pg-tag.ts { background:var(--ts); color:var(--sage-d); }
      .pkgmgr .pg-tag.tp { background:var(--tp); color:var(--gold); }
      /* Quiet Cappuccino: shelf-header + sheet pills go white/mocha with a hairline (pill rule). Bold keeps tints. */
      .t-capp .pkgmgr .pg-tag.tl, .t-capp .pkgmgr .pg-tag.ts, .t-capp .pkgmgr .pg-tag.tp { background:var(--btnBg); color:var(--btnT); border:1px solid var(--btnBd); }
      /* Richer material card (a size up from the old .mini sheet): a type-tinted header (glyph + type
         label + default star) over a body — Playfair title, snippet, on-brand pills, Edit + Duplicate.
         Header fill = the type tint in Bold/Editorial; Quiet Cappuccino retreats it to foam + burgundy,
         matching the established .pg-tag/.gch chrome decision. */
      .pkgmgr .mcard { width:266px; background:var(--card); border:var(--bdw) solid var(--bd); border-radius:11px; overflow:hidden; box-shadow:0 5px 14px rgba(58,28,20,.10); display:flex; flex-direction:column; }
      .t-bold .pkgmgr .mcard { box-shadow:none; }
      .pkgmgr .mc-head { display:flex; align-items:center; gap:9px; padding:11px 14px; }
      .pkgmgr .mc-head.tl { background:var(--tl); color:var(--burg); }
      .pkgmgr .mc-head.ts { background:var(--ts); color:var(--sage-d); }
      .pkgmgr .mc-head.tp { background:var(--tp); color:var(--gold); }
      .t-capp .pkgmgr .mc-head.tl, .t-capp .pkgmgr .mc-head.ts, .t-capp .pkgmgr .mc-head.tp { background:linear-gradient(135deg,var(--band-a),var(--band-b)); color:var(--burg); }
      .pkgmgr .mc-glyph { display:inline-flex; flex-shrink:0; }
      .pkgmgr .mc-type { font-family:${FONT_MONO}; font-size:8.5px; letter-spacing:.11em; text-transform:uppercase; font-weight:600; }
      .pkgmgr .mc-star { margin-left:auto; font-size:13px; line-height:1; color:var(--gold); flex-shrink:0; }
      .pkgmgr .mc-body { padding:13px 15px 15px; display:flex; flex-direction:column; gap:9px; flex:1; }
      .pkgmgr .mc-title { font-family:${FONT_SERIF}; font-size:16.5px; font-weight:700; color:var(--ink); line-height:1.25; }
      .pkgmgr .mc-snip { font-family:${FONT_SERIF}; font-size:11.5px; line-height:1.6; color:var(--ink); opacity:.72; max-height:56px; overflow:hidden; -webkit-mask-image:linear-gradient(#000 55%,transparent 92%); mask-image:linear-gradient(#000 55%,transparent 92%); }
      .pkgmgr .mc-snip.none { font-style:italic; opacity:1; color:var(--muted); -webkit-mask-image:none; mask-image:none; }
      .pkgmgr .mc-pills { display:flex; flex-wrap:wrap; gap:6px; }
      .pkgmgr .mc-pill { display:inline-flex; align-items:center; gap:4px; font-family:${FONT_MONO}; font-size:8px; letter-spacing:.05em; text-transform:uppercase; color:var(--muted); background:var(--selBg); border-radius:6px; padding:3px 8px; }
      .pkgmgr .mc-pill b { color:var(--headT); font-weight:700; }
      /* The best request rate of its type wears the accent (--sage-d, the builder's "this is working" colour). */
      .pkgmgr .mc-pill.best { color:var(--card); background:var(--sage-d); font-weight:600; }
      .pkgmgr .mc-pill.best b { color:var(--card); }
      .pkgmgr .mc-acts { display:flex; gap:8px; margin-top:2px; }
      /* Edit = the theme solid button; Duplicate = quiet ghost. */
      .pkgmgr .mc-edit { flex:1; font-family:${FONT_SERIF}; font-size:13px; font-weight:600; color:var(--btnT); background:var(--btnBg); border:var(--bdw) solid var(--btnBd); border-radius:9px; padding:8px 0; cursor:pointer; }
      .pkgmgr .mc-edit:hover { background:var(--btnH); }
      .pkgmgr .mc-dupe { font-family:${FONT_MONO}; font-size:9px; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); background:none; border:var(--bdw) solid var(--bd); border-radius:9px; padding:8px 12px; cursor:pointer; }
      .pkgmgr .mc-dupe:hover { color:var(--burg); border-color:var(--burg); }
      .pkgmgr .mini-add { width:196px; min-height:158px; border:1.5px dashed #cbb9a6; border-radius:6px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:7px; color:#a4937f; cursor:pointer; font-size:12px; text-align:center; padding:0 14px; background:none; }
      .pkgmgr .mini-add.wide { width:250px; }
      .pkgmgr .mini-add:hover { border-color:var(--burg); color:var(--burg); background:rgba(124,58,42,.03); }
    `}</style>

    <div className="backrow">
      <span className="vh-ic">{fileIcon}</span>
      <span className="view-title">Your materials</span>
      <button type="button" className="backbtn" onClick={onBack}>← Builder home</button>
    </div>

    <div className="mgr-sub">Everything here can be dropped into any package — write once, reuse everywhere.</div>

    <div className="shelfwrap">
      {BUILDER_TYPES.map((type) => {
        const m = TYPE_META[type];
        const tint = SHORT[type];
        const shelf = versions.filter((v) => v.componentType === type);
        // Per-shelf derivations: the best-performing version of this type (accent pill) and the
        // de-facto default (most-used → the star). Both null-safe on thin/tied data.
        const best = bestVersionOfType(type, versions, packages, queries);
        const dflt = mostUsedVersionOfType(type, versions, packages);
        return (
          <div key={type}>
            <div className="shelf-h">
              <span className={`pg-tag ${tint}`}><TypeGlyph type={type} size={11} /> {m.plural} · {shelf.length}</span>
            </div>
            <div className="shelf">
              {shelf.map((v) => {
                const snip = versionSnippet(v);
                const cm = componentMetrics(v.id, packages, queries);
                const inPkgs = packagesUsingVersion(v.id, packages).length;
                const meta = versionMeta(v);
                const enough = meetsSampleThreshold(cm.sent);
                return (
                  <div key={v.id} className="mcard">
                    <div className={`mc-head ${tint}`}>
                      <span className="mc-glyph"><TypeGlyph type={type} size={15} /></span>
                      <span className="mc-type">{m.label}</span>
                      {dflt?.id === v.id && <span className="mc-star" title="Your most-used — the default across your packages" aria-label="Most used">★</span>}
                    </div>
                    <div className="mc-body">
                      <div className="mc-title">{v.versionName}</div>
                      <div className={`mc-snip${snip ? "" : " none"}`}>{snip || "No preview yet — add the text in the editor."}</div>
                      <div className="mc-pills">
                        {cm.sent > 0 && (
                          <span className={`mc-pill${best?.version.id === v.id ? " best" : ""}`} title={enough ? "Attributed request rate" : "Early — a few more sends and this rate settles"}>
                            <b>{formatRate(cm.requestRate)}</b> req{enough ? "" : " · early"}
                          </span>
                        )}
                        <span className="mc-pill">{inPkgs > 0 ? <>in <b>{inPkgs}</b> pkg{inPkgs === 1 ? "" : "s"}</> : "unused"}</span>
                        {meta && <span className="mc-pill">{meta}</span>}
                      </div>
                      <div className="mc-acts">
                        <button type="button" className="mc-edit" onClick={() => onEdit(v)}>Edit</button>
                        <button type="button" className="mc-dupe" onClick={() => onDuplicate(v)} title={`Duplicate ${v.versionName}`}>Duplicate</button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {shelf.length === 0 ? (
                <button type="button" className="mini-add wide" onClick={() => onCreate(type)}>＋<span>{GHOST_TEACH[type]}</span></button>
              ) : (
                <button type="button" className="mini-add" onClick={() => onCreate(type)}>＋<span>New {NOUN[type]}</span></button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
