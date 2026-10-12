/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE COMPARABLE TITLES EXHIBITION (living headers v3 §5) — how the page looks once the writer has
 * added a few: the "Your comps" heading and three `CompCard`s over a SAMPLE constant declared here
 * and nowhere else.
 *
 * Comps v26: the "Your query line" example and the cards' drag handles are GONE from it. Comps v25
 * retired both from the page, and a picture of the page may not show what the page no longer has.
 *
 * ⚠️ IT REPLACES comps v2's "How your comps work" block and its tagged example cards. The ref draws
 * the empty state as a heading, a sentence, the buttons and the exhibition — nothing between — and
 * the sentence now says what the steps said. Both are deleted, not left beside it.
 *
 * ⚠️ THE STATE IS A DERIVATION, NOT A FLAG — zero comps on the manuscript and nothing else. The
 * first save moves the page to the filled state because the count changed.
 *
 * ⚠️ IT READS NOTHING LIVE AND DOES NOTHING. `LivingExhibition` makes the band `inert` and
 * `aria-hidden`; every card is `CompCard` in its `example` mode, so nothing inside is a control.
 */
import React from "react";
import { CompTitle } from "../../types";
import { LivingExhibition } from "../shell/LivingExhibition";
import { CompCard } from "./CompCard";

export const COMPS_EXHIBIT_LABEL = "HOW THE PAGE LOOKS ONCE YOU’VE ADDED A FEW";

export const COMPS_SAMPLE: CompTitle[] = [
  { title: "The Tidewater Line", author: "R. Okafor", publisher: "Harvill", year: 2021, media: "book", matchAxis: "single day · close third · coastal", note: "A whole novel on one day on the water, told close to one narrator." },
  { title: "Salt Road", author: "Imogen Hale", publisher: "Faber", year: 2023, media: "book", matchAxis: "Irish coast · missing brother", note: "Coastal Irish setting, a missing brother, short punchy chapters." },
  { title: "The Lantern Keeper", author: "Mara Quill", year: 2024, media: "book", matchAxis: "lighthouse · grief", note: "Undecided: the grief is right, the pace is slower." },
];

/** The exhibit's letter names the first two. */
const SAMPLE_IN_LETTER = 2;

export const CompsExhibit: React.FC<{ msTitle?: string; now: number }> = ({ now }) => (
  <LivingExhibition label={COMPS_EXHIBIT_LABEL}>
    <div className="cpv-exstack">
      <div>
        <div className="cpv-sech">
          <h2>Your comps <span className="cpv-pill">{COMPS_SAMPLE.length}</span></h2>
        </div>
        <div className="cpv-list">
          {COMPS_SAMPLE.map((c, i) => (
            <CompCard key={c.title} comp={c} inLetter={i < SAMPLE_IN_LETTER} position={i < SAMPLE_IN_LETTER ? i + 1 : null} now={now} example />
          ))}
        </div>
      </div>
    </div>
  </LivingExhibition>
);
