/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Analytics v24 §I — "HOW IT WORKS." ON THE EMPTY PAGE: the steps card, built from comps v27's (`CompsSteps`,
 * page-local to comps), as an analytics copy. Comps is not edited to lift it: the two are lift candidates together.
 * Three steps, each a figure row (an art slot beside a white tile), a rust-ringed number, a title and a line; rust
 * arrows between them (comps' own arrow); one column on the phone with dashed dividers and no arrows.
 *
 * ⚠️ THE TILES ARE FIXED EXAMPLE CONTENT, drawn here in SVG: never a `Query`, never written and never counted. Their
 *    figures (7 / 13 / 7, 26% against 6%) are the sample's and are not read from the model or from the benchmark
 *    constants, so a change to either cannot move an example.
 * ⚠️ THE ART SLOTS ARE PLACEHOLDERS awaiting Nick's art: when an image is supplied the slot takes it; the tile stays.
 */
import React from "react";

const MONO = { fontFamily: "var(--font-mono)" } as const;
const TYPE = { fontFamily: "var(--sp-type)" } as const;

const TileStrips = () => (
  <svg className="a24-mini" viewBox="0 0 140 140" width="140" height="140" aria-hidden="true" style={{ ...MONO, fontSize: "7.5px", letterSpacing: ".12em" }}>
    {([[6, 72, 39, "#f7efe3", "WAITING"], [52, 58, 31, "#e0e5dd", "BEING READ"], [98, 64, 35, "#e4e1db", "SAID NO"]] as const).map(([y, a, b, f, t]) => (
      <g key={t}>
        <rect x="2" y={y} width="136" height="38" rx="7" fill={f} stroke="rgba(28,19,15,.12)" />
        <rect x="14" y={y + 10} width={a} height="7" rx="3.5" fill="rgba(28,19,15,.55)" />
        <rect x="14" y={y + 23} width={b} height="5" rx="2.5" fill="rgba(28,19,15,.22)" />
        <text className="a24-mt" x="128" y={y + 25} textAnchor="end" fill="rgba(28,19,15,.62)">{t}</text>
      </g>
    ))}
  </svg>
);
const TilePie = () => (
  <svg className="a24-mini" viewBox="0 0 140 140" width="140" height="140" aria-hidden="true" style={{ ...TYPE, fontSize: "14px" }}>
    <path d="M70.0,70.0 L70.0,1.0 A69.0,69.0 0 0 1 138.9,74.0 Z" fill="#2a3a52" stroke="#fff" strokeWidth="2.5" />
    <text x="100.1" y="41.6" className="a24-tt" textAnchor="middle" dominantBaseline="central" fill="#fff">7</text>
    <path d="M70.0,70.0 L138.9,74.0 A69.0,69.0 0 0 1 1.1,74.0 Z" fill="#f7efe3" stroke="#fff" strokeWidth="2.5" />
    <text x="70.0" y="111.4" className="a24-tt" textAnchor="middle" dominantBaseline="central" fill="#1c130f">13</text>
    <path d="M70.0,70.0 L1.1,74.0 A69.0,69.0 0 0 1 70.0,1.0 Z" fill="#e4e1db" stroke="#fff" strokeWidth="2.5" />
    <text x="39.9" y="41.6" className="a24-tt" textAnchor="middle" dominantBaseline="central" fill="#1c130f">7</text>
  </svg>
);
const TileCols = () => (
  <svg className="a24-mini" viewBox="0 0 140 140" width="140" height="140" aria-hidden="true">
    <rect x="22" y="30" width="38" height="90" rx="5" fill="#2a3a52" />
    <text x="41" y="22" className="a24-tt" textAnchor="middle" fill="#1c130f" style={{ ...TYPE, fontSize: "14px" }}>26%</text>
    <rect x="80" y="105" width="38" height="15" rx="5" fill="#d9d3ca" />
    <text x="99" y="97" className="a24-tt" textAnchor="middle" fill="#1c130f" style={{ ...TYPE, fontSize: "14px" }}>6%</text>
    <line x1="10" y1="121" x2="130" y2="121" stroke="rgba(28,19,15,.22)" />
    <text x="41" y="135" className="a24-mt" textAnchor="middle" fill="rgba(28,19,15,.55)" style={{ ...MONO, fontSize: "7.5px", letterSpacing: ".14em" }}>YOU</text>
    <text x="99" y="135" className="a24-mt" textAnchor="middle" fill="rgba(28,19,15,.55)" style={{ ...MONO, fontSize: "7.5px", letterSpacing: ".14em" }}>MOST WRITERS</text>
  </svg>
);

export const AN_STEPS = [
  { brief: "the Archivist filing a reply card", tile: <TileStrips />, title: "Log your queries and record each reply.",
    line: "Add the queries you send. When an agent answers, record it in a few seconds: a request, a pass, or an offer." },
  { brief: "the Archivist with a pie chart", tile: <TilePie />, title: "See what happened, and who kept their word.",
    line: "Who asked to read more, who said no, who has not replied yet, and whether each agent took as long as they said." },
  { brief: "two writers’ desks, side by side", tile: <TileCols />, title: "Compare yourself with other writers.",
    line: "Your request rate and reply rate set against what most writers see, so you know whether this is normal." },
];
export const AN_STEPS_NOTE = "Figures appear with your first reply and firm up after five. Nothing is estimated: every number comes from what you log.";

export const A24Steps: React.FC = () => (
  <section className="a24-hw" data-a24="steps" aria-labelledby="a24-hw-h">
    <h2 id="a24-hw-h">How it works.</h2>
    <ol className="a24-steps">
      {AN_STEPS.map((s, i) => (
        <li key={s.title} data-a24="step">
          <div className="a24-sfig">
            <div className="a24-ph" data-a24="art-slot"><span>Art</span><em>{s.brief}</em></div>
            <div className="a24-tile" data-a24="tile">{s.tile}</div>
          </div>
          <i>{i + 1}</i>
          <h3>{s.title}</h3>
          <p>{s.line}</p>
        </li>
      ))}
    </ol>
    <p className="a24-hwn">{AN_STEPS_NOTE}</p>
  </section>
);
