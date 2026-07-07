/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PackagesHome — the Package Builder home (JourneyStrip station 3, Attach) once the manuscript has ≥1
 * package. Treatment "1 · List + reading pane" from design-refs/scriptally-packages-composer-v2.html:
 * a compact package list on the left (name, three filled/empty type chips, one stat line) and a full
 * reading pane on the right for the selected package (a roomy row per material + the selected
 * package's own derived counts along the foot). Selection is view state only; the first package is
 * auto-selected. All figures derive at read time from the queries via packageMetrics — nothing stored.
 * Attach-to-query stays a stub this build.
 *
 * See what wins is now a SEPARATE destination (its own cross-package analytics page) — reached via the
 * `onSeeWins` CTA here, not welded into this home. This view keeps the per-package attach context; the
 * full leaderboard / winner / best-by-type read lives on PackageStats.
 */
import React, { useState } from "react";
import { SubmissionPackage, ManuscriptVersion, Query, ComponentType } from "../../types";
import { TypeGlyph } from "./TypeGlyph";
import { TYPE_META, BUILDER_TYPES, SLOT_FIELD } from "./typeMeta";
import { isSlotFilled, isRequest, isResponse, reachedFull } from "../../lib/packageMetrics";
import { FONT_SERIF, FONT_MONO } from "../../lib/designTokens";

/** l / s / p suffix for the tint classes, per type. */
const SHORT: Record<string, "l" | "s" | "p"> = {
  [ComponentType.QUERY_LETTER]: "l",
  [ComponentType.SYNOPSIS]: "s",
  [ComponentType.SAMPLE_PAGES]: "p",
};
interface Counts { sent: number; full: number; partial: number; responded: number; awaiting: number; }
const countsFor = (pkgId: string, queries: Query[]): Counts => {
  const mine = queries.filter((q) => q.packageId === pkgId);
  const sent = mine.length;
  const full = mine.filter(reachedFull).length;
  // Partial = a materials request that hasn't reached full. NOT "responded − full" — that would
  // count plain rejections/closes (responded, never requested) as fabricated partial requests.
  const partial = mine.filter((q) => isRequest(q) && !reachedFull(q)).length;
  const responded = mine.filter(isResponse).length;
  return { sent, full, partial, responded, awaiting: sent - responded };
};

/** Short list-row stat line ("3 SENT · 1 FULL REQUEST" / "1 SENT · AWAITING REPLY"). */
const rowStat = (c: Counts): React.ReactNode => {
  if (c.sent === 0) return "NOT YET SENT";
  const head = `${c.sent} SENT · `;
  if (c.full > 0) return <>{head}<b>{c.full} FULL REQUEST{c.full === 1 ? "" : "S"}</b></>;
  if (c.partial > 0) return <>{head}<b>{c.partial} PARTIAL REQUEST{c.partial === 1 ? "" : "S"}</b></>;
  return <>{head}AWAITING REPLY</>;
};

export interface PackagesHomeProps {
  packages: SubmissionPackage[];
  versions: ManuscriptVersion[];
  queries: Query[];
  onNew: () => void;
  onEdit: (pkg: SubmissionPackage) => void;
  onCopy: (pkg: SubmissionPackage) => void;
  /** Open the "See what wins" analytics page (station 4) — the de-welded results destination. */
  onSeeWins: () => void;
}

export const PackagesHome: React.FC<PackagesHomeProps> = ({ packages, versions, queries, onNew, onEdit, onCopy, onSeeWins }) => {
  const [selectedId, setSelectedId] = useState<string | null>(packages[0]?.id ?? null);
  const selected = packages.find((p) => p.id === selectedId) ?? packages[0];

  return (
    <div className="pkglp">
      <style>{`
        /* Chapter header (guided redesign — ref .ph-head): illustration + plain-words explainer + the
           page CTA, which moved here FROM the list header. Paddings adapted to our padded pane shell. */
        .pkglp .ph-head { display:flex; align-items:center; gap:30px; padding:12px 10px 26px; }
        .pkglp .ph-head .illo { flex-shrink:0; }
        .pkglp .ph-head h2 { font-family:${FONT_SERIF}; font-size:38px; font-weight:800; color:var(--headT); letter-spacing:-.5px; }
        .pkglp .ph-head p { font-size:15px; color:#6a594d; line-height:1.6; margin-top:8px; max-width:560px; }
        .pkglp .ph-acts { margin-left:auto; flex-shrink:0; display:flex; flex-direction:column; align-items:stretch; gap:9px; }
        .pkglp .newpkg { font-family:${FONT_SERIF}; font-size:16px; font-weight:700; color:var(--btnT); background:var(--btnBg); border:1px solid var(--btnBd); border-radius:12px; padding:15px 30px; cursor:pointer; }
        .pkglp .newpkg:hover { background:var(--btnH); }
        /* See what wins — the de-welded results destination; positive/accent link (--sage-d). */
        .pkglp .seewins { display:inline-flex; align-items:center; justify-content:center; gap:7px; font-family:${FONT_MONO}; font-size:10px; letter-spacing:.08em; text-transform:uppercase; font-weight:600; color:var(--sage-d); background:none; border:0; padding:2px; cursor:pointer; }
        .pkglp .seewins:hover { text-decoration:underline; }
        .pkglp .lp { display:flex; gap:16px; min-height:340px; }
        .pkglp .lp-list { width:300px; flex-shrink:0; background:var(--card); border:var(--bdw) solid var(--bd); border-radius:11px; overflow:hidden; display:flex; flex-direction:column; }
        .t-bold .pkglp .lp-list { border:1.5px solid #1d1712; }
        /* List header is count-only — the ＋ NEW button moved to the chapter header (guided pass). */
        .pkglp .lp-lh { padding:13px 18px; background:linear-gradient(135deg,var(--band-a),var(--band-b)); border-bottom:var(--bdw) solid var(--bd); display:flex; align-items:center; }
        .pkglp .lp-lh h4 { font-family:${FONT_SERIF}; font-size:16.5px; font-weight:700; color:var(--headT); }
        .pkglp .lprow { padding:15px 18px; border-bottom:1px dashed #e7dbc9; cursor:pointer; text-align:left; background:none; width:100%; display:block; }
        .pkglp .lprow:hover { background:#faf4ec; }
        .pkglp .lprow.on { background:var(--selBg); border-left:3px solid var(--burg); padding-left:15px; }
        .pkglp .lprow .nm { font-family:${FONT_SERIF}; font-size:16.5px; font-weight:700; color:var(--ink); }
        .pkglp .lprow .glyphs { display:flex; gap:6px; margin:6px 0 5px; }
        .pkglp .gch { width:20px; height:20px; border-radius:6px; display:flex; align-items:center; justify-content:center; }
        .pkglp .gch.l { background:var(--tl); color:var(--burg); } .pkglp .gch.s { background:var(--ts); color:var(--sage-d); } .pkglp .gch.p { background:var(--tp); color:var(--gold); }
        .pkglp .gch.off { background:#f2ece2; color:#c9bda9; }
        /* Quiet Cappuccino: list-row chips go foam + burgundy glyph (rule-derived — too small for an
           accent; the glyph alone carries type). The .off grey is unchanged. Bold keeps tints. */
        .t-capp .pkglp .gch.l, .t-capp .pkglp .gch.s, .t-capp .pkglp .gch.p { background:var(--selBg); color:var(--burg); }
        .pkglp .lprow .st { font-family:${FONT_MONO}; font-size:8.5px; letter-spacing:.05em; color:var(--muted); }
        .pkglp .lprow .st b { color:var(--sage-d); font-weight:500; }
        .pkglp .ghostrow { padding:13px 15px; cursor:pointer; text-align:center; background:none; width:100%; border:0; border-top:1px dashed #e7dbc9; font-family:${FONT_MONO}; font-size:9px; letter-spacing:.06em; text-transform:uppercase; color:#a4937f; margin-top:auto; }
        .pkglp .ghostrow:hover { color:var(--burg); background:#faf4ec; }
        .pkglp .lp-read { flex:1; min-width:0; background:var(--card); border:var(--bdw) solid var(--bd); border-radius:11px; overflow:hidden; display:flex; flex-direction:column; }
        .t-bold .pkglp .lp-read { border:1.5px solid #1d1712; }
        .pkglp .lp-rh { padding:16px 24px; background:linear-gradient(135deg,var(--band-a),var(--band-b)); border-bottom:var(--bdw) solid var(--bd); display:flex; align-items:center; gap:14px; }
        .pkglp .lp-rh h3 { font-family:${FONT_SERIF}; font-size:23px; font-weight:800; color:var(--headT); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .pkglp .lp-rh .acts { margin-left:auto; display:flex; gap:14px; font-family:${FONT_MONO}; font-size:10px; color:#6a4436; flex-shrink:0; }
        /* New-capp only (guided ref .acts): mocha at 80% on the foam band; Bold keeps its warm brown. */
        .t-capp .pkglp .lp-rh .acts { color:var(--headT); opacity:.8; }
        .pkglp .lp-rh .acts button { background:none; border:0; padding:0; cursor:pointer; font:inherit; color:inherit; }
        .pkglp .lp-rh .acts button:hover { color:var(--burg); }
        .pkglp .lp-rh .acts .stub { color:var(--muted); cursor:default; }
        .pkglp .lp-rh .acts .stub:hover { color:var(--muted); }
        .pkglp .lp-rb { padding:20px 24px; display:flex; flex-direction:column; gap:10px; flex:1; }
        .pkglp .lp-sec { font-family:${FONT_MONO}; font-size:8.5px; letter-spacing:.14em; text-transform:uppercase; color:#a4937f; margin:2px 0 4px; }
        /* Material rows a size up (guided ref .matrow): foam glyph tile + Playfair title + type kicker;
           the type pills are RETIRED in favour of tile + kicker. */
        .pkglp .matrow { display:flex; align-items:center; gap:14px; border:var(--bdw) solid var(--bd); border-radius:11px; padding:14px 17px; background:#fffefb; }
        .t-bold .pkglp .matrow { border:1.5px solid #1d1712; }
        .pkglp .matrow.empty { border-style:dashed; }
        .pkglp .mgl { width:34px; height:34px; border-radius:10px; background:var(--selBg); color:var(--burg); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        /* NOT ".ti" — that collides with Tabler Icons' global icon-font class (!important). */
        .pkglp .matrow .mrt { font-family:${FONT_SERIF}; font-size:16.5px; font-weight:600; color:var(--ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .pkglp .matrow .tk { font-family:${FONT_MONO}; font-size:8px; letter-spacing:.08em; color:var(--muted); text-transform:uppercase; margin-top:2px; }
        .pkglp .matrow .empty-t { font-style:italic; font-size:13.5px; color:var(--muted); }
        .pkglp .matrow .fn { margin-left:auto; font-family:${FONT_MONO}; font-size:9px; color:var(--muted); flex-shrink:0; }
        /* Stats promoted to the result band (ref .resband) — foam --winBg, labelled, 30px figures; the
           Caveat margin note renders ONLY at ≥1 full request (one handwritten wink per page, max). */
        .pkglp .resband { margin-top:auto; background:var(--winBg); border:var(--bdw) solid var(--bd); border-radius:12px; padding:16px 20px; display:flex; align-items:center; gap:28px; }
        .pkglp .rlab { font-family:${FONT_MONO}; font-size:8.5px; letter-spacing:.12em; text-transform:uppercase; color:#8a7264; width:120px; line-height:1.6; flex-shrink:0; }
        .pkglp .rstat .v { font-family:${FONT_SERIF}; font-size:30px; font-weight:800; color:var(--headT); }
        .pkglp .rstat.win .v { color:var(--sage-d); }
        .pkglp .rstat .k { font-family:${FONT_MONO}; font-size:8px; letter-spacing:.1em; text-transform:uppercase; color:var(--muted); margin-top:1px; }
        .pkglp .cav { margin-left:auto; font-family:'Caveat', cursive; font-size:19px; color:var(--burg); }
        @media (max-width: 720px) { .pkglp .lp { flex-direction:column; } .pkglp .lp-list { width:100%; } }
      `}</style>

      {/* Chapter header — what this screen is for, in plain words (illustration ported verbatim). */}
      <div className="ph-head">
        <span className="illo" aria-hidden="true">
          <svg width={88} height={88} viewBox="0 0 96 96" fill="none" stroke="#7c3a2a" strokeWidth={1.7} strokeLinejoin="round"><rect x={16} y={30} width={64} height={44} rx={3} /><path d="M16 42h64M42 30v44" opacity={0.5} /><path d="M48 18v12M42 24l6-6 6 6" strokeLinecap="round" /><path d="M28 52h8M28 60h6" strokeLinecap="round" opacity={0.55} /><path d="M56 52h14M56 60h10" strokeLinecap="round" opacity={0.55} /><path d="M70 22c3 2 4 6 2 8" stroke="#a8842c" strokeLinecap="round" /><path d="M74 17c1 1 1 3 0 4" stroke="#a8842c" strokeLinecap="round" /></svg>
        </span>
        <div>
          <h2>Your packages</h2>
          <p>A package is one version of your submission — a letter, synopsis and pages travelling together. Attach one to each query you send, and the results column tells you which version agents ask to read more of.</p>
        </div>
        <div className="ph-acts">
          <button type="button" className="newpkg" onClick={onNew}>＋ New package</button>
          <button type="button" className="seewins" onClick={onSeeWins}>See what wins →</button>
        </div>
      </div>

      <div className="lp">
        {/* LIST — header is count-only; the page CTA lives in the chapter header now. */}
        <div className="lp-list">
          <div className="lp-lh"><h4>Packages · {packages.length}</h4></div>
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
              <div className="lp-sec">What&rsquo;s inside</div>
              {BUILDER_TYPES.map((t) => {
                const m = TYPE_META[t];
                const vid = selected[SLOT_FIELD[t]];
                const v = isSlotFilled(vid) ? versions.find((x) => x.id === vid) : undefined;
                return (
                  <div key={t} className={`matrow${v ? "" : " empty"}`}>
                    <span className="mgl"><TypeGlyph type={t} size={15} /></span>
                    {v ? (
                      <>
                        <div style={{ minWidth: 0 }}>
                          <div className="mrt">{v.versionName}</div>
                          <div className="tk">{m.label}</div>
                        </div>
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
                  <div className="resband">
                    <div className="rlab">How this version is doing</div>
                    <div className="rstat"><div className="v">{c.sent}</div><div className="k">Queries sent</div></div>
                    <div className="rstat win"><div className="v">{c.full}</div><div className="k">Full request{c.full === 1 ? "" : "s"}</div></div>
                    <div className="rstat"><div className="v">{c.awaiting}</div><div className="k">Awaiting</div></div>
                    {c.full >= 1 && <span className="cav">this one&rsquo;s working ↑</span>}
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
