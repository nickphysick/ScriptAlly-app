/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ OPENING READ · MANUSCRIPT HELD (Part E, D7) ═══════════════════════════════════════════════
 *
 * Design authority: design-refs/query-centre-version-impact.html §1.
 *
 * ⚠️ TWO DERIVED LINES AND NOTHING STORED. "Opening read" is the version on the sample in the
 * package that went out; "Manuscript held" is the version on the last full or partial sent. Nobody
 * records either — which is why they cannot fall out of step with the package or the log.
 *
 * ⚠️ A DIFFERENCE IS STATED AND STOPS THERE. Sending a revision can be entirely deliberate; the app
 * reports the fact and offers no verdict, no prompt and no control. `MATCH_NOTE` carries the wording
 * and is locked against every urging verb.
 *
 * ⚠️ AND "NOT RECORDED" IS A LINE, NOT A SILENCE (D9). Every send made before this feature carries
 * no version, so unrecorded is the ORDINARY case rather than the edge — and silence beside "Opening
 * read" would read as agreement.
 */
import React from "react";
import type { Activity, BookVersion, ManuscriptVersion, Query, SubmissionPackage } from "../../types";
import { openingRead, manuscriptHeld, versionMatch, MATCH_NOTE, versionsActive } from "../../lib/queryVersions";
import "./versionLines.css";

export interface VersionLinesProps {
  query: Query;
  packages: readonly SubmissionPackage[];
  materials: readonly ManuscriptVersion[];
  activities: readonly Activity[];
  bookVersions: readonly BookVersion[];
}

/** The § chip — the same mark the packages page and the manuscripts panel draw. */
const Chip: React.FC<{ name: string }> = ({ name }) => (
  <span className="pkgb-mver"><span aria-hidden="true">§</span>{name}</span>
);

export const VersionLines: React.FC<VersionLinesProps> = ({
  query, packages, materials, activities, bookVersions,
}) => {
  /* ⚠️ THE SHARED GATE (D12). Below two versions this renders nothing at all — not a quiet row, not
     a dash. A writer running one opening has no comparison to draw. */
  if (!versionsActive({ bookVersions: bookVersions as BookVersion[] })) return null;

  const read = openingRead(query, packages, materials, bookVersions);
  const held = manuscriptHeld(query.id, activities, bookVersions);

  /* Nothing read and nothing sent: the feature has nothing to say about this query. */
  if (!read && !held) return null;

  const state = held ? versionMatch(read, held.version) : "unknown";

  return (
    <div className="qv-lines">
      {read && (
        <div className="qv-line">
          <span className="qv-k">Opening read</span>
          <Chip name={read.name} />
          {/* Where it came from, so the derivation is legible rather than magic. */}
          <span className="qv-src">from the sample in this package</span>
        </div>
      )}
      {/**
        * ⚠️ THE HELD LINE APPEARS ONLY ONCE SOMETHING HAS BEEN SENT. `manuscriptHeld` returns null
        * until then — which is a different fact from "sent, version unknown", and the two render
        * differently: no line at all, against a line that says the version is not recorded.
        */}
      {held && (
        <div className="qv-line">
          <span className="qv-k">Manuscript held</span>
          {held.version
            ? <Chip name={held.version.name} />
            : <span className="qv-none">Not recorded</span>}
          <span className={`qv-note qv-note--${state}`}>
            {state === "match" && <span aria-hidden="true">✓ </span>}
            {state === "differs" && <span aria-hidden="true">△ </span>}
            {MATCH_NOTE[state]}
          </span>
        </div>
      )}
    </div>
  );
};
