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
  panelHeader, statCells, noReplyPolicy, agentHistory, historyLine, seekingChips, agentAsks,
  freshnessStamp, panelState, PARTIAL_TAIL, NAME_ONLY_NOTE,
} from "../../lib/agentContext";
import { ArtSlot } from "../todo/ArtSlot";
import { agentPrimary } from "../../lib/agentDisplay";

export interface AgentContextPanelProps {
  agent: Agent;
  queries: Query[];
  /** Opens a query from the history line — the same discard-then-select door the form's warning uses. */
  onOpenQuery?: (id: string) => void;
  /**
   * ⚠️ THE CONTENT SEAM (Pack A §2). The CHASSIS is shared and is what makes the two journeys' panels
   * the same object: the sage cap and its glyph, the Playfair title over the mono agent name, the
   * status pill, the two-up stats strip, the italic policy line, the footer stamp, the dashed rim
   * and the tilt. Only the BODY differs — create's answers "who am I writing to", record's answers
   * "what am I looking at".
   *
   * Absent, it renders create's own body, so every existing call site is untouched. This is an
   * extension, not a fork: a second panel is how 326×427 and 300×642 with different alignment
   * happened, and neither was wrong on its own terms.
   */
  body?: React.ReactNode;
  /**
   * ⚠️ THE POLICY LINE IS SUPPRESSIBLE FOR EXACTLY ONE CASE. Record's contextual row states the
   * agency's no-reply policy when the outcome IS "closed — no reply", and the chassis states it
   * always. Rendering the same sentence twice in one small panel reads as a rendering fault rather
   * than as emphasis. The row wins there, because it is the row the outcome asked for.
   */
  suppressPolicy?: boolean;
}

const PersonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="8" r="3.6" /><path d="M4.5 20c0-3.8 3.5-5.6 7.5-5.6s7.5 1.8 7.5 5.6" />
  </svg>
);

/**
 * The stat glyphs, keyed by the cell `statCells` emits.
 *
 * ⚠️ KEYED, NOT POSITIONAL. Either cell omits itself when the agent has not stated that fact, so
 * "the first one is the clock" is true only until an agent with no reply time arrives — and then
 * the envelope would sit under "Expected response time". A missing key draws no glyph, which is
 * the right failure: a cell with no icon still reads, a cell with the wrong icon misinforms.
 */
const STAT_GLYPH: Record<string, React.ReactNode> = {
  reply: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" />
    </svg>
  ),
  submit: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5.5" width="18" height="13" rx="2" /><path d="m3.5 7 8.5 6 8.5-6" />
    </svg>
  ),
};

export const AgentContextPanel: React.FC<AgentContextPanelProps> = ({ agent, queries, onOpenQuery, body, suppressPolicy }) => {
  /* The wish list is clamped to four lines and this opens it. ⚠️ THE CLAMP IS WHAT KEEPS THE
     PANEL COMPACT — a long MSWL is otherwise the whole column, and the sections beneath it stop
     being findable. */
  const [showAll, setShowAll] = useState(false);

  const state = panelState(agent, queries);
  const head = panelHeader(agent);
  const cells = statCells(agent);
  const policy = noReplyPolicy(agent);
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
    <aside className={`qc-ctx qc-ctx-${state}`} aria-label="About this agent, for reference">
      {/* ⚠️ "THIS AGENT AT A GLANCE" REPLACES THE "FOR REFERENCE" CAPTION BAR (ref qc-tilt).
          That bar named the column's FUNCTION and nothing else, on the reasoning that an
          identity block would compete with the agent row on the left. It named the panel where
          it could have named the agent — so the one line of a reference card that tells you
          whose card it is was the line it did not have. The name sits UNDER the title in 7.5px
          mono, which is a caption, not a second headline: the hierarchy the old bar protected
          survives, and the card now says who it is about. */}
      <div className="qc-glance">
        <span className="qc-glancemk" aria-hidden="true"><PersonIcon /></span>
        <div className="qc-glancet">
          <div className="qc-glanceh">This agent at a glance</div>
          <div className="qc-glancew">{agentPrimary(agent)}</div>
        </div>
        {head.status && (
          <span className={`qc-ctxpill${head.status.open ? "" : " qc-ctxpill-shut"}`}>{head.status.label}</span>
        )}
      </div>

      {cells.length > 0 && (
        <div className="qc-ctxstats">
          {cells.map((c) => (
            <div className="qc-ctxstat" key={c.key}>
              {STAT_GLYPH[c.key] && <span className="qc-ctxsi" aria-hidden="true">{STAT_GLYPH[c.key]}</span>}
              {/* ⚠️ THE CAPTIONS WRAP RATHER THAN TRUNCATE. "Preferred submission method" is long
                  on purpose — an abbreviated caption on a reference panel is the one thing worse
                  than a long one — so the text column is allowed two lines beside the glyph. */}
              <div className="qc-ctxstatt">
                <div className="qc-ctxv">{c.value}{c.unit && <small> {c.unit}</small>}</div>
                <div className="qc-ctxk">{c.caption}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* A sentence, not a statistic — "Yes" under "No reply = pass" says the shape of a fact
          without saying the fact. */}
      {policy && !suppressPolicy && <p className="qc-ctxpolicy">{policy}</p>}

      {body !== undefined ? (
        /* ⚠️ THE SUPPLIED BODY STILL GETS THE SCROLLER AND THE QUIET BAR. The chassis owns how the
           body behaves when it overflows; a caller passing rows should not have to remember to. */
        <div className="qc-ctxbody f12-quiet-scroll">{body}</div>
      ) : state === "name-only" ? (
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
