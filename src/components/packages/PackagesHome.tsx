/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PackagesHome — the Package Builder home once the manuscript has ≥1 package (Phase 6). "Your packages
 * · N" + a band-coloured "＋ New package" (page-primary), a responsive grid of package cards, a dotted
 * "＋ New package" ghost, and a footer linking the worked examples. Each card shows the package name, a
 * content line per slot (glyph + material identity, or a muted "No …" for an unfilled slot), a derived
 * stats line, and Edit · Copy · Attach-to-query. Ported from the mockup #home-packages; stats are
 * derived at read time from the queries — nothing is stored. Attach-to-query is a stub this build.
 */
import React from "react";
import { SubmissionPackage, ManuscriptVersion, Query, ComponentType } from "../../types";
import { TypeGlyph } from "./TypeGlyph";
import { TYPE_META, BUILDER_TYPES, SLOT_FIELD } from "./typeMeta";
import { isSlotFilled, isRequest, reachedFull } from "../../lib/packageMetrics";
import { FONT_SERIF, FONT_MONO } from "../../lib/designTokens";

/** Derived stats line for a package: "SENT WITH n QUERIES · <highlight>" (nothing stored). */
const statsLine = (pkgId: string, queries: Query[]): React.ReactNode => {
  const mine = queries.filter((q) => q.packageId === pkgId);
  const sent = mine.length;
  if (sent === 0) return "NOT YET SENT WITH A QUERY";
  const full = mine.filter(reachedFull).length;
  const partial = mine.filter(isRequest).length - full;
  const sentStr = `SENT WITH ${sent} ${sent === 1 ? "QUERY" : "QUERIES"}`;
  let outcome: React.ReactNode = "AWAITING REPLY";
  if (full > 0) outcome = <b>{full} FULL REQUEST{full === 1 ? "" : "S"}</b>;
  else if (partial > 0) outcome = <b>{partial} PARTIAL REQUEST{partial === 1 ? "" : "S"}</b>;
  return <>{sentStr} · {outcome}</>;
};

export interface PackagesHomeProps {
  packages: SubmissionPackage[];
  versions: ManuscriptVersion[];
  queries: Query[];
  /** Open the composer for a new package (Phase 7). */
  onNew: () => void;
  /** Open the composer to edit / copy a package (Phase 7). */
  onEdit: (pkg: SubmissionPackage) => void;
  onCopy: (pkg: SubmissionPackage) => void;
}

export const PackagesHome: React.FC<PackagesHomeProps> = ({ packages, versions, queries, onNew, onEdit, onCopy }) => (
  <div className="pkghome">
    <style>{`
      .pkghome .hp-head { display:flex; align-items:center; gap:12px; margin-bottom:14px; }
      .pkghome .hp-title { font-family:${FONT_SERIF}; font-size:19px; font-weight:700; color:var(--ink); }
      .pkghome .hp-new { margin-left:auto; font-family:${FONT_SERIF}; font-size:14px; font-weight:600; color:var(--ink); background:var(--band); border:var(--bdw) solid var(--bd); border-radius:10px; padding:9px 18px; cursor:pointer; transition:filter .15s; }
      .pkghome .hp-new:hover { filter:brightness(.97); }
      .pkghome .hp-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(250px,1fr)); gap:14px; }
      .pkghome .pkcard2 { background:#fffefb; border:var(--bdw) solid var(--bd); border-radius:10px; overflow:hidden; }
      .pkghome .pk2head { background:var(--band); padding:10px 15px; border-bottom:var(--bdw) solid var(--bd); }
      .pkghome .pn2 { font-family:${FONT_SERIF}; font-size:15.5px; font-weight:700; color:var(--ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .pkghome .pk2body { padding:11px 15px 13px; }
      .pkghome .pkline2 { display:flex; align-items:center; gap:8px; font-size:11.5px; color:#6a5a50; padding:3px 0; }
      .pkghome .pkline2 .pgi { display:inline-flex; flex-shrink:0; }
      .pkghome .pkline2 .pgt { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0; }
      .pkghome .pkline2.dim { color:var(--muted); font-style:italic; }
      .pkghome .pkstats2 { font-family:${FONT_MONO}; font-size:8px; letter-spacing:.05em; color:var(--muted); margin:9px 0 10px; padding-top:8px; border-top:1px dashed #e4d8c8; }
      .pkghome .pkstats2 b { color:var(--sage-d); font-weight:500; }
      .pkghome .pk2acts { display:flex; gap:12px; }
      .pkghome .pk2a { font-family:${FONT_MONO}; font-size:8.5px; letter-spacing:.04em; color:var(--burg); cursor:pointer; background:none; border:0; padding:0; }
      .pkghome .pk2a:hover { text-decoration:underline; }
      .pkghome .pk2a.stub { color:var(--muted); cursor:default; }
      .pkghome .pk2a.stub:hover { text-decoration:none; }
      .pkghome .pkghost { border:1.5px dotted #bfae9a; border-radius:10px; min-height:170px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; color:#a4937f; cursor:pointer; font-size:13px; background:none; }
      .pkghome .pkghost:hover { border-color:var(--burg); color:var(--burg); background:rgba(124,58,42,.03); }
    `}</style>

    <div className="hp-head">
      <span className="hp-title">Your packages · {packages.length}</span>
      <button type="button" className="hp-new" onClick={onNew}>＋ New package</button>
    </div>

    <div className="hp-grid">
      {packages.map((pkg) => (
        <div key={pkg.id} className="pkcard2">
          <div className="pk2head"><div className="pn2">{pkg.packageName}</div></div>
          <div className="pk2body">
            {BUILDER_TYPES.map((type) => {
              const m = TYPE_META[type];
              const vid = pkg[SLOT_FIELD[type]];
              const v = isSlotFilled(vid) ? versions.find((x) => x.id === vid) : undefined;
              if (!v) return <div key={type} className="pkline2 dim">No {m.label.toLowerCase()}</div>;
              const ident = v.versionName + (v.fileName ? ` — …${v.fileName}` : "");
              return (
                <div key={type} className="pkline2">
                  <span className="pgi" style={{ color: m.ink }}><TypeGlyph type={type} size={10} /></span>
                  <span className="pgt">{ident}</span>
                </div>
              );
            })}
            <div className="pkstats2">{statsLine(pkg.id, queries)}</div>
            <div className="pk2acts">
              <button type="button" className="pk2a" onClick={() => onEdit(pkg)}>✎ Edit</button>
              <button type="button" className="pk2a" onClick={() => onCopy(pkg)}>⧉ Copy</button>
              <button type="button" className="pk2a stub" title="Coming soon" aria-disabled="true">Attach to query →</button>
            </div>
          </div>
        </div>
      ))}

      <button type="button" className="pkghost" onClick={onNew}>＋<span>New package</span></button>
    </div>
  </div>
);
