/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QcCourts — THE DESK (v95 §1): one white frame across the whole column, three equal sections.
 * With you · With the agent · Closed.
 *
 * It answers the three questions a writer asks of a pipeline — what is mine to do, what am I
 * waiting on, what is finished — and it replaced seven stat cards to do it. v95 takes the three
 * separate framed tiles and makes them three sections of ONE frame, because three boxes in a row
 * read as three more rows of the ledger beneath them, and one frame divided by hairlines reads as
 * a desk.
 *
 * ⚠️ NO FILLS: EMPHASIS IS TYPE ONLY. The reference offers a sand with-you section and a stone
 * closed one behind `body[data-d]` variants and §1 chooses the frame, where both are white. A tint
 * on one section would make it the loudest thing on a page whose whole top band is already the
 * loudest thing; the closed section is quietened by taking its numeral to ink45 instead.
 *
 * ⚠️ THE FOOT IS PINNED BY A `1fr` GRID ROW, NOT BY A HEIGHT. Each section is a four-row grid
 * whose third row is the spacer, so the foot sits at the bottom of whichever section is tallest and
 * all three agree whatever their italic lines do. A wrapped line in one section therefore cannot
 * put its own foot lower than its neighbours' — which is QC1, and which a matched `min-height`
 * would satisfy only until someone changed the type.
 *
 * ⚠️ AND THEY HOLD NO ROWS. The ledger below is the list; a section that named its first few
 * queries would be a second, shorter list of the same things, disagreeing with the first the moment
 * a filter moved.
 */
import React from "react";
import type { CourtTile, TileCourt } from "../../../lib/qcSummary";
import "./qcvCourts.css";

/**
 * ⚠️ THE SECTION'S COUNT AND ITS FILTER ARE ONE FUNCTION (`courtFilter` → `tileCourt`). Pressing a
 * section cannot show a number of rows that differs from the number the section states — see the
 * note at `courtFilter`, where the menu's own `"you"` and `"closed"` were measured disagreeing with
 * these counts by one and two rows.
 */
export const QcCourts: React.FC<{
  tiles: readonly CourtTile[];
  /** Which section is currently filtering the list, if any — pressing it again clears. */
  active?: TileCourt | null;
  onCourt: (key: TileCourt) => void;
  loading?: boolean;
}> = ({ tiles, active = null, onCourt, loading = false }) => (
  <div className="qcv-deskw" data-qcv="deskw">
    <div className="qcv-desk" data-qcv="courts">
      {tiles.map((t) => (
        <button
          key={t.key}
          type="button"
          className={`qcv-half qcv-half--${t.key}${active === t.key ? " is-on" : ""}`}
          data-qcv="court"
          data-court={t.key}
          aria-pressed={active === t.key}
          disabled={loading}
          /**
           * ⚠️ THE NAME IS STATED ONCE TO A READER AND TWICE ON THE PAGE, deliberately. §1 puts the
           * court's name beside the count and the count is a numeral, which reads as
           * "4 with you one of them is an offer to decide" to a screen reader. So the button
           * carries its own sentence and everything inside it is hidden.
           */
          aria-label={`${t.name}: ${t.count} ${t.count === 1 ? "query" : "queries"}. ${t.fact}.${
            /* §5 — spoken only where there is a date: an em dash is for the eye */
            t.when.date ? ` ${t.when.label} ${t.when.date}.` : ""
          }`}
          onClick={() => onCourt(t.key)}
        >
          <span className="qcv-half-num" data-qcv="court-count" aria-hidden="true">{t.count}</span>
          <span className="qcv-half-lab" aria-hidden="true">{t.name}</span>
          {/* ⚠️ THE RUST IS THE OFFER PHRASE'S AND NO OTHER — the same mark, meaning the same
              thing, as the rust on a ledger row: this is yours to move. §1 names it for the offer
              clause alone, so the fact is split rather than coloured whole. */}
          <span className={`qcv-half-note${t.urgent ? " qcv-half-note--urgent" : ""}`} data-qcv="court-fact" aria-hidden="true">
            {t.key === "you" && /offer/.test(t.fact) ? <em>{t.fact}</em> : t.fact}
          </span>
          <span className="qcv-half-foot" data-qcv="court-foot" aria-hidden="true">
            <span className="qcv-half-who" data-qcv="court-who">
              {t.who.map((d) => <i key={d.name + d.initials} title={d.name}>{d.initials}</i>)}
              {t.more > 0 && <i className="qcv-half-more">+{t.more}</i>}
            </span>
            {/* §5 (v96.1) — the clause always renders; an em dash is what a court with no date
                shows. Dropping it whole gave three sections three shapes, and made the one with
                least to say look like the one that failed to load. */}
            <span className="qcv-half-when" data-qcv="court-when">{t.when.label} <b>{t.when.date ?? "—"}</b></span>
          </span>
        </button>
      ))}
    </div>
  </div>
);

/**
 * The same desk at the same height, with nothing readable in it.
 *
 * ⚠️ IT RENDERS THE REAL MARKUP AND THE REAL STRINGS, AND HIDES THE INK. Sized by hand the tile
 * came out 102 against the loaded 112 and the sentence below jumped 10px when the cover lifted;
 * sized in `em` it came within 1.3px, which is the same mistake wearing a smaller number — both are
 * arithmetic ABOUT a line box rather than the line box. With the real elements carrying real text
 * the heights are identical by construction and stay identical through any retune of the type.
 *
 * The strings are the court names because they are the right LENGTH; nothing can read them. The
 * foot draws its four discs for the same reason — a skeleton with no foot is 38px short.
 */
export const QcCourtsSkeleton: React.FC = () => (
  <div className="qcv-deskw" data-qcv="deskw" aria-hidden="true">
    <div className="qcv-desk" data-qcv="courts">
      {[["you", "With you", "one of them is an offer"], ["agent", "With the agent", "none past the date"], ["closed", "Closed", "none passed · none no reply"]].map(([k, name, fact]) => (
        <div key={k} className={`qcv-half qcv-half--${k} qcv-half--sk`} data-qcv="sk-court">
          <span className="qcv-half-num qcv-skw">00</span>
          <span className="qcv-half-lab qcv-skw">{name}</span>
          <span className="qcv-half-note qcv-skw">{fact}</span>
          <span className="qcv-half-foot">
            <span className="qcv-half-who">{["AA", "BB", "CC", "DD"].map((i) => <i key={i} className="qcv-skw">{i}</i>)}</span>
            <span className="qcv-half-when qcv-skw">next due <b>00 Xxx</b></span>
          </span>
        </div>
      ))}
    </div>
  </div>
);
