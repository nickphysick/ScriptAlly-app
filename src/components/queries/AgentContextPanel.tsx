/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE AGENT CONTEXT PANEL — stage 2's right column (ref design-refs/qc-create-fullscreen.html).
 *
 * Everything on file about the agent you are querying, so the writer is not asked to remember it
 * while filling the form. Presentation only: every value comes from `agentContext`, which drops
 * a row rather than rendering it empty, and nothing here is an input — see the tabIndex note.
 */
import React from "react";
import type { Agent, Manuscript, Query } from "../../types";
import { agentContextRows, agentAsks, freshnessStamp, hasContext } from "../../lib/agentContext";
import { ArtSlot } from "../todo/ArtSlot";

export interface AgentContextPanelProps {
  agent: Agent;
  queries: Query[];
  manuscript: Manuscript | null;
}

export const AgentContextPanel: React.FC<AgentContextPanelProps> = ({ agent, queries, manuscript }) => {
  /* ⚠️ THE FALLBACK IS ART, NOT AN EMPTY TABLE. A brand-new agent — a name and nothing else — has
     every row omitted, and a panel of headings with no values reads as a broken feature rather
     than a thin record. The house ArtSlot says "nothing to show here" on purpose. */
  if (!hasContext(agent, queries)) {
    return (
      <aside className="qc-ctx qc-ctx-empty" aria-label="About this agent">
        <ArtSlot name="agent-unknown" maxWidth={220} />
      </aside>
    );
  }

  const rows = agentContextRows(agent, queries, manuscript);
  const asks = agentAsks(agent);
  const mswl = (agent.mswlNotes ?? "").trim();
  const stamp = freshnessStamp(agent);
  const site = (agent.website ?? "").trim();
  const heading = (agent.agency ?? "").trim() || (agent.name ?? "").trim();

  return (
    /* ⚠️ NOT IN THE TAB ORDER'S WAY. The panel is REFERENCE, not input: Tab must walk the form
       stack and reach Save, so nothing here is focusable except the one real link at the foot.
       The body scrolls on its own; the sage header stays pinned above it. */
    <aside className="qc-ctx" aria-label={`About ${heading}`}>
      <div className="qc-ctxhd">About {heading}</div>
      <div className="qc-ctxbody f12-quiet-scroll">
        <dl className="qc-ctxrows">
          {rows.map((r) => (
            <div className="qc-ctxrow" key={r.key}>
              <dt>{r.label}</dt>
              <dd>
                {r.dot && <i className={`qc-ctxdot qc-ctxdot-${r.dot}`} aria-hidden="true" />}
                {r.value}
              </dd>
            </div>
          ))}
        </dl>

        {asks.length > 0 && (
          <div className="qc-ctxbox">
            <div className="qc-ctxboxhd">What they ask for</div>
            <ul className="qc-ctxasks">
              {asks.map((a) => <li key={a}>{a}</li>)}
            </ul>
          </div>
        )}

        {mswl && (
          <div className="qc-ctxbox">
            <div className="qc-ctxboxhd">Manuscript wish list</div>
            <p className="qc-ctxmswl">{mswl}</p>
          </div>
        )}

        <div className="qc-ctxfoot">
          {/* ⚠️ MANDATORY whenever wish-list or genre data is shown — both go stale silently, and
              a writer acting on a two-year-old MSWL is what the stamp exists to prevent. */}
          {stamp && <span className="qc-ctxstamp">{stamp}</span>}
          {site && (
            <a className="qc-ctxlink" href={site} target="_blank" rel="noopener noreferrer">Agency page</a>
          )}
        </div>
      </div>
    </aside>
  );
};
