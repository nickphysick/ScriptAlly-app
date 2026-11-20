/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query card v158 §5 (design-refs/query-card-v158/query-card-v158.html, "Notes and their words") — the slide-out card's
 * Notes tab: one list in date order, oldest first, of the writer's notes (the journal, users/{uid}/journalEntries) and
 * the agent's recorded words (each response's `replyNote`, per event); a pinned note first; and the writing box fixed
 * at the bottom of the tab body.
 *
 * ⚠️ THE AGENT'S WORDS ARE READ-ONLY HERE: Send to Corkboard is their only action. The writer's notes add Pin to the top
 *    (or Unpin) and Make it a task. Both copy the text; the note stays.
 * ⚠️ A NOTE IS SAVED BY THE BUTTON OR Ctrl/Cmd + Enter ONLY — never on blur (v152's field saved on blur).
 * ⚠️ QUERYHAWK NEVER WRITES FOR THE WRITER: the field has a placeholder and nothing else; no suggested text.
 * ⚠️ COLOUR IS THE STAGE: an agent's words take the Band of the stage that response moved the query to, with its Edge
 *    (set as --bt / --be from lib/qcThread152 tintOf). Marks are ink.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { StatusDot } from "../../StatusDot";
import { QueryStatus } from "../../../types";
import { dayLabel, sideOf, tintOf, type ThreadStepIn } from "../../../lib/qcThread152";

export interface NoteIn { id: string; text: string; ms: number | null; pinned: boolean; /** Agent card v2 — an undated note drawn first among the notes (the agent's old notes string) */ top?: boolean }
export interface QuoteIn { key: string; status: QueryStatus | null; kind: "holding" | null; text: string; ms: number | null; fill: string; edge: string }

/** "when asking for the partial", "when passing", "with the offer" — what the response was, in the agent's name */
export function quotePhrase(status: QueryStatus | null, kind: "holding" | null): string {
  if (kind === "holding") return "when replying";
  switch (status) {
    case QueryStatus.PARTIAL_REQUESTED: return "when asking for the partial";
    case QueryStatus.FULL_REQUESTED: return "when asking for the full";
    case QueryStatus.REVISE_RESUBMIT: return "when asking for a revision";
    case QueryStatus.REJECTED: return "when passing";
    case QueryStatus.OFFER: return "with the offer";
    default: return "when replying";
  }
}

/** the agent's recorded words on this query, one per response that carries them (the thread's `quote`, read per event):
 *  the Band and Edge of the stage the response moved the query to (a holding reply its white) */
export function quotesOf(steps: readonly ThreadStepIn[]): QuoteIn[] {
  return steps.filter((s) => sideOf(s) === "them" && (s.quote ?? "").trim()).map((s) => {
    const t = tintOf(s) ?? { fill: "#ffffff", edge: "#e3dbd0" };
    return { key: s.key, status: s.status, kind: s.kind === "holding" ? "holding" : null, text: (s.quote ?? "").trim(), ms: s.ms ?? null, fill: t.fill, edge: t.edge };
  });
}

type Entry = { t: "note"; n: NoteIn } | { t: "quote"; q: QuoteIn };
/** the one list: a pinned note first, then everything by date, oldest first (undated last, in the order given) */
export function notesList(notes: readonly NoteIn[], quotes: readonly QuoteIn[]): Entry[] {
  const pinned = notes.filter((n) => n.pinned).slice(0, 1);
  const top = notes.filter((n) => n.top && !pinned.includes(n));
  const rest: Entry[] = [
    ...notes.filter((n) => !pinned.includes(n) && !top.includes(n)).map((n) => ({ t: "note" as const, n })),
    ...quotes.map((q) => ({ t: "quote" as const, q })),
  ];
  const ms = (e: Entry) => (e.t === "note" ? e.n.ms : e.q.ms) ?? Infinity;
  rest.sort((a, b) => ms(a) - ms(b));
  return [...pinned.map((n) => ({ t: "note" as const, n })), ...top.map((n) => ({ t: "note" as const, n })), ...rest];
}

export interface NotesTab158Props {
  first: string;
  nowMs: number;
  notes: NoteIn[];
  quotes: QuoteIn[];
  onAdd: (text: string) => void;
  onPin?: ((id: string, pinned: boolean) => void) | null;
  onTask?: ((text: string) => void) | null;
  onCork?: ((text: string) => void) | null;
  resetKey: string;
  /** Agent card v2 — the writing box's words ("Add a note about {first}"); absent: the query card's */
  placeholder?: string;
  /** Agent card v2 — the empty list's second line; absent: the query card's */
  emptySub?: string;
  /** Agent card v2 — a writer's note edited in place (true when it landed); absent: no Edit */
  onEdit?: ((id: string, text: string) => Promise<boolean>) | null;
  /** Agent card v2 — a writer's note deleted (the caller offers Undo); absent: no Delete */
  onDelete?: ((id: string) => void) | null;
}

export const NotesTab158: React.FC<NotesTab158Props> = (p) => {
  const [draft, setDraft] = useState("");
  /* Agent card v2 — one note edited in place at a time: its id and the words so far */
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const saveEdit = async () => {
    if (!editing || !p.onEdit) return;
    const t = editing.text.trim();
    if (!t) return;
    if (await p.onEdit(editing.id, t)) setEditing(null);
  };
  const ta = useRef<HTMLTextAreaElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [scrollTo, setScrollTo] = useState<number | null>(null);
  useEffect(() => { setDraft(""); setEditing(null); }, [p.resetKey]);
  /* the field grows with what is typed, to 120px */
  useLayoutEffect(() => {
    const el = ta.current; if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(120, Math.max(44, el.scrollHeight))}px`;
  }, [draft]);
  /* after adding, scroll the list to the new note once it arrives (the journal returns no id: it is the count growing) */
  useEffect(() => {
    if (scrollTo == null || p.notes.length <= scrollTo) return;
    const last = list.current?.querySelector<HTMLElement>("[data-qc158='note'][data-new]") ?? list.current?.lastElementChild as HTMLElement | null;
    last?.scrollIntoView({ block: "nearest" });
    setScrollTo(null);
  }, [p.notes.length, scrollTo]);
  const add = () => {
    const t = draft.trim();
    if (!t) return;
    p.onAdd(t);
    setDraft("");
    setScrollTo(p.notes.length);
  };
  const entries = notesList(p.notes, p.quotes);
  const newest = p.notes.reduce<NoteIn | null>((a, n) => (n.ms != null && (a == null || (a.ms ?? -1) < n.ms) ? n : a), null);
  return (
    <div className="nx-notes" data-qc152="notes" data-qc158="notes">
      <div className="nx-nl" ref={list} data-qc158="list">
        {entries.length === 0 ? (
          <div className="nx-nempty" data-qc158="empty">
            <b>Nothing noted yet</b>
            <span>{p.emptySub ?? `This is the place for why you picked ${p.first}, and what you’d change if this one’s a no.`}</span>
          </div>
        ) : entries.map((e) => e.t === "note" ? (
          <article key={e.n.id} className="nx-n" data-qc158="note" data-id={e.n.id} data-pinned={e.n.pinned ? "" : undefined}
            data-new={scrollTo != null && newest?.id === e.n.id ? "" : undefined} tabIndex={0}>
            <header><b>You</b>{e.n.ms != null ? <span>· {dayLabel(e.n.ms, p.nowMs)}</span> : null}{e.n.pinned ? <span className="pin" data-qc158="pinned">Pinned</span> : null}</header>
            {editing && editing.id === e.n.id ? (
              <div className="nx-edit" data-qc158="edit">
                <textarea value={editing.text} rows={3} aria-label="Edit this note" data-qc158="edit-field" autoFocus
                  onChange={(ev) => setEditing({ id: e.n.id, text: ev.target.value })}
                  onKeyDown={(ev) => { if (ev.key === "Enter" && (ev.metaKey || ev.ctrlKey)) { ev.preventDefault(); void saveEdit(); } if (ev.key === "Escape") { ev.stopPropagation(); setEditing(null); } }} />
                <div className="nx-acts" data-qc158="edit-acts">
                  <button type="button" className="nx-lk" data-qc158="edit-cancel" onClick={() => setEditing(null)}>Cancel</button>
                  <button type="button" className="nx-lk" data-qc158="edit-save" disabled={!editing.text.trim()} onClick={() => void saveEdit()}>Save</button>
                </div>
              </div>
            ) : <p>{e.n.text}</p>}
            <div className="nx-acts" data-qc158="acts" hidden={!!editing && editing.id === e.n.id}>
              {p.onPin ? <button type="button" className="nx-lk" data-qc158="act" data-act="pin" onClick={() => p.onPin!(e.n.id, !e.n.pinned)}>{e.n.pinned ? "Unpin" : "Pin to the top"}</button> : null}
              {p.onTask ? <button type="button" className="nx-lk" data-qc158="act" data-act="task" onClick={() => p.onTask!(e.n.text)}>Make it a task</button> : null}
              {p.onCork ? <button type="button" className="nx-lk" data-qc158="act" data-act="cork" onClick={() => p.onCork!(e.n.text)}>Send to Corkboard</button> : null}
              {p.onEdit ? <button type="button" className="nx-lk" data-qc158="act" data-act="edit" onClick={() => setEditing({ id: e.n.id, text: e.n.text })}>Edit</button> : null}
              {p.onDelete ? <button type="button" className="nx-lk" data-qc158="act" data-act="delete" onClick={() => p.onDelete!(e.n.id)}>Delete</button> : null}
            </div>
          </article>
        ) : (
          <article key={e.q.key} className="nx-n them" data-qc158="quote" data-status={e.q.status ?? undefined} tabIndex={0}
            style={{ ["--bt" as string]: e.q.fill, ["--be" as string]: e.q.edge } as React.CSSProperties}>
            <header>{e.q.status ? <StatusDot status={e.q.status} overrideSize={14} tone="ink" decorative /> : null}<b>{p.first}</b>
              <span>{quotePhrase(e.q.status, e.q.kind)}{e.q.ms != null ? ` · ${dayLabel(e.q.ms, p.nowMs)}` : ""}</span></header>
            <p>“{e.q.text}”</p>
            {p.onCork ? (
              <div className="nx-acts" data-qc158="acts">
                <button type="button" className="nx-lk" data-qc158="act" data-act="cork" onClick={() => p.onCork!(e.q.text)}>Send to Corkboard</button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
      <div className="nx-nc" data-qc158="compose">
        <textarea ref={ta} rows={1} value={draft} placeholder={p.placeholder ?? "Add a note about this query"} aria-label={p.placeholder ?? "Add a note about this query"} data-qc158="field"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); add(); } }} />
        <button type="button" data-qc158="add-note" disabled={!draft.trim()} onClick={add}>Add note</button>
      </div>
    </div>
  );
};
