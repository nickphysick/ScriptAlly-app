/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE BOOK PROFILE'S HERO — banner, cover, identity, tab rail ═══════════════════════════════
 *
 * Reference: `design-refs/manuscripts-book-profile.html`, `.hero`.
 *
 * ⚠️ NO BANNER, AND NO OVERHANG. The coloured stripe and the cover's negative-margin overlap cost
 * about 190px of height for decoration, on a page whose whole point is the record beneath it. The
 * cover now sits in the row, on the page ground, at 74×92 with a hairline — an object on a desk
 * rather than a book cover pasted over a header.
 *
 * ⚠️ THE IDENTITY BLOCK IS `ManuscriptPlate` IN ITS `hero` VARIANT — not a second implementation.
 * The three inline editors (title, genre, word count) are that component's, with their popovers,
 * their validation and their spec; drawing the identity fresh here would have meant either
 * rebuilding all of it or dropping it.
 *
 * ⚠️ AND THE COMMISSION SLOT WENT WITH IT, KEY AND ALL. A `data-slot` naming artwork nobody is
 * drawing any more is a dangling instruction; the cover is the only illustration surface left here,
 * and it keeps the plain tinted placeholder it already had. A real asset is a separate commission.
 */
import React from "react";
import { ManuscriptPlate, ManuscriptPlateEdit } from "./ManuscriptPlate";
import { ManuscriptTabs, ManuscriptTabKey } from "./ManuscriptTabs";
import { HeroFigure } from "../../lib/manuscriptProfile";
import { PlateStats } from "../../lib/manuscriptPlate";
import manuscriptIcon from "../../assets/shell/manuscript-icon.png";
import "./bookProfile.css";

export interface ManuscriptHeroProps {
  title: string;
  status: string;
  shelved: boolean;
  genres: string[];
  wordCount?: number;
  stats: PlateStats;
  /**
   * The three derived figures, right-aligned with hairline dividers. Absent entries simply do not
   * render — `Querying since` omits itself rather than dashing a date the app does not have.
   */
  figures: HeroFigure[];
  edit?: ManuscriptPlateEdit;
  tab: ManuscriptTabKey;
  onTabChange: (t: ManuscriptTabKey) => void;
  counts?: Partial<Record<ManuscriptTabKey, number>>;
  /**
   * Page through the shelf. Null means there is no neighbour that way — the chevron still RENDERS,
   * disabled and dimmed, so the affordance is visible before a second book exists. No wrap-around:
   * the first has no previous and the last has no next.
   */
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
  /**
   * ⚠️ THE BOOK'S OWN ACTIONS, AND ONLY THOSE. The ⋯ — shelve, reactivate, edit details, the guarded
   * delete — acts on the MANUSCRIPT, so it belongs to the band that names the manuscript. The page's
   * create action went the other way, into the masthead, because it acts on the shelf. Send a query
   * and Query Centre are not here and are not coming back: they left in amendment 2.
   */
  bookActions?: React.ReactNode;
}

export const ManuscriptHero: React.FC<ManuscriptHeroProps> = ({
  title, status, shelved, genres, wordCount, stats, figures, edit, tab, onTabChange, counts,
  onPrev, onNext, bookActions,
}) => (
  <div className="msp-hero">
    <div className="msp-heroin">
      {/**
        * ⚠️ THE CHEVRONS ARE RENDERED WHEN THEY CANNOT BE USED, NOT HIDDEN. A control that appears
        * the day a second manuscript exists teaches nothing to the writer who has one; a dimmed,
        * disabled one says "this pages through your shelf" before the shelf has a second book on it.
        *
        * ⚠️ AND THERE IS NO WRAP-AROUND. First has no previous, last has no next. Wrapping would
        * make the two ends indistinguishable from the middle, so a writer could not tell from the
        * control whether they had reached the end of their own shelf.
        */}
      <div className="msp-heroband">
        <button
          type="button"
          className="msp-chev"
          onClick={() => onPrev?.()}
          disabled={!onPrev}
          aria-label="Previous manuscript"
        >‹</button>

      {/* ⚠️ ONE ROW, VERTICALLY CENTRED. Cover · identity · figures — `align-items: center` rather
          than `flex-start`, so a one-line title and a two-line one both sit against the cover's
          middle instead of riding its top edge. */}
      <div className="msp-herorow">
        {/* ⚠️ THE SAME ASSET THE DASHBOARD AND THE PLATE RENDER, contained, no blend mode. Tracing
            it to SVG would fork one illustration in two. */}
        <div className="msp-cover">
          <img src={manuscriptIcon} alt="" />
        </div>

        <ManuscriptPlate
          variant="hero"
          title={title}
          status={status}
          shelved={shelved}
          genres={genres}
          wordCount={wordCount}
          stats={stats}
          edit={edit}
        />

        {/* ⚠️ RIGHT-ALIGNED, PLAYFAIR OVER MONO, AND DERIVED AT READ TIME. These are the same three
            figures the facts line used to carry; they are not stated twice on one row of the page. */}
        {bookActions && <div className="msp-heroacts">{bookActions}</div>}

        <div className="msp-herostats">
          {figures.map((f) => (
            <div key={f.key} className="msp-hs">
              <div className={`msp-hsn${f.date ? " date" : ""}`}>{f.value}</div>
              <div className="msp-hsl">{f.label}</div>
            </div>
          ))}
        </div>
      </div>

        <button
          type="button"
          className="msp-chev"
          onClick={() => onNext?.()}
          disabled={!onNext}
          aria-label="Next manuscript"
        >›</button>
      </div>

      <ManuscriptTabs active={tab} onChange={onTabChange} counts={counts} />
    </div>
  </div>
);
