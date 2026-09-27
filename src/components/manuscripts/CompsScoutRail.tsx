/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The rail on Comparable titles: the Scout, coming soon (comps v2 Phase 4; D1, D5).
 *
 * ⚠️ IT CALLS NOTHING. The Scout stays switched off: `ScoutPanel` (and with it `fetchCompRun` and
 * the `suggestComps` callable) is NOT mounted on this page, `SCOUT_LIVE` is untouched, and nothing
 * in this file imports `lib/suggestComps`. The rail describes the feature and shows a faded
 * example of what it will return.
 *
 * ⚠️ THE EXAMPLES ARE A PICTURE: `aria-hidden`, `pointer-events: none`, and their buttons are inert
 * spans. Two invented titles, and they are labelled Example — the one place invented books may
 * appear is somewhere that says so.
 *
 * ⚠️ NO PLAN GATE (D5): "coming soon" is the same for everyone.
 */
import React from "react";
import { PageRail } from "../containers/PageRail";

/** The tray's peek art — the mock's own 400×372 export of comps-tray-archivist.png (2.3× at 176px). */
export const COMPS_TRAY_ART = { src: "/images/comps/comps-tray-archivist.png", version: "b778445e", width: 400, height: 372 };

const EXAMPLES = [
  { i: "B", y: 2025, title: "Breakwater", by: "M. Doherty · Picador, 2025", why: "a missing sibling on a tidal island, told over one weekend." },
  { i: "L", y: 2024, title: "Low Water", by: "Siobhán Kerr · Sceptre, 2024", why: "West Cork setting, a ticking-clock plot and short chapters." },
];

export const CompsScoutRail: React.FC = () => (
  <PageRail
    label="The Scout, coming soon"
    className="cpv-rail"
    dataAttrs={{ "data-cpv": "rail" }}
    trayClassName="cpv-tray"
    trayDataAttrs={{ "data-cpv": "tray" }}
    tray={
      <>
        <h2>The Scout</h2>
        <div className="sum"><span className="cpv-soon" data-cpv="soon">Coming soon</span></div>
        <img className="cpv-tray-art" src={`${COMPS_TRAY_ART.src}?v=${COMPS_TRAY_ART.version}`}
             width={COMPS_TRAY_ART.width} height={COMPS_TRAY_ART.height} alt="" aria-hidden="true" />
      </>
    }
  >
    <div className="cpv-rbody">
      <p className="cpv-sclede">
        The Scout will find recently published books like yours, and say why each one compares. You choose what joins your list.
      </p>
      <ol className="cpv-scsteps">
        <li><span className="cpv-stepn">1</span><span><b>Reads your book&rsquo;s details</b>Genre, word count, logline and the comps you already have.</span></li>
        <li><span className="cpv-stepn">2</span><span><b>Suggests recent titles</b>Each with its publisher, year and the reason it compares.</span></li>
        <li><span className="cpv-stepn">3</span><span><b>You add or dismiss</b>Nothing joins your comps without you.</span></li>
      </ol>
      <div className="cpv-rh">Preview <span className="grow" /><span className="cpv-ex">Example</span></div>
      <div className="cpv-ghost cpv-scprev" aria-hidden="true" data-cpv="rail-examples">
        {EXAMPLES.map((s) => (
          <div key={s.title} className="cpv-sug" data-cpv="sug">
            <div className="cpv-spine cpv-spine--scout"><span className="i">{s.i}</span><span className="y">{s.y}</span></div>
            <div>
              <div className="cpv-ct">{s.title}</div>
              <div className="cpv-ca">{s.by}</div>
              <div className="why"><b>Why:</b> {s.why}</div>
              <div className="cpv-sacts"><span className="cpv-mini">Add to my comps</span><span className="cpv-mini">Dismiss</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </PageRail>
);
