/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QcCourts — the three court tiles (v65 §4): With you · With the agent · Closed.
 *
 * They replace the Overview's seven-or-eight stat cards with the three questions a writer actually
 * asks of a pipeline: what is mine to do, what am I waiting on, and what is finished. Each is a
 * button that fans its own queries.
 *
 * ⚠️ THE TILES ARE THE ONE FRAMED THING LEFT ON THIS PAGE (§1.5). Every other card here wears the
 * landing page's clothes — white, a soft shadow, a band flush at the top, 12px corners, no rim and
 * no burgundy line. The tiles keep the rim-and-frame treatment precisely so they do NOT read as
 * three more rows of the ledger beneath them.
 *
 * ⚠️ AND THEY HOLD NO ROWS. The ledger below is the preview; a tile that listed its first few
 * queries would be a second, shorter list of the same things, disagreeing with the first the moment
 * a filter moved.
 */
import React from "react";
import type { CourtTile, TileCourt } from "../../../lib/qcSummary";
import "./qcvCourts.css";

export const QcCourts: React.FC<{
  tiles: readonly CourtTile[];
  /** A tile deals its hand. The element is captured so the fan deals FROM it and focus returns TO it. */
  onCourt: (key: TileCourt, el: HTMLElement) => void;
  loading?: boolean;
}> = ({ tiles, onCourt, loading = false }) => (
  <div className="qcv-courts" data-qcv="courts">
    {tiles.map((t) => (
      <button
        key={t.key}
        type="button"
        className={`qcv-court qcv-court--${t.key}`}
        data-qcv="court"
        data-court={t.key}
        disabled={loading}
        /**
         * ⚠️ THE NAME IS STATED ONCE TO A READER AND TWICE ON THE PAGE, deliberately. §4 puts the
         * court's name in the band AND beside the count, which is right typographically and reads
         * as "With you 11 With you 1 offer to decide" to a screen reader. So the button carries its
         * own name and everything inside it is hidden: a label built from the parts the design
         * happens to repeat is not the sentence a reader needs.
         */
        aria-label={`${t.name}: ${t.count} ${t.count === 1 ? "query" : "queries"}. ${t.fact}.`}
        onClick={(e) => onCourt(t.key, e.currentTarget)}
      >
        <span className="qcv-court-band" data-qcv="court-band" aria-hidden="true">
          <span className="qcv-court-nm">{t.name}</span>
          {/* ⚠️ THE RUST DOT IS THE WITH-YOU TILE'S AND NO OTHER — the same mark, meaning the same
              thing, as the rust rule on a ledger row: this is yours to move. */}
          {t.rust && <i className="qcv-court-dot" aria-hidden="true" />}
          {/* the hover affordance rides the band's right end rather than taking a row of its own */}
          <i className="qcv-court-see" aria-hidden="true">see all →</i>
        </span>
        <span className="qcv-court-body" aria-hidden="true">
          <span className="qcv-court-head">
            <b className="qcv-court-n" data-qcv="court-count">{t.count}</b>
            <span className="qcv-court-lbl">{t.name}</span>
          </span>
          <small className={`qcv-court-fact${t.urgent ? " qcv-court-fact--urgent" : ""}`} data-qcv="court-fact">{t.fact}</small>
        </span>
      </button>
    ))}
  </div>
);

/**
 * The same three tiles at the same height, with nothing readable in them.
 *
 * ⚠️ IT RENDERS THE REAL MARKUP AND THE REAL STRINGS, AND HIDES THE INK. Sized by hand — a 30px
 * block for the count, 9px for the line — the tile came out 102 against the loaded 112 and the
 * sentence below jumped 10px when the cover lifted. Sized in `em` it came within 1.3px, which is
 * the same mistake wearing a smaller number: both are arithmetic ABOUT a line box rather than the
 * line box. With the real elements carrying real text, the heights are identical by construction
 * and stay identical through any retune of the type.
 *
 * The strings are the court names because they are the right LENGTH; nothing can read them.
 */
export const QcCourtsSkeleton: React.FC = () => (
  <div className="qcv-courts" data-qcv="courts" aria-hidden="true">
    {[["you", "With you"], ["agent", "With the agent"], ["closed", "Closed"]].map(([k, name]) => (
      <div key={k} className={`qcv-court qcv-court--${k} qcv-court--sk`} data-qcv="sk-court">
        <span className="qcv-court-band" />
        <span className="qcv-court-body">
          <span className="qcv-court-head">
            <b className="qcv-court-n qcv-skw">00</b>
            <span className="qcv-court-lbl qcv-skw">{name}</span>
          </span>
          <small className="qcv-court-fact qcv-skw">none yet</small>
        </span>
      </div>
    ))}
  </div>
);
