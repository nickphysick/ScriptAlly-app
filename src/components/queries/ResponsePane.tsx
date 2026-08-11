/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * RECORDING A RESPONSE — the takeover's body (ref design-refs/83-record-response.html).
 *
 * The same shape as Logging new query, deliberately: step flow left, reference panel right, one
 * section open at a time. It mounts the SHARED `StepStack` rather than a copy of it, which is what
 * the extraction ahead of this pack was for — the two journeys cannot drift into two rhythms.
 *
 * ⚠️ THE PANEL IS PRESENT FROM THE FIRST FRAME, unlike create's. There the agent is unknown until
 * an agent is chosen, so the column has nothing to describe; here the query — and therefore the
 * agent, the send and the history — is known before the takeover opens.
 */
import React from "react";
import type { Agent, Manuscript, Query } from "../../types";
import { StepStack } from "./StepStack";
import { statesIn } from "../../lib/stepStack";
import {
  OUTCOME_ORDER, OUTCOME_LABEL, OUTCOME_DESC, OUTCOME_TONE,
  RESP_STEP_SHORT, RESP_STEP_TITLE, RESP_STEP_HINT, RESP_STEP_OPTIONAL,
  stepsFor, changeOutcome, droppedNotice,
  repliedIn, type ResponseDraft, type ResponseOutcome, type RespStep,
} from "../../lib/responseDraft";
import { responseRefRows } from "../../lib/responseContext";
import { agentPrimary } from "../../lib/agentDisplay";

/** ⚠️ THE ORDER IS DERIVED FROM THE OUTCOME, never a constant. Before one is chosen the stack holds
 *  only the question that decides it — there is nothing honest to put beneath it yet. */
export type RespStepId = RespStep;

export interface ResponsePaneProps {
  draft: ResponseDraft;
  onChange: (d: ResponseDraft) => void;
  query: Query;
  agent: Agent | null;
  manuscripts: Manuscript[];
  active: RespStepId;
  reached: RespStepId;
  onJump: (id: RespStepId) => void;
  onAdvance: () => void;
  /** ⚠️ ONE DOOR for changing the outcome: the new draft AND what it discarded, together. Two
   *  callbacks could be wired up singly, and then the fields would clear without the notice. */
  onOutcomeChange: (next: ResponseDraft, dropped: RespStep[]) => void;
  /** The notice for the last such change — cleared by the host once it has been read. */
  dropped: RespStep[];
  onSave?: () => void;
  canSave?: boolean;
  saving?: boolean;
  /** The date the query went out — the floor the When step's picker is bounded by (§3). */
  sentISO?: string;
}

export const ResponsePane: React.FC<ResponsePaneProps> = ({
  draft, onChange, query, agent, manuscripts, active, reached,
  onJump, onAdvance, onOutcomeChange, dropped, onSave, canSave = false, saving = false, sentISO,
}) => {
  const set = (patch: Partial<ResponseDraft>) => onChange({ ...draft, ...patch });
  const order = stepsFor(draft.outcome);
  const states = statesIn(order, active, reached);
  const notice = droppedNotice(dropped);
  /* ⚠️ CHANGING THE OUTCOME GOES THROUGH ONE DOOR, so the discard and the notice cannot come apart.
     Setting `outcome` directly would keep the fields of a journey the writer has just left. */
  const pickOutcome = (o: ResponseOutcome) => {
    const { draft: next, dropped: lost } = changeOutcome(draft, o);
    onOutcomeChange(next, lost);
  };
  const msTitle = manuscripts.find((m) => m.id === query.manuscriptId)?.title;
  const rows = responseRefRows(query, agent, [], msTitle);
  const interval = repliedIn(sentISO, draft.dateArrived);

  /* One line each, and only once the step has something to say. */
  const summaries: Partial<Record<RespStepId, string>> = {
    outcome: draft.outcome ? OUTCOME_LABEL[draft.outcome] : "",
    when: draft.dateArrived,
    asked: [draft.askedFor, draft.deadline && `by ${draft.deadline}`].filter(Boolean).join(" · "),
    offer: [draft.offerTerms, draft.offerReplyBy && `reply by ${draft.offerReplyBy}`].filter(Boolean).join(" · "),
    said: draft.theirWords.trim() ? "Kept" : "",
    notes: draft.notes.trim() ? "Added" : "",
  };

  const BODY: Record<RespStepId, React.ReactNode> = {
    /* ⚠️ THREE ACROSS, AND THE MARK CARRIES THE FAMILY — sage for what the agent did, burgundy for
       an offer, muted for an ending. No red: a rejection is not a failure state. */
    outcome: (
      <div className="qr-outs" role="radiogroup" aria-label="What came back">
        {OUTCOME_ORDER.map((o: ResponseOutcome) => (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={draft.outcome === o}
            className={`qr-out${draft.outcome === o ? " on" : ""}`}
            onClick={() => pickOutcome(o)}
          >
            <span className={`qr-m qr-m-${OUTCOME_TONE[o]}`} aria-hidden="true" />
            <span className="qr-outtx">
              <b>{OUTCOME_LABEL[o]}</b>
              <i>{OUTCOME_DESC[o]}</i>
            </span>
          </button>
        ))}
      </div>
    ),
    when: (
      <div>
        <div className="qc-fl">Date arrived</div>
        <input
          type="date"
          className="qr-date"
          value={draft.dateArrived}
          onChange={(e) => set({ dateArrived: e.target.value })}
          aria-label="Date the response arrived"
        />
        {/* ⚠️ A FACT, NOT A VERDICT. How long they took, stated plainly — the app does not tell the
            writer whether that was fast or slow. */}
        {interval && <div className="qc-derived">{interval}</div>}
      </div>
    ),
    /* ⚠️ THE MATERIALS CHIPS AND THE UNIT-AWARE STEPPER ARE NOT HERE YET, deliberately. They are
       welded into create's What step (~120 lines) and reusing them means extracting them, which is
       its own pure-refactor commit with its own proof — copying the markup is the drift this pack
       has been avoiding. Until then this step holds what it can state honestly: what they asked
       for, in the writer's own words, and the date they want it by. */
    asked: (
      <div>
        <div className="qc-fl">What they asked for</div>
        <textarea
          className="qc-note"
          value={draft.askedFor}
          onChange={(e) => set({ askedFor: e.target.value })}
          placeholder="The first fifty pages, a synopsis…"
          aria-label="What they asked for"
        />
        <div className="qc-fl" style={{ marginTop: 12 }}>By when — optional</div>
        <input
          type="date"
          className="qr-date"
          value={draft.deadline}
          onChange={(e) => set({ deadline: e.target.value })}
          aria-label="Deadline they gave"
        />
      </div>
    ),
    offer: (
      <div>
        <div className="qc-fl">The offer</div>
        <textarea
          className="qc-note"
          value={draft.offerTerms}
          onChange={(e) => set({ offerTerms: e.target.value })}
          placeholder="Terms, commission, what they said about the book…"
          aria-label="The offer"
        />
        {/* An offer usually comes with a date they need an answer by, and it is the one thing here
            that has a deadline attached to it. */}
        <div className="qc-fl" style={{ marginTop: 12 }}>They need an answer by — optional</div>
        <input
          type="date"
          className="qr-date"
          value={draft.offerReplyBy}
          onChange={(e) => set({ offerReplyBy: e.target.value })}
          aria-label="Date a reply to the offer is due"
        />
      </div>
    ),
    said: (
      <div>
        <div className="qc-fl">Anything they said — optional</div>
        <textarea
          className="qc-note"
          value={draft.theirWords}
          onChange={(e) => set({ theirWords: e.target.value })}
          placeholder="Their words, if you want to keep them…"
          aria-label="Anything they said"
        />
      </div>
    ),
    notes: (
      <>
        <textarea
          className="qc-note"
          value={draft.notes}
          onChange={(e) => set({ notes: e.target.value })}
          placeholder="Anything worth remembering about this reply…"
          aria-label="Notes on this response"
        />
        <p className="qc-notecap">Saved with this query · only you see it</p>
      </>
    ),
  };

  return (
    <div className="f12-detail qc-take-body" style={{ display: "flex", flexDirection: "column", minHeight: 0, gap: 12 }}>
      <div className="qc-two qr-two">
        <div className="qc-form f12-quiet-scroll">
          {/* ⚠️ IT SAYS SO WHEN A CHANGE COST SOMETHING — and only then. A notice that fires when
              nothing was discarded teaches the writer to ignore it, which is exactly when it
              matters. `role="status"` so it is announced without stealing focus. */}
          {notice && <p className="qr-dropped" role="status">{notice}</p>}
          <StepStack
            order={order}
            active={active}
            states={states}
            onJump={onJump}
            onAdvance={onAdvance}
            onSave={onSave}
            canSave={canSave}
            saving={saving}
            saveLabel="Save response"
            steps={order.map((id) => ({
              id,
              short: RESP_STEP_SHORT[id],
              title: RESP_STEP_TITLE[id],
              hint: RESP_STEP_HINT[id],
              optional: RESP_STEP_OPTIONAL[id],
              summary: summaries[id],
              body: BODY[id],
            }))}
          />
        </div>

        {/* ⚠️ THE PANEL RENDERS ON THE FIRST FRAME — see the module header. It states what is
            relevant to a REPLY, never to a send. */}
        {rows.length > 0 && (
          <aside className="qc-ref qr-ref" aria-label={`What is on file about ${agentPrimary(agent ?? ({} as never)) || "this agent"}`}>
            <div className="qr-refcap">
              <div className="qr-reft">{agentPrimary(agent ?? ({} as never)) || "This agent"}</div>
              <div className="qr-refsub">FOR REFERENCE</div>
            </div>
            {rows.map((r) => (
              <div className="qr-refrow" key={r.label}>
                <div className="qr-reflb">{r.label}</div>
                <div className="qr-reftx">{r.text}</div>
              </div>
            ))}
          </aside>
        )}
      </div>
    </div>
  );
};
