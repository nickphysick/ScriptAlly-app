/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ListPills — the labelled list controls (Contact list v13, ruling Q1; the v126 Birds-eye drawer's
 * pill model, lifted into a shared component and dressed for a light ground). Four parts:
 *
 *   ListPill     "⛉ Filters (2)", "☰ Grouped: Letter ⌄", "Sort: Surname ⌄" — anthracite when set
 *   DirToggle    the arrow joined to the Sort pill; its label names the order ("A to Z", "Fastest first")
 *   usePopover   ONE popover at a time: an outside press closes it, Escape closes only it, a page
 *                scroll closes it (a fixed panel cannot follow its anchor)
 *   Popover      the panel, portalled to `body`, fixed under its anchor, with sections, options and a foot
 *
 * ⚠️ ONLY THE CONTACT LIST USES IT IN THIS PACK. The Query Centre's list banner keeps its own icon
 * pills (`QcSentence`) and its drawer its own (`QcBirdsDrawer`); adopting this is a recorded follow-up.
 * ⚠️ ESCAPE IS THE APP'S ONE STACK (lib/escapeStack, `ESC_LEVEL.page`): the popover is a layer, so
 * Escape with it open closes the popover and reaches nothing else.
 * ⚠️ LITERAL COLOURS: the panel portals to `body`, where no page's tokens resolve.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ESC_LEVEL, useEscapeLayer } from "../../lib/escapeStack";
import "./listPills.css";

/* ── the pill ──────────────────────────────────────────────────────────────────────────────── */
export interface ListPillProps {
  /** a stable key — the popover it opens, and its probe (`data-lp`) */
  k: string;
  icon?: React.ReactNode;
  /** the muted lead-in: "Grouped:", "Sort:" */
  prefix?: string;
  /** the value or the plain label: "Letter", "Filters" */
  value: React.ReactNode;
  /** a count in brackets after the value: "Filters (2)" */
  count?: number;
  /** away from its default → anthracite */
  set?: boolean;
  open?: boolean;
  caret?: boolean;
  joined?: boolean;
  onPress: (anchor: HTMLElement) => void;
}
export const ListPill: React.FC<ListPillProps> = ({ k, icon, prefix, value, count, set, open, caret, joined, onPress }) => (
  <button
    type="button"
    className={`lp${set ? " is-set" : ""}${joined ? " lp--joined" : ""}`}
    data-lp={k}
    aria-haspopup="dialog"
    aria-expanded={!!open}
    onClick={(e) => onPress(e.currentTarget)}
  >
    {icon ? <span className="lp-ic" aria-hidden="true">{icon}</span> : null}
    {prefix ? <em>{prefix}</em> : null}
    <b>{value}</b>
    {count ? <span className="lp-n"> ({count})</span> : null}
    {caret ? <span className="lp-car" aria-hidden="true">{"⌄"}</span> : null}
  </button>
);

/** The Sort pill's direction: ↓ in the natural order, ↑ reversed. Its accessible name says which. */
export const DirToggle: React.FC<{ reversed: boolean; label: string; onToggle: () => void }> = ({ reversed, label, onToggle }) => (
  <button
    type="button" className={`lp lp-dir${reversed ? " is-set" : ""}`} data-lp="dir"
    title={`Sort order: ${label}`} aria-label={`Sort order: ${label}`} onClick={onToggle}
  >{reversed ? "↑" : "↓"}</button>
);

/* ── one popover at a time ─────────────────────────────────────────────────────────────────── */
export interface PopoverState<K extends string> {
  open: K | null;
  anchor: HTMLElement | null;
  toggle: (k: K, anchor: HTMLElement) => void;
  close: () => void;
}
export function usePopover<K extends string>(): PopoverState<K> {
  const [open, setOpen] = useState<K | null>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = useCallback(() => { setOpen(null); setAnchor(null); }, []);
  const toggle = useCallback((k: K, a: HTMLElement) => {
    setOpen((cur) => (cur === k ? null : k));
    setAnchor((cur) => (cur === a ? null : a));
  }, []);
  useEscapeLayer(open !== null, close, ESC_LEVEL.page);

  /* an outside press (capture) closes it; the panel and the pill that opened it are inside */
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      if (anchor?.contains(t) || (t instanceof Element && t.closest(".lpop"))) return;
      /* another pill: its own click toggles; closing here first would reopen it on the same press */
      if (t instanceof Element && t.closest("[data-lp]")) return;
      close();
    };
    /* a page scroll closes it: the panel is fixed and cannot follow its anchor */
    const scroll = (e: Event) => {
      const t = e.target as Node;
      if (t instanceof Element && t.closest(".lpop")) return;
      close();
    };
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("scroll", scroll, true);
    return () => { document.removeEventListener("pointerdown", down, true); document.removeEventListener("scroll", scroll, true); };
  }, [open, anchor, close]);
  return { open, anchor, toggle, close };
}

/* ── the panel ─────────────────────────────────────────────────────────────────────────────── */
export const Popover: React.FC<{
  k: string; anchor: HTMLElement | null; width: number; label: string; children: React.ReactNode;
}> = ({ k, anchor, width, label, children }) => {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  useLayoutEffect(() => {
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    setPos({ top: r.bottom + 8, left: Math.max(16, Math.min(r.left, window.innerWidth - width - 16)) });
  }, [anchor, width]);
  if (!anchor || !pos) return null;
  return createPortal(
    <div className="lpop" data-lpop={k} role="dialog" aria-label={label}
      style={{ top: pos.top, left: pos.left, width, maxHeight: `calc(100vh - ${Math.round(pos.top) + 16}px)` }}>
      {children}
    </div>,
    document.body,
  );
};

export const PopSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="lpop-sec" data-lpop-sec={title}><h6>{title}</h6>{children}</div>
);

export const PopOption: React.FC<{
  kind: "check" | "radio"; on: boolean; label: React.ReactNode; line?: string; count?: number; k: string;
  onPick: () => void;
}> = ({ kind, on, label, line, count, k, onPick }) => (
  <button type="button" className={`lpop-opt${on ? " on" : ""}`} data-opt={k}
    role={kind === "check" ? "menuitemcheckbox" : "menuitemradio"} aria-checked={on} onClick={onPick}>
    <span className={kind === "check" ? "lpop-bx" : "lpop-rd"} aria-hidden="true">{kind === "check" && on ? "✓" : ""}</span>
    <span className="lpop-lb">{label}{line ? <i>{line}</i> : null}</span>
    {count !== undefined ? <small>{count}</small> : null}
  </button>
);

export const PopRule: React.FC = () => <hr className="lpop-hr" />;

export const PopFoot: React.FC<{ onClear: () => void; onDone: () => void }> = ({ onClear, onDone }) => (
  <div className="lpop-ft">
    <button type="button" data-lpop-clear="" onClick={onClear}>Clear</button>
    <button type="button" className="dn" data-lpop-done="" onClick={onDone}>Done</button>
  </div>
);
