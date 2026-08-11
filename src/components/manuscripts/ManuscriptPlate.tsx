/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The sage plateband — the head of the manuscript card. Reference:
 * design-refs/manuscripts-plate.html, `.plateband`.
 *
 * ⚠️ PROPS ONLY. This reads no context, no store and no Firebase, so it renders standalone in a
 * spec and its figures can be asserted against `plateStats` rather than against a mock database.
 * `AllManuscripts` wires it at Phase 6; nothing here knows that.
 *
 * ⚠️ ABSENCE OMITS ITSELF, AND THE THREE ABSENCES ARE NOT THE SAME SHAPE.
 * No logline → the line is not rendered at all (never placeholder prose about adding one).
 * No genres → no pills. No queries → the two counts read `0`, which is TRUE, while last activity
 * reads `—`, because there is no date and a `0` there would assert an event that never happened.
 * The split lives in `plateStatCells`, so every caller resolves absence the same way.
 */
import React from "react";
import { PlateStats, plateStatCells } from "../../lib/manuscriptPlate";
import manuscriptIcon from "../../assets/shell/manuscript-icon.png";
import "./manuscriptPlate.css";

export interface ManuscriptPlateProps {
  title: string;
  /** Already resolved for presentation — "Shelved" when shelved, else the workflow status. */
  status: string;
  /** Greys the status pill, and (with `canSendQuery`) is why a shelved book offers no Send. */
  shelved?: boolean;
  genres?: string[];
  wordCount?: number;
  logline?: string;
  stats: PlateStats;
  onSendQuery?: () => void;
  onEditDetails?: () => void;
}

export const ManuscriptPlate: React.FC<ManuscriptPlateProps> = ({
  title,
  status,
  shelved = false,
  genres = [],
  wordCount,
  logline,
  stats,
  onSendQuery,
  onEditDetails,
}) => (
  <div className="msv-plateband">
    {/*
      ⚠️ THE PLATE MARK IS THE DASHBOARD'S PNG, IMPORTED — not a traced SVG sibling of the four in
      manuscriptMarks.tsx. `OneScreenAuthor` already renders this exact asset the same way
      (contained, on a white plate, no blend mode). One asset, one home.
    */}
    <div className="msv-plateimg">
      <img src={manuscriptIcon} alt="" />
    </div>

    <div className="msv-plateid">
      <span className={`msv-statuspill${shelved ? " grey" : ""}`}>
        <span className="msv-dt" />
        {status}
      </span>
      <h2 className="msv-platetitle">{title}</h2>
      <div className="msv-platemeta">
        {genres.map((g) => (
          <span key={g} className="msv-gp">{g}</span>
        ))}
        {wordCount !== undefined && (
          <span className="msv-wc">{wordCount.toLocaleString("en-GB")} words</span>
        )}
      </div>
      {/* No logline → nothing. A prompt to write one belongs in Edit details, not on the plate. */}
      {logline ? <div className="msv-platelog">{logline}</div> : null}
    </div>

    <div className="msv-plateside">
      <div className="msv-statstrip">
        {plateStatCells(stats).map((cell) => (
          <div key={cell.key} className="msv-stat">
            <div className="msv-statn">{cell.value}</div>
            <div className="msv-statk">{cell.key}</div>
          </div>
        ))}
      </div>
      <div className="msv-plateacts">
        <button type="button" className="msv-btn sm" onClick={onEditDetails}>
          Edit details
        </button>
        {/* A shelved manuscript offers no Send — the same rule the plate list already applies. */}
        {!shelved && (
          <button type="button" className="msv-btn sm msv-primary" onClick={onSendQuery}>
            Send a query
          </button>
        )}
      </div>
    </div>
  </div>
);
