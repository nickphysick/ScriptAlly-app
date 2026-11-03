/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v151 (design-refs/query-centre-v151/, option B) — the desktop page: one width, a plain header, the info
 * banner, one toolbar row (tabs · search · Filters · Group, or Group and Sort in Birds-eye), the existing Filter queries
 * panel opened inline, the active-filter strip, then ONE TABLE with plain sections, or Birds-eye in a white card.
 *
 * ⚠️ EVERY FIGURE IS THE PAGE'S OWN: the tabs are the "who it's with" filter (`qcF138.where`), the panel is v142's
 *    strip, the rows are `buildQcRows`' and each row's next move is `nextDoor` (lib/queryActions/entry).
 * ⚠️ ONE WIDTH (`--qc151-w`) for every block on the page, set once on `.qc151`.
 * ⚠️ THE HOVER TIMELINE LIVES IN THE ROW'S OWN <tbody>: the row and its timeline are one hover target, so moving the
 *    pointer from one to the other keeps it open and leaving both closes it.
 */
import React, { useEffect, useRef, useState } from "react";
import { StatusDot } from "../../StatusDot";
import { usePopover } from "../../shell/ListPills";
import { guideSeen, markGuideSeen } from "../../../lib/pageGuide";
import { STAGE_NAME, type QcRow, type WhereKey } from "../../../lib/qcSummary";
import type { PeekEvent } from "../../../lib/qc138";
import { BE_GROUPS, BE_SORTS, type BeGroup, type BeSort } from "../../../lib/qc150";
import { GROUP_BY_OPTIONS, type GroupBy } from "../../../lib/qcCalView";
import {
  COLUMNS_151, TAB_LABEL, dueCell, dueMsOf, isClosedRow, lastHeardMs, nextCell, pressSort, shortDate, trackOf,
  type CountLine, type Section, type Sort151,
} from "../../../lib/qc151";
import { GROUP_LINE, RadioMenu151 } from "./QcToolbar140";
import { QC_DESK_HAWK } from "./QcHeader138";
import type { Qc140Chip } from "./QcFilterMenu140";
import "./qcv151.css";

export const QC151_BANNER_KEY = "queries-explainer";
export const HOVER_MS = 1000;

const LIST_ICON = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" /></svg>;
const BIRDS_ICON = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h9M4 12h14M4 17h6" /><circle cx="14" cy="7" r="1.6" /><circle cx="19" cy="12" r="1.6" /><circle cx="11" cy="17" r="1.6" /></svg>;
const PLANE = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 3 10 14" /><path d="M21 3 14.5 21l-4-7-7-4z" /></svg>;
const FIND = <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg>;
const FILTER = <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 5.5h14M5.5 10h9M8 14.5h4" /></svg>;
const GROUP = <svg className="gic" viewBox="0 0 20 20" aria-hidden="true"><rect x="2.5" y="2.5" width="15" height="6" rx="1.6" /><path d="M5.5 5.5h4" /><rect x="2.5" y="11.5" width="15" height="6" rx="1.6" /><path d="M5.5 14.5h4" /></svg>;
const SORT = <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4v12M3.5 13.5 6 16l2.5-2.5M14 16V4m-2.5 2.5L14 4l2.5 2.5" /></svg>;
const CARET = <svg className="qc151-cv" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5l3 3 3-3" /></svg>;
const CROSS = <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6" /></svg>;

export type View151 = "list" | "birds";

/** the Where it stands column: the status's own name; a closed query in the filter panel's short words (Passed, No reply,
 *  Withdrawn), so the column holds one line at 1280 */
const CLOSED_SHORT: Partial<Record<string, string>> = { "No Response": "No reply" };
export const standWords = (r: Pick<QcRow, "status">): string => CLOSED_SHORT[r.status] ?? STAGE_NAME[r.status];

/* ── the switch ── */
export const QcSwitch151: React.FC<{ view: View151; onView: (v: View151) => void; loading: boolean }> = ({ view, onView, loading }) => (
  <div className="qc151-sw" role="group" aria-label="View" data-qc151="switch">
    <button type="button" aria-pressed={view === "list"} data-v="list" disabled={loading} onClick={() => onView("list")}>{LIST_ICON}List</button>
    <button type="button" aria-pressed={view === "birds"} data-v="birds" disabled={loading} onClick={() => onView("birds")}>{BIRDS_ICON}Birds-eye</button>
  </div>
);

/* ── §2 the header ── */
export const QcHeader151: React.FC<{
  counts: CountLine | null; view: View151; onView: (v: View151) => void; loading: boolean;
  onLog: () => void; onRecord: () => void; logDisabled?: boolean; logRef?: React.Ref<HTMLButtonElement>;
}> = ({ counts, view, onView, loading, onLog, onRecord, logDisabled = false, logRef }) => (
  <header className="qc151-hd" data-qc151="header" data-qcv="open-header" data-own-header="">
    <div className="qc151-id">
      <img src={`${QC_DESK_HAWK.src}?v=${QC_DESK_HAWK.version}`} alt="" width={108} />
      <div>
        <h1 data-page-title="true" data-qc151="title">Your queries</h1>
        <p className="qc151-cl" data-qc151="count-line">
          {counts ? <><b>{counts.sent}</b> sent · <b>{counts.active}</b> active · <b>{counts.heardPct}%</b> heard back</> : " "}
        </p>
      </div>
    </div>
    <div className="qc151-acts">
      <QcSwitch151 view={view} onView={onView} loading={loading} />
      <button type="button" className="qc151-btn qc151-btn--g" data-qc151="record" data-qcv="oh-record" disabled={loading} onClick={onRecord}>Record a response</button>
      <button type="button" ref={logRef} className="qc151-btn qc151-btn--n" data-qc151="log" data-qcv="oh-log" disabled={loading || logDisabled} onClick={onLog}>+ Log a query</button>
    </div>
  </header>
);

/* ── §3 the info banner (dismissed in the packages banner's store, lib/pageGuide) ── */
export const QcBanner151: React.FC<{ onHow: () => void }> = ({ onHow }) => {
  const [gone, setGone] = useState(() => guideSeen(QC151_BANNER_KEY));
  if (gone) return null;
  return (
    <section className="qc151-ibn" aria-label="About the Query Centre" data-qc151="banner">
      <span className="qc151-ibn-ic" aria-hidden="true">{PLANE}</span>
      <p><b>Each row is one query to one agent:</b> where it stands, what you sent and what happens next. Rest on a row to see its timeline, or press it to open the full query card.</p>
      <button type="button" className="qc151-ibn-l" data-qc151="how" onClick={onHow}>How it works →</button>
      <button type="button" className="qc151-ibn-x" aria-label="Dismiss" data-qc151="banner-x" onClick={() => { markGuideSeen(QC151_BANNER_KEY); setGone(true); }}>{CROSS}</button>
    </section>
  );
};

/* ── §9 Birds-eye's Group and Sort menus' lines ── */
const BE_GROUP_LINE: Record<BeGroup, string> = { urgency: "Overdue, upcoming, watch and wait", status: "Where each query stands", none: "One timeline" };
const BE_SORT_LINE: Record<BeSort, string> = { due: "Soonest first", wait: "Oldest query first", agent: "By name" };

type Pop151 = "group" | "begroup" | "besort";

export interface QcPage151Props {
  loading: boolean;
  counts: CountLine | null;
  view: View151;
  onView: (v: View151) => void;
  onLog: () => void;
  onRecord: () => void;
  logDisabled?: boolean;
  logRef?: React.Ref<HTMLButtonElement>;
  onHow: () => void;
  /* §4 tabs */
  tabCounts: Record<WhereKey, number> | null;
  total: number;
  where: WhereKey | null;
  onWhere: (k: WhereKey | null) => void;
  find: string;
  onFind: (v: string) => void;
  findRef?: React.Ref<HTMLInputElement>;
  /* §5 Filters */
  filterCount: number;
  onClearFilters: () => void;
  filterPanel: (close: () => void) => React.ReactNode;
  /* §6 the strip */
  chips: Qc140Chip[];
  showing: number;
  onResetAll: () => void;
  /* §7 the table */
  group: GroupBy;
  onGroup: (g: GroupBy) => void;
  sort: Sort151;
  onSort: (s: Sort151) => void;
  sections: Section<QcRow>[];
  phraseOf: (r: QcRow) => string;
  nowMs: number;
  selectedId: string | null;
  onOpen: (id: string) => void;
  onAct: (id: string) => void;
  loadPeek: (id: string) => Promise<PeekEvent[]>;
  signoff: { total: number } | null;
  onImport: () => void;
  /* §9 Birds-eye */
  birds: React.ReactNode;
  birdsEmpty: "closed" | "filtered" | null;
  beGroup: BeGroup;
  onBeGroup: (g: BeGroup) => void;
  beSort: BeSort;
  onBeSort: (s: BeSort) => void;
}

/* ── §7 the status track ── */
export const Track151: React.FC<{ row: Pick<QcRow, "status" | "furthest"> }> = ({ row }) => {
  const t = trackOf(row);
  return (
    <span className={`qc151-trk${t.closed ? " qc151-trk--x" : ""}`} title={t.title} data-qc151="track" data-n={t.steps.length}>
      {t.steps.map((s, k) => (
        <React.Fragment key={k}>
          {k ? <i className={`qc151-cn qc151-cn--${s.state === "future" ? "f" : "p"}`} aria-hidden="true" /> : null}
          <span className={`qc151-st qc151-st--${s.state}`} data-qc151="step" data-state={s.state} data-status={s.status}>
            <StatusDot status={s.status} overrideSize={14} decorative />
            {s.state === "end" ? <svg className="qc151-xx" viewBox="0 0 14 14" aria-hidden="true"><path className="h" d="M4.3 4.3l5.4 5.4M9.7 4.3l-5.4 5.4" /><path d="M4.3 4.3l5.4 5.4M9.7 4.3l-5.4 5.4" /></svg> : null}
          </span>
        </React.Fragment>
      ))}
    </span>
  );
};

/* ── §7 the hover timeline ── */
const Stops151: React.FC<{ row: QcRow; events: PeekEvent[] | null; nowMs: number; phrase: string }> = ({ row, events, nowMs, phrase }) => {
  const closed = isClosedRow(row);
  const up = (ms: number) => shortDate(ms, nowMs).toUpperCase();
  const evs = (events ?? []).filter((e) => Number.isFinite(e.ms)).sort((a, b) => a.ms - b.ms);
  const stops: { k: string; cls: string; name: string; date: string }[] = evs.map((e, i) => ({ k: `e${i}`, cls: "ev", name: e.name, date: up(e.ms) }));
  if (!events) stops.push({ k: "ld", cls: "ev", name: "Loading", date: "" });
  if (!closed) {
    stops.push({ k: "today", cls: "t", name: "Today", date: up(nowMs) });
    const due = dueMsOf(row);
    const nc = nextCell(row, phrase, nowMs);
    const late = due != null && due < nowMs;
    stops.push({ k: "next", cls: late ? "d" : "f", name: nc.kind === "act" ? nc.label : phrase || "Reply due", date: due != null ? (late ? dueCell(due, nowMs)!.text.toUpperCase() : up(due)) : "NO DATE YET" });
  }
  return (
    <div className="qc151-l1" data-qc151="timeline-line">
      {stops.map((s, i) => (
        <React.Fragment key={s.k}>
          {i ? <span className={`qc151-ln${!closed && i === stops.length - 1 ? " qc151-ln--f" : ""}`} aria-hidden="true" /> : null}
          <span className={`qc151-p qc151-p--${s.cls}`} data-qc151="stop" data-k={s.k}><i aria-hidden="true" /><b>{s.name}</b>{s.date ? <em>{s.date}</em> : null}</span>
        </React.Fragment>
      ))}
    </div>
  );
};

export const QcPage151: React.FC<QcPage151Props> = (p) => {
  const pop = usePopover<Pop151>();
  const [panelOpen, setPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const filBtnRef = useRef<HTMLButtonElement>(null);
  const closePanel = () => setPanelOpen(false);
  /* §5 — a press anywhere outside the panel closes it (the Filters button toggles it itself) */
  useEffect(() => {
    if (!panelOpen) return undefined;
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || filBtnRef.current?.contains(t)) return;
      setPanelOpen(false);
    };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setPanelOpen(false); };
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", down, true); document.removeEventListener("keydown", key); };
  }, [panelOpen]);

  /* §7 — the hover timeline: 1000ms of rest on a row; one at a time; the row's tbody is the hover target */
  const [hotId, setHotId] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const cache = useRef(new Map<string, PeekEvent[]>());
  const [, bump] = useState(0);
  const enter = (id: string) => {
    if (!cache.current.has(id)) {
      p.loadPeek(id).then((ev) => { cache.current.set(id, ev); bump((n) => n + 1); }).catch(() => { cache.current.set(id, []); bump((n) => n + 1); });
    }
    window.clearTimeout(timer.current);
    if (hotId && hotId !== id) setHotId(null);
    timer.current = window.setTimeout(() => setHotId(id), HOVER_MS);
  };
  const leave = (id: string) => { window.clearTimeout(timer.current); setHotId((h) => (h === id ? null : h)); };
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const birds = p.view === "birds";
  const filtersOn = p.filterCount > 0;
  const showStrip = !panelOpen && (p.chips.length > 0);
  const groupOpt = GROUP_BY_OPTIONS.find((o) => o.key === p.group);
  const beGroupDef = p.beGroup === "urgency";
  const beSortDef = p.beSort === "due";

  const row = (r: QcRow) => {
    const phrase = p.phraseOf(r);
    const nc = nextCell(r, phrase, p.nowMs);
    const due = dueCell(dueMsOf(r), p.nowMs);
    const heard = lastHeardMs(r);
    const hot = hotId === r.id;
    return (
      <tbody key={r.id} className={`qc151-rg${hot ? " is-hot" : ""}`} data-qc151="row-group" onMouseEnter={() => enter(r.id)} onMouseLeave={() => leave(r.id)}>
        <tr className={`qc151-r${p.selectedId === r.id ? " is-sel" : ""}`} data-qc151="row" data-qcv="row" data-id={r.id} data-status={r.status} tabIndex={0}
          onClick={(e) => { if ((e.target as HTMLElement).closest("button")) return; p.onOpen(r.id); }}
          onKeyDown={(e) => { if (e.key === "Enter" && e.target === e.currentTarget) { e.preventDefault(); p.onOpen(r.id); } }}>
          <td className="qc151-tk"><Track151 row={r} /></td>
          <td className="qc151-nm" data-qc151="agent"><b title={r.agentName}>{r.agentName}</b></td>
          <td className="qc151-ag" data-qc151="agency" title={r.agency}>{r.agency}</td>
          <td className="qc151-ws" data-qc151="stands" title={standWords(r)}>{standWords(r)}</td>
          <td className="qc151-mono" data-qc151="queried">{r.sentMs != null ? shortDate(r.sentMs, p.nowMs) : "—"}</td>
          <td className="qc151-mono" data-qc151="heard">{heard != null ? shortDate(heard, p.nowMs) : "—"}</td>
          <td className="qc151-nx" data-qc151="next" data-kind={nc.kind}>
            {nc.kind === "act"
              ? <button type="button" className="qc151-mv" data-qc151="move" onClick={(e) => { e.stopPropagation(); p.onAct(r.id); }}>{nc.label}<span className="qc151-arr" aria-hidden="true"> →</span></button>
              : <span className="qc151-wt">{nc.label}</span>}
          </td>
          <td className={`qc151-due${due?.late ? " is-late" : ""}`} data-qc151="due" data-late={due?.late ? "" : undefined}>{due ? due.text : "—"}</td>
        </tr>
        {hot ? (
          <tr className="qc151-tlr" data-qc151="timeline">
            <td colSpan={8}><div className="qc151-pk"><Stops151 row={r} events={cache.current.get(r.id) ?? null} nowMs={p.nowMs} phrase={phrase} /></div></td>
          </tr>
        ) : null}
      </tbody>
    );
  };

  const empty = p.sections.length === 0;
  return (
    <div className="qc151" data-qc151="page" data-view={p.view}>
      <QcHeader151 counts={p.counts} view={p.view} onView={p.onView} loading={p.loading} onLog={p.onLog} onRecord={p.onRecord} logDisabled={p.logDisabled} logRef={p.logRef} />
      <QcBanner151 onHow={p.onHow} />

      {/* §4 the toolbar row */}
      <div className="qc151-tb" data-qc151="toolbar" data-qcv="ws-head">
        <nav className="qc151-tabs" aria-label="Who it's with" data-qc151="tabs">
          <button type="button" className="qc151-tab" data-k="all" aria-pressed={p.where === null} disabled={p.loading} onClick={() => p.onWhere(null)}>All <b>{p.tabCounts ? p.total : ""}</b></button>
          {(["you", "agent", "quiet", "closed"] as const).map((k) => (
            <button key={k} type="button" className="qc151-tab" data-k={k} aria-pressed={p.where === k} disabled={p.loading} onClick={() => p.onWhere(k)}>
              {TAB_LABEL[k]} <b>{p.tabCounts ? p.tabCounts[k] : ""}</b>
            </button>
          ))}
        </nav>
        <label className="qc151-sr" data-qc151="find" data-qc140="find">
          {FIND}
          <input ref={p.findRef} value={p.find} onChange={(e) => p.onFind(e.target.value)} placeholder="Find an agent" aria-label="Find an agent" autoComplete="off" disabled={p.loading} />
          {p.find ? <button type="button" className="qc151-srx" aria-label="Clear the search" data-qc151="find-clear" onClick={() => p.onFind("")}>{CROSS}</button> : null}
        </label>
        <div className="qc151-ctl" data-qc151="controls">
          <span className={`qc151-fw${panelOpen || filtersOn ? " is-on" : ""}`} data-qc151="filters-wrap">
            <button type="button" ref={filBtnRef} className="qc151-bb" data-qc151="filters" aria-expanded={panelOpen} aria-label={filtersOn ? `Filters: ${p.filterCount} on` : "Filters"} disabled={p.loading}
              onClick={() => setPanelOpen((o) => !o)}>
              {FILTER}<span>Filters</span>{filtersOn ? <em className="qc151-n" data-qc151="filters-n">{p.filterCount}</em> : null}
            </button>
            {filtersOn ? <button type="button" className="qc151-bx" data-qc151="filters-clear" aria-label="Reset all filters" title="Reset filters" onClick={() => p.onClearFilters()}>{CROSS}</button> : null}
          </span>
          <button type="button" className={`qc151-bb${(birds ? !beGroupDef : p.group !== "attention") ? " is-on" : ""}`} data-qc151={birds ? "be-group" : "group"} data-lp="qc151-group" aria-haspopup="menu"
            aria-expanded={pop.open === (birds ? "begroup" : "group")} disabled={p.loading}
            aria-label={birds ? `Group Birds-eye by ${BE_GROUPS.find((g) => g.key === p.beGroup)?.label}` : `Group the list by ${groupOpt?.label ?? ""}`}
            onClick={(e) => pop.toggle(birds ? "begroup" : "group", e.currentTarget)}>{GROUP}<span>Group</span>{CARET}</button>
          {birds ? (
            <button type="button" className={`qc151-bb${!beSortDef ? " is-on" : ""}`} data-qc151="be-sort" data-lp="qc151-sort" aria-haspopup="menu" aria-expanded={pop.open === "besort"} disabled={p.loading}
              aria-label={`Sort within groups by ${BE_SORTS.find((s) => s.key === p.beSort)?.label}`}
              onClick={(e) => pop.toggle("besort", e.currentTarget)}>{SORT}<span>Sort</span>{CARET}</button>
          ) : null}
          {pop.open === "group" && pop.anchor ? (
            <RadioMenu151 anchor={pop.anchor} title="Group the list by" k="group" value={p.group}
              opts={GROUP_BY_OPTIONS.map((o) => ({ key: o.key, label: o.label, line: GROUP_LINE[o.key], divide: o.key === "none" }))}
              onPick={(v) => { p.onGroup(v as GroupBy); pop.close(); }} />
          ) : null}
          {pop.open === "begroup" && pop.anchor ? (
            <RadioMenu151 anchor={pop.anchor} title="Group Birds-eye by" k="be-group" value={p.beGroup}
              opts={BE_GROUPS.map((o) => ({ key: o.key, label: o.label, line: BE_GROUP_LINE[o.key] }))}
              onPick={(v) => { p.onBeGroup(v as BeGroup); pop.close(); }} />
          ) : null}
          {pop.open === "besort" && pop.anchor ? (
            <RadioMenu151 anchor={pop.anchor} title="Sort within groups by" k="be-sort" value={p.beSort}
              opts={BE_SORTS.map((o) => ({ key: o.key, label: o.label, line: BE_SORT_LINE[o.key] }))}
              onPick={(v) => { p.onBeSort(v as BeSort); pop.close(); }} />
          ) : null}
        </div>
      </div>

      {/* §5 the panel, inline */}
      {panelOpen ? <div className="qc151-fpw" ref={panelRef} data-qc151="filter-panel">{p.filterPanel(() => { closePanel(); filBtnRef.current?.focus({ preventScroll: true }); })}</div> : null}

      {/* §6 the active strip */}
      {showStrip ? (
        <div className="qc151-ast" data-qc151="strip" aria-live="polite">
          <span className="qc151-ast-lb">Showing {p.showing} of {p.total}</span>
          <span className="qc151-ast-cs">
            {p.chips.map((c) => (
              <button key={c.key} type="button" className="qc151-ast-c" data-qc151="strip-chip" data-k={c.key} aria-label={`Remove ${c.label}`} onClick={c.off}>{c.label}{CROSS}</button>
            ))}
          </span>
          <button type="button" className="qc151-ast-r" data-qc151="strip-reset" onClick={p.onResetAll}>Reset all</button>
        </div>
      ) : null}

      {birds ? (
        <div className="qc151-be" data-qc151="birds-card">
          {p.birdsEmpty ? (
            <div className="qc151-emp" data-qc151="birds-empty">
              <b>Nothing on the timeline</b>
              {p.birdsEmpty === "closed"
                ? <><i>Closed queries don’t appear on Birds-eye. Switch to List to see them.</i><button type="button" className="qc151-btn qc151-btn--g" data-qc151="back-to-list" onClick={() => p.onView("list")}>Back to List</button></>
                : <><i>No live queries match these filters.</i><button type="button" className="qc151-btn qc151-btn--g" data-qc151="birds-reset" onClick={p.onResetAll}>Reset filters</button></>}
            </div>
          ) : p.birds}
        </div>
      ) : (
        <table className="qc151-tbl" data-qc151="table" data-qcv="list">
          <colgroup><col className="c-tk" /><col className="c-nm" /><col className="c-ag" /><col className="c-ws" /><col className="c-q" /><col className="c-h" /><col className="c-nx" /><col className="c-due" /></colgroup>
          <thead>
            <tr>
              <th aria-label="Status" />
              {COLUMNS_151.map((c) => {
                const on = p.sort.key === c.key;
                return (
                  <th key={c.key} className={on ? "is-on" : undefined} data-qc151="heading" data-k={c.key} aria-sort={on ? (p.sort.desc ? "descending" : "ascending") : "none"}>
                    <button type="button" onClick={() => p.onSort(pressSort(p.sort, c.key))}>{c.label}<span className="qc151-ar" aria-hidden="true">{on ? (p.sort.desc ? "↓" : "↑") : "↕"}</span></button>
                  </th>
                );
              })}
            </tr>
          </thead>
          {empty ? (
            <tbody><tr><td colSpan={8}>
              <div className="qc151-emp" data-qc151="no-matches">
                <b>No queries match</b>
                <i>{[...p.chips.map((c) => c.label), ...(p.where ? [TAB_LABEL[p.where]] : [])].join(" · ") || "this view"}</i>
                <button type="button" className="qc151-btn qc151-btn--g" data-qc151="empty-reset" onClick={p.onResetAll}>Reset filters</button>
              </div>
            </td></tr></tbody>
          ) : p.sections.map((s) => (
            <React.Fragment key={s.key}>
              {s.label ? <tbody className="qc151-secg"><tr className="qc151-sec" data-qc151="section" data-k={s.key}><td colSpan={8}>{s.label}<small>{s.rows.length}</small></td></tr></tbody> : null}
              {s.rows.map(row)}
            </React.Fragment>
          ))}
        </table>
      )}

      {/* §7 the sign-off: All, nothing narrowing, List only */}
      {!birds && p.signoff ? (
        <section className="qc151-end" data-qc151="signoff">
          <img src="/images/query-centre/quill-ink.webp" alt="" />
          <div>
            <h2>That’s all {p.signoff.total}.</h2>
            <p>When you send the next one, log it here and QueryHawk will keep count of the days.</p>
          </div>
          <div className="qc151-end-b">
            <button type="button" className="qc151-btn qc151-btn--g" data-qc151="import" onClick={p.onImport}>Import from a spreadsheet</button>
            <button type="button" className="qc151-btn qc151-btn--n" data-qc151="signoff-log" onClick={p.onLog}>+ Log a query</button>
          </div>
        </section>
      ) : null}
    </div>
  );
};
