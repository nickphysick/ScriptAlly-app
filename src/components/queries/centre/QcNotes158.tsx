/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query card v158 §5 (design-refs/query-card-v158/query-card-v158.html, "Notes and their words") — the slide-out card's
 * Notes tab: one list in date order, oldest first, of the writer's notes (the journal, users/{uid}/journalEntries) and
 * the agent's recorded words (each response's `replyNote`, per event); a pinned note first; and the writing box fixed
 * at the bottom of the tab body.
 *
 * ⚠️ THE AGENT'S WORDS: Send to Corkboard is their one other action. On the query card (Query card v168) they are
 *    edited in place too, saved through their step's own words field (`onQuoteEdit`); with no such prop (the agent
 *    card) they stay read-only. The writer's notes add Pin to the top (or Unpin) and Make it a task. Both copy the text;
 *    the note stays.
 * ⚠️ Query card v168 — NOTHING MOVES ON HOVER: the old hover row of actions (`.nx-acts`) is gone on both cards. A note
 *    carries the pencil (EditPen) and a ⋯ disc beside it (MoreDisc), both absolutely placed; ⋯ opens the card's small
 *    menu. A note opens where it is: its words in place (no box inside the box), the cross and the tick in its header,
 *    "Delete this note" bottom left (asks once). One thing open at a time (QcEdit168); outside a card that holds the rule
 *    (the agent card) this tab holds its own. While a note is open the writing box is not sticky.
 * ⚠️ A NOTE IS SAVED BY THE BUTTON OR Ctrl/Cmd + Enter ONLY — never on blur (v152's field saved on blur).
 * ⚠️ QUERYHAWK NEVER WRITES FOR THE WRITER: the field has a placeholder and nothing else; no suggested text.
 * ⚠️ COLOUR IS THE STAGE: an agent's words take the Band of the stage that response moved the query to, with its Edge
 *    (set as --bt / --be from lib/qcThread152 tintOf). Marks are ink.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CardMenu, CardMenuItem, CrossTick, DeleteAsk, DiscardAsk, Edit168Ctx, EditPen, MoreDisc, mut168, useEdit168, useEditRule168, useHold168 } from "./QcEdit168";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { StatusDot } from "../../StatusDot";
import { QueryStatus } from "../../../types";
import { agentTint, dayLabel, sideOf, tintOf, type ThreadStepIn } from "../../../lib/qcThread152";
import { replyPhrase } from "../../../lib/agentReply";
import { Bar } from "./QcGhost167";

export interface NoteIn { id: string; text: string; ms: number | null; pinned: boolean; /** Agent card v2 — an undated note drawn first among the notes (the agent's old notes string) */ top?: boolean }
export interface QuoteIn { key: string; status: QueryStatus | null; kind: "reply" | null; text: string; ms: number | null; fill: string; edge: string; /** v168 — the response's activity, whose words these are */ activityId?: string | null; /** Agent card v2.2 — the query they were said on */ queryId?: string | null; /** Controls: entry v1 — a reply entry's phrase ("when chasing the full") */ phrase?: string | null }

/** "when asking for the partial", "when passing", "with the offer" — what the response was, in the agent's name */
export function quotePhrase(status: QueryStatus | null, kind: "reply" | null): string {
  if (kind === "reply") return "when replying";
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
    /* Controls: entry v1 — a reply entry's words wear the stage it came in when that was the agent's (a chaser of the
       full is the full's blue), else the holding white; its phrase names its kind */
    const st = s.kind === "reply" ? s.reply?.stage ?? null : null;
    const t = (st && sideOf({ status: st, kind: null }) === "them" ? agentTint(st) : null) ?? tintOf(s) ?? { fill: "#ffffff", edge: "#e3dbd0" };
    const phrase = s.kind === "reply" && s.reply ? replyPhrase(s.reply.kind, s.reply.chase) : null;
    return { key: s.key, status: s.status, kind: s.kind === "reply" ? "reply" : null, text: (s.quote ?? "").trim(), ms: s.ms ?? null, fill: t.fill, edge: t.edge, activityId: s.activityId ?? null, phrase };
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
  /** Agent card v2 — a writer's note deleted (the caller offers Undo); absent: no Delete. v168: asked once in the note */
  onDelete?: ((id: string) => void) | null;
  /** Query card v168 — the agent's recorded words edited in place, through their step's own words field (true when it
   *  landed); absent (the agent card): read-only */
  onQuoteEdit?: ((q: QuoteIn, text: string) => Promise<boolean>) | null;
  /** Agent card v2.2 — where the agent's words are read-only (the agent card): open the query they were said on */
  onQuoteOpen?: ((q: QuoteIn) => void) | null;
  /** Query card v167 §A — with no notes, two ghost note shapes in place of the empty words (the query card passes it;
   *  the agent card's empty state is its own and unchanged) */
  ghost?: boolean;
}

/**
 * Log a query v2.2 — THE WRITER'S NOTE, lifted out of the tab so Log a query's review draws the same thing (one `.nx-n`
 * article: "You · {day}", the words, and its actions; Edit opens the words in place with Cancel / Save). The tab passes
 * its own state in, so its markup and behaviour are unchanged (qcNotes158.test.tsx). `editing` is the words being edited,
 * or null.
 */
export interface NoteArticleProps {
  n: NoteIn;
  nowMs: number;
  /** the tab's "scroll to the new note" marker */
  isNew?: boolean;
  editing: string | null;
  onEditChange: (text: string) => void;
  onEditCancel: () => void;
  onEditSave: () => void;
  onPin?: (() => void) | null;
  onTask?: (() => void) | null;
  onCork?: (() => void) | null;
  /** starts an edit; absent: no Edit */
  onEdit?: (() => void) | null;
  /** absent: no Delete */
  onDelete?: (() => void) | null;
}
export const NoteArticle: React.FC<NoteArticleProps> = (a) => {
  const { n } = a;
  const editing = a.editing != null;
  return (
    <article className="nx-n" data-qc158="note" data-id={n.id} data-pinned={n.pinned ? "" : undefined} data-new={a.isNew ? "" : undefined} tabIndex={0}>
      <header><b>You</b>{n.ms != null ? <span>· {dayLabel(n.ms, a.nowMs)}</span> : null}{n.pinned ? <span className="pin" data-qc158="pinned">Pinned</span> : null}</header>
      {editing ? (
        <div className="nx-edit" data-qc158="edit">
          <textarea value={a.editing!} rows={3} aria-label="Edit this note" data-qc158="edit-field" autoFocus
            onChange={(ev) => a.onEditChange(ev.target.value)}
            onKeyDown={(ev) => { if (ev.key === "Enter" && (ev.metaKey || ev.ctrlKey)) { ev.preventDefault(); a.onEditSave(); } if (ev.key === "Escape") { ev.stopPropagation(); a.onEditCancel(); } }} />
          <div className="nx-acts" data-qc158="edit-acts">
            <button type="button" className="nx-lk" data-qc158="edit-cancel" onClick={a.onEditCancel}>Cancel</button>
            <button type="button" className="nx-lk" data-qc158="edit-save" disabled={!a.editing!.trim()} onClick={a.onEditSave}>Save</button>
          </div>
        </div>
      ) : <p>{n.text}</p>}
      <div className="nx-acts" data-qc158="acts" hidden={editing}>
        {a.onPin ? <button type="button" className="nx-lk" data-qc158="act" data-act="pin" onClick={a.onPin}>{n.pinned ? "Unpin" : "Pin to the top"}</button> : null}
        {a.onTask ? <button type="button" className="nx-lk" data-qc158="act" data-act="task" onClick={a.onTask}>Make it a task</button> : null}
        {a.onCork ? <button type="button" className="nx-lk" data-qc158="act" data-act="cork" onClick={a.onCork}>Send to Corkboard</button> : null}
        {a.onEdit ? <button type="button" className="nx-lk" data-qc158="act" data-act="edit" onClick={a.onEdit}>Edit</button> : null}
        {a.onDelete ? <button type="button" className="nx-lk" data-qc158="act" data-act="delete" onClick={a.onDelete}>Delete</button> : null}
      </div>
    </article>
  );
};

/**
 * Log a query v2.2 — THE WRITING BOX, lifted out of the tab: the field (grows as typed, 44 to 120px) and "Add note",
 * disabled while empty. Saved by the button or Ctrl/Cmd + Enter only, never on blur. The words are the caller's, so
 * Log a query can keep what is left unsaved in it.
 */
export interface NoteComposeProps {
  value: string;
  onChange: (text: string) => void;
  onAdd: () => void;
  placeholder?: string;
  /** the field, for a caller that focuses it */
  fieldRef?: React.RefObject<HTMLTextAreaElement | null>;
}
export const NoteCompose: React.FC<NoteComposeProps> = (c) => {
  const own = useRef<HTMLTextAreaElement>(null);
  const ta = c.fieldRef ?? own;
  /* the field grows with what is typed, to 120px */
  useLayoutEffect(() => {
    const el = ta.current; if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(120, Math.max(44, el.scrollHeight))}px`;
  }, [c.value, ta]);
  const words = c.placeholder ?? "Add a note about this query";
  return (
    <div className="nx-nc" data-qc158="compose">
      <textarea ref={ta} rows={1} value={c.value} placeholder={words} aria-label={words} data-qc158="field"
        onChange={(e) => c.onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); c.onAdd(); } }} />
      <button type="button" data-qc158="add-note" disabled={!c.value.trim()} onClick={c.onAdd}>Add note</button>
    </div>
  );
};

type Row = { t: "note"; n: NoteIn } | { t: "quote"; q: QuoteIn };

/** v168 — what a note's ⋯ holds: Pin to the top (or Unpin), Make it a task, Send to Corkboard; the agent's words, Send to
 *  Corkboard only */
export function menuItems168(e: Row, p: Pick<NotesTab158Props, "onPin" | "onTask" | "onCork" | "onQuoteOpen">): { k: "pin" | "task" | "cork" | "open"; label: string; act: () => void }[] {
  if (e.t === "quote") return [
    ...(p.onCork ? [{ k: "cork" as const, label: "Send to Corkboard", act: () => p.onCork!(e.q.text) }] : []),
    /* Agent card v2.2 — the agent's words are read-only on that card: they are changed on the query they were said on */
    ...(p.onQuoteOpen && e.q.queryId ? [{ k: "open" as const, label: "Change it on the query", act: () => p.onQuoteOpen!(e.q) }] : []),
  ];
  return [
    ...(p.onPin ? [{ k: "pin" as const, label: e.n.pinned ? "Unpin" : "Pin to the top", act: () => p.onPin!(e.n.id, !e.n.pinned) }] : []),
    ...(p.onTask ? [{ k: "task" as const, label: "Make it a task", act: () => p.onTask!(e.n.text) }] : []),
    ...(p.onCork ? [{ k: "cork" as const, label: "Send to Corkboard", act: () => p.onCork!(e.n.text) }] : []),
  ];
}

/** one entry of the list: closed, with its pencil and ⋯; or open in place */
const NoteRow: React.FC<{ e: Row; p: NotesTab158Props; open: boolean; setOpen: (on: boolean) => void; isNew: boolean; up: boolean; menu: string | null; setMenu: (k: string | null) => void; root: () => HTMLElement | null }> = ({ e, p, open, setOpen, isNew, up, menu, setMenu, root }) => {
  const ed = useEdit168();
  const mk = e.t === "note" ? `n:${e.n.id}` : `q:${e.q.key}`;
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const text = e.t === "note" ? e.n.text : e.q.text;
  const canEdit = e.t === "note" ? !!p.onEdit : !!p.onQuoteEdit;
  const items = menuItems168(e, p);
  const header = e.t === "note"
    ? <><b>You</b>{e.n.ms != null ? <span>· {dayLabel(e.n.ms, p.nowMs)}</span> : null}{e.n.pinned ? <span className="pin" data-qc158="pinned">Pinned</span> : null}</>
    : <>{e.q.status ? <StatusDot status={e.q.status} overrideSize={14} tone="ink" decorative /> : null}<b>{p.first}</b>
      <span>{e.q.phrase ?? quotePhrase(e.q.status, e.q.kind)}{e.q.ms != null ? ` · ${dayLabel(e.q.ms, p.nowMs)}` : ""}</span></>;
  const outer = e.t === "note"
    ? { className: `nx-n${open ? " qc168-open" : ""}`, "data-qc158": "note", "data-id": e.n.id, "data-pinned": e.n.pinned ? "" : undefined, "data-new": isNew ? "" : undefined }
    : { className: `nx-n them${open ? " qc168-open" : ""}`, "data-qc158": "quote", "data-status": e.q.status ?? undefined, style: { ["--bt" as string]: e.q.fill, ["--be" as string]: e.q.edge } as React.CSSProperties };
  if (open) return <OpenNote e={e} p={p} outer={outer} header={header} onClose={() => setOpen(false)} onReopen={() => setOpen(true)} />;
  return (
    <article {...outer} tabIndex={0} data-qc168-host={canEdit || items.length ? "" : undefined}>
      <header>{header}</header>
      <p>{e.t === "quote" ? `“${text}”` : text}</p>
      {canEdit ? <EditPen label={e.t === "note" ? "this note" : `${p.first}’s words`} onOpen={() => ed.guard(() => setOpen(true))} data={{ "data-qc168-k": e.t === "note" ? `note:${e.n.id}` : `quote:${e.q.key}` }} /> : null}
      {items.length ? <MoreDisc label={e.t === "note" ? "More for this note" : "More for these words"} open={menu === mk}
        onOpen={(el) => ed.guard(() => { setAnchor(el); setMenu(menu === mk ? null : mk); })} /> : null}
      {menu === mk && items.length ? (
        <CardMenu root={root()} anchor={anchor} up={up} onClose={() => setMenu(null)} label={e.t === "note" ? "This note" : `${p.first}’s words`} hook="note-menu">
          {items.map((it) => <CardMenuItem key={it.k} label={it.label} data={{ "data-act": it.k }} onPick={() => { setMenu(null); it.act(); }} />)}
        </CardMenu>
      ) : null}
    </article>
  );
};

/** a note (or the agent's words) open where it is */
const OpenNote: React.FC<{ e: Row; p: NotesTab158Props; outer: Record<string, unknown>; header: React.ReactNode; onClose: () => void; onReopen: () => void }> = ({ e, p, outer, header, onClose, onReopen }) => {
  const key = e.t === "note" ? `note:${e.n.id}` : `quote:${e.q.key}`;
  const base = e.t === "note" ? e.n.text : e.q.text;
  const seed = useEdit168().seedOf(key) as string | undefined;
  const [text, setText] = useState(seed ?? base);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(false);
  const dirty = text.trim() !== base.trim() && !!text.trim();
  const ed = useHold168(key, text.trim() !== base.trim(), text, onClose, onReopen);
  const asking = ed.asking && ed.open === key;
  const ta = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => { const el = ta.current; if (!el) return; el.focus({ preventScroll: true }); el.setSelectionRange(el.value.length, el.value.length); }, []);
  useLayoutEffect(() => { const el = ta.current; if (!el) return; el.style.height = "auto"; el.style.height = `${Math.max(66, el.scrollHeight)}px`; }, [text]);
  useEscapeLayer(true, () => { if (del) { setDel(false); return; } if (asking) { ed.keep(); return; } ed.leave(); }, ESC_LEVEL.pageModal);
  const save = async () => {
    const t = text.trim();
    if (!t || t === base.trim() || busy) return;
    setBusy(true);
    let ok = false;
    try { ok = mut168("8") ? true : e.t === "note" ? !!(await p.onEdit?.(e.n.id, t)) : !!(await p.onQuoteEdit?.(e.q, t)); } finally { setBusy(false); }
    if (ok) onClose();
  };
  return (
    <article {...outer} data-qc168="note-edit">
      <header>{header}<CrossTick dirty={dirty} busy={busy} onCross={ed.cross} onTick={() => void save()} /></header>
      <div className="nx-edit" data-qc158="edit">
        <textarea ref={ta} value={text} rows={3} aria-label={e.t === "note" ? "Edit this note" : `Edit ${p.first}’s words`} data-qc158="edit-field" maxLength={e.t === "quote" ? 500 : undefined}
          onChange={(ev) => setText(ev.target.value)}
          onKeyDown={mut168("14") ? undefined : (ev) => { if (ev.key === "Enter" && (ev.metaKey || ev.ctrlKey)) { ev.preventDefault(); void save(); } }} />
      </div>
      {del ? (
        <DeleteAsk words="Delete this note?" busy={busy} onKeep={() => setDel(false)} onDelete={() => { if (e.t === "note") { onClose(); if (!mut168("8")) p.onDelete?.(e.n.id); } }} />
      ) : asking ? (
        <DiscardAsk onKeep={ed.keep} onDiscard={ed.discard} />
      ) : e.t === "note" && p.onDelete ? (
        <div className="qc168-ef"><button type="button" className="qc168-lk rust" data-qc168="delete-note" onClick={() => setDel(true)}>Delete this note</button></div>
      ) : null}
    </article>
  );
};

export const NotesTab158: React.FC<NotesTab158Props> = (p) => {
  const [draft, setDraft] = useState("");
  /* v168 — what is open: one at a time under the rule (the "allow two" mutation of lock L9 lets a second one stay) */
  const [open, setOpenS] = useState<string[]>([]);
  const [menu, setMenu] = useState<string | null>(null);
  const ta = useRef<HTMLTextAreaElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [scrollTo, setScrollTo] = useState<number | null>(null);
  useEffect(() => { setDraft(""); setOpenS([]); setMenu(null); }, [p.resetKey]);
  /* outside a card that holds the rule (the agent card), this tab holds its own; its cross discards without a toast */
  const outer = useEdit168();
  const own = useEditRule168(p.resetKey, () => {}, () => list.current);
  const setOpen = (k: string, on: boolean) => setOpenS((xs) => (on ? (mut168("9") ? [...xs.filter((x) => x !== k), k] : [k]) : xs.filter((x) => x !== k)));
  /* (the field grows with what is typed: NoteCompose, Log a query v2.2) */
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
  const body = (
    <div className={`nx-notes${open.length ? " has-open" : ""}`} data-qc152="notes" data-qc158="notes">
      <div className="nx-nl" ref={list} data-qc158="list">
        {entries.length === 0 && p.ghost ? (
          <>
            <div className="qc167-gn" data-qc167="ghost-note" data-ghost=""><Bar w={22} /><Bar w={88} /><Bar w={56} /></div>
            <div className="qc167-gn dim" data-qc167="ghost-note" data-ghost=""><Bar w={18} /><Bar w={70} /></div>
          </>
        ) : entries.length === 0 ? (
          <div className="nx-nempty" data-qc158="empty">
            <b>Nothing noted yet</b>
            <span>{p.emptySub ?? `This is the place for why you picked ${p.first}, and what you’d change if this one’s a no.`}</span>
          </div>
        ) : entries.map((e, i) => {
          const k = e.t === "note" ? `note:${e.n.id}` : `quote:${e.q.key}`;
          return <NoteRow key={k} e={e} p={p} open={open.includes(k)} setOpen={(on) => setOpen(k, on)} root={() => null}
            isNew={e.t === "note" && scrollTo != null && newest?.id === e.n.id} up={i === entries.length - 1 && entries.length > 1} menu={menu} setMenu={setMenu} />;
        })}
      </div>
      <NoteCompose value={draft} onChange={setDraft} onAdd={add} placeholder={p.placeholder} fieldRef={ta} />
    </div>
  );
  return outer.local ? <Edit168Ctx.Provider value={own}>{body}</Edit168Ctx.Provider> : body;
};
