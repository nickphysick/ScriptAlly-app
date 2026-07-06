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
import { packagesUsingVersion, componentMetrics, versionSnippet } from "../../lib/packageMetrics";
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
const docIcon = (
  <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round"><path d="M14 3H6a1 1 0 00-1 1v16a1 1 0 001 1h12a1 1 0 001-1V8z" /><path d="M14 3v5h5" /></svg>
);

const usedInText = (v: ManuscriptVersion, packages: SubmissionPackage[], queries: Query[]): React.ReactNode => {
  const inPkgs = packagesUsingVersion(v.id, packages).length;
  if (inPkgs === 0) return "UNUSED";
  const sent = componentMetrics(v.id, packages, queries).sent;
  return <>IN <b>{inPkgs} PACKAGE{inPkgs === 1 ? "" : "S"}</b>{sent > 0 ? ` · ${sent} SENT QUER${sent === 1 ? "Y" : "IES"}` : ""}</>;
};

export interface MaterialsManagerProps {
  versions: ManuscriptVersion[];
  packages: SubmissionPackage[];
  queries: Query[];
  onBack: () => void;
  /** Open the edit modal for a material (Phase 9). */
  onEdit: (version: ManuscriptVersion) => void;
  /** Open the create modal for a type (Phase 9). */
  onCreate: (type: ComponentType) => void;
}

export const MaterialsManager: React.FC<MaterialsManagerProps> = ({ versions, packages, queries, onBack, onEdit, onCreate }) => (
  <div className="pkgmgr">
    <style>{`
      .pkgmgr .backrow { display:flex; align-items:center; gap:12px; margin-bottom:18px; }
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
      .pkgmgr .mini { width:196px; background:#fffefb; border:var(--bdw) solid var(--bd); border-radius:6px; padding:12px 13px 0; box-shadow:0 5px 14px rgba(58,28,20,.12); position:relative; cursor:pointer; transition:transform .14s; text-align:left; display:block; }
      .t-bold .pkgmgr .mini { border:1.5px solid #1d1712; }
      .pkgmgr .mini:hover { transform:translateY(-3px); }
      .pkgmgr .mti { font-family:${FONT_SERIF}; font-size:13px; font-weight:600; color:var(--ink); margin:7px 0 5px; }
      .pkgmgr .filechip { display:inline-flex; align-items:center; gap:7px; max-width:100%; background:#fffefb; border:var(--bdw) solid var(--bd); border-radius:7px; padding:5px 9px; font-family:${FONT_MONO}; font-size:8.5px; color:#5d5247; margin:0 0 8px; }
      .t-bold .pkgmgr .filechip { border:1.5px solid #1d1712; }
      .pkgmgr .filechip svg { flex-shrink:0; }
      .pkgmgr .filechip .fn { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .pkgmgr .mtx { font-family:${FONT_SERIF}; font-size:9.4px; line-height:1.65; color:#5a4a3e; max-height:64px; overflow:hidden; -webkit-mask-image:linear-gradient(#000 45%,transparent 88%); mask-image:linear-gradient(#000 45%,transparent 88%); }
      .pkgmgr .mtx.none { font-style:italic; color:var(--muted); }
      .pkgmgr .musd { font-family:${FONT_MONO}; font-size:7.5px; letter-spacing:.06em; color:var(--muted); padding:7px 0 9px; position:relative; z-index:2; }
      .pkgmgr .musd b { color:var(--burg); font-weight:500; }
      .pkgmgr .mini-add { width:196px; min-height:158px; border:1.5px dashed #cbb9a6; border-radius:6px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:7px; color:#a4937f; cursor:pointer; font-size:12px; text-align:center; padding:0 14px; background:none; }
      .pkgmgr .mini-add.wide { width:250px; }
      .pkgmgr .mini-add:hover { border-color:var(--burg); color:var(--burg); background:rgba(124,58,42,.03); }
    `}</style>

    <div className="backrow">
      <span className="vh-ic">{fileIcon}</span>
      <span className="view-title">Your materials</span>
      <button type="button" className="backbtn" onClick={onBack}>← Builder home</button>
    </div>

    <div className="shelfwrap">
      {BUILDER_TYPES.map((type) => {
        const m = TYPE_META[type];
        const tint = SHORT[type];
        const shelf = versions.filter((v) => v.componentType === type);
        return (
          <div key={type}>
            <div className="shelf-h">
              <span className={`pg-tag ${tint}`}><TypeGlyph type={type} size={11} /> {m.plural} · {shelf.length}</span>
            </div>
            <div className="shelf">
              {shelf.map((v) => {
                const snip = versionSnippet(v);
                return (
                  <button type="button" key={v.id} className="mini" onClick={() => onEdit(v)}>
                    <span className={`pg-tag ${tint}`}>{m.label}</span>
                    <div className="mti">{v.versionName}</div>
                    <div className="filechip">{docIcon}<span className="fn">{v.fileName || "No file attached"}</span></div>
                    <div className={`mtx${snip ? "" : " none"}`}>{snip || "No preview yet — add the text in the editor."}</div>
                    <div className="musd">{usedInText(v, packages, queries)}</div>
                  </button>
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
