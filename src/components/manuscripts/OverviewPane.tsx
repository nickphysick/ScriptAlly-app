/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE BOOK PROFILE — Overview ═══════════════════════════════════════════════════════════════
 *
 * The pitch, the five figures, and who is holding something right now.
 * Reference: `design-refs/manuscripts-book-profile.html`, `#pane-overview`.
 *
 * ⚠️ EVERY FIGURE IS DERIVED AT READ TIME. Nothing here is stored, cached or written back, and
 * nothing on this page goes near `recomputeQuery`.
 *
 * ⚠️ THE PITCH CARD IS READ-ONLY, AND ITS `Edit pitch` CONTROL IS DELIBERATELY NOT BUILT.
 * `Manuscript.elevatorPitch` is NOT in the manuscript-update allowlist in `firestore.rules`
 * (`title, genre, subGenres, ageCategory, wordCount, logline, comps, status, shelvedReason,
 * statusChangedDate, notes, shelved, activePackageId, bookVersions`), so a write carrying it is
 * SILENTLY DENIED — the affectedKeys gotcha. A button that appears to save and does not is worse
 * than no button, and this repo already records that under a dead Undo. The ref draws the control;
 * it returns with the rules line, which is Nick's to deploy.
 *
 * ⚠️ AND `Who holds what` HAS NO VERSION COLUMN HERE. Which version an agent holds is Pro, and the
 * footnote says where it lives rather than teasing it — a greyed column would advertise a feature
 * in the place a fact should be.
 */
import React from "react";
import { SectionHeader } from "../containers/SectionHeader";
import { CappedCard } from "../containers/CappedCard";
import { GlanceCell } from "../../lib/manuscriptProfile";
import { HoldingRow } from "../../lib/bookVersions";
import "./bookProfile.css";

export interface OverviewPaneProps {
  /** The elevator pitch, or null when it has not been written. */
  pitch: string | null;
  /** `38 words`, or null where there is no pitch to measure. */
  pitchMeta: string | null;
  glance: GlanceCell[];
  glanceMeta: string;
  holders: HoldingRow[];
  /** Switches the reader to the Versions tab, where the version column lives. */
  onOpenVersions: () => void;
}

export const OverviewPane: React.FC<OverviewPaneProps> = ({
  pitch, pitchMeta, glance, glanceMeta, holders, onOpenVersions,
}) => (
  <>
    <div className="msp-blk">
      <SectionHeader title="The pitch" meta={pitchMeta ?? undefined} />
      <CappedCard tint="outgoing" label="Elevator pitch">
        {/* ⚠️ AN UNWRITTEN PITCH SAYS SO. It does not render an empty card, and it does not offer
            to write one — the editor is unreachable until the rules allowlist carries the field. */}
        {pitch
          ? <p className="msp-pitchtext">{pitch}</p>
          : <p className="msp-empty">No elevator pitch written yet.</p>}
      </CappedCard>
    </div>

    <div className="msp-blk">
      <SectionHeader title="At a glance" meta={glanceMeta} />

      <div className="sa-card msp-glancecard">
        <div className="msp-stats">
          {glance.map((c) => (
            <div key={c.key} className="msp-stat">
              {/* ⚠️ A NOUGHT IS STATED. Every cell here is a count, and a count of nought is the
                  fact — an omitted cell would read as a figure nobody knows. */}
              <div className={`msp-statn${c.soft ? " soft" : ""}`}>{c.value}</div>
              <div className="msp-statl">{c.label}</div>
            </div>
          ))}
        </div>
      </div>

      <CappedCard
        /* ⚠️ OUTGOING. What an agent is holding is material you SENT and that is still out with
           them — the same reading that makes correspondence pink. It is not something that came
           back; when it comes back the query moves off this table. */
        tint="outgoing"
        label="Who holds what"
        right={`${holders.length} agent${holders.length === 1 ? "" : "s"}`}
        className="msp-holders"
      >
        {holders.length === 0 ? (
          <p className="msp-empty">Nothing is with an agent right now.</p>
        ) : (
          <>
            <table className="msp-table">
              <thead><tr><th>Agent</th><th>Holds</th><th>Since</th></tr></thead>
              <tbody>
                {holders.map((h) => (
                  <tr key={h.queryId}>
                    <td>{h.agent}</td>
                    <td>{h.holds}</td>
                    {/* ⚠️ AN UNDATED SEND STATES NO DATE. The em dash says "not recorded"; a
                        fabricated one would be indistinguishable from a real one. */}
                    <td className={`msp-num${h.sentDay ? "" : " soft"}`}>{h.sentDay ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="msp-footnote">
              Which version each agent holds is shown under{" "}
              <button type="button" className="msp-inlinelink" onClick={onOpenVersions}>Versions</button>.
            </p>
          </>
        )}
      </CappedCard>
    </div>
  </>
);
