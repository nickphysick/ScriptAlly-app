/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v5 §C — the filter row: Find, then Task type · Agent · Due · More filters, in Contact list v17's
 * grammar (40px pills, navy once set with the choice as the label and a round ×; a panel with a Clear and a
 * "Show {n} tasks"). Page-local copies of v17's parts (a lift candidate).
 *
 * ⚠️ ONE PANEL AT A TIME, portalled to the body and placed under its pill. It closes on a press outside, on
 *    Escape (the escape stack, so it closes before anything under it), and on its own Show button. A scroll does
 *    not close it — the first press on a pill can scroll the page, and a panel closing on its own opening scroll
 *    is the trap the Contact list met.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { TRAY_GROUPS, TRAY_KINDS, type TrayFilters as F, type TrayItem } from "../../../lib/todoTray";
import { agentPrimary } from "../../../lib/agentDisplay";

type PanelId = "type" | "agent" | "due" | "more";
const DUE_OPTS: { id: TrayItem["due"]; label: string }[] = [
  { id: "past", label: "Past its date" }, { id: "week", label: "This week" }, { id: "later", label: "Later" }, { id: "none", label: "No date" },
];
export const typeLabel = (t: F["type"]): string => TRAY_KINDS.find((k) => k.id === t)?.label ?? TRAY_GROUPS.find((g) => g.id === t)?.name ?? "";

const Chev = () => <svg className="td5-chev" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const X = () => <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M2.5 2.5l5 5M7.5 2.5l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>;

/** Find: the filter row's field, and (v5.2 §E) the navy row's while pinned — the same state, `/` and Escape */
export const TrayFind: React.FC<{
  filters: F;
  setFilters: (f: F) => void;
  findRef: React.Ref<HTMLInputElement>;
  disabled?: boolean;
  placeholder?: string;
  pinned?: boolean;
}> = ({ filters, setFilters, findRef, disabled, placeholder = "Find a task, agent or agency", pinned = false }) => (
  <label className={`td5-find${pinned ? " td52-pfind" : ""}`} data-td5="find" data-td52={pinned ? "pin-find" : undefined}>
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="m11 11 3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
    <input ref={findRef} value={filters.find} disabled={disabled} placeholder={placeholder} aria-label={placeholder}
      onChange={(e) => setFilters({ ...filters, find: e.target.value })}
      onKeyDown={(e) => { if (e.key === "Escape" && filters.find) { e.preventDefault(); e.stopPropagation(); setFilters({ ...filters, find: "" }); } }} />
    {/* v12 W1 — the field's own key, drawn as a mark rather than a <kbd> (no key hints in the toolbar; "/" still works) */}
    <span className="td5-fkey" aria-hidden="true">/</span>
  </label>
);

export const TrayFilterRow: React.FC<{
  filters: F;
  setFilters: (f: F) => void;
  /** every item, unfiltered — the panels' counts */
  all: readonly TrayItem[];
  /** the result count for a candidate filter set */
  countFor: (f: F) => number;
  hasPin: (i: TrayItem) => boolean;
  findRef: React.Ref<HTMLInputElement>;
  disabled?: boolean;
  /** v5.2 §A — a calendar filter on: the Due pill shows it as its chip ("Overdue ×", "Due: 23 Oct ×") and × clears it */
  calChip?: { label: string; onClear: () => void } | null;
  /** v5.2 §E — false while pinned: Find is drawn in the navy row instead (the same field, one at a time) */
  findHere?: boolean;
}> = ({ filters, setFilters, all, countFor, hasPin, findRef, disabled, calChip, findHere = true }) => {
  const [open, setOpen] = useState<PanelId | null>(null);
  const anchors = useRef<Partial<Record<PanelId, HTMLButtonElement | null>>>({});
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  useEscapeLayer(!!open, () => { const a = open ? anchors.current[open] : null; setOpen(null); a?.focus(); }, ESC_LEVEL.page);

  useLayoutEffect(() => {
    if (!open) { setPos(null); return undefined; }
    const place = () => {
      const a = anchors.current[open];
      if (!a) return;
      const r = a.getBoundingClientRect();
      const w = panelRef.current?.offsetWidth ?? 300;
      setPos({ left: Math.max(16, Math.min(r.left, window.innerWidth - w - 16)), top: r.bottom + 10 });
    };
    place();
    window.addEventListener("resize", place);
    document.addEventListener("scroll", place, true);
    return () => { window.removeEventListener("resize", place); document.removeEventListener("scroll", place, true); };
  }, [open]);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || anchors.current[open]?.contains(t)) return;
      setOpen(null);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [open]);

  const toggle = (p: PanelId) => setOpen((o) => (o === p ? null : p));
  const agents = (() => {
    const m = new Map<string, { id: string; name: string; n: number }>();
    for (const i of all) if (i.agent) {
      const e = m.get(i.agent.id) ?? { id: i.agent.id, name: agentPrimary(i.agent), n: 0 };
      e.n += 1; m.set(i.agent.id, e);
    }
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name));
  })();
  const moreOn = (filters.linked ? 1 : 0) + (filters.pinned ? 1 : 0);

  const pill = (id: PanelId, word: string, set: string | null, clear: () => void, extra?: React.ReactNode) => (
    <span className={`td5-fpw${set ? " on" : ""}`} data-td5-pill={id}>
      <button type="button" className="td5-fp" ref={(el) => { anchors.current[id] = el; }} aria-haspopup="dialog" aria-expanded={open === id}
        disabled={disabled} onClick={() => toggle(id)}>
        <span>{set ?? word}</span>{extra}{!set ? <Chev /> : null}
      </button>
      {set ? <button type="button" className="td5-fpx" aria-label={`Clear ${word}`} onClick={clear}><X /></button> : null}
    </span>
  );
  const show = countFor(filters);
  const opt = (key: string, on: boolean, label: string, n: number, onClick: () => void) => (
    <button key={key} type="button" className={`td5-opt${on ? " on" : ""}${n === 0 ? " zero" : ""}`} data-opt="" role="menuitemradio" aria-checked={on} onClick={onClick}>
      <span className="td5-rd" aria-hidden="true" /><span className="td5-ol">{label}</span><small>{n}</small>
    </button>
  );
  const sw = (key: "linked" | "pinned", label: string, n: number) => (
    <button key={key} type="button" className="td5-opt" data-opt="" role="menuitemcheckbox" aria-checked={filters[key]}
      onClick={() => setFilters({ ...filters, [key]: !filters[key] })}>
      <span className="td5-ol">{label}</span><small>{n}</small><span className="td5-sw2" data-on={filters[key] ? "" : undefined}><i /></span>
    </button>
  );

  let panel: React.ReactNode = null;
  if (open === "type") {
    panel = (
      <>
        <div className="td5-pop-h"><b>Task type</b></div>
        <div className="td5-pop-b">
          {TRAY_KINDS.map((k) => opt(k.id, filters.type === k.id, k.label, all.filter((i) => i.kind === k.id).length, () => setFilters({ ...filters, type: filters.type === k.id ? null : k.id })))}
          <div className="td5-pop-g">Groups</div>
          {TRAY_GROUPS.filter((g) => g.id !== "you").map((g) => opt(`g-${g.id}`, filters.type === g.id, g.name, all.filter((i) => i.group.id === g.id).length, () => setFilters({ ...filters, type: filters.type === g.id ? null : g.id })))}
        </div>
      </>
    );
  } else if (open === "agent") {
    panel = (
      <>
        <div className="td5-pop-h"><b>Agent</b></div>
        <div className="td5-pop-b">
          {agents.length ? agents.map((a) => opt(a.id, filters.agentId === a.id, a.name, a.n, () => setFilters({ ...filters, agentId: filters.agentId === a.id ? null : a.id })))
            : <div className="td5-pop-g">No agent has a task.</div>}
        </div>
      </>
    );
  } else if (open === "due") {
    panel = (
      <>
        <div className="td5-pop-h"><b>Due</b></div>
        <div className="td5-pop-b">
          {DUE_OPTS.map((d) => opt(d.id, filters.due === d.id, d.label, all.filter((i) => i.due === d.id).length, () => setFilters({ ...filters, due: filters.due === d.id ? null : d.id })))}
        </div>
      </>
    );
  } else if (open === "more") {
    panel = (
      <>
        <div className="td5-pop-h"><b>More filters</b></div>
        <div className="td5-pop-b">
          {sw("linked", "Linked to a query", all.filter((i) => !!i.query).length)}
          {sw("pinned", "Has a pinned note", all.filter(hasPin).length)}
        </div>
      </>
    );
  }
  const clearThis = () => {
    if (open === "type") setFilters({ ...filters, type: null });
    else if (open === "agent") setFilters({ ...filters, agentId: null });
    else if (open === "due") setFilters({ ...filters, due: null });
    else if (open === "more") setFilters({ ...filters, linked: false, pinned: false });
  };

  return (
    <div className="td5-fr" data-td5="filters">
      {findHere ? <TrayFind filters={filters} setFilters={setFilters} findRef={findRef} disabled={disabled} /> : null}
      <div className="td5-pills" data-td5="pills">
        {pill("type", "Task type", filters.type ? typeLabel(filters.type) : null, () => setFilters({ ...filters, type: null }))}
        {pill("agent", "Agent", filters.agentId ? (agents.find((a) => a.id === filters.agentId)?.name ?? "Agent") : null, () => setFilters({ ...filters, agentId: null }))}
        {calChip ? (
          <span className="td5-fpw on" data-td5-pill="due" data-td52="due-chip">
            <button type="button" className="td5-fp" ref={(el) => { anchors.current.due = el; }} aria-pressed="true" disabled={disabled} onClick={calChip.onClear}><span>{calChip.label}</span></button>
            <button type="button" className="td5-fpx" aria-label={`Clear ${calChip.label}`} onClick={calChip.onClear}><X /></button>
          </span>
        ) : pill("due", "Due", filters.due ? DUE_OPTS.find((d) => d.id === filters.due)!.label : null, () => setFilters({ ...filters, due: null }))}
        {pill("more", "More filters", moreOn ? "More filters" : null, () => setFilters({ ...filters, linked: false, pinned: false }), moreOn ? <i className="td5-fpn">{moreOn} on</i> : null)}
      </div>
      {open && typeof document !== "undefined" ? createPortal(
        <div ref={panelRef} className="td5-pop" role="dialog" aria-label={open} data-td5="panel" data-panel={open}
          style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999 }}>
          {panel}
          <div className="td5-pop-f">
            <button type="button" className="td5-pop-clear" onClick={clearThis}>Clear</button>
            <button type="button" className="td5-pop-show" data-td5="show" onClick={() => setOpen(null)}>Show {show} {show === 1 ? "task" : "tasks"}</button>
          </div>
        </div>, document.body) : null}
    </div>
  );
};
