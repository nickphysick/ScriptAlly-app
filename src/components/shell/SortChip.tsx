/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE CARDS VIEW'S SORT CHIP AND ITS MENU, shared by the Query Centre and the Contact list (cards-sort-search v1 §B; refs
 * design-refs/cards-sort-search-v1/, screens qc-03 and cl-06).
 *
 * ⚠️ ONE SORT, TWO CONTROLS. The chip owns NO state: it reads and writes the page's one sort (the same state the List
 *    view's column headings set), through `value` and `onChange`. Choosing a field sorts by it in its first direction,
 *    as a heading press does; the order switch flips the direction.
 *
 *   - The chip: a sort icon (two arrows), the muted "Sorted by", the field in semibold and a navy ↓ (or ↑ reversed).
 *     Its box is the page's own chip (the class it passes, the same as its Group by), so it matches that toolbar in
 *     both positions. Below 1,120px of toolbar (`toolbar`, measured) "Sorted by" drops.
 *   - The menu: "SORT CARDS BY", the fields as radio items with a navy ✓, a two-way order switch whose labels suit the
 *     field, then the italic note. It is an `.lpop`, so the page's `usePopover` closes it on an outside press and on
 *     Escape; the arrow keys move through its items.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./sortChip.css";

export interface SortField<K extends string> {
  key: K;
  label: string;
  /** the order switch's two words, each with the direction it sets (in the order they are drawn) */
  order: [{ label: string; reversed: boolean }, { label: string; reversed: boolean }];
}
export interface SortValue<K extends string> { key: K; reversed: boolean }

export const SORT_ICON = (
  <svg className="sc-ic" viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6.5 3.5v13M3.5 13.5l3 3 3-3M13.5 16.5v-13M10.5 6.5l3-3 3 3" />
  </svg>
);
const TICK = <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M2.5 6.2 5 8.6l4.6-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;

/** the chip's contents: icon, "Sorted by", the field, the arrow. `toolbar` is the element whose width decides the fold. */
export function SortChipButton<K extends string>({ fields, value, open, onToggle, className, ns, disabled = false, toolbar }: {
  fields: readonly SortField<K>[];
  value: SortValue<K>;
  open: boolean;
  onToggle: (anchor: HTMLElement) => void;
  className: string;
  ns: string;
  disabled?: boolean;
  toolbar?: () => HTMLElement | null;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [narrow, setNarrow] = useState(false);
  useLayoutEffect(() => {
    const tb = toolbar?.() ?? null;
    if (!tb) return undefined;
    const read = () => { const w = tb.clientWidth; if (w > 0) setNarrow(w < 1120); };
    read();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(read);
    ro.observe(tb);
    return () => ro.disconnect();
  }, [toolbar]);
  const f = fields.find((x) => x.key === value.key) ?? null;
  const dirWords = f ? (f.order.find((o) => o.reversed === value.reversed)?.label ?? "") : "";
  return (
    <button type="button" ref={ref} className={`${className} sc-chip`} {...{ [`data-${ns}`]: "sort" }} data-narrow={narrow ? "" : undefined}
      aria-haspopup="menu" aria-expanded={open} disabled={disabled}
      aria-label={f ? `Sorted by ${f.label}, ${dirWords.toLowerCase()}. Change the order` : "Sort the cards"}
      onClick={(e) => onToggle(e.currentTarget)}>
      {SORT_ICON}
      <em className="sc-sby">Sorted by</em>
      <b className="sc-f" data-sc="field">{f?.label ?? "Order"}</b>
      <i className="sc-dir" data-sc="dir" data-reversed={value.reversed ? "true" : "false"} aria-hidden="true">{value.reversed ? "↑" : "↓"}</i>
    </button>
  );
}

/** the menu, 8 under the chip, its left edge on the chip's (kept inside the window) */
export function SortChipMenu<K extends string>({ anchor, fields, value, onChange, ns }: {
  anchor: HTMLElement;
  fields: readonly SortField<K>[];
  value: SortValue<K>;
  onChange: (v: SortValue<K>) => void;
  ns: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  useLayoutEffect(() => {
    const r = anchor.getBoundingClientRect();
    const w = ref.current?.offsetWidth ?? 320;
    setPos({ top: r.bottom + 8, left: Math.max(16, Math.min(r.left, window.innerWidth - w - 16)) });
  }, [anchor]);
  useEffect(() => { ref.current?.querySelector<HTMLElement>("[aria-checked='true']")?.focus({ preventScroll: true }); }, []);
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const items = [...(ref.current?.querySelectorAll<HTMLElement>("button") ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (!items.length) return;
    e.preventDefault();
    items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length].focus();
  };
  const f = fields.find((x) => x.key === value.key) ?? fields[0];
  return createPortal(
    <div className="lpop sc-pop" data-lpop="sort" {...{ [`data-${ns}`]: "sort-menu" }} role="menu" aria-label="Sort the cards by" ref={ref} onKeyDown={onKey}
      style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}>
      <div className="sc-mh">Sort cards by</div>
      {fields.map((x) => {
        const on = x.key === value.key;
        return (
          <button key={x.key} type="button" role="menuitemradio" aria-checked={on} className="sc-opt" data-sc="opt" data-k={x.key}
            onClick={() => { if (!on) onChange({ key: x.key, reversed: false }); }}>
            <span className="sc-tick" aria-hidden="true">{on ? TICK : null}</span><b>{x.label}</b>
          </button>
        );
      })}
      <div className="sc-seg" role="radiogroup" aria-label="Order" data-sc="order">
        {f.order.map((o) => (
          <button key={o.label} type="button" role="radio" aria-checked={value.reversed === o.reversed} data-sc="order-opt" data-reversed={o.reversed ? "true" : "false"}
            onClick={() => { if (value.reversed !== o.reversed) onChange({ key: value.key, reversed: o.reversed }); }}>{o.label}</button>
        ))}
      </div>
      <p className="sc-note">The same order as the list&rsquo;s column headings.</p>
    </div>,
    document.body,
  );
}
