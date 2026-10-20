/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v140 §D — THE FILTERS MENU (Contact list v19's layout A) AND THE APPLIED-FILTERS ROW.
 *
 *   - The menu: a navy header ("Filter queries", "{v} of {N} showing", ✕); "Most used", four quick picks two by two on a
 *     powder band; two columns that scroll inside the menu ("Status" — the Stage filter, called "Where it stands" until v141 gave that name to the four sets; "What you sent" — the
 *     package options; "More" — four switches); an oat footer ("Clear all", "Show {v} queries", which closes it).
 *   - The applied row: under the toolbar while any filter or search is on — "{v} of {N} queries", one removable chip per
 *     filter (with its glyph for a status) and one for the search, "Clear all" on the right.
 *
 * Built from Contact list v19's `ContactFilterMenu` / `ContactAppliedRow` (agents/contact/ContactFilterStrip), which are
 * page-local: a lift candidate.
 *
 * ⚠️ ONE FILTER STATE. Every control reads and writes the page's `Qc138Filters`: the Overdue pick IS `past` (the
 *    "Past their reply date" switch) and the Offers pick IS `offers` (the Offers toggle). Turning either on turns both
 *    on, and the applied row shows one chip. Sections are ANDed, choices within one are ORed, the picks AND with all.
 * ⚠️ THE MENU IS LIVE: a change applies to the list behind it at once; nothing in it is keyed on the filter state, so
 *    the scroll position and the focused control survive a change.
 * ⚠️ PIP IS NEVER COUNTED: "{v} of {N}" are the page's own visible and scoped rows, and the practice row is neither.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { quietScroll, type PopoverState } from "../../shell/ListPills";
import { SENT_NONE, emptyQc138Filters, qc138FilterCount, type Qc138Filters } from "../../../lib/qc138";
import { QUICK_PICKS, STAND_ROWS, exportLabel, standOn, toggleStand, type QuickKey } from "../../../lib/qc140";
import { glyphOfStatus } from "../../../lib/qcBandArt";
import type { SentOption } from "./QcFilters138";
import { StageGlyph } from "./StageGlyph";
import { CROSS140, type Qc140Pop } from "./QcToolbar140";
import { WhereMenuSection } from "./QcWhere141";
import type { WhereKey } from "../../../lib/qcSummary";

const plural = (n: number) => (n === 1 ? "query" : "queries");

const PICK_ICON: Record<QuickKey, React.ReactNode> = {
  you: <><circle cx="10" cy="10" r="7.2" /><path d="M7 10h6M10.5 7.4L13 10l-2.5 2.6" /></>,
  over: <><circle cx="10" cy="10" r="7.2" /><path d="M10 6v4.6M10 13.6v.1" /></>,
  wait: <path d="M6 3.5h8M6 16.5h8M6.5 3.5c0 4 7 4.4 7 6.5s-7 2.5-7 6.5M13.5 3.5c0 4-7 4.4-7 6.5" />,
  offers: <><path d="M6 2.8h6l3 3v11.4H6z" /><path d="M8.5 9.5h4M8.5 12.5h4" /></>,
};
const TICK = (
  <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M2.5 6.2 5 8.6l4.6-5" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const box = (on: boolean) => <span className={`qc140-bx${on ? " on" : ""}`} aria-hidden="true">{on ? TICK : null}</span>;

/** a stand row's glyph: the black stage glyph, the dashed ring on a requested stage; Passed and No reply the closed one */
const standGlyph = (key: string) => (key === "rj" ? "cl" : key) as Parameters<typeof StageGlyph>[0]["k"]; /* v141 §D — No reply has its own glyph now */

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
  /** v140.1 §A — anything narrowing the list (a filter, a quick pick, the search), and the export of what it shows */
  filtered: boolean;
  onExport: () => void;
}

const MORE_ROWS: { key: "dueWeek" | "past" | "missing" | "overYear"; label: string; line: string }[] = [
  { key: "dueWeek", label: "Due this week", line: "Anything you or they owe in the next seven days" },
  { key: "past", label: "Past their reply date", line: "Quiet past the date you expected" },
  { key: "missing", label: "Missing materials", line: "What you sent isn’t recorded" },
  { key: "overYear", label: "Over a year", line: "Queried more than a year ago" },
];

export const QcFilterMenu140: React.FC<{ pop: PopoverState<Qc140Pop>; model: Qc140FilterModel }> = ({ pop, model }) => {
  const { filters: f, onFilters, showing, total, quickN, stageCounts, sent, moreN, whereN, filtered, onExport } = model;
  const anchor = pop.open === "filters" ? pop.anchor : null;
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  /* 8 under the chip, right edges aligned, 760 wide or the viewport less 40 */
  useLayoutEffect(() => {
    if (!anchor) { setPos(null); return undefined; }
    const place = () => {
      const r = anchor.getBoundingClientRect();
      const width = Math.min(760, window.innerWidth - 40);
      setPos({ top: r.bottom + 8, left: Math.max(20, Math.min(r.right - width, window.innerWidth - width - 20)), width });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [anchor]);
  const isOpen = pos !== null;
  useEffect(() => {
    if (!isOpen) return undefined;
    ref.current?.querySelector<HTMLElement>("[data-opt]:not(:disabled)")?.focus({ preventScroll: true });
    return () => {
      /* focus goes back to the chip when the menu goes while holding it */
      if (anchor?.isConnected && (!document.activeElement || document.activeElement === document.body || ref.current?.contains(document.activeElement))) anchor.focus({ preventScroll: true });
    };
  }, [isOpen, anchor]);
  if (!anchor || !pos) return null;

  /* a change can shorten the list under a stuck toolbar; the scroll that clamps must not close the menu */
  const set = (g: Qc138Filters) => quietScroll(() => onFilters(g));
  const close = () => { anchor.focus({ preventScroll: true }); pop.close(); };
  const anyOn = qc138FilterCount(f) > 0;
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const items = [...(ref.current?.querySelectorAll<HTMLElement>("[data-opt]:not(:disabled)") ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (i < 0 || !items.length) return;
    e.preventDefault();
    items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length].focus();
  };

  return createPortal(
    <div className="lpop qc140-fm" data-lpop="filters" data-qc140="filter-menu" role="dialog" aria-label="Filter queries" ref={ref} onKeyDown={onKey}
      style={{ top: pos.top, left: pos.left, width: pos.width, maxHeight: `calc(100vh - ${Math.round(pos.top) + 16}px)` }}>
      <header className="qc140-fm-h" data-qc140="filter-head">
        <div>
          <b>Filter queries</b>
          <span data-qc140="filter-showing"><em>{showing}</em> of {total} showing</span>
        </div>
        <button type="button" className="qc140-fm-x" data-qc140="filter-close" aria-label="Close" onClick={close}>{CROSS140}</button>
      </header>
      <section className="qc140-fm-q" data-qc140="filter-quick">
        <h4>Most used</h4>
        <div className="qc140-fm-qg">
          {QUICK_PICKS.map((p) => {
            const on = f[p.field];
            const n = quickN[p.key];
            return (
              <button key={p.key} type="button" className={`qc140-qp${on ? " on" : ""}`} data-qc140="quick" data-qp={p.key} data-field={p.field} data-opt={`qp:${p.key}`} data-n={n}
                aria-pressed={on} disabled={!on && n === 0} onClick={() => set({ ...f, [p.field]: !on })}>
                <span className="qc140-qic"><svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{PICK_ICON[p.key]}</svg></span>
                <span className="qc140-qt"><b>{p.title}</b><small>{p.line}</small></span>
                <i>{n}</i>
              </button>
            );
          })}
        </div>
      </section>
      {/* v141 §A — the four sets, single-select; the same field the hero card and the pinned band write */}
      <WhereMenuSection where={f.where} counts={whereN} onWhere={(k) => set({ ...f, where: k })} />
      <div className="qc140-fm-b" data-qc140="filter-body">
        <section className="qc140-fm-s" data-qc140="filter-stands">
          {/* v141 — renamed from "Where it stands": that heading is the four sets' now, and these rows are statuses */}
          <h4>Status</h4>
          {STAND_ROWS.map((row) => {
            const on = standOn(f, row);
            const n = row.statuses.reduce((a, s) => a + (stageCounts.get(s) ?? 0), 0);
            return (
              <button key={row.key} type="button" className={`qc140-fck${on ? " on" : ""}`} data-qc140="stand" data-k={row.key} data-opt={`st:${row.key}`} data-n={n}
                role="menuitemcheckbox" aria-checked={on} disabled={!on && n === 0} onClick={() => set(toggleStand(f, row))}>
                {box(on)}
                <span className="qc140-fgl"><StageGlyph k={standGlyph(row.key)} /></span>
                <b>{row.label}</b>
                <i>{n}</i>
              </button>
            );
          })}
        </section>
        <section className="qc140-fm-s" data-qc140="filter-sent">
          <h4>What you sent</h4>
          {sent.map((o) => {
            const on = f.sent.includes(o.key);
            return (
              <button key={o.key} type="button" className={`qc140-fck qc140-fck--2${on ? " on" : ""}`} data-qc140="sent" data-k={o.key === SENT_NONE ? "none" : o.key} data-opt={`sent:${o.key}`} data-n={o.n}
                role="menuitemcheckbox" aria-checked={on} disabled={!on && o.n === 0}
                onClick={() => set({ ...f, sent: on ? f.sent.filter((x) => x !== o.key) : [...f.sent, o.key] })}>
                {box(on)}
                <span className="qc140-flab"><b>{o.name}</b><small>{o.line}</small></span>
                <i>{o.n}</i>
              </button>
            );
          })}
          <h4 className="qc140-fm-more">More</h4>
          {MORE_ROWS.map((r) => {
            const on = f[r.key];
            const n = moreN[r.key];
            return (
              <button key={r.key} type="button" className={`qc140-fsw${on ? " on" : ""}`} data-qc140="more" data-k={r.key} data-opt={`more:${r.key}`} data-n={n}
                role="switch" aria-checked={on} onClick={() => set({ ...f, [r.key]: !on })}>
                <span className="qc140-flab"><b>{r.label}</b><small>{r.line}</small></span>
                <i>{n}</i>
                <span className="qc140-sw" aria-hidden="true"><span /></span>
              </button>
            );
          })}
        </section>
      </div>
      <footer className="qc140-fm-f" data-qc140="filter-foot">
        <span className="qc140-fm-fl">
          <button type="button" className="qc140-fm-clear" data-qc140="filter-clear" disabled={!anyOn} onClick={() => set(emptyQc138Filters())}>Clear all</button>
          {/* v140.1 §A — Export CSV, back on the desktop: exactly the rows the list shows, in its order, through the one exporter */}
          <button type="button" className="qc140-fm-export" data-qc140="filter-export" disabled={showing === 0} onClick={onExport}>{exportLabel(showing, total, filtered)}</button>
        </span>
        <button type="button" className="qc140-fm-show" data-qc140="filter-show" onClick={close}>Show {showing} {plural(showing)}</button>
      </footer>
    </div>,
    document.body,
  );
};

/* ── the applied-filters row ─────────────────────────────────────────────────────────────────────────────────── */

export interface Qc140Chip { key: string; label: string; status?: string; off: () => void }

/**
 * Under the toolbar while anything narrows the list: powder, a 1px rule at the top. "{v} of {N} queries", a removable
 * chip per filter (its glyph for a status) and per search ("…"), and "Clear all" on the right.
 */
export const QcAppliedRow140: React.FC<{ chips: Qc140Chip[]; showing: number; total: number; pinned: boolean; onClearAll: () => void }> = ({ chips, showing, total, pinned, onClearAll }) => (
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
    <button type="button" className="qc140-af-clear" data-qc140="applied-clear" onClick={onClearAll}>Clear all</button>
  </div>
);
