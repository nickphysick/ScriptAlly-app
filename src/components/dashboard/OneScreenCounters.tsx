/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OneScreenCounters — the header counters card (ref design-refs/dashboard-v16.html, `.counters`).
 *
 * ⚠️ THESE ARE READOUTS, NOT CONTROLS. The card deliberately does NOT take the generic card lift:
 * a hover lift promises a click that does not happen. It carries no `os-lift`, and the stylesheet
 * also overrides the lift explicitly so adding the class later cannot quietly re-arm it.
 *
 * ⚠️ EVERY FIGURE IS DERIVED AT READ TIME (`headerCounters`) — there are no stored counters, and
 * there must never be one: a stored total is a number that can be wrong.
 */
import React from "react";
import { Agent, Query } from "../../types";
import { headerCounters, HeaderCounter } from "../../lib/oneScreen";
import { Skel } from "./OneScreenDashboard";
import sentMark from "../../assets/shell/querying-goals-icon.png";
import agentsMark from "../../assets/shell/agents-on-file-icon.png";
import replyMark from "../../assets/shell/response-rate-icon.png";
import { useCountUp } from "../../lib/useCountUp";

/**
 * ⚠️ THE FILENAMES DO NOT MATCH THE CARDS, AND THE TABLE WINS. `Querying Goals Icon` (a paper
 * plane) is the QUERIES SENT mark; `Query Target Icon` (a target) is the GOALS mark. Nick's
 * mapping, confirmed in the pack — do not "correct" this by following the filenames.
 */
const ICON: Record<HeaderCounter["key"], string> = {
  sent: sentMark,       // Querying Goals Icon.png — a paper plane in an envelope
  agents: agentsMark,   // Agents On File Icon.png — a rolodex
  responses: replyMark, // Response Rate Icon.png  — a speech bubble on pages
};

/** ⚠️ ITS OWN COMPONENT SO THE HOOK IS NOT CALLED IN A LOOP — hooks cannot run inside `.map`
 *  with a varying count without breaking the rules of hooks the moment a counter drops out. */
const CountFigure: React.FC<{ n: number }> = ({ n }) => (
  <span className="os-cn">{useCountUp(n, 400).toLocaleString("en-GB")}</span>
);

export const OneScreenCounters: React.FC<{
  loading: boolean;
  queries: Query[];
  agents: Agent[];
  now: Date;
}> = ({ loading, queries, agents, now }) => (
  <div className={`os-card os-counters${loading ? " isload" : ""}`}>
    {loading && <Skel bars={["h", ""]} />}
    {headerCounters(queries, agents, now).map((c) => (
      <div className="os-counter" key={c.key}>
        {/* ⚠️ BARE ON THE CARD — no plate, no circle, no border. And no wrapper transform: a
            transform on any ancestor isolates the blend group and the artwork's white field
            returns (see .os-mark-il in the stylesheet). */}
        <span className="os-mark-il os-cic" aria-hidden="true">
          <img src={ICON[c.key]} alt="" />
        </span>
        <div className="os-cw">
          <div className="os-cl">{c.label}</div>
          <div className="os-cv">
            <CountFigure n={c.n} />
            {/* absent, not zero — see headerCounters */}
            {c.chip && <span className="os-cd">{c.chip}</span>}
          </div>
        </div>
      </div>
    ))}
  </div>
);
