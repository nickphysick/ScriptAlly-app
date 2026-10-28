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
import React, { useCallback, useState } from "react";

export type Anchor = { x: number; y: number };
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
  const show = useCallback((key: string, from: "slice" | "row", el: Element, pointer: Anchor | null) => {
    setSt({ key, from, anchor: anchorFor(key, from, el, pointer) });
  }, [anchorFor]);
  const hide = useCallback((key?: string) => setSt((s) => (key === undefined || s?.key === key ? null : s)), []);
  const toggle = (key: string, from: "slice" | "row", el: Element) => setSt((s) => (s?.key === key ? null : { key, from, anchor: anchorFor(key, from, el, null) }));
  const keys = (key: string, from: "slice" | "row", ev: React.KeyboardEvent<Element>, el: Element) => {
    if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); toggle(key, from, el); }
    else if (ev.key === "Escape" && st) { ev.preventDefault(); ev.stopPropagation(); hide(); }
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
      onFocus: (key, el) => show(key, "slice", el, null),
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
      onFocus: (ev) => show(key, "row", ev.currentTarget, null),
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
