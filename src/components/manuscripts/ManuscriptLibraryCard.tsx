/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * One book on the library shelf. Reference: design-refs/manuscript-library.html, `.book`.
 *
 * ⚠️ PROPS ONLY — no context, no store, no Firebase, the same discipline `ManuscriptPlate` keeps.
 * Every figure arrives already derived (`plateStats`, `pitchMeter`) so a spec can assert this card
 * against those functions rather than against a mock database.
 *
 * ⚠️ THE MARK IS THE DASHBOARD'S PNG, NOT A TRACED SVG. The ref draws a book-and-pen glyph, but
 * `ManuscriptPlate` and `OneScreenAuthor` already render `manuscript-icon.png` on a white plate, and
 * tracing it here would fork one illustration into two that drift.
 *
 * ⚠️ ABSENCE OMITS ITS CLAUSE. No logline → a muted "No logline yet" (the card is a shelf and an
 * empty slot has to read as empty). No queries → "No queries yet" ALONE: the responses clause is not
 * rendered at all, because `0 responses` beside no queries states a second fact nobody asked about.
 */
import React from "react";
import { PlateStats } from "../../lib/manuscriptPlate";
import { PitchMeter } from "../../lib/manuscriptPitch";
import manuscriptIcon from "../../assets/shell/manuscript-icon.png";
import "./manuscriptLibrary.css";

export interface ManuscriptLibraryCardProps {
  title: string;
  /** Already resolved for presentation — "Shelved" when shelved, else the workflow status. */
  status: string;
  shelved?: boolean;
  /** Display labels, already resolved through `genreDisplay` — never raw stored ids. */
  genres?: string[];
  wordCount?: number;
  logline?: string;
  stats: PlateStats;
  meter: PitchMeter;
  onOpen: () => void;
}

/** "1 query" / "24 queries" — the count is the subject of the sentence, so it has to agree. */
function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export const ManuscriptLibraryCard: React.FC<ManuscriptLibraryCardProps> = ({
  title,
  status,
  shelved = false,
  genres = [],
  wordCount,
  logline,
  stats,
  meter,
  onOpen,
}) => (
  <button
    type="button"
    className={`mlib-book${shelved ? " shelved" : ""}`}
    onClick={onOpen}
    aria-label={`Open ${title}`}
  >
    <div className="mlib-cover">
      <span className={`msv-statuspill${shelved ? " grey" : ""}`}>
        <span className="msv-dt" />
        {status}
      </span>
      <span className="mlib-plate">
        <img src={manuscriptIcon} alt="" />
      </span>
      <h3 className="mlib-title">{title}</h3>
      <div className="mlib-meta">
        {genres.map((g) => (
          <span key={g} className="msv-gp">{g}</span>
        ))}
        {wordCount !== undefined && (
          <span className="mlib-wc">{wordCount.toLocaleString("en-GB")} words</span>
        )}
      </div>
    </div>

    <div className="mlib-body">
      {logline ? (
        <div className="mlib-logl">{logline}</div>
      ) : (
        <div className="mlib-logl none">No logline yet</div>
      )}

      {/* The meter draws the fills it is given — it never recounts them from the caption. */}
      <div className="mlib-meter">
        <div className="mlib-meterrow">
          {meter.segments.map((on, i) => (
            <span key={i} className={`mlib-seg${on ? " on" : ""}`} />
          ))}
        </div>
        <div className="mlib-metertxt">
          <span>{meter.left}</span>
          {meter.right && <span>{meter.right}</span>}
        </div>
      </div>
    </div>

    <div className="mlib-foot">
      {stats.queriesSent === 0 ? (
        <span>No queries yet</span>
      ) : (
        <>
          <span><b>{stats.queriesSent}</b> {stats.queriesSent === 1 ? "query" : "queries"}</span>
          <span><b>{stats.responses}</b> {stats.responses === 1 ? "response" : "responses"}</span>
        </>
      )}
      <span className="mlib-open">Open →</span>
    </div>
  </button>
);

export interface ManuscriptAddTileProps {
  onAdd: () => void;
}

/**
 * The dashed add tile, last in the grid.
 *
 * ⚠️ IT RENDERS AT EVERY COUNT, INCLUDING ONE. At one manuscript the grid holds one card and this
 * tile — that IS the intended appearance, not a case to special-case away. The hint says the shelf
 * holds more than one, which is a fact about the shelf rather than a nudge about the writer.
 */
export const ManuscriptAddTile: React.FC<ManuscriptAddTileProps> = ({ onAdd }) => (
  <button type="button" className="mlib-add" onClick={onAdd}>
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
    <span className="mlib-addl">Add a manuscript</span>
    <span className="mlib-addh">— the shelf holds more than one.</span>
  </button>
);
