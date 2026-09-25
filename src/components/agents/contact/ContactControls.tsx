/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ContactControls — the list's header row (v11 §4–5): "Your agents" + the count, Find, and
 * Filter · Group · Sort · ↺ with their panels. The construction carries the Query Centre's laws
 * without touching its components (§12): ONE open popover held above the buttons, an outside
 * `pointerdown` on the CAPTURE phase closes it, Escape closes it from one handler, the Filter
 * panel's body keeps its scroll position through re-renders (recorded on USER scrolls only),
 * and ↺ exists only while something differs from the page-load default.
 *
 * ⚠️ THE PANEL'S MAX-HEIGHT IS MEASURED FROM THE BUTTON'S OWN BOX at open (min(560, innerHeight −
 * button bottom − 24)) — the house viewport law; a constant would be a guess about the chrome
 * above the page.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { StatusDot } from "../../StatusDot";
import { QueryStatus } from "../../../types";
import {
  ContactFilters, FilterSection, GroupKey, GROUP_OPTIONS, NOT_RECORDED, RatingKey, SORT_OPTIONS,
  SortKey, STAND_LABEL, StandKey, contactFilterCount,
} from "../../../lib/contactList";

const FILTER_ICON = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M3 5h18l-7 8v6l-4 2v-8z" />
  </svg>
);
const GROUP_ICON = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="3" y="4" width="18" height="6" rx="1" /><rect x="3" y="14" width="18" height="6" rx="1" />
  </svg>
);
const SORT_ICON = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M4 7h13M4 12h9M4 17h5" />
  </svg>
);
const RESET_ICON = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" />
  </svg>
);

type Pop = "filter" | "group" | "sort" | null;

/** The seven §5.1 status options carry the real glyph — a status is drawn only by StatusDot. */
const STATUS_GLYPH: Record<string, QueryStatus | null> = {
  "Queried": QueryStatus.QUERIED,
  "Partial requested": QueryStatus.PARTIAL_REQUESTED,
  "Partial sent": QueryStatus.PARTIAL_SENT,
  "Full sent": QueryStatus.FULL_SENT,
  "Offer": QueryStatus.OFFER,
  "Closed": QueryStatus.REJECTED,
  "Not queried yet": null,
};

export interface ContactControlsProps {
  shownCount: number;
  total: number;
  find: string;
  onFind: (v: string) => void;
  filters: ContactFilters;
  onFilters: (f: ContactFilters) => void;
  options: Record<FilterSection, { value: string; n: number }[]>;
  groupKey: GroupKey;
  onGroup: (k: GroupKey) => void;
  sortKey: SortKey;
  onSort: (k: SortKey) => void;
  /** anything differs from the page-load default — cards and Find included (§4). */
  anyActive: boolean;
  onReset: () => void;
  searchRef?: React.RefObject<HTMLInputElement>;
}

export const ContactControls: React.FC<ContactControlsProps> = ({
  shownCount, total, find, onFind, filters, onFilters, options,
  groupKey, onGroup, sortKey, onSort, anyActive, onReset, searchRef,
}) => {
  const [pop, setPop] = useState<Pop>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const bodyScroll = useRef(0);
  const [maxH, setMaxH] = useState(560);

  const nFilters = contactFilterCount(filters);

  const openPop = useCallback((which: Exclude<Pop, null>, btn: HTMLElement) => {
    setPop((p) => {
      if (p === which) return null;
      const b = btn.getBoundingClientRect();
      setMaxH(Math.min(560, window.innerHeight - b.bottom - 24));
      bodyScroll.current = 0;
      return which;
    });
  }, []);

  /* one closer for the whole cluster: outside pointerdown (capture) and Escape. "Outside" means
     outside the PANEL AND ITS OWN BUTTON (§5.5) — the title, the count, even the other two
     buttons are outside: a press on Sort while Filter is open closes Filter and opens Sort. */
  useEffect(() => {
    if (!pop) return;
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      const panel = rootRef.current?.querySelector('[data-clv="fpanel"], [data-clv="gmenu"], [data-clv="smenu"]');
      const btn = rootRef.current?.querySelector(`[data-clv="btn-${pop}"]`);
      if (panel?.contains(t) || btn?.contains(t)) return;
      setPop(null);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); setPop(null); }
    };
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("keydown", key, true);
    return () => {
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("keydown", key, true);
    };
  }, [pop]);

  /* ⚠️ THE PANEL KEEPS ITS PLACE THROUGH RE-RENDERS (§5.1): the position is recorded on USER
     scrolls and restored after the counts re-render under a selection. */
  useLayoutEffect(() => {
    if (pop === "filter" && bodyRef.current) bodyRef.current.scrollTop = bodyScroll.current;
  });

  const toggle = <K extends keyof ContactFilters>(key: K, value: ContactFilters[K][number]) => {
    const list = filters[key] as unknown[];
    const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
    onFilters({ ...filters, [key]: next });
  };

  const ratingLabel = (v: string) => (v === "0" ? "Unrated" : "★".repeat(Number(v)));

  return (
    <div className="clv-ctl" data-clv="ctl" ref={rootRef}>
      <h2>
        Your agents
        <em data-clv="tally">{shownCount} of {total}</em>
      </h2>
      <label className="clv-find" data-clv="find">
        <svg width="12" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
        </svg>
        <input
          ref={searchRef}
          value={find}
          onChange={(e) => onFind(e.target.value)}
          placeholder="Find an agent"
          aria-label="Find an agent — name or agency"
        />
      </label>

      <button
        type="button" className="clv-dbtn" data-clv="btn-filter"
        data-on={pop === "filter" || nFilters > 0 || undefined}
        aria-expanded={pop === "filter"}
        onClick={(e) => openPop("filter", e.currentTarget)}
      >
        {FILTER_ICON} Filter {nFilters > 0 && <span className="clv-nb">{nFilters}</span>}
      </button>
      <button
        type="button" className="clv-dbtn" data-clv="btn-group"
        data-on={pop === "group" || groupKey !== "stand" || undefined}
        aria-expanded={pop === "group"}
        onClick={(e) => openPop("group", e.currentTarget)}
      >
        {GROUP_ICON} Group
      </button>
      <button
        type="button" className="clv-dbtn" data-clv="btn-sort"
        data-on={pop === "sort" || sortKey !== "due" || undefined}
        aria-expanded={pop === "sort"}
        onClick={(e) => openPop("sort", e.currentTarget)}
      >
        {SORT_ICON} Sort
      </button>
      {anyActive && (
        <button type="button" className="clv-dbtn clv-dbtn--reset" data-clv="btn-reset" aria-label="Reset the list" title="Reset the list" onClick={() => { onReset(); setPop(null); }}>
          {RESET_ICON}
        </button>
      )}

      {pop === "filter" && (
        <div className="clv-pop clv-fpanel" data-clv="fpanel" style={{ right: 0, maxHeight: maxH }} role="dialog" aria-label="Filter">
          <div className="clv-fhead">
            <b>Filter</b>
            {nFilters > 0 && <em data-clv="factive">{nFilters} active</em>}
          </div>
          <div
            className="clv-fbody" ref={bodyRef} data-clv="fbody"
            onScroll={(e) => { bodyScroll.current = (e.target as HTMLElement).scrollTop; }}
          >
            <div className="clv-fsec" data-clv="fsec-stand">
              <h5>Where you stand</h5>
              {options.stand.map((o) => (
                <button
                  key={o.value} type="button" className="clv-fck" role="checkbox"
                  aria-checked={filters.stand.includes(o.value as StandKey)}
                  data-zero={o.n === 0 && !filters.stand.includes(o.value as StandKey) || undefined}
                  onClick={() => toggle("stand", o.value as StandKey)}
                >
                  <span className="clv-bx" aria-hidden="true" />
                  {STAND_LABEL[o.value as StandKey]}
                  <i>{o.n}</i>
                </button>
              ))}
            </div>
            <div className="clv-fsec" data-clv="fsec-genres">
              <h5>Genres sought</h5>
              <div className="clv-chips">
                {options.genres.map((o) => (
                  <button
                    key={o.value} type="button" className="clv-chip"
                    aria-pressed={filters.genres.includes(o.value)}
                    data-zero={o.n === 0 && !filters.genres.includes(o.value) || undefined}
                    onClick={() => toggle("genres", o.value)}
                  >
                    {o.value} <i>{o.n}</i>
                  </button>
                ))}
              </div>
            </div>
            <div className="clv-fsec" data-clv="fsec-door">
              <h5>Open to queries</h5>
              <div className="clv-chips">
                {options.door.map((o) => (
                  <button
                    key={o.value} type="button" className="clv-chip"
                    aria-pressed={filters.door.includes(o.value as "open" | "closed")}
                    data-zero={o.n === 0 && !filters.door.includes(o.value as "open" | "closed") || undefined}
                    onClick={() => toggle("door", o.value as "open" | "closed")}
                  >
                    {o.value === "open" ? "Open" : "Closed"} <i>{o.n}</i>
                  </button>
                ))}
              </div>
            </div>
            <div className="clv-fsec" data-clv="fsec-locs">
              <h5>Location</h5>
              <div className="clv-chips">
                {options.locs.map((o) => (
                  <button
                    key={o.value} type="button" className="clv-chip"
                    aria-pressed={filters.locs.includes(o.value)}
                    data-zero={o.n === 0 && !filters.locs.includes(o.value) || undefined}
                    onClick={() => toggle("locs", o.value)}
                  >
                    {o.value} <i>{o.n}</i>
                  </button>
                ))}
              </div>
            </div>
            <div className="clv-fsec" data-clv="fsec-status">
              <h5>Query status</h5>
              {options.status.map((o) => (
                <button
                  key={o.value} type="button" className="clv-fck" role="checkbox"
                  aria-checked={filters.status.includes(o.value)}
                  data-zero={o.n === 0 && !filters.status.includes(o.value) || undefined}
                  onClick={() => toggle("status", o.value)}
                >
                  <span className="clv-bx" aria-hidden="true" />
                  <span className="clv-gy" aria-hidden="true">
                    {STATUS_GLYPH[o.value] != null && <StatusDot status={STATUS_GLYPH[o.value] as QueryStatus} overrideSize={12} />}
                  </span>
                  {o.value}
                  <i>{o.n}</i>
                </button>
              ))}
            </div>
            <div className="clv-fsec" data-clv="fsec-rating">
              <h5>Your rating</h5>
              <div className="clv-chips">
                {options.rating.map((o) => (
                  <button
                    key={o.value} type="button" className="clv-chip"
                    aria-pressed={filters.rating.includes(Number(o.value) as RatingKey)}
                    data-zero={o.n === 0 && !filters.rating.includes(Number(o.value) as RatingKey) || undefined}
                    onClick={() => toggle("rating", Number(o.value) as RatingKey)}
                  >
                    {ratingLabel(o.value)} <i>{o.n}</i>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="clv-ffoot">
            <span><b>{shownCount}</b> of {total} agents</span>
            <button type="button" className="clv-clr" onClick={() => onFilters({ stand: [], genres: [], door: [], locs: [], status: [], rating: [] })}>Clear all</button>
            <button type="button" className="clv-done" onClick={() => setPop(null)}>Done</button>
          </div>
        </div>
      )}

      {pop === "group" && (
        <div className="clv-pop clv-menu" data-clv="gmenu" style={{ right: 0 }} role="menu" aria-label="Group">
          <h4>Group</h4>
          {GROUP_OPTIONS.map((g) => (
            <button key={g.key} type="button" role="menuitemradio" aria-checked={groupKey === g.key} onClick={() => { onGroup(g.key); setPop(null); }}>
              {g.label}
            </button>
          ))}
        </div>
      )}
      {pop === "sort" && (
        <div className="clv-pop clv-menu" data-clv="smenu" style={{ right: 0 }} role="menu" aria-label="Sort">
          <h4>Sort</h4>
          {SORT_OPTIONS.map((s) => (
            <button key={s.key} type="button" role="menuitemradio" aria-checked={sortKey === s.key} onClick={() => { onSort(s.key); setPop(null); }}>
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export { NOT_RECORDED };
