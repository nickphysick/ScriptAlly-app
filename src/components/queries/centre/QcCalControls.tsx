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
import React, { useEffect, useRef } from "react";
import { ATTENTION_LABEL, ATTENTION_ORDER, EYE_FOCUS, type Attention } from "../../../lib/qcBirdsEye";
import {
  CAL_DEFAULT, GROUP_BY_OPTIONS, SORT_BY_OPTIONS, anyDiffers, filterDiffers, sortDiffers,
  toggleAttention, type CalView,
} from "../../../lib/qcCalView";

export type CalMenu = "filter" | "sort" | null;

const Funnel: React.FC = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
    <path d="M1.5 2.5h12l-4.6 5.3v4.2l-2.8 1.5V7.8L1.5 2.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
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
}> = ({ view, onView, menu, onMenu, counts }) => {
  const ref = useRef<HTMLDivElement>(null);

  /* the scope chip's dismissal idiom: pointerdown outside closes; the trigger counts as inside */
  useEffect(() => {
    if (!menu) return undefined;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onMenu(null);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [menu, onMenu]);

  const set = (over: Partial<CalView>) => onView({ ...view, ...over });
  const filterOn = filterDiffers(view);
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
        <div className="qcv-xp-pop" data-qcv="xp-pop" data-menu={menu} role="group" aria-label={menu === "filter" ? "Filter" : "Sort"}>
          {menu === "filter" ? (
            <>
              <section className="qcv-xp-sec">
                <h5>Whose court</h5>
                <div className="qcv-xp-seg" role="radiogroup" aria-label="Whose court">
                  {EYE_FOCUS.map((f) => (
                    <button key={f.key} type="button" role="radio" aria-checked={view.court === f.key} onClick={() => set({ court: f.key })}>{f.label}</button>
                  ))}
                </div>
              </section>
              <section className="qcv-xp-sec">
                <h5>Attention</h5>
                {ATTENTION_ORDER.map((k) => (
                  <button
                    key={k}
                    type="button"
                    className="qcv-xp-chk"
                    data-qcv="xp-chk"
                    data-group={k}
                    role="checkbox"
                    aria-checked={view.attention.includes(k)}
                    disabled={counts[k] === 0}
                    onClick={() => onView(toggleAttention(view, k))}
                  >
                    <i aria-hidden="true">{view.attention.includes(k) ? "✓" : ""}</i>
                    {ATTENTION_LABEL[k]}
                    <u>{counts[k]}</u>
                  </button>
                ))}
              </section>
              <button type="button" className="qcv-xp-clear" data-qcv="xp-clearfilter" onClick={() => set({ court: CAL_DEFAULT.court, attention: [] })}>Clear filters</button>
            </>
          ) : (
            <>
              <section className="qcv-xp-sec" role="radiogroup" aria-label="Group by">
                <h5>Group by</h5>
                {GROUP_BY_OPTIONS.map((o) => (
                  <button key={o.key} type="button" role="radio" aria-checked={view.groupBy === o.key} onClick={() => set({ groupBy: o.key })}>{o.label}</button>
                ))}
              </section>
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
                onClick={() => set({ groupBy: CAL_DEFAULT.groupBy, sortBy: CAL_DEFAULT.sortBy, asc: CAL_DEFAULT.asc })}
              >Reset sort</button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
