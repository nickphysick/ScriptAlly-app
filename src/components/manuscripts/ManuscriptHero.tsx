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
import { HeroFact } from "../../lib/manuscriptProfile";
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
  /** The derived clauses after genre and word count. */
  facts: HeroFact[];
  edit?: ManuscriptPlateEdit;
  tab: ManuscriptTabKey;
  onTabChange: (t: ManuscriptTabKey) => void;
  counts?: Partial<Record<ManuscriptTabKey, number>>;
  /** The hero's own actions — the primary, the quiet one, and the lifecycle ⋯. */
  actions?: React.ReactNode;
}

export const ManuscriptHero: React.FC<ManuscriptHeroProps> = ({
  title, status, shelved, genres, wordCount, stats, facts, edit, tab, onTabChange, counts, actions,
}) => (
  <div className="msp-hero">
    <div className="msp-heroin">
      {/* ⚠️ ONE ROW, VERTICALLY CENTRED. Cover · identity · actions — `align-items: center` rather
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
          facts={
            <>
              {facts.map((f) => (
                <span key={f.key} className="msp-fact">
                  {/* `26 queries sent` — figure first; `Querying since 14 Jan 2026` — label first.
                      The clause decides, so the shape is data rather than two hard-coded rows. */}
                  {f.key === "since"
                    ? <>{f.label} <b>{f.value}</b></>
                    : <><b>{f.value}</b> {f.label}</>}
                </span>
              ))}
            </>
          }
        />

        {actions && <div className="msp-heroacts">{actions}</div>}
      </div>

      <ManuscriptTabs active={tab} onChange={onTabChange} counts={counts} />
    </div>
  </div>
);
