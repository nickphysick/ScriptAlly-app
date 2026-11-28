/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v151.1 (design-refs/query-centre-v151-1/; v151 underneath) — the desktop page: one width, a plain
 * header, the "This week" summary card, one row of quick filters beside the List | Birds-eye switch, the control line
 * (Showing N of M · search · Filters · Group, or Group and Sort in Birds-eye), the pill row while anything is set, the
 * existing Filter queries panel opened inline, then ONE TABLE of mini-card rows under one header row per group, or
 * Birds-eye in a white card.
 *
 * ⚠️ EVERY FIGURE IS THE PAGE'S OWN: the quick filters are the "who it's with" filter (`qcF138.where`), the panel is
 *    v142's strip, the rows are `buildQcRows`' and each row's button is its `nextDoor` (lib/queryActions/entry).
 * ⚠️ ONE WIDTH for every block on the page: `.qc151` fills the shared content column (page width v1).
 * ⚠️ THE GROUP HEADER ROWS ARE STICKY CELLS IN ONE TABLE, as the ref's are: each sticks at the sheet's lip while its
 *    group passes, and the next group's header (later in the table) paints over it when it arrives.
 */
import React, { useEffect, useRef, useState } from "react";
import { useStableFn } from "../../../lib/useStableFn";
import { QueryStatus, type Agent } from "../../../types";
import { StatusDot } from "../../StatusDot";
import { usePinCover } from "../../shell/stickyStack";
import { whereItStands, type QcRow, type WhereKey } from "../../../lib/qcSummary";
import type { BeGroup, BeSort } from "../../../lib/qc150";
import type { GroupBy } from "../../../lib/qcCalView";
import { TAB_LABEL, isClosedRow, lastHeardMs, pressSort, trackOf, type Section, type Sort151, type SortKey151 } from "../../../lib/qc151";
import { dayLine, pillWords, yearSplit, type PillGroup } from "../../../lib/qc1511";
import { STATUS_FILL, nextNum, rowAct, statusKind } from "../../../lib/qc1512";
import { quickOfRow, stateOf } from "../../../lib/queryState";
import type { DrawerMode } from "../../../lib/queryActions/drawerStore";
import { RadioMenu151 } from "./QcToolbar140";
import { head1522 } from "../../../lib/qc1522";
import { QcHeader1531 } from "./QcHeader1531";
import { QcBar153 } from "./QcBar153";
import { AppliedRow, type AppliedChip } from "../../shell/AppliedRow";
import { ACTION_WHY_153, FOLD_LINE, foldInitials, isFoldKey } from "../../../lib/qc153";
import { sectionSwatch, standWords } from "../../../lib/qc153";
import { STAGE_COLOURS } from "../../../lib/stageColours";
import { FirstPanel155, QuietPanel155, Skeleton155 } from "./QcState155";
import { LoadFailed } from "../../notes/LoadFailed";
import { ListCap169 } from "./QcRows169";
import { QcRow170 } from "./QcRow170";
import "./qcv169.css";
import { QcSlim156 } from "./QcSlim156";
import { useTallRail } from "../../shell/useTallRail";
import type { WeekGoal154 } from "../../../lib/qc154goal";
import "./qcv151.css";
import "./qcv1522.css";
import "./qcv153.css";
import "./qcv1541.css";
import "./qcv156.css";

const LIST_ICON = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" /></svg>;
const BIRDS_ICON = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h9M4 12h14M4 17h6" /><circle cx="14" cy="7" r="1.6" /><circle cx="19" cy="12" r="1.6" /><circle cx="11" cy="17" r="1.6" /></svg>;
const FIND = <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg>;
const CARET = <svg className="qc151-cv" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5l3 3 3-3" /></svg>;
const CHEV = <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5l3 3 3-3" /></svg>;
/* v152.2 §1.2 — the package icon (the ref's): white on the Harbour label, grey on "Nothing recorded" */
const PKG_ICON = <svg className="qc1522-pk" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 6.5 10 3l7 3.5v7L10 17l-7-3.5z" /><path d="M3 6.5 10 10l7-3.5M10 10v7" /></svg>;

export type View151 = "list" | "birds";

/** the Where it stands words: moved to lib/qc153 (the slip reads them), re-exported for this file's older readers */
export { standWords } from "../../../lib/qc153";

/** the sort's column words (the headings', the Sort pill's). v151's Agency and Next move columns are folded away; a
 *  sort still set on them from earlier in the visit keeps its own name. */
/** the arrow, the ref's: ↓ for the column's own direction (soonest / earliest first), ↑ reversed */
export const arrow = (s: Sort151): string => (s.desc ? "↑" : "↓");

/* ── the switch ── */
export const QcSwitch151: React.FC<{ view: View151; onView: (v: View151) => void; loading: boolean }> = ({ view, onView, loading }) => (
  <div className="qc151-sw" role="group" aria-label="View" data-qc151="switch">
    <button type="button" aria-pressed={view === "list"} data-v="list" disabled={loading} onClick={() => onView("list")}>{LIST_ICON}List</button>
    <button type="button" aria-pressed={view === "birds"} data-v="birds" disabled={loading} onClick={() => onView("birds")}>{BIRDS_ICON}Birds-eye</button>
  </div>
);

/* ── §1 the header's figures (v151.2's count line; v153.1 reads its count and its manuscript) ── */
export interface CountLine1512 { ms: string | null; sent: number; active: number; heardPct: number }

/* ── §9 Birds-eye's Group and Sort menus' lines ── */
const BE_GROUP_LINE: Record<BeGroup, string> = { state: "Needs action, within their window, waiting with no reply date, closed", urgency: "Overdue, upcoming, watch and wait", status: "Where each query stands", none: "One timeline" };
const BE_SORT_LINE: Record<BeSort, string> = { due: "Soonest first", wait: "Oldest query first", agent: "By name" };


export interface QcPage151Props {
  loading: boolean;
  /** v156 §3 — the week model the header's line draws, for the collapsed header's "n of goal" and streak */
  goal?: WeekGoal154 | null;
  view: View151;
  onView: (v: View151) => void;
  onLog: () => void;
  onRecord: () => void;
  logDisabled?: boolean;
  logRef?: React.Ref<HTMLButtonElement>;
  /* §1 the header's count and manuscript (v153.1) */
  counts?: CountLine1512 | null;
  /** v153.1 — the stage ring card, built by the page that owns the rail's filters */
  ring?: React.ReactNode;
  /* §3 the quick filters */
  tabCounts: Record<WhereKey, number> | null;
  total: number;
  where: WhereKey | null;
  onWhere: (k: WhereKey | null) => void;
  /* §4 the control line */
  showing: number;
  find: string;
  onFind: (v: string) => void;
  findRef?: React.Ref<HTMLInputElement>;
  filterCount: number;
  onClearFilters: () => void;
  /** List filters v1 — Export, in the bar: the rows the list shows */
  onExport: () => void;
  filterPanel: (close: () => void) => React.ReactNode;
  /* §5 the pills */
  pills: PillGroup[];
  /** List filters v1 — the applied row: one chip per choice (Queries.tsx's qc140Chips), and its Clear all (the
   *  filters and the search; never the sort or the grouping, which the bar's buttons show) */
  applied: AppliedChip[];
  /** v172 — when nothing matches: the panel filter whose removal brings the most back, and how many */
  hint172?: { label: string; n: number; onRemove: () => void } | null;
  onClearApplied: () => void;
  /* the table */
  group: GroupBy;
  onGroup: (g: GroupBy) => void;
  /** v152.2 §1.1 — grouping by package: Pro or founding (lib/entitlements `versionsUnlocked`) */
  packageOk: boolean;
  sort: Sort151;
  onSort: (s: Sort151) => void;
  sections: Section<QcRow>[];
  phraseOf: (r: QcRow) => string;
  nowMs: number;
  selectedId: string | null;
  onOpen: (id: string) => void;
  /** v151.2 — the row's one action (lib/qc1512 `rowAct`): its journey's mode */
  onAct: (id: string, mode?: DrawerMode) => void;
  /** v153 — the slip's "Sent with": the package's name, or null when none is recorded */
  packageNameOf: (r: QcRow) => string | null;
  /** v153.1 — the query's agent, for the slip's "Their policy" box */
  agentOf?: (r: QcRow) => Pick<Agent, "noResponseMeansNo" | "responseTimeWeeks"> | null;
  /** v153 — the filter rail, drawn in the left column */
  rail?: React.ReactNode;
  onImport: () => void;
  /* §9 Birds-eye */
  birds: React.ReactNode;
  birdsEmpty: "closed" | "filtered" | null;
  beGroup: BeGroup;
  onBeGroup: (g: BeGroup) => void;
  beSort: BeSort;
  onBeSort: (s: BeSort) => void;
  /** v155 — the list's state, decided by the page from the data (lib/qc155): null is the everyday list */
  state155?: State155 | null;
}

/** v155 — the states the list draws besides the everyday one */
/* overnight fixes v1, Part 2 — `error`: a read failed, so the list is not known to be empty. It takes day one's place,
   with the rail inert as on day one, and offers no import. */
export type State155 = { kind: "quiet"; body: string } | { kind: "first" } | { kind: "loading"; show: boolean }
  | { kind: "error"; words: string; busy: boolean; retry: () => void };

/* ── the status track (v151 §7) ── */
export const Track151: React.FC<{ row: Pick<QcRow, "status" | "furthest"> }> = ({ row }) => {
  const t = trackOf(row);
  return (
    <span className={`qc151-trk${t.closed ? " qc151-trk--x" : ""}`} title={t.title} data-qc151="track" data-n={t.steps.length}>
      {t.steps.map((s, k) => (
        <React.Fragment key={k}>
          {k ? <i className={`qc151-cn qc151-cn--${s.state === "future" ? "f" : "p"}`} aria-hidden="true" /> : null}
          <span className={`qc151-st qc151-st--${s.state}`} data-qc151="step" data-state={s.state} data-status={s.status}>
            <StatusDot status={s.status} overrideSize={14} decorative />
            {s.state === "end" ? <CrossMark /> : null}
          </span>
        </React.Fragment>
      ))}
    </span>
  );
};
const CrossMark: React.FC = () => (
  <svg className="qc151-xx" viewBox="0 0 14 14" aria-hidden="true"><path className="h" d="M4.3 4.3l5.4 5.4M9.7 4.3l-5.4 5.4" /><path d="M4.3 4.3l5.4 5.4M9.7 4.3l-5.4 5.4" /></svg>
);

/** a date cell: "2 Jul", and a lighter "’25" in another year */
const DateCell: React.FC<{ ms: number | null; nowMs: number; probe: string }> = ({ ms, nowMs, probe }) => {
  if (ms == null) return <td className="qc1511-d" data-qc151={probe}>{"—"}</td>;
  const y = yearSplit(ms, nowMs);
  return <td className="qc1511-d" data-qc151={probe}>{y.dm}{y.yr ? <span className="qc1511-yr"> {y.yr}</span> : null}</td>;
};

const OPENED_KEY = "qh.qc.folds153";
const readOpened = (): Set<string> => { try { return new Set(JSON.parse(sessionStorage.getItem(OPENED_KEY) ?? "[]") as string[]); } catch { return new Set(); } };
const COLLAPSE_KEY = "qh.qc.collapsed1511";
const readCollapsed = (): Set<string> => { try { return new Set(JSON.parse(sessionStorage.getItem(COLLAPSE_KEY) ?? "[]") as string[]); } catch { return new Set(); } };

export const QcPage151: React.FC<QcPage151Props> = (p) => {
  /* the group headers and Birds-eye's date row pin under the sheet's 12px lip (`--pin-cover`, measured on the sheet) */
  const rootRef = useRef<HTMLDivElement>(null);
  const [sheet, setSheet] = useState<HTMLElement | null>(null);
  useEffect(() => { setSheet(rootRef.current?.closest<HTMLElement>(".ws-window") ?? null); }, []);
  usePinCover(sheet);
  const [panelOpen, setPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const filBtnRef = useRef<HTMLButtonElement>(null);
  const closePanel = () => setPanelOpen(false);
  /* a press anywhere outside the panel closes it; the Filters button, a filter pill and + Filter open it themselves */
  useEffect(() => {
    if (!panelOpen) return undefined;
    const down = (e: PointerEvent) => {
      const t = e.target as Element;
      if (panelRef.current?.contains(t) || filBtnRef.current?.contains(t) || t.closest?.("[data-opens-panel]")) return;
      setPanelOpen(false);
    };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setPanelOpen(false); };
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", down, true); document.removeEventListener("keydown", key); };
  }, [panelOpen]);

  /* v152.2 §1.5 — a stuck header casts a 10px shadow: it is stuck when it has slid down its own table (derived from the
     boxes on every scroll, never an observer) */
  useEffect(() => {
    let raf = 0;
    const read = () => {
      raf = 0;
      rootRef.current?.querySelectorAll<HTMLElement>(".qc1522-t").forEach((t) => {
        const hd = t.querySelector<HTMLElement>(".qc1522-gh td");
        if (!hd) return;
        const stuck = hd.getBoundingClientRect().top - t.getBoundingClientRect().top > 0.5;
        if (stuck !== t.hasAttribute("data-stuck")) t.toggleAttribute("data-stuck", stuck);
      });
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(read); };
    document.addEventListener("scroll", on, true);
    on();
    return () => { document.removeEventListener("scroll", on, true); if (raf) cancelAnimationFrame(raf); };
  }, []);

  /* v154 §6 — the sticky toolbar: once it is stuck, its count gives way to the current group (the last heading that
     has scrolled above its bottom edge, less its 22px fade); not stuck, the count comes back. The group's words stay
     put for the 0.25s fade-out, then clear so the count's width is its own again. Read from the boxes on every
     scroll, like the header shadow above. */
  const tbRef = useRef<HTMLDivElement>(null);
  const [tbOn, setTbOn] = useState(false);
  const [tbGrp, setTbGrp] = useState<{ label: string; count: string } | null>(null);
  useEffect(() => {
    let raf = 0;
    let clear = 0;
    const read = () => {
      raf = 0;
      const tb = tbRef.current, root = rootRef.current;
      if (!tb || !root || !tb.offsetParent) return;
      const port = tb.closest<HTMLElement>(".wpg-scroll") ?? document.scrollingElement as HTMLElement | null;
      const portTop = port && port !== document.scrollingElement ? port.getBoundingClientRect().top : 0;
      const box = tb.getBoundingClientRect();
      const top = parseFloat(getComputedStyle(tb).top) || 0;
      const stuck = (port?.scrollTop ?? 0) > 0 && box.top - portTop <= top + 0.5;
      const line = box.bottom - 22;
      let cur: HTMLElement | null = null;
      root.querySelectorAll<HTMLElement>("[data-qc154='head']").forEach((h) => { if (h.getBoundingClientRect().top < line) cur = h; });
      const c = cur as HTMLElement | null;
      /* v156 §5 — the strip paints the page only once stuck, so at rest nothing clips the header panel's shadow */
      if (tb.hasAttribute("data-qc156-stuck") !== stuck) tb.toggleAttribute("data-qc156-stuck", stuck);
      const on = stuck && !!c;
      setTbOn(on);
      if (on && c) {
        const next = { label: c.dataset.label ?? "", count: c.dataset.count ?? "" };
        window.clearTimeout(clear);
        setTbGrp((g) => (g && g.label === next.label && g.count === next.count ? g : next));
      } else {
        window.clearTimeout(clear);
        clear = window.setTimeout(() => setTbGrp(null), 260);
      }
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(read); };
    document.addEventListener("scroll", on, true);
    window.addEventListener("resize", on);
    on();
    return () => { document.removeEventListener("scroll", on, true); window.removeEventListener("resize", on); if (raf) cancelAnimationFrame(raf); window.clearTimeout(clear); };
  }, []);
  /* v154 §6 — the rail sticks 14px under the toolbar's top; taller than the scrollport, it scrolls with the page
     (shell/useTallRail, extracted from here unchanged; the Contact list's Views panel uses it too) */
  useTallRail(rootRef, p.rail);

  /* §6 — a group's rows fold away under its header, for the session */
  const [collapsed, setCollapsed] = useState<Set<string>>(readCollapsed);
  const fold = (k: string) => setCollapsed((c) => {
    const n = new Set(c); if (n.has(k)) n.delete(k); else n.add(k);
    try { sessionStorage.setItem(COLLAPSE_KEY, JSON.stringify([...n])); } catch { /* a private window */ }
    return n;
  });

  const birds = p.view === "birds";
  /* v155 §2 — day one: the panel alone in the list (in either view), the rail receded and inert */
  const first155 = p.state155?.kind === "first";
  const error155 = p.state155?.kind === "error" ? p.state155 : null;
  /* v155 §3 — loading: the list is busy and draws nothing until the skeleton is due (200ms), then the placeholders */
  const loading155 = p.state155?.kind === "loading";
  const filtersOn = p.filterCount > 0;

  const heading = (k: SortKey151, label: string, cls: string) => {
    const on = p.sort.key === k;
    return (
      <td key={k} className={`qc1511-lbl ${cls}${on ? " is-on" : ""}`} data-qc1511="label" data-k={k} aria-sort={on ? (p.sort.desc ? "descending" : "ascending") : "none"}>
        <button type="button" onClick={() => p.onSort(pressSort(p.sort, k))}>{label}<span className="qc1511-ar" aria-hidden="true">{on ? arrow(p.sort) : "↕"}</span></button>
      </td>
    );
  };
  const labels = () => [
    heading("stage", "Where it stands", "c-ws"),
    heading("queried", "Queried", "c-d"),
    heading("heard", "Last heard", "c-d"),
    heading("due", "Next", "c-nx"),
    <td key="act" className="qc1511-lbl c-act" />,
  ];

  /* v151.2 §4 — a row: 68px, a plain white start (Day N over the track), the name with its tag, the status as a white
     tag with a coloured cap, the Next column's big number, and the one action (navy yours; outlined Nudge) */
  const row = (r: QcRow, last: boolean) => {
    const nn = nextNum(r, p.nowMs);
    const act = rowAct(r, p.nowMs);
    const wh = quickOfRow(r, () => whereItStands(r, p.nowMs));
    const qs = stateOf(r);
    const day = dayLine(r, p.nowMs);
    const closed = isClosedRow(r);
    const sk = statusKind(r.status);
    return (
      <tr key={r.id} className={`qc1511-r qc1512-r${last ? " is-last" : ""}${p.selectedId === r.id ? " is-sel" : ""}`} data-qc151="row" data-qcv="row" data-id={r.id} data-status={r.status} data-where={wh} data-state={qs} tabIndex={0}
        onClick={(e) => { if ((e.target as HTMLElement).closest("button")) return; p.onOpen(r.id); }}
        onKeyDown={(e) => { if (e.key === "Enter" && e.target === e.currentTarget) { e.preventDefault(); p.onOpen(r.id); } }}>
        <td className="qc1511-tk qc1512-tk" data-qc1511="tint">
          {day ? <span className="qc1511-day" data-qc1511="day">{day}</span> : null}
          <Track151 row={r} />
        </td>
        <td className="qc1511-nm" data-qc151="agent">
          <span className="qc1512-nl"><b>{r.agentName}</b></span>
          <span className="qc1511-agy" data-qc151="agency" title={r.agencyKey || undefined}>{r.agencyKey || "—"}</span>
        </td>
        <td className="qc1511-ws" data-qc151="stands">
          <span className={`qc1512-wp${closed ? " is-closed" : ""}`} data-qc1511="stand-pill" data-sk={sk}>
            <span className="qc1512-cap" data-qc1512="cap" style={{ background: STATUS_FILL[sk] }}>
              {closed
                ? <span className="qc151-st qc151-st--end qc1511-wx"><StatusDot status={QueryStatus.QUERIED} overrideSize={14} decorative /><CrossMark /></span>
                : <StatusDot status={r.status} overrideSize={14} decorative />}
            </span>
            <span className="qc1512-wt">{standWords(r)}</span>
          </span>
        </td>
        <DateCell ms={r.sentMs} nowMs={p.nowMs} probe="queried" />
        <DateCell ms={lastHeardMs(r)} nowMs={p.nowMs} probe="heard" />
        <td className={`qc1512-nx qc1512-nx--${nn.kind === "dash" ? "none" : nn.tone}`} data-qc151="next" data-tone={nn.kind === "dash" ? "none" : nn.tone}>
          {nn.kind === "num"
            ? <span className="qc1512-nn"><b data-qc1512="next-n">{nn.n}</b><small data-qc1512="next-l">{nn.label[0]}<br />{nn.label[1]}</small></span>
            : nn.kind === "text" ? <span className="qc1512-nt">{nn.text}</span> : "—"}
        </td>
        <td className="qc1511-act" data-qc1511="action">
          {act && act.tone !== "plain"
            ? <button type="button" className={`qc151-mv qc1512-mv qc1512-mv--${act.tone}`} data-qc151="move" data-tone={act.tone} onClick={(e) => { e.stopPropagation(); p.onAct(r.id, act.mode); }}>{act.label}<span className="qc151-arr" aria-hidden="true"> →</span></button>
            : null}
        </td>
      </tr>
    );
  };

  const empty = p.sections.length === 0;
  /* v153 — a fold opens in place, for the session */
  const [opened, setOpened] = useState<Set<string>>(readOpened);
  const openFold = (k: string, on: boolean) => setOpened((c) => {
    const n = new Set(c); if (on) n.add(k); else n.delete(k);
    try { sessionStorage.setItem(OPENED_KEY, JSON.stringify([...n])); } catch { /* a private window */ }
    return n;
  });
  /* v154 — each group's queries are a 3-across grid of small cards (the slip's successor: same row, facts and act) */
  /* v161 — stable callbacks, so a row whose query did not change is not re-rendered for a new closure */
  const onOpen154 = useStableFn(p.onOpen), onAct154 = useStableFn(p.onAct);
  /* v172 — each query is a row of the one list card (QcRow170); the v154 grid of small cards is retired here */
  const card = (r: QcRow) => (
    <QcRow170 key={r.id} row={r} nowMs={p.nowMs} selected={p.selectedId === r.id} packageName={p.packageNameOf(r)} onOpen={onOpen154} onAct={onAct154} />
  );
  const only = p.sections.length === 1;
  useEffect(() => {
    const tb = tbRef.current, root = rootRef.current; if (!tb || !root) return undefined;
    const set = () => root.style.setProperty("--qc169-strip", `${tb.offsetHeight}px`);
    set(); const ro = new ResizeObserver(set); ro.observe(tb); return () => ro.disconnect();
  }, []);
  /* v172 — the list as rows in one card (the Contact list's card: a cap pinned under the strip, with the column heads) */
  const wrap169 = (kids: React.ReactNode) => (
    <section className="qc169-card" data-qc169="card">
      <ListCap169 sort={p.sort} onSort={p.onSort} />
      <div className="qc169-body">{kids}</div>
    </section>
  );
  /* v153 — the slim bar at the top of the list column: the switch, the count, search, Sort and Group */
  const controlLine = (
    <QcBar153 view={p.view} onView={p.onView} loading={p.loading} showing={p.showing} total={p.total}
      find={p.find} onFind={p.onFind} findRef={p.findRef} sort={p.sort} onSort={p.onSort}
      group={p.group} onGroup={p.onGroup} packageOk={p.packageOk}
      beGroup={p.beGroup} onBeGroup={p.onBeGroup} beSort={p.beSort} onBeSort={p.onBeSort}
      stuckGroup={birds ? null : tbGrp} stuckOn={!birds && tbOn} onExport={p.onExport} />
  );
  /* v156 §3 — not while loading (its figures arrive with the data) */
  const slim156 = p.counts && !p.loading
    ? <QcSlim156 sent={p.counts.sent} ms={p.counts.ms || null} goal={p.goal ?? null} onLog={p.onLog} logDisabled={p.logDisabled} />
    : null;
  return (
    <div className="qc151 qc153" data-qc151="page" data-view={p.view} ref={rootRef}>
      {/* v156 §3 — the collapsed header: sticky for the whole page, taking no space, shown once the panel has gone */}
      {slim156}
      {/* v153.1 — the header on the page's own ground: the hawk, the title block and the stage ring card */}
      <QcHeader1531 loading={p.loading} onLog={p.onLog} onRecord={p.onRecord} logDisabled={p.logDisabled} logRef={p.logRef} counts={p.counts} ring={p.ring} />

      {/* v153 — two columns: the filter rail (sticky) and the list column */}
      <div className="qc153-cl" data-qc153="columns">
        <div className="qc153-railcol" data-qc153="rail-column" inert={first155 || !!error155 || undefined} data-qc155-inert={first155 || error155 ? "" : undefined} data-qc155-busy={loading155 ? "" : undefined}>{p.rail ?? null}</div>
        <div className="qc153-main" data-qc153="list-column">
          {/* v154 §6 — the slim bar sticks on a strip of the page's own ground that ends in a 22px fade */}
          <div className="qc154-tbw" data-qc154="toolbar" ref={tbRef}>{controlLine}</div>
          {/* List filters v1 — the applied row: under the bar, only while a filter or a search is set */}
          {p.applied.length > 0 && !first155 && !loading155 ? <AppliedRow hook="data-qc1511" className="lf-ap--q" chips={p.applied} onClearAll={p.onClearApplied} /> : null}

          {birds && !first155 && !loading155 && !error155 ? (
            <div className="qc151-be sa-slip" data-qc151="birds-card"><div className="sa-slip-in">
              {p.birdsEmpty ? (
                <div className="qc151-emp" data-qc151="birds-empty">
                  <b>Nothing on the timeline</b>
                  {p.birdsEmpty === "closed"
                    ? <><i>Closed queries don’t appear on Birds-eye. Switch to List to see them.</i><button type="button" className="qc151-btn qc151-btn--g" data-qc151="back-to-list" onClick={() => p.onView("list")}>Back to List</button></>
                    : <><i>No live queries match these filters.</i><button type="button" className="qc151-btn qc151-btn--g" data-qc151="birds-reset" onClick={p.onClearApplied}>Clear all</button></>}
                </div>
              ) : p.birds}
            </div></div>
          ) : (
            <div className="qc153-list qc169" data-qc151="table" data-qcv="list" aria-busy={loading155 || undefined}>
              {/* v155 §1 — nothing needs you: the panel above the first group, the list carrying on beneath it */}
              {p.state155?.kind === "quiet" && !empty ? <QuietPanel155 body={p.state155.body} /> : null}
              {error155 ? <LoadFailed words={error155.words} onRetry={error155.retry} busy={error155.busy} probe="queries" />
                : loading155 ? (p.state155?.kind === "loading" && p.state155.show ? <Skeleton155 /> : null) : first155 ? <FirstPanel155 onImport={p.onImport} /> : empty ? (
                <div className="qc151-emp" data-qc151="no-matches">
                  <b>No queries match</b>
                  <i>{[...p.pills.map((g) => pillWords(g).value), ...(p.find.trim() ? [`“${p.find.trim()}”`] : []), ...(p.where ? [TAB_LABEL[p.where]] : [])].join(" · ") || "this view"}</i>
                  {p.hint172 ? (
                    <span className="qc172-hint" data-qc172="hint">Remove <span className="qc172-hl">“{p.hint172.label}”</span> to see {p.hint172.n} {p.hint172.n === 1 ? "query" : "queries"}.
                      <button type="button" className="qc151-btn" data-qc172="hint-remove" onClick={p.hint172.onRemove}>Remove it</button></span>
                  ) : null}
                  <button type="button" className="qc151-btn qc151-btn--g" data-qc151="empty-reset" onClick={p.onClearApplied}>Clear all</button>
                </div>
              ) : wrap169(p.sections.map((s) => {
                const folds = isFoldKey(p.group, s.key) && !only;
                const fk = s.key === "quiet" ? "quiet" : "closed";
                if (folds && !opened.has(s.key)) {
                  const st = foldInitials(s.rows);
                  return (
                    <div key={s.key} className={`qc153-fold qc153-fold--${fk}`} data-qc153="fold" data-k={s.key} data-qc154="head" data-label={s.label} data-count={s.rows.length}>
                      <div className="qc153-ftx"><b>{s.label}</b><small>{s.rows.length}</small><p>{FOLD_LINE[fk]}</p></div>
                      <span className="qc153-stack" aria-hidden="true">
                        {st.shown.map((x) => <span key={x.id} className="qc153-sm">{x.initials}</span>)}
                        {st.more ? <span className="qc153-sm qc153-sm--more">+{st.more}</span> : null}
                      </span>
                      <button type="button" className="qc153-lnk" data-qc153="show-all" aria-expanded={false} onClick={() => openFold(s.key, true)}>Show all →</button>
                    </div>
                  );
                }
                const why = p.group === "attention" ? ACTION_WHY_153[s.key] : undefined;
                return (
                  <section key={s.key} className="qc153-grp" data-qc1511="group" data-k={s.key} aria-label={s.label || "Queries"}>
                    {s.label ? (
                      <div className="qc153-sec" data-qc153="heading" data-qc154="head" data-label={s.label} data-count={s.rows.length} data-offer={sectionSwatch(p.group, s.key) === STAGE_COLOURS.offer.band ? "" : undefined}
                        style={{ "--sw": sectionSwatch(p.group, s.key) } as React.CSSProperties}>
                        <b data-qc151="section">{s.label}</b><small data-qc1533="count">{s.rows.length}</small><i className="qc1533-rule" aria-hidden="true" />
                        {folds
                          ? <button type="button" className="qc153-lnk qc153-lnk--r" data-qc153="fold-away" aria-expanded={true} onClick={() => openFold(s.key, false)}>Fold away</button>
                          : why ? <em>{why}</em> : null}
                      </div>
                    ) : null}
                    <div className="qc154-grid" data-qc154="grid">{s.rows.map(card)}</div>
                  </section>
                );
              }))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
