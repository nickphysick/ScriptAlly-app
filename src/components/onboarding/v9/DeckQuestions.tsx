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
 * The reasons the Words table does not redraw (a month with no day, a stray spreadsheet number, a
 * response date) keep the review's own question and controls (`QueryReasonPanel`), inside the same
 * card.
 *
 * A QUERY WITH A TIMELINE IS ASKED ABOUT IT WHOLE (ref design-refs/import-timeline-strip-v1.html).
 * Two dates found, or a sent-date question on a query that has events, is one card: the timeline as
 * a strip of steps (`TimelineStrip`), and one button that says what is missing until it is answered.
 */
import React, { useRef, useState } from "react";
import { QueryStatus } from "../../../types";
import { ReviewReasonCode } from "../../../types/smartImport";
import { ReviewAgent, ReviewQuery, QUERY_STATUS_OPTIONS, fmtDate, quoteStatuses } from "../../../lib/smartImportReviewModel";
import { STAGE_NAME } from "../../../lib/qcSummary";
import { ambiguousReadings } from "../../../lib/templateImport";
import { StatusDot } from "../../StatusDot";
import { QueryReasonPanel } from "../reviewRows";
import { TimelineStrip } from "./TimelineStrip";
import { STRIP_WORDS, stripNeed, stripButton } from "../../../lib/importTimeline";
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
  /* Photos (smart-import-photos-v1). Never he/she: an agent is named, or "they". */
  readingWhy: "Handwriting can read more than one way. Get the name right now and they're easy to find later.",
  readingNeither: "Neither · type it",
  illegibleWhyEmpty: "Add it if you know it, or carry on without one.",
  crossedWhy: "People cross lines out for different reasons. Tell us once and the query is tracked the right way.",
  crossedPassed: "Passed",
  crossedNoResponse: "No response",
  crossedNever: "I never sent it",
  markWhy: "Statuses are picked, never guessed.",
} as const;
/* The photo questions' sentences, built from the read's own values. */
export const readingAsk = (name: string, agency: string) => (agency ? <>We read this as <Raw>{name}</Raw> at <Raw>{agency}</Raw>. Is that right?</> : <>We read this as <Raw>{name}</Raw>. Is that right?</>);
export const illegibleAsk = (name: string) => `We couldn't make out the agency next to ${name}.`;
export const illegibleWhy = (start: string) => (start ? <>It looks like it starts <Raw>{start}</Raw>. Add it if you know it, or carry on without one.</> : DECK_WORDS.illegibleWhyEmpty);
export const crossedAsk = (name: string) => `This line is crossed out. What does that mean for ${name}?`;
/** "Use the same answer for the other crossed-out line (Tom Rafferty)" — names, up to three. */
export function crossedAllLabel(names: readonly string[]): string {
  const shown = names.slice(0, 3).join(", ") + (names.length > 3 ? ", …" : "");
  return `Use the same answer for the other crossed-out ${names.length === 1 ? "line" : "lines"} (${shown})`;
}
/** What the line says beside its mark: its status or notes wording — the notes, or the line itself
 *  without the mark and without the agent's name and agency at its start. */
export function markWording(q: { notes?: string; statusRaw?: string | null; lineRaw?: string; markRaw?: string }, who: { name?: string; agency?: string } = {}): string {
  const fromNotes = (q.notes ?? "").trim() || (q.statusRaw ?? "").trim();
  if (fromNotes) return fromNotes;
  let line = (q.lineRaw ?? "").trim();
  const mark = (q.markRaw ?? "").trim();
  if (mark && line.endsWith(mark)) line = line.slice(0, -mark.length).trim();
  const SEP = /^\s*[–—\-,:|]\s*/;
  for (const part of [who.name, who.agency]) {
    const t = (part ?? "").trim();
    if (t && line.toLowerCase().startsWith(t.toLowerCase())) line = line.slice(t.length).replace(SEP, "");
  }
  return line.trim();
}
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

/** Photos: a name or agency that reads more than one way. Each reading is a pick; "Neither · type it"
 *  opens the name and agency fields. A reading is "Name, Agency" or "Name". */
export function splitReading(reading: string, agency: string): { name: string; agency: string } {
  const at = reading.indexOf(", ");
  return at > 0 ? { name: reading.slice(0, at).trim(), agency: reading.slice(at + 2).trim() } : { name: reading.trim(), agency };
}
export const ReadingQuestion: React.FC<{ agent: ReviewAgent; onSave: (who: { name: string; agency: string }) => void }> = ({ agent, onSave }) => {
  const [typing, setTyping] = useState(false);
  const [name, setName] = useState(agent.name);
  const [agency, setAgency] = useState(agent.agency);
  const ref = useRef<HTMLInputElement>(null);
  const best = agent.agency ? `${agent.name}, ${agent.agency}` : agent.name;
  const readings = agent.readings && agent.readings.length ? agent.readings : [best];
  const save = () => { const n = name.trim(), a = agency.trim(); if (n || a) onSave({ name: n, agency: a }); else ref.current?.focus(); };
  const enter = (e: React.KeyboardEvent) => { if (e.key === "Enter") save(); };
  return (
    <div className="o9-q" data-reason="agent-reading">
      <Ask>{readingAsk(agent.name, agent.agency)}</Ask>
      <Why>{DECK_WORDS.readingWhy}</Why>
      <div className="o9-ans">
        {readings.map((r) => (
          <button type="button" className="o9-pick" key={r} data-reading={r} onClick={() => onSave(splitReading(r, agent.agency))}>{r}</button>
        ))}
        {typing ? (
          <>
            <Fld label="Agent name"><input ref={ref} className="sf-in" type="text" value={name} placeholder="Agent name" onChange={(e) => setName(e.target.value)} onKeyDown={enter} /></Fld>
            <Fld label="Agency"><input className="sf-in" type="text" value={agency} placeholder="Agency name" onChange={(e) => setAgency(e.target.value)} onKeyDown={enter} /></Fld>
            <button type="button" className="sf-btn sf-btn--sm" onClick={save}>{DECK_WORDS.namelessSave}</button>
          </>
        ) : <Esc label={DECK_WORDS.readingNeither} onClick={() => setTyping(true)} />}
      </div>
    </div>
  );
};

/** Photos: an agency is written but can't be made out. The field starts with the legible part. */
export const IllegibleAgencyQuestion: React.FC<{ agent: ReviewAgent; onSave: (agency: string) => void; onCarryOn: () => void }> = ({ agent, onSave, onCarryOn }) => {
  const [v, setV] = useState(agent.agency);
  const ref = useRef<HTMLInputElement>(null);
  const save = () => { const t = v.trim(); if (t) onSave(t); else ref.current?.focus(); };
  return (
    <div className="o9-q" data-reason="agent-illegible">
      <Ask>{illegibleAsk(agent.name || "this agent")}</Ask>
      <Why>{illegibleWhy(agent.agency.trim())}</Why>
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
  /** Photos: the agent's name (the crossed-out question) and agency (the mark question's quote). */
  agentName?: string;
  agentAgency?: string;
  /** Photos: the other crossed-out lines still open, by agent name (for "Use the same answer…"). */
  crossedOthers?: string[];
  /** Photos: a crossed-out line's answer; `all` applies it to every other open crossed-out line. */
  onCrossed?: (answer: "rejected" | "no-response" | "never", all: boolean) => void;
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

/** Photos: a crossed-out line. Passed, No response, or "I never sent it" (the agent is kept, the
 *  query is not imported). With other crossed-out lines open, one tick answers them all. */
const CrossedQuestion: React.FC<QueryQuestionProps> = ({ agentName, crossedOthers = [], onCrossed }) => {
  const [all, setAll] = useState(true);
  const others = crossedOthers.length > 0;
  const answer = (a: "rejected" | "no-response" | "never") => onCrossed?.(a, others && all);
  return (
    <div className="o9-q" data-reason="crossed-out">
      <Ask>{crossedAsk(agentName || "this agent")}</Ask>
      <Why>{DECK_WORDS.crossedWhy}</Why>
      <div className="o9-ans">
        <button type="button" className="o9-pick" data-crossed="rejected" onClick={() => answer("rejected")}><StatusDot status={QueryStatus.REJECTED} overrideSize={17} />{DECK_WORDS.crossedPassed}</button>
        <button type="button" className="o9-pick" data-crossed="no-response" onClick={() => answer("no-response")}><StatusDot status={QueryStatus.NO_RESPONSE} overrideSize={17} />{DECK_WORDS.crossedNoResponse}</button>
        <button type="button" className="o9-pick" data-crossed="never" onClick={() => answer("never")}>{DECK_WORDS.crossedNever}</button>
        {others && (
          <label className="o9-tick" data-im="crossed-all">
            <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> {crossedAllLabel(crossedOthers)}
          </label>
        )}
      </div>
    </div>
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
  if (code === "crossed-out") return <CrossedQuestion {...p} />;
  if (code === "mark-unclear") {
    const said = markWording(query, { name: p.agentName, agency: p.agentAgency });
    const mark = (query.markRaw ?? "").trim() || "mark";
    return (
      <div className="o9-q" data-reason={code}>
        <Ask>{said ? <>There's a <Raw>{mark}</Raw> after <Raw>{said}</Raw>. Where does this one stand?</> : <>There's a <Raw>{mark}</Raw> beside this line. Where does this one stand?</>}</Ask>
        <Why>{DECK_WORDS.markWhy}</Why>
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

/** The timeline card: one question, the strip, one button. The button says what is missing until
 *  the strip is answered, then "Yes, that's right", which answers every reason the strip replaced. */
export const StripQuestion: React.FC<{ query: ReviewQuery; agentName: string | null; onChange: (q: ReviewQuery) => void; onConfirm: () => void; today?: string }> = ({ query, agentName, onChange, onConfirm, today }) => {
  const need = stripNeed(query);
  return (
    <div className="o9-q o9-q--strip" data-reason="timeline" data-strip-host>
      <Ask>{STRIP_WORDS.ask(agentName)}</Ask>
      <TimelineStrip query={query} onChange={onChange} today={today} />
      <div className="o9-striprow">
        <button type="button" className="sf-btn" disabled={need !== null} onClick={onConfirm} data-strip="confirm">{stripButton(need)}</button>
      </div>
    </div>
  );
};
