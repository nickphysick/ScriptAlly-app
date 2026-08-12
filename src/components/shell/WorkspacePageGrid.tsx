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
  /**
   * ⚠️ THE MODE HALF OF THE WORKING STATE (spec §4). The strip means the user is WORKING rather
   * than browsing. On a scrolling page, scrolling is the proxy for that — the sentinel reports it.
   * On a workspace page nothing scrolls, and the real signal is entering a journey: Query Centre
   * strips on `log a query` and on `record a response`, and returns on leaving.
   *
   * ⚠️ THE UNION IS TAKEN HERE, AND THE HEADER NEVER LEARNS WHICH HALF FIRED. It receives one
   * boolean through context, so a page cannot grow a second way of being condensed and the header
   * cannot start behaving differently depending on why.
   *
   * ⚠️ NEVER SYNTHESISE A SCROLL SIGNAL TO GET THIS. A non-scrolling page that fakes a scroll
   * position to make itself strip has two sources of truth for one state and no way to reconcile
   * them. Pages that neither scroll nor open a journey keep the card permanently, and that is
   * correct rather than a gap.
   */
  condensed?: boolean;
}

export const WorkspacePageGrid: React.FC<WorkspacePageGridProps> = ({
  plate, toolbar, children, className, scrollLabel, condensed: condensedByMode = false,
}) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = React.useState(false);
  /* ⚠️ THE UNION, AND IT IS AN `||` RATHER THAN A PRIORITY. Neither half outranks the other: a
     journey opened part-way down a scrolled page is still working, and closing it while still
     scrolled must not restore the card. Everything below reads this one value. */
  const condensed = stuck || condensedByMode;

  /**
   * ⚠️ THE THRESHOLD IS THE RECLAIM, COMPUTED FROM THE TOKENS AT CALL TIME. It is exactly the
   * height stripping gives back — the row's rest height plus its gap, less the strip — so a token
   * change cannot leave a stale number behind.
   */
  const reclaimedPx = React.useCallback((): number => {
    if (typeof window === "undefined") return 0;
    const cs = getComputedStyle(document.documentElement);
    const n = (name: string) => parseFloat(cs.getPropertyValue(name)) || 0;
    return n("--wsh-plate-h") + n("--wsh-plate-gap") - n("--wsh-plate-h-scrolled");
  }, []);

  /**
   * ⚠️ THE STATE IS DERIVED FROM `scrollTop` ON EVERY FRAME, NOT REPORTED BY AN OBSERVER.
   *
   * An IntersectionObserver fires only on a CHANGE of intersection, so a single missed or mistimed
   * event leaves the header permanently in the wrong state with nothing left to re-evaluate it.
   * That is what shipped, and it is why running a diagnostic appeared to "fix" the page: the
   * diagnostic scrolled the scroller, which produced the change the observer had missed. Measured
   * on a real account — `overflow: 267`, `reclaim: 62`, `safeToStrip: true`, and both classes
   * absent — the arithmetic was never wrong; the mechanism was.
   *
   * ⚠️ SO IT IS STATELESS. No cached decision can go stale, a remounted node cannot orphan it, and
   * a missed frame self-corrects on the next one. The handler compares against the CURRENT boolean
   * and writes only on a change, so a scroll costs one comparison per frame and no renders.
   *
   * ⚠️ AND THE LATCH IS ASYMMETRIC ON PURPOSE. Entry is `scrollTop > 4 && safeToStrip()`; exit is
   * `scrollTop <= 4` ALONE. Making exit the inverse of entry is what oscillates: stripping reclaims
   * height, which lowers max scroll, which can clamp `scrollTop` below where it was — re-testing
   * the entry condition then flips the header back, and it cycles. Once working, only returning to
   * the top ends it.
   */
  React.useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    /* the page must still scroll AFTER the strip reclaims its height, or entering is unsafe */
    const safeToStrip = () => root.scrollHeight - root.clientHeight > reclaimedPx();

    let frame = 0;
    const evaluate = () => {
      frame = 0;
      setStuck((was) => (was ? root.scrollTop > 4 : root.scrollTop > 4 && safeToStrip()));
    };
    /* rAF-throttled: at most one evaluation per painted frame, however fast the wheel reports */
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(evaluate); };

    root.addEventListener("scroll", onScroll, { passive: true });
    evaluate();

    /* ⚠️ THE RESIZE OBSERVER STAYS. A window that gets shorter can cross the threshold without any
       scroll at all, and nothing else would re-evaluate until the user happened to scroll. */
    const ro = new ResizeObserver(evaluate);
    ro.observe(root);
    return () => {
      root.removeEventListener("scroll", onScroll);
      ro.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [reclaimedPx]);

  return (
    <PlateCondensedContext.Provider value={condensed}>
      <div className={`wpg${toolbar ? " wpg--tools" : ""}${className ? ` ${className}` : ""}`}>
        {/* ⚠️ ROW 1 CARRIES THE STATE CLASS TOO, not just the header inside it. The width change and
            the hairline are the ROW's (the header fills its row in both states), so the row has to
            know. Same boolean, one source — it cannot disagree with the header. */}
        <div className={`wpg-plate${condensed ? " wpg-plate--working" : ""}`}>{plate}</div>
        {toolbar && <div className="wpg-tools">{toolbar}</div>}
        <div
          className="wpg-scroll"
          ref={scrollRef}
          /* a scrollable region must be reachable by keyboard, and named when it is */
          tabIndex={0}
          role={scrollLabel ? "region" : undefined}
          aria-label={scrollLabel}
        >
          {children}
        </div>
      </div>
    </PlateCondensedContext.Provider>
  );
};
