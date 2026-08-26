/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE BOOK PROFILE'S HERO — banner, cover, identity, tab rail ═══════════════════════════════
 *
 * Reference: `design-refs/manuscripts-book-profile.html`, `.hero`.
 *
 * ⚠️ THE COVER OVERLAPS THE BANNER BY DESIGN, and it does it with a negative margin against a
 * white keyline rather than by absolute positioning. Positioned, it would sit outside the flow and
 * a longer title would run underneath it; in flow it pushes the identity block along beside it and
 * the layout holds at any title length.
 *
 * ⚠️ THE IDENTITY BLOCK IS `ManuscriptPlate` IN ITS `hero` VARIANT — not a second implementation.
 * The three inline editors (title, genre, word count) are that component's, with their popovers,
 * their validation and their spec; drawing the identity fresh here would have meant either
 * rebuilding all of it or dropping it.
 *
 * ⚠️ THE BANNER IS A COMMISSION SLOT AND SAYS SO. It carries a `data-slot` key and a mono corner
 * label, which is this repo's grammar for artwork that has not arrived — the same reason the
 * packages page's plates are dashed. When the drawing lands, the key and the gradient go together.
 */
import React from "react";
import { ManuscriptPlate, ManuscriptPlateEdit } from "./ManuscriptPlate";
import { ManuscriptTabs, ManuscriptTabKey } from "./ManuscriptTabs";
import { HeroFact } from "../../lib/manuscriptProfile";
import { PlateStats } from "../../lib/manuscriptPlate";
import manuscriptIcon from "../../assets/shell/manuscript-icon.png";
import "./bookProfile.css";

/** The banner's commission key. Named, so the inventory and the page cannot drift apart. */
export const HERO_BANNER_SLOT = "ms-hero-banner";

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
    <div className="msp-banner" data-slot={HERO_BANNER_SLOT} aria-hidden="true">
      <span className="msp-artkey">{HERO_BANNER_SLOT}</span>
    </div>

    <div className="msp-heroin">
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
