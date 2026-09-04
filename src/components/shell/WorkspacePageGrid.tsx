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
import { ArrowLeft, Plus } from "lucide-react";
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
   * The page's PRIMARY SCROLLER, as a selector, for a `fill` page whose scrolling happens inside it.
   * It is what the collapsed bar watches: no scroller, no handoff.
   *
   * ⚠️ IT WAS `settleOn`, AND THE RENAME IS THE POINT RATHER THAN TIDINESS. Nothing settles any
   * more — the masthead leaves and a bar takes over — so a prop named for a mechanism that has been
   * deleted is a comment outliving what it described, one level up where a reader cannot even grep
   * for the explanation. What it names is unchanged: which element scrolls this page's body.
   *
   * ⚠️ ONLY WHERE A SINGLE ONE EXISTS. A scroll page has one by construction and passes nothing. The
   * Tasks family names its zone classes here because its frame never scrolls by contract. Query
   * Centre and Manuscripts pass nothing DELIBERATELY: their panes scroll independently, and a bar
   * arriving because a list moved inside one pane would report the page as scrolled when a corner
   * of it was.
   */
  scroller?: string;
  /**
   * ⚠️ THE DETAIL VIEW OPENS WITH THE BAR ALREADY IN PLACE AND NO MASTHEAD. A two-view page's second
   * view fills the viewport and its panes scroll internally, so there is nothing for a masthead to
   * scroll away from and nothing for the handoff to hand off — it would sit there permanently,
   * taking a third of the working area to say a name the bar says in 46px.
   *
   * ⚠️ THE `masthead` PROP IS STILL PASSED IN THAT MODE, and that is deliberate rather than untidy:
   * it is where the bar's identity comes from. A page that stopped passing it would lose its name in
   * the one view that has nothing else to state it.
   */
  barOnly?: boolean;
  /**
   * ⚠️ THE RECORD VIEW REPLACES THE MASTHEAD WITH THE BAR, and the bar says something different in
   * it: a back-link and the RECORD's name, not the page's. `← All queries` and `Greg Panetta` — the
   * page name belongs to the grid you came from, and repeating it over a record states the one thing
   * the reader can already see in the breadcrumb while omitting the one they cannot.
   *
   * ⚠️ IT IMPLIES `barOnly`. A record has no masthead: there is nothing for one to scroll away from,
   * and it would take a third of the working area to say a name the bar says in 46px.
   */
  record?: {
    backLabel: string;
    onBack: () => void;
    title: string;
    /**
     * ⚠️ NAVIGATION WITHIN THE SET, AND NOTHING ELSE — never an operation on the record. The bar
     * then reads left to right as one sentence about position: leave the set, which one you are in,
     * move along it. An action placed here would put a thing that CHANGES the record in the band
     * whose whole business is which record you are looking at.
     *
     * ⚠️ AND IT SITS AT THE FAR END DELIBERATELY. `ManuscriptPager`'s own note warned against
     * putting a departure among the operations — two chevrons in one band, one meaning "leave" and
     * one meaning "previous". That warning was written for a masthead that no longer exists, and
     * the risk it names is real here: the guard is the separation plus the labelling, the back
     * control being an arrow WITH A WORD at the left and the pager a bare chevron pair around a
     * numeric readout at the right.
     */
    within?: React.ReactNode;
  };
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

/**
 * ⚠️ TWO THRESHOLDS, NOT ONE, AND THE GAP IS THE WHOLE MECHANISM. A single threshold flips on every
 * frame that lands on it; 30px of separation is far more than any scroll step can straddle.
 */
/**
 * ⚠️ 120 IN, 90 OUT (slim bar, §2; ref `slim-header-scroll.html`). Two edges rather than one, each
 * asserting a single direction — equal thresholds flicker at the boundary, which is what makes this
 * a hysteresis rather than two competing triggers. It was 150/120 while the header it hands off from
 * was 175px tall; the compact header is ~109, so the bar has to arrive sooner or there is a stretch
 * with no page name on screen at all.
 */
const BAR_SHOW = 120;
const BAR_HIDE = 90;

/**
 * ⚠️ THE BAR'S IDENTITY IS READ OFF THE MASTHEAD ELEMENT, WHICH IS THE PAGE'S OWN DECLARATION.
 * The grid needs a title and a mark for the collapsed bar; the masthead already has both. Taking
 * them from a second pair of props would be a table keyed by route sitting beside the one the page
 * already fills in, and the two would diverge the first time a page was renamed — which this rebuild
 * has already watched happen with the section names.
 *
 * ⚠️ ABSENCE MEANS NO BAR, not a bar with a blank name. A grid handed something that is not a
 * `PageHeader` has no identity to show, and an empty 46px band that appears on scroll is worse than
 * nothing at all.
 */
type BarPrimary = { label: string; onClick: () => void; disabled?: boolean };
const barIdentity = (
  masthead: React.ReactNode,
): { title: string; icon?: string; primary?: BarPrimary } | null => {
  if (!React.isValidElement(masthead)) return null;
  const p = masthead.props as { title?: unknown; icon?: unknown; primary?: unknown };
  if (typeof p.title !== "string" || !p.title) return null;
  /**
   * ⚠️ THE BAR TAKES THE HEADER'S OWN PROPS — icon, title and primary — so a page states each once.
   * The same handler, the same label, the same asset at 22px instead of 72.
   *
   * ⚠️ `mark` IS NO LONGER READ. The registry's monoline glyph was the bar's icon while the masthead
   * had one; the format's picture is a painted asset, and rendering the glyph here would put a
   * DIFFERENT drawing in the bar from the one in the header it replaces.
   *
   * ⚠️ AND THERE IS NO COUNT, WHICH IS A DECISION RATHER THAN AN OMISSION. The ref draws one and the
   * brief allows it "where the page has one" — no page supplies one to its header, and adding a prop
   * the header accepts and does not render is the fault its own guard forbids. The pages that HAVE a
   * count keep it in the toolbar, which §3 pins directly beneath this bar: it stays on screen, so a
   * count here would be the same figure twice, an inch apart.
   */
  return {
    title: p.title,
    icon: typeof p.icon === "string" ? p.icon : undefined,
    primary: (p.primary as BarPrimary | undefined) ?? undefined,
  };
};

export const WorkspacePageGrid: React.FC<WorkspacePageGridProps> = ({
  masthead, toolbar, children, className, scrollLabel, dock, fill = false, scroller, barOnly, record,
}) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  /**
   * ⚠️ THE COLLAPSED BAR IS A SEPARATE ELEMENT, NEVER A TRANSFORMATION OF THE MASTHEAD, and the
   * reason is mechanical rather than aesthetic: `font-family` cannot be interpolated — the masthead
   * is Playfair and the bar is JetBrains Mono — and an animated height feeds back into scroll
   * position, which is the loop this system has already paid for twice.
   *
   * ⚠️ HYSTERESIS, HELD IN A REF, BECAUSE THE PREVIOUS STATE IS AN INPUT. It appears past 150 and
   * leaves below 120; equal thresholds flicker at the boundary, and reading the current React state
   * inside the scroll callback would read whatever value that closure captured.
   */
  const ident = React.useMemo(() => barIdentity(masthead), [masthead]);
  const barOn = React.useRef(false);
  const [bar, setBar] = React.useState(false);
  /* ⚠️ `barOnly` FORCES IT ON RATHER THAN BRANCHING THE RENDER. One expression decides whether the
     bar shows, so the two views cannot disagree about it — and the scroll hysteresis simply has
     nothing to do in a view that does not scroll. */
  const barShown = barOnly || !!record || bar;
  /** The height of whatever is PINNED above a sticky child of this scroller. See below. */
  const [stuckH, setStuckH] = React.useState(0);
  /**
   * The SCROLLPORT's own height, for anything that must cap itself to what is on screen.
   *
   * ⚠️ `100vh` IS THE WRONG UNIT HERE AND THIS REPO HAS ALREADY PAID FOR IT ONCE. The viewport is
   * not what a child of this scroller can occupy: the scroller starts below the shell's own chrome,
   * so `calc(100vh - …)` over-claims by exactly that offset — which is the Tasks chassis's
   * unreachable 21px, one element up. The figure a sticky child actually needs is this box's
   * height, and this component is the only thing that knows it.
   */
  const [portH, setPortH] = React.useState(0);
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
  const toolsRef = React.useRef<HTMLDivElement>(null);
  /* the slab — one box, so the hem has one thing to read */
  const chromeRef = React.useRef<HTMLDivElement>(null);
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
  /**
   * ⚠️ THE IDENTITY READ IS DELETED, AND ITS ONLY CONSUMER WAS THE FOLDED NAME BAR (pinned chrome,
   * §4). The grid pulled `title` off the masthead element's props so the bar could state the page's
   * name without being passed it twice — a sound arrangement for a component that no longer exists.
   *
   * ⚠️ CHECKED BEFORE DELETING, not assumed: nothing else in this component read `identity`, and the
   * dev-time throw it guarded ("a mark and a title must be readable from the masthead") was enforcing
   * a requirement only the bar had. The masthead's own props are still validated by `PageHeader`.
   */
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
  /**
   * ══ THE TWO HEADER TYPES ARE DELETED, AND SO IS EVERYTHING THAT DEPENDED ON THE PARTITION ════
   *
   * A page used to be Type A (single primary scroller · sticky slab · settles · no fold) or Type B
   * (none · in flow · never settles · Hide folds it to a chevron badge), asserted as a partition
   * over ten pages: no page both, neither, or opting out. `pinned = !fill || !!scroller` was the
   * derivation, `data-wpg-type` published it, `wpg--static` styled the other half, and
   * `mastheadBehaviour.ts` handed it to `PageHeader` so a masthead that LEAVES could refuse an
   * action a pinned one accepted.
   *
   * ⚠️ THERE IS ONE MASTHEAD NOW AND IT BEHAVES THE SAME EVERYWHERE: it is the first thing in the
   * scroller, it scrolls away as content, and the collapsed bar takes over. A partition needs two
   * behaviours to partition; there is one. Keeping the machinery would have left a classification
   * with nothing to classify — which is how the next reader comes to give one half an offset.
   *
   * ⚠️ AND THE PARTITION'S OWN LOCK WAS ASSERTING CONTENT, NOT STRUCTURE — see the run report. It
   * required every scrolling page's row to be currently overflowing, which contradicts the law
   * stated beside it (*"type is a property of STRUCTURE, not of today's content"*). It was red on
   * `main` before this rebuild began, on whichever page happened to fit that day.
   */

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

    /**
     * ══ THE SETTLE FOLLOWS THE PAGE'S SCROLLER, NOT THE SCROLL ROW ═══════════════════════════
     *
     * ⚠️ THE TRIGGER WAS THE FAULT, NOT THE VARIANT. The settle listened to the scroll row on every
     * page — and on the Tasks family the scroll row is not where scrolling happens. Those pages are
     * `fill` by a deliberate contract: the frame is a window that NEVER scrolls, and all scrolling
     * belongs to an internal zone. So the chrome sat at rest while the reader worked, on exactly the
     * three pages with least room to spare. The contract is untouched; the chrome now reacts to the
     * scroll that is actually occurring.
     *
     * ⚠️ A PAGE BINDS THE BAR ONLY WHERE A SINGLE PRIMARY SCROLLER EXISTS, and that is the whole
     * rule. A scroll page has one by construction — the row. The Tasks family names its zone through
     * `scroller`. Query Centre and Manuscripts name nothing: their panes scroll INDEPENDENTLY, and
     * a bar arriving because a list moved inside one pane would report the page as scrolled when a
     * corner of it was.
     *
     * ⚠️ AND THE CANDIDATE IS CHOSEN BY WHAT ACTUALLY SCROLLS, not by which selector matched first.
     * `scroller` is a list — the family owns three zone classes — and on a page carrying more than
     * one of them `querySelector` would return whichever came first in the document rather than the
     * one with anything to scroll. Zero scrollable candidates means there is nothing to hand off
     * FROM, which is a real state: Calendar does not overflow at 1440×900.
     */
    const primaryScroller = (): HTMLElement | null => {
      if (!fill) return root;
      if (!scroller) return null;
      const live = [...root.querySelectorAll(scroller)]
        .map((e) => e as HTMLElement)
        .filter((e) => e.scrollHeight - e.clientHeight > 2);
      return live.length === 1 ? live[0] : null;
    };

    let frame = 0;
    const evaluate = () => {
      frame = 0;
      /* the hems are the SCROLL ROW's — they describe that box and nothing else */
      const top = root.scrollTop;
      const scrollEl = primaryScroller();
      /* ⚠️ ONE READING OF "WHERE IS THIS PAGE", SHARED. A second listener asking the same question
         is a second answer, and the two would disagree on exactly the frames anyone would notice. */
      const y = scrollEl ? scrollEl.scrollTop : 0;
      if (!barOn.current && y > BAR_SHOW) barOn.current = true;
      else if (barOn.current && y < BAR_HIDE) barOn.current = false;
      setBar((prev) => (prev === barOn.current ? prev : barOn.current));
      /* ⚠️ COMPARED BEFORE IT IS WRITTEN. A fresh object every frame would re-render the whole
         page on every wheel tick even when nothing changed — the bar's `setBar` is free of that
         only because a boolean compares by value. */
      const next = { top: top > 2, bot: top < root.scrollHeight - root.clientHeight - 2 };
      setHem((prev) => (prev.top === next.top && prev.bot === next.bot ? prev : next));
      /**
       * ⚠️ THE SETTLE IS DELETED, AND WITH IT EVERYTHING THAT COMPENSATED FOR IT.
       *
       * The slab used to tighten when the page pinned — mark 52→34, title 30→22, description folded
       * — which took ~62px out of `scrollHeight` the instant it happened. Shrink is the dangerous
       * direction: on a page overflowing by less than the reclaim the browser clamps `scrollTop` to
       * 0, the slab un-settles and the page grows again, and it cycles. So the height was measured
       * at rest (`restHRef`, guarded on `getAnimations({ subtree: true })` because the resting box
       * is only honest while nothing is easing), the delta was published as `--wpg-reclaim-pad`, and
       * the scroller gave it back as padding so max scroll could not move. Three mechanisms, all of
       * them existing to undo one another.
       *
       * ⚠️ THE MASTHEAD LEAVES NOW INSTEAD OF SETTLING, so there is no height change to compensate,
       * no reclaim to publish, and no resting height to remember. This is what the rebuild bought:
       * a mechanism deleted rather than a mechanism made safe.
       */
      /**
       * ⚠️ `--wpg-stuck-h` IS THE BAR'S HEIGHT — how far down the scrollport the first unobstructed
       * pixel is. The builder's New-package panel is `position: sticky` INSIDE this scroller and
       * would otherwise clamp to the same line as the bar and slide under it; `buildPanel.css` reads
       * this as its `top` and inside its `max-height`, and it is a fact only this component knows.
       *
       * ⚠️ WRITTEN ONLY WHILE THE BAR IS SHOWN, because that is the only state in which anything is
       * pinned above a sticky child.
       */
      const pinnedH = barOn.current ? (root.querySelector(".wpg-bar") as HTMLElement | null)?.offsetHeight ?? 0 : 0;
      setStuckH((prev) => (Math.abs(prev - pinnedH) < 0.5 ? prev : pinnedH));
    };
    /* rAF-throttled: at most one evaluation per painted frame, however fast the wheel reports */
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(evaluate); };

    /**
     * ⚠️ CAPTURE, SO ONE LISTENER CATCHES BOTH. A `scroll` event does not BUBBLE, but it does
     * CAPTURE — so a single listener here sees the scroll row and any internal zone alike, whenever
     * that zone appears. The alternative is re-attaching a listener every time the page swaps its
     * content, which is the shape that silently stops listening.
     */
    root.addEventListener("scroll", onScroll, { capture: true, passive: true });
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
      root.removeEventListener("scroll", onScroll, { capture: true } as EventListenerOptions);
      ro.disconnect();
      mo.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [fill, scroller]);

  /**
   * ⚠️ THE FOLD IS DELETED — `Hide`, the chevron badge on the window's border, the `hidden` state,
   * the per-page visit reset that cleared it, and the portal that carried the badge out of a grid
   * whose window clips it.
   *
   * It existed for Type B: a masthead that sits in flow and never leaves needs a way to be got out
   * of the reader's way, and clicking a bare collapsed band was the way back. There is no Type B
   * any more — every masthead scrolls away as content — so the fold's whole reason is served by
   * scrolling, and a second way to do the same thing is one the reader has to choose between.
   *
   * ⚠️ AND NOTHING IS STRANDED BY IT, which is the condition the design rests on: the masthead
   * holds no actions, so a reader who scrolls past one has lost nothing they could have used.
   * `PageHeader` throws if a page tries to put an action in one.
   *
   * ⚠️ THE PORTAL GOES TOO, AND IT IS THE PART WORTH REMEMBERING. The badge was portalled to the
   * SHELL's window wrapper, which is shared, while the state that gated it was per-page — so a
   * folded page went on drawing its badge over whatever page the reader opened next. Anything
   * portalled to a shell-level host must also ask whether its page is the one on screen; that is
   * what `displayed` was for, and it goes with the thing that needed it.
   */
  /* ⚠️ OBSERVED, NOT READ ONCE. The scroller's height changes with the viewport, with the shell's
     own chrome and with a tier crossing, and a figure captured at mount would be right until the
     first of those. Written only when it moves, so it cannot loop against a layout it caused. */
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      const h = el.clientHeight;
      setPortH((prev) => (Math.abs(prev - h) < 0.5 ? prev : h));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rootRef = React.useRef<HTMLDivElement>(null);

  return (
      <div
        ref={rootRef}
        /* ⚠️ A CUSTOM PROPERTY RATHER THAN A CLASS, because the value is a MEASUREMENT and classes
           carry states. The stylesheet reads it; nothing else needs to know it exists. */
        style={{
          ["--wpg-stuck-h" as string]: `${stuckH}px`,
          ["--wpg-port-h" as string]: portH > 0 ? `${portH}px` : "100vh",
        } as React.CSSProperties}
        /* ⚠️ `wpg--tools` IS GONE FROM THIS LIST. It existed for ONE rule — `.wpg--tools > .wpg-scroll`,
           which zeroed the scroller's top gap when a toolbar row had already paid it — and that
           arbitration died with the chrome rows. Grepped before removing: no stylesheet in `src/`
           reads it. A class the markup emits and nothing consumes is what a bundle sweep exists to
           find, and leaving it would imply a rule someone would go looking for. */
        className={`wpg${fill ? " wpg--fill" : ""}${record ? " wpg--record" : ""}${className ? ` ${className}` : ""}`}
        /**
         * ⚠️ THE BINDING IS DECLARED IN THE DOM, so it can be asserted by IDENTITY rather than by a
         * list of page names — and page lists are what have been wrong twice about this app.
         *
         * ⚠️ AND IT HAS TO BE A DECLARATION, NOT A DISCOVERY. "The single element that currently
         * overflows" cannot tell Query Centre from Noteboard: QC's panes scroll INDEPENDENTLY and
         * only one of them happens to hold enough to scroll, so a discovering probe finds exactly one
         * and concludes the page has a primary scroller. It has none. Absent here means exactly that
         * — no single place this page scrolls — and is the assertable form of "this page never
         * settles".
         */
        data-wpg-scroller={fill ? scroller : ".wpg-scroll"}
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
          {/**
            * ⚠️ THE BAR COMES FIRST IN THE MARKUP AND RESERVES NO SPACE. It is `sticky; top: 0` with
            * a negative bottom margin equal to its own height, so it takes 46px of flow and gives
            * them straight back: nothing below it moves when it appears, and `scrollTop` is
            * untouched. The masthead is never animated — it scrolls away as content — so the only
            * thing that changes on the handoff is this element's opacity and transform.
            *
            * ⚠️ AND IT IS RENDERED UNCONDITIONALLY, faded rather than mounted. Mounting on scroll
            * would insert a box mid-scroll, which is the height feedback the design exists to
            * avoid; and a transition needs both ends to exist to travel between them.
            */}
          {(ident || record) && (
            <div className={`wpg-bar${barShown ? " wpg-bar--on" : ""}${record ? " wpg-bar--record" : ""}`} aria-hidden={record || ident?.primary ? undefined : true}>
              <div className="wpg-barin">
                {record ? (
                  <>
                    {/* ⚠️ A REAL BUTTON, WHICH IS WHY THE BAR STOPS BEING `aria-hidden` HERE. In the
                        grid it is decoration — the page's own name, already in the breadcrumb — and
                        hiding it spares a screen reader a duplicate. In the record it carries the
                        only way back, and a hidden control is no control. */}
                    <button type="button" className="wpg-barback" onClick={record.onBack}>
                      <ArrowLeft aria-hidden="true" />
                      {record.backLabel}
                    </button>
                    <span className="wpg-barwho">{record.title}</span>
                    {record.within && <div className="wpg-barwithin">{record.within}</div>}
                  </>
                ) : (
                  <>
                    {ident.icon && <img className="wpg-barmk" src={ident.icon} alt="" />}
                    <b>{ident.title}</b>
                    {/**
                      * ⚠️ THE PRIMARY, AND IT IS WHY THE BROWSING BAR STOPS BEING `aria-hidden` WHEN
                      * IT HAS ONE. The band is decoration while it only restates the page's name —
                      * the breadcrumb says that already — and hiding it spares a screen reader a
                      * duplicate. A real control in it is not decoration, and a hidden control is
                      * no control.
                      */}
                    {ident.primary && (
                      <button
                        type="button"
                        className="wpg-barcta"
                        onClick={ident.primary.onClick}
                        disabled={ident.primary.disabled}
                      >
                        <Plus aria-hidden="true" />
                        {ident.primary.label}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
          {/**
            * ⚠️ THE MASTHEAD IS THE FIRST THING IN THE SCROLLER, AND THAT IS THE ENTIRE MECHANISM:
            * it leaves with the content because it IS content. No sentinel feeds it, no class
            * describes it, nothing reserves its height.
            *
            * ⚠️ THE PROSE THAT USED TO SIT HERE IS DELETED RATHER THAN LEFT STANDING — it described
            * a fill page collapsing its masthead on the first click in the content area, and a
            * 51px mini bar ordered BEFORE the masthead so the control row could take `top: 51` and
            * stack beneath it. Neither exists: there is no click trigger, no fold, no mini bar, and
            * every `top` in this sheet is 0. A comment outliving what it described is read as fact.
            */}
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
          {!barOnly && !record && (
          <div className="wpg-chrome" ref={chromeRef}>
          <div className="wpg-mast">
            {/**
              * ⚠️ THE MASTHEAD IS NO LONGER TOLD ANYTHING ABOUT ITS OWN BEHAVIOUR, because there is
              * only one. `MastheadBehaviourContext` handed it `leaves: !pinned` so that a header
              * whose masthead scrolls away could REFUSE an action while a pinned one accepted it —
              * a law about anchoring rather than about a variant name, and correct while there were
              * two anchorings. There is one now, the masthead holds no controls at all, and
              * `PageHeader`'s guard throws unconditionally; a context whose only value is constant
              * is a knob the next reader will go looking for a use for.
              */}
            {masthead}
          </div>
          </div>
          )}
          {/**
            * ⚠️ THE TOOLBAR IS CONTENT, NOT CHROME — A SIBLING OF THE SLAB RATHER THAN A CHILD OF IT
            * (compact header, §3).
            *
            * It lived INSIDE `.wpg-chrome`, which is what made Contact list read as one 300px block:
            * a title, a sentence, a picture and six controls sharing a box, a ground and a closing
            * hairline. The count, the search and the filters are things you do to the page, not
            * things the page is called — so they sit BELOW the header's bottom hairline, as the
            * first thing the content row holds.
            *
            * ⚠️ IT PINS ON ITS OWN, at `top: var(--bar-h)`, so it comes to rest directly under the
            * slim bar rather than under nothing. That is also what keeps a page's count on screen
            * while scrolled — and the reason §2's bar carries no count of its own.
            *
            * ⚠️ AND ITS `z-index` IS BELOW THE BAR'S. Both are sticky in one scroller and their boxes
            * meet exactly; the bar is the outer chrome and must be the one that wins.
            */}
          {toolbar && (
            <div className={`wpg-toolband${barShown ? " wpg-toolband--on" : ""}`}>
              <div ref={toolsRef} className="wpg-tools">{toolbar}</div>
            </div>
          )}
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
            {/* ⚠️ THE TOP HEM IS DELETED (pinned header ground, §2) — app-wide, both types. It was
                built for a masthead that SCROLLED AWAY, leaving nothing pinned above the content, so
                a fade at the row's top edge said "there is more up there". No page's masthead
                scrolls away now: a Type A page pins its chrome and a Type B page's sits in flow.
                Against a pinned slab the fade is actively wrong — it half-erases content that is
                about to pass behind the header anyway, and that ghosting is what made the chrome
                read as see-through. The BOTTOM hem is untouched: content below the fold is still
                hidden by nothing but the fold. */}
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
