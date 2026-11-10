/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Log a query v1.1 Phase 3 (design-refs/log-a-query-v1-1/edit-in-place-v1.html) — EDITING IN PLACE ON THE QUERY CARD.
 * It replaces the "Query details" composer. Two kinds of editing, kept apart:
 *   · a Tracking step is edited by dev's step editor (QcStepEdit1522), one step at a time, in or out of this mode;
 *   · everything else is ONE edit mode from the band's pencil: the agent the query is to (the header), the agent's own
 *     details (the Agent tab, saved to the agent's record), and the notes.
 * This module holds the draft and draws the layer's parts; QcCard152 places them, and the page saves (`onSaveEdits`).
 *
 * ⚠️ THE CARD STILL WRITES NOTHING: Save hands the changes to the page, which writes the agent move through the old
 *    details save, the agent's details through the agent card's save path, and the notes through the notes path.
 * ⚠️ NO NATIVE <select>: every choice is the app's own small menu, anchored to the value and flipping up when there is
 *    no room below (the logging flow's popover family).
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

export interface AgentDetails {
  /** reply time in weeks, or not stated */
  weeks: number | null;
  /** "no reply means no" (true), "always replies" (false), or not stated */
  nrmn: boolean | null;
  /** what the agent asks for, as stored on the agent (materialsWanted) */
  asks: string[];
  /** how they take queries (the agent's submissionMethod), or not stated */
  method: string | null;
  wishlist: string;
  email: string;
  website: string;
}
export interface EditAgent { id: string; name: string; agency: string | null }
export interface EditNote { id: string; text: string; when: string }
export interface CardEditData {
  agentId: string;
  agents: EditAgent[];
  detailsOf: (agentId: string) => AgentDetails | null;
  notes: EditNote[];
}
/** what Save hands the page: only what changed */
export interface CardEdits {
  /** the agent the query moves to, or null */
  agentId: string | null;
  /** the agent whose details changed (the one shown in the Agent tab) */
  detailsAgentId: string;
  details: Partial<AgentDetails>;
  notes: { updated: { id: string; text: string }[]; deleted: string[]; added: string[] };
}

export type EdKey = "agent" | "weeks" | "nrmn" | "asks" | "method" | "wishlist" | "email" | "website" | "notes";
export const ED_LABEL: Record<EdKey, string> = {
  agent: "agent", weeks: "reply time", nrmn: "no reply means no", asks: "asks for", method: "how to submit",
  wishlist: "wishlist", email: "email", website: "website", notes: "notes",
};
const DETAIL_KEYS = ["weeks", "nrmn", "asks", "method", "wishlist", "email", "website"] as const;
export const REPLY_WEEKS = [4, 6, 8, 12] as const;
/** the stored submission methods (types.ts SubmissionMethod) and their words */
export const METHODS: { v: string; label: string }[] = [
  { v: "Email", label: "Email" }, { v: "Query Manager", label: "QueryManager" }, { v: "Online Form", label: "Online form" }, { v: "Post", label: "Post" },
];
/** the asks menu: the agent materials encoder's own spellings (lib/agentMaterials buildAgentMaterials) */
export const ASK_POOL = ["Query letter", "Synopsis", "First 5 pages", "First 10 pages", "First 50 pages", "First 3 chapters"];

type NoteDraft = { id: string | null; text: string; gone?: boolean };
interface Draft { agentId: string; base: AgentDetails; details: AgentDetails; notes: NoteDraft[] }

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const EMPTY: AgentDetails = { weeks: null, nrmn: null, asks: [], method: null, wishlist: "", email: "", website: "" };

/** the draft and its sums — a pure core the card's state wraps */
export function draftOf(d: CardEditData): Draft {
  const det = d.detailsOf(d.agentId) ?? EMPTY;
  return { agentId: d.agentId, base: det, details: { ...det, asks: [...det.asks] }, notes: d.notes.map((n) => ({ id: n.id, text: n.text })) };
}
export function changedKeys(dr: Draft, d: CardEditData): EdKey[] {
  const out: EdKey[] = [];
  if (dr.agentId !== d.agentId) out.push("agent");
  for (const k of DETAIL_KEYS) {
    const a = dr.details[k], b = dr.base[k];
    if (typeof a === "string" || typeof b === "string" ? String(a ?? "").trim() !== String(b ?? "").trim() : !same(a, b)) out.push(k);
  }
  if (notesChanged(dr, d)) out.push("notes");
  return out;
}
function notesChanged(dr: Draft, d: CardEditData): boolean {
  return dr.notes.some((n) => (n.id == null ? !n.gone && n.text.trim() !== "" : n.gone || n.text.trim() !== (d.notes.find((x) => x.id === n.id)?.text ?? "").trim()));
}
export function editsOf(dr: Draft, d: CardEditData): CardEdits {
  const ch = changedKeys(dr, d);
  const details: Partial<AgentDetails> = {};
  for (const k of DETAIL_KEYS) if (ch.includes(k)) (details as Record<string, unknown>)[k] = dr.details[k];
  const orig = new Map(d.notes.map((n) => [n.id, n.text]));
  return {
    agentId: ch.includes("agent") ? dr.agentId : null,
    detailsAgentId: dr.agentId,
    details,
    notes: {
      updated: dr.notes.filter((n) => n.id && !n.gone && n.text.trim() && n.text.trim() !== (orig.get(n.id) ?? "").trim()).map((n) => ({ id: n.id!, text: n.text.trim() })),
      /* a note emptied in place is deleted, as the Delete link would */
      deleted: dr.notes.filter((n) => n.id && (n.gone || !n.text.trim())).map((n) => n.id!),
      added: dr.notes.filter((n) => !n.id && !n.gone && n.text.trim()).map((n) => n.text.trim()),
    },
  };
}
export const changeWords = (n: number) => `${n} unsaved change${n === 1 ? "" : "s"}`;

/* ── the card's edit state ─────────────────────────────────────────────────────────────────────────────────────── */

export interface EditLayer {
  on: boolean;
  dr: Draft | null;
  data: CardEditData | null;
  keys: EdKey[];
  open: EdKey | null;
  anchor: HTMLElement | null;
  leave: boolean;
  nudge: number;
  busy: boolean;
  start: (open?: EdKey | null, anchor?: HTMLElement | null) => void;
  setOpen: (k: EdKey | null, anchor?: HTMLElement | null) => void;
  patch: (p: Partial<AgentDetails>) => void;
  setAgent: (id: string) => void;
  setNotes: (f: (n: NoteDraft[]) => NoteDraft[]) => void;
  /** Stop editing / Cancel / Esc / close: with changes, ask first */
  ask: (then?: () => void) => void;
  lose: () => void;
  keep: () => void;
  save: () => Promise<void>;
}

export function useEditLayer(data: CardEditData | undefined, onSave: ((e: CardEdits) => Promise<boolean>) | undefined, resetKey: string): EditLayer {
  const [on, setOn] = useState(false);
  const [dr, setDr] = useState<Draft | null>(null);
  const [open, setOpenK] = useState<EdKey | null>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [leave, setLeave] = useState(false);
  const [nudge, setNudge] = useState(0);
  const [busy, setBusy] = useState(false);
  const after = useRef<(() => void) | null>(null);
  /* another query: out of edit mode, nothing carried */
  useEffect(() => { setOn(false); setDr(null); setOpenK(null); setLeave(false); }, [resetKey]);
  const keys = on && dr && data ? changedKeys(dr, data) : [];
  const stop = () => { setOn(false); setDr(null); setOpenK(null); setAnchor(null); setLeave(false); };
  return {
    on, dr, data: data ?? null, keys, open, anchor, leave, nudge, busy,
    start: (k = null, a = null) => {
      if (!data) return;
      setDr((x) => x ?? draftOf(data)); setOn(true); setLeave(false); setOpenK(k); setAnchor(a);
    },
    setOpen: (k, a = null) => { setOpenK(k); setAnchor(a); },
    patch: (p) => setDr((x) => (x ? { ...x, details: { ...x.details, ...p } } : x)),
    setAgent: (id) => setDr((x) => {
      if (!x || !data) return x;
      if (id === x.agentId) return x;
      /* the Agent tab shows the agent the query is to: moving it shows the new agent's details, as stored */
      const det = data.detailsOf(id) ?? EMPTY;
      return { ...x, agentId: id, base: det, details: { ...det, asks: [...det.asks] } };
    }),
    setNotes: (f) => setDr((x) => (x ? { ...x, notes: f(x.notes) } : x)),
    ask: (then) => {
      if (keys.length) { after.current = then ?? null; setOpenK(null); setLeave(true); return; }
      stop(); then?.();
    },
    lose: () => { const t = after.current; after.current = null; stop(); t?.(); },
    keep: () => { after.current = null; setLeave(false); setNudge((n) => n + 1); },
    save: async () => {
      if (!dr || !data || !onSave || !keys.length || busy) return;
      setBusy(true);
      try {
        const ok = await onSave(editsOf(dr, data));
        if (ok) { const t = after.current; after.current = null; stop(); t?.(); }
      } finally { setBusy(false); }
    },
  };
}

/* ── the parts ─────────────────────────────────────────────────────────────────────────────────────────────────── */

const PEN = <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 2.5l2.5 2.5L5.5 13H3v-2.5z" /></svg>;
const CARD = <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="2" y="3" width="12" height="10" rx="2" /><circle cx="6" cy="7" r="1.6" /><path d="M4 11c.6-1.3 1.4-2 2-2s1.4.7 2 2M10 6.5h2.5M10 9h2.5" /></svg>;

/** the band in edit mode: pale navy, a pencil disc, "Editing", the line, Stop editing */
export const EditStrip: React.FC<{ n: number; onStop: () => void }> = ({ n, onStop }) => (
  <span className="qc152-edstrip" data-qc152="edit-strip">
    <span className="qc152-pi" aria-hidden="true">{PEN}</span>
    <b data-qc152="edit-title">Editing</b>
    <span data-qc152="edit-line">{n ? "Nothing’s saved until you press Save" : "Click anything underlined"}</span>
    <button type="button" data-qc152="edit-stop" onClick={onStop}>Stop editing</button>
  </span>
);

/** the footer in edit mode: solid navy, the count, what changed, Cancel and Save changes */
export const SaveBar: React.FC<{ keys: EdKey[]; nudge: number; busy: boolean; onCancel: () => void; onSave: () => void }> = ({ keys, nudge, busy, onCancel, onSave }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !nudge) return;
    el.classList.remove("nudge"); void el.offsetWidth; el.classList.add("nudge");
  }, [nudge]);
  const n = keys.length;
  const labels = [...new Set(keys.map((k) => ED_LABEL[k]))];
  return (
    <div ref={ref} className="qc152-ebar" data-qc152="save-bar" data-n={n}>
      <div className="qc152-efl"><b data-qc152="save-title">{n ? changeWords(n) : "No changes yet"}</b>
        <span data-qc152="save-line">{n ? labels.join(", ") : "Click anything underlined, on any tab."}</span></div>
      <button type="button" className="qc152-elnk" data-qc152="edit-cancel" onClick={onCancel}>Cancel</button>
      <button type="button" className="qc152-ebtn" data-qc152="save-changes" disabled={!n || busy} onClick={onSave}>{busy ? "Saving…" : "Save changes"}</button>
    </div>
  );
};

export const LeaveAsk: React.FC<{ n: number; busy: boolean; onLose: () => void; onKeep: () => void; onSave: () => void }> = ({ n, busy, onLose, onKeep, onSave }) => (
  <div className="qc152-leave" role="alertdialog" aria-label="Unsaved changes" data-qc152="leave">
    <span>Stop editing and lose {n} change{n === 1 ? "" : "s"}?</span><span className="sp" />
    <button type="button" className="qc152-llnk" data-qc152="leave-lose" onClick={onLose}>Lose them</button>
    <button type="button" className="qc152-llnk" data-qc152="leave-keep" onClick={onKeep}>Keep editing</button>
    <button type="button" className="qc152-lbtn" data-qc152="leave-save" disabled={busy} onClick={onSave}>Save</button>
  </div>
);

/** an editable value: a dotted underline in edit mode; double-click enters edit mode with its menu open */
export const Ed: React.FC<{ k: EdKey; layer: EditLayer; changed?: boolean; className?: string; style?: React.CSSProperties; label?: string; children: React.ReactNode }> = ({ k, layer, changed, className, style, label, children }) => (
  <button type="button" className={`qc152-ed${changed ? " chg" : ""}${layer.open === k ? " open" : ""}${className ? ` ${className}` : ""}`} style={style}
    data-ed={k} data-qc152="ed" aria-label={label} aria-haspopup={layer.on ? "dialog" : undefined} aria-expanded={layer.on ? layer.open === k : undefined}
    onClick={(e) => { if (!layer.on) return; if (layer.open === k) layer.setOpen(null); else layer.setOpen(k, e.currentTarget); }}
    onDoubleClick={(e) => { if (layer.on) return; layer.start(k, e.currentTarget); }}>
    {children}
  </button>
);

/** a text value typed straight onto a dashed rule (no box) */
export const Inl: React.FC<{ k: EdKey; value: string; base: string; rows?: number; label: string; onChange: (v: string) => void; autoFocus?: boolean }> = ({ k, value, base, rows, label, onChange, autoFocus }) => {
  const chg = value.trim() !== base.trim();
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null);
  useEffect(() => { if (autoFocus) ref.current?.focus(); }, [autoFocus]);
  return rows ? (
    <textarea ref={ref} className={`qc152-inl${chg ? " chg" : ""}`} data-inl={k} data-qc152="inl" aria-label={label} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
  ) : (
    <input ref={ref} className={`qc152-inl${chg ? " chg" : ""}`} data-inl={k} data-qc152="inl" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} />
  );
};

/** the anchored menu: under its value, or above it when there is no room below the card's foot */
export const EdMenu: React.FC<{ root: HTMLElement | null; anchor: HTMLElement | null; onClose: () => void; children: React.ReactNode }> = ({ root, anchor, onClose, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; up: boolean } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !root || !anchor) return;
    const r = anchor.getBoundingClientRect(), cr = root.getBoundingClientRect();
    const h = el.offsetHeight, w = el.offsetWidth;
    let top = r.bottom - cr.top + 6, up = false;
    if (top + h > cr.height - 70) { top = r.top - cr.top - h - 6; up = true; }
    setPos({ top: Math.max(8, top), left: Math.max(8, Math.min(r.left - cr.left, cr.width - w - 8)), up });
  }, [root, anchor, children]);
  /* a click anywhere else closes it; the value that opened it toggles it itself */
  useEffect(() => {
    const off = (e: PointerEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || anchor?.contains(t)) return;
      onClose();
    };
    document.addEventListener("pointerdown", off, true);
    return () => document.removeEventListener("pointerdown", off, true);
  }, [anchor, onClose]);
  return (
    <div ref={ref} className="qc152-pp" role="dialog" data-qc152="ed-menu" data-up={pos?.up ? "" : undefined}
      style={pos ? { top: pos.top, left: pos.left } : { top: -9999, left: -9999 }}>{children}</div>
  );
};
export const MenuItem: React.FC<{ on: boolean; label: string; sub?: string | null; onPick: () => void; data?: string }> = ({ on, label, sub, onPick, data }) => (
  <button type="button" className="qc152-it" data-qc152="ed-item" data-v={data} aria-pressed={on} onClick={onPick}>
    <span className="ck" aria-hidden="true">{on ? "✓" : ""}</span>{label}{sub ? <small>{sub}</small> : null}
  </button>
);

/** the Agent tab in edit mode: the strip read-only (it belongs to the Query sent step), then the agent's own details */
export const AgentEditPane: React.FC<{
  layer: EditLayer; first: string; strip: React.ReactNode; onQueryStep: (() => void) | null;
}> = ({ layer, first, strip, onQueryStep }) => {
  const dr = layer.dr!;
  const d = dr.details, b = dr.base;
  const ch = (k: EdKey) => layer.keys.includes(k);
  return (
    <div className="qc152-agt qc152-agt-ed" data-qc152="agent-pane" data-editing="">
      {strip}
      <p className="qc152-qsnote" data-qc152="query-step-note">The query’s date, method and package belong to its first step:{" "}
        {onQueryStep ? <button type="button" className="qc152-lk2" data-qc152="edit-query-step" onClick={onQueryStep}>edit the Query sent step</button> : "edit the Query sent step"}.</p>
      <div className="qc152-agsec" data-qc152="agent-section">{first}’s details{" "}
        <small><span className="qc152-share">{CARD} changes here update {first}’s Contact list card too</span></small></div>
      <dl className="qc152-agf">
        <dt>Replies in</dt>
        <dd data-qc152="reply-in">
          <span className={`qc152-seg2${ch("weeks") ? " chg" : ""}`} role="radiogroup" aria-label="Reply time">
            {REPLY_WEEKS.map((w) => <button key={w} type="button" role="radio" aria-checked={d.weeks === w} className={d.weeks === w ? "on" : undefined} data-qc152="reply-opt" data-w={w}
              onClick={() => layer.patch({ weeks: w })}>{w} weeks</button>)}
          </span><br />
          <button type="button" className={`qc152-tgl${d.nrmn ? " on" : ""}${ch("nrmn") ? " chg" : ""}`} role="switch" aria-checked={!!d.nrmn} data-qc152="nrmn"
            onClick={() => layer.patch({ nrmn: !d.nrmn })}><i aria-hidden="true" />No reply means no</button>
        </dd>
        <dt>Asks for</dt>
        <dd data-qc152="asks" className="qc152-row">
          <span className="qc152-askc">
            {d.asks.map((a, i) => <i key={`${a}-${i}`} data-qc152="ask">{a}<button type="button" className="qc152-arm" aria-label={`Remove ${a}`} data-qc152="ask-remove"
              onClick={() => layer.patch({ asks: d.asks.filter((_, j) => j !== i) })}>×</button></i>)}
            <Ed k="asks" layer={layer} className="qc152-add2" label={`Add what ${first} asks for`}>+ Add</Ed>
          </span>
          {ch("asks") ? <span className="qc152-chgdot" aria-hidden="true" /> : null}
        </dd>
        <dt>How to submit</dt>
        <dd data-qc152="how"><Ed k="method" layer={layer} changed={ch("method")}>{METHODS.find((m) => m.v === d.method)?.label ?? d.method ?? `Not stated`}</Ed></dd>
        <dt>Wishlist</dt>
        <dd><Inl k="wishlist" rows={2} label={`${first}’s wishlist`} value={d.wishlist} base={b.wishlist} onChange={(v) => layer.patch({ wishlist: v })} /></dd>
        <dt>Contact</dt>
        <dd className="qc152-cgrid">
          <Inl k="email" label={`${first}’s email`} value={d.email} base={b.email} onChange={(v) => layer.patch({ email: v })} />
          <Inl k="website" label={`${first}’s website`} value={d.website} base={b.website} onChange={(v) => layer.patch({ website: v })} />
        </dd>
      </dl>
    </div>
  );
};

/** the Notes tab in edit mode: every note on a dashed line, Delete on hover, + Add a note */
export const NotesEditPane: React.FC<{ layer: EditLayer; data: CardEditData }> = ({ layer, data }) => {
  const dr = layer.dr!;
  const [fresh, setFresh] = useState<number | null>(null);
  return (
    <div className="qc152-notes-ed" data-qc152="notes-edit">
      {dr.notes.map((n, i) => n.gone ? null : (
        <div key={n.id ?? `new-${i}`} className="qc152-nt2" data-qc152="note-edit">
          <Inl k="notes" rows={2} label="Note" value={n.text} base={n.id ? data.notes.find((x) => x.id === n.id)?.text ?? "" : ""} autoFocus={fresh === i}
            onChange={(v) => layer.setNotes((ns) => ns.map((x, j) => (j === i ? { ...x, text: v } : x)))} />
          <button type="button" className="qc152-add2 qc152-ndel" data-qc152="note-delete" onClick={() => layer.setNotes((ns) => (n.id ? ns.map((x, j) => (j === i ? { ...x, gone: true } : x)) : ns.filter((_, j) => j !== i)))}>Delete</button>
        </div>
      ))}
      <button type="button" className="qc152-add2 always" data-qc152="note-add" onClick={() => { setFresh(dr.notes.length); layer.setNotes((ns) => [...ns, { id: null, text: "" }]); }}>+ Add a note</button>
    </div>
  );
};
