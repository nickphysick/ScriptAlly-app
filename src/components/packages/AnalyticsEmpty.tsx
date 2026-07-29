/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AnalyticsEmpty — the Analytics tab's first-run screen (ref design-refs/scriptally-packages-empty.html).
 *
 * Shown when no package has gone out with a query yet. Four dashed KPI shells holding em-dashes, the
 * nothing-to-measure card, a greyed preview of what will appear, and the community teaser.
 *
 * The preview is doing real work: it teaches the COMPOSITION FORM before there is any data to put in
 * it. Sample sizes on this page are three or four sends, where a smooth percentage bar would claim a
 * precision the data hasn't got — so a bar here is a single track with three segments (replied,
 * still waiting, no reply) and a denominator, not a percentage fill. Seeing the empty shape first
 * means the first real bar is legible immediately.
 *
 * The teaser foreshadows community comparison WITHOUT claiming any data exists, so it renders
 * regardless of COMMUNITY_STATS_ENABLED. The percentile claims themselves are gated and do not.
 */
import React from "react";
import { Users } from "lucide-react";

const KPIS = ["Queries sent", "Reply rate", "Median reply time", "Requests"];

/** The three rows of the preview: label, then the segment widths that make up the track. */
const PREVIEW: { label: string; segs: { cls?: "w" | "n"; w: number }[] }[] = [
  { label: "Replied", segs: [{ w: 64 }, { cls: "w", w: 22 }, { cls: "n", w: 14 }] },
  { label: "Still waiting", segs: [{ cls: "w", w: 22 }, { cls: "n", w: 78 }] },
  { label: "Requests ★", segs: [{ w: 12 }, { cls: "n", w: 88 }] },
];

export interface AnalyticsEmptyProps {
  /** Start a new package — the header's action. */
  onNewPackage: () => void;
  /** The EXISTING guided tour over example data. Never a second tour path. */
  onTryExample: () => void;
}

export const AnalyticsEmpty: React.FC<AnalyticsEmptyProps> = ({ onNewPackage, onTryExample }) => (
  <>
    <div className="pkgw-kpis">
      {KPIS.map((k) => (
        <div key={k} className="pkgw-kpi empty">
          <div className="v">—</div>
          <div className="k">{k}</div>
        </div>
      ))}
    </div>

    <div className="pkgw-anempty">
      <svg className="il" viewBox="0 0 132 108" fill="none" aria-hidden="true">
        <rect x="10" y="18" width="76" height="82" rx="7" fill="#fff" stroke="#e3d9cf" strokeWidth="1.5" />
        <rect x="10" y="18" width="76" height="16" rx="7" fill="#efe7db" />
        <path d="M10 34h76" stroke="#e3d9cf" strokeWidth="1.5" />
        <rect x="20" y="46" width="44" height="6" rx="3" fill="#efe8e0" />
        <rect x="20" y="60" width="56" height="5" rx="2.5" fill="#f3ece5" />
        <rect x="20" y="72" width="34" height="5" rx="2.5" fill="#f3ece5" />
        <path d="M74 84c14-6 28-22 36-44" stroke="#7c3a2a" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 4" opacity=".55" />
        <circle cx="112" cy="38" r="7" fill="#f5e2da" stroke="#7c3a2a" strokeWidth="1.8" />
      </svg>
      <div>
        <div className="eh">Nothing to measure yet</div>
        <div className="ep">
          Analytics fills in the moment a package goes out with a query. You&rsquo;ll see{" "}
          <b>reply rates per package</b>, which materials the replying agents received, how long each agency takes —
          and a nudge when someone&rsquo;s overdue.
        </div>
        <div className="acts">
          <button type="button" className="pkgw-btn pkgw-btn--primary" onClick={onNewPackage}>＋ Build your first package</button>
          <button type="button" className="pkgw-btn" onClick={onTryExample}>Try it with example data</button>
        </div>
      </div>
    </div>

    <div className="pkgw-prev">
      <div className="sl" style={{ marginBottom: 8 }}>What appears here</div>
      {PREVIEW.map((row) => (
        <div key={row.label} className="pkgw-pvrow">
          <span className="pl2">{row.label}</span>
          <span className="tr3" aria-hidden="true">
            {row.segs.map((s, i) => <i key={i} className={s.cls} style={{ width: `${s.w}%` }} />)}
          </span>
          <span className="pv2">—</span>
        </div>
      ))}
    </div>

    <div className="pkgw-commteaser">
      <Users aria-hidden="true" />
      <span>
        Once you&rsquo;ve sent a few queries, ScriptAlly will also show how your reply rate compares with the wider
        writing community.
      </span>
    </div>
  </>
);
