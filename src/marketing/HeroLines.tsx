/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The hero's trio and sub-line, shared by both layouts (2 Nov). `prefix` names the layout's classes
 * (`mk-wl` on phones, `mk-dh` on desktop); each layout's sheet dresses them.
 *
 * The trio is a list, so a screen reader reads "Query, Track, Discover"; the dots between the words are
 * decorative and hidden from it. "QueryHawk" in the sub-line is bold and never breaks across lines.
 */
import React from "react";
import { HERO_TRIO, WAIT_HERO_SUB, WAIT_HERO_SUB_BRAND } from "./landingCopy";

export const HeroTrio: React.FC<{ prefix: string }> = ({ prefix }) => (
  <ul className={`${prefix}-trio`}>
    {HERO_TRIO.map((w, i) => (
      <li key={w}>{i > 0 && <span className={`${prefix}-dot`} aria-hidden="true">·</span>}{w}</li>
    ))}
  </ul>
);

const at = WAIT_HERO_SUB.lastIndexOf(WAIT_HERO_SUB_BRAND);
export const HeroSub: React.FC<{ prefix: string }> = ({ prefix }) => (
  <p className={`${prefix}-sub`}>
    {WAIT_HERO_SUB.slice(0, at)}<b>{WAIT_HERO_SUB_BRAND}</b>{WAIT_HERO_SUB.slice(at + WAIT_HERO_SUB_BRAND.length)}
  </p>
);
