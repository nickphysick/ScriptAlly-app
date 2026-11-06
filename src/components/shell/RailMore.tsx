/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * RailMore — the rail's More button and its panel (sidebar rail v2, 6 Nov). Every page that is not one of the rail's
 * five places, grouped by its section in nav order (`workspaceNav.moreGroups`).
 *
 *   · opens on hover after 120ms, and closes 220ms after the pointer leaves both the button and the panel;
 *   · a click opens it and HOLDS it until a choice, a click outside, or Escape;
 *   · never opens while the full sidebar is floating or pinned (`disabled`); touch screens (hover: none) click only;
 *   · placed 8px right of the rail, its top 14px above the button's, kept inside the window.
 *
 * ⚠️ A MENU BUTTON AND A MENU (WAI-ARIA menu button pattern): Enter / Space / ArrowDown open it on the current row (or
 * the first); arrows, Home and End move; Escape closes and returns focus to More; Tab out closes it. Escape is a layer
 * on the one stack (`ESC_LEVEL.page`), so it never reaches a page's own handler while the panel is open.
 *
 * ⚠️ THE PANEL PORTALS TO `document.body`, so railMore.css scopes every rule to `.wsm` and hands inheritance back from
 * brand.tsx itself.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ShellHit, ShellSection } from "../../lib/workspaceShell";
import { moreGroups, morePageFor, railLabelOf } from "../../lib/workspaceNav";
import { ESC_LEVEL, useEscapeLayer } from "../../lib/escapeStack";
import "./railMore.css";

export const MORE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="5" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="19" cy="12" r="1.4" />
  </svg>
);

export const MORE_FOOT = "The pages you use most live on the rail.";
export const MORE_OPEN_MS = 120;
export const MORE_CLOSE_MS = 220;

const canHover = () => typeof window !== "undefined" && !!window.matchMedia?.("(hover: hover)").matches;

export const RailMore: React.FC<{
  sections: ShellSection[];
  hit: ShellHit | null;
  icons: Record<string, React.ReactNode>;
  locked: ReadonlySet<string>;
  onGo: (path: string) => void;
  /** the full sidebar is floating or pinned: More never opens */
  disabled: boolean;
}> = ({ sections, hit, icons, locked, onGo, disabled }) => {
  const groups = moreGroups(sections);
  const here = morePageFor(sections, hit);
  const [open, setOpen] = useState(false);
  const held = useRef(false);
  const btn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const focusOnOpen = useRef(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const clear = () => { if (timer.current !== undefined) { window.clearTimeout(timer.current); timer.current = undefined; } };
  const close = useCallback((refocus = false) => {
    clear(); held.current = false; setOpen(false);
    if (refocus) btn.current?.focus({ preventScroll: true });
  }, []);
  const show = (hold: boolean, focus = false) => {
    if (disabled) return;
    clear(); if (hold) held.current = true; focusOnOpen.current = focus; setOpen(true);
  };

  /* the full sidebar floating or pinned puts it away */
  useEffect(() => { if (disabled && open) close(); }, [disabled, open, close]);
  /* a page change (a choice, or anything else) puts it away */
  useEffect(() => { close(); }, [hit?.section, hit?.child, close]);
  useEffect(() => () => clear(), []);
  useEscapeLayer(open, () => close(true), ESC_LEVEL.page);

  /* a click outside both closes it (and is the only way out of a held panel besides a choice or Escape) */
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      if (btn.current?.contains(t) || panel.current?.contains(t)) return;
      close();
    };
    document.addEventListener("pointerdown", down, true);
    return () => document.removeEventListener("pointerdown", down, true);
  }, [open, close]);

  /* placed beside the rail, kept inside the window; then focus, when the keyboard opened it */
  useLayoutEffect(() => {
    if (!open) { setPos(null); return; }
    const b = btn.current, p = panel.current;
    if (!b) return;
    const rail = (b.closest(".wsr") as HTMLElement | null)?.getBoundingClientRect() ?? b.getBoundingClientRect();
    const r = b.getBoundingClientRect();
    const h = p?.offsetHeight ?? 0;
    const top = Math.max(8, Math.min(r.top - 14, window.innerHeight - h - 8));
    setPos({ left: rail.right + 8, top });
    if (focusOnOpen.current && p) {
      focusOnOpen.current = false;
      (p.querySelector<HTMLElement>('[aria-current="page"]') ?? p.querySelector<HTMLElement>('[role="menuitem"]'))?.focus({ preventScroll: true });
    }
  }, [open]);

  /* hover: in after 120ms, out 220ms after leaving both; a held panel ignores the pointer */
  const enter = () => {
    if (disabled || !canHover()) return;
    clear();
    if (!open) timer.current = window.setTimeout(() => show(false), MORE_OPEN_MS);
  };
  const leave = () => {
    if (!canHover()) return;
    clear();
    if (open && !held.current) timer.current = window.setTimeout(() => close(), MORE_CLOSE_MS);
    else if (!open) clear();
  };

  const onBtnKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") { e.preventDefault(); show(true, true); }
  };
  const onMenuKey = (e: React.KeyboardEvent) => {
    const items = [...(panel.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    const go = (n: number) => { e.preventDefault(); items[(n + items.length) % items.length]?.focus(); };
    if (e.key === "ArrowDown") go(i + 1);
    else if (e.key === "ArrowUp") go(i - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(items.length - 1);
    else if (e.key === "Tab") close();
  };
  const choose = (path: string) => { close(); onGo(path); };

  return (
    <>
      <button
        ref={btn}
        type="button"
        className={`wsr-ni wsr-more${here ? " wsr-on" : ""}${open ? " wsr-moreopen" : ""}`}
        data-go="more"
        aria-label={here ? `More: ${here.label}` : "More"}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? "wsm-panel" : undefined}
        onClick={() => (open && held.current ? close() : show(true))}
        onKeyDown={onBtnKey}
        onPointerEnter={enter}
        onPointerLeave={leave}
      >
        <span className="wsr-ic">{MORE_ICON}</span>
        <span className="wsr-lbl wsr-morelbl">{here ? railLabelOf(here) : "More"}</span>
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={panel}
          id="wsm-panel"
          className={`wsm${pos ? " is-in" : ""}`}
          role="menu"
          aria-label="More pages"
          data-shell="more"
          style={pos ? { left: pos.left, top: pos.top } : { left: -9999, top: 0 }}
          onPointerEnter={enter}
          onPointerLeave={leave}
          onKeyDown={onMenuKey}
        >
          {groups.map((g, gi) => (
            <div key={g.section.id} className="wsm-grp" role="group" aria-labelledby={`wsm-h-${g.section.id}`}>
              {gi > 0 && <div className="wsm-rule" aria-hidden="true" />}
              <div className="wsm-h" id={`wsm-h-${g.section.id}`}>
                {g.section.label}
                {g.section.pro && locked.has(g.section.pro) && <span className="wsm-pro" data-shell="pro">Pro</span>}
              </div>
              {g.pages.map((p) => {
                const cur = p.id === here?.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="menuitem"
                    tabIndex={-1}
                    className={`wsm-row${cur ? " wsm-cur" : ""}`}
                    data-go={p.id}
                    aria-current={cur ? "page" : undefined}
                    onClick={() => choose(p.path)}
                  >
                    <span className="wsm-ic">{icons[p.icon ?? p.id]}</span>
                    <span className="wsm-lbl">{p.label}</span>
                    {p.pro && locked.has(p.pro) && <span className="wsm-pro" data-shell="pro">Pro</span>}
                  </button>
                );
              })}
            </div>
          ))}
          <p className="wsm-foot">{MORE_FOOT}</p>
        </div>,
        document.body,
      )}
    </>
  );
};
