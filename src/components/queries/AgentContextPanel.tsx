/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE AGENT CONTEXT PANEL — stage 2's right column (ref design-refs/qc-agent-panel-v2.html).
 *
 * ⚠️ THE PANEL ENDS WHERE ITS CONTENT ENDS. `height: auto; max-height: 100%` — it does NOT
 * stretch to fill the column, because a thin record stretched to full height is a frame around
 * dead space, and dead space reads as something failing to load. Only the body scrolls, and only
 * when the content genuinely overflows; identity, stats and footer stay put.
 *
 * Presentation only: every value comes from `agentContext`, which omits rather than blanks.
 */
import React, { useState } from "react";
import type { Agent, Query } from "../../types";
import {
  panelIdentity, statCells, agentHistory, historyLine, seekingChips, agentAsks,
  freshnessStamp, panelState, PARTIAL_TAIL, NAME_ONLY_NOTE,
} from "../../lib/agentContext";
import { ArtSlot } from "../todo/ArtSlot";

export interface AgentContextPanelProps {
  agent: Agent;
  queries: Query[];
  /** Opens a query from the history line — the same discard-then-select door the form's warning uses. */
  onOpenQuery?: (id: string) => void;
}

const PinIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
    <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" />
  </svg>
);

export const AgentContextPanel: React.FC<AgentContextPanelProps> = ({ agent, queries, onOpenQuery }) => {
  /* The wish list is clamped to four lines and this opens it. ⚠️ THE CLAMP IS WHAT KEEPS THE
     PANEL COMPACT — a long MSWL is otherwise the whole column, and the sections beneath it stop
     being findable. */
  const [showAll, setShowAll] = useState(false);

  const state = panelState(agent, queries);
  const id = panelIdentity(agent);
  const cells = statCells(agent);
  const hist = agentHistory(agent.id, queries);
  const chips = seekingChips(agent);
  const asks = agentAsks(agent);
  const mswl = (agent.mswlNotes ?? "").trim();
  const stamp = freshnessStamp(agent);
  const site = (agent.website ?? "").trim();

  return (
    /* ⚠️ REFERENCE, NOT INPUT. Tab must walk the form stack and reach Save, so the panel carries
       no fields at all. Its only focusable things are three real controls: the wish-list
       disclosure, the history link and the agency link. */
    <aside className={`qc-ctx qc-ctx-${state}`} aria-label={`About ${id.heading}`}>
      <div className="qc-ctxid">
        <div className="qc-ctxidtop">
          <span className="qc-ctxmg" aria-hidden="true">{id.initials}</span>
          <div className="qc-ctxwho">
            <h3>{id.heading}</h3>
            {id.role && <div className="qc-ctxrole">{id.role}</div>}
            {id.location && (
              <div className="qc-ctxloc"><PinIcon />{id.location}</div>
            )}
          </div>
        </div>
        {id.status && (
          <span className={`qc-ctxpill${id.status.open ? "" : " qc-ctxpill-shut"}`}>{id.status.label}</span>
        )}
      </div>

      {cells.length > 0 && (
        <div className="qc-ctxstats">
          {cells.map((c) => (
            <div className="qc-ctxstat" key={c.key}>
              <div className="qc-ctxv">{c.value}{c.unit && <small> {c.unit}</small>}</div>
              <div className="qc-ctxk">{c.caption}</div>
            </div>
          ))}
        </div>
      )}

      {state === "name-only" ? (
        <div className="qc-ctxbody">
          <p className="qc-ctxthin">{NAME_ONLY_NOTE}</p>
          <ArtSlot name="agent-unknown" maxWidth={200} />
        </div>
      ) : (
        <div className="qc-ctxbody f12-quiet-scroll">
          {/* Your history — present even at zero, because "this is your first" is worth knowing. */}
          <section className="qc-ctxsec">
            <div className="qc-ctxsech"><span className="qc-ctxcap">Your history</span><i className="qc-ctxrule" /></div>
            <div className="qc-ctxhist">
              <i className="qc-ctxhd" aria-hidden="true" />
              <span>{historyLine(hist)}</span>
              {hist?.latestId && onOpenQuery && (
                <button type="button" className="qc-ctxopen" onClick={() => onOpenQuery(hist.latestId!)}>Open it</button>
              )}
            </div>
          </section>

          {chips.length > 0 && (
            <section className="qc-ctxsec">
              <div className="qc-ctxsech"><span className="qc-ctxcap">Seeking</span><i className="qc-ctxrule" /></div>
              <div className="qc-ctxchips">
                {chips.map((g) => <span className="qc-ctxg" key={g}>{g}</span>)}
              </div>
              {/* ⚠️ No word-count line: the agent model has no stated range. See WORD_COUNT_BLOCKED. */}
            </section>
          )}

          {asks.length > 0 && (
            <section className="qc-ctxsec">
              <div className="qc-ctxsech"><span className="qc-ctxcap">What they ask for</span><i className="qc-ctxrule" /></div>
              {asks.map((a) => (
                <div className="qc-ctxask" key={a.name}>
                  <span className="qc-ctxtk" aria-hidden="true">✓</span>
                  <span>{a.name}</span>
                  {a.qty && <span className="qc-ctxq">{a.qty}</span>}
                </div>
              ))}
            </section>
          )}

          {mswl && (
            <section className="qc-ctxsec">
              <div className="qc-ctxsech"><span className="qc-ctxcap">Manuscript wish list</span><i className="qc-ctxrule" /></div>
              <div className="qc-ctxquote">
                <p className={showAll ? undefined : "qc-ctxclamp"}>{mswl}</p>
              </div>
              <button type="button" className="qc-ctxmore" aria-expanded={showAll} onClick={() => setShowAll((v) => !v)}>
                {showAll ? "Show less" : "Read all"}
              </button>
            </section>
          )}

          {state === "partial" && <p className="qc-ctxthin">{PARTIAL_TAIL}</p>}
        </div>
      )}

      {(stamp || site) && (
        <div className="qc-ctxfoot">
          {stamp && <span className="qc-ctxstamp">{stamp}</span>}
          {site && <a className="qc-ctxlink" href={site} target="_blank" rel="noopener noreferrer">Agency page</a>}
        </div>
      )}
    </aside>
  );
};
