/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * WorkspacePageGrid — chrome OUTSIDE the scroller (amendment 9).
 *
 * ⚠️ THE RULE THIS EXISTS TO ENFORCE: chrome belongs outside the scroller. `position: sticky` is
 * for content that must scroll with the page until a boundary, which page chrome never does.
 *
 * A three-row grid — plate · toolbar · scroller — where the chrome rows are SIBLINGS of the
 * scrolling row. They are pinned by construction, so there is no offset to compute and therefore
 * no offset to get wrong. This replaces the sticky arrangement wholesale, and the three faults it
 * had are worth naming so none of them is reinvented:
 *
 *   1. The toolbar's `top` encoded another element's height as a literal — `calc(56px + gap)`, the
 *      same fault as the banned `calc(100vh - 64px)`. It was silently wrong by 32px on the Tasks
 *      family, which does not condense: same CSS, same component, broken on a third of the app.
 *   2. Condensing an IN-FLOW sticky element changes the scroller's flow height, which forced a
 *      reservation padding to cancel it — a workaround for a self-inflicted problem, and one that
 *      could oscillate near the threshold (shrink → less scroll → un-shrink → jump).
 *   3. Two stacking contexts, hand-tuned z-indexes and a `backdrop-filter` repainting every scroll
 *      frame, all to hold up an arrangement a grid gives for free.
 *
 * The app already had the right answer in `TasksPageLayout`, whose `.tpl-head` has always sat
 * outside its scroller. That is the app-wide pattern now, not an exception.
 *
 * ⚠️ INERT ON ARRIVAL. Nothing imports this yet, deliberately: the primitive lands first as a
 * visual no-op, then one page converts per commit, and the old path stays alive until the last of
 * them is off it. Any stop between commits leaves a working app.
 */
import React from "react";
import "./workspacePageGrid.css";

/**
 * ⚠️ THE GRID TELLS THE PLATE WHEN TO CONDENSE — the plate never goes looking.
 *
 * The obvious alternative was a DOM lookup: `closest('.sa-chrome-grid')?.querySelector('.scroll')`.
 * That holds until something INSIDE the scroll row is itself a scroller, at which point
 * `querySelector` returns the wrong element and the plate condenses on a stranger — silent
 * misbehaviour with a new mechanism. Two strings coupling two components across the DOM is the
 * hardcoded `top` offset again, just harder to spot.
 *
 * Context carries a BOOLEAN rather than a ref, which is the smaller contract: the grid owns the
 * scroller, owns the sentinel and owns the observer, so the plate needs no ref, no traversal and no
 * knowledge of where it sits. `null` means "no grid above me" and is distinguishable from `false`,
 * which is what lets a consumer complain instead of quietly reading a plausible default.
 */
export const PlateCondensedContext = React.createContext<boolean | null>(null);

export interface WorkspacePageGridProps {
  /** Row 1 — the plate. Identity only: mark, title, description, primary action. */
  plate: React.ReactNode;
  /**
   * Row 2 — the page's controls, plus its tally.
   *
   * ⚠️ NO CONTAINER. No border, no shadow, no background, and NO state change on scroll — just the
   * controls and a hairline beneath. Because it never changes appearance as you scroll, the
   * short-list flicker that a condensing toolbar would have had does not exist here, so it needs no
   * hysteresis threshold. Do not add one.
   *
   * Absent → no row and no hairline. The grid reserves nothing for it.
   */
  toolbar?: React.ReactNode;
  /** Row 3 — the only thing that scrolls. */
  children: React.ReactNode;
  /** Page-scoped class on the grid root, for the page's own gutter and cap. */
  className?: string;
  /** Accessible name for the scroll region, when the page has one worth stating. */
  scrollLabel?: string;
}

export const WorkspacePageGrid: React.FC<WorkspacePageGridProps> = ({
  plate, toolbar, children, className, scrollLabel,
}) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const sentinelRef = React.useRef<HTMLDivElement>(null);
  const [condensed, setCondensed] = React.useState(false);

  /**
   * ⚠️ AN INTERSECTION OBSERVER ON A 1px SENTINEL, NOT A SCROLL LISTENER. The condense is a
   * BOUNDARY event — it happens once, when the top of the content passes the top of the scroller —
   * so it should be reported at the boundary rather than recomputed on every frame of every scroll.
   *
   * The sentinel is absolutely positioned at the scroll row's content top, so it scrolls out of the
   * scrollport with the content and costs no layout height. `root` is the scroll row itself: with
   * the default (the viewport) it would report on the wrong scrollport entirely.
   */
  React.useEffect(() => {
    const root = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel) return;
    const io = new IntersectionObserver(
      ([entry]) => setCondensed(!entry.isIntersecting),
      { root, threshold: 0 },
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, []);

  return (
    <PlateCondensedContext.Provider value={condensed}>
      <div className={`wpg${className ? ` ${className}` : ""}`}>
        <div className="wpg-plate">{plate}</div>
        {toolbar && <div className="wpg-tools">{toolbar}</div>}
        <div
          className="wpg-scroll"
          ref={scrollRef}
          /* a scrollable region must be reachable by keyboard, and named when it is */
          tabIndex={0}
          role={scrollLabel ? "region" : undefined}
          aria-label={scrollLabel}
        >
          <div className="wpg-sentinel" ref={sentinelRef} aria-hidden="true" />
          {children}
        </div>
      </div>
    </PlateCondensedContext.Provider>
  );
};
