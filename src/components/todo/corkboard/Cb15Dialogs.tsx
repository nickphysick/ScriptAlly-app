/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Corkboard's desktop pop-ups (Corkboard v15, 18 Nov; ref design-refs/corkboard-v15/, `.dlg`, `openNote`,
 * `openTask`, `openTurn`, `openPile`). ONE shell, `Cb15Dialog`: the desk dims, one card sits centred, the focus is
 * trapped inside it (Tab and Shift+Tab wrap), Escape and the scrim close it, and the focus goes back to whatever opened
 * it. The phone keeps v2's dialogs (CbNoteDialog, CbTaskDialogs, CbStartPile).
 *
 *   Cb15NoteDialog   "New note" / "Your note": the paper you type on, Colour, Stack, About (the existing link finder,
 *                    `linkOptions`), Pin; "⌘ Enter saves", Cancel, Save note; on an existing note also "Remove note"
 *                    and "Turn into a task" (when it is not on the to-do list already)
 *   Cb15TurnTask     "Do it": This week / Next week / Later, each "by <Sunday>" (lib/corkboard DUE_CHIPS)
 *   Cb15StartStack   a name, and up to six of PILE_SUGGESTIONS that are not stacks yet
 *   Cb15AddTask      the To-do list's OWN composer (`AddTask`, never a copy) inside the shell: the write is the To-do
 *                    list's add, exactly as v2's CbAddTask (decision 4)
 *
 * ⚠️ NONE OF THEM WRITES: each hands its answer to the page.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Agent, Manuscript, NoteColour, Query } from "../../../types";
import { NOTE_PAPERS, paperHex } from "../../../lib/noteboard";
import { DUE_CHIPS, PILE_SUGGESTIONS, dayLabel, linkOptions, pileSlug, plusDays, type NoteLink } from "../../../lib/corkboard";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { AddTask } from "../ws/TodoWorkspace";
import { StatusDot } from "../../StatusDot";

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** The shell: scrim, centred card, focus trap, Escape, focus back to the opener. */
export const Cb15Dialog: React.FC<{
  label: string; title: string; sub?: string; probe: string; onClose: () => void; onKeyDown?: (e: React.KeyboardEvent) => void;
  initialFocus?: string; children: React.ReactNode; footer?: React.ReactNode;
}> = ({ label, title, sub, probe, onClose, onKeyDown, initialFocus, children, footer }) => {
  const box = useRef<HTMLDivElement | null>(null);
  const opener = useRef<Element | null>(typeof document !== "undefined" ? document.activeElement : null);
  useEffect(() => {
    const el = box.current;
    const first = (initialFocus ? el?.querySelector<HTMLElement>(initialFocus) : null) ?? el?.querySelector<HTMLElement>("textarea, input") ?? el?.querySelector<HTMLElement>(FOCUSABLE);
    if (first) {
      first.focus({ preventScroll: true });
      if (first instanceof HTMLTextAreaElement || first instanceof HTMLInputElement) { const n = first.value.length; try { first.setSelectionRange(n, n); } catch { /* not a text field */ } }
    }
    const back = opener.current;
    return () => { if (back instanceof HTMLElement && document.contains(back)) back.focus({ preventScroll: true }); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEscapeLayer(true, onClose, ESC_LEVEL.pageDrawer);
  const keys = (e: React.KeyboardEvent) => {
    onKeyDown?.(e);
    if (e.defaultPrevented || e.key !== "Tab") return;
    const f = [...(box.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])].filter((x) => x.offsetParent !== null || x === document.activeElement);
    if (!f.length) return;
    const a = f[0], z = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === a || !box.current?.contains(document.activeElement))) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && (document.activeElement === z || !box.current?.contains(document.activeElement))) { e.preventDefault(); a.focus(); }
  };
  return createPortal(
    <div className="cb15-layer" data-cb15="dialog-layer">
      <div className="cb15-layer cb15-scrim" data-cb15="scrim" onMouseDown={onClose} />
      <div ref={box} className="cb15-dlg" role="dialog" aria-modal="true" aria-label={label} data-cb15={probe} onKeyDown={keys}>
        <div className="cb15-dh"><h3>{title}</h3><button type="button" className="cb15-x" aria-label="Close" data-cb15="close" onClick={onClose}>×</button></div>
        {sub ? <p className="cb15-dsub">{sub}</p> : null}
        {children}
        {footer}
      </div>
    </div>,
    document.body,
  );
};

/* ══ New note / Your note ══ */
export interface Cb15Draft {
  id?: string;
  body: string;
  colour: NoteColour;
  /** the stack: a tag LABEL ("" = none) — the note's first tag; its other tags are kept */
  tag: string;
  link: NoteLink | null;
  pinned: boolean;
}
export interface Cb15LinkView { kind: "agent" | "query" | "manuscript"; initials: string; name: string; status: string | null; word: string | null }

export const Cb15NoteDialog: React.FC<{
  draft: Cb15Draft; setDraft: (d: Cb15Draft) => void; saving: boolean;
  /** the stacks that exist (labels), A to Z */
  stacks: string[];
  linkView: (l: NoteLink) => Cb15LinkView;
  queries: Query[]; agents: Agent[]; manuscripts: Manuscript[];
  /** on an existing note: is it on the to-do list already? */
  onTodo: boolean;
  onSave: () => void; onClose: () => void; onRemove: () => void; onTurn: () => void;
}> = ({ draft: d, setDraft, saving, stacks, linkView, queries, agents, manuscripts, onTodo, onSave, onClose, onRemove, onTurn }) => {
  const [finding, setFinding] = useState(false);
  const [q, setQ] = useState("");
  const options = useMemo(() => linkOptions(queries, agents, manuscripts, q), [queries, agents, manuscripts, q]);
  const set = (x: Partial<Cb15Draft>) => setDraft({ ...d, ...x });
  const can = !!d.body.trim() && !saving;
  const known = stacks.some((s) => s.toLowerCase() === d.tag.toLowerCase());
  const lv = d.link ? linkView(d.link) : null;
  const findRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { if (finding) findRef.current?.focus(); }, [finding]);
  useEscapeLayer(finding, () => setFinding(false), ESC_LEVEL.pageModal);
  return (
    <Cb15Dialog label={d.id ? "Your note" : "New note"} title={d.id ? "Your note" : "New note"} probe="note-dialog" onClose={onClose}
      onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); if (can) onSave(); } }}
      footer={(
        <div className="cb15-df">
          {d.id ? <button type="button" className="cb15-btn cb15-t" data-cb15="remove-note" onClick={onRemove}>Remove note</button> : null}
          {d.id && !onTodo ? <button type="button" className="cb15-btn cb15-t" data-cb15="turn" onClick={onTurn}>Turn into a task</button> : null}
          <span className="cb15-sp" />
          <span className="cb15-k">⌘ Enter saves</span>
          <button type="button" className="cb15-btn cb15-s" data-cb15="cancel" onClick={onClose}>Cancel</button>
          <button type="button" className="cb15-btn cb15-p" data-cb15="save" disabled={!can} onClick={onSave}>Save note</button>
        </div>
      )}>
      <div className="cb15-db">
        <div className="cb15-dpaper" style={{ ["--c" as string]: paperHex(d.colour) }} data-cb15="dpaper">
          <textarea value={d.body} placeholder="Write it down…" aria-label="Note" data-cb15="note-text" onChange={(e) => set({ body: e.target.value })} />
        </div>
        <div className="cb15-drow cb15-first">
          <span className="cb15-l">Colour</span>
          <div className="cb15-sws" role="group" aria-label="Colour">
            {NOTE_PAPERS.map((p) => (
              <button key={p.v} type="button" aria-label={p.name} aria-pressed={d.colour === p.v} data-paper={p.v} className={d.colour === p.v ? "cb15-on" : undefined}
                style={{ ["--c" as string]: p.hex }} onClick={() => set({ colour: p.v })} />
            ))}
          </div>
        </div>
        <div className="cb15-drow">
          <span className="cb15-l">Stack</span>
          <div className="cb15-chips" data-cb15="stack-row">
            {stacks.map((s) => (
              <button key={s} type="button" className={`cb15-chip${d.tag.toLowerCase() === s.toLowerCase() ? " cb15-on" : ""}`} aria-pressed={d.tag.toLowerCase() === s.toLowerCase()} data-stack={s}
                onClick={() => set({ tag: d.tag.toLowerCase() === s.toLowerCase() ? "" : s })}>#{s}</button>
            ))}
            <input className="cb15-tin" placeholder="New stack" aria-label="New stack name" data-cb15="new-stack-name" value={known ? "" : d.tag}
              onChange={(e) => set({ tag: e.target.value.replace(/^#+/, "") })} />
          </div>
        </div>
        <div className="cb15-drow">
          <span className="cb15-l">About</span>
          <div data-cb15="about-row">
            {lv && !finding ? (
              <div className="cb15-chips">
                <span className="cb15-lchip" style={{ boxShadow: "inset 0 0 0 1px #d9d0c3" }} data-cb15="linked">
                  <i className={lv.kind === "manuscript" ? "cb15-ms" : undefined} aria-hidden="true">{lv.initials}</i>
                  <span className="cb15-nm">{lv.name}</span>
                  {lv.status ? <span className="cb15-sd"><StatusDot status={lv.status} overrideSize={16} tone="inherit" decorative /><span>{lv.word}</span></span> : null}
                </span>
                <button type="button" className="cb15-btn cb15-t" onClick={() => setFinding(true)}>Change</button>
                <button type="button" className="cb15-btn cb15-t" data-cb15="unlink" onClick={() => set({ link: null })}>Remove link</button>
              </div>
            ) : !finding ? (
              <button type="button" className="cb15-chip" data-cb15="add-link" onClick={() => setFinding(true)}>Link to an agent or a query</button>
            ) : (
              <div className="cb15-finder">
                <input ref={findRef} className="cb15-tin cb15-big" placeholder="Find an agent, a query or your manuscript" aria-label="Find an agent or a query" data-cb15="link-find"
                  value={q} onChange={(e) => setQ(e.target.value)} />
                <div className="cb15-res" data-cb15="link-results">
                  {options.length ? options.map((o) => (
                    <button key={`${o.kind}-${o.id}`} type="button" data-link={`${o.kind}:${o.id}`}
                      onClick={() => { set({ link: { kind: o.kind, id: o.id } }); setFinding(false); setQ(""); }}>
                      <i className={o.kind === "manuscript" ? "cb15-ms" : undefined} aria-hidden="true">{linkView({ kind: o.kind, id: o.id }).initials}</i>
                      <span>{o.label}</span><small>{o.sub}</small>
                    </button>
                  )) : <p>No one by that name</p>}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="cb15-drow">
          <span className="cb15-l">Pin</span>
          <button type="button" className={`cb15-swt${d.pinned ? " cb15-on" : ""}`} role="switch" aria-checked={d.pinned} data-cb15="pin-switch" onClick={() => set({ pinned: !d.pinned })}>
            <i aria-hidden="true" />Keep it at the top of the board
          </button>
        </div>
      </div>
    </Cb15Dialog>
  );
};

/* ══ Turn into a task ══ */
export const Cb15TurnTask: React.FC<{ todayYmd: string; sundayYmd: string; hex: string; text: string; onSave: (due: string) => void; onClose: () => void }> = ({ sundayYmd, hex, text, onSave, onClose }) => {
  const [k, setK] = useState<"this" | "next" | "later">("this");
  const due = plusDays(sundayYmd, DUE_CHIPS.find((c) => c.k === k)!.add);
  return (
    <Cb15Dialog label="Turn into a task" title="Turn into a task" sub="The note stays on your board. It also goes on your to-do list." probe="turn-dialog" onClose={onClose}
      initialFocus='[data-cb15="turn-save"]'
      onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onSave(due); } }}
      footer={(
        <div className="cb15-df"><span className="cb15-sp" />
          <button type="button" className="cb15-btn cb15-s" onClick={onClose}>Cancel</button>
          <button type="button" className="cb15-btn cb15-p" data-cb15="turn-save" onClick={() => onSave(due)}>Put it on my to-do list</button>
        </div>
      )}>
      <div className="cb15-db">
        <div className="cb15-dpaper cb15-mini" style={{ ["--c" as string]: hex }}>{text}</div>
        <div className="cb15-drow"><span className="cb15-l">Do it</span>
          <div className="cb15-chips" data-cb15="dues">
            {DUE_CHIPS.map((c) => (
              <button key={c.k} type="button" className={`cb15-chip cb15-two${k === c.k ? " cb15-on" : ""}`} aria-pressed={k === c.k} data-due={c.k} onClick={() => setK(c.k)}>
                {c.label}<small>by {dayLabel(plusDays(sundayYmd, c.add))}</small>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Cb15Dialog>
  );
};

/* ══ Start a stack ══ */
export const Cb15StartStack: React.FC<{ have: ReadonlySet<string>; moving: boolean; onSave: (name: string) => void; onClose: () => void }> = ({ have, moving, onSave, onClose }) => {
  const [name, setName] = useState("");
  const slug = pileSlug(name);
  const sugg = PILE_SUGGESTIONS.filter((s) => !have.has(s)).slice(0, 6);
  const save = () => { if (slug) onSave(slug); };
  return (
    <Cb15Dialog label="Start a stack" title="Start a stack" sub="A stack is a tag. Notes with the same tag sit together." probe="start-stack" onClose={onClose}
      onKeyDown={(e) => { if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") { e.preventDefault(); save(); } }}
      footer={(
        <div className="cb15-df"><span className="cb15-sp" />
          <button type="button" className="cb15-btn cb15-s" onClick={onClose}>Cancel</button>
          <button type="button" className="cb15-btn cb15-p" data-cb15="start-save" disabled={!slug} onClick={save}>{moving ? "Start stack and move note" : "Start stack"}</button>
        </div>
      )}>
      <div className="cb15-db">
        <input className="cb15-tin cb15-big" placeholder="Name it" aria-label="Stack name" data-cb15="stack-name" value={name} onChange={(e) => setName(e.target.value)} />
        {sugg.length ? (
          <div className="cb15-drow cb15-first"><span className="cb15-l">Or pick</span>
            <div className="cb15-chips" data-cb15="suggestions">
              {sugg.map((s) => <button key={s} type="button" className="cb15-chip" data-sugg={s} onClick={() => setName(s)}>#{s}</button>)}
            </div>
          </div>
        ) : null}
      </div>
    </Cb15Dialog>
  );
};

/* ══ Add a task: the To-do list's own composer, inside the shell ══ */
export const Cb15AddTask: React.FC<{ today: Date; onAdd: (text: string, due: string, detail: string) => Promise<void>; onClose: () => void }> = ({ today, onAdd, onClose }) => (
  <Cb15Dialog label="Add a task" title="Add a task" sub="It goes on your to-do list." probe="task-dialog" onClose={onClose}>
    <div className="cb15-taskbody tws-layer">
      <AddTask today={today} onCancel={onClose} onAdd={onAdd} />
    </div>
  </Cb15Dialog>
);
