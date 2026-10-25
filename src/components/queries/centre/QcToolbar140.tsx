/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v140 §A — THE LIST'S TOOLBAR, rebuilt by navy-bar v1 (ref design-refs/navy-bar-address-book-v1/
 * query-centre-v144.html, "all in navy"):
 *
 *   unpinned (the navy bar, 52 tall): heard back · … · Filters · Group by · Sort · Full screen   (v149 B1)
 *   full screen (the cream toolbar):  Find · Filters · Group by · Sort · Exit full screen       (v149: list only)
 *
 * The jump row is retired in both modes, and so is every keycap hint on the page (the keys still work). Sort is in both
 * views; the column headings are plain labels and sort nothing. Unpinned, Find is in the view row above the list
 * (QcHeader149's `QcViewRow149`).
 *
 * ⚠️ ONE POPOVER AT A TIME: Filters, Group by and Sort share one `usePopover`, which closes on an outside press, and
 *    Escape closes the open one through the escape stack (ESC_LEVEL.page) — before the pin's Escape (pageMode).
 */
import { DEFAULT_QC_GROUP } from "../../../lib/qcViewMemory";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { quietScroll, usePopover, type PopoverState } from "../../shell/ListPills";
import { GROUP_BY_OPTIONS, type GroupBy } from "../../../lib/qcCalView";
import type { QcDensity } from "../../../lib/qcListMemory";
import { FULL_ICON } from "../../shell/ViewTitleRow";
import { SortChipButton, SortChipMenu } from "../../shell/SortChip";
import "../../shell/findWell.css";
import { QC_SORT_FIELDS } from "../../../lib/cardsSort";
import type { Qc138Sort } from "../../../lib/qc138";
import "./qcv140.css";

export type Qc140Pop = "group" | "filters" | "sort";

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

const scrollerOf = (root: HTMLElement | null): HTMLElement | null => root?.closest<HTMLElement>(".wpg-scroll") ?? null;

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
  find: string;
  onFind?: (v: string) => void;
  findRef?: React.Ref<HTMLInputElement>;
  /** how many filters are on (search not counted) */
  filterCount: number;
  onClearFilters: () => void;
  /** the Filters menu, drawn while it is open */
  filtersMenu: (pop: PopoverState<Qc140Pop>) => React.ReactNode;
  onPin: () => void;
  /** v149 B1 — the heard-back figure on the bar's left (unpinned) */
  heard?: { pct: number; of: number; total: number };
  /** cards-sort-search v1 §B — the page's one sort, read and written by the Sort chip (both views since navy-bar v1) */
  sort: Qc138Sort;
  onSort: (s: Qc138Sort) => void;
  /** v150 C — the search sits in the navy bar while unpinned */
  findInBar?: boolean;
  /** v150 D8 — Birds-eye's Group and Sort pills, drawn in place of the list's (their settings are Birds-eye's own) */
  birdsTools?: React.ReactNode;
}

export const QcToolbar140: React.FC<QcToolbar140Props> = ({
  rootRef, pinned, loading = false, groupBy, onGroup, density, onDensity, heard, find, onFind, findRef, filterCount, onClearFilters, filtersMenu, onPin, sort, onSort, findInBar = false, birdsTools = null,
}) => {
  const pop = usePopover<Qc140Pop>();
  const rowRef = useRef<HTMLDivElement>(null);
  const grpRef = useRef<HTMLButtonElement>(null);
  const filRef = useRef<HTMLButtonElement>(null);
  const groupOpt = GROUP_BY_OPTIONS.find((o) => o.key === groupBy);
  const def = groupBy === DEFAULT_QC_GROUP; /* v141 §C — Status is the default: no "on" state, no ✕ */

  return (
    <div className="qc140-tbw" data-qc140="toolbar-wrap">
      <div className="qc140-tb qc144-tb" data-qc140="toolbar" data-qc138="top" data-qcv="ws-head" data-pinned={pinned ? "" : undefined} ref={rowRef}>
        {/* v149 B1 — THE NAVY BAR'S LEFT: "37% heard back", the breakdown card's own figure (bandFigures). The count and the
            Cards / List switch are gone: the page is list-only, and the view chips above the list carry the counts. */}
        {!pinned && heard ? (
          <span className="qc149-hb" data-qc149="heard" title={`${heard.of} of ${heard.total} agents have answered`}>
            <b>{heard.pct}%</b>{" "}<span>heard back</span>
          </span>
        ) : null}
        {/* A3 — in full screen the search is in this cream toolbar, a rounded white field left of Filters */}
        {/* v150 C — unpinned too: the navy bar's own search, first (its view row above the list is retired) */}
        {!pinned && findInBar && onFind ? (
          <label className="qc150-bfind" data-qc150="find" data-qc140="find" data-qc138="search" data-qc149="find" data-qc144="find">
            {FIND_ICON}
            <input ref={findRef} value={find} onChange={(e) => onFind(e.target.value)} placeholder="Find an agent or agency" aria-label="Find an agent or agency" autoComplete="off" disabled={loading} />
          </label>
        ) : null}
        {pinned && onFind ? (
          <label className="qc140-find qc144-tfind" data-qc140="find" data-qc138="search" data-qc144="find-tb">
            {FIND_ICON}
            <input ref={findRef} value={find} onChange={(e) => onFind(e.target.value)} placeholder="Find an agent or agency" aria-label="Find an agent or agency" autoComplete="off" disabled={loading} />
          </label>
        ) : null}
        {birdsTools}
        <span className="qc140-chipw qc144-first" data-qc140="filters-chip" data-on={filterCount ? "" : undefined}>
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
        {birdsTools ? null : <>
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
        {/* cards-sort-search v1 §B — the Sort chip: the both views, after Group by (navy-bar v1 A1), the headings' own sort */}
        {true ? (
          <span className="qc140-chipw qc1421-sortw" data-qc1421="sort-chip">
            <SortChipButton fields={QC_SORT_FIELDS} value={sort} open={pop.open === "sort"} onToggle={(a) => pop.toggle("sort", a)}
              className="qc140-chip qc1421-sort" ns="qc1421" disabled={loading} toolbar={() => rowRef.current} />
          </span>
        ) : null}
        {pop.open === "sort" && pop.anchor ? (
          <SortChipMenu anchor={pop.anchor} fields={QC_SORT_FIELDS} value={sort} ns="qc1421" onChange={onSort} />
        ) : null}
        </>}
        {/* v142 §A — no Pin on the page: "Full screen" lives in the title row (shell/ViewTitleRow). In full screen (today's
            pinned mode) the toolbar carries the icon Cards / List switch and "Exit full screen", after Filters, placed as
            on the Contact list (v20 §C). */}
        {/* v149 B1 — Full screen, an outlined button on the navy (it left the pill row above the list) */}
        {!pinned ? (
          <button type="button" className="qc149-fs" data-qc149="full" data-qc144="full" data-qc142="full" data-qc140="pin" data-qc138="pin" data-pin-list=""
            aria-pressed={false} aria-keyshortcuts="F" aria-label="Full screen" disabled={loading} onClick={onPin}>
            {FULL_ICON}<span className="qc149-fsl">Full screen</span>
          </button>
        ) : null}
        {pinned ? (
          <>
            <button type="button" className="qc140-pin qc142-xfs" data-qc140="pin" data-qc138="pin" data-qc142="full-tb" data-pin-list="" aria-pressed={pinned} aria-keyshortcuts="F"
              aria-label="Exit full screen" disabled={loading} onClick={onPin}>
              {FULL_ICON}<span className="qc140-pin-l">Exit full screen</span>
              <span className="qc140-tip" aria-hidden="true">Exit full screen</span>
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
};
