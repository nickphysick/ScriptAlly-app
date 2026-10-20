/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE TABLE LIST'S SHARED PIECES (Contact list v14 §5–§6, ruling Q1; v131's table grammar). Built for the
 * Contact list ONLY and named for a swap: the Query Centre adopting them is a later pass, so until then
 * there are two implementations of this grammar, deliberately.
 *
 *   ListPanel        the white panel a group's rows sit in (16px corners, the soft lift, clipped)
 *   ListLabels       the sticky column labels — plain mono caps on white, a hairline under, sortable
 *                    columns pressable; they LIFT (a soft shadow) once they pin (§7.5)
 *   ListGroupHeader  the sticky group header, dressed by `tone` — "powder" is §5's band
 *   ListDivider      the letter divider inside one panel (Letter grouping), sticky under the labels
 *   useStuckPast     the hook that says when something has pinned — derived from boxes on every scroll
 *
 * The columns are the consumer's: a panel takes `--lt-cols`, and the labels and rows read it, so the
 * three cannot disagree about where a column starts.
 */
import React, { useEffect, useRef, useState } from "react";
import "./listTable.css";

/**
 * True once `el` has pinned at its sticky `top` inside the page's scroller (`.wpg-scroll`): its natural
 * place — the top of `container` — has gone above the line, and the container has not yet left.
 * ⚠️ DERIVED FROM THE BOXES ON EVERY SCROLL, NEVER AN IntersectionObserver (the house law: an observer only
 * fires on a CHANGE, so a missed event is permanent). rAF-throttled; re-reads on resize.
 */
export function useStuckPast(
  container: React.RefObject<HTMLElement | null>,
  el: React.RefObject<HTMLElement | null>,
  top: number,
  ready = true,
): boolean {
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const c = container.current;
    const sc = c?.closest<HTMLElement>(".wpg-scroll");
    if (!ready || !c || !sc) { setStuck(false); return undefined; }
    let raf = 0;
    const read = () => {
      raf = 0;
      const line = sc.getBoundingClientRect().top + top;
      const cb = container.current?.getBoundingClientRect();
      const h = el.current?.getBoundingClientRect().height ?? 0;
      const next = !!cb && cb.height > 0 && cb.top < line - 0.5 && cb.bottom > line + h;
      setStuck((cur) => (cur === next ? cur : next));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(read); };
    sc.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    read();
    return () => { sc.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [container, el, top, ready]);
  return stuck;
}

export interface ListColumn {
  label: string;
  /** Help system v1 D — what the heading DRAWS, when it is more than its label (a defined word); `label` stays the name */
  node?: React.ReactNode;
  /** a sortable column: pressing it sorts by it, pressing again turns the order round */
  /** `ariaSort` (opt-in) also states the order on the active heading as `aria-sort`, for a list whose headings are its only sort control */
  /** `idleMark` (opt-in, Contact list v19 §C) shows a faint ⇅ on a sortable heading that is not the active one */
  sort?: { on: boolean; reversed: boolean; onPress: () => void; ariaSort?: boolean; idleMark?: boolean };
  align?: "end";
}

type DataProps = { [k: `data-${string}`]: string | undefined };

/** The white panel. `stickTop` is where its labels pin (0 in one panel; under a group header otherwise). */
export const ListPanel: React.FC<{
  cols: string;
  columns: ListColumn[];
  stickTop?: number;
  children: React.ReactNode;
} & DataProps> = ({ cols, columns, stickTop = 0, children, ...rest }) => {
  const ref = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const stuck = useStuckPast(ref, labelsRef, stickTop);
  return (
    <div className="lt-panel" ref={ref} style={{ "--lt-cols": cols, "--lt-stick": `${stickTop}px` } as React.CSSProperties} {...rest}>
      <ListLabels columns={columns} stuck={stuck} labelsRef={labelsRef} />
      {children}
    </div>
  );
};

export const ListLabels: React.FC<{ columns: ListColumn[]; stuck: boolean; labelsRef?: React.Ref<HTMLDivElement> }> = ({ columns, stuck, labelsRef }) => (
  /* v18.3 §E — `lth`: the table's own header row (shell/listToolbar.css), shared with the Query Centre's headings */
  <div className={`lt-labels lth${stuck ? " is-stuck" : ""}`} data-lt="labels" data-stuck={stuck || undefined} ref={labelsRef}>
    {columns.map((c) =>
      c.sort ? (
        <button
          key={c.label} type="button" className={`lt-lab${c.sort.on ? " on" : ""}${c.align === "end" ? " end" : ""}`}
          data-lt-col={c.label} aria-pressed={c.sort.on}
          aria-sort={c.sort.ariaSort && c.sort.on ? (c.sort.reversed ? "descending" : "ascending") : undefined}
          aria-label={`Sort by ${c.label.toLowerCase()}${c.sort.on ? (c.sort.reversed ? ", reversed" : "") : ""}`}
          onClick={c.sort.onPress}
        >
          {c.node ?? c.label}{c.sort.on ? <i aria-hidden="true">{c.sort.reversed ? " ↑" : " ↓"}</i> : c.sort.idleMark ? <i className="lt-idle" aria-hidden="true"> ⇅</i> : null}
        </button>
      ) : (
        <span key={c.label} className={`lt-lab${c.align === "end" ? " end" : ""}`} data-lt-col={c.label}>{c.node ?? c.label}</span>
      ),
    )}
  </div>
);

/** §5 — the group header. Its art circle holds `art` (a mark or a letter); the count sits in a pill. */
export const ListGroupHeader: React.FC<{
  tone?: "powder";
  title: string;
  count: string;
  art?: React.ReactNode;
} & DataProps> = ({ tone = "powder", title, count, art, ...rest }) => (
  <div className={`lt-gh lt-gh--${tone}`} {...rest}>
    <span className="lt-gart" aria-hidden="true">{art ?? <GroupMark />}</span>
    <b>{title}</b>
    <em data-cl13="gcount">{count}</em>
  </div>
);

/** the letter divider (one panel, Letter grouping): the letter in a small tab, the count beside it */
export const ListDivider: React.FC<{ letter: string; count: string } & DataProps> = ({ letter, count, ...rest }) => (
  <div className="lt-div" {...rest}>
    <span className="lt-dtab"><b>{letter}</b></span>
    <em data-cl13="gcount">{count}</em>
  </div>
);

/** the group header's default mark — v131's card glyph, drawn (never a typed character) */
export const GroupMark: React.FC = () => (
  <svg viewBox="0 0 17 17" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="4" width="11" height="9" rx="1.5" /><path d="M6 7.5h5M6 10h3" />
  </svg>
);
