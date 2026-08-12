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
   * ⚠️ THE SCROLL ROW BECOMES A FLEX COLUMN — for pages whose content FILLS the row and scrolls in
   * its own panes, rather than flowing past it.
   *
   * ⚠️ IT EXISTS BECAUSE THE SAME BUG HAS NOW LANDED TWICE, and both times it hid behind content
   * that happened to size the container. A page written as a viewport-locked column says
   * `flex: 1; min-height: 0` all the way down, and those declarations need a FLEX PARENT to mean
   * anything. Under the grid the parent is `.wpg-scroll`, a block — so the chain silently stops
   * being load-bearing and the page's own height arithmetic evaluates to nothing. `.tpl-cols` hit
   * it (696px of overflow through a frame whose lock says it never scrolls) and `.f12-body` hit it
   * again: `flex: 1 1 0%` with `min-height: 0` contributes ZERO to a content-sized container and
   * has no free space to grow into, so it computes to exactly 0. Query Centre's whole journey body
   * measured 0px tall while every element in it was mounted and correct.
   *
   * ⚠️ OPT-IN, NOT THE DEFAULT. On a flowing page a `flex: 1` child would start filling the row
   * instead of flowing past it, which changes what scrolls. The pages that need it say so.
   */
  fill?: boolean;
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
  plate, toolbar, children, className, scrollLabel, fill = false, condensed: condensedByMode = false,
}) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = React.useState(false);
  /**
   * ⚠️ THE HEMS ARE DRIVEN BY THE SAME EVALUATION AS THE HEADER, and that is the whole reason they
   * live here rather than in a page. A second scroll listener would be a second answer to "where
   * is this scroller", and the two would disagree on exactly the frames anyone would notice.
   *
   * ⚠️ AND EACH IS A STATE, NOT DECORATION. A top fade on an unscrolled page, or a bottom fade at
   * the end of the content, reads as a rendering fault rather than as an affordance — the same
   * argument the shell's own foot fade already makes for itself.
   */
  const [hem, setHem] = React.useState({ top: false, bot: false });
  /* ⚠️ THE UNION, AND IT IS AN `||` RATHER THAN A PRIORITY. Neither half outranks the other: a
     journey opened part-way down a scrolled page is still working, and closing it while still
     scrolled must not restore the card. Everything below reads this one value. */
  const condensed = stuck || condensedByMode;

  /**
   * ⚠️ THE STATE IS A PURE FUNCTION OF `scrollTop`, AND THE CLAMP IT USED TO FEAR IS IMPOSSIBLE.
   *
   * Stripping reclaims row 1's height, which used to grow the scrollport and shrink max scroll —
   * so a page that only just overflowed could be clamped to 0, bringing the header back, and it
   * cycled. That was guarded against with `safeToStrip()`, which bought safety at the price of a
   * DEAD ZONE: a page overflowing by less than the reclaim never stripped at all. Manuscripts lived
   * in it — 42px of overflow against a 62px reclaim.
   *
   * ⚠️ THE FIX IS IN THE STYLESHEET, NOT HERE. `.wpg--working .wpg-scroll` takes a `padding-bottom`
   * of exactly the reclaim, so stripping grows `scrollHeight` and `clientHeight` by the SAME
   * amount and max scroll is identical in both states. `scrollTop` cannot be clamped by the state
   * change in either direction, so the oscillation is impossible rather than avoided — and the
   * guard, the dead zone and the asymmetric latch all go with it.
   *
   * What remains is symmetric and stateless: `scrollTop > 2`, evaluated per painted frame, written
   * only on a change. No cached decision, nothing to go stale, a missed frame self-corrects.
   */
  React.useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;

    let frame = 0;
    const evaluate = () => {
      frame = 0;
      const top = root.scrollTop;
      setStuck(top > 2);
      /* ⚠️ COMPARED BEFORE IT IS WRITTEN. A fresh object every frame would re-render the whole
         page on every wheel tick even when nothing changed — the header's `setStuck` is free of
         that only because a boolean compares by value. */
      const next = { top: top > 2, bot: top < root.scrollHeight - root.clientHeight - 2 };
      setHem((prev) => (prev.top === next.top && prev.bot === next.bot ? prev : next));
    };
    /* rAF-throttled: at most one evaluation per painted frame, however fast the wheel reports */
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(evaluate); };

    root.addEventListener("scroll", onScroll, { passive: true });
    evaluate();

    /**
     * ⚠️ THE OBSERVER WATCHES THE CONTENT, NOT ONLY THE ROW — and watching only the row is a bug
     * the browser will never report. A `ResizeObserver` on a scroller fires when the SCROLLER's
     * box changes; it says nothing when `scrollHeight` grows because content arrived inside it. So
     * on a page whose data loads after mount, the single evaluation at mount saw
     * `scrollHeight === clientHeight`, concluded there was nothing below, and nothing re-evaluated
     * until the user scrolled. Measured on the deployed build: Query Centre reported no bottom hem
     * at rest with 729px of content beneath the fold, while every synchronously-rendered page was
     * correct — which is exactly the shape that survives a whole pass unnoticed.
     *
     * The direct children are what grow, so they are observed too, and a `MutationObserver`
     * re-syncs that list when the page swaps its content. A window change is still caught by the
     * row's own entry.
     */
    const ro = new ResizeObserver(evaluate);
    const watch = () => {
      ro.disconnect();
      ro.observe(root);
      for (const child of Array.from(root.children)) ro.observe(child);
    };
    watch();
    const mo = new MutationObserver(() => { watch(); evaluate(); });
    mo.observe(root, { childList: true });
    return () => {
      root.removeEventListener("scroll", onScroll);
      ro.disconnect();
      mo.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <PlateCondensedContext.Provider value={condensed}>
      <div className={`wpg${condensed ? " wpg--working" : ""}${toolbar ? " wpg--tools" : ""}${fill ? " wpg--fill" : ""}${className ? ` ${className}` : ""}`}>
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
        {/* ⚠️ THE HEMS ARE GRID CHILDREN OF ROW 3, NOT CHILDREN OF THE SCROLLER. Inside the
            scrollport they would scroll with the content, which is what makes the obvious version
            of this wrong; placed in the same grid cell with `align-self: start` / `end` they sit
            against the row's edges and stay there, and the grid's own `overflow: hidden` clips
            them to the window's rounded corners for free. No wrapper element, no absolute
            positioning, no mask on the scroller — a mask interacts badly with `scrollbar-gutter`,
            which this row depends on. */}
        <div className={`wpg-hem wpg-hem--top${hem.top ? " on" : ""}`} aria-hidden="true" />
        <div className={`wpg-hem wpg-hem--bot${hem.bot ? " on" : ""}`} aria-hidden="true" />
      </div>
    </PlateCondensedContext.Provider>
  );
};
