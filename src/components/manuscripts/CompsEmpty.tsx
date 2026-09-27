/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The empty state's two blocks after the form (comps v2 Phase 6): "How your comps work", then two
 * example comp cards. The example query line between them is `CompsQueryLine example`.
 *
 * ⚠️ THE STATE IS A DERIVATION, NOT A FLAG — zero comps on the manuscript and nothing else. The
 * first save moves the page to the filled state because the count changed.
 *
 * ⚠️ THE EXAMPLES ARE A PICTURE: faded, tagged Example, `aria-hidden` and `inert`, drawn by the
 * real `CompCard` in its `example` mode so they cannot drift from the live card's look.
 * `StagesBlock` and `FeatureBlock` (compsMarketing.tsx) are no longer mounted here; their files stay.
 */
import React from "react";
import { CompTitle } from "../../types";
import { CompCard } from "./CompCard";

const EXAMPLE_COMPS: CompTitle[] = [
  { title: "The Tidewater Line", author: "R. Okafor", publisher: "Harvill", year: 2021, media: "book", matchAxis: "single day · close third · coastal", note: "A whole novel on one day on the water, told close to one narrator.", inQuery: true },
  { title: "Salt Road", author: "Imogen Hale", publisher: "Faber", year: 2023, media: "book", matchAxis: "Irish coast · missing brother", note: "Coastal Irish setting, a missing brother, short punchy chapters.", inQuery: true },
];

export const CompsHow: React.FC = () => (
  <section className="cpv-how" data-cpv="how">
    <h2>How your comps work</h2>
    <p>Agents use comps to picture where your book sits on a shelf. Keep as many as you like here, then choose the ones your letter names.</p>
    <ol className="cpv-steps">
      <li><b><span className="cpv-stepn">1</span>Add a comp</b>A book, film or show like yours. Only the title is needed.</li>
      <li><b><span className="cpv-stepn">2</span>Say why</b>A few tags and a note, in your own words.</li>
      <li><b><span className="cpv-stepn">3</span>Build your line</b>Switch on the ones for your letter and copy the sentence.</li>
    </ol>
  </section>
);

export const CompsExampleCards: React.FC<{ now: number }> = ({ now }) => (
  <div className="cpv-exwrap" data-cpv="ex-comps" aria-hidden="true" inert>
    <span className="cpv-ex" data-cpv="ex-tag">Example</span>
    <div className="cpv-ghost cpv-list" style={{ marginTop: 0 }}>
      {EXAMPLE_COMPS.map((c, i) => (
        <CompCard key={c.title} comp={c} position={i + 1} now={now} example />
      ))}
    </div>
  </div>
);
