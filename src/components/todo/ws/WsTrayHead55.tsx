/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v55 (design-refs/todo-list-v55/todo-tray-head-v2.html) — THE TRAY'S HEAD IS ONE LINE (D1): the tabs
 * "To do {n}", "Snoozed" and "Done" on the left, three icon buttons on the right (search, filter and group, collapse).
 * v54's segmented tabs, the breakdown bar under them, the search box and the separate filter and group buttons are gone:
 * the page header's ring and "What needs doing" legend already give the breakdown.
 *
 * Search (D2) turns the line into one field; the filter and group menu (D3) hangs under its icon; a filter on shows a
 * rust dot on that icon and a line under the head (D4, drawn by the workspace). Nothing here holds state of its own
 * except where focus goes: the workspace owns the tab, the query, the filters, the grouping and the collapse.
 */
import React, { useEffect, useRef } from "react";
import { WS_TYPES, WS_WHENS, type WsFilters, type WsGrouping, type WsType, type WsWhen } from "../../../lib/todoWs";
import { TRAY_GROUP_HINT, TRAY_WHEN_WORD } from "../../../lib/todoTrayHead55";

const SVG_SEARCH = <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></svg>;
const SVG_MENU = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" /></svg>;
export const SVG_COLLAPSE = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6l-6 6 6 6M19 6l-6 6 6 6" /></svg>;
export const SVG_EXPAND = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6l6 6-6 6M5 6l6 6-6 6" /></svg>;

export type TrayTab = "todo" | "snoozed" | "done";

export function WsTrayHead55(p: {
  tab: TrayTab; onTab: (t: TrayTab) => void; todo: number;
  searching: boolean; q: string; onQ: (q: string) => void; onOpenSearch: () => void; onCloseSearch: () => void;
  menu: boolean; onMenu: (open: boolean) => void;
  filters: WsFilters; onType: (k: WsType) => void; onWhen: (k: WsWhen) => void; onClear: () => void;
  grouping: WsGrouping; onGroup: (g: WsGrouping) => void; groupings: readonly { id: WsGrouping; label: string }[];
  onCollapse: () => void;
  /** the menu button, which the tags panel opens from */
  menuRef?: React.Ref<HTMLButtonElement>;
  /** the menu's foot: tag management's only way in (kept; not a filter) */
  extra?: React.ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const filtered = p.filters.types.size + p.filters.whens.size > 0;
  useEffect(() => { if (p.searching) input.current?.focus(); }, [p.searching]);
  /* the menu closes on a click outside it (and outside its own button, which toggles it) */
  useEffect(() => {
    if (!p.menu) return;
    const on = (e: PointerEvent) => {
      const w = wrap.current;
      if (w && !w.contains(e.target as Node)) p.onMenu(false);
    };
    document.addEventListener("pointerdown", on, true);
    return () => document.removeEventListener("pointerdown", on, true);
  }, [p.menu, p.onMenu]);
  return (
    <div className="tws55-head" data-tws55="head" data-search={p.searching ? "" : undefined} ref={wrap}>
      {p.searching ? (
        <label className="tws55-sfield" data-tws55="search">
          {SVG_SEARCH}
          <input ref={input} value={p.q} placeholder="Search tasks, agents or agencies" aria-label="Search tasks, agents or agencies"
            onChange={(e) => p.onQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); p.onCloseSearch(); } }} />
          <button type="button" data-tws55="search-close" aria-label="Close search" title="Close search" onClick={(e) => { e.preventDefault(); p.onCloseSearch(); }}>✕</button>
        </label>
      ) : (
        <>
          <div className="tws55-tabs" role="group" aria-label="Show">
            <button type="button" className="tws55-tab" data-tws55-tab="todo" aria-pressed={p.tab === "todo"} onClick={() => p.onTab("todo")}>
              To do<sup data-tws="todo-count">{p.todo}</sup>
            </button>
            <button type="button" className="tws55-tab" data-tws55-tab="snoozed" aria-pressed={p.tab === "snoozed"} onClick={() => p.onTab("snoozed")}>Snoozed</button>
            <button type="button" className="tws55-tab" data-tws55-tab="done" aria-pressed={p.tab === "done"} onClick={() => p.onTab("done")}>Done</button>
          </div>
          <span className="tws55-icons">
            <button type="button" className="tws55-ic" data-tws55="search-btn" aria-label="Search (/)" title="Search (/)" onClick={p.onOpenSearch}>{SVG_SEARCH}</button>
            <button type="button" ref={p.menuRef} className="tws55-ic" data-tws55="menu-btn" data-open={p.menu ? "" : undefined} aria-label="Filter and group" title="Filter and group"
              aria-expanded={p.menu} onClick={() => p.onMenu(!p.menu)}>
              {SVG_MENU}{filtered ? <span className="tws55-pip" data-tws55="dot" aria-hidden="true" /> : null}
            </button>
            <button type="button" className="tws55-ic" data-tws="collapse" aria-label="Collapse the list" title="Collapse the list" onClick={p.onCollapse}>{SVG_COLLAPSE}</button>
          </span>
        </>
      )}
      {p.menu ? (
        <div className="tws55-menu" data-tws55="menu" role="dialog" aria-label="Filter and group">
          <h4>Show only</h4>
          <div className="tws55-chips">
            {WS_TYPES.map((k) => <button key={k} type="button" className="tws55-chip" data-tws55-type={k} aria-pressed={p.filters.types.has(k)} onClick={() => p.onType(k)}>{k}</button>)}
          </div>
          <div className="tws55-chips">
            {WS_WHENS.map((k) => <button key={k} type="button" className="tws55-chip" data-tws55-when={k} aria-pressed={p.filters.whens.has(k)} onClick={() => p.onWhen(k)}>{TRAY_WHEN_WORD[k]}</button>)}
          </div>
          <hr />
          <h4>Group by</h4>
          <div role="radiogroup" aria-label="Group by">
            {p.groupings.map((g) => (
              <button key={g.id} type="button" className="tws55-opt" data-tws55-group={g.id} role="radio" aria-checked={p.grouping === g.id} onClick={() => p.onGroup(g.id)}>
                <i aria-hidden="true" /><span>{g.label}<small>{TRAY_GROUP_HINT[g.id]}</small></span>
              </button>
            ))}
          </div>
          <hr />
          <button type="button" className="tws55-clear" data-tws55="clear" onClick={p.onClear}>Clear filters</button>
          {p.extra}
        </div>
      ) : null}
    </div>
  );
}
