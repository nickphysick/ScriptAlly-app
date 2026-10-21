/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v140 §A — THE LIST'S TOOLBAR (ref design-refs/query-centre-v140/): one row, in both positions —
 *
 *   jump row (flex 1) · Find · Group by · Filters  [· Cards / List · Exit full screen, in full screen only (v142 §A)]
 *
 * It replaces the navy header's title ("Showing all N queries, grouped by …"), its Grouped/Sort menus, the direction
 * button, the density toggle and Full screen. Sort stays on the column headings; density moves into the Group by menu;
 * pinning (v138.6) is the only full-page mode.
 *
 * Built from Contact list v19's toolbar (`agents/contact/ContactListHead`), which is page-local: a lift candidate.
 *
 * ⚠️ THE ROW NEVER WRAPS. As the toolbar narrows (a container query on its own width) it gives way in a fixed order:
 *    ≤1120 the Group by chip drops "Grouped by" and Find goes from 270 to 210; ≤1000 Pin and Filters drop their labels
 *    (the count badge and ✕ stay). The jump row then folds what does not fit into "+N more".
 * ⚠️ THE FOLD IS MEASURED AGAINST THE JUMP ROW'S OWN BOX (its rect), never an offset parent: a button whose right edge
 *    passes the row's width less 92 goes into "+N more", so pinned and unpinned fold the same groups for one width.
 *    `data-over` is set on the buttons directly (never React state on them), refitted when the row resizes and when the
 *    fonts are ready; the folded keys are handed to the one "+N more" menu.
 * ⚠️ ONE POPOVER AT A TIME: Group by, Filters and "+N more" share one `usePopover`, which closes on an outside press,
 *    and Escape closes the open one through the escape stack (ESC_LEVEL.page) — before the pin's Escape (pageMode).
 */
import { DEFAULT_QC_GROUP } from "../../../lib/qcViewMemory";
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { quietScroll, usePopover, type PopoverState } from "../../shell/ListPills";
import { GROUP_BY_OPTIONS, type GroupBy } from "../../../lib/qcCalView";
import type { QcDensity } from "../../../lib/qcListMemory";
import { FULL_ICON, ViewSwitch, type ListView } from "../../shell/ViewTitleRow";
import "./qcv140.css";

export type Qc140Pop = "group" | "filters" | "jump";

/** one jump: a group (its band) or, ungrouped, a month (its first row) */
/** v141 §D — glyph (Status, Who it's with), name (Next action, Package) or month (ungrouped) */
export type Qc140JumpMode = "glyph" | "name" | "month";

export interface Qc140Jump {
  key: string;
  /** the button's words (Next action's short form) */
  label: string;
  /** the full name ("+N more"'s menu and the accessible name) */
  full: string;
  n: number;
  /** the button's mark: the glyph in glyph mode, nothing in name and month mode */
  mark: React.ReactNode;
  /** v141 §D — the "+N more" menu row's mark (its 32px column); absent means none (a package, a month) */
  menuMark?: React.ReactNode;
  /** the group's key, or the first row's id for a month */
  to: { kind: "group"; key: string } | { kind: "row"; id: string };
}

const CARET = (
  <svg className="qc140-cv" viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M3 4.5l3 3 3-3" /></svg>
);
const STACK_ICON = (
  <svg className="qc140-ic" viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M3.5 5.5h13M3.5 10h13M3.5 14.5h13" /></svg>
);
const FILTER_ICON = (
  <svg className="qc140-ic" viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M3 5.5h14M5.5 10h9M8 14.5h4" /></svg>
);
const FIND_ICON = (
  <svg className="qc140-fic" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg>
);
export const CROSS140 = (
  <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
);

/** the scroller the list scrolls in, and the sticky stack's height over it (the toolbar's wrapper and the headings) */
const scrollerOf = (root: HTMLElement | null): HTMLElement | null => root?.closest<HTMLElement>(".wpg-scroll") ?? null;
export const stackHeight = (root: HTMLElement | null): number => {
  const w = root?.querySelector<HTMLElement>("[data-qc138='top-wrap']");
  const h = root?.querySelector<HTMLElement>("[data-qc138='headings']");
  return (w?.offsetHeight ?? 0) + (h?.offsetHeight ?? 0);
};
const targetOf = (root: HTMLElement | null, j: Qc140Jump): HTMLElement | null => {
  if (!root) return null;
  return j.to.kind === "group"
    ? root.querySelector<HTMLElement>(`[data-qcv='grp'][data-group="${CSS.escape(j.to.key)}"]`)
    : root.querySelector<HTMLElement>(`#query-row-${CSS.escape(j.to.id)}`);
};
/** §A — the jump: the target lands just under the sticky stack. Smooth, or instant under reduced motion. */
export function jumpTo(root: HTMLElement | null, j: Qc140Jump): void {
  const sc = scrollerOf(root);
  const el = targetOf(root, j);
  if (!sc || !el) return;
  const top = sc.scrollTop + el.getBoundingClientRect().top - sc.getBoundingClientRect().top - stackHeight(root);
  const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  sc.scrollTo({ top: Math.max(0, Math.round(top)), behavior: calm ? "auto" : "smooth" });
}

/** the Filters menu's height before the scroll area is capped (header, Most used, the area at its cap, footer) */
const FILTER_MENU_EST = 720;
/** scroll the list, instantly and quietly, so its toolbar is stuck at the top of the scroller */
function stickToolbar(root: HTMLElement | null): void {
  const sc = scrollerOf(root);
  if (!root || !sc) return;
  const d = root.getBoundingClientRect().top - sc.getBoundingClientRect().top;
  if (d <= 1) return;
  quietScroll(() => sc.scrollTo({ top: sc.scrollTop + d, behavior: "auto" }));
}

/** "+N more"'s menu: the folded jumps, with their marks, full labels and counts, 8 under the button */
const JumpMenu: React.FC<{ anchor: HTMLElement; items: Qc140Jump[]; current: string | null; onPick: (j: Qc140Jump) => void }> = ({ anchor, items, current, onPick }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  useLayoutEffect(() => {
    const r = anchor.getBoundingClientRect();
    const w = ref.current?.offsetWidth ?? 280;
    setPos({ top: r.bottom + 8, left: Math.max(16, Math.min(r.left, window.innerWidth - w - 16)) });
  }, [anchor]);
  useEffect(() => { ref.current?.querySelector<HTMLElement>("button")?.focus({ preventScroll: true }); }, []);
  return createPortal(
    <div className="lpop qc140-jpop" data-lpop="jump" data-qc140="jump-menu" role="menu" aria-label="Jump to" ref={ref}
      style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}>
      <div className="qc140-mh">Jump to</div>
      {items.map((j) => (
        <button key={j.key} type="button" role="menuitem" className="qc140-jo" data-qc140="jump-item" data-gkey={j.key} aria-current={current === j.key ? "true" : undefined}
          onClick={() => onPick(j)}>
          <span className="qc141-jmc" data-qc141="menu-mark">{j.menuMark ?? null}</span><b data-qc141="menu-name">{j.full}</b><i>{j.n}</i>
        </button>
      ))}
    </div>,
    document.body,
  );
};

/** §D — each grouping's one-line description in the Group by menu */
export const GROUP_LINE: Readonly<Record<GroupBy, string>> = {
  attention: "Your move, waiting, closed",
  status: "Where each query stands",
  action: "What happens next, and when",
  package: "What you sent",
  none: "One list, in the order you sort by",
};

/**
 * §D — THE GROUP BY MENU: 330 wide, under the chip and right-aligned to it, 8 below. Radio rows with a one-line
 * italic description (No grouping after a hairline), then a hairline and the ROWS line: Comfortable / Compact, the
 * list's density, moved here from the old header.
 */
const GroupMenu: React.FC<{ anchor: HTMLElement; groupBy: GroupBy; onGroup: (g: GroupBy) => void; density: QcDensity; onDensity: (d: QcDensity) => void; close: () => void }> = ({
  anchor, groupBy, onGroup, density, onDensity, close,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  useLayoutEffect(() => {
    const r = anchor.getBoundingClientRect();
    const w = 330;
    setPos({ top: r.bottom + 8, left: Math.max(16, Math.min(r.right - w, window.innerWidth - w - 16)) });
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
  return createPortal(
    <div className="lpop qc140-gpop" data-lpop="group" data-qc140="group-menu" data-qc138="group-menu" role="menu" aria-label="Group the list by" ref={ref} onKeyDown={onKey}
      style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}>
      <div className="qc140-mh">Group the list by</div>
      {GROUP_BY_OPTIONS.map((o) => (
        <React.Fragment key={o.key}>
          {o.key === "none" ? <hr className="qc140-hr" /> : null}
          <button type="button" role="menuitemradio" aria-checked={groupBy === o.key} className="qc140-go" data-qc140="group-opt" data-g={o.key}
            onClick={() => { onGroup(o.key); close(); anchor.focus({ preventScroll: true }); }}>
            <span className="qc140-rd" aria-hidden="true" /><b>{o.label}</b><small>{GROUP_LINE[o.key]}</small>
          </button>
        </React.Fragment>
      ))}
      <hr className="qc140-hr" />
      <div className="qc140-rows" data-qc140="rows">
        <span className="qc140-rl">Rows</span>
        <span className="qc140-seg" role="radiogroup" aria-label="Rows">
          {(["comfortable", "compact"] as const).map((d) => (
            <button key={d} type="button" role="radio" aria-checked={density === d} data-qc140="rows-opt" data-d={d} onClick={() => onDensity(d)}>
              {d === "comfortable" ? "Comfortable" : "Compact"}
            </button>
          ))}
        </span>
      </div>
    </div>,
    document.body,
  );
};

export interface QcToolbar140Props {
  /** the list sheet: the jump targets and the scroller are found from it */
  rootRef: React.RefObject<HTMLElement | null>;
  pinned: boolean;
  loading?: boolean;
  groupBy: GroupBy;
  onGroup: (g: GroupBy) => void;
  density: QcDensity;
  onDensity: (d: QcDensity) => void;
  /** ungrouped: the mono label for the sort column ("DUE", "QUERIED", "CHANGED") */
  jumpColumn: string | null;
  jumps: Qc140Jump[];
  jumpMode?: Qc140JumpMode;
  find: string;
  onFind?: (v: string) => void;
  findRef?: React.Ref<HTMLInputElement>;
  /** how many filters are on (search not counted) */
  filterCount: number;
  onClearFilters: () => void;
  /** the Filters menu, drawn while it is open */
  filtersMenu: (pop: PopoverState<Qc140Pop>) => React.ReactNode;
  onPin: () => void;
  /** v142 §A — the Cards / List view (the title row's pill and, in full screen, this toolbar's switch: one state) */
  view: ListView;
  onView: (v: ListView) => void;
}

export const QcToolbar140: React.FC<QcToolbar140Props> = ({
  rootRef, pinned, loading = false, groupBy, onGroup, density, onDensity, jumpColumn, jumps, jumpMode = "name", find, onFind, findRef, filterCount, onClearFilters, filtersMenu, onPin, view, onView,
}) => {
  const pop = usePopover<Qc140Pop>();
  const rowRef = useRef<HTMLElement>(null);
  const grpRef = useRef<HTMLButtonElement>(null);
  const filRef = useRef<HTMLButtonElement>(null);
  const [folded, setFolded] = useState<string[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const sig = jumps.map((j) => `${j.key}:${j.label}:${j.n}`).join("|") + `|${jumpColumn ?? ""}|${pinned ? "p" : ""}|${filterCount}|${groupBy}|${jumpMode}`;

  /* §A — the fold: every button whose right edge passes the row's width less 92 goes into "+N more" */
  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return undefined;
    const fit = () => {
      if (row.clientWidth === 0) return;
      const btns = [...row.querySelectorAll<HTMLElement>("[data-qc140='jump-btn']")];
      const more = row.querySelector<HTMLElement>("[data-qc140='jump-more']");
      btns.forEach((b) => b.removeAttribute("data-over"));
      if (more) more.style.display = "none";
      const out: string[] = [];
      if (btns.length && row.scrollWidth > row.clientWidth + 1) {
        const left = row.getBoundingClientRect().left;
        const lim = row.clientWidth - 92;
        for (const b of btns) if (b.getBoundingClientRect().right - left > lim) out.push(b.dataset.gkey ?? "");
        btns.forEach((b) => { if (out.includes(b.dataset.gkey ?? "")) b.setAttribute("data-over", ""); });
      }
      if (more) more.style.display = "";
      setFolded((cur) => (cur.join("|") === out.join("|") ? cur : out));
    };
    fit();
    let live = true;
    void document.fonts?.ready.then(() => { if (live) fit(); });
    if (typeof ResizeObserver === "undefined") return () => { live = false; };
    let w = row.clientWidth;
    const ro = new ResizeObserver(() => { if (row.clientWidth !== w) { w = row.clientWidth; fit(); } });
    ro.observe(row);
    return () => { live = false; ro.disconnect(); };
  }, [sig]);

  /* §A — current: the jump whose target crosses the stack's bottom edge, once the list has scrolled 40px */
  const jumpsRef = useRef(jumps);
  jumpsRef.current = jumps;
  const readCurrent = useCallback(() => {
    const root = rootRef.current;
    const sc = scrollerOf(root);
    if (!root || !sc || root.getBoundingClientRect().height === 0) return;
    const line = sc.getBoundingClientRect().top + stackHeight(root) + 2;
    let k: string | null = null;
    for (const j of jumpsRef.current) {
      const el = targetOf(root, j);
      if (el && el.getBoundingClientRect().top <= line + 40) k = j.key;
    }
    if (k === null && jumpsRef.current.length) k = jumpsRef.current[0].key;
    const next = sc.scrollTop >= 40 ? k : null;
    setCurrent((c) => (c === next ? c : next));
  }, [rootRef]);
  useEffect(() => {
    const sc = scrollerOf(rootRef.current);
    if (!sc) return undefined;
    let raf = 0;
    const on = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; readCurrent(); }); };
    readCurrent();
    sc.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { sc.removeEventListener("scroll", on); window.removeEventListener("resize", on); if (raf) cancelAnimationFrame(raf); };
  }, [rootRef, readCurrent, sig]);

  const foldedJumps = jumps.filter((j) => folded.includes(j.key));
  const moreCurrent = !!current && folded.includes(current);
  const groupOpt = GROUP_BY_OPTIONS.find((o) => o.key === groupBy);
  const def = groupBy === DEFAULT_QC_GROUP; /* v141 §C — Status is the default: no "on" state, no ✕ */
  const go = (j: Qc140Jump) => { pop.close(); jumpTo(rootRef.current, j); };

  return (
    <div className="qc140-tbw" data-qc140="toolbar-wrap">
      <div className="qc140-tb" data-qc140="toolbar" data-qc138="top" data-qcv="ws-head" data-pinned={pinned ? "" : undefined}>
        <nav className={`qc140-jr qc141-jr--${jumpMode}`} ref={rowRef} data-qc140="jump" data-mode={jumpMode} aria-label="Jump to">
          {jumpColumn ? <span className="qc140-jcol" data-qc140="jump-col">{jumpColumn}</span> : null}
          {jumps.map((j) => (
            <button key={j.key} type="button" className="qc140-jb" data-qc140="jump-btn" data-gkey={j.key} aria-current={current === j.key ? "true" : undefined}
              aria-label={jumpMode === "glyph" ? `${j.full}, ${j.n}` : `${j.full}, ${j.n} ${j.n === 1 ? "query" : "queries"}`}
              title={jumpMode === "glyph" ? undefined : `${j.full} · ${j.n}`} data-nm={j.full} disabled={loading} onClick={() => go(j)}>
              {j.mark}<span className="qc140-jt">{j.label}</span><i data-qc141="jump-badge">{j.n}</i>
              {jumpMode === "glyph" ? <span className="qc141-jtip" data-qc141="jump-tip" aria-hidden="true">{j.full}</span> : null}
            </button>
          ))}
          <button type="button" className="qc140-jmore" data-qc140="jump-more" data-n={foldedJumps.length} hidden={!foldedJumps.length}
            aria-haspopup="menu" aria-expanded={pop.open === "jump"} aria-current={moreCurrent ? "true" : undefined}
            onClick={(e) => pop.toggle("jump", e.currentTarget)}>
            +{foldedJumps.length} more {CARET}
          </button>
          {pop.open === "jump" && pop.anchor && foldedJumps.length ? (
            <JumpMenu anchor={pop.anchor} items={foldedJumps} current={current} onPick={go} />
          ) : null}
        </nav>
        {onFind ? (
          <label className="qc140-find" data-qc140="find" data-qc138="search">
            {FIND_ICON}
            <input ref={findRef} value={find} onChange={(e) => onFind(e.target.value)} placeholder="Find an agent or agency" aria-label="Find an agent or agency" autoComplete="off" disabled={loading} />
            <kbd aria-hidden="true">/</kbd>
          </label>
        ) : null}
        <span className="qc140-chipw" data-qc140="group-chip" data-on={def ? undefined : ""}>
          <button type="button" ref={grpRef} className="qc140-chip qc140-grp" data-qc140="group" data-lp="qc140-group" aria-haspopup="menu" aria-expanded={pop.open === "group"}
            aria-label={groupBy === "none" ? "Not grouped. Change grouping" : `Grouped by ${groupOpt?.label ?? ""}. Change grouping`} disabled={loading}
            onClick={(e) => pop.toggle("group", e.currentTarget)}>
            {STACK_ICON}
            {groupBy === "none"
              ? <b data-ltb="group-name">Not grouped</b>
              : <><em className="qc140-gby">Grouped by</em><b data-ltb="group-name">{groupOpt?.label ?? ""}</b></>}
            {CARET}
          </button>
          {def ? null : (
            <button type="button" className="qc140-x" data-qc140="group-reset" aria-label="Back to Status" title="Back to Status" disabled={loading}
              onClick={() => { if (pop.open === "group") pop.close(); onGroup(DEFAULT_QC_GROUP); grpRef.current?.focus({ preventScroll: true }); }}>{CROSS140}</button>
          )}
        </span>
        {pop.open === "group" && pop.anchor ? <GroupMenu anchor={pop.anchor} groupBy={groupBy} onGroup={onGroup} density={density} onDensity={onDensity} close={pop.close} /> : null}
        <span className="qc140-chipw" data-qc140="filters-chip" data-on={filterCount ? "" : undefined}>
          <button type="button" ref={filRef} className="qc140-chip qc140-fil" data-qc140="filters" data-qc138="filters-btn" data-lp="qc140-filters" data-n={filterCount}
            aria-haspopup="dialog" aria-expanded={pop.open === "filters"} aria-label={filterCount ? `Filters: ${filterCount} applied` : "Filters"} disabled={loading}
            onClick={(e) => {
              const btn = e.currentTarget;
              /* §D — the Filters menu is tall: opening it where it would run past the window first scrolls the list so
                 the toolbar sticks at the top (a quiet scroll, which the popover does not close on) */
              if (pop.open !== "filters" && btn.getBoundingClientRect().bottom + 8 + FILTER_MENU_EST > window.innerHeight) stickToolbar(rootRef.current);
              pop.toggle("filters", btn);
            }}>
            {FILTER_ICON}<span className="qc140-cl">{filterCount ? "Filtered" : "Filters"}</span>
            {filterCount ? <em className="qc140-n" data-qc140="filters-n">{filterCount}</em> : null}
          </button>
          {filterCount ? (
            <button type="button" className="qc140-x" data-qc140="filters-clear" aria-label="Clear all filters" title="Clear all filters" disabled={loading}
              onClick={() => { if (pop.open === "filters") pop.close(); onClearFilters(); filRef.current?.focus({ preventScroll: true }); }}>{CROSS140}</button>
          ) : null}
        </span>
        {pop.open === "filters" && pop.anchor ? filtersMenu(pop) : null}
        {/* v142 §A — no Pin on the page: "Full screen" lives in the title row (shell/ViewTitleRow). In full screen (today's
            pinned mode) the toolbar carries the icon Cards / List switch and "Exit full screen", after Filters, placed as
            on the Contact list (v20 §C). */}
        {pinned ? (
          <>
            <ViewSwitch view={view} onView={onView} variant="icons" labels={false} disabled={loading} ns="qc142" probe="view-tb" noun="queries" />
            <button type="button" className="qc140-pin qc142-xfs" data-qc140="pin" data-qc138="pin" data-qc142="full-tb" data-pin-list="" aria-pressed={pinned} aria-keyshortcuts="F"
              aria-label="Exit full screen" disabled={loading} onClick={onPin}>
              {FULL_ICON}<span className="qc140-pin-l">Exit full screen</span>
              <span className="qc140-tip" aria-hidden="true">Exit full screen<kbd>F</kbd></span>
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
};
