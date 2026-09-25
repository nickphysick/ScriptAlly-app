/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QcCalControls — Filter, Sort and Reset at the foot of the Courier's column (v65 §8.1, §8.3).
 *
 * ⚠️ ONE POPOVER, TWO BUTTONS. Filter and Sort open the same panel with different contents, which
 * is what makes "only one can be open" true by construction rather than by two components agreeing
 * to close each other. The open one is a single value held by the card.
 *
 * ⚠️ AND THE OPEN STATE LIVES ABOVE THIS COMPONENT, deliberately, because Escape has to cascade:
 * an open popover consumes the key and closes itself, and only a closed one lets it reach the card.
 * Two `document` listeners racing on registration order is how that cascade breaks — the later
 * listener wins, and which one that is depends on which element mounted last.
 *
 * ⚠️ THE CLUSTER IS CENTRED ON THE COLUMN, NOT ON THE BUTTONS' OWN WIDTHS. It is a flex row filling
 * the column, so the ↺ appearing beside the two buttons re-centres all three rather than pushing
 * the pair off the column's midline.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { ATTENTION_LABEL, ATTENTION_ORDER, EYE_FOCUS, type Attention } from "../../../lib/qcBirdsEye";
import {
  CAL_DEFAULT, DUE_OPTIONS, GROUP_BY_OPTIONS, SORT_BY_OPTIONS, activeFacets, anyDiffers, clearFilters,
  filterDiffers, groupDiffers, setDue, sortDiffers, toggleAttention, togglePackage, toggleStatus,
  type CalView, type FacetCounts,
} from "../../../lib/qcCalView";
import { STAGE_NAME } from "../../../lib/qcSummary";
import { StatusDot } from "../../StatusDot";
import type { QueryStatus } from "../../../types";

export type CalMenu = "filter" | "group" | "sort" | null;

const Funnel: React.FC = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
    <path d="M1.5 2.5h12l-4.6 5.3v4.2l-2.8 1.5V7.8L1.5 2.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
  </svg>
);
const Stack: React.FC = () => (
  <svg width="13" height="13" viewBox="0 0 15 15" fill="none" aria-hidden="true">
    <path d="M1.8 3.4h11.4M1.8 7.5h11.4M1.8 11.6h6.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);
const Arrows: React.FC = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
    <path d="M4.2 2.2v10.6M4.2 2.2 2 4.6M4.2 2.2l2.2 2.4M10.8 12.8V2.2m0 10.6 2.2-2.4m-2.2 2.4-2.2-2.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const QcCalControls: React.FC<{
  view: CalView;
  onView: (v: CalView) => void;
  menu: CalMenu;
  onMenu: (m: CalMenu) => void;
  counts: Record<Attention, number>;
  /** §D1 — the faceted counts, the package list and the foot's two figures, derived once by the card */
  facets: FacetCounts;
  statuses: readonly QueryStatus[];
  packages: readonly string[];
}> = ({ view, onView, menu, onMenu, counts, facets, statuses, packages }) => {
  const ref = useRef<HTMLDivElement>(null);

  /**
   * §D2 — THE PANEL KEEPS ITS PLACE, and the reason it has to is that every choice rebuilds it.
   *
   * ⚠️ EVERY TICK RE-RENDERS THE WHOLE PANEL, because the counts, the head's pill and the foot all
   * move with it — so a reader who has scrolled to Submission package and ticks one is returned to
   * Status, with the section they were working in off the screen. The scroll is not lost by anyone
   * deciding to reset it; it is lost because the element is new.
   *
   * ⚠️ THE POSITION IS RECORDED FROM THE READER'S SCROLLS ONLY, AND THAT GUARD DOES NOT REDDEN THE
   * LOCK. A restore writes `scrollTop`, which fires `scroll`, so without `restoring` the restore
   * records its own value — which is the SAME value, so three choices in a row measure identically
   * and the mutation passes. The case it is really for is a restore the browser CLAMPS: filter the
   * list down, the body gets shorter, 260 becomes whatever fits, and recording that clamped number
   * would take it as the reader's intent and lose the place permanently. Kept for that, not for a
   * drift I could measure.
   *
   * ⚠️ AND A FRESH OPEN STARTS AT THE TOP. Remembering the position ACROSS openings would put a
   * reader who opened the panel deliberately in the middle of a list they have not seen — the
   * memory is about one continuous piece of work, not about the control.
   */
  const scrolled = useRef(0);
  const restoring = useRef(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const onBodyScroll = useCallback(() => {
    if (restoring.current) return;
    scrolled.current = bodyRef.current?.scrollTop ?? 0;
  }, []);
  useEffect(() => { if (!menu) scrolled.current = 0; }, [menu]);
  /* ⚠️ LAYOUT, NOT EFFECT — an ordinary effect paints the panel at the top for one frame first,
     which is the jump this exists to remove rather than a smaller version of it. */
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el || scrolled.current === 0) return;
    restoring.current = true;
    el.scrollTop = scrolled.current;
    const t = window.setTimeout(() => { restoring.current = false; }, 80);
    return () => window.clearTimeout(t);
  });

  /**
   * §A5 — ANY PRESS OUTSIDE THE OPEN PANEL CLOSES IT.
   *
   * ⚠️ THE PHASE IS PRECAUTIONARY, AND I SAID OTHERWISE BEFORE MEASURING. A `pointerdown` inside
   * the expanded view meets the date row's drag (`setPointerCapture` + `preventDefault`), the rows'
   * own handlers, and a `stopPropagation` on every control that must not open a query — so the
   * BUBBLING listener this replaced looked certain to be swallowed. Measured over all twelve
   * targets in the §A5 sweep, it was not: bubbling closed the panel on every one of them, and a
   * mutation back to bubbling does not redden the lock. The capture phase is kept because
   * `stopPropagation` cannot un-run a listener already called on the way DOWN — so the next control
   * to stop an event cannot quietly strand the panel — but it fixes no fault observable today.
   *
   * The panel's own cluster is "inside", so its button still toggles rather than closing-and-
   * reopening; and this never calls `preventDefault`, so the press it observes still does whatever
   * it was going to do. Escape is unchanged and still cascades from the card's one handler.
   */
  useEffect(() => {
    if (!menu) return undefined;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onMenu(null);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [menu, onMenu]);

  const set = (over: Partial<CalView>) => onView({ ...view, ...over });
  const filterOn = filterDiffers(view);
  const groupOn = groupDiffers(view);
  const sortOn = sortDiffers(view);

  return (
    <div className="qcv-xp-ctl" data-qcv="xp-ctl" ref={ref}>
      <button
        type="button"
        className={`qcv-xp-btn${filterOn || menu === "filter" ? " qcv-xp-btn--on" : ""}`}
        data-qcv="xp-filter"
        data-changed={filterOn ? "true" : "false"}
        aria-expanded={menu === "filter"}
        onClick={() => onMenu(menu === "filter" ? null : "filter")}
      >
        <Funnel /> Filter
        {/* §D1 — the badge counts FACETS, from the one derivation the header also reads */}
        {activeFacets(view) > 0 && <i className="qcv-xp-badge" data-qcv="xp-badge">{activeFacets(view)}</i>}
      </button>
      {/**
        * §6 — GROUP IS ITS OWN CONTROL. It rode inside Sort's popover, which lit the Sort button for
        * a setting Sort does not own and buried the page's most useful arrangement two clicks down.
        */}
      <button
        type="button"
        className={`qcv-xp-btn${groupOn || menu === "group" ? " qcv-xp-btn--on" : ""}`}
        data-qcv="xp-group"
        data-changed={groupOn ? "true" : "false"}
        aria-expanded={menu === "group"}
        onClick={() => onMenu(menu === "group" ? null : "group")}
      >
        <Stack /> Group
      </button>
      <button
        type="button"
        className={`qcv-xp-btn${sortOn || menu === "sort" ? " qcv-xp-btn--on" : ""}`}
        data-qcv="xp-sort"
        data-changed={sortOn ? "true" : "false"}
        aria-expanded={menu === "sort"}
        onClick={() => onMenu(menu === "sort" ? null : "sort")}
      >
        <Arrows /> Sort
      </button>
      {/* §8.1 — ↺ appears whenever ANYTHING differs, and resets all of it. It never touches zoom or
          scroll: those belong to the track, not to which rows are on it. */}
      {anyDiffers(view) && (
        <button
          type="button"
          className="qcv-xp-reset"
          data-qcv="xp-reset"
          aria-label="Reset the filter and the sort"
          title="Reset the filter and the sort"
          onClick={() => { onView(CAL_DEFAULT); onMenu(null); }}
        >↺</button>
      )}

      {menu && (
        <div
          className="qcv-xp-pop"
          data-qcv="xp-pop"
          data-menu={menu}
          role="group"
          aria-label={menu === "filter" ? "Filter" : menu === "group" ? "Group" : "Sort"}
        >
          {menu === "group" ? (
            <>
              <section className="qcv-xp-sec" role="radiogroup" aria-label="Group by">
                <h5>Group by</h5>
                {GROUP_BY_OPTIONS.map((o) => (
                  <button key={o.key} type="button" role="radio" aria-checked={view.groupBy === o.key} onClick={() => set({ groupBy: o.key })}>{o.label}</button>
                ))}
              </section>
              <button type="button" className="qcv-xp-clear" data-qcv="xp-cleargroup" onClick={() => set({ groupBy: CAL_DEFAULT.groupBy })}>Reset grouping</button>
            </>
          ) : menu === "filter" ? (
            <>
              {/**
                * §D1 — HEAD, FIVE SECTIONS, FOOT.
                *
                * ⚠️ EVERY COUNT IS FACETED, AND THAT IS THE ONLY HONEST ONE. An option's number is
                * what the list would hold if this were chosen as well — so the other four facets
                * apply and its own does not. Counting with all five applied makes every unticked
                * option in a narrowed facet read 0, which tells a reader that choosing any of them
                * empties the list; counting with none applied ignores the filtering they have
                * already done. `facetCounts` is the one place that distinction is made.
                */}
              <div className="qcv-xp-fhead" data-qcv="xp-fhead">
                <b>Filter</b>
                {activeFacets(view) > 0 && <em data-qcv="xp-factive">{activeFacets(view)} active</em>}
              </div>
              <div className="qcv-xp-fbody" data-qcv="xp-fbody" ref={bodyRef} onScroll={onBodyScroll}>
                <section className="qcv-xp-sec" data-qcv="xp-sec" data-facet="status">
                  <h5>Status{view.statuses.length > 0 && <em>{view.statuses.length} selected</em>}</h5>
                  {statuses.map((k) => (
                    <button
                      key={String(k)}
                      type="button"
                      className="qcv-xp-chk"
                      data-qcv="xp-chk"
                      data-facet="status"
                      role="checkbox"
                      aria-checked={view.statuses.includes(k)}
                      onClick={() => onView(toggleStatus(view, k))}
                    >
                      <i aria-hidden="true">{view.statuses.includes(k) ? "✓" : ""}</i>
                      <StatusDot status={k} overrideSize={12} decorative />
                      <span>{STAGE_NAME[k]}</span>
                      <u>{facets.status[k] ?? 0}</u>
                    </button>
                  ))}
                </section>
                <section className="qcv-xp-sec" data-qcv="xp-sec" data-facet="court">
                  <h5>Whose court</h5>
                  <div className="qcv-xp-seg" role="radiogroup" aria-label="Whose court">
                    {EYE_FOCUS.map((f) => (
                      /* ⚠️ `data-court` because the count is INSIDE the button, so its accessible
                         name is now "With you 4" — anything matching on the exact words stops
                         finding it the moment the facet learns to state its own number. */
                      <button key={f.key} type="button" role="radio" data-court={f.key} aria-checked={view.court === f.key} onClick={() => set({ court: f.key })}>
                        {f.label}<u>{facets.court[f.key] ?? 0}</u>
                      </button>
                    ))}
                  </div>
                </section>
                <section className="qcv-xp-sec" data-qcv="xp-sec" data-facet="attention">
                  <h5>Attention</h5>
                  <div className="qcv-xp-chips">
                    {ATTENTION_ORDER.map((k) => (
                      <button
                        key={k}
                        type="button"
                        className={`qcv-xp-chip${view.attention.includes(k) ? " qcv-xp-chip--on" : ""}`}
                        data-qcv="xp-chk"
                        data-facet="attention"
                        data-group={k}
                        role="checkbox"
                        aria-checked={view.attention.includes(k)}
                        onClick={() => onView(toggleAttention(view, k))}
                      >
                        {ATTENTION_LABEL[k]}<u>{facets.attention[k] ?? 0}</u>
                      </button>
                    ))}
                  </div>
                </section>
                <section className="qcv-xp-sec" data-qcv="xp-sec" data-facet="due">
                  <h5>Next action due</h5>
                  <div className="qcv-xp-chips">
                    {DUE_OPTIONS.map((o) => (
                      <button
                        key={o.key}
                        type="button"
                        className={`qcv-xp-chip${view.due === o.key ? " qcv-xp-chip--on" : ""}`}
                        data-qcv="xp-chk"
                        data-facet="due"
                        data-due={o.key}
                        role="radio"
                        aria-checked={view.due === o.key}
                        onClick={() => onView(setDue(view, o.key))}
                      >
                        {/* ⚠️ "Any time" states no count — it is the ABSENCE of this facet, and a
                            number beside it would read as a sixth window rather than as no window */}
                        {o.label}{o.key !== "any" && <u>{facets.due[o.key] ?? 0}</u>}
                      </button>
                    ))}
                  </div>
                </section>
                {packages.length > 1 && (
                  <section className="qcv-xp-sec" data-qcv="xp-sec" data-facet="package">
                    <h5>Submission package{view.packages.length > 0 && <em>{view.packages.length} selected</em>}</h5>
                    {packages.map((n) => (
                      <button
                        key={n || "__none"}
                        type="button"
                        className="qcv-xp-chk"
                        data-qcv="xp-chk"
                        data-facet="package"
                        data-pkg={n || "__none"}
                        role="checkbox"
                        aria-checked={view.packages.includes(n)}
                        onClick={() => onView(togglePackage(view, n))}
                      >
                        <i aria-hidden="true">{view.packages.includes(n) ? "✓" : ""}</i>
                        <span>{n || "No package"}</span>
                        <u>{facets.package[n] ?? 0}</u>
                      </button>
                    ))}
                  </section>
                )}
              </div>
              <div className="qcv-xp-ffoot" data-qcv="xp-ffoot">
                <span data-qcv="xp-fcount"><b>{facets.shown}</b> of {facets.total} queries</span>
                {activeFacets(view) > 0 && (
                  <button type="button" className="qcv-xp-fclear" data-qcv="xp-clearfilter" onClick={() => onView(clearFilters(view))}>Clear all</button>
                )}
                <button type="button" className="qcv-xp-fdone" data-qcv="xp-fdone" onClick={() => onMenu(null)}>Done</button>
              </div>
            </>
          ) : (
            <>
              <section className="qcv-xp-sec">
                <h5>Sort by</h5>
                {/* ⚠️ THE RADIOS ARE WRAPPED AND THE FLIP IS NOT — a `radiogroup` says its children
                    are the choices, and the direction is a separate control that happens to sit
                    beneath them. The wrapper is a bare div and the buttons are block-level, so it
                    costs nothing in layout. */}
                <div role="radiogroup" aria-label="Sort by">
                  {SORT_BY_OPTIONS.map((o) => (
                    <button key={o.key} type="button" role="radio" aria-checked={view.sortBy === o.key} onClick={() => set({ sortBy: o.key })}>{o.label}</button>
                  ))}
                </div>
                <button type="button" className="qcv-xp-dir" data-qcv="xp-dir" onClick={() => set({ asc: !view.asc })}>
                  {view.asc ? "↑ ascending" : "↓ descending"} · flip
                </button>
              </section>
              <button
                type="button"
                className="qcv-xp-clear"
                data-qcv="xp-clearsort"
                onClick={() => set({ sortBy: CAL_DEFAULT.sortBy, asc: CAL_DEFAULT.asc })}
              >Reset sort</button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
