/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ContactProfile — the agent pop-up (v11 §7): the landing card's construction, centred over the
 * dimmed page. View reads; Edit is the §8.2 form with its Also-changes notes; Save goes through
 * the caller (commitAgentEdits + the deadline fan-out) and the card returns to view with the
 * sage line.
 *
 * ⚠️ IT PORTALS TO `document.body` — outside every page class — which is why the whole `--clv-*`
 * palette lives at `:root` (the portal law). The overlay lives OUTSIDE the list (§7.1): a list
 * re-render never touches it, and §11.6 proves that by changing the sort while it is open.
 *
 * ⚠️ THE ESCAPE ORDER IS A CASCADE FROM ONE HANDLER (§7.1): editing → back to view (a dirty
 * draft included — the mock offers no discard prompt and the brief none either); view → closed.
 * The backdrop closes the VIEW only; while editing it does nothing.
 *
 * ⚠️ THE VERBS LAND ON THE QUERY'S OWN ASKING SURFACE. "Send a nudge" / "Send the partial" /
 * "Answer the offer" and "Open query" all open the Query Centre at that query — the one-
 * finishing-surface law (the pane reads, the modal finishes): a second commit surface on this
 * page is the fault the task-modal round closed. "Record a response" opens the existing capture.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Agent, QueryStatus } from "../../../types";
import { StatusDot } from "../../StatusDot";
import { agentInitials, agentPrimary } from "../../../lib/agentDisplay";
import { STAGE_NAME } from "../../../lib/qcSummary";
import type { QcRow } from "../../../lib/qcSummary";
import { AgentFacts, rowDateLine } from "../../../lib/contactList";
import {
  AlsoNote, ContactDraft, alsoChanges, alsoSummary, draftFromAgentRecord, EditCtx,
} from "../../../lib/contactEdit";
import { hrefFor } from "../../../lib/quickAdd";
import { parseAgentMaterials, MAT_QTY } from "../../../lib/agentMaterials";
import { AgentNote } from "../../../lib/agentNotes";
import { ContactAgentForm, FormSection } from "./ContactAgentForm";

const dmy = (ms: number) => new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const monthYear = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric" });

export interface ContactProfileProps {
  agent: Agent;
  facts: AgentFacts;
  nowMs: number;
  msGenre: string | null;
  msTitle: string | null;
  genreHit: (g: string) => boolean;
  genrePool: string[];
  editCtx: EditCtx;
  /** the committed notes for THIS agent (the page's one-open-agent listener) */
  notes: AgentNote[];
  /** open straight into edit at a section (a slip's or Housekeeping's door) */
  editAt?: FormSection | null;
  savedLine: string | null;
  onClose: () => void;
  onSave: (draft: ContactDraft, notes: AlsoNote[]) => Promise<boolean>;
  onAddNote: (text: string) => Promise<void>;
  onOpenQuery: (queryId: string) => void;
  onRecordResponse: () => void;
  onLogQuery: () => void;
}

const Torn: React.FC<{ label: string; action: string; onAct: () => void; clv: string }> = ({ label, action, onAct, clv }) => (
  <span className="clv-torn" data-clv={clv}>
    <em>{label}</em>
    <button type="button" className="clv-mini" onClick={onAct}>{action}</button>
  </span>
);

/** the primary verb for the standing query — named by what the writer would do next */
const verbFor = (q: QcRow): string | null => {
  if (q.court === "offer") return "Answer the offer";
  if (q.court === "you") {
    if (q.status === QueryStatus.PARTIAL_REQUESTED) return "Send the partial";
    if (q.status === QueryStatus.FULL_REQUESTED) return "Send the full";
    if (q.status === QueryStatus.REVISE_RESUBMIT) return "Send the new version";
    return null;
  }
  if (q.court === "agent" && q.pastExpected) return "Send a nudge";
  return null;
};

export const ContactProfile: React.FC<ContactProfileProps> = ({
  agent, facts, nowMs, msGenre, msTitle, genreHit, genrePool, editCtx, notes,
  editAt = null, savedLine, onClose, onSave, onAddNote, onOpenQuery, onRecordResponse, onLogQuery,
}) => {
  const [editing, setEditing] = useState<boolean>(editAt != null);
  const [focusSection, setFocusSection] = useState<FormSection | null>(editAt ?? null);
  const [draft, setDraft] = useState<ContactDraft>(() => draftFromAgentRecord(agent));
  const [saving, setSaving] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [composing, setComposing] = useState(false);

  /* a different agent, or a fresh open-at-section, resets the session */
  useEffect(() => {
    setDraft(draftFromAgentRecord(agent));
    setEditing(editAt != null);
    setFocusSection(editAt ?? null);
    setComposing(false);
    setNoteText("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent.id, editAt]);

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(draftFromAgentRecord(agent)),
    [draft, agent],
  );
  const liveNotes = useMemo(
    () => (dirty || editing ? alsoChanges(agent, draft, editCtx) : []),
    [agent, draft, editCtx, dirty, editing],
  );

  /* ⚠️ ONE Escape handler, the cascade in one place (§7.1) */
  const editingRef = useRef(editing);
  editingRef.current = editing;
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      if (editingRef.current) { setEditing(false); setFocusSection(null); setDraft(draftFromAgentRecord(agent)); }
      else onClose();
    };
    document.addEventListener("keydown", key, true);
    return () => document.removeEventListener("keydown", key, true);
  }, [agent, onClose]);

  const save = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    const ok = await onSave(draft, liveNotes);
    setSaving(false);
    if (ok) { setEditing(false); setFocusSection(null); }
  }, [draft, liveNotes, onSave, saving]);

  const band = facts.standing.kind === "none" ? "slate" : facts.standing.kind === "open" ? "rose" : "taupe";
  const bandLabel = facts.door === "closed" && facts.standing.kind !== "open"
    ? "Closed to submissions"
    : facts.standing.kind === "none" ? "Not yet queried"
    : facts.standing.kind === "open" ? "Querying" : "Closed";

  const q = facts.q;
  const line = q ? rowDateLine(q, nowMs) : null;
  const verb = q && q.court !== "closed" ? verbFor(q) : null;
  const mats = parseAgentMaterials(Array.isArray(agent.materialsWanted) ? (agent.materialsWanted as string[]) : []);
  const genres = [...(agent.genres ?? [])].sort((a, b) => Number(genreHit(b)) - Number(genreHit(a)));

  const matChip = (m: string) => {
    const count = mats.counts[m];
    if (m === "Synopsis" && count) return `Synopsis ${count}pp`;
    if (MAT_QTY[m] && count) return `First ${count} ${MAT_QTY[m].unit}`;
    return m === "Sample pages" || m === "Sample chapters" || m === "Sample words" ? "Opening pages" : m;
  };

  return createPortal(
    <div
      className={`clv-ov${editing ? " clv-ov--edit" : ""}`}
      data-clv="profile-ov"
      onPointerDown={(e) => {
        /* the backdrop closes the VIEW; while editing it does nothing (§7.1) */
        if (e.target === e.currentTarget && !editingRef.current) onClose();
      }}
    >
      <article className={`clv-ac clv-pcard${editing ? " clv-pcard--edit" : ""}`} data-clv="profile" data-band={editing ? "slate" : band} role="dialog" aria-modal="true" aria-label={agentPrimary(agent)}>
        <div className="clv-frame">
          <div className={`clv-ac-band clv-pband clv-pband--${editing ? "slate" : band}`}>
            <span className="clv-bchip" data-clv="bandchip">{editing ? "Editing" : bandLabel}</span>
            <span className="clv-bstars" aria-label={agent.starRating ? `Your rating: ${agent.starRating} of 5` : "Not yet rated"}>
              {agent.starRating
                ? [1, 2, 3, 4, 5].map((n) => <i key={n} className={n <= (agent.starRating ?? 0) ? "clv-star--on" : undefined}>★</i>)
                : null}
            </span>
            {!editing && (
              <button type="button" className="clv-ib" data-clv="edit" aria-label="Edit" onClick={() => { setDraft(draftFromAgentRecord(agent)); setEditing(true); }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
              </button>
            )}
            <button
              type="button" className="clv-ib" data-clv="close"
              aria-label={editing ? "Stop editing" : "Close"}
              onClick={() => {
                if (editing) { setEditing(false); setFocusSection(null); setDraft(draftFromAgentRecord(agent)); }
                else onClose();
              }}
            >
              ✕
            </button>
          </div>

          {editing ? (
            <>
              <div className="clv-pscroll" data-clv="pbody">
                <ContactAgentForm
                  draft={draft}
                  onDraft={(p) => setDraft((d) => ({ ...d, ...p }))}
                  notes={liveNotes}
                  msGenre={msGenre}
                  genrePool={genrePool}
                  focusSection={focusSection}
                />
              </div>
              <div className="clv-ffoot2">
                <span className="clv-hint" data-clv="also-summary">{alsoSummary(liveNotes)}</span>
                <button type="button" className="clv-cx" onClick={() => { setEditing(false); setFocusSection(null); setDraft(draftFromAgentRecord(agent)); }}>Cancel</button>
                <button type="button" className="clv-done" data-clv="save" disabled={saving || !dirty} onClick={() => void save()}>
                  Save changes
                </button>
              </div>
            </>
          ) : (
            <div className="clv-pscroll" data-clv="pbody">
              {savedLine && <div className="clv-saved" data-clv="savedline" role="status">{savedLine}</div>}
              <div className="clv-acb clv-pbody">
                <div className="clv-who">
                  <span className="clv-ini clv-pini" aria-hidden="true">{agentInitials(agent)}</span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h3 className="clv-pname">{agentPrimary(agent)}</h3>
                    {agent.agency.trim() && agent.name.trim() ? <span className="clv-ragy">{agent.agency}</span> : null}
                    <span className="clv-rloc">
                      {[facts.loc ?? "Location ?", agent.responseTimeWeeks ? `Replies in about ${agent.responseTimeWeeks} weeks` : null]
                        .filter(Boolean).join(" · ")}
                    </span>
                    <span className="clv-plnk">
                      {agent.website.trim() && <a href={hrefFor(agent.website)} target="_blank" rel="noreferrer">Website</a>}
                      {agent.email.trim() && <a href={`mailto:${agent.email}`}>Email</a>}
                    </span>
                  </div>
                </div>

                <div className="clv-sec" data-psec="genres">
                  <h5>Genres sought</h5>
                  {genres.length ? (
                    <span className="clv-gch">
                      {genres.map((g) => <span key={g} className={genreHit(g) ? "clv-hit" : undefined}>{g}</span>)}
                    </span>
                  ) : (
                    <Torn clv="torn-genres" label="Genres not recorded" action="Add genres" onAct={() => { setEditing(true); setFocusSection("genres"); }} />
                  )}
                </div>

                <div className="clv-sec" data-psec="wishlist">
                  <h5>
                    Manuscript wishlist
                    {agent.mswlCheckedAt ? ` · checked ${monthYear(agent.mswlCheckedAt)}` : ""}
                  </h5>
                  {(agent.mswlNotes ?? "").trim() ? (
                    <p className="clv-wl">{agent.mswlNotes.trim()}</p>
                  ) : (
                    <Torn clv="torn-wishlist" label="No wishlist yet" action="Add wishlist" onAct={() => { setEditing(true); setFocusSection("wishlist"); }} />
                  )}
                </div>

                <div className="clv-sec" data-psec="materials">
                  <h5>Materials requested</h5>
                  {mats.selected.length ? (
                    <span className="clv-mch">
                      {mats.selected.filter((m) => m !== "Sample chapters" && m !== "Sample words").map((m) => (
                        <span key={m}>
                          <svg width="7" height="9" viewBox="0 0 8 10" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true"><path d="M1 .5h4L7.5 3v6.5h-6.5z" /></svg>
                          {matChip(m)}
                        </span>
                      ))}
                      {mats.selected.includes("Sample chapters") && (
                        <span>
                          <svg width="7" height="9" viewBox="0 0 8 10" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true"><path d="M1 .5h4L7.5 3v6.5h-6.5z" /></svg>
                          {matChip("Sample chapters")}
                        </span>
                      )}
                    </span>
                  ) : (
                    <Torn clv="torn-materials" label="Not recorded" action="Add materials" onAct={() => { setEditing(true); setFocusSection("materials"); }} />
                  )}
                </div>

                <div className="clv-sec" data-psec="query">
                  <h5>Your query{msTitle ? <> · <i className="clv-msname">{msTitle}</i></> : null}</h5>
                  {q ? (
                    <>
                      <ul className="clv-trail" data-clv="trail">
                        {q.history.spans.map((s) => (
                          <li key={`${s.status}-${s.startMs}`}>
                            <StatusDot status={s.status} overrideSize={13} />
                            <span>{STAGE_NAME[s.status as keyof typeof STAGE_NAME] ?? String(s.status)}</span>
                            <em>{dmy(s.startMs)}</em>
                          </li>
                        ))}
                        {!q.history.dated && (
                          <li className="clv-trail--undated">
                            <StatusDot status={q.status as QueryStatus} overrideSize={13} />
                            <span>{STAGE_NAME[q.status as keyof typeof STAGE_NAME]}</span>
                            <em>not dated</em>
                          </li>
                        )}
                        {line && q.court !== "closed" && (
                          <li className="clv-trail--next" data-clv="next">
                            <span className="clv-nextglyph" aria-hidden="true">◦</span>
                            <span>{line.text}</span>
                          </li>
                        )}
                      </ul>
                      <div className="clv-ract">
                        {verb && (
                          <button type="button" className="clv-done clv-done--sm" data-clv="verb" onClick={() => onOpenQuery(q.id)}>
                            {verb}
                          </button>
                        )}
                        <button type="button" className="clv-ghost" data-clv="openquery" onClick={() => onOpenQuery(q.id)}>
                          Open query
                        </button>
                        {q.court === "agent" && (
                          <button type="button" className="clv-ghost" data-clv="record" onClick={onRecordResponse}>
                            Record a response
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="clv-pnone">Not queried yet.</p>
                      <div className="clv-ract">
                        {facts.door === "open" && (
                          <button type="button" className="clv-done clv-done--sm" data-clv="logquery" onClick={onLogQuery}>
                            Log a query
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div className="clv-sec" data-psec="notes">
                  <h5>Your notes</h5>
                  {notes.length > 0 && (
                    <ul className="clv-pnotes">
                      {notes.map((n) => (
                        <li key={n.id}>
                          <p>{n.text}</p>
                          <em>{n.createdAt ? dmy(Date.parse(n.createdAt)) : ""}</em>
                        </li>
                      ))}
                    </ul>
                  )}
                  {composing ? (
                    <span className="clv-pcompose">
                      <textarea
                        className="clv-fta"
                        value={noteText}
                        autoFocus
                        aria-label="A note about this agent"
                        onChange={(e) => setNoteText(e.target.value)}
                      />
                      <span className="clv-ract">
                        <button
                          type="button" className="clv-done clv-done--sm"
                          disabled={!noteText.trim()}
                          onClick={() => { const t = noteText.trim(); setNoteText(""); setComposing(false); if (t) void onAddNote(t); }}
                        >
                          Save note
                        </button>
                        <button type="button" className="clv-ghost" onClick={() => { setComposing(false); setNoteText(""); }}>Cancel</button>
                      </span>
                    </span>
                  ) : notes.length === 0 ? (
                    <Torn clv="torn-notes" label="No notes yet" action="Add a note" onAct={() => setComposing(true)} />
                  ) : (
                    <button type="button" className="clv-mini" onClick={() => setComposing(true)}>Add a note</button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </article>
    </div>,
    document.body,
  );
};
