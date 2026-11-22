/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE LIGHT BAR ABOVE A LIST — extracted from Query Centre v153's `QcBar153` (its frame, markup unchanged) so the
 * Contact list mounts the same bar (Contact list — Query Centre layout v1): an optional lead (the Query Centre's List /
 * Birds-eye switch), the count, Find taking the rest of the width with its "/" key hint (or a clear button while it
 * holds text), then the page's own chips and their menus (`children`), then Export.
 *
 * List filters v1 Phase 4 — EXPORT lives here (it left the filter panel's foot): an outline "↓ Export" at the right end,
 * its accessible name and title the old label ("Export 12 queries"), disabled at 0. And THE BAR IS ALWAYS ONE LINE: when
 * Find would fall under FIND_MIN, the words "Sort:" and "Group:" fold away (`data-fit="short"`); still short, Export goes
 * icon-only, its name kept (`data-fit="tight"`). Measured on every resize of the bar.
 *
 * ⚠️ IT RENDERS THE QUERY CENTRE'S OWN CLASSES (`qc153-bar`, `qc153-find`, queries/centre/qcv153.css; the sticky strip
 *    the caller wraps it in is `qc154-tbw`, qcv154/1541/156.css), whose page-scoped rules name `.cl27` beside
 *    `.qc151.qc153`. Its own additions are shell/listBar.css.
 */
import React, { useLayoutEffect, useRef } from "react";
import "./listBar.css";

type Attrs = Record<string, string>;
const FIND_I = <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg>;
const CROSS = <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6" /></svg>;

/** Find's narrowest before the bar folds its words away (the reference's `.fd` min-width) */
export const FIND_MIN = 160;
export type BarFit = "" | "short" | "tight";
/** the fold, read from the bar as drawn: each step only while Find is under FIND_MIN or the bar overflows */
export function fitBar(bar: HTMLElement): BarFit {
  const find = bar.querySelector<HTMLElement>(".qc153-find");
  const short = () => (find ? find.getBoundingClientRect().width < FIND_MIN : false) || bar.scrollWidth > bar.clientWidth + 1;
  for (const f of ["", "short", "tight"] as const) {
    if (f) bar.setAttribute("data-fit", f); else bar.removeAttribute("data-fit");
    if (!short()) return f;
  }
  return "tight";
}

export const ListBar: React.FC<{
  attrs: Attrs;
  /** before the count (the Query Centre's view switch) */
  lead?: React.ReactNode;
  /** the count cell, whole (its class and probes are the caller's) */
  count: React.ReactNode;
  find: {
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    inputRef?: React.Ref<HTMLInputElement>;
    disabled?: boolean;
    attrs: Attrs;
    clearAttrs: Attrs;
  };
  /** the chips, then their menus */
  children?: React.ReactNode;
  /** List filters v1 — Export at the right end: `label` is its accessible name and title ("Export 12 queries") */
  exportBtn?: { label: string; disabled: boolean; onExport: () => void; attrs: Attrs } | null;
}> = ({ attrs, lead, count, find: f, children, exportBtn }) => {
  const ref = useRef<HTMLDivElement>(null);
  /* the fold: measured after every render (a count or a label can change the room) and on every resize */
  useLayoutEffect(() => { const bar = ref.current; if (bar && bar.clientWidth > 0) fitBar(bar); });
  useLayoutEffect(() => {
    const bar = ref.current;
    if (!bar || typeof ResizeObserver === "undefined") return undefined;
    let raf = 0;
    const ro = new ResizeObserver(() => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; if (bar.clientWidth > 0) fitBar(bar); }); });
    ro.observe(bar);
    return () => { ro.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, []);
  return (
    <div className="qc153-bar" {...attrs} ref={ref}>
      {lead}
      {count}
      <label className="qc153-find" {...f.attrs}>
        {FIND_I}
        <input ref={f.inputRef} value={f.value} onChange={(e) => f.onChange(e.target.value)} placeholder={f.placeholder} aria-label={f.placeholder} autoComplete="off" disabled={f.disabled} />
        {f.value
          ? <button type="button" className="qc153-findx" aria-label="Clear the search" {...f.clearAttrs} onClick={() => f.onChange("")}>{CROSS}</button>
          : <kbd aria-hidden="true">/</kbd>}
      </label>
      {children}
      {exportBtn ? (
        <button type="button" className="qc153-dd lf-exp" {...exportBtn.attrs} aria-label={exportBtn.label} title={exportBtn.label}
          disabled={exportBtn.disabled} onClick={exportBtn.onExport}>
          <span aria-hidden="true">↓</span><b className="lf-expw" aria-hidden="true">Export</b>
        </button>
      ) : null}
    </div>
  );
};
