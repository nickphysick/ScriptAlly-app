/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OneScreenCounters — the header counters card (ref design-refs/dashboard-v16.html, `.counters`).
 *
 * ⚠️ THESE ARE READOUTS, NOT CONTROLS, and since Phase 3 they are not a card either — they sit on
 * the page ground beside the greeting. The no-lift rules in the stylesheet are KEPT even though
 * `.os-card` is gone from this element: they are what stops the class coming back with a hover that
 * promises a click.
 *
 * ⚠️ EVERY FIGURE IS DERIVED AT READ TIME (`headerCounters`) — there are no stored counters, and
 * there must never be one: a stored total is a number that can be wrong.
 */
import React from "react";
import { Agent, Query } from "../../types";
import { headerCounters, HeaderCounter } from "../../lib/oneScreen";
import { Skel } from "./OneScreenDashboard";
import sentMark from "../../assets/shell/active-query-image.png";
import agentsMark from "../../assets/shell/agents-on-file-icon.png";
import replyMark from "../../assets/shell/response-rate-icon.png";
import { useCountUp } from "../../lib/useCountUp";

/**
 * ⚠️ THE FILENAMES DO NOT MATCH THE CARDS, AND THE TABLE WINS. `Query Target Icon` (a target) is
 * the GOALS mark, over on the rail. Nick's mapping — never "corrected" by following a filename.
 *
 * ⚠️ QUERIES SENT TOOK THE WATERCOLOUR PLANE (audit pack P3), replacing the line-drawn
 * `Querying Goals Icon` — itself a paper plane, in an envelope — that had stood in for it. The
 * new artwork is the only counter mark PAINTED rather than drawn, and both of the ways it is
 * treated differently follow from that one fact; see `.os-cic.plane` in the stylesheet.
 */
const ICON: Record<HeaderCounter["key"], string> = {
  sent: sentMark,       // active-query-image.png  — a paper plane on a watercolour wash
  agents: agentsMark,   // Agents On File Icon.png — a rolodex
  responses: replyMark, // Response Rate Icon.png  — a speech bubble on pages
};

/**
 * ⚠️ A PROPERTY OF THE ARTWORK, NOT A PROP. One mark needs a bigger box and no blend; that is a
 * fact about the file, so it is keyed off the counter here rather than offered to the caller as a
 * choice. A second painted mark joins this map; it does not grow a `size` prop.
 */
const MARK_CLASS: Partial<Record<HeaderCounter["key"], string>> = { sent: " plane" };

/** ⚠️ ITS OWN COMPONENT SO THE HOOK IS NOT CALLED IN A LOOP — hooks cannot run inside `.map`
 *  with a varying count without breaking the rules of hooks the moment a counter drops out. */
const CountFigure: React.FC<{ n: number }> = ({ n }) => (
  <span className="os-cn" data-probe-text="stat-figure">{useCountUp(n, 400).toLocaleString("en-GB")}</span>
);

export const OneScreenCounters: React.FC<{
  loading: boolean;
  queries: Query[];
  agents: Agent[];
  now: Date;
}> = ({ loading, queries, agents, now }) => (
  /* ⚠️ NO `os-card` (dashboard redesign, Phase 3) — the stats sit on the page ground. The class
     carried the paper, the radius, the shadow and the `::after` rim; all four go together, because
     a readout on the ground with a rim left on it is a card that forgot its fill. */
  <div className={`os-counters${loading ? " isload" : ""}`} data-probe="stats">
    {loading && <Skel bars={["h", ""]} />}
    {headerCounters(queries, agents, now).map((c) => (
      <div className="os-counter" data-probe={c.key === "sent" ? "stat-card" : undefined} key={c.key}>
        {/* ⚠️ BARE ON THE CARD — no plate, no circle, no border. And no wrapper transform: a
            transform on any ancestor isolates the blend group and the artwork's white field
            returns (see .os-mark-il in the stylesheet). */}
        <span
          className={`os-mark-il os-cic${MARK_CLASS[c.key] ?? ""}`}
          data-probe={c.key === "sent" ? "stat-illustration" : undefined}
          aria-hidden="true"
        >
          <img src={ICON[c.key]} alt="" />
        </span>
        <div className="os-cw">
          <div className="os-cl">{c.label}</div>
          <div className="os-cv">
            <CountFigure n={c.n} />
            {/* absent, not zero — see headerCounters */}
            {/* ⚠️ BOTH WORDINGS RENDER AND CSS PICKS ONE (v27, Phase 3) — the long form above 1980,
                the short one below it, so the stats can hold the greeting's line without the row
                giving up a figure, a label or an illustration. A CSS ellipsis was the alternative
                and it is worse: it cuts mid-word at whatever width the box happens to be, which is
                a different sentence at every viewport. */}
            {c.chip && (
              <span className={c.plain ? "os-cd plain" : "os-cd"}>
                <span className="os-cd-long">{c.chip}</span>
                <span className="os-cd-short">{c.chipShort ?? c.chip}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    ))}
  </div>
);
