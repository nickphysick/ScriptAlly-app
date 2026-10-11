/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The questions the answer deck asks (onboarding v9), each with the answers its row of the gate
 * table offers. A question is: what the sheet said (quoted in a mono pill), one line saying why it
 * is asked, then the answers.
 *
 * WHAT CAN BE LEFT BLANK ON PURPOSE IS THE GATE TABLE'S, AND THE CARD SAYS SO. An agency and a
 * missing date can ("Carry on without an agency", "I don't have this date"), each with a line
 * stating what is kept. A date that reads two ways, an unclear status and a row with no agent and
 * no agency cannot: the card offers no way past them but an answer, or removing the row.
 *
 * STATUSES ARE PICKED, NEVER TYPED: the status question is the fixed set as buttons, each drawn
 * with its own ring by `StatusDot`.
 *
 * The reasons the Words table does not redraw (two dates found, a month with no day, a stray
 * spreadsheet number, a response date) keep the review's own question and controls
 * (`QueryReasonPanel`), inside the same card.
 */
import React, { useRef, useState } from "react";
import { QueryStatus } from "../../../types";
import { ReviewReasonCode } from "../../../types/smartImport";
import { ReviewAgent, ReviewQuery, QUERY_STATUS_OPTIONS, fmtDate, quoteStatuses } from "../../../lib/smartImportReviewModel";
import { STAGE_NAME } from "../../../lib/qcSummary";
import { ambiguousReadings } from "../../../lib/templateImport";
import { StatusDot } from "../../StatusDot";
import { QueryReasonPanel } from "../reviewRows";
import "./onbV9.css";

export const DECK_WORDS = {
  agencyWhy: "The sheet has a name and no agency. An agency helps you spot colleagues and duplicates later, but it isn't required.",
  agencySave: "Save agency",
  agencyCarry: "Carry on without an agency",
  agencyKept: 'Kept as "No agency". You can add it any time.',
  twoWayWhy: "It reads two ways. Pick one and the query takes that date.",
  twoWayNeither: "Neither · type the date",
  dateWhy: "A date lets QueryHawk work out when a nudge is due. If you don't have one, say so and the query is kept undated.",
  dateSave: "Save date",
  dateNone: "I don't have this date",
  dateKept: "Kept undated. The dashboard will show it as waiting on you until you add one.",
  dateBlank: "Your sheet has no date for this one. When was it sent?",
  statusWhy: "Statuses are picked, never typed, so every query is tracked the same way.",
  namelessAsk: "This row has no agent or agency. Who was it sent to?",
  namelessWhy: "Without one, the query can't be tracked. Add a name or an agency, or remove the row.",
  namelessSave: "Save",
  namelessRemove: "Remove this row",
  mappingDone: "Mark as checked",
  change: "Change this",
} as const;
export const agencyAsk = (name: string) => `Which agency is ${name} with?`;
/** The status set's labels: the Query Centre's own names, with the first one spelled out. */
export const statusPickLabel = (s: QueryStatus): string => (s === QueryStatus.QUERIED ? "Queried, no reply yet" : STAGE_NAME[s]);

/* The quote marks are characters, not CSS: a reader copying the question, or hearing it, gets them. */
const Raw: React.FC<{ children: string }> = ({ children }) => <span className="o9-raw">“{children}”</span>;
const Ask: React.FC<{ children: React.ReactNode }> = ({ children }) => <p className="o9-ask" data-im="deck-ask">{children}</p>;
const Why: React.FC<{ children: React.ReactNode }> = ({ children }) => <p className="o9-why" data-im="deck-why">{children}</p>;
const Fld: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="sf-field o9-ansfld"><span className="sf-lab">{label}</span>{children}</label>
);
const Esc: React.FC<{ label: string; note?: string; onClick: () => void }> = ({ label, note, onClick }) => (
  <div className="o9-esc">
    <button type="button" className="sf-link sf-link--quiet" onClick={onClick}>{label}</button>
    {note && <span className="o9-small">{note}</span>}
  </div>
);

/** An answered card: what was said, and the way to change it. */
export const Answered: React.FC<{ reason: string; children: React.ReactNode; onChange: () => void }> = ({ reason, children, onChange }) => (
  <div className="o9-answered" data-answered-reason={reason}>
    <p className="o9-ask o9-ask--said" data-im="deck-said">{children}</p>
    <div className="o9-esc"><button type="button" className="sf-link sf-link--quiet" onClick={onChange} data-im="deck-change">{DECK_WORDS.change}</button></div>
  </div>
);

// ── Agents ─────────────────────────────────────────────────────────────────────────────────────
export const AgencyQuestion: React.FC<{ agent: ReviewAgent; onSave: (agency: string) => void; onCarryOn: () => void }> = ({ agent, onSave, onCarryOn }) => {
  const [v, setV] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const save = () => { const t = v.trim(); if (t) onSave(t); else ref.current?.focus(); };
  return (
    <div className="o9-q" data-reason="agent-needs-agency">
      <Ask>{agencyAsk(agent.name)}</Ask>
      <Why>{DECK_WORDS.agencyWhy}</Why>
      <div className="o9-ans">
        <Fld label="Agency name">
          <input ref={ref} className="sf-in" type="text" value={v} placeholder="Agency name" onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") save(); }} />
        </Fld>
        <button type="button" className="sf-btn sf-btn--sm" onClick={save}>{DECK_WORDS.agencySave}</button>
        <Esc label={DECK_WORDS.agencyCarry} note={DECK_WORDS.agencyKept} onClick={onCarryOn} />
      </div>
    </div>
  );
};

export const NamelessQuestion: React.FC<{ onSave: (who: { name: string; agency: string }) => void; onRemove: () => void }> = ({ onSave, onRemove }) => {
  const [name, setName] = useState("");
  const [agency, setAgency] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const save = () => { const n = name.trim(), a = agency.trim(); if (n || a) onSave({ name: n, agency: a }); else ref.current?.focus(); };
  const enter = (e: React.KeyboardEvent) => { if (e.key === "Enter") save(); };
  return (
    <div className="o9-q" data-reason="agent-nameless">
      <Ask>{DECK_WORDS.namelessAsk}</Ask>
      <Why>{DECK_WORDS.namelessWhy}</Why>
      <div className="o9-ans">
        <Fld label="Agent name"><input ref={ref} className="sf-in" type="text" value={name} placeholder="Agent name" onChange={(e) => setName(e.target.value)} onKeyDown={enter} /></Fld>
        <Fld label="Agency"><input className="sf-in" type="text" value={agency} placeholder="Agency name" onChange={(e) => setAgency(e.target.value)} onKeyDown={enter} /></Fld>
        <button type="button" className="sf-btn sf-btn--sm" onClick={save}>{DECK_WORDS.namelessSave}</button>
        <Esc label={DECK_WORDS.namelessRemove} onClick={onRemove} />
      </div>
    </div>
  );
};

export const MappingQuestion: React.FC<{ note: string; onChecked: () => void }> = ({ note, onChecked }) => (
  <div className="o9-q" data-reason="agent-mapping">
    <Ask>{quoteStatuses(note)}</Ask>
    <div className="o9-ans"><button type="button" className="sf-btn sf-btn--sm" onClick={onChecked}>{DECK_WORDS.mappingDone}</button></div>
  </div>
);

// ── Queries ────────────────────────────────────────────────────────────────────────────────────
export interface QueryQuestionProps {
  query: ReviewQuery;
  code: ReviewReasonCode;
  onPatch: (p: Partial<ReviewQuery>) => void;
  onResolveReason: (code: ReviewReasonCode, patch?: Partial<ReviewQuery>) => void;
  onSwapDates: () => void;
}

const DateField: React.FC<{ onSave: (iso: string) => void }> = ({ onSave }) => {
  const [v, setV] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const save = () => { if (v) onSave(v); else ref.current?.focus(); };
  return (
    <>
      <Fld label="Date sent"><input ref={ref} className="sf-in" type="date" value={v} aria-label="Date sent" onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") save(); }} /></Fld>
      <button type="button" className="sf-btn sf-btn--sm" onClick={save}>{DECK_WORDS.dateSave}</button>
    </>
  );
};

export const QueryQuestion: React.FC<QueryQuestionProps> = (p) => {
  const { query, code, onResolveReason } = p;
  const [typing, setTyping] = useState(false);
  const raw = (query.sentDateRaw ?? "").trim();

  if (code === "ambiguous-date") {
    return (
      <div className="o9-q" data-reason={code}>
        <Ask>Your sheet says <Raw>{raw}</Raw>. Which did you mean?</Ask>
        <Why>{DECK_WORDS.twoWayWhy}</Why>
        <div className="o9-ans">
          {ambiguousReadings(raw).map((iso) => (
            <button type="button" className="o9-pick" key={iso} data-reading={iso} onClick={() => onResolveReason(code, { sentDate: iso })}>{fmtDate(iso)}</button>
          ))}
          {typing
            ? <DateField onSave={(iso) => onResolveReason(code, { sentDate: iso })} />
            : <Esc label={DECK_WORDS.twoWayNeither} onClick={() => setTyping(true)} />}
        </div>
      </div>
    );
  }
  if (code === "no-date" || code === "unreadable-date") {
    return (
      <div className="o9-q" data-reason={code}>
        <Ask>{raw ? <>Your sheet says <Raw>{raw}</Raw>. When was this sent?</> : DECK_WORDS.dateBlank}</Ask>
        <Why>{DECK_WORDS.dateWhy}</Why>
        <div className="o9-ans">
          <DateField onSave={(iso) => onResolveReason(code, { sentDate: iso })} />
          <Esc label={DECK_WORDS.dateNone} note={DECK_WORDS.dateKept} onClick={() => onResolveReason(code, { sentDate: null })} />
        </div>
      </div>
    );
  }
  if (code === "status-wording") {
    const said = (query.statusRaw ?? "").trim();
    return (
      <div className="o9-q" data-reason={code}>
        <Ask>{said ? <>Your sheet says <Raw>{said}</Raw>. Where does this one stand?</> : "Where does this one stand?"}</Ask>
        <Why>{DECK_WORDS.statusWhy}</Why>
        <div className="o9-ans" role="group" aria-label="Status">
          {QUERY_STATUS_OPTIONS.map((s) => (
            <button type="button" className="o9-pick" key={s} data-status={s} onClick={() => onResolveReason(code, { status: s })}>
              <StatusDot status={s} overrideSize={17} />{statusPickLabel(s)}
            </button>
          ))}
        </div>
      </div>
    );
  }
  /* the reasons the deck does not redraw: the review's own question and controls */
  return <div className="o9-q o9-q--built"><QueryReasonPanel {...p} /></div>;
};
