/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The import review's rows (onboarding v5, part 2; ref design-refs/onboarding/
 * onboarding-journey-v5.html #agents #queries #dupes).
 *
 * A row at rest is a disc, a name and a mono second line, then at the right its status (queries),
 * a chip, a quiet action and a remove control. A row with something open takes a tinted ground and
 * a rust edge, its chip is the reason's own label, and **the question and its controls sit in the
 * row**, under the name. Answering settles the row in place.
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
import React, { useRef, useState } from "react";
import "./importFlow.css";
import { ReviewReasonCode } from "../../types/smartImport";
import { QueryStatus } from "../../types";
import { SegmentedToggle, WeekSlider, GenreCombobox, FitStars } from "../forms";
import { PREDEFINED_GENRES } from "../../lib/manuscripts";
import { StatusDot } from "../StatusDot";
import {
  ReviewAgent, ReviewQuery, CheckReason,
  agentStatus, queryStatusOf, fmtDate, QUERY_STATUS_OPTIONS,
  currentDate, quoteStatuses, queryReasonText, statusDirectionChoices, focusReasonMeta,
  dupNoteMerged, dupNoteOpen, dupNoteKept, keepBothLabel, keptClusterLabel,
} from "../../lib/smartImportReviewModel";
import { Chip, Disc, initialsOf } from "./ImportParts";
import { ambiguousReadings } from "../../lib/templateImport";

const READY = "Ready";

/** A small labelled field in part 1's dress. */
const Field: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className }) => (
  <label className={`sf-field${className ? " " + className : ""}`}>
    <span className="sf-lab">{label}</span>
    {children}
  </label>
);

const RemoveButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button type="button" className="im-x" title="Don't import" aria-label="Remove" onClick={onClick} data-im="row-remove">✕</button>
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
  dupOpen: boolean;
  /** The other members of an unresolved duplicate set this agent leads, carried through from the
   *  duplicates step. */
  clusterPeers?: ReviewAgent[];
  /** This agent absorbed a duplicate on the duplicates step. */
  merged?: boolean;
  open: boolean;
  onToggleOpen: () => void;
  onPatch: (p: Partial<ReviewAgent>) => void;
  onDelete: () => void;
  onResolveReason: (kind: CheckReason) => void;
  onReopenReason: (kind: CheckReason) => void;
  onMerge?: () => void;
  onKeepBoth?: () => void;
}

export const AgentRow: React.FC<AgentRowProps> = ({
  agent, dupOpen, clusterPeers, merged, open, onToggleOpen, onPatch, onDelete, onResolveReason, onReopenReason, onMerge, onKeepBoth,
}) => {
  const [agencyInput, setAgencyInput] = useState("");
  const agencyRef = useRef<HTMLInputElement>(null);
  const noAgency = !agent.agency.trim();
  const status = agentStatus(agent, dupOpen);
  const asks = status !== "captured";
  const disp = agent.name || agent.agency;
  /* the build's own second line: the agency, or that the name is not recorded */
  const subline = agent.name && agent.agency ? agent.agency : !agent.name && agent.agency ? "Agent name not recorded" : null;
  const openDup = dupOpen && (clusterPeers?.length ?? 0) > 0;
  const openMapping = !noAgency && !openDup ? agent.reasons.find((r) => r.kind === "mapping" && !r.resolved) : null;
  const askingAgency = asks && noAgency;
  const chip = !asks ? READY
    : askingAgency ? focusReasonMeta("agent-needs-agency").pill
    : openMapping ? focusReasonMeta("agent-mapping").pill
    : "Needs a look"; /* a duplicate set carried through: the build's own label */
  const who = disp || "This agent";
  const saveAgency = () => { const v = agencyInput.trim(); if (v) { onPatch({ agency: v }); setAgencyInput(""); } else { agencyRef.current?.focus(); } };
  const resolvedMapping = agent.reasons.some((r) => r.kind === "mapping" && r.resolved);

  return (
    <div className={`im-rw${asks ? " is-open" : ""}`} data-row-id={agent.id} data-row="agent" data-asks={asks ? "1" : "0"}>
      <Disc initials={agent.name ? initialsOf(agent.name) : (agent.agency.match(/\b\w/g)?.slice(0, 2).join("").toUpperCase() ?? "–")} tone={agent.name ? "live" : "agency"} />
      <div>
        {disp ? <b className="im-rwname">{disp}</b> : <b className="im-rwname im-rwname--blank">Name this agent</b>}
        {(subline || merged) && (
          <small className="im-rwsub">{[subline, merged ? dupNoteMerged : null].filter(Boolean).join(" · ")}</small>
        )}
      </div>
      <div className="im-rwend">
        <Chip hot={asks} data-im="row-chip">{chip}</Chip>
        {!asks && (
          <button type="button" className="sf-link sf-link--quiet" onClick={onToggleOpen} aria-expanded={open} data-im="row-action">{open ? "Close" : "Add details"}</button>
        )}
        <RemoveButton onClick={onDelete} />
      </div>

      {/* the question, in the row */}
      {asks && (
        <div className="im-fix" data-im="row-fix">
          {askingAgency && (
            <div className="im-reason" data-reason="agent-needs-agency">
              <p className="im-fixq">No agency yet — add it to sharpen this record, or carry on without one. Nothing's lost.</p>
              <div className="im-fixrow">
                <Field label="Agency name">
                  <input ref={agencyRef} className="sf-in" type="text" value={agencyInput} placeholder="Agency name" aria-label="Agency name"
                    onChange={(e) => setAgencyInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveAgency(); }} />
                </Field>
                <button type="button" className="sf-btn sf-btn--sm" onClick={saveAgency}>Save agency</button>
                {agent.name.trim() && (
                  <button type="button" className="sf-link sf-link--quiet" title="Import now with no agency — add it later from the agent's profile"
                    onClick={() => onPatch({ agencyWaived: true })}>Carry on without an agency</button>
                )}
                <button type="button" className="sf-link sf-link--quiet" onClick={() => onPatch({ agencyOnly: true, name: "" })}>Reference by agency only</button>
              </div>
            </div>
          )}
          {openDup && clusterPeers && (
            <div className="im-reason" data-reason="agent-duplicate">
              <p className="im-fixq">Suspected duplicate of <b>{clusterPeers.map((p) => p.name || p.agency).join(", ")}</b>. Same agent, or two different people?</p>
              <div className="im-fixrow">
                <button type="button" className="sf-btn sf-btn--sm" onClick={onMerge}>Merge them</button>
                <button type="button" className="sf-link sf-link--quiet" onClick={onKeepBoth}>Keep both</button>
              </div>
            </div>
          )}
          {openMapping && (
            <div className="im-reason" data-reason="agent-mapping">
              <p className="im-fixq">{quoteStatuses(openMapping.note)}</p>
              <div className="im-fixrow">
                <button type="button" className="sf-btn sf-btn--sm" onClick={() => onResolveReason("mapping")}>Mark as checked</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* a settled row's editor: add detail, or change an answer */}
      {open && !asks && (
        <div className="im-edit" data-im="row-edit">
          {agent.agencyWaived && noAgency && (
            <Said onChange={() => onPatch({ agencyWaived: false })}>You chose to use {who}'s name as the primary field. Their agency can be added any time.</Said>
          )}
          {resolvedMapping && (
            <Said onChange={() => onReopenReason("mapping")}>You confirmed {who}'s details look right.</Said>
          )}
          <div className="im-editrow">
            <Field label="Agent name">
              <span className="sf-inwrap">
                <input className="sf-in" value={agent.agencyOnly ? "" : agent.name} disabled={agent.agencyOnly}
                  placeholder={agent.agencyOnly ? "Referenced by agency only" : "e.g. Eleanor Vance"}
                  onChange={(e) => onPatch({ name: e.target.value })} />
              </span>
            </Field>
            <Field label="Agency">
              <input className="sf-in" value={agent.agency} placeholder="Agency" onChange={(e) => onPatch({ agency: e.target.value })} />
            </Field>
          </div>
          <div>
            <button type="button" className="sf-link sf-link--quiet" title="Don't know the name? Use agency only" aria-pressed={agent.agencyOnly}
              onClick={() => onPatch({ agencyOnly: !agent.agencyOnly, ...(!agent.agencyOnly ? { name: "" } : {}) })}>
              {agent.agencyOnly ? "Referenced by agency only" : "Reference by agency only"}
            </button>
          </div>
          <div className="sf-field">
            <span className="sf-lab">Genres they're looking for</span>
            <GenreCombobox options={PREDEFINED_GENRES as unknown as string[]} value={agent.genres} onChange={(g) => onPatch({ genres: g })} placeholder="Type or pick…" />
          </div>
          <Field label="Website">
            <input className="sf-in" value={agent.website} placeholder="agency.com/their-page" onChange={(e) => onPatch({ website: e.target.value })} />
          </Field>
          <div className="im-editrow">
            <div className="sf-field">
              <span className="sf-lab">Submissions</span>
              <SegmentedToggle<"open" | "closed"> value={agent.submissionsOpen ? "open" : "closed"}
                options={[{ value: "open", label: "Open" }, { value: "closed", label: "Closed" }]}
                onChange={(v) => onPatch({ submissionsOpen: v === "open" })} ariaLabel="Submissions status" />
            </div>
            <div className="sf-field">
              <span className="sf-lab">Typically replies in</span>
              <WeekSlider value={agent.weeks} onChange={(w) => onPatch({ weeks: w })} min={1} max={26} />
            </div>
          </div>
          <div className="sf-field">
            <span className="sf-lab">Agent fit</span>
            <p className="im-editnote">Log how good a match this agent would be for you.</p>
            <FitStars value={agent.rating} onChange={(r) => onPatch({ rating: r })} size={17} />
          </div>
        </div>
      )}
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
      <input className="sf-in" type="date" aria-label={label} value={drafts[k] ?? prefill ?? ""} onChange={(e) => setDraft(k, e.target.value)} />
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
              <input className="sf-in" type="date" aria-label="Query sent date" value={query.sentDate ?? ""} onChange={(e) => onPatch({ sentDate: e.target.value || null })} />
            </div>
            {ev && (
              <div className="im-pairrow">
                <span className="im-pairlab">{ev.type}<small>agent → you</small></span>
                <input className="sf-in" type="date" aria-label="Event date" value={ev.date ?? ""}
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
  onResolveReason: (code: ReviewReasonCode, patch?: Partial<ReviewQuery>) => void;
  onSwapDates: () => void;
  /** Re-open this row's settled reasons (the walk's "Change this"). */
  onReopen: () => void;
}

export const QueryRow: React.FC<QueryRowProps> = ({
  query, agentName, origin, open, onToggleOpen, onPatch, onDelete, onResolveReason, onSwapDates, onReopen,
}) => {
  const openReasons = query.reasons.filter((r) => !r.resolved);
  const asks = queryStatusOf(query) === "needs-check";
  const dateStr = currentDate(query);
  const settledReasons = query.reasons.length > 0 && openReasons.length === 0;

  return (
    <div className={`im-rw${asks ? " is-open" : ""}`} data-row-id={query.id} data-row="query" data-asks={asks ? "1" : "0"}>
      <Disc initials={initialsOf(agentName)} />
      <div>
        <b className="im-rwname">{agentName}</b>
        {/* the build's own line: where it came from, its status, its date */}
        <small className="im-rwsub">{origin} · {query.status} · {dateStr ? fmtDate(dateStr) : "Undated"}</small>
      </div>
      <div className="im-rwend">
        <span className="im-stat" data-im="row-status"><StatusDot status={query.status} overrideSize={18} />{query.status}</span>
        <Chip hot={asks} data-im="row-chip">{asks ? focusReasonMeta(openReasons[0].code).pill : READY}</Chip>
        {!asks && (
          <button type="button" className="sf-link sf-link--quiet" onClick={onToggleOpen} aria-expanded={open} data-im="row-action">{open ? "Close" : "Add details"}</button>
        )}
        <RemoveButton onClick={onDelete} />
      </div>

      {/* one panel per open reason, one under another, each with its own controls and its own resolve */}
      {asks && (
        <div className="im-fix" data-im="row-fix">
          {openReasons.map((r) => (
            <QueryReasonPanel key={r.code} query={query} code={r.code} onPatch={onPatch} onResolveReason={onResolveReason} onSwapDates={onSwapDates} />
          ))}
        </div>
      )}

      {open && !asks && (
        <div className="im-edit" data-im="row-edit">
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
              <input className="sf-in" type="date" value={query.sentDate ?? ""} onChange={(e) => onPatch({ sentDate: e.target.value || null })} />
            </Field>
          </div>
          <p className="im-editnote">Dates are optional — add what you remember and your timeline stays accurate.</p>
        </div>
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
