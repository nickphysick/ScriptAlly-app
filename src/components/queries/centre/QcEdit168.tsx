/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query card v168 (design-refs/query-card-v168/query-card-v168.html, "One way to edit") — THE ONE WAY TO EDIT ON THE
 * SLIDE-IN QUERY CARD. Hover shows a pencil on the thing; the pencil opens that one thing where it is, with a cross and a
 * tick where the pencil was; the tick saves it; the card's own toast offers Undo. Exported for the agent card to use next.
 *
 *   EditPen     — a 26px white disc on the top-right corner of what it edits. ABSOLUTELY PLACED: showing it changes no
 *                 size or position (lock L2 of qc168.measure.ts makes it static and must go red).
 *   CrossTick   — the cross and the tick, 30px, 8px apart, at the right end of the open thing's heading row. The tick is
 *                 disabled (38%) until something has changed.
 *   DiscardAsk  — the one question, a row inside the open thing: "Discard your changes?" · Keep editing · Discard.
 *   Edit168Ctx  — the rule they share: ONE THING OPEN AT A TIME. Whatever is open holds the card (`useHold168`); every
 *                 other door on the card goes through `guard`: unchanged → it closes and the click goes on; changed → the
 *                 question shows in it, scrolled into view, and nothing else happens. The CROSS is different: with
 *                 changes it discards at once and the card's toast says "Changes discarded", whose Undo reopens it with
 *                 the draft (`seedOf`).
 *
 * ⚠️ THE PARTS WRITE NOTHING. A save is the host's (the page's existing writes, through the card's props).
 * ⚠️ THE CARD'S SMALL MENU (`CardMenu`, `CardMenuItem`) is the edit layer's anchored menu, kept: the band's ⋯, the move
 *    list ("Who’s this query to?") and a note's ⋯ all use it. No second menu.
 */
import React, { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";

const PEN = <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.5 2.5l3 3L6 13H3v-3z" /></svg>;
const TICK = <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3.5 8.5 3 3 6-7" /></svg>;
const CROSS = <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>;

/* ── the one-open rule ─────────────────────────────────────────────────────────────────────────────────────────────── */

export interface Hold168 {
  /** "step:{activityId}", "grp:{key}", "note:{id}", "quote:{key}", "prof" */
  key: string;
  dirty: boolean;
  /** the draft as it stands (handed back by `seedOf` after the cross's Undo) */
  draft: unknown;
  /** close it, losing what changed */
  close: () => void;
  /** open it again (the cross's Undo) */
  reopen: () => void;
}
export interface Edit168 {
  /** true only for the default value: no card above holds the rule (a part may then hold its own) */
  local?: boolean;
  /** the key of what is open, or null */
  open: string | null;
  /** the question is showing in what is open */
  asking: boolean;
  /** the door every other control goes through */
  guard: (go: () => void) => void;
  /** Esc, or a "Cancel"-type leave: unchanged → close; changed → ask */
  leave: () => void;
  /** the cross: unchanged → close; changed → close, and the toast offers Undo */
  cross: () => void;
  keep: () => void;
  discard: () => void;
  /** the draft the cross's Undo hands back to `key` (until it closes) */
  seedOf: (key: string) => unknown;
  /** set by the editor that is open, every render; released by it as it closes */
  hold: (h: Hold168) => void;
  release: (key: string) => void;
}
const noop = () => {};
export const Edit168Ctx = createContext<Edit168>({
  local: true, open: null, asking: false, guard: (go) => go(), leave: noop, cross: noop, keep: noop, discard: noop, seedOf: () => undefined, hold: noop, release: noop,
});
export const useEdit168 = () => useContext(Edit168Ctx);

/** the card's state for the rule. `toast` shows the card's own toast ("Changes discarded", with its Undo). */
export function useEditRule168(resetKey: string, toast: (msg: string, undo: (() => void) | null) => void, root: () => HTMLElement | null): Edit168 {
  const held = useRef<Hold168 | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const then = useRef<(() => void) | null>(null);
  const seeds = useRef(new Map<string, unknown>());
  useEffect(() => { held.current = null; setOpen(null); setAsking(false); then.current = null; seeds.current.clear(); }, [resetKey]);
  /* the question, once shown, is scrolled into view */
  useLayoutEffect(() => {
    if (!asking) return;
    root()?.querySelector<HTMLElement>("[data-qc168='ask']")?.scrollIntoView({ block: "nearest" });
  }, [asking]); // eslint-disable-line react-hooks/exhaustive-deps
  const shut = () => { const h = held.current; held.current = null; setOpen(null); setAsking(false); if (h) { seeds.current.delete(h.key); h.close(); } };
  const ask = (go: (() => void) | null) => { then.current = go; setAsking(true); };
  return {
    open, asking,
    guard: (go) => {
      /* lock L9's mutation, "allow two": the click goes on and what was open stays open */
      if (mut168("9")) { go(); return; }
      const h = held.current;
      if (!h) { go(); return; }
      if (h.dirty) { ask(go); return; }
      shut(); go();
    },
    leave: () => { const h = held.current; if (!h) return; if (h.dirty) ask(null); else shut(); },
    cross: () => {
      const h = held.current;
      if (!h) return;
      if (!h.dirty) { shut(); return; }
      const draft = h.draft, k = h.key, reopen = h.reopen;
      shut();
      toast("Changes discarded", () => { seeds.current.set(k, mut168("4") ? undefined : draft); reopen(); });
    },
    keep: () => { then.current = null; setAsking(false); },
    discard: () => { const go = then.current; then.current = null; shut(); go?.(); },
    /* read during render (twice under StrictMode): kept until the thing it seeded closes */
    seedOf: (k) => seeds.current.get(k),
    hold: (h) => {
      if (held.current && held.current.key !== h.key) setAsking(false);
      held.current = h; setOpen(h.key);
    },
    release: (k) => { seeds.current.delete(k); if (held.current?.key !== k) return; held.current = null; setOpen(null); setAsking(false); },
  };
}

/** an editor's side of the rule: hold the card while mounted, with its draft kept current */
export function useHold168(key: string, dirty: boolean, draft: unknown, close: () => void, reopen: () => void) {
  const ed = useEdit168();
  const latest = useRef({ dirty, draft, close, reopen });
  latest.current = { dirty, draft, close, reopen };
  /* each render refreshes what the card holds (its dirtiness and draft) */
  useLayoutEffect(() => {
    ed.hold({ key, dirty, draft, close: () => latest.current.close(), reopen: () => latest.current.reopen() });
  });
  const rel = useRef(ed.release);
  rel.current = ed.release;
  useLayoutEffect(() => () => rel.current(key), [key]);
  return ed;
}

/**
 * Review aid (dev and the emulator build only — production ships none of it): qc168.measure.ts's named mutations, each
 * the undoing of one lock's subject. `window.__qc168mut = ["5"]` before the page loads.
 */
export function mut168(k: string): boolean {
  if (import.meta.env.MODE === "production") return false;
  const m = (globalThis as { __qc168mut?: unknown }).__qc168mut;
  return Array.isArray(m) && m.includes(k);
}

/* ── the parts ─────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** the pencil: a real button, absolutely placed on its host's top-right corner (its host is `position: relative`) */
export const EditPen: React.FC<{ label: string; onOpen: () => void; className?: string; data?: Record<string, string> }> = ({ label, onOpen, className, data }) => (
  <button type="button" className={`qc168-pen${className ? ` ${className}` : ""}`} data-qc168="pen" aria-label={`Edit ${label}`} title={`Edit ${label}`}
    onClick={(e) => { e.stopPropagation(); onOpen(); }} {...data}>{PEN}</button>
);

/** the ⋯ disc beside a pencil: the same disc, its menu below */
export const MoreDisc: React.FC<{ label: string; open: boolean; onOpen: (el: HTMLElement) => void }> = ({ label, open, onOpen }) => (
  <button type="button" className="qc168-pen qc168-more" data-qc168="more" aria-label={label} title={label} aria-haspopup="menu" aria-expanded={open}
    onClick={(e) => { e.stopPropagation(); onOpen(e.currentTarget); }}>⋯</button>
);

/** the cross and the tick, where the pencil was */
export const CrossTick: React.FC<{ dirty: boolean; busy?: boolean; onCross: () => void; onTick: () => void;
  /** Agent card v2.2 — the tick's press (the card presses in at the pointer before the save), and what each names */
  onTickDown?: () => void; what?: string }> = ({ dirty, busy, onCross, onTick, onTickDown, what }) => (
  <span className="qc168-ct" data-qc168="ct">
    <button type="button" className="qc168-tc x" data-qc168="cross" aria-label={what ? `Discard changes to ${what}` : "Discard changes"} title="Discard changes" onClick={onCross}>{CROSS}</button>
    <button type="button" className="qc168-tc k" data-qc168="tick" aria-label={what ? `Save ${what}` : "Save"} title="Save" disabled={(!dirty && !mut168("3")) || !!busy} onPointerDown={onTickDown} onClick={onTick}>{TICK}</button>
  </span>
);

/** the one question, inside what is open */
export const DiscardAsk: React.FC<{ onKeep: () => void; onDiscard: () => void; className?: string;
  /** Agent card v2.2 — the question naming what is open ("Discard your changes to the wishlist?") */
  words?: string }> = ({ onKeep, onDiscard, className, words = "Discard your changes?" }) => (
  <div className={`qc168-ask${className ? ` ${className}` : ""}`} role="alertdialog" aria-label={words} data-qc168="ask">
    <span>{words}</span><span className="sp" />
    <button type="button" className="qc168-lk" data-qc168="keep" onClick={onKeep}>Keep editing</button>
    <button type="button" className="qc1522-btn nv sm" data-qc168="discard" onClick={onDiscard}>Discard</button>
  </div>
);

/** a delete's own question, inside what is open: "Delete this note?" · Keep it · Delete */
export const DeleteAsk: React.FC<{ words: string; busy?: boolean; onKeep: () => void; onDelete: () => void }> = ({ words, busy, onKeep, onDelete }) => (
  <div className="qc168-ask" role="alertdialog" aria-label={words} data-qc168="delete-ask">
    <span>{words}</span><span className="sp" />
    <button type="button" className="qc168-lk" data-qc168="delete-keep" onClick={onKeep}>Keep it</button>
    <button type="button" className="qc1522-btn nv sm" data-qc168="delete-ok" disabled={!!busy} onClick={onDelete}>Delete</button>
  </div>
);

/** the card's small menu, anchored to what opened it, flipping up when there is no room below the card's foot */
/* With no `root` the menu is placed by its CSS inside its (positioned) host: a note's ⋯ menu, under the disc, or above it
   on the last note (`up`). */
export const CardMenu: React.FC<{ root: HTMLElement | null; anchor: HTMLElement | null; onClose: () => void; label?: string; children: React.ReactNode; hook?: string; up?: boolean }> = ({ root, anchor, onClose, label, children, hook, up }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; up: boolean } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !root || !anchor) return;
    /* layout boxes summed up to the card: the panel leans, so bounding boxes would move when nothing has */
    let x = 0, y = 0;
    for (let n: HTMLElement | null = anchor; n && n !== root; n = n.offsetParent as HTMLElement | null) { x += n.offsetLeft; y += n.offsetTop; }
    const h = el.offsetHeight, w = el.offsetWidth;
    let top = y + anchor.offsetHeight + 6, up = false;
    if (top + h > root.offsetHeight - 70) { top = y - h - 6; up = true; }
    setPos({ top: Math.max(8, top), left: Math.max(8, Math.min(x + anchor.offsetWidth - w, root.offsetWidth - w - 8)), up });
  }, [root, anchor, children]);
  useEffect(() => {
    const off = (e: PointerEvent) => { const t = e.target as Node; if (ref.current?.contains(t) || anchor?.contains(t)) return; onClose(); };
    document.addEventListener("pointerdown", off, true);
    return () => document.removeEventListener("pointerdown", off, true);
  }, [anchor, onClose]);
  /* ONE Escape cascade (lib/escapeStack): the menu is a popup inside the card, so it hears the key before the card
     (and any editor open in it) — a listener of its own would lose to the stack's window listener and close the card */
  useEscapeLayer(true, () => { onClose(); anchor?.focus(); }, ESC_LEVEL.cardPopup);
  useEffect(() => { ref.current?.querySelector<HTMLElement>("button")?.focus({ preventScroll: true }); }, []);
  return (
    <div ref={ref} className={`qc152-pp qc168-mn${root ? "" : " nm"}${!root && up ? " up" : ""}`} role="menu" aria-label={label} data-qc152="ed-menu" data-qc168={hook ?? "menu"} data-up={pos?.up || (!root && up) ? "" : undefined}
      style={!root ? undefined : pos ? { top: pos.top, left: pos.left } : { top: -9999, left: -9999 }}>{children}</div>
  );
};
export const CardMenuItem: React.FC<{ label: string; sub?: string | null; on?: boolean; rust?: boolean; onPick: () => void; data?: Record<string, string> }> = ({ label, sub, on, rust, onPick, data }) => (
  <button type="button" role="menuitem" className={`qc152-it${rust ? " rust" : ""}`} data-qc152="ed-item" aria-pressed={on} onClick={onPick} {...data}>
    {on !== undefined ? <span className="ck" aria-hidden="true">{on ? "✓" : ""}</span> : null}{label}{sub ? <small>{sub}</small> : null}
  </button>
);
