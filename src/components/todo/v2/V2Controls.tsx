/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The To-do list's controls row (v2; ref `.controls`): search · Filter · Group · Sort · Export CSV,
 * and the floating bar that states the active filters.
 *
 * ⚠️ ONE POPOVER AT A TIME, AND IT IS ONE STATE. `open` names which of the three is showing, so
 * "only one can be open" is structural rather than three booleans agreeing.
 *
 * ⚠️ THE FILTER PANEL KEEPS ITS SCROLL POSITION WHEN AN OPTION IS PICKED. Its box is one element
 * for as long as it is open — the options toggle state inside it, nothing re-keys it — so a pick
 * three sections down does not throw the reader back to the top.
 *
 * ⚠️ THE ACTIVE-FILTERS BAR IS `position: fixed` AND THEREFORE TAKES NO SPACE: its arrival moves
 * nothing on the page. Measured in tests/e2e/todoV2.measure.ts (the content box before and after).
 */
import React, { useEffect, useRef, useState } from "react";
import type { Category } from "../../../lib/todoCategory";
import { CATEGORY_TAG } from "../../../lib/todoCategory";
import {
  GROUP_KEYS, GROUP_LABEL, SORT_KEYS, SORT_LABEL, filterCount,
  type GroupKey, type SortKey, type V2Filters,
} from "../../../lib/todoV2";

const TYPE_ORDER: Category[] = ["req", "nudge", "quiet", "house", "yours"];

const Check = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="m4 12 5 5L20 6" /></svg>
);
const Chevron = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
);

export interface FacetCounts {
  types: Map<Category, number>;
  statuses: Map<string, number>;
  pkgs: Map<string, number>;
  setAside: number;
}

type Open = null | "filter" | "group" | "sort";

export const V2Controls: React.FC<{
  search: string;
  onSearch: (v: string) => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
  filters: V2Filters;
  onFilters: (f: V2Filters) => void;
  counts: FacetCounts;
  statusOrder: string[];
  group: GroupKey;
  onGroup: (g: GroupKey) => void;
  sort: SortKey;
  onSort: (s: SortKey) => void;
  onExport: () => void;
}> = ({ search, onSearch, searchRef, filters, onFilters, counts, statusOrder, group, onGroup, sort, onSort, onExport }) => {
  const [open, setOpen] = useState<Open>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  /* dismissal: a press anywhere outside the open control and its panel, or Escape */
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e: PointerEvent) => {
      const wrap = rowRef.current?.querySelector(`[data-pop="${open}"]`);
      if (wrap && wrap.contains(e.target as Node)) return;
      setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = (k: Exclude<Open, null>) => setOpen((o) => (o === k ? null : k));
  const flip = <T,>(arr: T[], v: T): T[] => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const n = filterCount(filters);

  const Opt: React.FC<{ on: boolean; label: string; tail: number; onPick: () => void }> = ({ on, label, tail, onPick }) => (
    <button type="button" className={`tdv2-opt${on ? " sel" : ""}`} role="menuitemcheckbox" aria-checked={on} onClick={onPick}>
      <span className="tdv2-box"><Check /></span>{label}<span className="tdv2-tail">{tail}</span>
    </button>
  );

  const chips: { key: string; label: string; clear: () => void }[] = [
    ...filters.types.map((t) => ({ key: `t:${t}`, label: CATEGORY_TAG[t], clear: () => onFilters({ ...filters, types: filters.types.filter((x) => x !== t) }) })),
    ...filters.statuses.map((s) => ({ key: `s:${s}`, label: s, clear: () => onFilters({ ...filters, statuses: filters.statuses.filter((x) => x !== s) }) })),
    ...filters.pkgs.map((p) => ({ key: `p:${p}`, label: p, clear: () => onFilters({ ...filters, pkgs: filters.pkgs.filter((x) => x !== p) }) })),
    ...(filters.showSetAside ? [{ key: "aside", label: "Set aside shown", clear: () => onFilters({ ...filters, showSetAside: false }) }] : []),
  ];
  const clearAll = () => onFilters({ types: [], statuses: [], pkgs: [], showSetAside: false });

  return (
    <>
      <div className="tdv2-controls" ref={rowRef} data-todo-v2="controls">
        <label className="tdv2-search">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search tasks, agents or agencies"
            aria-label="Search tasks, agents or agencies"
          />
          <span className="tdv2-slash" aria-hidden="true">/</span>
        </label>

        <span className="tdv2-popwrap" data-pop="filter">
          <button type="button" className={`tdv2-ctl${n ? " has" : ""}`} aria-expanded={open === "filter"} onClick={() => toggle("filter")} data-todo-v2="filter-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
            <span className="tdv2-v">Filter</span>
            {n > 0 && <span className="tdv2-badge">{n}</span>}
          </button>
          {open === "filter" && (
            <div className="tdv2-panel" role="menu" aria-label="Filter tasks" data-todo-v2="filter-panel">
              <div className="tdv2-scrollbox" data-todo-v2="filter-scroll">
                <div className="tdv2-psec">
                  <h4>Task type</h4>
                  {TYPE_ORDER.filter((t) => (counts.types.get(t) ?? 0) > 0 || filters.types.includes(t)).map((t) => (
                    <Opt key={t} on={filters.types.includes(t)} label={CATEGORY_TAG[t]} tail={counts.types.get(t) ?? 0}
                      onPick={() => onFilters({ ...filters, types: flip(filters.types, t) })} />
                  ))}
                </div>
                {statusOrder.length > 0 && (
                  <div className="tdv2-psec">
                    <h4>Status</h4>
                    {statusOrder.map((s) => (
                      <Opt key={s} on={filters.statuses.includes(s)} label={s} tail={counts.statuses.get(s) ?? 0}
                        onPick={() => onFilters({ ...filters, statuses: flip(filters.statuses, s) })} />
                    ))}
                  </div>
                )}
                <div className="tdv2-psec">
                  <h4>Submission package</h4>
                  {[...counts.pkgs.keys()].sort((a, b) => a.localeCompare(b)).map((p) => (
                    <Opt key={p} on={filters.pkgs.includes(p)} label={p} tail={counts.pkgs.get(p) ?? 0}
                      onPick={() => onFilters({ ...filters, pkgs: flip(filters.pkgs, p) })} />
                  ))}
                </div>
                <div className="tdv2-psec">
                  <h4>Set aside</h4>
                  <Opt on={filters.showSetAside} label="Show tasks I've set aside" tail={counts.setAside}
                    onPick={() => onFilters({ ...filters, showSetAside: !filters.showSetAside })} />
                </div>
              </div>
              <div className="tdv2-pfoot">
                <button type="button" className="tdv2-btn tdv2-btn--ghost" onClick={clearAll}>Clear</button>
                <span className="tdv2-note">{n ? `${n} filter${n === 1 ? "" : "s"}` : "no filters"}</span>
              </div>
            </div>
          )}
        </span>

        <span className="tdv2-popwrap" data-pop="group">
          <button type="button" className="tdv2-ctl" aria-expanded={open === "group"} onClick={() => toggle("group")} data-todo-v2="group-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="4" width="18" height="6" rx="1.5" /><rect x="3" y="14" width="18" height="6" rx="1.5" /></svg>
            <span className="tdv2-k">Group</span><span className="tdv2-v">{GROUP_LABEL[group]}</span><Chevron />
          </button>
          {open === "group" && (
            <div className="tdv2-menu" role="menu" aria-label="Group tasks">
              {GROUP_KEYS.map((g) => (
                <button key={g} type="button" role="menuitemradio" aria-checked={g === group}
                  className={`tdv2-mi${g === group ? " on" : ""}`} onClick={() => { onGroup(g); setOpen(null); }}>
                  {GROUP_LABEL[g]}<span className="tdv2-dot" />
                </button>
              ))}
            </div>
          )}
        </span>

        <span className="tdv2-popwrap" data-pop="sort">
          <button type="button" className="tdv2-ctl" aria-expanded={open === "sort"} onClick={() => toggle("sort")} data-todo-v2="sort-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M7 4v16M7 20l-3-3M17 20V4M17 4l3 3" /></svg>
            <span className="tdv2-k">Sort</span><span className="tdv2-v">{SORT_LABEL[sort]}</span><Chevron />
          </button>
          {open === "sort" && (
            <div className="tdv2-menu" role="menu" aria-label="Sort tasks">
              {SORT_KEYS.map((k) => (
                <button key={k} type="button" role="menuitemradio" aria-checked={k === sort}
                  className={`tdv2-mi${k === sort ? " on" : ""}`} onClick={() => { onSort(k); setOpen(null); }}>
                  {SORT_LABEL[k]}<span className="tdv2-dot" />
                </button>
              ))}
            </div>
          )}
        </span>

        <button type="button" className="tdv2-ctl tdv2-ctl--quiet" onClick={onExport} data-todo-v2="export">Export CSV</button>
      </div>

      <div className={`tdv2-activebar${chips.length ? " show" : ""}`} data-todo-v2="activebar" aria-hidden={!chips.length}>
        <div className="tdv2-chips">
          {chips.map((c) => (
            <button key={c.key} type="button" className="tdv2-chip" onClick={c.clear} aria-label={`Remove filter: ${c.label}`}>{c.label}</button>
          ))}
        </div>
        <button type="button" className="tdv2-clear" onClick={clearAll} tabIndex={chips.length ? 0 : -1}>Clear all</button>
      </div>
    </>
  );
};
