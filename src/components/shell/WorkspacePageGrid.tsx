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
  const sentinelRef = React.useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = React.useState(false);
  /* ⚠️ THE UNION, AND IT IS AN `||` RATHER THAN A PRIORITY. Neither half outranks the other: a
     journey opened part-way down a scrolled page is still working, and closing it while still
     scrolled must not restore the card. Everything below reads this one value. */
  const condensed = stuck || condensedByMode;

  /**
   * ⚠️ AN INTERSECTION OBSERVER ON A 1px SENTINEL, NOT A SCROLL LISTENER. The condense is a
   * BOUNDARY event — it happens once, when the top of the content passes the top of the scroller —
   * so it should be reported at the boundary rather than recomputed on every frame of every scroll.
   *
   * The sentinel is absolutely positioned at the scroll row's content top, so it scrolls out of the
   * scrollport with the content and costs no layout height. `root` is the scroll row itself: with
   * the default (the viewport) it would report on the wrong scrollport entirely.
   */
  /**
   * ⚠️ STRIPPING RECLAIMS HEIGHT, WHICH CAN UN-SCROLL THE PAGE — a feedback loop, not a broken
   * scroller, and Manuscripts hit it because its content only just exceeds the viewport:
   *
   *   1. content overflows by a little, the sentinel leaves, the header strips;
   *   2. row 1 goes from rest height to strip height, so row 3 GROWS by the difference;
   *   3. `scrollHeight − clientHeight` falls; if the original overflow was smaller than the
   *      height just reclaimed, maximum scroll becomes 0;
   *   4. the browser clamps `scrollTop` to 0, the sentinel returns, the header expands, the
   *      content overflows again — and it oscillates.
   *
   * ⚠️ THE FIX IS A GUARD, NOT HYSTERESIS. Hysteresis would damp the bounce while leaving the page
   * in whichever state it settled, which is arbitrary. The honest rule is that stripping must be
   * SAFE: only strip when the page would still scroll afterwards. Below that threshold the page
   * keeps its resting card, which is right on its own terms — a page that barely scrolls has
   * nothing to gain from the working state.
   *
   * ⚠️ THE THRESHOLD IS COMPUTED FROM THE TOKENS, never a literal, because it IS the reclaimed
   * height: the row's rest height (plate + its top gap) minus the strip. Read at call time so a
   * token change cannot leave a stale number behind.
   */
  const reclaimedPx = React.useCallback((): number => {
    if (typeof window === "undefined") return 0;
    const cs = getComputedStyle(document.documentElement);
    const n = (name: string) => parseFloat(cs.getPropertyValue(name)) || 0;
    return n("--wsh-plate-h") + n("--wsh-plate-gap") - n("--wsh-plate-h-scrolled");
  }, []);

  React.useEffect(() => {
    const root = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel) return;
    /* the sentinel says the content has moved; this says the page can afford it to */
    const safeToStrip = () => root.scrollHeight - root.clientHeight > reclaimedPx();
    const io = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting && safeToStrip()),
      { root, threshold: 0 },
    );
    io.observe(sentinel);
    /* ⚠️ AND THE GUARD IS RE-EVALUATED WHEN THE PAGE RESIZES, because a window that gets shorter
       can push a page over the threshold without the sentinel moving at all. Without this a page
       could sit un-strippable after a resize until something happened to scroll it. */
    const ro = new ResizeObserver(() => {
      setStuck((was) => (was && !safeToStrip() ? false : was));
    });
    ro.observe(root);
    return () => { io.disconnect(); ro.disconnect(); };
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
          <div className="wpg-sentinel" ref={sentinelRef} aria-hidden="true" />
          {children}
        </div>
      </div>
    </PlateCondensedContext.Provider>
  );
};
