/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v140 §D, v142 §E — THE FILTER STRIP AND THE APPLIED-FILTERS ROW.
 *
 *   - The strip (v142 §E, replacing v140's pop-over menu): see QcFilterStrip142's own note below. Its styles are the
 *     Contact list v20's strip, shared (shell/filterStrip.css).
 *   - The applied row: under the toolbar while any filter or search is on — "{v} of {N} queries", one removable chip per
 *     filter (with its glyph for a status) and one for the search, then the export of what the list shows and "Clear
 *     all" on the right (v142 §E moved the export here; it is the one "Clear all").
 *
 * ⚠️ ONE FILTER STATE. Every control reads and writes the page's `Qc138Filters`: the Overdue pick IS `past` (the
 *    "Past their reply date" switch) and the Offers pick IS `offers` (the Offers toggle). Turning either on turns both
 *    on, and the applied row shows one chip. Sections are ANDed, choices within one are ORed, the picks AND with all.
 * ⚠️ THE STRIP IS LIVE: a change applies to the list behind it at once; nothing in it is keyed on the filter state, so
 *    the scroll position and the focused control survive a change.
 * ⚠️ PIP IS NEVER COUNTED: "{v} of {N}" are the page's own visible and scoped rows, and the practice row is neither.
 */
import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { quietScroll, type PopoverState } from "../../shell/ListPills";
import { SENT_NONE, type Qc138Filters } from "../../../lib/qc138";
import { QUICK_PICKS, STAND_ROWS, exportLabel, standOn, toggleStand, type QuickKey } from "../../../lib/qc140";
import { glyphOfStatus } from "../../../lib/qcBandArt";
import type { SentOption } from "./QcFilters138";
import { StageGlyph } from "./StageGlyph";
import { CROSS140, type Qc140Pop } from "./QcToolbar140";
import { WhereMark } from "./QcWhere141";
import { WHERE_KEYS, WHERE_LABEL, type WhereKey } from "../../../lib/qcSummary";
import "../../shell/filterStrip.css";

const plural = (n: number) => (n === 1 ? "query" : "queries");

/** a status chip's glyph: the black stage glyph; No reply has its own (v141 §D) */
const standGlyph = (key: string) => (key === "rj" ? "cl" : key) as Parameters<typeof StageGlyph>[0]["k"];

export interface Qc140FilterModel {
  filters: Qc138Filters;
  onFilters: (f: Qc138Filters) => void;
  /** the rows the list shows now, and every query in scope (neither includes the practice row) */
  showing: number;
  total: number;
  quickN: Record<QuickKey, number>;
  /** per status, over the scoped rows */
  stageCounts: ReadonlyMap<string, number>;
  sent: readonly SentOption[];
  moreN: Record<"dueWeek" | "past" | "missing" | "overYear", number>;
  /** v141 §A — the four sets' counts over the scoped rows (lib/qcSummary `whereCounts`) */
  whereN: Record<WhereKey, number>;
  /** v142.1 A2 — the export, always in the strip's header: "Export all {N} queries" with nothing narrowing the list,
   *  "Export {v} queries" otherwise. The applied row's copy runs the same handler. */
  filtered: boolean;
  onExport: () => void;
}

const MORE_ROWS: { key: "dueWeek" | "past" | "missing" | "overYear"; label: string }[] = [
  { key: "dueWeek", label: "Due this week" },
  { key: "past", label: "Past their reply date" },
  { key: "missing", label: "Missing materials" },
  { key: "overYear", label: "Over a year" },
];

/**
 * v142 §E — THE FILTER STRIP (the Contact list v20 §E's, shell/filterStrip.css): the Filters chip opens it as a
 * full-width strip under the toolbar (and under the applied row when one shows), inside the sticky stack, so it sticks
 * with them and sits over the rows without pushing them. Unpinned it is the list card's width; in full screen it is
 * inset 24px each side. A header ("Filter queries", the live "{v} of {N} showing" in mono, ✕) over three columns:
 * Most used · Where it stands (v141's four sets, then the statuses) · What you sent + More. Every choice is a compact
 * chip with its live count; a chosen one is navy with cream text.
 *
 * ⚠️ NO FOOTER: every choice applies at once, so "Show {v} queries" is gone; Export moved to the applied row, and the
 *    applied row's "Clear all" is the only one. The probes (`data-qc140="filter-menu"`, quick, stand, sent, more,
 *    `data-qc141="where-opt"`) are v140's and v141's, so their locks still find each choice.
 * ⚠️ THE MODEL AND THE COUNTS ARE v140 §D's AND v141 §A's, UNCHANGED (one filter state, the page's `Qc138Filters`).
 */
export const QcFilterStrip142: React.FC<{ pop: PopoverState<Qc140Pop>; model: Qc140FilterModel; pinned: boolean }> = ({ pop, model, pinned }) => {
  const { filters: f, onFilters, showing, total, quickN, stageCounts, sent, moreN, whereN, filtered, onExport } = model;
  const anchor = pop.open === "filters" ? pop.anchor : null;
  const ref = useRef<HTMLDivElement>(null);
  const host = anchor?.closest<HTMLElement>('[data-qc140="stack"]') ?? null;
  const isOpen = !!anchor && !!host;
  useEffect(() => {
    if (!isOpen) return undefined;
    ref.current?.querySelector<HTMLElement>("[data-opt]:not(:disabled)")?.focus({ preventScroll: true });
    return () => {
      /* focus goes back to the chip when the strip goes while holding it */
      if (anchor?.isConnected && (!document.activeElement || document.activeElement === document.body || ref.current?.contains(document.activeElement))) anchor.focus({ preventScroll: true });
    };
  }, [isOpen, anchor]);
  if (!anchor || !host) return null;

  /* a change can shorten the list under a stuck toolbar; the scroll that clamps must not close the strip */
  const set = (g: Qc138Filters) => quietScroll(() => onFilters(g));
  const close = () => { anchor.focus({ preventScroll: true }); pop.close(); };
  const chip = (on: boolean) => `cl20-chip${on ? " on" : ""}`;

  return createPortal(
    <div className={`lpop cl20-fs-strip qc142-strip${pinned ? " qc142-strip--full" : ""}`} data-lpop="filters" data-qc140="filter-menu" data-qc142="filter-strip"
      role="dialog" aria-label="Filter queries" ref={ref}>
      <header className="cl20-fsh" data-qc140="filter-head">
        <b>Filter queries</b>
        <span data-qc140="filter-showing" data-qc142="filter-count">{showing} of {total} showing</span>
        {/* v142.1 A2 — right of the count, always: the export of exactly what the list shows */}
        <button type="button" className="cl20-fsc qc1421-export" data-qc140="filter-export" data-qc1421="strip-export" disabled={showing === 0} onClick={onExport}>
          {exportLabel(showing, total, filtered)}
        </button>
        <button type="button" className="cl20-fsx" data-qc140="filter-close" aria-label="Close" onClick={close}>{CROSS140}</button>
      </header>
      <div className="cl20-fsb qc142-fsb" data-qc140="filter-body">
        <section className="cl20-fcol" data-qc140="filter-quick" aria-label="Most used">
          <h4>Most used</h4>
          <div className="cl20-fchips">
            {QUICK_PICKS.map((p) => {
              const on = f[p.field];
              const n = quickN[p.key];
              return (
                <button key={p.key} type="button" className={chip(on)} data-qc140="quick" data-qp={p.key} data-field={p.field} data-opt={`qp:${p.key}`} data-n={n}
                  aria-pressed={on} disabled={!on && n === 0} onClick={() => set({ ...f, [p.field]: !on })}>
                  {p.title}<i>{n}</i>
                </button>
              );
            })}
          </div>
        </section>
        <section className="cl20-fcol" data-qc140="filter-stands" aria-label="Where it stands">
          <h4>Where it stands</h4>
          {/* v141 §A — the four sets, single-select; the same field the hero card and the pinned band write */}
          <div className="cl20-fchips qc142-where" role="radiogroup" aria-label="Where it stands" data-qc141="filter-where">
            {WHERE_KEYS.map((k) => {
              const on = f.where === k;
              const n = whereN[k];
              return (
                <button key={k} type="button" className={chip(on)} data-qc141="where-opt" data-k={k} data-opt={`where:${k}`} data-n={n}
                  role="radio" aria-checked={on} title={WHERE_LABEL[k].title} disabled={!on && n === 0} onClick={() => set({ ...f, where: on ? null : k })}>
                  <WhereMark k={k} />{WHERE_LABEL[k].label}<i>{n}</i>
                </button>
              );
            })}
          </div>
          <h4 className="qc142-fsub">Status</h4>
          <div className="cl20-fchips">
            {STAND_ROWS.map((row) => {
              const on = standOn(f, row);
              const n = row.statuses.reduce((a, s) => a + (stageCounts.get(s) ?? 0), 0);
              return (
                <button key={row.key} type="button" className={chip(on)} data-qc140="stand" data-k={row.key} data-opt={`st:${row.key}`} data-n={n}
                  aria-pressed={on} disabled={!on && n === 0} onClick={() => set(toggleStand(f, row))}>
                  <span className="qc142-fgl" aria-hidden="true"><StageGlyph k={standGlyph(row.key)} /></span>{row.label}<i>{n}</i>
                </button>
              );
            })}
          </div>
        </section>
        <section className="cl20-fcol" data-qc140="filter-sent" aria-label="What you sent">
          <h4>What you sent</h4>
          <div className="cl20-fchips">
            {sent.map((o) => {
              const on = f.sent.includes(o.key);
              return (
                <button key={o.key} type="button" className={chip(on)} data-qc140="sent" data-k={o.key === SENT_NONE ? "none" : o.key} data-opt={`sent:${o.key}`} data-n={o.n}
                  aria-pressed={on} disabled={!on && o.n === 0} title={o.line}
                  onClick={() => set({ ...f, sent: on ? f.sent.filter((x) => x !== o.key) : [...f.sent, o.key] })}>
                  {o.name}<i>{o.n}</i>
                </button>
              );
            })}
          </div>
          <h4 className="qc142-fsub">More</h4>
          <div className="cl20-fchips">
            {MORE_ROWS.map((r) => {
              const on = f[r.key];
              const n = moreN[r.key];
              return (
                <button key={r.key} type="button" className={chip(on)} data-qc140="more" data-k={r.key} data-opt={`more:${r.key}`} data-n={n}
                  aria-pressed={on} disabled={!on && n === 0} onClick={() => set({ ...f, [r.key]: !on })}>
                  {r.label}<i>{n}</i>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>,
    host,
  );
};

/* ── the applied-filters row ─────────────────────────────────────────────────────────────────────────────────── */

export interface Qc140Chip { key: string; label: string; status?: string; off: () => void }

/**
 * Under the toolbar while anything narrows the list: powder, a 1px rule at the top. "{v} of {N} queries", a removable
 * chip per filter (its glyph for a status) and per search ("…"), and "Clear all" on the right.
 */
export const QcAppliedRow140: React.FC<{
  chips: Qc140Chip[]; showing: number; total: number; pinned: boolean; onClearAll: () => void;
  /** v142 §E — the export of what the list shows, moved here from the retired menu footer, before "Clear all" */
  onExport?: () => void;
}> = ({ chips, showing, total, pinned, onClearAll, onExport }) => (
  <div className="qc140-af" data-qc140="applied" data-pinned={pinned ? "" : undefined} aria-live="polite">
    <span className="qc140-af-n" data-qc140="applied-count"><b>{showing}</b> of {total} {plural(total)}</span>
    <span className="qc140-af-chips">
      {chips.map((c) => (
        <button key={c.key} type="button" className="qc140-af-c" data-qc140="applied-chip" data-k={c.key} aria-label={`Remove ${c.label}`} onClick={c.off}>
          {c.status ? <span className="qc140-af-g" aria-hidden="true"><StageGlyph k={glyphOfStatus(c.status)} /></span> : null}
          <span className="qc140-af-l">{c.label}</span>{CROSS140}
        </button>
      ))}
    </span>
    {onExport ? (
      <button type="button" className="qc140-af-export" data-qc142="export" disabled={showing === 0} onClick={onExport}>{exportLabel(showing, total, true)}</button>
    ) : null}
    <button type="button" className="qc140-af-clear" data-qc140="applied-clear" onClick={onClearAll}>Clear all</button>
  </div>
);
