/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "YOUR QUERIES" — THE WORKSPACE'S HEAD (Query Centre v132 §2; ref design-refs/query-centre/query-centre-v132.html
 * `#ws .bar` and `#frow`): the ink bar with the flying hawk, the title and its live count, the two count
 * pills, the controls row, and the filter strip.
 *
 * ⚠️ THE LIST'S FILTER IS ONE VALUE (`QcFilter`), AND EVERY PILL AND CHIP SETS IT (Nick, 8 Oct). Pressing
 * one sets the filter to exactly its value; pressing the pressed one returns it to "all". There is no
 * AND, no "due this week" and no materials chip — no filter exists for either, and none is built.
 *
 * ⚠️ "YOUR MOVE" IS `court:you` AND "OVERDUE" IS `past` — the desk's own two sets (§0.3, and Nick's
 * ruling on `court:you`), so the pill, the chip and the desk's numbers cannot disagree.
 *
 * ⚠️ MIRRORS THE CONTACT LIST'S v14 BAR AND STRIP (`agents/contact/YourAgentsBar`, `ContactFilterStrip`)
 * WITH THE SAME VALUES, BUILT HERE because `src/components/agents/**` belongs to another session. Both
 * are candidates to lift into `shell/` together; the report names the pair.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { GROUP_BY_OPTIONS, type GroupBy } from "../../../lib/qcCalView";
import { SORT_OPTIONS, STAGE_NAME, type FilterOption, type QcFilter, type QcSort } from "../../../lib/qcSummary";
import { QcMenu, type QcMenuGroup } from "./QcMenu";
import { QC_LIST_FLIGHT } from "./qcArt";
import "./qcvWorkspace.css";

export type QcDensity = "comfortable" | "compact";

const reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
/** The live count, counting to its new value as the Contact list's does (`ContactTouches.CountTo`). */
export const CountTo: React.FC<{ value: number }> = ({ value }) => {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current;
    from.current = value;
    if (start === value) return undefined;
    if (reducedMotion()) { setShown(value); return undefined; }
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / 380);
      setShown(Math.round(start + (value - start) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span data-qcv="ws-shown" data-n={value}>{shown}</span>;
};

type Pop = "group" | "sort" | "stage" | "more" | null;

export interface ScopeMenu { current: string | null; total: number; options: { id: string; title: string; count: number }[]; onScope: (id: string | null) => void }

export const QcWorkspaceHead: React.FC<{
  shown: number;
  total: number;
  book: string | null;
  filter: QcFilter;
  onFilter: (f: QcFilter) => void;
  options: readonly FilterOption[];
  /** how many rows a filter would show, over the scoped set — the same predicate the list filters by */
  countOf: (f: QcFilter) => number;
  find: string;
  onFind: (s: string) => void;
  findRef?: React.Ref<HTMLInputElement>;
  group: GroupBy;
  onGroup: (g: GroupBy) => void;
  sort: QcSort;
  onSort: (s: QcSort) => void;
  density: QcDensity;
  onDensity: (d: QcDensity) => void;
  scope: ScopeMenu | null;
  /** the keyboard card (Phase 4) */
  keys?: React.ReactNode;
}> = ({ shown, total, book, filter, onFilter, options, countOf, find, onFind, findRef, group, onGroup, sort, onSort, density, onDensity, scope, keys }) => {
  const [pop, setPop] = useState<Pop>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const open = (p: Pop, el: HTMLElement) => { setAnchor(el); setPop((cur) => (cur === p ? null : p)); };
  const close = () => setPop(null);
  /* a pill or chip sets exactly its own value; pressing the pressed one clears it */
  const toggle = (f: QcFilter) => onFilter(filter === f ? "all" : f);
  const count = countOf;
  const stageOpts = options.filter((o) => o.key.startsWith("stage:"));
  const onStage = filter.startsWith("stage:");
  const anyOn = filter !== "all" || find.trim().length > 0 || (scope?.current ?? null) != null;

  const groups: Record<Exclude<Pop, null>, QcMenuGroup[]> = {
    group: [{ current: group, items: GROUP_BY_OPTIONS.map((g) => ({ key: g.key, label: g.label })), onPick: (k) => { onGroup(k as GroupBy); close(); } }],
    sort: [{ current: sort, items: SORT_OPTIONS.map((s) => ({ key: s.key, label: s.label })), onPick: (k) => { onSort(k as QcSort); close(); } }],
    stage: [{ current: onStage ? filter : "", items: stageOpts.map((o) => ({ key: o.key, label: o.label, count: o.count, swatch: o.swatch })), onPick: (k) => { toggle(k as QcFilter); close(); } }],
    /* "+ More filters" is the existing "Which queries" menu, the manuscript scope with it */
    more: [
      { current: filter, items: options.map((o) => ({ key: o.key, label: o.label, count: o.count, swatch: o.swatch })), onPick: (k) => { onFilter(k as QcFilter); close(); } },
      ...(scope ? [{
        heading: "Manuscript", current: scope.current ?? "",
        items: [{ key: "", label: "All manuscripts", count: scope.total }, ...scope.options.map((m) => ({ key: m.id, label: m.title, count: m.count }))],
        onPick: (k: string) => { scope.onScope(k || null); close(); },
      }] : []),
    ],
  };

  /* ── the strip folds what will not fit on one line into "More filters" (the Contact list's way) ── */
  const stripRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [folded, setFolded] = useState(0);
  useLayoutEffect(() => {
    const bar = stripRef.current, m = measureRef.current;
    if (!bar || !m || bar.clientWidth === 0) return;
    /* how many of the chips, from the right, have to go for the row to fit */
    const avail = bar.clientWidth;
    const kids = [...m.children] as HTMLElement[];
    const fixed = kids.filter((k) => k.dataset.fold == null).reduce((n, k) => n + k.getBoundingClientRect().width + 8, 0);
    const foldable = kids.filter((k) => k.dataset.fold != null).map((k) => k.getBoundingClientRect().width + 8);
    let used = fixed + foldable.reduce((a, b) => a + b, 0);
    let n = 0;
    while (used > avail && n < foldable.length) { used -= foldable[foldable.length - 1 - n]; n++; }
    setFolded((f) => (f === n ? f : n));
  });
  useEffect(() => {
    const bar = stripRef.current;
    if (!bar || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => setFolded((f) => f));
    ro.observe(bar);
    return () => ro.disconnect();
  }, []);

  const chip = (f: QcFilter, label: string, k: string) => (
    <button key={k} type="button" className="qcw-chip" data-qcv="ws-chip" data-k={k} data-fold="" aria-pressed={filter === f} onClick={() => toggle(f)}>
      {label} <sup>{count(f)}</sup>
    </button>
  );
  const chips = [chip("court:you", "Your move", "you"), chip("past", "Overdue", "past"), chip("offers", "Offers", "offers"), chip("closed", "Closed", "closed")];
  const visibleChips = folded ? chips.slice(0, chips.length - folded) : chips;
  const stageBtn = (
    <button type="button" className="qcw-chip" data-qcv="ws-chip" data-k="stage" aria-pressed={onStage} aria-haspopup="menu" aria-expanded={pop === "stage"}
      onClick={(e) => open("stage", e.currentTarget)}>
      {onStage ? STAGE_NAME[filter.slice(6) as keyof typeof STAGE_NAME] ?? "Stage" : "Stage"} <i aria-hidden="true">⌄</i>
    </button>
  );
  const moreBtn = (
    <button type="button" className="qcw-chip qcw-chip--add" data-qcv="ws-more" aria-haspopup="menu" aria-expanded={pop === "more"} onClick={(e) => open("more", e.currentTarget)}>
      + More filters
    </button>
  );
  const groupShort = GROUP_BY_OPTIONS.find((g) => g.key === group)?.short ?? group;
  const sortShort = SORT_OPTIONS.find((s) => s.key === sort)?.short ?? sort;

  return (
    <div className="qcw-head" data-qcv="ws-head">
      <div className="qcw-bar" data-qcv="ws-bar">
        <img className="qcw-hawk" data-qcv="ws-hawk" src={`${QC_LIST_FLIGHT.src}?v=${QC_LIST_FLIGHT.version}`} width={QC_LIST_FLIGHT.width} height={QC_LIST_FLIGHT.height} alt="" aria-hidden="true" />
        <div className="qcw-r1">
          <div className="qcw-t">
            <h2 className="qcw-title" data-qcv="ws-title">Your queries</h2>
            <span className="qcw-k" data-qcv="showing" data-x={shown} data-y={total}>
              Showing <b><CountTo value={shown} /></b> of <b>{total}</b>{book ? <> for <b>{book}</b></> : null}
            </span>
          </div>
          <span className="qcw-pills">
            <button type="button" className="qcw-pill qcw-pill--move" data-qcv="ws-pill" data-k="you" aria-pressed={filter === "court:you"} onClick={() => toggle("court:you")}>
              <i aria-hidden="true" /><b>{count("court:you")}</b> your move
            </button>
            <button type="button" className="qcw-pill qcw-pill--over" data-qcv="ws-pill" data-k="past" aria-pressed={filter === "past"} onClick={() => toggle("past")}>
              <i aria-hidden="true" /><b>{count("past")}</b> overdue
            </button>
          </span>
        </div>
        <div className="qcw-r2">
          <label className="qcw-find" data-qcv="find">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input ref={findRef} value={find} onChange={(e) => onFind(e.target.value)} placeholder="Find a query by agent or agency" aria-label="Find a query by agent or agency" autoComplete="off" />
            <kbd aria-hidden="true">/</kbd>
          </label>
          <button type="button" className="qcw-ctl" data-qcv="ws-group" aria-haspopup="menu" aria-expanded={pop === "group"} onClick={(e) => open("group", e.currentTarget)}>
            <em>Grouped:</em> {groupShort} <i aria-hidden="true">⌄</i>
          </button>
          <button type="button" className="qcw-ctl" data-qcv="ws-sort" aria-haspopup="menu" aria-expanded={pop === "sort"} onClick={(e) => open("sort", e.currentTarget)}>
            <em>Sort:</em> {sortShort} <i aria-hidden="true">⌄</i>
          </button>
          <span className="qcw-dens" role="group" aria-label="Row density" data-qcv="ws-density">
            {(["comfortable", "compact"] as const).map((d) => (
              <button key={d} type="button" aria-pressed={density === d} data-d={d} onClick={() => onDensity(d)}>{d.toUpperCase()}</button>
            ))}
          </span>
          {keys}
        </div>
      </div>
      <div className="qcw-strip" data-qcv="ws-strip" ref={stripRef}>
        {visibleChips}
        {stageBtn}
        {moreBtn}
        {anyOn && <button type="button" className="qcw-clear" data-qcv="ws-clear" onClick={() => { onFilter("all"); onFind(""); scope?.onScope(null); }}>Clear all</button>}
        {/* the unfolded row, measured off-screen: what the strip would need to hold every chip */}
        <div className="qcw-strip-measure" ref={measureRef} aria-hidden="true">
          {chips.map((c) => React.cloneElement(c, { tabIndex: -1, key: `m-${c.key}` }))}
          {React.cloneElement(stageBtn, { tabIndex: -1 })}
          {React.cloneElement(moreBtn, { tabIndex: -1 })}
          <span className="qcw-clear" data-fold-none="">Clear all</span>
        </div>
      </div>
      {pop && anchor && <QcMenu anchor={anchor} label={pop === "more" ? "Which queries" : pop === "group" ? "Group by" : pop === "sort" ? "Sort by" : "Stage"} groups={groups[pop]} onClose={close} />}
    </div>
  );
};
