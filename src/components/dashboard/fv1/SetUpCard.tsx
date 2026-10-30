/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE SET-UP CARD (Dashboard first visit v1, Part A2; rebuilt by first visit v2, Part B — ref
 * design-refs/dashboard-first-visit-v2/, screens 01, 05–07, 09).
 *
 * Before the first query on a manuscript the middle column opens on this card. It no longer asks where the writer is:
 * it says what they told us at sign-up ("You said…"), with "Not right? Change it", and below it the path that answer
 * chooses. Change it opens the question ("Where are you with {Title}?") with three answers and Done.
 *
 * ⚠️ THE ANSWER IS THE SIGN-UP ANSWER (`answerFor`): `User.queryingStage` and `Manuscript.status`. Changing it here
 * writes THOSE fields (`answerWrite`) — never a dashboard-only preference — so the card, Getting started's order and
 * the manuscript card's label all follow it.
 * ⚠️ NOTHING ELSE HERE WRITES. Every button opens the flow that does (Smart Import, the log drawer, the add-agent panel,
 * Discover, Comparable titles).
 * ⚠️ RADIO SEMANTICS: one tab stop for the group, arrows move the choice, Space/Enter choose (WAI-ARIA radio group).
 * ⚠️ NO ANSWER, NO "You said": an account that never answered opens on the question.
 */
import React, { useId, useRef, useState } from "react";
import { choiceOf, type AnswerChoice, type StartPath } from "../../../lib/dashFirstVisit";
import { ArtSlot } from "../../todo/ArtSlot";

export const SETUP_TITLE = "Let's get you set up";
export const CHANGE_IT = "Not right? Change it";
export const DONE = "Done";

export const SETUP_CHOICES: readonly { key: AnswerChoice; label: string; sub: string }[] = [
  { key: "querying", label: "I'm already querying", sub: "Bring what you've sent so far" },
  { key: "ready", label: "It's ready, I haven't started", sub: "Start with the agents you'd like to query" },
  { key: "writing", label: "I'm still writing or revising", sub: "Get things ready for when it's done" },
];

/** "You said …" — the sign-up answer as a sentence; the title is set in italics. */
export const answerSentence = (path: StartPath, title: React.ReactNode): React.ReactNode => {
  switch (path) {
    case "querying": return <>You said you've already sent some queries for {title}.</>;
    case "ready": return <>You said {title} is ready, and you haven't sent any queries yet.</>;
    case "writing": return <>You said {title} is still being written.</>;
    case "revising": return <>You said {title} is in revision.</>;
    default: {
      const unhandled: never = path;
      return unhandled;
    }
  }
};

export interface SetUpCardProps {
  loading: boolean;
  title: string;
  /** the sign-up answer; null when the writer never gave one */
  path: StartPath | null;
  onChoose: (c: AnswerChoice) => void;
  /** agents on file — the ready path changes once there is one */
  agents: number;
  onImport: () => void;
  onLog: () => void;
  onAddAgent: () => void;
  onDiscover: () => void;
  onComps: () => void;
}

/* a no-break space: the button is inline-flex, which trims a plain leading space off its last item */
const Arrow = () => <span aria-hidden="true">{" →"}</span>;

export const SetUpCard: React.FC<SetUpCardProps> = ({ loading, title, path, onChoose, agents, onImport, onLog, onAddAgent, onDiscover, onComps }) => {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const qid = `fv1-q-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const [changing, setChanging] = useState(false);
  const asking = changing || path === null;
  const chosen = choiceOf(path);
  const oneAgentPath = path === "ready" && agents > 0;
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const j = (i + d + SETUP_CHOICES.length) % SETUP_CHOICES.length;
    onChoose(SETUP_CHOICES[j].key);
    refs.current[j]?.focus();
  };
  const book = title ? <em>{title}</em> : "your manuscript";
  return (
    <section className={`os-card fv1-setup${loading ? " d58-skcard" : ""}`} data-fv1="setup" data-path={path ?? "none"} data-asking={asking ? "1" : "0"}
      data-loading={loading ? "1" : "0"} data-sk={loading ? "card" : undefined} aria-label={SETUP_TITLE}>
      <div className="os-frame">
        <div className="os-band">
          <div className="os-bandrow"><h3 className="os-cardttl" data-fv1="setup-title">{SETUP_TITLE}</h3></div>
        </div>
        {asking ? (
          <div className="fv1-q">
            <h4 className="fv1-qh" id={qid} data-fv1="question">Where are you with {book}?</h4>
            <div className="fv1-ch fv2-ch" role="radiogroup" aria-labelledby={qid}>
              {SETUP_CHOICES.map((c, i) => {
                const on = c.key === chosen;
                return (
                  <button
                    key={c.key}
                    ref={(el) => { refs.current[i] = el; }}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    tabIndex={on || (chosen === null && i === 0) ? 0 : -1}
                    className={on ? "fv1-choice is-on" : "fv1-choice"}
                    data-fv1={`choice-${c.key}`}
                    disabled={loading}
                    onClick={() => onChoose(c.key)}
                    onKeyDown={(e) => onKey(e, i)}
                  >
                    <i aria-hidden="true" />
                    <span><b>{c.label}</b><span>{c.sub}</span></span>
                  </button>
                );
              })}
            </div>
            {path !== null && (
              <div className="fv2-done"><button type="button" className="fv1-lnk" data-fv1="change-done" onClick={() => setChanging(false)}>{DONE}</button></div>
            )}
          </div>
        ) : !oneAgentPath && path !== null ? (
          <p className="fv2-said" data-fv1="answer">
            {answerSentence(path, book)}{" "}
            <button type="button" className="fv1-lnk fv2-change" data-fv1="change" disabled={loading} onClick={() => setChanging(true)}>{CHANGE_IT}</button>
          </p>
        ) : null}
        {path === "querying" ? (
          <div className="fv1-path" data-fv1="path-querying">
            <div className="fv1-pt">
              <h4 className="fv1-ph" data-fv1="path-head">Bring your tracker across</h4>
              <p className="fv1-pp">Upload the spreadsheet you've been keeping. Smart Import reads your columns, matches agents and dates, and you check everything before it's saved.</p>
              <div className="fv1-row">
                <button type="button" className="fv1-btn" data-fv1="go-import" disabled={loading} onClick={onImport}>Import your tracker<Arrow /></button>
                <button type="button" className="fv1-lnk" data-fv1="go-log" disabled={loading} onClick={onLog}>or log them one at a time</button>
              </div>
            </div>
            <ArtSlot name="dash-courier-letter" className="fv1-art" />
          </div>
        ) : path === "ready" && agents > 0 ? (
          <div className="fv1-path" data-fv1="path-ready" data-agents={agents}>
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
        ) : path === "ready" ? (
          <div className="fv1-path" data-fv1="path-ready" data-agents="0">
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
        ) : path === "writing" || path === "revising" ? (
          <div className="fv1-path" data-fv1={`path-${path}`}>
            <div className="fv1-pt">
              <h4 className="fv1-ph" data-fv1="path-head">{path === "revising" ? "Get ahead while you revise" : "Get ahead while you write"}</h4>
              <p className="fv1-pp">Pick three comparable titles, start a shortlist of agents who'd suit the book, and draft your query letter. Querying can wait until the book's ready.</p>
              <div className="fv1-row">
                <button type="button" className="fv1-btn" data-fv1="go-comps" disabled={loading} onClick={onComps}>Add comparable titles<Arrow /></button>
                <button type="button" className="fv1-lnk" data-fv1="go-discover" disabled={loading} onClick={onDiscover}>Browse Discover</button>
              </div>
            </div>
            <ArtSlot name="dash-scout-binoculars" className="fv1-art" />
          </div>
        ) : null}
      </div>
    </section>
  );
};
