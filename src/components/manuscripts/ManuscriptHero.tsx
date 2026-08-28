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
  /* ⚠️ `figures` IS GONE, NOT UNUSED. The three-figure row moved to the five-figure strip under
     the tab rail; a prop left declared and unread is a knob the next reader goes looking for. */
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
  title, status, shelved, genres, wordCount, stats, edit, tab, onTabChange, counts,
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
        *
        * ⚠️ THEY SIT OUTSIDE THE CARD. They page through the shelf, so they act ON the card rather
        * than belonging to it — inside, they would read as controls of the book they are about to
        * replace.
        */}
      <div className="msp-heroband">
        <button
          type="button"
          className="msp-chev"
          onClick={() => onPrev?.()}
          disabled={!onPrev}
          aria-label="Previous manuscript"
        >‹</button>

        {/**
          * ⚠️ A CARD, BECAUSE TWO HEADERS WERE COMPETING. Bare on the page ground beneath a masthead
          * of the same shape, this band read as a second page header — mark, Playfair title,
          * supporting line, twice over. A white bordered card is an OBJECT sitting on the ground,
          * and that distinction is what stops the eye taking the manuscript's name for the page's.
          */}
        <div className="msp-card">
          {/* The same asset the dashboard and the plate render — contained, no blend mode. */}
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

          {/**
            * ⚠️ THE THREE-FIGURE ROW IS GONE, AND THE ⋯ STAYS. The five-figure strip under the tab
            * rail states Queries sent · Responses · Still open · Agents holding · Last sent; keeping
            * three of those here as well would put the same figures on one page twice, which is the
            * two-numbers-both-called-the-same-thing fault this codebase has paid for repeatedly.
            *
            * ⚠️ THE ⋯ IS NOT A FIGURE AND DOES NOT GO WITH THEM. Shelve, reactivate, Edit details
            * and the guarded delete act on the MANUSCRIPT and have no other surface on this page.
            */}
          <div className="msp-recstats">{bookActions}</div>
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
