/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The import review's rows (onboarding v5, part 2; ref design-refs/onboarding/
 * onboarding-journey-v5.html #agents #queries #dupes).
 *
 * A row is a disc, a name and a mono second line, then at the right its status (queries), a
 * "Ready" chip, a quiet action and a remove control.
 *
 * A ROW NEVER ASKS (onboarding v9). The questions are the answer deck's (`v9/ReviewDeck`); a row
 * that still has one is in the deck and not in the list. `QueryReasonPanel` stays here because
 * the deck draws the reasons the Words table did not redraw with it.
 *
 * ⚠️ EVERY SENTENCE, OPTION AND PLACEHOLDER HERE IS THE BUILD'S OWN. Questions come from
 * `queryReasonText`, choices from `statusDirectionChoices`, notes from the agent's own reason; the
 * agency fix keeps its sentence and its actions. This file changed how they are drawn.
 *
 * ⚠️ THE WAYS TO CHANGE AN ANSWER LIVE IN THE SETTLED ROW'S EDITOR. Three of them existed only in
 * the retired guided walk — "you chose to carry on without an agency", "you confirmed the details"
 * and "you've sorted this query", each with its change action — so they are mounted there, wired
 * to the handlers the walk called.
 */
import React, { useState } from "react";
import "./importFlow.css";
import { ReviewReasonCode } from "../../types/smartImport";
import { QueryStatus } from "../../types";
import { GenreCombobox } from "../forms";
import { PREDEFINED_GENRES } from "../../lib/manuscripts";
import { StatusDot } from "../StatusDot";
import {
  ReviewAgent, ReviewQuery, CheckReason,
  fmtDate, dayOf, QUERY_STATUS_OPTIONS,
  currentDate, queryReasonText, statusDirectionChoices,
  dupNoteMerged, dupNoteOpen, dupNoteKept, keepBothLabel, keptClusterLabel,
} from "../../lib/smartImportReviewModel";
import { Chip, Disc, initialsOf } from "./ImportParts";
import { ambiguousReadings } from "../../lib/templateImport";
import { STAGE_NAME } from "../../lib/qcSummary";

/** The review list's words (import review v1; ref design-refs/onboarding/import-review-v1/
 *  review-agents.dc.html). A row the writer leaves out stays in its place, says so, and can be undone. */
export const ROW_WORDS = {
  dontImport: "Don't import",
  out: "Won't be imported",
  undo: "Undo",
  add: "Add details",
  edit: "Edit details",
  close: "Close details",
  added: "Details added",
  agencyOnly: "Agency only",
  done: "Done",
  agentFoot: "All optional. You can add or change these later on your Contact list.",
  namePlaceholder: "Add a name, if you know it",
  addGenre: "+ Add a genre",
  doorUnknown: "Not known yet. Leave it if you're not sure.",
  doorFromYou: "From you",
  weeksUnset: "Not set",
  setWeeks: "Set a reply time",
  clear: "Clear",
} as const;
/** The reply-time stepper: where it starts when the writer asks for one, and its range. */
export const WEEKS_START = 6, WEEKS_MIN = 1, WEEKS_MAX = 26;
export const weeksText = (w: number) => `${w} ${w === 1 ? "week" : "weeks"}`;

/** A small labelled field in part 1's dress. */
const Field: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className }) => (
  <label className={`sf-field${className ? " " + className : ""}`}>
    <span className="sf-lab">{label}</span>
    {children}
  </label>
);

/** "Don't import": a labelled pill, never a bare ×. It sets the row aside through the review's
 *  existing path; only the words and the control changed. */
const DontImportButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button type="button" className="im-dont" onClick={onClick} data-im="row-remove">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M8 12h8" /></svg>
    {ROW_WORDS.dontImport}
  </button>
);

/** A live row's right-hand end: "✓ Details added" once changed, the details link, "Don't import". */
const LiveEnd: React.FC<{ open: boolean; added: boolean; onToggleOpen: () => void; onDelete: () => void; lead?: React.ReactNode }> = ({ open, added, onToggleOpen, onDelete, lead }) => (
  <div className="im-rwend">
    {lead}
    {added && !open && (
      <span className="im-added" data-im="row-added">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        {ROW_WORDS.added}
      </span>
    )}
    <button type="button" className="im-detlink" onClick={onToggleOpen} aria-expanded={open} data-im="row-action">
      {open ? ROW_WORDS.close : added ? ROW_WORDS.edit : ROW_WORDS.add}
    </button>
    <DontImportButton onClick={onDelete} />
  </div>
);

/** A left-out row's end: "Won't be imported" and Undo. No dialog. */
const OutEnd: React.FC<{ onUndo: () => void }> = ({ onUndo }) => (
  <div className="im-rwend">
    <span className="im-outword" data-im="row-out">{ROW_WORDS.out}</span>
    <button type="button" className="im-undo" onClick={onUndo} data-im="row-undo">{ROW_WORDS.undo}</button>
  </div>
);

/** The details panel's shell: inset under the row, paper ground, a foot with its sentence and Done. */
const DetailsPanel: React.FC<{ foot: string; onDone: () => void; children: React.ReactNode }> = ({ foot, onDone, children }) => (
  <div className="im-edit im-panel" data-im="row-edit">
    {children}
    <div className="im-panelfoot">
      <span>{foot}</span>
      <button type="button" className="im-done" onClick={onDone} data-im="row-done">{ROW_WORDS.done}</button>
    </div>
  </div>
);

/** A line stating what was answered, with the way to change it. */
const Said: React.FC<{ children: React.ReactNode; onChange: () => void }> = ({ children, onChange }) => (
  <div className="im-said" data-im="said">
    <span>{children}</span>
    <button type="button" className="sf-link sf-link--quiet" onClick={onChange} data-im="change">Change this</button>
  </div>
);

// ── Agents ──────────────────────────────────────────────────────────────────────────────────────
export interface AgentRowProps {
  agent: ReviewAgent;
  /** This agent absorbed a duplicate on the duplicates step. */
  merged?: boolean;
  open: boolean;
  onToggleOpen: () => void;
  onPatch: (p: Partial<ReviewAgent>) => void;
  onDelete: () => void;
  onReopenReason: (kind: CheckReason) => void;
  /** The writer chose "Don't import": the row stays in place, says so, and offers Undo. */
  out?: boolean;
  onUndo?: () => void;
  /** Something in the details panel has been changed by the writer. */
  added?: boolean;
}

export const AgentRow: React.FC<AgentRowProps> = ({ agent, merged, open, onToggleOpen, onPatch, onDelete, onReopenReason, out, onUndo, added }) => {
  const noAgency = !agent.agency.trim();
  const disp = agent.name || agent.agency;
  /* The name is said ONCE: a row with no agent name reads "Agency only" under its agency, and only
     its panel asks for a name. */
  const subline = agent.name && agent.agency ? agent.agency : !agent.name && agent.agency ? ROW_WORDS.agencyOnly : agent.name && noAgency ? "No agency" : null;
  const who = disp || "This agent";
  const resolvedMapping = agent.reasons.some((r) => r.kind === "mapping" && r.resolved);
  const live = !out;

  return (
    <div className={`im-rw${out ? " is-out" : ""}`} data-row-id={agent.id} data-row="agent" data-asks="0" data-out={out ? "1" : "0"}>
      <Disc initials={agent.name ? initialsOf(agent.name) : (agent.agency.match(/\b\w/g)?.slice(0, 2).join("").toUpperCase() ?? "–")} tone={out ? "none" : agent.name ? "live" : "agency"} />
      <div className="im-rwtext">
        <b className="im-rwname">{disp}</b>
        {(subline || merged) && (
          <small className="im-rwsub">{[subline, merged ? dupNoteMerged : null].filter(Boolean).join(" · ")}</small>
        )}
      </div>
      {live
        ? <LiveEnd open={open} added={!!added} onToggleOpen={onToggleOpen} onDelete={onDelete} />
        : <OutEnd onUndo={() => onUndo?.()} />}

      {/* a settled row's details: add what the file did not give, or change an answer */}
      {live && open && (
        <DetailsPanel foot={ROW_WORDS.agentFoot} onDone={onToggleOpen}>
          {agent.agencyWaived && noAgency && (
            <Said onChange={() => onPatch({ agencyWaived: false })}>You chose to use {who}'s name as the primary field. Their agency can be added any time.</Said>
          )}
          {resolvedMapping && (
            <Said onChange={() => onReopenReason("mapping")}>You confirmed {who}'s details look right.</Said>
          )}
          <AgentDetails agent={agent} onPatch={onPatch} />
        </DetailsPanel>
      )}
    </div>
  );
};

/**
 * The agent's details, all optional. NOTHING HERE IS PRE-ANSWERED: the door is neither Open nor
 * Closed and the reply time is "Not set" unless the file or the writer said — the review hands the
 * import nothing the file or the writer did not give (import truth). The reply-time slider and the
 * Agent fit stars are retired from the review: a slider has to show a value, and showing 6 weeks on
 * a file with no reply times implied a fact nobody gave; writers rate agents on the Contact list.
 */
const AgentDetails: React.FC<{ agent: ReviewAgent; onPatch: (p: Partial<ReviewAgent>) => void }> = ({ agent, onPatch }) => {
  /* Fixed when the panel opens, so the field does not vanish as the first letter is typed. */
  const [asksName] = useState(() => !agent.name.trim());
  const [addingGenre, setAddingGenre] = useState(false);
  const door = agent.submissionsOpen == null ? null : agent.submissionsOpen ? "open" : "closed";
  const pickDoor = (v: "open" | "closed") => onPatch({ submissionsOpen: door === v ? null : v === "open" });
  const w = agent.weeks;
  return (
    <div className="im-detgrid">
      {asksName && (
        <Field label="Agent name">
          <input className="sf-in" value={agent.name} placeholder={ROW_WORDS.namePlaceholder}
            onChange={(e) => onPatch({ name: e.target.value, agencyOnly: !e.target.value.trim() && !!agent.agency.trim() })} data-im="det-name" />
        </Field>
      )}
      <Field label="Website">
        <input className="sf-in" type="url" value={agent.website} placeholder="agency.com/their-page" onChange={(e) => onPatch({ website: e.target.value })} data-im="det-website" />
      </Field>
      <div className="sf-field" data-im="det-genres">
        <span className="sf-lab">Genres they're looking for</span>
        {addingGenre ? (
          <GenreCombobox options={PREDEFINED_GENRES as unknown as string[]} value={agent.genres} onChange={(g) => onPatch({ genres: g })} placeholder="Type or pick…" />
        ) : (
          <div className="im-pills">
            {agent.genres.map((g) => <span key={g} className="im-pill">{g}</span>)}
            <button type="button" className="im-addgenre" onClick={() => setAddingGenre(true)} data-im="det-addgenre">{ROW_WORDS.addGenre}</button>
          </div>
        )}
      </div>
      <div className="sf-field" data-im="det-door">
        <span className="sf-lab">Taking queries?</span>
        <div role="group" aria-label="Taking queries?" className="im-seg">
          <button type="button" aria-pressed={door === "open"} className={door === "open" ? "is-on" : ""} onClick={() => pickDoor("open")} data-im="det-open">Open</button>
          <button type="button" aria-pressed={door === "closed"} className={door === "closed" ? "is-on" : ""} onClick={() => pickDoor("closed")} data-im="det-closed">Closed</button>
        </div>
        <span className="im-detnote" data-im="det-doornote">{door ? ROW_WORDS.doorFromYou : ROW_WORDS.doorUnknown}</span>
      </div>
      <div className="sf-field" data-im="det-weeks">
        <span className="sf-lab">Typically replies in</span>
        {w == null ? (
          <div className="im-weeks">
            <span className="im-weeksunset" data-im="det-weeks-unset">{ROW_WORDS.weeksUnset}</span>
            <button type="button" className="im-ghost" onClick={() => onPatch({ weeks: WEEKS_START })} data-im="det-weeks-set">{ROW_WORDS.setWeeks}</button>
          </div>
        ) : (
          <div className="im-weeks">
            <button type="button" className="im-step" aria-label="One week less" disabled={w <= WEEKS_MIN} onClick={() => onPatch({ weeks: Math.max(WEEKS_MIN, w - 1) })} data-im="det-weeks-down">−</button>
            <span className="im-weeksval" data-im="det-weeks-val">{weeksText(w)}</span>
            <button type="button" className="im-step" aria-label="One week more" disabled={w >= WEEKS_MAX} onClick={() => onPatch({ weeks: Math.min(WEEKS_MAX, w + 1) })} data-im="det-weeks-up">+</button>
            <button type="button" className="im-detclear" onClick={() => onPatch({ weeks: null })} data-im="det-weeks-clear">{ROW_WORDS.clear}</button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── A query's typed reason: the build's question and the right input ────────────────────────────
export interface QueryReasonPanelProps {
  query: ReviewQuery;
  code: ReviewReasonCode;
  onPatch: (p: Partial<ReviewQuery>) => void;
  onResolveReason: (code: ReviewReasonCode, patch?: Partial<ReviewQuery>) => void;
  onSwapDates: () => void;
}
export const QueryReasonPanel: React.FC<QueryReasonPanelProps> = ({ query, code, onPatch, onResolveReason, onSwapDates }) => {
  // Per-reason local date drafts (so typing doesn't commit until "Save"), and the wording dropdown.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [serialEditing, setSerialEditing] = useState(false);
  const [wording, setWording] = useState<QueryStatus>(query.status);
  const setDraft = (k: string, v: string) => setDrafts((d) => ({ ...d, [k]: v }));

  const dateInput = (k: string, label: string, prefill: string | null) => (
    <Field label={label}>
      <input className="sf-in" type="date" aria-label={label} value={drafts[k] ?? dayOf(prefill)} onChange={(e) => setDraft(k, e.target.value)} />
    </Field>
  );
  const solid = (label: string, onClick: () => void) => <button type="button" className="sf-btn sf-btn--sm" onClick={onClick}>{label}</button>;
  const quiet = (label: string, onClick: () => void) => <button type="button" className="sf-link sf-link--quiet" onClick={onClick}>{label}</button>;
  const question = <p className="im-fixq">{queryReasonText(code, query)}</p>;

  switch (code) {
    case "two-dates": {
      const ev = query.timeline[0];
      return (
        <div className="im-reason" data-reason={code}>
          {question}
          <div className="im-pair">
            <div className="im-pairrow">
              <span className="im-pairlab">Query sent<small>you → agent</small></span>
              <input className="sf-in" type="date" aria-label="Query sent date" value={dayOf(query.sentDate)} onChange={(e) => onPatch({ sentDate: e.target.value || null })} />
            </div>
            {ev && (
              <div className="im-pairrow">
                <span className="im-pairlab">{ev.type}<small>agent → you</small></span>
                <input className="sf-in" type="date" aria-label="Event date" value={dayOf(ev.date)}
                  onChange={(e) => onPatch({ timeline: query.timeline.map((t, i) => (i === 0 ? { ...t, date: e.target.value || null } : t)) })} />
              </div>
            )}
          </div>
          <div className="im-fixrow">
            {solid("Yes, that's right", () => onResolveReason("two-dates"))}
            {ev && quiet("Swap the dates", onSwapDates)}
            {quiet("It's just one date", () => onResolveReason("two-dates", { timeline: [] }))}
          </div>
        </div>
      );
    }
    case "missing-day":
      return (
        <div className="im-reason" data-reason={code}>
          {question}
          <div className="im-fixrow">
            {dateInput(code, "Pin to a date", null)}
            {solid("Save date", () => { const v = drafts[code]; if (v) onResolveReason("missing-day", { sentDate: v }); })}
            {quiet("Keep as month", () => onResolveReason("missing-day"))}
          </div>
        </div>
      );
    case "serial-outlier":
      return (
        <div className="im-reason" data-reason={code}>
          {question}
          <div className="im-fixrow">
            {serialEditing
              ? <>{dateInput(code, "Set a different date", query.sentDate)}{solid("Save date", () => { const v = drafts[code] ?? query.sentDate; if (v) onResolveReason("serial-outlier", { sentDate: v }); })}</>
              : <>{solid("That's right", () => onResolveReason("serial-outlier"))}{quiet("Set a different date", () => setSerialEditing(true))}</>}
            {quiet("Leave undated", () => onResolveReason("serial-outlier", { sentDate: null }))}
          </div>
        </div>
      );
    case "no-date":
      return (
        <div className="im-reason" data-reason={code}>
          {question}
          <div className="im-fixrow">
            {dateInput(code, "Date sent", null)}
            {solid("Save date", () => { const v = drafts[code]; if (v) onResolveReason("no-date", { sentDate: v }); })}
            {quiet("Leave undated", () => onResolveReason("no-date"))}
          </div>
        </div>
      );
    case "unreadable-date":
      return (
        <div className="im-reason" data-reason={code}>
          {question}
          <div className="im-fixrow">
            {dateInput(code, "Date sent", null)}
            {solid("Save date", () => { const v = drafts[code]; if (v) onResolveReason(code, { sentDate: v }); })}
            {quiet("Leave undated", () => onResolveReason(code))}
          </div>
        </div>
      );
    case "ambiguous-date":
      return (
        <div className="im-reason" data-reason={code}>
          {question}
          <div className="im-fixrow">
            {ambiguousReadings(query.sentDateRaw ?? "").map((iso) => (
              <React.Fragment key={iso}>{solid(fmtDate(iso), () => onResolveReason(code, { sentDate: iso }))}</React.Fragment>
            ))}
            {quiet("Leave undated", () => onResolveReason(code))}
          </div>
        </div>
      );
    case "unreadable-response-date":
    case "ambiguous-response-date": {
      const ev = query.timeline[0];
      const setEvent = (iso: string) => onResolveReason(code, { timeline: query.timeline.map((t, i) => (i === 0 ? { ...t, date: iso } : t)) });
      return (
        <div className="im-reason" data-reason={code}>
          {question}
          <div className="im-fixrow">
            {code === "ambiguous-response-date"
              ? ambiguousReadings(ev?.raw ?? "").map((iso) => <React.Fragment key={iso}>{solid(fmtDate(iso), () => setEvent(iso))}</React.Fragment>)
              : <>{dateInput(code, "Date of last response", null)}{solid("Save date", () => { const v = drafts[code]; if (v) setEvent(v); })}</>}
            {quiet("Leave undated", () => onResolveReason(code))}
          </div>
        </div>
      );
    }
    case "status-direction":
      return (
        <div className="im-reason" data-reason={code}>
          {question}
          <div className="im-choices">
            {statusDirectionChoices(query.status).map((c) => (
              <button type="button" key={c.status} className="im-choice" onClick={() => onResolveReason("status-direction", { status: c.status })}>
                <b>{c.label}</b>
                <small>→ {c.status}</small>
              </button>
            ))}
          </div>
        </div>
      );
    case "status-wording":
      return (
        <div className="im-reason" data-reason={code}>
          {question}
          <div className="im-fixrow">
            <Field label="Status">
              <select className="sf-in" value={wording} onChange={(e) => setWording(e.target.value as QueryStatus)} aria-label="Query status">
                {QUERY_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            {solid("That's right", () => onResolveReason("status-wording", { status: wording }))}
          </div>
        </div>
      );
    // check-name / needs-identifying are agent-identity concerns, stripped from query reasons in
    // parseModel — they never reach here. Render nothing if they ever do.
    default:
      return null;
  }
};

// ── Queries ─────────────────────────────────────────────────────────────────────────────────────
export interface QueryRowProps {
  query: ReviewQuery;
  agentName: string;
  /** Agency (or "Agency only") for the row meta. */
  origin: string;
  open: boolean;
  onToggleOpen: () => void;
  onPatch: (p: Partial<ReviewQuery>) => void;
  onDelete: () => void;
  /** Re-open this row's settled reasons: it goes back to the deck. */
  onReopen: () => void;
  /** The writer chose "Don't import" (or this query's agent is not being imported). */
  out?: boolean;
  onUndo?: () => void;
  added?: boolean;
}

export const QueryRow: React.FC<QueryRowProps> = ({ query, agentName, origin, open, onToggleOpen, onPatch, onDelete, onReopen, out, onUndo, added }) => {
  const dateStr = currentDate(query);
  const settledReasons = query.reasons.length > 0;

  return (
    <div className={`im-rw${out ? " is-out" : ""}`} data-row-id={query.id} data-row="query" data-asks="0" data-out={out ? "1" : "0"}>
      <Disc initials={initialsOf(agentName)} tone={out ? "none" : "live"} />
      <div className="im-rwtext">
        <b className="im-rwname">{agentName}</b>
        {/* the build's own line: where it came from, its status, its date */}
        <small className="im-rwsub">{origin} · {STAGE_NAME[query.status]} · {dateStr ? fmtDate(dateStr) : "Undated"}</small>
      </div>
      {out
        ? <OutEnd onUndo={() => onUndo?.()} />
        : <LiveEnd open={open} added={!!added} onToggleOpen={onToggleOpen} onDelete={onDelete}
            lead={<span className="im-stat" data-im="row-status"><StatusDot status={query.status} overrideSize={18} />{STAGE_NAME[query.status]}</span>} />}

      {!out && open && (
        <DetailsPanel foot="Add what you remember and your timeline stays accurate." onDone={onToggleOpen}>
          {settledReasons && (
            <Said onChange={onReopen}>You've sorted this query — {query.status.toLowerCase()}{query.sentDate ? `, sent ${fmtDate(query.sentDate)}` : ""}.</Said>
          )}
          <div className="im-editrow">
            <Field label="Status">
              <select className="sf-in" value={query.status} onChange={(e) => onPatch({ status: e.target.value as QueryStatus })}>
                {QUERY_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Date sent">
              <input className="sf-in" type="date" value={dayOf(query.sentDate)} onChange={(e) => onPatch({ sentDate: e.target.value || null })} />
            </Field>
          </div>
        </DetailsPanel>
      )}
    </div>
  );
};

// ── Duplicates: an agent set ────────────────────────────────────────────────────────────────────
const quer = (n: number) => `${n} quer${n === 1 ? "y" : "ies"}`;
const labelOf = (a: ReviewAgent) => `${a.name || "—"}${a.agency.trim() ? ` — ${a.agency}` : ""}`;

/** The bar a removed duplicate becomes (it does not vanish): the moved record, struck, merged into
 *  the keeper, with a count-aware "moved across". */
export const MergedBar: React.FC<{ removedName: string; keptName: string; n: number }> = ({ removedName, keptName, n }) => (
  <div className="im-mergedbar" data-im="merged-bar">
    <span><s>{removedName}</s> merged into <b>{keptName}</b> — its quer{n === 1 ? "y" : "ies"} moved across</span>
  </div>
);

/** An open set: each member is a row that can be removed as the duplicate, then "keep them". */
export const DupeOpen: React.FC<{
  leader: ReviewAgent;
  members: ReviewAgent[];
  bars: ReviewAgent[];
  queryCount: (id: string) => number;
  movedCount: (id: string) => number;
  onRemove: (id: string) => void;
  onKeepBoth: () => void;
}> = ({ leader, members, bars, queryCount, movedCount, onRemove, onKeepBoth }) => (
  <div className="im-dupe" data-dup-set={leader.id} data-dup-state="open" data-dup-kind="agents">
    <h3 className="im-dupeh">{leader.name || leader.agency || "This agent"}</h3>
    <p>{dupNoteOpen(leader.agency)}</p>
    <div className="im-picks">
      {members.map((m) => (
        <div className={`im-pick${bars.length && m.id === leader.id ? " is-kept" : ""}`} key={m.id} data-member={m.id}>
          <Disc initials={m.name ? initialsOf(m.name) : "–"} />
          <span>
            <span className="im-pickname">{labelOf(m)}</span>
            <span className="im-when">{quer(queryCount(m.id))}</span>
          </span>
          <span className="im-pickend">
            {bars.length > 0 && m.id === leader.id && <Chip className="im-chip--navy">kept as the main record</Chip>}
            <button type="button" className="sf-btn sf-btn--sm sf-btn--line" onClick={() => onRemove(m.id)}>Remove this one</button>
          </span>
        </div>
      ))}
    </div>
    {bars.map((m) => <MergedBar key={m.id} removedName={m.name || m.agency || "—"} keptName={leader.name || leader.agency || "the kept record"} n={movedCount(m.id)} />)}
    <p>Remove whichever is the duplicate and its queries move onto the agent you keep — nothing is lost.</p>
    <div className="im-dupeact">
      <button type="button" className="sf-link sf-link--quiet" onClick={onKeepBoth}>{keepBothLabel(members.length)}</button>
    </div>
  </div>
);

/** A set kept apart: the decision, the members, and the build's Undo. */
export const DupeKept: React.FC<{ leaderId: string; agency: string; members: ReviewAgent[]; onUndo: () => void }> = ({ leaderId, agency, members, onUndo }) => (
  <div className="im-dupe" data-dup-set={leaderId} data-dup-state="kept" data-dup-kind="agents">
    <h3 className="im-dupeh">{keptClusterLabel(members.length)}</h3>
    <p>{dupNoteKept(agency, members.length)}</p>
    <div className="im-picks">
      {members.map((m) => (
        <div className={`im-pick${m.deleted ? " is-gone" : ""}`} key={m.id}>
          <Disc initials={m.name ? initialsOf(m.name) : "–"} />
          <span className="im-pickname">{labelOf(m)}</span>
          <span />
        </div>
      ))}
    </div>
    <div className="im-dupeact"><button type="button" className="sf-link sf-link--quiet" onClick={onUndo} data-im="dupe-undo">Undo</button></div>
  </div>
);

/** A set merged down to one keeper: the keeper, the bars for each record it absorbed, and Undo. */
export const DupeMerged: React.FC<{ keeper: ReviewAgent; bars: ReviewAgent[]; queries: number; movedCount: (id: string) => number; onUndo: () => void }> = ({ keeper, bars, queries, movedCount, onUndo }) => (
  <div className="im-dupe" data-dup-set={keeper.id} data-dup-state="merged" data-dup-kind="agents">
    <h3 className="im-dupeh">Duplicate sorted</h3>
    <p>{dupNoteMerged}</p>
    <div className="im-picks">
      <div className="im-pick is-kept">
        <Disc initials={keeper.name ? initialsOf(keeper.name) : "–"} />
        <span>
          <span className="im-pickname">{labelOf(keeper)}</span>
          <span className="im-when">{quer(queries)}</span>
        </span>
        <span className="im-pickend"><Chip className="im-chip--navy">kept as the main record</Chip></span>
      </div>
    </div>
    {bars.map((m) => <MergedBar key={m.id} removedName={m.name || m.agency || "—"} keptName={keeper.name || keeper.agency || "the kept record"} n={movedCount(m.id)} />)}
    <div className="im-dupeact"><button type="button" className="sf-link sf-link--quiet" onClick={onUndo} data-im="dupe-undo">Undo</button></div>
  </div>
);
