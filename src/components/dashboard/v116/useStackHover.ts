/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v116 — one hover controller for a ring and its key (Closed, Agents on file).
 *
 * A slice or a key row shows ITS category only (there is no whole-ring "all"), swells the slice, and
 * places the stack: `anchorFor` decides where (Closed: just right of the key; Agents: beside the
 * pointer). The keyboard reaches every slice and row: focus shows the stack anchored to the element,
 * Enter or Space toggles it, Esc hides it — and Esc stops there, so it never closes anything behind.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";

export type Anchor = { x: number; y: number };

/** v118 Part A — where the pointer puts a stack: 18px right of it and 14px above. */
export const POINTER_DX = 18;
export const POINTER_DY = -14;
/** …and where keyboard focus puts it, the one case with no pointer: 8px right of the focused slice or row. */
export const KEY_DX = 8;

/**
 * ⚠️ ONE ANCHOR RULE FOR BOTH HOOPS, slices and key rows alike (Dashboard v118 Part A). The Closed hoop used to anchor
 * just right of its key at the row's height, so a slice's stack opened away from the cursor and a row's a long way to
 * its right. The on-screen rule (HoverStack's fit) then moves it only by what would overflow.
 */
export function stackAnchor(el: Element, pointer: Anchor | null): Anchor {
  if (pointer) return { x: Math.round(pointer.x + POINTER_DX), y: Math.round(pointer.y + POINTER_DY) };
  const r = el.getBoundingClientRect();
  return { x: Math.round(r.right + KEY_DX), y: Math.round(r.top) };
}

/** Focus the KEYBOARD put there: a pointer press focuses a row or slice too, and must not move the stack to it. */
const keyboardFocus = (el: Element): boolean => { try { return el.matches(":focus-visible"); } catch { return true; } };
export interface StackHover {
  key: string | null;
  anchor: Anchor | null;
  /** slice and row handlers, by key */
  slice: {
    swell: string | null;
    onEnter: (key: string, ev: React.PointerEvent<SVGElement>) => void;
    onMove: (key: string, ev: React.PointerEvent<SVGElement>) => void;
    onLeave: (key: string) => void;
    onFocus: (key: string, el: Element) => void;
    onBlur: (key: string) => void;
    onKey: (key: string, ev: React.KeyboardEvent<SVGElement>, el: Element) => void;
  };
  row: (key: string) => {
    "data-d116": string;
    "data-key": string;
    className: string | undefined;
    tabIndex: number;
    role: string;
    "aria-expanded": boolean;
    onPointerEnter: (ev: React.PointerEvent<HTMLElement>) => void;
    onPointerMove: (ev: React.PointerEvent<HTMLElement>) => void;
    onPointerLeave: () => void;
    onFocus: (ev: React.FocusEvent<HTMLElement>) => void;
    onBlur: () => void;
    onKeyDown: (ev: React.KeyboardEvent<HTMLElement>) => void;
  };
}

/**
 * `anchorFor(key, from, el, pointer)`: where the stack's first card goes. `from` says which kind of
 * element asked; `pointer` is the pointer when there is one (null for the keyboard).
 */
export function useStackHover(
  anchorFor: (key: string, from: "slice" | "row", el: Element, pointer: Anchor | null) => Anchor,
  follows: boolean,
): StackHover {
  const [st, setSt] = useState<{ key: string; anchor: Anchor; from: "slice" | "row" } | null>(null);
  /* ⚠️ A 90ms GRACE BEFORE A POINTER LEAVE HIDES IT. The key's rows sit 3–5px apart and the card lifts 2px
     on hover, so a pointer crossing from one row to the next passes through a gap; without the grace the
     stack blinks out and back between every pair of rows. Any show cancels a pending hide; Esc is at once. */
  const pending = useRef<number | null>(null);
  const cancel = () => { if (pending.current !== null) { window.clearTimeout(pending.current); pending.current = null; } };
  useEffect(() => cancel, []);
  const show = useCallback((key: string, from: "slice" | "row", el: Element, pointer: Anchor | null) => {
    cancel();
    setSt({ key, from, anchor: anchorFor(key, from, el, pointer) });
  }, [anchorFor]);
  const hideNow = useCallback((key?: string) => { cancel(); setSt((s) => (key === undefined || s?.key === key ? null : s)); }, []);
  const hide = useCallback((key?: string) => {
    cancel();
    pending.current = window.setTimeout(() => { pending.current = null; setSt((s) => (key === undefined || s?.key === key ? null : s)); }, 90);
  }, []);
  const toggle = (key: string, from: "slice" | "row", el: Element) => { cancel(); setSt((s) => (s?.key === key ? null : { key, from, anchor: anchorFor(key, from, el, null) })); };
  const keys = (key: string, from: "slice" | "row", ev: React.KeyboardEvent<Element>, el: Element) => {
    if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); toggle(key, from, el); }
    else if (ev.key === "Escape" && st) { ev.preventDefault(); ev.stopPropagation(); hideNow(); }
  };
  const pt = (ev: React.PointerEvent) => ({ x: ev.clientX, y: ev.clientY });
  return {
    key: st?.key ?? null,
    anchor: st?.anchor ?? null,
    slice: {
      swell: st?.key ?? null,
      onEnter: (key, ev) => show(key, "slice", ev.currentTarget, pt(ev)),
      onMove: (key, ev) => { if (follows) show(key, "slice", ev.currentTarget, pt(ev)); },
      onLeave: (key) => hide(key),
      onFocus: (key, el) => { if (keyboardFocus(el)) show(key, "slice", el, null); },
      onBlur: (key) => hide(key),
      onKey: (key, ev, el) => keys(key, "slice", ev, el),
    },
    row: (key) => ({
      "data-d116": "key-row",
      "data-key": key,
      className: st?.key === key ? "is-hover" : undefined,
      tabIndex: 0,
      role: "button",
      "aria-expanded": st?.key === key,
      onPointerEnter: (ev) => show(key, "row", ev.currentTarget, pt(ev)),
      onPointerMove: (ev) => { if (follows) show(key, "row", ev.currentTarget, pt(ev)); },
      onPointerLeave: () => hide(key),
      onFocus: (ev) => { if (keyboardFocus(ev.currentTarget)) show(key, "row", ev.currentTarget, null); },
      onBlur: () => hide(key),
      onKeyDown: (ev) => keys(key, "row", ev, ev.currentTarget),
    }),
  };
}

/** "3 queries: Tom Okafor, Priya Raman and 1 more." — what the live region says when a stack shows. */
export function announce(total: number, noun: [string, string], names: string[], shown: number): string {
  if (total === 0) return `No ${noun[1]} yet.`;
  const list = names.slice(0, shown);
  const rest = total - list.length;
  const head = `${total} ${total === 1 ? noun[0] : noun[1]}: `;
  if (!rest) return `${head}${list.length > 1 ? `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}` : list[0]}.`;
  return `${head}${list.join(", ")} and ${rest} more.`;
}
