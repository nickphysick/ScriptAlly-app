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
  /** Which section is currently chosen, if any — pressing it again clears. */
  active?: TileCourt | null;
  onCourt: (key: TileCourt) => void;
  loading?: boolean;
  /**
   * v126 §7 — A DISC OPENS ITS QUERY, in the centred card. Given this, each section is drawn as a
   * group: a stretched button chooses the court and the discs are buttons of their own above it —
   * a control inside a `<button>` is invalid and a screen reader would hear one. Without it (the
   * empty state's exhibition) the section is the single button it has always been.
   */
  onOpenQuery?: (id: string) => void;
}> = ({ tiles, active = null, onCourt, loading = false, onOpenQuery }) => (
  <div className="qcv-deskw" data-qcv="deskw">
    <div className="qcv-desk" data-qcv="courts">
      {tiles.map((t) => {
        /**
         * ⚠️ THE NAME IS STATED ONCE TO A READER AND TWICE ON THE PAGE, deliberately. §1 puts the
         * court's name beside the count and the count is a numeral, which reads as
         * "4 with you one of them is an offer to decide" to a screen reader. So the control
         * carries its own sentence and the drawn content is hidden.
         */
        const label = `${t.name}: ${t.count} ${t.count === 1 ? "query" : "queries"}. ${t.fact}.${
          /* §5 — spoken only where there is a date: an em dash is for the eye */
          t.when.date ? ` ${t.when.label} ${t.when.date}.` : ""
        }`;
        const body = (discs: boolean) => (
          <>
            <span className="qcv-half-num" data-qcv="court-count" aria-hidden="true">{t.count}</span>
            <span className="qcv-half-lab" aria-hidden="true">{t.name}</span>
            {/* ⚠️ THE RUST IS THE OFFER PHRASE'S AND NO OTHER — the same mark, meaning the same
                thing, as the rust on a ledger row: this is yours to move. §1 names it for the offer
                clause alone, so the fact is split rather than coloured whole. */}
            <span className={`qcv-half-note${t.urgent ? " qcv-half-note--urgent" : ""}`} data-qcv="court-fact" aria-hidden="true">
              {t.key === "you" && /offer/.test(t.fact) ? <em>{t.fact}</em> : t.fact}
            </span>
            <span className="qcv-half-foot" data-qcv="court-foot" aria-hidden={discs ? undefined : "true"}>
              <span className="qcv-half-who" data-qcv="court-who">
                {t.who.map((d) => discs && d.queryId
                  ? (
                    <button key={d.name + d.initials} type="button" className="qcv-disc" data-qcv="court-disc"
                      aria-label={`Open the query to ${d.name}`} title={d.name}
                      onClick={(e) => { e.stopPropagation(); onOpenQuery!(d.queryId!); }}>
                      <i aria-hidden="true">{d.initials}</i>
                    </button>
                  )
                  : <i key={d.name + d.initials} title={d.name} aria-hidden={discs ? "true" : undefined}>{d.initials}</i>)}
                {t.more > 0 && <i className="qcv-half-more" aria-hidden={discs ? "true" : undefined}>+{t.more}</i>}
              </span>
              {/* §5 (v96.1) — the clause always renders; an em dash is what a court with no date
                  shows. Dropping it whole gave three sections three shapes, and made the one with
                  least to say look like the one that failed to load. */}
              <span className="qcv-half-when" data-qcv="court-when" aria-hidden={discs ? "true" : undefined}>{t.when.label} <b>{t.when.date ?? "—"}</b></span>
            </span>
          </>
        );
        if (onOpenQuery) {
          return (
            <div key={t.key} role="group" aria-label={t.name}
              className={`qcv-half qcv-half--${t.key} qcv-half--grp${active === t.key ? " is-on" : ""}`}
              data-qcv="court" data-court={t.key}>
              <button type="button" className="qcv-half-hit" data-qcv="court-pick" aria-pressed={active === t.key}
                disabled={loading} aria-label={label} onClick={() => onCourt(t.key)} />
              {body(true)}
            </div>
          );
        }
        return (
          <button
            key={t.key}
            type="button"
            className={`qcv-half qcv-half--${t.key}${active === t.key ? " is-on" : ""}`}
            data-qcv="court"
            data-court={t.key}
            aria-pressed={active === t.key}
            disabled={loading}
            aria-label={label}
            onClick={() => onCourt(t.key)}
          >
            {body(false)}
          </button>
        );
      })}
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
