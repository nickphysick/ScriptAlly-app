/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CbMenu — a post-it's ⋯ menu (Corkboard v2, Part F; ref design-refs/corkboard-v13/, `openMenu`, screen 05), in this
 * order: Pin to top / Unpin · Move to front / Move to back (the Corkboard view) · ─ · Edit · Change colour… ·
 * Turn into a task… / Take off your to-do list · Change tag… · (Piles) ─ Move to pile: every other pile · ─ · Remove.
 *
 * It opens below its ⋯ (above it when there is no room), focuses its first item, moves with the arrow keys, closes
 * on Escape (focus back to the ⋯), on a press outside and on resize. It writes nothing: a pick names an action and
 * the page does it. It portals to `document.body` and carries `.cb2-layer`.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";

export type MenuAct =
  | { a: "pin" } | { a: "front" } | { a: "back" } | { a: "edit" } | { a: "colour" } | { a: "task" } | { a: "untask" }
  | { a: "tag" } | { a: "pile"; k: string } | { a: "remove" };

export interface CbMenuProps {
  anchor: HTMLElement;
  pinned: boolean;
  onTodo: boolean;
  /** the Corkboard view offers Move to front / back; Piles offers Move to pile */
  view: "board" | "piles";
  /** the other piles, for Move to pile */
  piles: { k: string; name: string }[];
  onPick: (act: MenuAct) => void;
  onClose: (returnFocus: boolean) => void;
}

const W = 220;

export const CbMenu: React.FC<CbMenuProps> = ({ anchor, pinned, onTodo, view, piles, onPick, onClose }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = anchor.getBoundingClientRect();
    const left = Math.max(8, r.right - W);
    const h = el.offsetHeight;
    let top = r.bottom + 6;
    if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 6);
    setPos({ left, top });
  }, [anchor]);
  useEffect(() => { if (pos) ref.current?.querySelector<HTMLButtonElement>("button")?.focus(); }, [pos !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  useEscapeLayer(true, () => onClose(true), ESC_LEVEL.dialMenu ?? ESC_LEVEL.pageModal);
  useEffect(() => {
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || anchor.contains(t)) return;
      onClose(false);
    };
    const resize = () => onClose(false);
    document.addEventListener("pointerdown", down, true);
    window.addEventListener("resize", resize);
    return () => { document.removeEventListener("pointerdown", down, true); window.removeEventListener("resize", resize); };
  }, [anchor, onClose]);

  const keys = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const b = [...(ref.current?.querySelectorAll<HTMLButtonElement>("button") ?? [])];
    if (!b.length) return;
    let i = b.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "Home") i = 0;
    else if (e.key === "End") i = b.length - 1;
    else i = (i + (e.key === "ArrowDown" ? 1 : -1) + b.length) % b.length;
    b[i].focus();
  };
  const item = (label: string, act: MenuAct, cls?: string) => (
    <button type="button" role="menuitem" className={cls} data-act={act.a === "pile" ? `pile:${act.k}` : act.a} onClick={() => onPick(act)}>{label}</button>
  );

  return createPortal(
    <div ref={ref} className="cb2-layer cb2-menu" role="menu" aria-label="Note actions" data-cb2="menu" onKeyDown={keys}
      style={pos ? { left: pos.left, top: pos.top } : { left: -9999, top: 0, visibility: "hidden" }}>
      {item(pinned ? "Unpin" : "Pin to top", { a: "pin" })}
      {view === "board" ? <>{item("Move to front", { a: "front" })}{item("Move to back", { a: "back" })}</> : null}
      <hr />
      {item("Edit", { a: "edit" })}
      {item("Change colour…", { a: "colour" })}
      {onTodo ? item("Take off your to-do list", { a: "untask" }) : item("Turn into a task…", { a: "task" })}
      {item("Change tag…", { a: "tag" })}
      {view === "piles" && piles.length ? (
        <>
          <hr />
          <div className="cb2-mlbl" role="presentation">Move to pile</div>
          {piles.map((p) => <React.Fragment key={p.k || "__loose"}>{item(p.name, { a: "pile", k: p.k })}</React.Fragment>)}
        </>
      ) : null}
      <hr />
      {item("Remove", { a: "remove" }, "cb2-del")}
    </div>,
    document.body,
  );
};
