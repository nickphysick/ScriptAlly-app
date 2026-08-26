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
import { ManuscriptVersion, Query, SubmissionPackage } from "../../types";
/**
 * ⚠️ `STAT_CELLS`, `repliesByPackage` and `ledgerRows` ARE NO LONGER IMPORTED HERE, and that is the
 * point of D-B3 rather than an oversight: the stat strip is now the header's one derived line, the
 * per-package figures are the cards' scorecard footers, and the activity ledger is gone from this
 * page. They remain exported and unit-locked in `packageTracking.ts` — `repliesByPackage` still has
 * its own tests and the DEV `#/pkg-lab` route — so this is a mount being removed, not a derivation
 * being deleted. Anyone reviving them should ask what they would say that a card does not.
 */
import { trackingTotals, requestsByMaterial, trackingNudge } from "../../lib/packageTracking";
import type { Activity, BookVersion } from "../../types";
import { versionsActive, openingRows, holdingRows, earlierLine } from "../../lib/bookVersions";
import { isRequest } from "../../lib/packageMetrics";
import { shortDate } from "../../lib/createSummary";
import { AGENT_NOT_RECORDED } from "../../lib/agentDisplay";
import "./packagesBroadsheet.css";
import { SectionHeader } from "../containers/SectionHeader";

/** The mark per stat cell, from the ref (D4). Briefs are in the report's inventory table. */
/**
 * ⚠️ `STAT_ICON` AND `BarPanel` WENT WITH THE SURFACES THEY DREW (D-B3). The stat strip is the
 * header's one derived line now, and the two-panel bar layout collapsed to a single "What's
 * landing" panel — so both helpers lost their caller the moment the render changed. Removed rather
 * than left to read as live: an unreferenced component sitting in a file is the shape this build
 * has twice found costing a session.
 */

export interface TrackingBandProps {
  packages: SubmissionPackage[];
  /** ⚠️ MATERIALS — the repo's older meaning of "version". See `BookVersion` in types.ts. */
  versions: ManuscriptVersion[];
  queries: Query[];
  /** The manuscript's BOOK versions — named orderings. Below two, neither new panel renders. */
  bookVersions?: readonly BookVersion[];
  /** The log — "who holds what" is derived from it and stores nothing. */
  activities?: readonly Activity[];
  /** Resolves an agent id to a name for the holders panel. */
  agentName?: (agentId: string) => string;
  onLogQuery?: () => void;
}

export const TrackingBand: React.FC<TrackingBandProps> = ({
  packages, versions, queries, bookVersions = [], activities = [],
  agentName = () => AGENT_NOT_RECORDED, onLogQuery,
}) => {
  const totals = trackingTotals(packages, queries);
  const nudge = trackingNudge(packages, queries);
  const rows = requestsByMaterial(packages, versions, queries);

  /**
   * ⚠️ ONE GATE FOR BOTH PANELS (D18), READ FROM THE SHARED DERIVATION. Below two versions neither
   * appears — a writer running one opening has no comparison to draw and a panel offering one would
   * invent a question they have not asked.
   */
  const showVersions = versionsActive({ bookVersions: bookVersions as BookVersion[] });
  const openings = showVersions ? openingRows(bookVersions, versions, packages, queries, isRequest) : [];
  const holders = showVersions ? holdingRows(queries, activities, bookVersions, agentName, (iso) => shortDate(iso)) : [];
  const earlier = showVersions ? earlierLine(queries, activities, bookVersions) : null;

  /**
   * ⚠️ ONE PANEL (D-B3), AND "REPLIES BY PACKAGE" IS DELETED. Those figures described packages while
   * living three inches from the packages they described; they are the cards' scorecard footers now,
   * so there is one place to read them and the two cannot come to disagree.
   *
   * ⚠️ AND THE PRE-SEND STATE IS THE NUDGE ALONE. The two dashed ghost panels it replaces were
   * promises of tables — a page telling a writer about reporting they cannot have yet, drawn at the
   * size of the thing they are missing.
   *
   * ⚠️ COUNTS, NEVER PERCENTAGES. `2 requests from 6 sent` is a fact; `33%` is a claim about a rate
   * at a sample size that cannot support one.
   */
  return (
    <section className="pkgb-band pkgb-band--last" aria-labelledby="pkgb-track-h">
      {nudge ? (
        <div className="pkgb-nudge">
          Attach <strong>{nudge.packageName}</strong> when you log your next query — replies land
          back here against it.
          {onLogQuery && (
            <button type="button" className="pkgb-nudgelink" onClick={onLogQuery}>Log a query ›</button>
          )}
        </div>
      ) : totals.sent > 0 ? (
        <>
          <SectionHeader tick headingId="pkgb-track-h" title={<>What&rsquo;s landing</>} meta="Reported, not guessed" />
          <div className="pkgb-land">
            <div className="pkgb-landhead">
              <h3>Requests by material</h3>
              <span className="pkgb-tag">Across every package that carries it</span>
            </div>
            {rows.map((r) => (
              <div key={r.id} className="pkgb-drow">
                <div className="pkgb-drtop">
                  <span className="pkgb-drname">
                    {r.eyebrow && <span className="pkgb-dreyebrow">{r.eyebrow}</span>}
                    {r.name}
                  </span>
                  <span className="pkgb-drmeta">{r.meta}</span>
                </div>
                {/* ⚠️ THE BAR IS A PROPORTION OF THE BUSIEST ROW, NOT A RATE. It exists so the eye can
                    rank four materials at a glance; the number beside it is the claim. */}
                <div className="pkgb-bar">
                  <div className="pkgb-bsent" style={{ width: `${r.sentPct}%` }}>
                    <div className="pkgb-bin" style={{ width: `${r.inPct}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/**
            * ⚠️ REQUESTS BY OPENING (D15) — the question that started the whole feature: "which way
            * in do agents prefer?" It reuses the row above's exact markup rather than drawing its
            * own, because two ways of rendering the same kind of count eventually disagree about
            * what a full bar means.
            *
            * ⚠️ COUNTS, NEVER PERCENTAGES. Two requests from eighteen against none from six is not
            * a result, and the panel must not imply it is. The bar ranks; the number is the claim.
            */}
          {showVersions && (
            <div className="pkgb-land">
              <div className="pkgb-landhead">
                <h3>Requests by opening</h3>
                <span className="pkgb-tag">Across every sample and package that carries it</span>
              </div>
              {openings.map((o) => (
                <div key={o.id} className="pkgb-drow">
                  <div className="pkgb-drtop">
                    <span className="pkgb-drname">
                      <span className="pkgb-mver"><span aria-hidden="true">§</span>{o.name}</span>
                      <span className="pkgb-drwhere">{o.where}</span>
                    </span>
                    <span className="pkgb-drmeta">{o.meta}</span>
                  </div>
                  <div className="pkgb-bar">
                    <div className="pkgb-bsent" style={{ width: `${o.sentPct}%` }}>
                      <div className="pkgb-bin" style={{ width: `${o.inPct}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/**
            * ⚠️ WHO HOLDS WHAT (D16) — the six-months-later question, and the single strongest
            * reason this feature exists. When an agent surfaces after months of silence, this says
            * what they are actually reading. Entirely derived: no field anywhere says it.
            */}
          {showVersions && holders.length > 0 && (
            <div className="pkgb-land">
              <div className="pkgb-landhead">
                <h3>Manuscripts out with agents</h3>
                <span className="pkgb-tag">{holders.length} held</span>
              </div>
              {holders.map((h) => (
                <div key={h.queryId} className="pkgb-hrow">
                  <span className="pkgb-hagent">{h.agent}</span>
                  <span className="pkgb-hwhat">{h.what}</span>
                  {/* ⚠️ AN UNRECORDED VERSION SAYS SO. A send that predates the feature is not the
                      same fact as a send of the earliest version, and a chip guessing one would be
                      the app inventing a record the writer never made. */}
                  {h.versionName
                    ? <span className="pkgb-mver"><span aria-hidden="true">§</span>{h.versionName}</span>
                    : <span className="pkgb-hnone">Not recorded</span>}
                </div>
              ))}
              {/* ⚠️ D17 — A COUNT AND NOTHING MORE. No verb, no prompt, no recommended action:
                  whether to send an update is a judgement about a relationship, not a task. */}
              {earlier && <p className="pkgb-hnote">{earlier}</p>}
            </div>
          )}
        </>
      ) : null}
    </section>
  );
};
