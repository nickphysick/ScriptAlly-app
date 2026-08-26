/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE BOOK PROFILE — Versions (Pro) ═════════════════════════════════════════════════════════
 *
 * Reference: `design-refs/manuscripts-book-profile.html`, `#pane-versions`.
 *
 * ⚠️ THE PERMANENT LIMITATION IS STATED ON THE PAGE, NOT ONLY IN A REPORT. ScriptAlly records which
 * version a sample was SENT AS; it cannot open the file and check the text matches. That is a
 * property of the feature rather than a gap to close, so the surface that would otherwise read as a
 * guarantee says what it is: reported, not guaranteed.
 *
 * ⚠️ UNRECORDED IS NEVER FOLDED INTO A KNOWN, on all three panels. A sample sent before the feature
 * existed carries no version; it gets its own line in the list, its own row in Requests by opening,
 * and `Not recorded` in Who holds which version. It is never added to a named version's count and
 * never silently dropped. This feature has produced three faults of exactly that shape — the worst
 * is in `earlierLine`'s own docstring, where a denominator that included unrecorded holders made
 * the panel state "2 of 4 hold an earlier version" about two agents nobody knew anything about.
 * Locked in `src/lib/unrecordedVersion.test.ts`, proved red twice: once with the derivations
 * missing, once with an unrecorded sample folded into the first named version, where the
 * reconciliation caught it double-counting 4 samples against 3.
 *
 * ⚠️ AND `Requests by opening` IS NEVER SORTED BY REQUEST COUNT. Ordering openings by outcome is a
 * ranking, and the app reports rather than appraises. It keeps the writer's own version order.
 */
import React from "react";
import { SectionHeader } from "../containers/SectionHeader";
import { CappedCard } from "../containers/CappedCard";
import { BookVersionsPanel } from "./BookVersionsPanel";
import { HoldingRow, UnattributedOpening, OpeningRow } from "../../lib/bookVersions";
import type { Activity, BookVersion, ManuscriptVersion, Query } from "../../types";
import "./bookProfile.css";

/** What the app can and cannot promise about a version. Verbatim on the page, by ruling. */
export const VERSION_LIMITATION =
  "ScriptAlly records which version a sample was sent as — it can't check the text itself matches. " +
  "Reported, not guaranteed.";

export interface VersionsPaneProps {
  isPro: boolean;
  versions: readonly BookVersion[];
  materials: readonly ManuscriptVersion[];
  queries: readonly Query[];
  activities: readonly Activity[];
  today: string;
  onSaveBookVersions: (next: BookVersion[]) => void;
  openings: OpeningRow[];
  unattributed: UnattributedOpening;
  unrecordedHolders: number;
  holders: HoldingRow[];
  onUpgrade: () => void;
}

/**
 * ⚠️ FREE SEES AN OFFER, NOT AN OUTAGE AND NOT A GREYED PANEL. The distinction is one this page's
 * Scout already had to learn: a paying user shown an upgrade prompt is being sold what they own,
 * and a free user shown "unavailable" is told a temporary lie about a permanent state. This is the
 * offer: what the feature does, and the one way to it.
 */
const Offer: React.FC<{ onUpgrade: () => void }> = ({ onUpgrade }) => (
  <CappedCard tint="slate" label="Versions" right="Pro">
    <p className="msp-pitchtext">
      Name the openings you send — an initial draft, a prologue-first reordering, a post-R&amp;R
      revision — and the app records which one went to whom.
    </p>
    <p className="msp-footnote">
      It answers the question that arrives six months later: an agent surfaces after months of
      silence, and you need to know exactly what they are reading.
    </p>
    <div className="msp-offeracts">
      <button type="button" className="msv-btn sm msv-primary" onClick={onUpgrade}>Upgrade</button>
    </div>
  </CappedCard>
);

export const VersionsPane: React.FC<VersionsPaneProps> = ({
  isPro, versions, materials, queries, activities, today, onSaveBookVersions,
  openings, unattributed, unrecordedHolders, holders, onUpgrade,
}) => {
  if (!isPro) {
    return (
      <div className="msp-blk">
        <SectionHeader title="Versions" meta="Pro" />
        <Offer onUpgrade={onUpgrade} />
      </div>
    );
  }

  /* ⚠️ THE META STATES THE UNRECORDED SAMPLES ALONGSIDE THE RECORDED VERSIONS — the one number is
     not a qualification of the other, and stating only the first is how the page comes to imply
     that every sample belongs to an opening. Omitted entirely when there are none. */
  const meta = unattributed.samples > 0
    ? `${versions.length} recorded · ${unattributed.samples} unrecorded sample${unattributed.samples === 1 ? "" : "s"}`
    : `${versions.length} recorded`;

  return (
    <>
      <div className="msp-blk">
        <SectionHeader title="Versions" meta={meta} />
        <div className="msp-duo">
          <CappedCard tint="slate" label="Versions" right={`Pro · ${versions.length}`}>
            <BookVersionsPanel
              versions={versions}
              materials={materials}
              queries={queries}
              activities={activities}
              today={today}
              onSave={onSaveBookVersions}
              hideBand
            />
            {/* ⚠️ COUNTED HERE, NOT AGAINST ANY VERSION ABOVE — and the sentence says so, because
                a reader adding the per-version figures would otherwise find them short. */}
            {unrecordedHolders > 0 && (
              <p className="msp-unrec">
                <b>{unrecordedHolders} agent{unrecordedHolders === 1 ? "" : "s"}</b>{" "}
                hold{unrecordedHolders === 1 ? "s" : ""} a sample with no recorded version. Counted
                here, not against any version above.
              </p>
            )}
          </CappedCard>

          <CappedCard tint="slate" label="Requests by opening" right="Pro">
            <table className="msp-table">
              <thead><tr><th>Opening</th><th>Samples out</th><th>Requests followed</th></tr></thead>
              <tbody>
                {openings.map((o) => (
                  <tr key={o.id}>
                    <td><span className="msp-vlabel">{o.name}</span></td>
                    <td className="msp-num">{o.where.split(" ")[0]}</td>
                    <td>{o.meta}</td>
                  </tr>
                ))}
                {/* ⚠️ ITS OWN ROW, AND `Not attributed` RATHER THAN A FIGURE. A request that arrived
                    on a sample whose opening was never recorded cannot be attributed to an opening;
                    stating a number would attribute it to "unknown", which is not an opening
                    anybody can act on. */}
                {unattributed.samples > 0 && (
                  <tr>
                    <td className="soft">No recorded version</td>
                    <td className="msp-num soft">{unattributed.samples}</td>
                    <td className="soft">Not attributed</td>
                  </tr>
                )}
              </tbody>
            </table>
          </CappedCard>
        </div>
      </div>

      <div className="msp-blk">
        <CappedCard
          tint="slate"
          label="Who holds which version"
          right={`Pro · ${holders.length} agent${holders.length === 1 ? "" : "s"}`}
        >
          {holders.length === 0 ? (
            <p className="msp-empty">Nothing is with an agent right now.</p>
          ) : (
            <table className="msp-table">
              <thead><tr><th>Agent</th><th>Holds</th><th>Version</th><th>Sent</th></tr></thead>
              <tbody>
                {holders.map((h) => (
                  <tr key={h.queryId}>
                    <td>{h.agent}</td>
                    <td>{h.holds}</td>
                    <td className={h.versionName ? undefined : "soft"}>
                      {h.versionName
                        ? <span className="msp-vlabel">{h.versionName}</span>
                        : "Not recorded"}
                    </td>
                    <td className={`msp-num${h.sentDay ? "" : " soft"}`}>{h.sentDay ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="msp-footnote">{VERSION_LIMITATION}</p>
        </CappedCard>
      </div>
    </>
  );
};
