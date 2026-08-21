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
import { ChevronDown, ChevronUp } from "lucide-react";
import "./workspacePageGrid.css";

/**
 * ⚠️ `PlateCondensedContext` IS DELETED (in-flow masthead, step 4), AND ITS LAST READER WENT AT
 * STEP 1. It carried one boolean from the grid to the header so the header never had to find its
 * own scroller — the right shape for a header that condensed, and a header that condenses is
 * exactly what this pack removed. `PageHeader` reads nothing now: the masthead has no state.
 *
 * ⚠️ WHAT IT CARRIED IS NOT GONE — the union `stuck || condensedByMode || engaged` still exists and
 * still drives the fill-page collapse, through the ROOT'S CLASS rather than through React. That is
 * the smaller contract of the two: a stylesheet reading a class on an ancestor cannot be mounted
 * outside its provider, cannot read `null`, and needs no throw to say so.
 */

/**
 * PageTally — the control row's count, and the reason it is a component rather than a class.
 *
 * ⚠️ THE ROW KEEPS THE COUNT, NEVER THE PAGE NAME. `170-sticky-control-row.html` offers both as a
 * toggle and the count wins: once the masthead has scrolled away this row is the only thing left
 * stating anything about the page, and the page's NAME is the one fact the reader can already get
 * — from the sidebar, from the breadcrumb, from what they clicked. The count is not.
 *
 * ⚠️ IT PUSHES THE ROW'S CONTROLS RIGHT BY ITSELF (`margin-right: auto`), so no page renders a
 * spacer element and none of them can forget to. Count left, verbs right, on all five rows.
 *
 * ⚠️ AND EVERY PAGE SUPPLIES ITS OWN STRINGS FROM ITS OWN DERIVATION — there is no shared count
 * function and there must not be one. The figures differ in kind (agents, queries, comps, packages)
 * and each already has exactly one source on its page; a second derivation here would be a second
 * answer to a question the page has already answered.
 */
export const PageTally: React.FC<{ value: string; note?: string }> = ({ value, note }) => (
  <span className="wpg-tally">
    {value}
    {/* ⚠️ THE NOTE IS OMITTED, NEVER EMPTIED. An `<i>` holding nothing still takes its left margin,
        which reads as a figure that has lost its label rather than one that never had it. */}
    {note ? <i>{note}</i> : null}
  </span>
);

export interface WorkspacePageGridProps {
  /**
   * THE MASTHEAD — identity only: mark, title, description. **No actions.**
   *
   * ⚠️ IT IS NOT A ROW OF THIS GRID ANY MORE; IT IS THE FIRST THING INSIDE THE SCROLLER. That one
   * move is the whole of the in-flow masthead pack: on a scrolling page it leaves with the content
   * because it IS content — no collapse mechanism, no state, no boolean — and on a fill page it
   * vanishes on engagement instead. Named `masthead` rather than `plate` because a plate was a
   * card, and this has no fill, border, radius or shadow to be one with.
   */
  masthead: React.ReactNode;
  /**
   * THE CONTROL ROW — the page's tally on the left, its verbs on the right.
   *
   * ⚠️ IT IS THE PAGE'S ANCHOR NOW, WHICH IS A PROMOTION, NOT A RELOCATION. With the masthead gone
   * from the chrome, this is the element that stays put once the user starts working: it moved
   * INSIDE the scroller so it can be `position: sticky` there (step 2), and it is where every
   * button that used to sit in a masthead now lives.
   *
   * ⚠️ AND IT KEEPS THE COUNT, NEVER THE PAGE NAME. `170-sticky-control-row.html` offers both as a
   * toggle; the count is the fact you cannot get by looking, and the page name is the one you can.
   *
   * The original note follows, and still holds:
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
   * ⚠️ `condensed` IS DELETED (masthead rethink, step 4), AND WITH IT THE UNION IT WAS HALF OF.
   *
   * It was the MODE input to `stuck || condensedByMode || engaged` — the masthead folding when the
   * user "started working": scrolling on a scrolling page, a first click in the content area on a
   * fill one, entering a journey. Manuscripts passed `condensed={!!selected}`, so opening a dossier
   * folded it too.
   *
   * ⚠️ THE FOLD HAS ONE TRIGGER NOW AND THE WRITER OWNS IT. Guessing at "started working" is what
   * produced the click-anywhere vanish this pack replaces; an explicit Hide needs no guess.
   *
   * ⚠️ `stuck` SURVIVES AND IS NO LONGER A UNION — it drives the mini bar's growth, the control
   * row's stuck treatment and the hem's offset, all derived from `scrollTop` alone.
   */
}

export const WorkspacePageGrid: React.FC<WorkspacePageGridProps> = ({
  masthead, toolbar, children, className, scrollLabel, dock, fill = false,
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
   * ⚠️ THE TOP HEM MUST START BELOW THE STICKY CHROME, NOT AT THE SCROLLER'S TOP — and this is the
   * height it starts below.
   *
   * The hem is a grid item pinned to the row's top edge, and the control row is sticky at `top: 0`
   * inside that same row, so the gradient was washing straight over the anchored controls: a fade
   * whose job is to say "content is passing under this" was drawn ON the thing it passes under.
   *
   * ⚠️ MEASURED, NEVER A CONSTANT. The sticky chrome is not one height — it is the control row
   * alone today and the mini bar plus the control row once that lands, and pages differ anyway
   * because their control rows hold different things. A literal here would be right for one page
   * on one day. The refs below are summed at evaluate time and published as a custom property.
   *
   * ⚠️ IT IS THE ELEMENT'S OWN HEIGHT, NOT A COORDINATE. Every sticky element is pinned at the top
   * of the scroller when stuck, so its height IS its contribution — nothing here depends on where
   * the scroller happens to be on screen.
   *
   * ⚠️ AND IT IS THE RECT'S HEIGHT, NOT `offsetHeight`, BECAUSE `offsetHeight` ROUNDS. Measured on
   * Analytics: a 67.5px control row reports 68. Rounding UP is harmless — the hem starts half a
   * pixel low — but it rounds DOWN just as readily, and then the gradient is drawn a fraction
   * inside the anchored controls, which is the exact fault this offset exists to remove. Sub-pixel
   * and invisible is still the wrong side of a boundary the lock asserts.
   */
  const [stuckH, setStuckH] = React.useState(0);
  /* what the settle takes out of `scrollHeight`, given back as padding so max scroll cannot move */
  const [reclaim, setReclaim] = React.useState(0);
  const toolsRef = React.useRef<HTMLDivElement>(null);
  /* the slab — one box whose rendered height IS the stuck chrome, so the hem has one thing to read */
  const chromeRef = React.useRef<HTMLDivElement>(null);
  /* the slab's RESTING height, remembered so the settle's reclaim can be derived rather than pinned */
  const restHRef = React.useRef(0);
  const miniRef = React.useRef<HTMLDivElement>(null);

  /**
   * ⚠️ THE MINI BAR'S IDENTITY IS READ OFF THE MASTHEAD ELEMENT, NOT PASSED A SECOND TIME.
   *
   * The bar states the page's mark and its name — exactly the two things the page already handed
   * this component inside `masthead`. Taking them as props as well would put the same two literals
   * at every call site twice, and the day one of them was corrected the bar and the masthead would
   * disagree about what page you are on. Reading the element's own props is the single source; no
   * DOM query is involved, and nothing here traverses anything (the lock forbidding `querySelector`
   * in this file still holds).
   *
   * ⚠️ IT THROWS IN DEVELOPMENT RATHER THAN DEGRADING. A page that wraps its header in something
   * would make the introspection return nothing, and a mini bar with no name is a strip of chrome
   * that says less than the page it covers — silent, and only visible once you scroll.
   */
  /* ⚠️ THE TITLE ALONE, SINCE §3 — the folded bar carries no mark, so requiring one here would be
     demanding a prop for a thing that is not rendered. The masthead still takes a `mark`; the grid
     no longer has an opinion about it. */
  const identity = (React.isValidElement(masthead) ? masthead.props : {}) as { title?: string };
  if (process.env.NODE_ENV !== "production" && !identity.title) {
    throw new Error(
      "WorkspacePageGrid could not read a mark and a title from its `masthead` element. The mini " +
      "bar states the page's identity and takes it from there rather than being passed it twice; " +
      "pass a `PageHeader` with `variant=\"workspace\"`, `mark` and `title`, directly and unwrapped.",
    );
  }
  /**
   * ⚠️ ENGAGEMENT IS DELETED (masthead rethink, step 4) — the state, the `pointerdown` handlers on
   * the scroller and the dock, the containment test that stopped a click on the masthead folding
   * it, and the latch that left a header folded after a journey closed.
   *
   * All of it existed to INFER that the writer had started working. Hide is them saying so, and an
   * explicit trigger needs no inference: a click in the content area does nothing to the masthead
   * now, and leaving a journey leaves whatever state the writer chose.
   */
  /**
   * ⚠️ HIDE IS PER-VISIT AND DELIBERATELY NOT PERSISTED. Component state only: the masthead is back
   * on the next visit to the page, because a writer who folded it once to get at a list should not
   * have to un-fold it every day. No `localStorage`, and no key to migrate later.
   *
   * ⚠️ THE SETTER IS ONLY REACHED FROM THE MINI BAR TODAY (step 3). The masthead's Hide button —
   * the thing that sets it true — lands at step 4 with the removal of the click-anywhere vanish it
   * replaces, so this is false for the whole of this commit and the fill mini bar does not render.
   */
  const [hidden, setHidden] = React.useState(false);

  /* the journey latch went with engagement — see the note above */

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
      /* ⚠️ ONE EVALUATION FOR ALL THREE — the same reason the hems live in this component at all.
         A second listener measuring the chrome would be a second answer to "where is this scroller",
         and the two would disagree on exactly the frames anyone would notice. */
      /**
       * ⚠️ ONE BOX NOW, NOT A SUM (pinned chrome, §1). It was the mini bar's height PLUS the control
       * row's, added here because they were two separate stickies; the slab is one element and its
       * rendered height answers directly. A sum of parts is how a third sticky element gets
       * forgotten — and the hem's lock still checks this figure against the rendered chrome from the
       * other direction, so the two derivations keep each other honest.
       *
       * ⚠️ AND IT MUST REPORT THE SETTLED HEIGHT, NOT THE RESTING ONE (§2). The slab tightens when it
       * pins, so a reading taken from the pre-settle box would leave the hem clearing a slab that is
       * no longer that tall — a gap of about half the chrome, in the one state where anything is
       * actually passing beneath it.
       */
      const h = chromeRef.current?.getBoundingClientRect().height ?? 0;
      /* the resting posture's height, remembered while the page is AT the top — the only state in
         which the slab is measurably un-settled */
      if (top <= 2 && h > 0) restHRef.current = h;
      const chrome = top > 2 ? h : 0;
      setStuckH((prev) => (prev === chrome ? prev : chrome));
      /**
       * ⚠️ THE SETTLE SHRINKS THE SLAB, AND SHRINK IS THE DANGEROUS DIRECTION (§2). The slab is
       * inside the scroller, so its box is part of `scrollHeight`: settling takes ~62px out of the
       * scrollable content the instant the page pins. On a page overflowing by less than that, the
       * browser clamps `scrollTop` back to 0, `stuck` goes false, the slab un-settles and the page
       * grows again — shrink, clamp, un-shrink, repeat. The mini bar was safe because it GREW.
       *
       * ⚠️ SO THE RECLAIM IS GIVEN BACK AS PADDING ON THE SCROLLER, and this is the shape the file
       * deliberately kept when `--wpg-reclaim-pad` was deleted at the end of the in-flow pack: the
       * padding is a `calc()` sum precisely so a page and this component can each contribute without
       * one replacing the other.
       *
       * ⚠️ AND IT IS MEASURED, NOT CONSTANT. The settle's delta differs by page — a page with no
       * control row reclaims less, a title that wraps reclaims more — so a literal would be right
       * for one page on one day.
       */
      const reclaim = top > 2 ? Math.max(0, restHRef.current - h) : 0;
      setReclaim((prev) => (Math.abs(prev - reclaim) < 0.5 ? prev : reclaim));
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
  /* the masthead's own box — the fold's transition target */
  const mastRef = React.useRef<HTMLDivElement>(null);

  /**
   * ⚠️ THERE IS NO RESTORE, AND THAT IS A DECISION RATHER THAN A DEFERRAL (in-flow masthead).
   *
   * `restorable` and `restore` are deleted with the band they belonged to. The collapsed band WAS
   * the way back — a bare surface you clicked to bring the header out again — and the masthead does
   * not collapse to a band any more; on a fill page it vanishes outright (step 3) and returns on the
   * next visit to the page.
   *
   * ⚠️ AND NOTHING IS STRANDED BY THAT, which is the condition the whole design rests on: the
   * masthead holds no actions, so a writer who never sees it again within a visit has lost nothing
   * they could have used. `PageHeader` throws if a page tries to put an action in one.
   */

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
      if (now && !shown) setHidden(false);
      shown = now;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
      <div
        ref={rootRef}
        /* ⚠️ A CUSTOM PROPERTY RATHER THAN A CLASS, because the value is a MEASUREMENT and classes
           carry states. The stylesheet reads it; nothing else needs to know it exists. */
        style={{
          ["--wpg-stuck-h" as string]: `${stuckH}px`,
          ["--wpg-reclaim-pad" as string]: `${reclaim}px`,
        } as React.CSSProperties}
        /* ⚠️ `wpg--tools` IS GONE FROM THIS LIST. It existed for ONE rule — `.wpg--tools > .wpg-scroll`,
           which zeroed the scroller's top gap when a toolbar row had already paid it — and that
           arbitration died with the chrome rows. Grepped before removing: no stylesheet in `src/`
           reads it. A class the markup emits and nothing consumes is what a bundle sweep exists to
           find, and leaving it would imply a rule someone would go looking for. */
        className={`wpg${hidden ? " wpg--hidden" : ""}${fill ? " wpg--fill" : ""}${className ? ` ${className}` : ""}`}
      >
        {/* ⚠️ THE CHROME ROWS ARE GONE. Rows 1 and 2 were the plate and the toolbar, pinned as
            siblings of the scroller; both now sit INSIDE it, which is the whole of this pack. The
            grid is the scroller and the dock, and the masthead's departure is a scroll on a
            scrolling page and a collapse on a fill one — neither of which the grid has to reserve
            height for. */}
        <div
          className="wpg-scroll"
          ref={scrollRef}
          /* a scrollable region must be reachable by keyboard, and named when it is */
          tabIndex={0}
          role={scrollLabel ? "region" : undefined}
          aria-label={scrollLabel}
        >
          {/* ⚠️ THE MASTHEAD IS THE FIRST THING IN THE SCROLLER, and on a SCROLLING page that is the
              entire mechanism: it leaves with the content because it IS content. No sentinel feeds
              it, no class describes it, nothing reserves its height.

              ⚠️ ON A FILL PAGE NOTHING SCROLLS, so it leaves the other way — it collapses on the
              first click in the content area (step 3). Same rule, two proxies for the same thing:
              the user has started working. `.wpg-mast` is what animates; see the stylesheet. */}
          {/* ⚠️ THE WRAPPER IS THE GRID'S, AND THE COLLAPSE IS ON IT RATHER THAN ON THE HEADER.
              The grid owns when a page is working; it must not also know what class the header
              wears. One element, one job: `.wpg-mast` animates, `PageHeader` renders. */}
          {/**
            * ⚠️ THE MINI BAR IS THE ONLY CHROME THE MASTHEAD SYSTEM KEEPS ON SCREEN — mark and page
            * name, 51px, one component on both page types.
            *
            * ⚠️ IT COMES BEFORE THE MASTHEAD IN THE MARKUP AND THAT IS DELIBERATE. On a scrolling
            * page it is `sticky; top: 0` and grows 0 → 51 when stuck, so the control row beneath it
            * takes `top: 51` and the two stack — identity above, controls below. Ordering it after
            * the masthead would put it below the row in the stack the moment both were pinned.
            *
            * ⚠️ ON A FILL PAGE IT IS STATIC AND APPEARS ONLY WHILE THE MASTHEAD IS HIDDEN. Nothing
            * can hide one yet — the Hide button lands at step 4 — so on a fill page this renders
            * nothing today. Stated rather than left to be discovered: the component is whole, its
            * fill path is simply not reachable until its trigger exists.
            */}
          {/* ⚠️ THE MINI BAR IS OFF THE SCROLL PAGES AS OF §1 — the slab supersedes it there, and
              two stickies at `top: 0` is the arrangement the slab exists to end. Its FILL role
              survives until §3 replaces it with the chevron, and the component dies in §4. */}
          {fill && hidden && (
            <div ref={miniRef} className={`wpg-mini${stuck ? " wpg-mini--stuck" : ""}${fill ? " wpg-mini--static" : ""}`}>
              <span className="wpg-mini-name">{identity.title}</span>
              {/* ⚠️ THE RESTORE CONTROL IS A FILL-PAGE AFFORDANCE ONLY, AND IT IS NOT RENDERED
                  ELSEWHERE RATHER THAN HIDDEN BY CSS. On a scrolling page the masthead comes back by
                  scrolling up; a chevron there would be a second way to do a thing the page already
                  does, and a control that does nothing the moment you scroll. */}
              {fill && (
                <button type="button" className="wpg-mini-show" onClick={() => setHidden(false)} aria-label="Show the page header">
                  <ChevronDown aria-hidden="true" />
                </button>
              )}
            </div>
          )}
          {/**
            * ⚠️ ONE SLAB — MASTHEAD AND CONTROL ROW IN ONE STICKY WRAPPER (pinned chrome, §1; ref 174
            * option C). They were two independent stickies, each with its own hairline and its own
            * shadow: the masthead's rule stopping at its measure while its shadow ran full width, and
            * a second line-plus-shadow a few pixels below. The ref calls that arrangement "the clash"
            * and draws it as the thing to replace.
            *
            * ⚠️ THE SLAB IS FULL WIDTH AND ITS CHILDREN KEEP THEIR OWN MEASURES. The base hairline
            * belongs to the WINDOW, not to the masthead's measure — an edge that stops short mid-air
            * is the same fault as the fill-page border complaint in another costume.
            */}
          <div className={`wpg-chrome${stuck ? " wpg-chrome--stuck" : ""}`} ref={chromeRef}>
          <div className="wpg-mast" ref={mastRef}>
            {masthead}
            {/**
              * ⚠️ HIDE IS THE ONE EXCEPTION TO THE NO-ACTIONS RULE, AND IT IS THE GRID'S RATHER THAN
              * THE PAGE'S. `PageHeader` still throws if a PAGE hands it an action — that guard is
              * what keeps every other control off the masthead — and this is rendered BESIDE the
              * header rather than through it, so no page-facing prop was opened up to allow it.
              *
              * ⚠️ ABSOLUTELY POSITIONED, FOR THE REASON THE PRO PILL ALREADY IS: the masthead's
              * height is a function of the mark and the title, and nothing hung on it may change
              * that. A flex sibling would be inside that arithmetic, and the matrix asserts it is
              * not. The ref flexes it against a spacer, which lands in the same place on screen.
              *
              * ⚠️ FILL PAGES ONLY. A scrolling page's masthead leaves by scrolling, so a Hide there
              * would be a second way to do what the page already does — and a control that becomes
              * pointless the moment you scroll past it.
              */}
            {fill && !hidden && (
              <button type="button" className="wpg-mast-hide" onClick={() => setHidden(true)}>
                <ChevronUp aria-hidden="true" />
                Hide
              </button>
            )}
          </div>
          {/* ⚠️ THE CONTROL ROW FOLLOWS THE MASTHEAD, INSIDE THE SCROLLER, and it has to be here
              rather than a grid row above it for one reason: the masthead must come FIRST. Left as
              row 2 of the grid it would have been pinned ABOVE a masthead that had moved into the
              scroller — the page's controls sitting on top of its own title. Being in the scroller
              is also what lets it be `position: sticky` there (step 2), which is how it takes over
              the anchoring job the chrome row used to do. */}
          {toolbar && (
            /* ⚠️ THE STUCK CLASS COMES FROM `stuck` ALONE, NEVER FROM `condensed` (step 2). The union
               also carries `engaged` and the mode, both of which fire on FILL pages where nothing
               scrolls — so reading it here would draw a "this row is anchored" hairline and shadow
               on a row that has not moved and cannot. `stuck` is the only one of the three that
               means what this treatment claims.

               ⚠️ AND THE THRESHOLD IS THE EXISTING `scrollTop > 2`, not the pack's 4. They are
               imperceptible apart, and the same evaluation also drives the top hem — changing the
               number would move the hem's trigger with it, which is a second behaviour for one
               edit. One derivation, one threshold. */
            <div ref={toolsRef} className="wpg-tools">{toolbar}</div>
          )}
          </div>
          {/**
            * ⚠️ THE SETTLE'S RECLAIM, HELD OPEN IN THE FLOW (pinned chrome, §2).
            *
            * The slab loses ~62px when it pins, and it is INSIDE the scroller — so without this,
            * everything below it rises by that much. Measured: a 10px wheel tick moved a content
            * landmark 67px. Scroll anchoring does not absorb it, because the change is not content
            * arriving above the anchor; it is the anchor's own offset shrinking.
            *
            * ⚠️ AND KEEPING THE FLOW STILL IS WHAT MAKES THE SETTLE WORTH HAVING. The slab is
            * PINNED: shrinking it uncovers 62px of content that was behind it. Letting the flow
            * collapse as well moves the page under the reader to reveal the same 62px twice.
            *
            * ⚠️ AN ELEMENT RATHER THAN A MARGIN, and that is the CLAUDE.md rule about collapsing:
            * a `margin-bottom` on the slab would collapse against the next sibling's `margin-top`
            * and compensate by the LARGER of the two rather than the sum. A box cannot collapse.
            *
            * ⚠️ AND IT REPLACES THE SCROLLER'S RECLAIM PADDING, which fixed `scrollHeight` and left
            * the flow to move. This does both: the slab's loss and the spacer's gain are the same
            * number, so the column's height never changes and neither does anything's position.
            */}
          <div className="wpg-reclaim" aria-hidden="true" />
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
        {dock && <div className="wpg-dock">{dock}</div>}
      </div>
  );
};
