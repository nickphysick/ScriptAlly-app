/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PackageStats — the "See what wins" analytics view (JourneyStrip station 4), split out of the
 * packages home so Attach (the doing) and the results read are distinct destinations. It answers one
 * question: which package + material combinations pull the most requests? Everything is DERIVED at
 * read time by the packageMetrics engine (overallAttachStats / rankPackagesByRequests /
 * strongestPackage / bestVersionOfType) — no stored stat fields.
 *
 * Thin-data guard: below MIN_SENDS_FOR_CLAIM (4) total attached sends the page stays in a calm
 * "keep attaching" state rather than crowning a winner off a lucky 1-of-1. Above it, a winner is
 * still only crowned when that package itself clears the threshold (strongestPackage returns null
 * otherwise), and best-by-type withholds any type without a threshold-meeting version.
 *
 * Colour comes entirely from the shared theme tokens the rest of the builder uses (band =
 * --band-a/--band-b, winner tint = --winBg, accent/positive = --sage-d [the builder's "this is
 * working" colour], type tints = --tl/--ts/--tp + --burg/--sage-d/--gold, chrome = --card/--bd/
 * --bdw/--chromerad/--headT/--muted/--ink). No hardcoded hexes; themes with the rest of the page.
 */
import React from "react";
import { SubmissionPackage, ManuscriptVersion, Query, ComponentType } from "../../types";
import { TypeGlyph } from "./TypeGlyph";
import { TYPE_META, BUILDER_TYPES, SLOT_FIELD } from "./typeMeta";
import {
  overallAttachStats,
  rankPackagesByRequests,
  strongestPackage,
  bestVersionOfType,
  isSlotFilled,
  formatRate,
  barWidth,
  MIN_SENDS_FOR_CLAIM,
} from "../../lib/packageMetrics";
import { FONT_SERIF, FONT_MONO } from "../../lib/designTokens";

const SHORT: Record<string, "l" | "s" | "p"> = {
  [ComponentType.QUERY_LETTER]: "l",
  [ComponentType.SYNOPSIS]: "s",
  [ComponentType.SAMPLE_PAGES]: "p",
};

const chartIcon = (
  <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
);

export interface PackageStatsProps {
  packages: SubmissionPackage[];
  versions: ManuscriptVersion[];
  queries: Query[];
  onBack: () => void;
}

export const PackageStats: React.FC<PackageStatsProps> = ({ packages, versions, queries, onBack }) => {
  const overall = overallAttachStats(packages, queries);
  const thin = overall.sent < MIN_SENDS_FOR_CLAIM;
  const ranked = rankPackagesByRequests(packages, queries).filter((r) => r.stat.sent > 0);
  const winner = strongestPackage(packages, queries);

  return (
    <div className="pkgstats">
      <style>{`
        .pkgstats .backrow { display:flex; align-items:center; gap:12px; margin-bottom:6px; }
        .pkgstats .vh-ic { width:34px; height:34px; border-radius:10px; background:linear-gradient(135deg,var(--band-a),var(--band-b)); color:var(--burg); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .pkgstats .view-title { font-family:${FONT_SERIF}; font-size:23px; font-weight:700; color:var(--headT); }
        .pkgstats .backbtn { margin-left:auto; font-family:${FONT_MONO}; font-size:10px; letter-spacing:.08em; text-transform:uppercase; background:var(--card); border:var(--bdw) solid var(--bd); color:var(--burg); border-radius:9px; padding:9px 14px; cursor:pointer; }
        .pkgstats .backbtn:hover { background:var(--btnH); }
        .pkgstats .ss-sub { font-size:14px; color:var(--muted); line-height:1.6; margin:0 0 18px 46px; }

        /* Banded headline — the theme band; headline request rate + total sent. */
        .pkgstats .ss-band { background:linear-gradient(135deg,var(--band-a),var(--band-b)); border:var(--bdw) solid var(--bd); border-radius:var(--chromerad); padding:22px 26px; display:flex; align-items:baseline; gap:28px; flex-wrap:wrap; margin-bottom:16px; }
        .pkgstats .ss-hl { font-family:${FONT_SERIF}; font-size:44px; font-weight:800; color:var(--headT); line-height:1; }
        .pkgstats .ss-hl small { font-family:${FONT_MONO}; font-size:11px; font-weight:400; letter-spacing:.1em; text-transform:uppercase; color:var(--muted); margin-left:9px; }
        .pkgstats .ss-band-meta { font-family:${FONT_MONO}; font-size:9px; letter-spacing:.1em; text-transform:uppercase; color:var(--muted); line-height:1.7; }
        .pkgstats .ss-band-meta b { color:var(--sage-d); font-weight:600; }

        /* Winner card — the theme win tint + the accent (--sage-d). */
        .pkgstats .ss-win { background:var(--winBg); border:var(--bdw) solid var(--bd); border-left:4px solid var(--sage-d); border-radius:12px; padding:18px 22px; margin-bottom:20px; }
        .pkgstats .ss-win .k { font-family:${FONT_MONO}; font-size:8.5px; letter-spacing:.14em; text-transform:uppercase; color:var(--muted); }
        .pkgstats .ss-win .wr { display:flex; align-items:baseline; gap:14px; flex-wrap:wrap; margin-top:5px; }
        .pkgstats .ss-win .wn { font-family:${FONT_SERIF}; font-size:24px; font-weight:800; color:var(--headT); }
        .pkgstats .ss-win .wpc { font-family:${FONT_SERIF}; font-size:24px; font-weight:800; color:var(--sage-d); }
        .pkgstats .ss-win .wpc small { font-family:${FONT_MONO}; font-size:8.5px; font-weight:400; letter-spacing:.08em; text-transform:uppercase; color:var(--muted); margin-left:5px; }
        .pkgstats .ss-comp { display:flex; gap:8px; flex-wrap:wrap; margin-top:12px; }
        .pkgstats .ss-cc { display:inline-flex; align-items:center; gap:6px; font-family:${FONT_MONO}; font-size:9px; letter-spacing:.03em; color:var(--ink); background:var(--card); border:var(--bdw) solid var(--bd); border-radius:7px; padding:5px 9px; }
        .pkgstats .ss-cc.empty { color:var(--muted); font-style:italic; }
        .pkgstats .ss-cc .g { display:inline-flex; }
        .pkgstats .ss-cc.l .g { color:var(--burg); } .pkgstats .ss-cc.s .g { color:var(--sage-d); } .pkgstats .ss-cc.p .g { color:var(--gold); }

        /* Ranked bars — leader in the accent, the rest neutral. */
        .pkgstats .ss-sec { font-family:${FONT_MONO}; font-size:9px; letter-spacing:.14em; text-transform:uppercase; color:var(--muted); margin:0 0 12px; }
        .pkgstats .ss-rank { display:flex; flex-direction:column; gap:13px; margin-bottom:24px; }
        .pkgstats .ss-row .rh { display:flex; align-items:baseline; justify-content:space-between; gap:12px; margin-bottom:5px; }
        .pkgstats .ss-row .rn { font-family:${FONT_SERIF}; font-size:15px; font-weight:600; color:var(--ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .pkgstats .ss-row .rn .early { font-family:${FONT_MONO}; font-size:7.5px; font-weight:500; letter-spacing:.08em; text-transform:uppercase; color:var(--muted); border:1px solid var(--bd); border-radius:4px; padding:1px 5px; margin-left:8px; vertical-align:middle; }
        .pkgstats .ss-row .rpc { font-family:${FONT_MONO}; font-size:11px; color:var(--muted); flex-shrink:0; }
        .pkgstats .ss-row .rpc b { color:var(--headT); font-weight:700; font-size:13px; }
        .pkgstats .ss-track { height:10px; border-radius:6px; background:var(--selBg); overflow:hidden; }
        .pkgstats .ss-fill { height:100%; border-radius:6px; background:var(--muted); }
        .pkgstats .ss-row.lead .ss-fill { background:var(--sage-d); }

        /* Best-by-type — three cells, tinted glyph tile per type. */
        .pkgstats .ss-types { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
        .pkgstats .ss-type { background:var(--card); border:var(--bdw) solid var(--bd); border-radius:12px; padding:15px 16px; }
        .pkgstats .ss-th { display:flex; align-items:center; gap:9px; margin-bottom:11px; }
        .pkgstats .ss-tg { width:30px; height:30px; border-radius:8px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .pkgstats .ss-tg.l { background:var(--tl); color:var(--burg); } .pkgstats .ss-tg.s { background:var(--ts); color:var(--sage-d); } .pkgstats .ss-tg.p { background:var(--tp); color:var(--gold); }
        .t-capp .pkgstats .ss-tg.l, .t-capp .pkgstats .ss-tg.s, .t-capp .pkgstats .ss-tg.p { background:var(--selBg); color:var(--burg); }
        .pkgstats .ss-tl { font-family:${FONT_MONO}; font-size:8px; letter-spacing:.1em; text-transform:uppercase; color:var(--muted); }
        .pkgstats .ss-tn { font-family:${FONT_SERIF}; font-size:15px; font-weight:600; color:var(--ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .pkgstats .ss-trate { font-family:${FONT_SERIF}; font-size:22px; font-weight:800; color:var(--sage-d); margin-top:6px; }
        .pkgstats .ss-trate small { font-family:${FONT_MONO}; font-size:8px; font-weight:400; letter-spacing:.08em; text-transform:uppercase; color:var(--muted); margin-left:5px; }
        .pkgstats .ss-tnone { font-family:${FONT_SERIF}; font-style:italic; font-size:13px; color:var(--muted); line-height:1.5; }

        /* Thin-data / empty state — calm, no misleading stats. */
        .pkgstats .ss-empty { background:var(--card); border:1.5px dashed var(--bd); border-radius:14px; padding:52px 30px; text-align:center; }
        .pkgstats .ss-empty .ec { width:56px; height:56px; border-radius:14px; background:linear-gradient(135deg,var(--band-a),var(--band-b)); color:var(--burg); display:flex; align-items:center; justify-content:center; margin:0 auto 16px; }
        .pkgstats .ss-empty h3 { font-family:${FONT_SERIF}; font-size:22px; font-weight:800; color:var(--headT); }
        .pkgstats .ss-empty p { font-size:14px; color:var(--muted); line-height:1.6; max-width:440px; margin:9px auto 0; }
        .pkgstats .ss-empty .prog { font-family:${FONT_MONO}; font-size:9px; letter-spacing:.1em; text-transform:uppercase; color:var(--muted); margin-top:16px; }
        .pkgstats .ss-empty .prog b { color:var(--sage-d); }
        @media (max-width: 720px) { .pkgstats .ss-types { grid-template-columns:1fr; } }
      `}</style>

      <div className="backrow">
        <span className="vh-ic">{chartIcon}</span>
        <span className="view-title">See what wins</span>
        <button type="button" className="backbtn" onClick={onBack}>← Builder home</button>
      </div>
      <div className="ss-sub">Which package — and which letter, synopsis and pages — agents ask to read more of. All from the queries you&rsquo;ve attached; nothing here is guesswork.</div>

      {thin ? (
        <div className="ss-empty">
          <span className="ec" aria-hidden="true">{chartIcon}</span>
          <h3>Results appear once you&rsquo;ve sent a few</h3>
          <p>Attach a package to the queries you send, and this page will show which combination pulls the most requests — ranked, with the winning letter, synopsis and pages called out.</p>
          {overall.sent > 0 && (
            <div className="prog"><b>{overall.sent}</b> of {MIN_SENDS_FOR_CLAIM} attached sends so far — a few more and the winner emerges.</div>
          )}
        </div>
      ) : (
        <>
          {/* Banded headline */}
          <div className="ss-band">
            <div>
              <div className="ss-hl">{formatRate(overall.requestRate)}<small>request rate</small></div>
            </div>
            <div className="ss-band-meta">
              <b>{overall.requests}</b> request{overall.requests === 1 ? "" : "s"} from <b>{overall.sent}</b> attached send{overall.sent === 1 ? "" : "s"}<br />
              across {packages.length} package{packages.length === 1 ? "" : "s"} · {formatRate(overall.responseRate)} replied
            </div>
          </div>

          {/* Winner */}
          {winner ? (
            <div className="ss-win">
              <div className="k">Your strongest package</div>
              <div className="wr">
                <span className="wn">{winner.pkg.packageName}</span>
                <span className="wpc">{formatRate(winner.stat.requestRate)}<small>request rate · {winner.stat.sent} sent</small></span>
              </div>
              <div className="ss-comp">
                {BUILDER_TYPES.map((t) => {
                  const m = TYPE_META[t];
                  const vid = winner.pkg[SLOT_FIELD[t]];
                  const v = isSlotFilled(vid) ? versions.find((x) => x.id === vid) : undefined;
                  return (
                    <span key={t} className={`ss-cc ${SHORT[t]}${v ? "" : " empty"}`}>
                      <span className="g"><TypeGlyph type={t} size={12} /></span>
                      {v ? v.versionName : `No ${m.label.toLowerCase()}`}
                    </span>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="ss-win" style={{ borderLeftColor: "var(--bd)" }}>
              <div className="k">Your strongest package</div>
              <div className="wr"><span className="wn" style={{ fontStyle: "italic", color: "var(--muted)", fontSize: 16, fontWeight: 600 }}>No package has {MIN_SENDS_FOR_CLAIM} sends yet — keep attaching and a clear winner will surface.</span></div>
            </div>
          )}

          {/* Ranked bars */}
          <div className="ss-sec">Packages by request rate</div>
          <div className="ss-rank">
            {ranked.map((r) => (
              <div key={r.pkg.id} className={`ss-row${winner && r.pkg.id === winner.pkg.id ? " lead" : ""}`}>
                <div className="rh">
                  <span className="rn">{r.pkg.packageName}{!r.ranked && <span className="early">early</span>}</span>
                  <span className="rpc"><b>{formatRate(r.stat.requestRate)}</b> · {r.stat.sent} sent</span>
                </div>
                <div className="ss-track"><div className="ss-fill" style={{ width: barWidth(r.stat.requestRate) }} /></div>
              </div>
            ))}
          </div>

          {/* Best by type */}
          <div className="ss-sec">Best of each material</div>
          <div className="ss-types">
            {BUILDER_TYPES.map((t) => {
              const m = TYPE_META[t];
              const best = bestVersionOfType(t, versions, packages, queries);
              return (
                <div key={t} className="ss-type">
                  <div className="ss-th">
                    <span className={`ss-tg ${SHORT[t]}`}><TypeGlyph type={t} size={15} /></span>
                    <span className="ss-tl">{m.plural}</span>
                  </div>
                  {best ? (
                    <>
                      <div className="ss-tn">{best.version.versionName}</div>
                      <div className="ss-trate">{formatRate(best.stat.requestRate)}<small>request rate · {best.stat.sent} sent</small></div>
                    </>
                  ) : (
                    <div className="ss-tnone">Not enough sends to name a best {m.label.toLowerCase()} yet.</div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
