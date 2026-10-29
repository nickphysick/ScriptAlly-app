/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD FIRST VISIT v1 — THE SET-UP CARD (Part A2; ref design-refs/dashboard-first-visit-v1/, pane 01–02).
 *
 * Before the first query on a manuscript the left column is this card: one question, two answers, and the
 * path the answer chooses. It takes the v116 card construction (white rim, burgundy line, navy band) and its
 * height is its content's.
 *
 * ⚠️ THE ANSWER ONLY CHOOSES A PATH — it is stored per user and manuscript and changes no data. Nothing here
 * writes a record: every button opens the flow that does (Smart Import, the log drawer, the add-agent panel,
 * Discover).
 * ⚠️ RADIO SEMANTICS: one tab stop for the pair, arrows move the choice, Space/Enter choose (WAI-ARIA radio group).
 */
import React, { useId, useRef } from "react";
import type { StartPath } from "../../../lib/dashFirstVisit";
import { ArtSlot } from "../../todo/ArtSlot";

export const SETUP_TITLE = "Let's get you set up";

export const SETUP_CHOICES: readonly { key: StartPath; label: string; sub: string }[] = [
  { key: "yes", label: "Yes, I'm already querying", sub: "Bring what you've sent so far" },
  { key: "notyet", label: "Not yet", sub: "Start with the agents you'd like to query" },
];

export interface SetUpCardProps {
  loading: boolean;
  title: string;
  path: StartPath;
  onPath: (p: StartPath) => void;
  /** agents on file — the "Not yet" path changes once there is one */
  agents: number;
  onImport: () => void;
  onLog: () => void;
  onAddAgent: () => void;
  onDiscover: () => void;
}

/* a no-break space: the button is inline-flex, which trims a plain leading space off its last item */
const Arrow = () => <span aria-hidden="true">{"\u00a0→"}</span>;

export const SetUpCard: React.FC<SetUpCardProps> = ({ loading, title, path, onPath, agents, onImport, onLog, onAddAgent, onDiscover }) => {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const qid = `fv1-q-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const j = (i + d + SETUP_CHOICES.length) % SETUP_CHOICES.length;
    onPath(SETUP_CHOICES[j].key);
    refs.current[j]?.focus();
  };
  const book = title || "your manuscript";
  return (
    <section className={`os-card fv1-setup${loading ? " d58-skcard" : ""}`} data-fv1="setup" data-path={path} data-loading={loading ? "1" : "0"} data-sk={loading ? "card" : undefined} aria-label={SETUP_TITLE}>
      <div className="os-frame">
        <div className="os-band">
          <div className="os-bandrow"><h3 className="os-cardttl" data-fv1="setup-title">{SETUP_TITLE}</h3></div>
        </div>
        <div className="fv1-q">
          <h4 className="fv1-qh" id={qid} data-fv1="question">Have you sent any queries for {title ? <em>{title}</em> : book} yet?</h4>
          <div className="fv1-ch" role="radiogroup" aria-labelledby={qid}>
            {SETUP_CHOICES.map((c, i) => {
              const on = c.key === path;
              return (
                <button
                  key={c.key}
                  ref={(el) => { refs.current[i] = el; }}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  tabIndex={on ? 0 : -1}
                  className={on ? "fv1-choice is-on" : "fv1-choice"}
                  data-fv1={`choice-${c.key}`}
                  disabled={loading}
                  onClick={() => onPath(c.key)}
                  onKeyDown={(e) => onKey(e, i)}
                >
                  <i aria-hidden="true" />
                  <span><b>{c.label}</b><span>{c.sub}</span></span>
                </button>
              );
            })}
          </div>
        </div>
        {path === "yes" ? (
          <div className="fv1-path" data-fv1="path-yes">
            <div className="fv1-pt">
              <h4 className="fv1-ph">Bring your tracker across</h4>
              <p className="fv1-pp">Upload the spreadsheet you've been keeping. Smart Import reads your columns, matches agents and dates, and you check everything before it's saved.</p>
              <div className="fv1-row">
                <button type="button" className="fv1-btn" data-fv1="go-import" disabled={loading} onClick={onImport}>Import your tracker<Arrow /></button>
                <button type="button" className="fv1-lnk" data-fv1="go-log" disabled={loading} onClick={onLog}>or log them one at a time</button>
              </div>
            </div>
            <ArtSlot name="dash-courier-letter" className="fv1-art" />
          </div>
        ) : agents > 0 ? (
          <div className="fv1-path" data-fv1="path-notyet" data-agents={agents}>
            <div className="fv1-pt">
              <h4 className="fv1-ph" data-fv1="path-head">You have {agents.toLocaleString("en-GB")} {agents === 1 ? "agent" : "agents"} on file</h4>
              <p className="fv1-pp">Log your first query when you've sent it.</p>
              <div className="fv1-row">
                <button type="button" className="fv1-btn" data-fv1="go-log" disabled={loading} onClick={onLog}>Log a query<Arrow /></button>
                <button type="button" className="fv1-lnk" data-fv1="go-agent" disabled={loading} onClick={onAddAgent}>Add another agent</button>
              </div>
            </div>
            <ArtSlot name="dash-scout-binoculars" className="fv1-art" />
          </div>
        ) : (
          <div className="fv1-path" data-fv1="path-notyet" data-agents="0">
            <div className="fv1-pt">
              <h4 className="fv1-ph" data-fv1="path-head">Start your contact list</h4>
              <p className="fv1-pp">Add the agents you'd like to query, even before you've written your letter. Discover has UK agents to browse, with what each one is looking for.</p>
              <div className="fv1-row">
                <button type="button" className="fv1-btn" data-fv1="go-agent" disabled={loading} onClick={onAddAgent}>Add an agent<Arrow /></button>
                <button type="button" className="fv1-lnk" data-fv1="go-discover" disabled={loading} onClick={onDiscover}>Browse Discover</button>
              </div>
            </div>
            <ArtSlot name="dash-scout-binoculars" className="fv1-art" />
          </div>
        )}
      </div>
    </section>
  );
};
