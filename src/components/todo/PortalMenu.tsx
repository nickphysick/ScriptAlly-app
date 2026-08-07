/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PortalMenu — the grouped ⋯ menu's SHELL, extracted from TodoBoard (tasks-pages P4) so the
 * Noteboard's note cards get the SAME grammar from the same component, not a lookalike.
 *
 * ⚠️ EVERYTHING THE BOARD'S MENU LEARNT LIVES HERE UNCHANGED: the portal to document.body (a
 * card's overflow can never clip what it does not hold), fixed-coordinate placement from the
 * trigger's rect via the pure `placeMenu` (flips upward at the viewport's bottom edge), the
 * closers (outside press · Escape returning focus to the trigger · any scroll, capture-phase ·
 * resize · history navigation), the ↑↓ keyboard walk with wrap, and in-place submenu expansion.
 * The CONTENTS stay a pure model (`MenuGroup[]`) supplied by the caller — this component renders
 * whatever it is handed and decides nothing.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { placeMenu, MenuEntry, MenuLeaf, MenuGroup } from "../../lib/todoMenu";
import "./todoBoard.css";

export interface PortalMenuProps {
  anchor: HTMLElement;
  groups: MenuGroup[];
  /** Pre-open a submenu (the board's drag-to-Snoozed opens AT its date tiers). */
  openSub?: string;
  ariaLabel: string;
  onPick: (item: MenuLeaf) => void;
  onClose: (returnFocus: boolean) => void;
}

export const PortalMenu: React.FC<PortalMenuProps> = ({ anchor, groups, openSub, ariaLabel, onPick, onClose }) => {
  const elRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [sub, setSub] = useState<string | null>(openSub ?? null);

  /* Position after first paint (the menu's height depends on its contents), and re-place when a
     submenu expands — the height change can push it past the viewport's bottom edge. */
  useLayoutEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const r = anchor.getBoundingClientRect();
    const p = placeMenu(r, { w: el.offsetWidth, h: el.offsetHeight },
      { w: window.innerWidth, h: window.innerHeight });
    setPos({ left: p.left, top: p.top });
  }, [anchor, sub]);

  // Focus the first enabled item once placed — the keyboard arrives inside the menu.
  useEffect(() => {
    if (!pos) return;
    const first = elRef.current?.querySelector<HTMLButtonElement>("button.tbd-mi:not(:disabled)");
    first?.focus();
    // run once, on placement — not again when a submenu re-places the menu
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos !== null]);

  /* The closers: outside press · Escape (focus back to the trigger) · any scroll · resize ·
     history navigation. The trigger itself counts as "outside" here deliberately — its own click
     handler toggles, and a pointerdown-close followed by a click-reopen would make the button
     unable to close its menu. */
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (t && (elRef.current?.contains(t) || anchor.contains(t))) return;
      onClose(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(true); }
    };
    const onAway = () => onClose(false);
    document.addEventListener("pointerdown", onDown);
    // capture-phase: the stage scrolls, not the window — a bubbling listener would never hear it
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("scroll", onAway, true);
    window.addEventListener("resize", onAway);
    window.addEventListener("popstate", onAway);
    window.addEventListener("hashchange", onAway);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("scroll", onAway, true);
      window.removeEventListener("resize", onAway);
      window.removeEventListener("popstate", onAway);
      window.removeEventListener("hashchange", onAway);
    };
  }, [anchor, onClose]);

  const walk = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = Array.from(
      elRef.current?.querySelectorAll<HTMLButtonElement>("button.tbd-mi:not(:disabled)") ?? [],
    );
    if (!items.length) return;
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === "ArrowDown"
      ? items[(i + 1 + items.length) % items.length]
      : items[(i - 1 + items.length) % items.length];
    next.focus();
  };

  const renderLeaf = (item: MenuLeaf, inSub: boolean) => (
    <button
      key={item.id + (inSub ? "-sub" : "")}
      type="button"
      role="menuitem"
      className={`tbd-mi${item.weight ? " weight" : ""}${item.danger ? " danger" : ""}${inSub ? " insub" : ""}`}
      disabled={item.disabled}
      title={item.why}
      onClick={() => onPick(item)}
    >
      {item.label}
      {item.goes && <span className="tbd-mgo" aria-hidden>▸</span>}
    </button>
  );

  const renderEntry = (entry: MenuEntry) => {
    if (entry.kind === "leaf") return renderLeaf(entry, false);
    const isOpen = sub === entry.id;
    return (
      <React.Fragment key={entry.id}>
        <button
          type="button"
          role="menuitem"
          aria-haspopup="true"
          aria-expanded={isOpen}
          className="tbd-mi"
          onClick={() => setSub((s) => (s === entry.id ? null : entry.id))}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") { e.preventDefault(); setSub(entry.id); }
            if (e.key === "ArrowLeft") { e.preventDefault(); setSub(null); }
          }}
        >
          {entry.label}
          <span className={`tbd-mgo${isOpen ? " open" : ""}`} aria-hidden>▸</span>
        </button>
        {isOpen && <div className="tbd-misub">{entry.sub.map((s) => renderLeaf(s, true))}</div>}
      </React.Fragment>
    );
  };

  const renderGroup = (g: MenuGroup, i: number) => (
    <React.Fragment key={i}>
      {g.head ? (
        <div className="tbd-mhead">{g.head}</div>
      ) : (
        i > 0 && <div className="tbd-msep" aria-hidden />
      )}
      {g.entries.map(renderEntry)}
    </React.Fragment>
  );

  return createPortal(
    <div
      ref={elRef}
      className="t-f12 tbd-menu2"
      role="menu"
      aria-label={ariaLabel}
      style={pos ? { left: pos.left, top: pos.top } : { left: 0, top: 0, visibility: "hidden" }}
      onKeyDown={walk}
    >
      {groups.filter((g) => g.entries.length > 0).map(renderGroup)}
    </div>,
    document.body,
  );
};
