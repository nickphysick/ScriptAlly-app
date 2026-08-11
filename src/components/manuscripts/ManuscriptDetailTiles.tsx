/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Details pane — four illustrated tiles, 2×2. Reference:
 * design-refs/manuscripts-plate.html, treatment B (`.tiles2` / `.btile`).
 *
 * ⚠️ TREATMENT B IS THE BUILD. A (the journey track) and C (the timeline) are in the ref and are
 * NOT built, and neither is the label-value fact row list that preceded all three. If a future
 * pass wants a row list on this pane, that is a design decision to reopen, not a gap to fill in.
 *
 * ⚠️ PROPS ONLY — no context, no store. Every figure arrives already derived by
 * `lib/manuscriptTiles`, so the copy can be asserted at zero, one and many without a database.
 *
 * ⚠️ AND A CLAUSE WITH NO DATA IS NOT RENDERED. `detail: null` means the paragraph is absent,
 * not empty — nothing here prints `0`, `undefined`, or prose about what the writer has not done.
 */
import React from "react";
import { PaperPlaneMark, BookSpinesMark, CalendarClockMark, StackedPagesMark } from "./manuscriptMarks";
import { TileCopy, CompsTileCopy } from "../../lib/manuscriptTiles";
import "./manuscriptPlate.css";

const TILE_MARK_SIZE = 70;

interface TileProps {
  label: string;
  headline: string;
  detail?: React.ReactNode;
  link: string;
  onLink?: () => void;
  mark: React.ReactNode;
  /** The plane sits on pink; the other three on sage. */
  pink?: boolean;
}

const Tile: React.FC<TileProps> = ({ label, headline, detail, link, onLink, mark, pink }) => (
  <div className="msv-btile">
    <div className={`msv-scene${pink ? " pink" : ""}`}>{mark}</div>
    <div className="msv-btilebody">
      <div className="msv-btilelab">{label}</div>
      <h4 className="msv-btilehead">{headline}</h4>
      {detail ? <p className="msv-btiledet">{detail}</p> : null}
      <button type="button" className="msv-linkline" onClick={onLink}>{link} →</button>
    </div>
  </div>
);

export interface ManuscriptDetailTilesProps {
  world: TileCopy;
  comps: CompsTileCopy;
  shelf: TileCopy;
  materials: TileCopy;
  onOpenQueriesHub?: () => void;
  /** Switches to the Comparable titles TAB — not a page navigation. */
  onOpenShelf?: () => void;
  onEditDetails?: () => void;
  onOpenPackageBuilder?: () => void;
}

export const ManuscriptDetailTiles: React.FC<ManuscriptDetailTilesProps> = ({
  world,
  comps,
  shelf,
  materials,
  onOpenQueriesHub,
  onOpenShelf,
  onEditDetails,
  onOpenPackageBuilder,
}) => (
  <div className="msv-tiles2">
    <Tile
      pink
      label="Out in the world"
      headline={world.headline}
      detail={world.detail}
      link="View in Queries Hub"
      onLink={onOpenQueriesHub}
      mark={<PaperPlaneMark size={TILE_MARK_SIZE} />}
    />

    <Tile
      label="Comparable titles"
      headline={comps.headline}
      /* The pitch italicises its titles, so it is composed as nodes rather than as a string —
         from `pitchLine`, the shelf's own composition, never a second one. */
      detail={
        comps.pitch.kind === "two" ? (
          <><i>{comps.pitch.a}</i> meets <i>{comps.pitch.b}</i>.</>
        ) : comps.pitch.kind === "one" ? (
          <><i>{comps.pitch.a}</i>. {comps.detail}</>
        ) : (
          comps.detail
        )
      }
      link="Open the shelf"
      onLink={onOpenShelf}
      mark={<BookSpinesMark size={TILE_MARK_SIZE} />}
    />

    <Tile
      label="On the shelf"
      headline={shelf.headline}
      detail={shelf.detail}
      link="Edit details"
      onLink={onEditDetails}
      mark={<CalendarClockMark size={TILE_MARK_SIZE} />}
    />

    {/* One variant, unchipped. The package builder has no Pro gate, so there is nothing to sell. */}
    <Tile
      label="Submission materials"
      headline={materials.headline}
      detail={materials.detail}
      link="Open package builder"
      onLink={onOpenPackageBuilder}
      mark={<StackedPagesMark size={TILE_MARK_SIZE} />}
    />
  </div>
);
