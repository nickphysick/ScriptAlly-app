/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE COMPARABLE TITLES EXHIBITION (living headers v3 §5) — how the page looks once the writer has
 * added a few, drawn by the page's OWN parts (`CompsQueryLine`, the "Your comps" heading, `CompCard`)
 * over a SAMPLE constant declared here and nowhere else.
 *
 * ⚠️ IT REPLACES comps v2's "How your comps work" block and its tagged example cards. The ref draws
 * the empty state as a heading, a sentence, the buttons and the exhibition — nothing between — and
 * the sentence now says what the steps said. Both are deleted, not left beside it.
 *
 * ⚠️ THE STATE IS A DERIVATION, NOT A FLAG — zero comps on the manuscript and nothing else. The
 * first save moves the page to the filled state because the count changed.
 *
 * ⚠️ IT READS NOTHING LIVE AND DOES NOTHING. `LivingExhibition` makes the band `inert` and
 * `aria-hidden`; the line is `CompsQueryLine`'s own `example` picture and every card is the real
 * `CompCard` in its `example` mode, so nothing inside is a control.
 */
import React from "react";
import { CompTitle } from "../../types";
import { LivingExhibition } from "../shell/LivingExhibition";
import { CompCard } from "./CompCard";
import { CompsQueryLine } from "./CompsQueryLine";

export const COMPS_EXHIBIT_LABEL = "HOW THE PAGE LOOKS ONCE YOU’VE ADDED A FEW";

export const COMPS_SAMPLE: CompTitle[] = [
  { title: "The Tidewater Line", author: "R. Okafor", publisher: "Harvill", year: 2021, media: "book", matchAxis: "single day · close third · coastal", note: "A whole novel on one day on the water, told close to one narrator.", inQuery: true },
  { title: "Salt Road", author: "Imogen Hale", publisher: "Faber", year: 2023, media: "book", matchAxis: "Irish coast · missing brother", note: "Coastal Irish setting, a missing brother, short punchy chapters.", inQuery: true },
  { title: "The Lantern Keeper", author: "Mara Quill", year: 2024, media: "book", matchAxis: "lighthouse · grief", note: "Undecided: the grief is right, the pace is slower.", inQuery: false },
];

const noop = () => {};

export const CompsExhibit: React.FC<{ msTitle: string; now: number }> = ({ msTitle, now }) => (
  <LivingExhibition label={COMPS_EXHIBIT_LABEL}>
    <div className="cpv-exstack">
      <CompsQueryLine comps={[]} msTitle={msTitle} format="readers" onFormat={noop} example />
      <div>
        <div className="cpv-sech">
          <h2>Your comps <span className="cpv-pill">{COMPS_SAMPLE.length}</span></h2>
          <span className="cpv-hint">Drag to reorder. The order sets your query line.</span>
        </div>
        <div className="cpv-list">
          {COMPS_SAMPLE.map((c, i) => (
            <CompCard key={c.title} comp={c} position={c.inQuery ? i + 1 : null} now={now} example />
          ))}
        </div>
      </div>
    </div>
  </LivingExhibition>
);
