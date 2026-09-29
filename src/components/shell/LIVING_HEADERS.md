# Living headers — how a page adopts them

The full `PageHeader` can be a *living* header: its title becomes the page's scale ("27 queries out",
"16 agents"), its intro becomes the one thing that needs the writer next, and a page with nothing in it
shows an empty state that exhibits what the page will look like once full.
Ref: `design-refs/page-header/living-headers-v2.html`.

**Opted in:** the Query Centre (`/queries`) and the Contact list (`/agents`).
**Untouched:** Comparable titles and Submission packages keep v2's full header. Every compact page is unchanged, and so is Manuscripts, which is out of scope.

## What a page supplies

1. **`living={{ count, copy }}` on its full `PageHeader`.**
   - `count` is the number of things on the page, scoped the way the page scopes them.
     It is **`null` until the page's data has settled**. Null renders the fixed shape with both lines empty, and never the page's name; LH8 locks this.
   - `copy(count)` returns `{ headline, subline }`. It must be a pure function over data the page already derives. Put it in `lib/livingHeaders.ts` beside `qcHeaderCopy` and `contactHeaderCopy`.
   - The rules for `copy`:
     - the headline comes from the count alone;
     - the subline states facts only, never a count in figures (use `numberWords`) and never a gendered pronoun for an agent;
     - every date goes through `lib/dates`.
2. **An empty state, rendered by the page, not by the header.**
   - The page decides "empty" on the *account's* own count, never on visible rows. A filtered-to-nothing page keeps its hero plus its own "no matches"; LH7 locks this.
   - The empty page renders the same `PageHeader` with `living={{ count: 0, copy, empty: { heading, subline } }}`, in the same group box as the populated page. That way the buttons and the art stay where they are; LH5 locks this.
   - It ends on at most one quiet line (`.lh-hint`) linking to a route that exists. The line is **omitted** when the route cannot be taken.
3. **An exhibition (optional)**: the page's own components inside `LivingExhibition`, fed a sample constant declared in the page's own directory.
   - The sample goes through the page's real derivation at a fixed clock, and states only what a document would hold: no derived fields.
   - It must import no store hook, no Firestore, no `fetch` and no listener; `livingExhibitSource.test.ts` sweeps for these.
   - Mount it only inside the empty state.
   - A component that measures the window (a sticky rail) goes in a static box. Never mount the live one.
4. **The dev review aid** (optional): read `useLivingCountOverride()` behind `import.meta.env.MODE !== "production"` at the call site, so `window.__SA_LH_COUNT = n` can drive the header for measurement.

## The fixed shape (the page supplies none of this)
The shape lives in `pageHeader.css` under `.ph--living`:
- headline `clamp(40px, 3.7vw, 56px)`, one line, never truncated;
- subline `min-height: 52px`;
- art 46% wide.

A count change alters the two lines' text and nothing else (LH1, LH4).

The art's height is capped at 264px rather than the ref's 286. The ref's page has room above its header and ours does not, so a 286 box would crop the drawing under the window's edge. The cap is `pageHeader.css`'s to change, not a page's.
