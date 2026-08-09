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
import { useCountUp } from "../../lib/useCountUp";

/** The ref's three marks: send · people · reply-arrow. */
const ICON: Record<HeaderCounter["key"], React.ReactNode> = {
  sent: <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />,
  agents: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></>,
  responses: <><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></>,
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
        <span className="os-cic" aria-hidden="true">
          <svg viewBox="0 0 24 24">{ICON[c.key]}</svg>
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
