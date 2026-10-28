/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v116 — the mini cards the stacks hold (ref design-refs/dashboard-v116/).
 *
 * The query card is a small landing-hero query card: a bust, the agent, the outcome pill with the closed
 * ring, the manuscript, and the two dates. The agent card is a small Contact list card: its header IS the
 * status (navy querying, grey closed, pale not yet queried) — there is no separate status strip.
 */
import React from "react";
import type { AgentCard, ClosedCard } from "../../../lib/dashHover";
import { Bust } from "./HoverStack";
import "./dash116Cards.css";

/** The closed ring glyph: a ring with a bar through it (StatusDot's closed set, at pill size). */
const ClosedGlyph = () => (
  <svg viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="5.5" /><path d="M4 7h6" /></svg>
);

export const QueryMini: React.FC<{ c: ClosedCard; manuscript: string }> = ({ c, manuscript }) => (
  <div className="d116-qm" data-d116="query-card" data-outcome={c.outcome} data-id={c.id} data-future={c.futureSent ? "1" : undefined}>
    <div className="d116-qmw">
      <Bust />
      {/* v118.1 Part E — the name takes the row; the full name is its accessible label wherever it is cut */}
      <div className="d116-nm"><b data-d116="name" title={c.name} aria-label={c.name}>{c.name}</b><small data-d116="agency">{c.agency}</small></div>
      <span className="d116-pill" data-d116="pill" aria-label={c.outcome === "quiet" ? "No reply" : "Passed"}><ClosedGlyph /><span className="d116-pillt">{c.outcome === "quiet" ? "No reply" : "Passed"}</span></span>
    </div>
    <div className="d116-qmm"><small>QUERYING</small><b data-d116="ms">{manuscript}</b></div>
    <div className="d116-qmf"><span data-d116="queried">Queried {c.queried}</span><span data-d116="end">{c.end}</span></div>
  </div>
);

export const QueryNone: React.FC<{ label: string }> = ({ label }) => (
  <div className="d116-qm is-none" data-d116="none">None yet<small>{label}</small></div>
);

export const AgentMini: React.FC<{ a: AgentCard }> = ({ a }) => (
  <div className="d116-am" data-d116="agent-card" data-status={a.status} data-id={a.id}>
    <div className="d116-amt" data-d116="agent-head">
      <Bust />
      <div className="d116-nm"><b data-d116="name">{a.name}</b><small data-d116="agency">{a.agency}</small></div>
    </div>
    <div className="d116-amg">
      {a.genres.length ? a.genres.slice(0, 4).map((g) => <span key={g}>{g}</span>) : <em>No genres yet</em>}
    </div>
  </div>
);
