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
   * Row 4 — a bottom-anchored dock, outside the scrollport.
   *
   * ⚠️ A GRID ROW, NOT A STICKY OR AN ABSOLUTE. Row 3 is the only thing that scrolls; a dock as a
   * fourth row is outside it BY CONSTRUCTION rather than by a rule that has to keep winning. It
   * needs no z-index against the content and cannot be scrolled away from.
   *
   * ⚠️ IT TAKES HEIGHT FROM THE SCROLL ROW, WHICH MATTERS ON A PAGE THAT SCROLLS. Row 3 is
   * `minmax(0, 1fr)`, so the dock's height comes out of the scrollport — and if a dock appears in
   * one header state only, `clientHeight` changes in that state and the invariance padding gains a
   * term it does not know about. Query Centre never scrolls, so nothing there can be clamped; a
   * scrolling page adding a dock must extend `--wpg-reclaim-pad` to cover it.
   */
  dock?: React.ReactNode;
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
  plate, toolbar, children, className, scrollLabel, dock, fill = false, condensed: condensedByMode = false,
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
  /**
   * ⚠️ THE THIRD INPUT — ENGAGEMENT (collapse-on-engagement).
   *
   * THE RULE: the header collapses when the user starts working. On a scrolling page, scrolling is
   * the signal. On a fill page, the first click inside the content area is.
   *
   * ⚠️ FILL PAGES ONLY, and that is the whole reason it exists. Five pages never collapsed because
   * they never scroll — their panes do — so the sentinel had nothing to report and the card stayed
   * forever on the pages with the least room to spare. A scrolling page already has its signal, and
   * making a click collapse one too would fight the sentinel: the click would strip it at
   * `scrollTop 0`, where the sentinel says it must be resting.
   */
  const [engaged, setEngaged] = React.useState(false);
  /* ⚠️ AN `||` OF THREE, STILL A PRIORITY OF NONE, and the header still receives ONE boolean and
     never learns which of them fired. A journey opened part-way down a scrolled page is still
     working; a click after a journey closes is still working. Everything below reads this value. */
  const condensed = stuck || condensedByMode || engaged;

  /**
   * ⚠️ ENTERING A JOURNEY LATCHES ENGAGEMENT, so LEAVING one leaves the header collapsed. You were
   * working before it and you still are — restoring the card on exit would hand back the browsing
   * chrome at the moment you have the most to do.
   *
   * ⚠️ AND IT IS A LATCH RATHER THAN A READ OF `condensedByMode`. The union already covers the time
   * the journey is open; what this is for is the moment AFTER it closes, when mode has gone false
   * again. A journey can also be opened from the shell's own menus without any click landing in the
   * content area, so the click handler cannot be relied on to have fired.
   */
  React.useEffect(() => {
    if (fill && condensedByMode) setEngaged(true);
  }, [fill, condensedByMode]);

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

  /**
   * ⚠️ THE TRIGGER IS ON THE CONTENT ROWS, NEVER ON THE DOCUMENT. A document-level listener would
   * collapse the header when you clicked the sidebar, the breadcrumb or the top bar — none of which
   * is working on this page — and it would have to guess its way back out with a `closest()` test
   * against markup it does not own. Handlers on the rows say the same thing structurally: these
   * elements ARE the work area, so anything reaching them is engagement by definition.
   *
   * ⚠️ POINTERDOWN, NOT CLICK. A drag inside the content — reordering a To-do card, dragging a comp
   * — never produces a `click`, and it is the least ambiguous act of working there is.
   */
  const engage = React.useCallback(() => {
    if (fill) setEngaged(true);
  }, [fill]);

  /**
   * ⚠️ THE BAND IS THE WAY BACK, and it carries NO chevron and NO label. The affordance is the
   * pointer and a hover shift — a control drawn in the strip would be a second thing competing
   * with the page's own actions for the one row that exists to have almost nothing in it.
   *
   * ⚠️ RESTORE IS NOT OFFERED ON A SCROLLING PAGE. There the state is a pure function of
   * `scrollTop`, so a click that set it false would be overwritten by the next evaluated frame —
   * an affordance that visibly does nothing is worse than none.
   */
  const restorable = fill && condensed;
  const restore = React.useCallback(() => setEngaged(false), []);

  /**
   * ⚠️ A PAGE VISIT RESETS IT — the card is the front door, and a fresh arrival gets it.
   *
   * ⚠️ AND UNMOUNTING IS NOT THE RESET, because these pages never unmount. The workspace keeps
   * every page mounted and toggles `display`, so a component that reset its own state on unmount
   * would reset it exactly never — you would leave Query Centre collapsed and come back to it
   * collapsed a day later. Measured, not assumed: the matrix's own wheel helper exists because the
   * first `.wpg-scroll` in the document belongs to a hidden slot whose box is empty.
   *
   * So the signal is the grid's box going from zero to non-zero: hidden → shown, which is what a
   * visit IS under a display-toggling shell. A shell that DOES unmount (a tier crossing) resets by
   * unmounting, so both arrangements are covered without either knowing about the other.
   */
  const rootRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    let shown = el.getBoundingClientRect().height > 0;
    const ro = new ResizeObserver(() => {
      const now = el.getBoundingClientRect().height > 0;
      /* ⚠️ ONLY THE HIDDEN → SHOWN EDGE. Resetting on every observation would clear engagement on
         any reflow — a window resize, a pane opening — and the header would pop back mid-task. */
      if (now && !shown) setEngaged(false);
      shown = now;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <PlateCondensedContext.Provider value={condensed}>
      <div
        ref={rootRef}
        className={`wpg${condensed ? " wpg--working" : ""}${toolbar ? " wpg--tools" : ""}${fill ? " wpg--fill" : ""}${className ? ` ${className}` : ""}`}
      >
        {/* ⚠️ ROW 1 CARRIES THE STATE CLASS TOO, not just the header inside it. The width change and
            the hairline are the ROW's (the header fills its row in both states), so the row has to
            know. Same boolean, one source — it cannot disagree with the header. */}
        {/* ⚠️ ROW 1 NEVER ENGAGES — clicking the header is not working on the page, and a header that
            collapsed when you clicked it would be a control that hides itself. */}
        <div
          className={`wpg-plate${condensed ? " wpg-plate--working" : ""}${restorable ? " wpg-plate--restorable" : ""}`}
          onPointerDown={restorable ? restore : undefined}
        >
          {plate}
        </div>
        {toolbar && <div className="wpg-tools" onPointerDown={engage}>{toolbar}</div>}
        <div
          className="wpg-scroll"
          ref={scrollRef}
          onPointerDown={engage}
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
        {/* ⚠️ A FILL PAGE HAS NO HEMS, AND THAT FOLLOWS FROM WHAT `fill` ALREADY MEANS (fix pack 3
            §1). `fill` declares that the PANES scroll and the page does not — so this scroller
            cannot reach a state either hem describes, and a fade at the foot of it is claiming
            something that cannot happen. It is not that the hems are wrong; it is that on this
            kind of page there is nothing for them to be right about.

            ⚠️ DERIVED, NOT A NEW FLAG. A `hems={false}` prop would have let a page turn them off
            while still scrolling, which is the one case where they are load-bearing, and would have
            put two answers to "does this page scroll" in the same component. Today `fill` is Query
            Centre alone, so this is scoped to it in practice — but any future fill page wants the
            same thing for the same reason, which a page-scoped `display: none` in a page's own
            stylesheet would not have given it.

            ⚠️ AND THE STATE STILL COMPUTES. `hem` is left running rather than gated, because it
            shares its evaluation with the header's condensed state — the reason the hems live here
            at all. Skipping the work would mean a second answer to "where is this scroller". */}
        {!fill && (
          <>
            <div className={`wpg-hem wpg-hem--top${hem.top ? " on" : ""}`} aria-hidden="true" />
            <div className={`wpg-hem wpg-hem--bot${hem.bot ? " on" : ""}`} aria-hidden="true" />
          </>
        )}
        {/* ⚠️ ROW 4, AFTER THE HEMS — the hems are absolute-ish grid items in row 3, so the dock
            must be its own row or it would share their cell and overlap the scroller's foot. */}
        {/* the dock is a content row too — acting in it is working on the page */}
        {dock && <div className="wpg-dock" onPointerDown={engage}>{dock}</div>}
      </div>
    </PlateCondensedContext.Provider>
  );
};
