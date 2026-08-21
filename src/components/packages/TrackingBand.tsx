/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The tracking band — the stat strip, two bar panels and the Latest activity ledger.
 * Design authority: design-refs/submission-packages-broadsheet.html (`.statstrip` / `.ledger`).
 *
 * ⚠️ "REPORTED, NOT GUESSED" IS THE BAND'S CLAIM AND EVERY FIGURE HAS TO EARN IT. Counts come from
 * queries through `packageTracking`; the ledger comes from the activity log, because an EVENT LIST
 * is the one thing query state cannot express — a query holds its current status, not the sequence
 * that produced it. No count is ever re-derived from the log: `recomputeQuery` owns that direction,
 * and a second implementation is how two surfaces come to disagree.
 *
 * ⚠️ THREE STATES, DERIVED. No package sent yet → a nudge naming the first package and two dashed
 * ghosts saying what will appear; anything sent → the figures. Ghosts rather than empty panels,
 * because an axis with no bars reads as a broken chart while a dashed note reads as "not yet".
 */
import React from "react";
import { Activity, Agent, ManuscriptVersion, Query, SubmissionPackage } from "../../types";
import {
  trackingTotals, STAT_CELLS, repliesByPackage, requestsByMaterial, trackingNudge, ledgerRows,
  type BarRow,
} from "../../lib/packageTracking";
import { IllustrationSlot } from "./IllustrationSlot";
import "./packagesBroadsheet.css";

/** The ref's brief per stat cell, verbatim (D7) — kept beside the cells they belong to. */
const STAT_BRIEF: Record<string, string> = {
  sent: "outgoing\npost",
  replies: "opened\nenvelope",
  requests: "page with\nbookmark",
};

const BarPanel: React.FC<{ label: string; rows: BarRow[] }> = ({ label, rows }) => (
  <div className="pkgb-panel">
    <div className="pkgb-panelband"><span className="pkgb-eyebrow">{label}</span></div>
    <div className="pkgb-panelbody">
      {rows.map((r) => (
        <div key={r.id} className="pkgb-drow">
          <div className="pkgb-drtop">
            <span className="pkgb-drname">
              {r.eyebrow && <span className="pkgb-dreyebrow">{r.eyebrow}</span>}
              {r.name}
            </span>
            <span className="pkgb-drmeta">{r.meta}</span>
          </div>
          <div className="pkgb-bar">
            <div className="pkgb-bsent" style={{ width: `${r.sentPct}%` }}>
              <div className="pkgb-bin" style={{ width: `${r.inPct}%` }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export interface TrackingBandProps {
  packages: SubmissionPackage[];
  versions: ManuscriptVersion[];
  queries: Query[];
  activities: Activity[];
  agents: Agent[];
  /** Injected so the band has no clock of its own — the house rule for every derivation. */
  now: number;
  onLogQuery?: () => void;
}

export const TrackingBand: React.FC<TrackingBandProps> = ({
  packages, versions, queries, activities, agents, now, onLogQuery,
}) => {
  const totals = trackingTotals(packages, queries);
  const nudge = trackingNudge(packages, queries);
  const ledger = ledgerRows(activities, queries, agents, packages, now);

  return (
    <section className="pkgb-band" aria-labelledby="pkgb-track-h">
      <div className="pkgb-bandhead">
        <h2 id="pkgb-track-h">Tracking</h2>
        <span className="pkgb-tag">Reported, not guessed</span>
      </div>

      {nudge ? (
        <>
          <div className="pkgb-nudge">
            Attach <strong>{nudge.packageName}</strong> when you log your next query — replies land
            back here against it.
            {onLogQuery && (
              <button type="button" className="pkgb-nudgelink" onClick={onLogQuery}>Log a query ›</button>
            )}
          </div>
          <div className="pkgb-dashgrid">
            <div className="pkgb-ghostpanel">
              <IllustrationSlot id="ghost-replies" brief={"bar chart\nsketch"} width={58} height={58} tiny />
              <span className="pkgb-gpt">Replies by package</span>
              <span className="pkgb-gps">Appears once a package goes out with a query.</span>
            </div>
            <div className="pkgb-ghostpanel">
              <IllustrationSlot id="ghost-requests" brief={"tally marks\non paper"} width={58} height={58} tiny />
              <span className="pkgb-gpt">Requests by material</span>
              <span className="pkgb-gps">Shows which materials sit behind each request.</span>
            </div>
          </div>
        </>
      ) : totals.sent > 0 ? (
        <>
          <div className="pkgb-statstrip">
            {STAT_CELLS.map((c) => (
              <div key={c.key} className="pkgb-stat">
                <div>
                  <div className="pkgb-statn">{totals[c.key]}</div>
                  <div className="pkgb-statl">
                    <span className={`pkgb-dir pkgb-dir--${c.direction}`}>{c.dir}</span>
                    {c.label}
                  </div>
                </div>
                <IllustrationSlot id={`stat-${c.key}`} brief={STAT_BRIEF[c.key]} width={54} height={54} tiny />
              </div>
            ))}
          </div>

          <div className="pkgb-dashgrid">
            <BarPanel label="Replies by package" rows={repliesByPackage(packages, queries)} />
            <BarPanel label="Requests by material" rows={requestsByMaterial(packages, versions, queries)} />
          </div>

          {/* ⚠️ THE LEDGER RENDERS ONLY WHEN IT HAS ROWS. An empty "Latest activity" panel under
              figures that are non-zero says the app has lost track of how those figures happened —
              which is the opposite of the band's claim. It is empty exactly when the activity log
              holds nothing typed for a packaged query, which is a real and temporary state. */}
          {ledger.length > 0 && (
            <div className="pkgb-panel">
              <div className="pkgb-panelband">
                <span className="pkgb-eyebrow">Latest activity</span>
                <IllustrationSlot id="postmark" brief="postmark" shape="disc" width={30} height={30} tiny />
              </div>
              <div className="pkgb-panelbody pkgb-ledger">
                {ledger.map((r) => (
                  <div key={r.id} className="pkgb-lrow">
                    <span className="pkgb-ldate">{r.date}</span>
                    <span className={`pkgb-ldir pkgb-dir--${r.direction}`}>
                      {r.direction === "out" ? "→" : "←"}
                    </span>
                    <span className="pkgb-lwhat">
                      <b>{r.what}</b>{r.who ? ` ${r.who}` : ""}
                    </span>
                    <span className="pkgb-lpkg">{r.packageName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : null}
    </section>
  );
};
