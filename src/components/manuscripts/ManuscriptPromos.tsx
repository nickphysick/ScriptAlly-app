/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE LANDING'S THREE PROMOS ════════════════════════════════════════════════════════════════
 *
 * Ref: `design-refs/manuscripts-promos.html`.
 *
 * ⚠️ NEVER ABOUT THIS BOOK — about what a manuscript can DO here. A promo reporting on the writer's
 * own manuscript would be a figure competing with the shelf beside it.
 *
 * ⚠️ AND THE WORD-COUNT TILE IS THE ONE THAT COULD DRIFT INTO APPRAISAL. It is reference: the
 * marker is one class wherever it falls, there is no colour by position and no verdict word, and
 * the free plan's no-usage-meter rule is not bent by it. `markerClass` takes no argument, so there
 * is nothing it could vary by — asserted in `wordCountBands.test.ts`.
 */
import React from "react";
import { Manuscript, ManuscriptVersion, User } from "../../types";
import { PersonalGenre, normaliseStoredGenre } from "../../lib/genres";
import { PromoTile, visibleTiles } from "../../lib/promoTiles";
import { Band, bandFor, markerClass, markerFraction, axisFor, rangeLabel, axisTicks } from "../../lib/wordCountBands";
import "./manuscriptPromos.css";

export interface ManuscriptPromosProps {
  user: Pick<User, "todoPrefs" | "personalGenres"> | null;
  /** The book the chart marks — the shelf's first, or the open one. Null renders no marker. */
  manuscript: Manuscript | null;
  /** ⚠️ THE WHOLE SHELF, because the versions rule asks about the WRITER on the landing, not a book. */
  manuscripts: Pick<Manuscript, "id">[];
  versions: Pick<ManuscriptVersion, "manuscriptId">[];
  onDismiss: (tile: PromoTile) => void;
  onVersions: () => void;
  onPackages: () => void;
}

/** Two other genres for context, so the writer's row is not the only band on the axis. */
const CONTEXT_GENRES = ["literary-fiction", "fantasy", "crime"];

export const ManuscriptPromos: React.FC<ManuscriptPromosProps> = ({
  user, manuscript, manuscripts, versions, onDismiss, onVersions, onPackages,
}) => {
  const tiles = visibleTiles({ user, manuscripts, versions });
  if (!tiles.length) return null;

  const personal: PersonalGenre[] = user?.personalGenres ?? [];
  const mine = manuscript?.genre ? bandFor(manuscript.genre, personal) : null;
  /**
   * ⚠️ COMPARED AFTER NORMALISING. A stored genre is an id on new books and a legacy LABEL on older
   * ones, so `g !== manuscript.genre` compared "literary-fiction" against "Literary Fiction", never
   * matched, and the writer's own genre was drawn TWICE — once as context and once as theirs. The
   * same fault that stopped the marker rendering, in a second place.
   */
  const mineId = manuscript?.genre ? normaliseStoredGenre(manuscript.genre, personal) : null;
  const context = CONTEXT_GENRES
    .filter((g) => g !== mineId)
    .map((g) => bandFor(g, personal))
    .filter((b): b is Band => b !== null)
    .slice(0, 3);
  const rows: { band: Band; yours: boolean }[] = [
    ...context.map((band) => ({ band, yours: false })),
    ...(mine ? [{ band: mine, yours: true }] : []),
  ];
  const ticks = axisTicks(axisFor(rows.map((r) => r.band), manuscript?.wordCount));
  const axis = axisFor(rows.map((r) => r.band), manuscript?.wordCount);
  const pct = (n: number) => `${(markerFraction(n, axis.min, axis.max) * 100).toFixed(1)}%`;

  const dismiss = (tile: PromoTile) => (
    <button type="button" className="mpr-x" onClick={() => onDismiss(tile)}
            aria-label="Hide this">×</button>
  );

  return (
    /* The grid fills whatever is on it — see the note at `.mpr`. */
    <div className="mpr" style={{ "--mpr-count": tiles.length } as React.CSSProperties}>
      {tiles.includes("versions") && (
        <article className="mpr-tile">
          <div className="mpr-info" aria-hidden="true">
            {/* Two spines, arrowed to a requests box — the shape of what versions are for. */}
            <span className="mpr-spine" /><span className="mpr-spine mpr-spine--b" />
            <span className="mpr-arrow">→</span>
            <span className="mpr-box">Requests</span>
          </div>
          <div className="mpr-copy">
            <h3 className="mpr-name">Versions <span className="mpr-pro">Pro</span></h3>
            <p className="mpr-body">Keep more than one cut of the book, and see which one each agent is holding.</p>
            <button type="button" className="mpr-link" onClick={onVersions}>How versions work ›</button>
          </div>
        </article>
      )}

      {tiles.includes("wordcount") && (
        <article className="mpr-tile">
          {dismiss("wordcount")}
          <div className="mpr-info">
            <div className="wcb">
              {rows.map(({ band, yours }) => (
                <div className={`wcb-row${yours ? " wcb-row--yours" : ""}`} key={band.label + String(yours)}>
                  {/* ⚠️ THE GENRE, NOT "YOURS". The writer's row said `YOURS`, which names the reader
                      rather than the thing being compared — and left the chart with one fewer genre
                      on it than it draws. The label is the band's own, marked as theirs by weight. */}
                  <span className="wcb-label" title={band.label}>{band.label}</span>
                  <span className="wcb-track">
                    {/* ⚠️ A GENERIC BAND RENDERS LIGHTER, so a personal genre does not look as
                        though it has specific guidance it does not have. */}
                    <span
                      className={`wcb-fill${band.generic ? " wcb-fill--generic" : ""}`}
                      style={{ left: pct(band.min), right: `${100 - markerFraction(band.max, axis.min, axis.max) * 100}%` }}
                    />
                    {yours && manuscript?.wordCount ? (
                      <>
                        <span className="wcb-you" style={{ left: pct(manuscript.wordCount) }}>You</span>
                        {/* ⚠️ ONE CLASS, WHEREVER IT FALLS. See the file header. */}
                        <span className={markerClass()} style={{ left: pct(manuscript.wordCount) }} />
                      </>
                    ) : null}
                  </span>
                  {/* ⚠️ THE FIGURES. Without them the row is a bar you cannot read a number off. */}
                  <span className="wcb-range">{rangeLabel(band)}</span>
                </div>
              ))}
              {/* ⚠️ THE AXIS. A band with no scale says nothing about how long a book is. */}
              <div className="wcb-axis" aria-hidden="true">
                {ticks.map((t) => (
                  <span key={t} className="wcb-tick" style={{ left: pct(t) }}>
                    {t >= 1000 ? `${Math.round(t / 1000)}k` : String(t)}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="mpr-copy">
            <h3 className="mpr-name">Word count</h3>
            <p className="mpr-body">Where your book sits against the usual ranges — shown, not scored.</p>
            <p className="mpr-foot">Reference only: ranges vary by imprint and by list fit.</p>
          </div>
        </article>
      )}

      {tiles.includes("packages") && (
        <article className="mpr-tile">
          {dismiss("packages")}
          <div className="mpr-info" aria-hidden="true">
            <span className="mpr-brace">
              <span className="mpr-doc">Letter</span>
              <span className="mpr-doc">Synopsis</span>
              <span className="mpr-doc">Chapters</span>
            </span>
            <span className="mpr-arrow">→</span>
            <span className="mpr-avs"><i /><i /><i /></span>
          </div>
          <div className="mpr-copy">
            <h3 className="mpr-name">Submission packages</h3>
            <p className="mpr-body">Group a letter, a synopsis and sample chapters, and send the same set to several agents.</p>
            <button type="button" className="mpr-link" onClick={onPackages}>Open packages ›</button>
          </div>
        </article>
      )}
    </div>
  );
};
