/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The hero's brand lines (hero v3, 2 Nov).
 *
 *   - `HeroLockup` (phones): a blush-outlined panel, "Query · Track · Discover" over "QueryHawk". A screen
 *     reader hears one sentence, "Query, Track, Discover. QueryHawk"; the drawn lines are hidden from it.
 *   - `HeroSub` (desktop): the sub-line, "QueryHawk" bold and never broken across lines.
 *   - `HeroPillars` (desktop): three columns along the white card's foot, a title over a line each.
 */
import React from "react";
import { HERO_TRIO, HERO_PILLARS, WAIT_HERO_SUB, WAIT_HERO_SUB_BRAND } from "./landingCopy";

export const HERO_LOCKUP_READS = `${HERO_TRIO.join(", ")}. ${WAIT_HERO_SUB_BRAND}`;

export const HeroLockup: React.FC = () => (
  <div className="mk-wl-lock" role="group">
    <span className="mk-sr">{HERO_LOCKUP_READS}</span>
    <div aria-hidden="true">
      <p className="mk-wl-lock-trio">
        {HERO_TRIO.map((w, i) => (
          <React.Fragment key={w}>
            {i > 0 && <span className="mk-wl-lock-dot" aria-hidden="true">·</span>}
            <span>{w}</span>
          </React.Fragment>
        ))}
      </p>
      <p className="mk-wl-lock-brand">{WAIT_HERO_SUB_BRAND}</p>
    </div>
  </div>
);

const at = WAIT_HERO_SUB.lastIndexOf(WAIT_HERO_SUB_BRAND);
export const HeroSub: React.FC = () => (
  <p className="mk-dh-sub">
    {WAIT_HERO_SUB.slice(0, at)}<b>{WAIT_HERO_SUB_BRAND}</b>{WAIT_HERO_SUB.slice(at + WAIT_HERO_SUB_BRAND.length)}
  </p>
);

export const HeroPillars: React.FC = () => (
  <ul className="mk-dh-pillars">
    {HERO_PILLARS.map((p) => (
      <li key={p.key} className={`mk-dh-pillar mk-dh-pillar--${p.key}`}><b>{p.title}</b><span>{p.line}</span></li>
    ))}
  </ul>
);
