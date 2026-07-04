/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PackagesHome — the Package Builder home once the manuscript has ≥1 package. Treatment "1 · List +
 * reading pane" from design-refs/scriptally-packages-composer-v2.html: a compact package list on the
 * left (name, three filled/empty type chips, one stat line) and a full reading pane on the right for
 * the selected package (a roomy row per material + big derived stat figures along the foot). Selection
 * is view state only; the first package is auto-selected. All stats derive at read time from the
 * queries via packageMetrics — nothing stored. Attach-to-query stays a stub this build.
 */
import React, { useState } from "react";
import { SubmissionPackage, ManuscriptVersion, Query, ComponentType } from "../../types";
import { TypeGlyph } from "./TypeGlyph";
import { TYPE_META, BUILDER_TYPES, SLOT_FIELD } from "./typeMeta";
import { isSlotFilled, isResponse, reachedFull } from "../../lib/packageMetrics";
import { FONT_SERIF, FONT_MONO } from "../../lib/designTokens";

/** l / s / p suffix for the tint classes, per type. */
const SHORT: Record<string, "l" | "s" | "p"> = {
  [ComponentType.QUERY_LETTER]: "l",
  [ComponentType.SYNOPSIS]: "s",
  [ComponentType.SAMPLE_PAGES]: "p",
};
const PILL_LABEL: Record<string, string> = {
  [ComponentType.QUERY_LETTER]: "Letter",
  [ComponentType.SYNOPSIS]: "Synopsis",
  [ComponentType.SAMPLE_PAGES]: "Pages",
};

interface Counts { sent: number; full: number; responded: number; awaiting: number; }
const countsFor = (pkgId: string, queries: Query[]): Counts => {
  const mine = queries.filter((q) => q.packageId === pkgId);
  const sent = mine.length;
  const full = mine.filter(reachedFull).length;
  const responded = mine.filter(isResponse).length;
  return { sent, full, responded, awaiting: sent - responded };
};

/** Short list-row stat line ("3 SENT · 1 FULL REQUEST" / "1 SENT · AWAITING REPLY"). */
const rowStat = (c: Counts): React.ReactNode => {
  if (c.sent === 0) return "NOT YET SENT";
  const partial = c.responded - c.full;
  const head = `${c.sent} SENT · `;
  if (c.full > 0) return <>{head}<b>{c.full} FULL REQUEST{c.full === 1 ? "" : "S"}</b></>;
  if (partial > 0) return <>{head}<b>{partial} PARTIAL REQUEST{partial === 1 ? "" : "S"}</b></>;
  return <>{head}AWAITING REPLY</>;
};

export interface PackagesHomeProps {
  packages: SubmissionPackage[];
  versions: ManuscriptVersion[];
  queries: Query[];
  onNew: () => void;
  onEdit: (pkg: SubmissionPackage) => void;
  onCopy: (pkg: SubmissionPackage) => void;
}

export const PackagesHome: React.FC<PackagesHomeProps> = ({ packages, versions, queries, onNew, onEdit, onCopy }) => {
  const [selectedId, setSelectedId] = useState<string | null>(packages[0]?.id ?? null);
  const selected = packages.find((p) => p.id === selectedId) ?? packages[0];

  return (
    <div className="pkglp">
      <style>{`
        .pkglp .lp { display:flex; gap:16px; min-height:340px; }
        .pkglp .lp-list { width:270px; flex-shrink:0; background:var(--card); border:var(--bdw) solid var(--bd); border-radius:11px; overflow:hidden; display:flex; flex-direction:column; }
        .t-bold .pkglp .lp-list { border:1.5px solid #1d1712; }
        .pkglp .lp-lh { padding:11px 15px; background:var(--band); border-bottom:var(--bdw) solid var(--bd); display:flex; align-items:center; }
        .pkglp .lp-lh h4 { font-family:${FONT_SERIF}; font-size:15px; font-weight:700; color:var(--ink); }
        .pkglp .np { margin-left:auto; font-family:${FONT_MONO}; font-size:8.5px; letter-spacing:.06em; color:var(--burg); cursor:pointer; background:rgba(255,254,251,.7); border-radius:6px; padding:5px 9px; border:0; }
        .pkglp .np:hover { background:#fffefb; }
        .pkglp .lprow { padding:13px 15px; border-bottom:1px dashed #e7dbc9; cursor:pointer; text-align:left; background:none; width:100%; display:block; }
        .pkglp .lprow:hover { background:#faf4ec; }
        .pkglp .lprow.on { background:#fdf1ec; border-left:3px solid var(--burg); padding-left:12px; }
        .pkglp .lprow .nm { font-family:${FONT_SERIF}; font-size:15px; font-weight:700; color:var(--ink); }
        .pkglp .lprow .glyphs { display:flex; gap:6px; margin:6px 0 5px; }
        .pkglp .gch { width:20px; height:20px; border-radius:6px; display:flex; align-items:center; justify-content:center; }
        .pkglp .gch.l { background:var(--tl); color:var(--burg); } .pkglp .gch.s { background:var(--ts); color:var(--sage-d); } .pkglp .gch.p { background:var(--tp); color:var(--gold); }
        .pkglp .gch.off { background:#f2ece2; color:#c9bda9; }
        .pkglp .lprow .st { font-family:${FONT_MONO}; font-size:7.5px; letter-spacing:.05em; color:var(--muted); }
        .pkglp .lprow .st b { color:var(--sage-d); font-weight:500; }
        .pkglp .ghostrow { padding:13px 15px; cursor:pointer; text-align:center; background:none; width:100%; border:0; border-top:1px dashed #e7dbc9; font-family:${FONT_MONO}; font-size:9px; letter-spacing:.06em; text-transform:uppercase; color:#a4937f; margin-top:auto; }
        .pkglp .ghostrow:hover { color:var(--burg); background:#faf4ec; }
        .pkglp .lp-read { flex:1; min-width:0; background:var(--card); border:var(--bdw) solid var(--bd); border-radius:11px; overflow:hidden; display:flex; flex-direction:column; }
        .t-bold .pkglp .lp-read { border:1.5px solid #1d1712; }
        .pkglp .lp-rh { padding:14px 20px; background:var(--band); border-bottom:var(--bdw) solid var(--bd); display:flex; align-items:center; gap:12px; }
        .pkglp .lp-rh h3 { font-family:${FONT_SERIF}; font-size:20px; font-weight:800; color:var(--ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .pkglp .lp-rh .acts { margin-left:auto; display:flex; gap:12px; font-family:${FONT_MONO}; font-size:9px; color:#6a4436; flex-shrink:0; }
        .pkglp .lp-rh .acts button { background:none; border:0; padding:0; cursor:pointer; font:inherit; color:inherit; }
        .pkglp .lp-rh .acts button:hover { color:var(--burg); }
        .pkglp .lp-rh .acts .stub { color:var(--muted); cursor:default; }
        .pkglp .lp-rh .acts .stub:hover { color:var(--muted); }
        .pkglp .lp-rb { padding:18px 20px; display:flex; flex-direction:column; gap:10px; flex:1; }
        .pkglp .matrow { display:flex; align-items:center; gap:12px; border:var(--bdw) solid var(--bd); border-radius:10px; padding:12px 15px; background:#fffefb; }
        .t-bold .pkglp .matrow { border:1.5px solid #1d1712; }
        .pkglp .matrow.empty { border-style:dashed; }
        .pkglp .pill { font-family:${FONT_MONO}; font-size:7.5px; letter-spacing:.09em; text-transform:uppercase; border-radius:5px; padding:4px 9px; display:inline-flex; gap:6px; align-items:center; flex-shrink:0; }
        .pkglp .pill.l { background:var(--tl); color:var(--burg); } .pkglp .pill.s { background:var(--ts); color:var(--sage-d); } .pkglp .pill.p { background:var(--tp); color:var(--gold); }
        /* NOT ".ti" — that collides with Tabler Icons' global icon-font class (!important). */
        .pkglp .matrow .mrt { font-family:${FONT_SERIF}; font-size:15px; font-weight:600; color:var(--ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .pkglp .matrow .empty-t { font-style:italic; font-size:13px; color:var(--muted); }
        .pkglp .matrow .fn { margin-left:auto; font-family:${FONT_MONO}; font-size:8.5px; color:var(--muted); flex-shrink:0; }
        .pkglp .lp-stats { margin-top:auto; display:flex; gap:24px; border-top:1px dashed #e7dbc9; padding-top:14px; }
        .pkglp .lpstat .v { font-family:${FONT_SERIF}; font-size:22px; font-weight:800; color:var(--ink); }
        .pkglp .lpstat.win .v { color:var(--sage-d); }
        .pkglp .lpstat .k { font-family:${FONT_MONO}; font-size:7.5px; letter-spacing:.1em; text-transform:uppercase; color:var(--muted); margin-top:2px; }
        @media (max-width: 720px) { .pkglp .lp { flex-direction:column; } .pkglp .lp-list { width:100%; } }
      `}</style>

      <div className="lp">
        {/* LIST */}
        <div className="lp-list">
          <div className="lp-lh"><h4>Packages · {packages.length}</h4><button type="button" className="np" onClick={onNew}>＋ NEW</button></div>
          {packages.map((pkg) => {
            const c = countsFor(pkg.id, queries);
            return (
              <button type="button" key={pkg.id} className={`lprow${pkg.id === selected?.id ? " on" : ""}`} onClick={() => setSelectedId(pkg.id)}>
                <div className="nm">{pkg.packageName}</div>
                <div className="glyphs">
                  {BUILDER_TYPES.map((t) => {
                    const filled = isSlotFilled(pkg[SLOT_FIELD[t]]) && versions.some((v) => v.id === pkg[SLOT_FIELD[t]]);
                    return <span key={t} className={`gch ${filled ? SHORT[t] : "off"}`}><TypeGlyph type={t} size={11} /></span>;
                  })}
                </div>
                <div className="st">{rowStat(c)}</div>
              </button>
            );
          })}
          <button type="button" className="ghostrow" onClick={onNew}>＋ New package</button>
        </div>

        {/* READING PANE */}
        {selected && (
          <div className="lp-read">
            <div className="lp-rh">
              <h3>{selected.packageName}</h3>
              <div className="acts">
                <button type="button" onClick={() => onEdit(selected)}>✎ EDIT</button>
                <button type="button" onClick={() => onCopy(selected)}>⧉ COPY</button>
                <button type="button" className="stub" title="Coming soon" aria-disabled="true">ATTACH →</button>
              </div>
            </div>
            <div className="lp-rb">
              {BUILDER_TYPES.map((t) => {
                const m = TYPE_META[t];
                const vid = selected[SLOT_FIELD[t]];
                const v = isSlotFilled(vid) ? versions.find((x) => x.id === vid) : undefined;
                return (
                  <div key={t} className={`matrow${v ? "" : " empty"}`}>
                    <span className={`pill ${SHORT[t]}`}><TypeGlyph type={t} size={10} /> {PILL_LABEL[t]}</span>
                    {v ? (
                      <>
                        <span className="mrt">{v.versionName}</span>
                        {v.fileName && <span className="fn">{v.fileName}</span>}
                      </>
                    ) : (
                      <span className="empty-t">No {m.label.toLowerCase()} in this package</span>
                    )}
                  </div>
                );
              })}
              {(() => {
                const c = countsFor(selected.id, queries);
                return (
                  <div className="lp-stats">
                    <div className="lpstat"><div className="v">{c.sent}</div><div className="k">Queries sent</div></div>
                    <div className="lpstat win"><div className="v">{c.full}</div><div className="k">Full request{c.full === 1 ? "" : "s"}</div></div>
                    <div className="lpstat"><div className="v">{c.awaiting}</div><div className="k">Awaiting</div></div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
