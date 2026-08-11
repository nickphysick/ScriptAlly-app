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
  repliedIn, type ResponseDraft, type ResponseOutcome,
} from "../../lib/responseDraft";
import { responseRefRows } from "../../lib/responseContext";
import { agentPrimary } from "../../lib/agentDisplay";

/** §1 opens with the outcome and the date; §2 branches the rest by outcome. */
export type RespStepId = "outcome" | "when" | "notes";
export const RESP_STEP_ORDER: readonly RespStepId[] = ["outcome", "when", "notes"] as const;

const SHORT: Record<RespStepId, string> = { outcome: "Outcome", when: "When", notes: "Notes" };
const TITLE: Record<RespStepId, string> = {
  outcome: "What came back?",
  when: "When it arrived",
  notes: "Notes",
};
const HINT: Record<RespStepId, string> = {
  outcome: "What the agent said",
  when: "The day their reply arrived",
  notes: "Optional — anything worth remembering",
};

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
  onSave?: () => void;
  canSave?: boolean;
  saving?: boolean;
  /** The date the query went out — the floor the When step's picker is bounded by (§3). */
  sentISO?: string;
}

export const ResponsePane: React.FC<ResponsePaneProps> = ({
  draft, onChange, query, agent, manuscripts, active, reached,
  onJump, onAdvance, onSave, canSave = false, saving = false, sentISO,
}) => {
  const set = (patch: Partial<ResponseDraft>) => onChange({ ...draft, ...patch });
  const states = statesIn(RESP_STEP_ORDER, active, reached);
  const msTitle = manuscripts.find((m) => m.id === query.manuscriptId)?.title;
  const rows = responseRefRows(query, agent, [], msTitle);
  const interval = repliedIn(sentISO, draft.dateArrived);

  const summaries: Record<RespStepId, string> = {
    outcome: draft.outcome ? OUTCOME_LABEL[draft.outcome] : "",
    when: draft.dateArrived,
    notes: draft.notes.trim() ? "Added" : "None",
  };

  return (
    <div className="f12-detail qc-take-body" style={{ display: "flex", flexDirection: "column", minHeight: 0, gap: 12 }}>
      <div className="qc-two qr-two">
        <div className="qc-form f12-quiet-scroll">
          <StepStack
            order={RESP_STEP_ORDER}
            active={active}
            states={states}
            onJump={onJump}
            onAdvance={onAdvance}
            onSave={onSave}
            canSave={canSave}
            saving={saving}
            saveLabel="Save response"
            steps={[
              {
                id: "outcome",
                short: SHORT.outcome, title: TITLE.outcome, hint: HINT.outcome,
                summary: summaries.outcome,
                body: (
                  /* ⚠️ §1 RENDERS THE CHOICE; §2 GIVES IT THE THREE-ACROSS TREATMENT AND BRANCHES
                     THE STACK BEHIND IT. Kept real rather than stubbed so the header's chips have
                     something to report and the shell is walkable on its own. */
                  <div className="qr-outs" role="radiogroup" aria-label="What came back">
                    {OUTCOME_ORDER.map((o: ResponseOutcome) => (
                      <button
                        key={o}
                        type="button"
                        role="radio"
                        aria-checked={draft.outcome === o}
                        className={`qr-out${draft.outcome === o ? " on" : ""}`}
                        onClick={() => set({ outcome: o })}
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
              },
              {
                id: "when",
                short: SHORT.when, title: TITLE.when, hint: HINT.when,
                summary: summaries.when,
                body: (
                  <div>
                    <div className="qc-fl">Date arrived</div>
                    <input
                      type="date"
                      className="qr-date"
                      value={draft.dateArrived}
                      onChange={(e) => set({ dateArrived: e.target.value })}
                      aria-label="Date the response arrived"
                    />
                    {/* ⚠️ A FACT, NOT A VERDICT. How long they took, stated plainly — the app does
                        not tell the writer whether that was fast or slow. */}
                    {interval && <div className="qc-derived">{interval}</div>}
                  </div>
                ),
              },
              {
                id: "notes",
                short: SHORT.notes, title: TITLE.notes, hint: HINT.notes,
                optional: true,
                summary: summaries.notes,
                body: (
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
              },
            ]}
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
