# Living headers — how a page adopts them

The full `PageHeader` can be a *living* header: its title becomes the page's scale ("27 queries out",
"16 agents"), its subline becomes the one fact that matters next, and a page with nothing in it shows an
empty state that exhibits what the page will look like once full.
Ref: `design-refs/page-header/living-headers-v3.html` (v3 supersedes v2's two-page pass).

**Living (six pages):** the Query Centre (`/queries`), the Contact list (`/agents`), the To-do list
(`/todo`), Submission packages (`/manuscripts/packages`), Comparable titles (`/manuscripts/comps`) and
Analytics (`/queries/analytics`). The list is `lib/livingRoutes.ts` and nothing else.

**Out of scope:** Manuscripts (`/manuscripts`) keeps its own header and its quiet bar — it is a library
with a hero of its own, not a list with a count, and the v3 brief leaves it out. Every compact page, and
every page header not in the six, is unchanged.

## The bar carries the name (v3 §2)

On a living route the top bar shows `‹SECTION› / ‹Page name›` from first paint — the section in mono
9.5px uppercase, the name in Special Elite 21px — and the in-page eyebrow is gone, so the name is said
once. `isLivingRoute` is read by BOTH the bar (to show the crumb) and the shell (to withhold the eyebrow's
section), so the two cannot disagree about a page. It is route-only, never data. LH5 locks it.

## What a page supplies

1. **`living={{ count, copy, empty? }}` on its full `PageHeader`.**
   - `count` is the number of things on the page, scoped the way the page scopes them. It is **`null`
     until the page's data has settled** — including anything the count is derived from a render late
     (the To-do board's cards, for one). Null renders the fixed shape with both lines empty and never the
     page's name or a provisional count; LH10 locks this.
   - `copy(count)` returns `{ headline, subline }`, a pure function in `lib/livingHeaders.ts` over facts
     the page already derives — never a new engine. The headline comes from the count alone; the subline
     never restates the headline's count, never judges, never genders an agent, and every date goes
     through `lib/dates` (LH12, the unit suite).
2. **An empty state, rendered by the page.**
   - "Empty" is the *account's* count, never the visible rows: a filtered-to-nothing page keeps its hero
     and its own "no matches" (LH9).
   - Pass `empty: { heading, subline }`. The header drops its h1 and its rule and shows the heading in
     Special Elite 29px; the buttons and the art stay where they are (LH7).
   - It ends on at most one quiet line (`.lh-hint`) linking to something that exists. The line is
     **omitted** when there is nowhere to go — on Packages, Comps and the To-do list today.
3. **An exhibition**: the page's own components inside `LivingExhibition`, over a sample constant in the
   page's own directory. Inert, `aria-hidden`, nothing focusable, no store, no fetch, no listener, and
   only ever in the empty state (LH8). A component that measures the window (a `PageRail`) goes in a
   static box with the rail's own classes — never mount the live one.
4. **The dev review aid**: `useLivingCountOverride()` behind `import.meta.env.MODE !== "production"`, so
   `window.__SA_LH_COUNT = n` drives the header for measurement (−1 is the To-do list's "all caught up").

## The To-do list's three states (v3 §6)

Nothing yet (no queries and none of the writer's own tasks or notes) → the empty state and the
exhibition. All caught up (queries, nothing due) → the full hero "All caught up", the real tiles, a
dashed "Nothing is waiting on you" panel and the rail, and no exhibition. Otherwise the list. LH11.

## The fixed shape (the page supplies none of this)

In `pageHeader.css` under `.ph--living`: 22px top padding, headline `clamp(40px, 3.7vw, 56px)` on one
line (LH2), subline `min-height: 52px`, text block 46%, art 46% wide and never cropped. A count change
alters the two lines' text and nothing else (LH1, LH6). Tile rows never grow: the number takes its own
width and the label and sub-line are one line each (LH3).

The art's height is capped at 272px rather than the ref's 286: the ref's drawing rises above its header
into room our page does not have, so a 286 box would run into the bar.

## Dated amendments

**3 Oct (Contact list v12 P2):** the Contact list's count cards retired with the card index, so the
`/agents` row in `livingHeadersV3.measure`'s RUN table now reads the INDEX STRIP — `tile: ".clv-ixtab"`
(the All cell is first in DOM at the column's left edge, which is what keeps LH4's one-left-x honest)
and `num: "i"` (each lettered cell's count). `contactHeaderCopy`'s subline has carried the v12 sentence
since P1 — "{N} of them want {genre} and haven't seen {title} yet.", plus the average-reply clause when
any agent states a window — with the header's `facts`/`avgReplyWeeks` context supplied by the page.
